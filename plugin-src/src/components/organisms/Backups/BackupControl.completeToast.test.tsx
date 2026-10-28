/**
 * Coverage for BackupControl's "complete" terminal-status branch: a job
 * whose engine status reports errors, or database objects the dump
 * omitted, is not an unqualified success and must not toast
 * "Backup completed successfully." — the app's only readers of either
 * signal were the "failed" branch and nothing at all, respectively, so a
 * poll landing on a completed job that actually skipped something toasted
 * plain success either way.
 *
 * React-externalization workaround (read before editing): this codebase
 * externalizes React (WP.org Guideline 13); jsdom never loads window.React,
 * so the real npm react/react-dom is stamped onto those globals in
 * beforeAll BEFORE any aliased import runs. No JSX in this file,
 * React.createElement only (a JSX literal anywhere would hoist a
 * "react/jsx-runtime" import ahead of that stamping step).
 *
 * useBackups()/useBackupEngineStatus()/useActiveBackupJobs() and
 * useSettings() are mocked directly (the SeoManager.test.tsx pattern) so
 * this test drives the engine-status effect with full control, without
 * wiring a real QueryClientProvider network round-trip for every other
 * query BackupControl's hooks would otherwise fire. BackupControl still
 * calls useQueryClient() itself, so a real QueryClientProvider wraps every
 * render.
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, beforeAll, beforeEach, vi } from "vitest";

vi.mock("../../../lib/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("../../../hooks/useBackups", () => ({
  useBackups: vi.fn(),
  useBackupEngineStatus: vi.fn(),
  useActiveBackupJobs: vi.fn(),
}));

vi.mock("../../../hooks/useSettings", () => ({
  useSettings: vi.fn(),
}));

type BackupControlModule = typeof import("./BackupControl");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");
type ReactQueryModule = typeof import("@tanstack/react-query");
type UseBackupsModule = typeof import("../../../hooks/useBackups");
type UseSettingsModule = typeof import("../../../hooks/useSettings");
type ToastModule = typeof import("../../../lib/toast");

let BackupControl: BackupControlModule["BackupControl"];
let render: TestingLibraryModule["render"];
let cleanup: TestingLibraryModule["cleanup"];
let React: ReactModule;
let QueryClient: ReactQueryModule["QueryClient"];
let QueryClientProvider: ReactQueryModule["QueryClientProvider"];
let useBackups: UseBackupsModule["useBackups"];
let useBackupEngineStatus: UseBackupsModule["useBackupEngineStatus"];
let useActiveBackupJobs: UseBackupsModule["useActiveBackupJobs"];
let useSettings: UseSettingsModule["useSettings"];
let toast: ToastModule["toast"];

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  const RealReact = nodeRequire("react");
  const RealReactDOM = nodeRequire("react-dom");
  const RealReactDOMClient = nodeRequire("react-dom/client");
  window.React = RealReact;
  window.ReactDOM = { ...RealReactDOM, ...RealReactDOMClient };

  ({ BackupControl } = await import("./BackupControl"));
  ({ render, cleanup } = await import("@testing-library/react"));
  ({ QueryClient, QueryClientProvider } = await import("@tanstack/react-query"));
  ({ useBackups, useBackupEngineStatus, useActiveBackupJobs } = await import(
    "../../../hooks/useBackups"
  ));
  ({ useSettings } = await import("../../../hooks/useSettings"));
  ({ toast } = await import("../../../lib/toast"));
  React = await import("react");
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function mockUseBackups() {
  (useBackups as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    createBackup: vi.fn(),
    isCreating: false,
    createError: null,
  });
}

function mockUseSettings() {
  (useSettings as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    settings: {},
    isLoading: false,
    isError: false,
    error: null,
    refetchSettings: vi.fn(),
  });
}

function mockNoActiveJobs() {
  (useActiveBackupJobs as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    data: { data: { jobs: [] } },
  });
}

/**
 * @param engineStatus The BackupEngineStatus-shaped object useBackupEngineStatus()
 *                      resolves to. Passing this in unconditionally (not gated on
 *                      a job_id) is exactly how the mock lets the terminal effect
 *                      fire on mount without ever calling the "Save Backup Now"
 *                      button — the effect depends only on `engineStatus?.status`.
 */
function mockEngineStatus(engineStatus: unknown) {
  (useBackupEngineStatus as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    data: { success: true, data: engineStatus },
  });
}

function renderBackupControl() {
  const queryClient = new QueryClient();
  return render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(BackupControl, null)
    )
  );
}

beforeEach(() => {
  mockUseBackups();
  mockUseSettings();
  mockNoActiveJobs();
});

describe("BackupControl — complete-status toast", () => {
  it("toasts plain success when the job completed with no errors and nothing skipped", () => {
    mockEngineStatus({
      job_id: "bkeng_clean",
      status: "complete",
      phase: "complete",
      progress: { percent: 100, phase_label: "Backup complete.", bytes_done: 0, bytes_total: 0, eta_seconds: 0 },
      errors: [],
      cancel_requested: false,
      db_skipped_objects: [],
    });

    renderBackupControl();

    expect(toast.success).toHaveBeenCalledWith("Backup completed successfully.");
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it("toasts plain success when db_skipped_objects is entirely absent (older/terminal-shape row)", () => {
    mockEngineStatus({
      job_id: "bkeng_no_field",
      status: "complete",
      phase: "complete",
      progress: { percent: 100, phase_label: "Backup complete.", bytes_done: 0, bytes_total: 0, eta_seconds: 0 },
      errors: [],
      cancel_requested: false,
      // db_skipped_objects intentionally omitted.
    });

    renderBackupControl();

    expect(toast.success).toHaveBeenCalledWith("Backup completed successfully.");
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it("toasts a warning, not success, when the job completed with recorded errors", () => {
    mockEngineStatus({
      job_id: "bkeng_errs",
      status: "complete",
      phase: "complete",
      progress: { percent: 100, phase_label: "Backup complete.", bytes_done: 0, bytes_total: 0, eta_seconds: 0 },
      errors: [
        { tick: 3, phase: "archive_chunk", message: "uploads/huge.mp4 skipped (too large)", action: "skipped" },
      ],
      cancel_requested: false,
      db_skipped_objects: [],
    });

    renderBackupControl();

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.warning).toHaveBeenCalledWith(
      "Backup completed with at least 1 item(s) skipped."
    );
  });

  it("toasts a warning, not success, when db_skipped_objects is non-empty even with errors=[]", () => {
    mockEngineStatus({
      job_id: "bkeng_dbskips",
      status: "complete",
      phase: "complete",
      progress: {
        percent: 100,
        phase_label: "Backup complete; 2 database object(s) omitted.",
        bytes_done: 0,
        bytes_total: 0,
        eta_seconds: 0,
      },
      errors: [],
      cancel_requested: false,
      db_skipped_objects: ["wp_x_view", "wp_y"],
    });

    renderBackupControl();

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.warning).toHaveBeenCalledWith(
      "Backup completed with at least 2 item(s) skipped."
    );
  });

  it("does not double-count a dump omission recorded in both errors[] and db_skipped_objects", () => {
    // Every db_skipped_objects name has a matching errors[] entry tagged
    // action "db_skipped" (backend record_dump_skips()). A plain
    // errors.length + db_skipped_objects.length sum would count each of the
    // 2 omitted objects twice (2 + 2 = 4) on top of the 1 real file skip,
    // reporting 5 instead of 3.
    mockEngineStatus({
      job_id: "bkeng_mixed",
      status: "complete",
      phase: "complete",
      progress: { percent: 100, phase_label: "irrelevant", bytes_done: 0, bytes_total: 0, eta_seconds: 0 },
      errors: [
        { tick: 1, phase: "db_dump", message: "wp_x_view omitted", action: "db_skipped" },
        { tick: 1, phase: "db_dump", message: "wp_y omitted", action: "db_skipped" },
        { tick: 3, phase: "archive_chunk", message: "uploads/huge.mp4 skipped (too large)", action: "skipped" },
      ],
      cancel_requested: false,
      db_skipped_objects: ["wp_x_view", "wp_y"],
    });

    renderBackupControl();

    expect(toast.warning).toHaveBeenCalledWith(
      "Backup completed with at least 3 item(s) skipped."
    );
  });
  it("does not count a transient note that the engine retried (action 'retried')", () => {
    // One real skip plus one retried transient note: only the skip counts.
    mockEngineStatus({
      job_id: "bkeng_retried",
      status: "complete",
      phase: "complete",
      progress: { percent: 100, phase_label: "irrelevant", bytes_done: 0, bytes_total: 0, eta_seconds: 0 },
      errors: [
        { tick: 2, phase: "archive_chunk", message: "ZIP close() failed during yield (transient) — resuming from saved manifest offset next tick", action: "retried" },
        { tick: 3, phase: "archive_chunk", message: "uploads/huge.mp4 skipped (too large)", action: "skipped" },
      ],
      cancel_requested: false,
      db_skipped_objects: [],
    });

    renderBackupControl();

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.warning).toHaveBeenCalledWith(
      "Backup completed with at least 1 item(s) skipped."
    );
  });

  it("toasts plain success when the only recorded rows are retried transient notes", () => {
    mockEngineStatus({
      job_id: "bkeng_only_retried",
      status: "complete",
      phase: "complete",
      progress: { percent: 100, phase_label: "Backup complete.", bytes_done: 0, bytes_total: 0, eta_seconds: 0 },
      errors: [
        { tick: 2, phase: "archive_chunk", message: "ZIP close() failed at size budget (transient) — resuming from saved manifest offset next tick", action: "retried" },
      ],
      cancel_requested: false,
      db_skipped_objects: [],
    });

    renderBackupControl();

    expect(toast.warning).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("Backup completed successfully.");
  });
});
