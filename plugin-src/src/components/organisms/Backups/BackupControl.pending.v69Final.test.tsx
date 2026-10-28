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

/**
 * Backup control while the create request is pending (final .69 pass, FC-2 /
 * T36): the heading names what is true at that moment ("Starting backup..."),
 * not an archive being compressed. The real BackupControl; the data hooks are
 * replaced the way BackupControl.description.v69.test.tsx does.
 * React.createElement only.
 */
vi.mock("../../../lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
vi.mock("../../../hooks/useBackups", () => ({
  useBackups: vi.fn(),
  useBackupEngineStatus: vi.fn(),
  useActiveBackupJobs: vi.fn(),
}));
vi.mock("../../../hooks/useSettings", () => ({ useSettings: vi.fn() }));

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
    isCreating: true,
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

describe("BackupControl (Free) — create request pending (T36)", () => {
  it("says 'Starting backup...' and makes no claim about compressing or about closing the tab", () => {
    const { container } = render(
      React.createElement(
        QueryClientProvider,
        { client: new QueryClient() },
        React.createElement(BackupControl, null)
      )
    );
    expect(
      screen.getByRole("heading", { name: "Starting backup..." })
    ).toBeInTheDocument();
    // the Cancel control of that state is still offered
    expect(
      screen.getByRole("button", { name: "Cancel the running backup" })
    ).toBeInTheDocument();
    const text = container.textContent ?? "";
    expect(text).not.toContain("Generating Archive");
    expect(text).not.toContain("Compressing files and database");
    expect(text).not.toContain("Please do not close this tab");
  });
});
