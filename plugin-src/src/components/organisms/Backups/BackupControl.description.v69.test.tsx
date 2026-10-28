/**
 * S39 and L6 (truth-sweep lane SW-B), Free build: the "Everything" backup
 * type says "A copy of your site" (a backup leaves out caches, the upgrade
 * folder, debug.log, .git and node_modules), and says the database copy it
 * holds is not imported so the current database is not replaced.
 *
 * Drives the real BackupControl; the data hooks are replaced the way
 * BackupControl.completeToast.test.tsx does. React.createElement only.
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

type TL = typeof import("@testing-library/react");
let BackupControl: any;
let render: TL["render"];
let screen: TL["screen"];
let cleanup: TL["cleanup"];
let React: typeof import("react");
let QueryClient: any;
let QueryClientProvider: any;
let useBackups: any;
let useBackupEngineStatus: any;
let useActiveBackupJobs: any;
let useSettings: any;

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  window.React = nodeRequire("react");
  window.ReactDOM = {
    ...nodeRequire("react-dom"),
    ...nodeRequire("react-dom/client"),
  };
  ({ BackupControl } = await import("./BackupControl"));
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  ({ QueryClient, QueryClientProvider } =
    await import("@tanstack/react-query"));
  ({ useBackups, useBackupEngineStatus, useActiveBackupJobs } =
    await import("../../../hooks/useBackups"));
  ({ useSettings } = await import("../../../hooks/useSettings"));
  React = await import("react");
});

beforeEach(() => {
  useBackups.mockReturnValue({
    createBackup: vi.fn(),
    isCreating: false,
    createError: null,
  });
  useSettings.mockReturnValue({
    settings: {},
    isLoading: false,
    isError: false,
    error: null,
    refetchSettings: vi.fn(),
  });
  useActiveBackupJobs.mockReturnValue({ data: { data: { jobs: [] } } });
  useBackupEngineStatus.mockReturnValue({ data: undefined });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("BackupControl (Free) — 'Everything' description (S39, L6)", () => {
  it("opens with 'A copy of your site' and says the current database is not replaced", () => {
    render(
      React.createElement(
        QueryClientProvider,
        { client: new QueryClient() },
        React.createElement(BackupControl, null)
      )
    );
    const card = screen
      .getByText("Everything")
      .closest('[role="radio"]') as HTMLElement;
    // positive control: the card exists and carries its badge
    expect(card).not.toBeNull();
    expect(card).toHaveTextContent("Recommended");

    const text = (card.querySelector("p")?.textContent ?? "").trim();
    expect(text).toBe(
      "A copy of your site — posts, images, plugins, themes, and all settings. Restoring this backup restores your files; the database copy inside it is not imported, so your current database is not replaced."
    );
    expect(text).not.toContain("The complete copy");
    expect(text).not.toContain("stays as it is");
  });
});
