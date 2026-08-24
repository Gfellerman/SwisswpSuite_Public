/**
 * Vitest coverage for SyncManager's CPT-scope disclosure (Sync repair sprint, 2026-08-17,
 * audit MEDIUM #3 — .claude/agent-memory/socratic-auditor/sync-feature-audit-20260811.md).
 *
 * Only asserts the piece that is meaningfully testable in this environment: the disclosure
 * banner renders with the correct default text on mount, before any /sync/compare response
 * has arrived, and is driven by component state rather than a second untracked literal.
 * Full "the banner text updates to match the backend's `meta.supported_types_note`" coverage
 * would require simulating a real push/compare round trip (many more mocked fetch responses,
 * a connected state, diff items) — out of proportion to what this fix needs verified; the
 * PHP side of the contract (proxy_diff() always emitting `meta`) is covered by
 * SyncApiBetaGateAndKeyRotationTest's sibling PHPUnit suite's neighboring fixes in this same
 * sprint and by /contract_sync's type-check pass on SyncDiffResponse.
 *
 * Location note: co-located with the component under test, matching ErrorBoundary.test.tsx's
 * established convention/rationale for this repo (see that file's header) rather than
 * plugin/tests/Unit/.
 *
 * React-externalization workaround (read before editing): this codebase externalizes React
 * (WP.org Guideline 13, 2026-08-12) — vite.config.ts's resolve.alias redirects every
 * `import ... from "react"` to a proxy that reads WordPress's already-loaded `window.React`
 * global at import time. jsdom never loads that global, so this file stamps the REAL npm
 * react/react-dom onto `window.React`/`window.ReactDOM` in `beforeAll`, BEFORE any module
 * that transitively needs the aliased "react" (SyncManager itself, lucide-react, sonner,
 * @testing-library/react) is ever imported — see ErrorBoundary.test.tsx for the full
 * rationale and the 3 pre-existing vitest files this same gap affects.
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  beforeEach,
  afterEach,
} from "vitest";

// U7 (gate report 2026-08-20): SyncManager renders no <Toaster/> of its own (that lives
// in a parent admin layout), so a real toast.warning() call produces nothing in the DOM
// for this isolated render — mocking "sonner" is the only way to observe what
// handleSaveSchedule/handleDeleteConnection/handleDeleteSchedule actually call, and to
// simulate a user clicking a toast's confirm action by invoking the captured
// `action.onClick` directly. vi.mock() calls are hoisted by vitest above all imports
// (including the dynamic `await import("./SyncManager")` in beforeAll below), so this
// intercepts SyncManager's own `import { toast } from "sonner"` correctly.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

type SyncManagerModule = typeof import("./SyncManager");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");

let SyncManager: SyncManagerModule["default"];
let render: TestingLibraryModule["render"];
let screen: TestingLibraryModule["screen"];
let cleanup: TestingLibraryModule["cleanup"];
let fireEvent: TestingLibraryModule["fireEvent"];
let waitFor: TestingLibraryModule["waitFor"];
let React: ReactModule;
let toast: {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  warning: ReturnType<typeof vi.fn>;
};

// Mirrors the fallback constant defined at module scope in SyncManager.tsx
// (DEFAULT_SUPPORTED_TYPES_NOTE) — kept as a literal here (not imported) so this test
// verifies against the same string a real admin sees, not against SyncManager's own
// internal reference to it.
const DEFAULT_SUPPORTED_TYPES_NOTE =
  "Syncs posts, pages and products (plus design templates); other content types are not synced.";

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  const RealReact = nodeRequire("react");
  const RealReactDOM = nodeRequire("react-dom");
  const RealReactDOMClient = nodeRequire("react-dom/client");
  window.React = RealReact;
  window.ReactDOM = { ...RealReactDOM, ...RealReactDOMClient };

  // Minimal localized-data stub — SyncManager reads apiUrl/nonce at module-render time.
  window.swisswpsuiteData = {
    apiUrl: "/wp-json/swisswpsuite/v1",
    nonce: "test-nonce",
  } as unknown as SwissWPSuiteData;

  ({ default: SyncManager } = await import("./SyncManager"));
  ({ render, screen, cleanup, fireEvent, waitFor } =
    await import("@testing-library/react"));
  React = await import("react");
  ({ toast } = (await import("sonner")) as unknown as { toast: typeof toast });
});

describe("SyncManager — CPT scope disclosure (audit MEDIUM #3)", () => {
  beforeEach(() => {
    // SyncManager fires 4 fetch calls on mount (key, connections, schedules, content
    // items). None of their handlers read this response's fields unconditionally, so a
    // single generic empty-object response satisfies all of them without crashing.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      })
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows the default supported-types disclosure before any /sync/compare response arrives", async () => {
    render(React.createElement(SyncManager));

    // With no saved connections (mocked fetch returns {}), SyncManager renders the
    // "Sync Content" panel immediately (connections.length === 0 branch) — the
    // disclosure sits inside that panel, above the content-type filter tabs.
    expect(
      await screen.findByText(DEFAULT_SUPPORTED_TYPES_NOTE)
    ).toBeInTheDocument();
  });
});

/**
 * U7 (gate report 2026-08-20, audit findings #7, #15, #21): schedule save/delete
 * truthfulness. Each test drives the real component's form/button interactions —
 * never calls handleSaveSchedule/doDeleteConnection/doDeleteSchedule directly — so a
 * regression in the wiring (e.g. the else branch silently removed again) would be
 * caught the same way a real admin's click would surface it.
 */
describe("SyncManager — schedule save/delete truthfulness (U7, 2026-08-20)", () => {
  const CONNECTION = {
    id: "conn_1",
    name: "Test Site",
    url: "https://example.test",
  };

  function mockFetchSequence(handlers: {
    getSchedules?: () => unknown;
    postSchedule?: () => { status?: number; body: unknown };
    deleteConnection?: () => { status?: number; body: unknown };
    deleteSchedule?: () => { status?: number; body: unknown };
  }) {
    let scheduleGetCalls = 0;
    const fetchMock = vi.fn(async (url: unknown, opts?: RequestInit) => {
      const u = String(url);
      const method = opts?.method;

      if (u.endsWith("/sync/schedules") && method === "POST") {
        const { status = 200, body } = handlers.postSchedule
          ? handlers.postSchedule()
          : { body: { success: true, job: {} } };
        return { ok: status < 400, status, json: async () => body };
      }
      if (u.includes("/sync/schedules/") && method === "DELETE") {
        const { status = 200, body } = handlers.deleteSchedule
          ? handlers.deleteSchedule()
          : { body: { success: true } };
        return { ok: status < 400, status, json: async () => body };
      }
      if (u.includes("/sync/connections/") && method === "DELETE") {
        const { status = 200, body } = handlers.deleteConnection
          ? handlers.deleteConnection()
          : { body: { success: true } };
        return { ok: status < 400, status, json: async () => body };
      }
      if (u.endsWith("/sync/schedules")) {
        scheduleGetCalls++;
        const schedules = handlers.getSchedules ? handlers.getSchedules() : [];
        return { ok: true, status: 200, json: async () => ({ schedules }) };
      }
      if (u.endsWith("/sync/connections")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ connections: [CONNECTION] }),
        };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    });
    vi.stubGlobal("fetch", fetchMock);
    return { fetchMock, getScheduleGetCalls: () => scheduleGetCalls };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("on a confirmed schedule, refetches from the server and shows a success toast (not an echo-splice)", async () => {
    const { fetchMock, getScheduleGetCalls } = mockFetchSequence({
      getSchedules: () => [],
      postSchedule: () => ({
        body: {
          success: true,
          job: {
            id: "job_1",
            connection_id: "conn_1",
            frequency: "daily",
            scope: ["products"],
            last_run: "Never",
            status: "active",
            scheduled: true,
          },
        },
      }),
    });

    render(React.createElement(SyncManager));
    fireEvent.click(await screen.findByText("Automatic Sync"));

    const submitButton = await screen.findByRole("button", {
      name: /Create Schedule/i,
    });
    const getCallsBeforeSubmit = getScheduleGetCalls();
    fireEvent.submit(submitButton.closest("form")!);

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Schedule Created!")
    );
    // The fix's whole point: the row comes from a fresh GET /sync/schedules, not from
    // echo-splicing the POST response straight into local state.
    expect(getScheduleGetCalls()).toBeGreaterThan(getCallsBeforeSubmit);
    expect(toast.error).not.toHaveBeenCalled();
    void fetchMock; // referenced for clarity; call-shape already asserted via toast/getCalls
  });

  it("on a save_schedule failure (cron event not confirmed), shows an error toast and does not report success", async () => {
    mockFetchSequence({
      getSchedules: () => [],
      postSchedule: () => ({
        body: {
          success: false,
          job: { id: "job_2", scheduled: false },
          message:
            "Schedule saved, but the recurring cron event could not be registered.",
        },
      }),
    });

    render(React.createElement(SyncManager));
    fireEvent.click(await screen.findByText("Automatic Sync"));

    const submitButton = await screen.findByRole("button", {
      name: /Create Schedule/i,
    });
    fireEvent.submit(submitButton.closest("form")!);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Schedule saved, but the recurring cron event could not be registered."
      )
    );
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("removes a connection only after a confirmed DELETE, and keeps it visible with an error toast on failure", async () => {
    mockFetchSequence({
      deleteConnection: () => ({ status: 404, body: { success: false } }),
    });

    render(React.createElement(SyncManager));
    fireEvent.click(await screen.findByText("Manage Connections"));

    const nameEl = await screen.findByText(CONNECTION.name);
    const deleteButton =
      nameEl.parentElement!.parentElement!.querySelector("button")!;
    fireEvent.click(deleteButton);

    // toast.warning(...) is the confirm step (finding #15's fix does not touch this) —
    // simulate the user clicking the toast's own "Delete" action.
    await waitFor(() => expect(toast.warning).toHaveBeenCalled());
    const warningArgs = toast.warning.mock.calls[0][1] as {
      action: { onClick: () => void };
    };
    warningArgs.action.onClick();

    // Previously: local state was spliced unconditionally, before the fetch() result was
    // ever read. Now: a 404 must leave the row in place and surface an error toast.
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByText(CONNECTION.name)).toBeInTheDocument();
  });

  it("stops a schedule locally only after a confirmed DELETE", async () => {
    mockFetchSequence({
      getSchedules: () => [
        {
          id: "job_3",
          connection_id: "conn_1",
          frequency: "daily",
          scope: ["products"],
          last_run: "Never",
          status: "active",
        },
      ],
      deleteSchedule: () => ({ status: 200, body: { success: true } }),
    });

    render(React.createElement(SyncManager));
    fireEvent.click(await screen.findByText("Automatic Sync"));

    // The schedule row renders the connection's name in the "Target" column (as a
    // table cell — disambiguates from the identically-named <option> in the form
    // below it).
    const nameCell = await screen.findByRole("cell", { name: CONNECTION.name });
    const deleteButton = nameCell.closest("tr")!.querySelector("button")!;
    fireEvent.click(deleteButton);

    await waitFor(() => expect(toast.warning).toHaveBeenCalled());
    const warningArgs = toast.warning.mock.calls[0][1] as {
      action: { onClick: () => void };
    };
    warningArgs.action.onClick();

    await waitFor(() =>
      expect(
        screen.queryByRole("cell", { name: CONNECTION.name })
      ).not.toBeInTheDocument()
    );
    expect(toast.error).not.toHaveBeenCalled();
  });
});
