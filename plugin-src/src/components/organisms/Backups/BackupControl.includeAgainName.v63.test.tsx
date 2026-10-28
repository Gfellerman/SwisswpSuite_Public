/**
 * V63-V3-5 follow-up (WCAG 2.5.3 Label in Name, Level A).
 * Placed identically in both builds:
 *   plugin/src/components/organisms/Backups/BackupControl.includeAgainName.v63.test.tsx
 *   pro-overlay/src/components/organisms/Backups/BackupControl.includeAgainName.v63.test.tsx
 *
 * Production flow: on the Backups page, every folder left out of backups is
 * listed under "Save Backup Now" with a control that puts it back. A person
 * who drives the page by voice says the words they see on the button. The
 * accessible name of that button therefore has to contain its visible text,
 * and the folder path must be announced once, not twice.
 * No JSX (React externalisation).
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import {
  describe,
  it,
  expect,
  afterEach,
  beforeAll,
  beforeEach,
  vi,
} from "vitest";

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
let QueryClient: (typeof import("@tanstack/react-query"))["QueryClient"];
let QueryClientProvider: (typeof import("@tanstack/react-query"))["QueryClientProvider"];
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
  ({ BackupControl } = (await import("./BackupControl")) as unknown as {
    BackupControl: React.FC;
  });
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  ({ QueryClient, QueryClientProvider } =
    await import("@tanstack/react-query"));
  hooks = (await import("../../../hooks/useBackups")) as unknown as Record<
    string,
    ReturnType<typeof vi.fn>
  >;
  useSettings = (await import("../../../hooks/useSettings"))
    .useSettings as unknown as ReturnType<typeof vi.fn>;
  wpApi = (await import("../../../services/api"))
    .wpApi as unknown as ReturnType<typeof vi.fn>;
  React = await import("react");
});

let stored: string[] = [];

beforeEach(() => {
  stored = [];
  (window as unknown as { swisswpsuiteData: unknown }).swisswpsuiteData = {
    license: { features: [], capabilities: [] },
  };
  hooks.useBackups.mockReturnValue({
    createBackup: vi.fn(),
    isCreating: false,
    createError: null,
  });
  hooks.useActiveBackupJobs.mockReturnValue({ data: { data: { jobs: [] } } });
  hooks.useBackupEngineStatus.mockReturnValue({ data: undefined });
  useSettings.mockReturnValue({
    settings: {},
    isLoading: false,
    isError: false,
    error: null,
    refetchSettings: vi.fn(),
  });
  wpApi.mockImplementation((url: string) => {
    const path = String(url).split("?")[0];
    if (path === "/backup/local/exclude-paths") {
      return Promise.resolve({
        success: true,
        data: { exclude_paths: stored.slice(), nested_installs: [] },
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
    React.createElement(
      QueryClientProvider,
      { client },
      React.createElement(BackupControl)
    )
  );
}

const includeButtons = (): HTMLButtonElement[] =>
  Array.from(
    document.querySelectorAll<HTMLButtonElement>("button[data-include-again]")
  );

describe("V63-V3-5 follow-up: the include-again control is operable by its visible words", () => {
  it("each listed folder has a button named exactly by its visible text", async () => {
    stored = ["staging", "old-site"];
    mount();
    expect(
      await screen.findByRole(
        "button",
        { name: "Include staging again" },
        { timeout: 3000 }
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Include old-site again" })
    ).toBeInTheDocument();
    expect(includeButtons()).toHaveLength(2);
  });

  it("the accessible name contains the visible label and no aria-label overrides it", async () => {
    stored = ["staging", "wp-content/cache"];
    mount();
    await screen.findByRole(
      "button",
      { name: /include .*staging.* again/i },
      { timeout: 3000 }
    );
    const buttons = includeButtons();
    expect(buttons).toHaveLength(2);
    for (const btn of buttons) {
      const visible = (btn.textContent ?? "").replace(/\s+/g, " ").trim();
      expect(visible).toMatch(/^Include .+ again$/);
      expect(btn).toHaveAccessibleName(visible);
      expect(btn.hasAttribute("aria-label")).toBe(false);
      expect(btn.hasAttribute("aria-labelledby")).toBe(false);
    }
  });

  it("the folder path appears once per row, inside the button", async () => {
    stored = ["staging"];
    mount();
    const button = await screen.findByRole(
      "button",
      { name: "Include staging again" },
      { timeout: 3000 }
    );
    const row = button.closest("li") as HTMLElement;
    expect(row).not.toBeNull();
    const codes = row.querySelectorAll("code");
    expect(codes).toHaveLength(1);
    expect(button.contains(codes[0])).toBe(true);
    expect((row.textContent ?? "").split("staging").length - 1).toBe(1);
  });
});
