/**
 * Vitest coverage for the "Drop Orphaned Tables" two-step confirm flow
 * (ARS Round D, D-K-5, WP.org R4 F-11/F-17, 2026-08-2x).
 *
 * Backend contract (verified by direct read this round,
 * class-swisswpsuite-api-settings.php's perform_maintenance()): a first
 * POST /maintenance {action:'drop_orphaned_tables'} with NO confirm_tables
 * is ALWAYS a dry run — it returns the candidate table list and drops
 * nothing. Only a second POST carrying confirm_tables (matching the
 * candidate names from step 1) actually executes DROP TABLE. Before this
 * fix, MaintenanceSettings.tsx routed this action through the SAME generic
 * `handleMaintenance()` every other cleanup action uses — a blind
 * toast.warning("Are you sure?") + one POST, confirm_tables NEVER sent —
 * so a table could never actually be dropped through this UI, regardless
 * of what the user clicked.
 *
 * This test drives the REAL production caller path (renders
 * MaintenanceSettings, clicks the actual on-screen "Clean" button next to
 * "Drop Orphaned Tables", clicks the actual confirm-dialog button) — not a
 * reimplementation of the handler. Fail-first: reverting the D-K-5 fix (git
 * show HEAD:… before this round) makes this test fail because no second
 * wpApi call with confirm_tables is ever made — see this lane's final
 * report for the paste of that run.
 *
 * React-externalization workaround (read before editing): same rationale
 * as SecurityHub.hardeningToggle.test.tsx / SeoManager.test.tsx — this
 * codebase externalizes React (WP.org Guideline 13, 2026-08-12); jsdom
 * never loads window.React, so the real npm react/react-dom is stamped
 * onto those globals in beforeAll BEFORE any aliased import runs. No JSX
 * in this file, React.createElement only.
 *
 * `wpApi` ("../../../services/api") is mocked at the network boundary
 * only — every handler/state update inside MaintenanceSettings.tsx runs
 * for real. /system-logs and /cache/status (called on mount by unrelated
 * effects) are given safe inert defaults so those don't throw or hang.
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

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("../../../services/api", () => ({
  wpApi: vi.fn(),
}));

type MaintenanceSettingsModule =
  typeof import("./MaintenanceSettings");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");
type ApiModule = typeof import("../../../services/api");

let MaintenanceSettings: MaintenanceSettingsModule["MaintenanceSettings"];
let render: TestingLibraryModule["render"];
let screen: TestingLibraryModule["screen"];
let cleanup: TestingLibraryModule["cleanup"];
let fireEvent: TestingLibraryModule["fireEvent"];
let waitFor: TestingLibraryModule["waitFor"];
let within: TestingLibraryModule["within"];
let React: ReactModule;
let wpApi: ApiModule["wpApi"];

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  const RealReact = nodeRequire("react");
  const RealReactDOM = nodeRequire("react-dom");
  const RealReactDOMClient = nodeRequire("react-dom/client");
  window.React = RealReact;
  window.ReactDOM = { ...RealReactDOM, ...RealReactDOMClient };

  ({ MaintenanceSettings } = await import("./MaintenanceSettings"));
  ({ render, screen, cleanup, fireEvent, waitFor, within } = await import(
    "@testing-library/react"
  ));
  ({ wpApi } = await import("../../../services/api"));
  React = await import("react");
});

const CANDIDATE_TABLE = "wp_old_uninstalled_plugin_table";

function setupWpApiMock() {
  const calls: Array<{ url: string; body: any }> = [];

  (wpApi as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (url: string, opts?: RequestInit) => {
      if (url === "/system-logs") {
        return Promise.resolve({ logs: [] });
      }
      if (url === "/cache/status") {
        return Promise.resolve({ detected: [], active: false });
      }
      if (url === "/maintenance") {
        const body = JSON.parse((opts?.body as string) ?? "{}");
        calls.push({ url, body });
        if (body.action !== "drop_orphaned_tables") {
          return Promise.resolve({ success: true, message: "Done." });
        }
        if (!body.confirm_tables) {
          // Step 1 — dry run. Backend NEVER drops anything on this call.
          return Promise.resolve({
            success: true,
            message: "1 orphan table candidate found.",
            dry_run: true,
            candidates: [CANDIDATE_TABLE],
            dropped_tables: [],
            uncertain: [],
          });
        }
        // Step 2 — confirmed.
        return Promise.resolve({
          success: true,
          message: "Dropped 1 confirmed orphaned table.",
          dry_run: false,
          candidates: [],
          dropped_tables: body.confirm_tables,
          uncertain: [],
        });
      }
      return Promise.resolve({});
    },
  );

  return calls;
}

describe("MaintenanceSettings — Drop Orphaned Tables two-step confirm (D-K-5)", () => {
  beforeEach(() => {
    delete (window as any).swisswpsuiteData;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("sends NO confirm_tables on the first click (dry run), then shows a confirm dialog listing the real candidate", async () => {
    const calls = setupWpApiMock();
    render(React.createElement(MaintenanceSettings));

    // Multiple "Clean" buttons exist (one per DATABASE_CLEANUP_ACTIONS row) —
    // scope to the one in the "Drop Orphaned Tables" row specifically.
    const row = screen
      .getByText("Drop Orphaned Tables")
      .closest("div")!.parentElement as HTMLElement;
    const dropButton = within(row).getByRole("button", { name: /clean/i });
    fireEvent.click(dropButton);

    await waitFor(() => {
      expect(
        calls.some(
          (c) =>
            c.body.action === "drop_orphaned_tables" && !c.body.confirm_tables,
        ),
      ).toBe(true);
    });

    // The dry-run response must never itself carry confirm_tables.
    expect(
      calls.find((c) => c.body.action === "drop_orphaned_tables")?.body
        .confirm_tables,
    ).toBeUndefined();

    // Confirm dialog now shows the REAL candidate name from the response.
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    expect(screen.getByText(CANDIDATE_TABLE)).toBeInTheDocument();
  });

  it("resends the EXACT candidate list from step 1 as confirm_tables when the user confirms", async () => {
    const calls = setupWpApiMock();
    render(React.createElement(MaintenanceSettings));

    const row = screen
      .getByText("Drop Orphaned Tables")
      .closest("div")!.parentElement as HTMLElement;
    const dropButton = within(row).getByRole("button", { name: /clean/i });
    fireEvent.click(dropButton);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole("button", {
      name: /drop table/i,
    });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      const confirmedCall = calls.find(
        (c) =>
          c.body.action === "drop_orphaned_tables" &&
          Array.isArray(c.body.confirm_tables),
      );
      expect(confirmedCall).toBeDefined();
      expect(confirmedCall!.body.confirm_tables).toEqual([CANDIDATE_TABLE]);
    });

    // Dialog closes after confirming.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
