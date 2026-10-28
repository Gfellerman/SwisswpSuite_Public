/**
 * V63-V3-5 (sealed spec, lane V3 BACKUP, .63 sweep).
 * Target paths (same file, both builds):
 *   plugin/src/components/organisms/Backups/BackupControl.excludeUndo.v63.test.tsx
 *   pro-overlay/src/components/organisms/Backups/BackupControl.excludeUndo.v63.test.tsx
 *
 * Production flow: on the Backups page, "Save Backup Now" asks about a
 * separate WordPress install found inside the site. "Exclude it" stores the
 * folder in the backup exclusion list (POST /backup/local/exclude-paths, which
 * replaces the whole list). The exclusion must be visible and reversible from
 * the same Backups panel: the folder is listed, and a control puts it back
 * into backups (POST of the list without that folder). The dialog may only
 * promise what the screen offers.
 * No JSX (React externalisation).
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, beforeAll, beforeEach, vi } from "vitest";

vi.mock("../../../lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
vi.mock("../../../hooks/useBackups", () => ({
  useBackups: vi.fn(),
  useBackupEngineStatus: vi.fn(),
  useActiveBackupJobs: vi.fn(),
}));
vi.mock("../../../hooks/useSettings", () => ({
  useSettings: vi.fn(),
}));
vi.mock("../../../services/api", () => ({
  wpApi: vi.fn(),
}));

type TL = typeof import("@testing-library/react");
let React: typeof import("react");
let render: TL["render"];
let screen: TL["screen"];
let cleanup: TL["cleanup"];
let fireEvent: TL["fireEvent"];
let waitFor: TL["waitFor"];
let QueryClient: typeof import("@tanstack/react-query")["QueryClient"];
let QueryClientProvider: typeof import("@tanstack/react-query")["QueryClientProvider"];
let BackupControl: React.FC;
let hooks: Record<string, ReturnType<typeof vi.fn>>;
let useSettings: ReturnType<typeof vi.fn>;
let wpApi: ReturnType<typeof vi.fn>;

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  window.React = nodeRequire("react");
  window.ReactDOM = {
    ...nodeRequire("react-dom"),
    ...nodeRequire("react-dom/client"),
  };
  ({ BackupControl } = (await import("./BackupControl")) as unknown as { BackupControl: React.FC });
  ({ render, screen, cleanup, fireEvent, waitFor } = await import("@testing-library/react"));
  ({ QueryClient, QueryClientProvider } = await import("@tanstack/react-query"));
  hooks = (await import("../../../hooks/useBackups")) as unknown as Record<string, ReturnType<typeof vi.fn>>;
  useSettings = (await import("../../../hooks/useSettings")).useSettings as unknown as ReturnType<typeof vi.fn>;
  wpApi = (await import("../../../services/api")).wpApi as unknown as ReturnType<typeof vi.fn>;
  React = await import("react");
});

let stored: string[] = [];
const NESTED = ["staging"];

beforeEach(() => {
  stored = [];
  (window as unknown as { swisswpsuiteData: unknown }).swisswpsuiteData = {
    license: { features: [], capabilities: [] },
  };
  hooks.useBackups.mockReturnValue({ createBackup: vi.fn(), isCreating: false, createError: null });
  hooks.useActiveBackupJobs.mockReturnValue({ data: { data: { jobs: [] } } });
  hooks.useBackupEngineStatus.mockReturnValue({ data: undefined });
  useSettings.mockReturnValue({
    settings: {},
    isLoading: false,
    isError: false,
    error: null,
    refetchSettings: vi.fn(),
  });
  wpApi.mockImplementation((url: string, opts?: RequestInit) => {
    const path = String(url).split("?")[0];
    if (path === "/backup/local/exclude-paths" && opts?.method === "POST") {
      stored = (JSON.parse(String(opts.body)).paths as string[]).slice();
      return Promise.resolve({ success: true, data: { exclude_paths: stored } });
    }
    if (path === "/backup/local/exclude-paths") {
      return Promise.resolve({
        success: true,
        data: { exclude_paths: stored.slice(), nested_installs: NESTED },
      });
    }
    return Promise.resolve({ success: true });
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    React.createElement(QueryClientProvider, { client }, React.createElement(BackupControl)),
  );
}

const includeAgain = () => screen.findByRole("button", { name: /include .*staging.* again/i }, { timeout: 3000 });

describe("V63-V3-5: excluding a nested install can be undone from the Backups panel", () => {
  it("an existing exclusion is listed with a control that includes the folder again", async () => {
    stored = ["staging"];
    mount();
    fireEvent.click(await includeAgain());
    await waitFor(() => expect(stored).toEqual([]));
    const posts = wpApi.mock.calls.filter(
      ([u, o]) => String(u).split("?")[0] === "/backup/local/exclude-paths" && (o as RequestInit | undefined)?.method === "POST",
    );
    expect(posts).toHaveLength(1);
    expect(JSON.parse(String((posts[0][1] as RequestInit).body))).toEqual({ paths: [] });
  });

  it("after 'Exclude it' in the nested-install dialog, the same panel offers to include it again", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Save backup now" }));
    const dialog = await screen.findByRole("dialog");
    // The dialog's promise must match a control that exists on this screen.
    expect(dialog.textContent ?? "").not.toMatch(/backup exclusions panel/i);
    fireEvent.click(screen.getByRole("button", { name: /^Exclude it/i }));
    await waitFor(() => expect(stored).toEqual(["staging"]));
    expect(await includeAgain()).toBeInTheDocument();
  });

  it("other exclusions are kept when one folder is included again", async () => {
    stored = ["staging", "old-site"];
    mount();
    fireEvent.click(await includeAgain());
    await waitFor(() => expect(stored).toEqual(["old-site"]));
  });
});
