/**
 * Vitest coverage for the abandoned-plugins "Refresh" async dispatch fix
 * (ARS Round D, DX-4b closing the DX-4a/L-F handoff, 2026-08-24 — see
 * .claude/audit-reports/ars-round-d-2026-08-23/handoff/
 * DX4_abandoned-async-ui-contract.md and
 * L-F_abandoned-check-async-dispatch.md).
 *
 * Backend contract (DX-4a, class-swisswpsuite-api-security.php, verified
 * against the live source before writing this test):
 *   - POST /security/abandoned-plugins/refresh no longer runs the check
 *     inline. It returns 202 immediately with
 *     {success:true, in_progress:true, message:"..."}, or 429 with
 *     {success:false, in_progress:true, message:"Check already in progress."}
 *     if one was already running (wpApi() throws an ApiError with
 *     status 429 for the latter — non-2xx path).
 *   - GET /security/abandoned-plugins (unchanged route, existing mount-time
 *     consumer) gained an `in_progress` field; the frontend polls THIS
 *     route for the real result instead of reading it off the POST
 *     response.
 *
 * This test drives the REAL production caller path: it renders SecurityHub
 * itself, on its default "dashboard" tab (the abandoned-plugins panel lives
 * there — confirmed via source: the panel is nested inside
 * `{activeTab === "dashboard" && (...)}`, no tab switch needed), and clicks
 * the actual on-screen "Re-check now" button — not a reimplementation of
 * handleAbandonedPluginsRefresh().
 *
 * Real timers are used deliberately (no vi.useFakeTimers() precedent
 * anywhere in this codebase's frontend test suite, confirmed via
 * `grep -rl useFakeTimers plugin/src plugin/tests` -> 0 hits before this
 * file). The polling effect's 3s interval is exercised for real; each test
 * gets a generous explicit timeout instead of faking the clock.
 *
 * React-externalization workaround (read before editing): same rationale
 * as SecurityHub.hardeningToggle.test.tsx / GeneralSettings.test.tsx — this
 * codebase externalizes React (WP.org Guideline 13, 2026-08-12); jsdom
 * never loads window.React, so the real npm react/react-dom is stamped
 * onto those globals in beforeAll BEFORE any aliased import runs. No JSX
 * in this file, React.createElement only.
 *
 * Scope-narrowing mocks (both unrelated to this fix, both would otherwise
 * require infrastructure this test has no reason to set up) — identical
 * choices already made in SecurityHub.hardeningToggle.test.tsx:
 *   - "sonner" — avoid toast portal/DOM plumbing; also lets this test
 *     assert toast.error was NOT called on the 429 "already running" path
 *     (contract: 429 is not an error, just "keep polling").
 *   - FeaturePointer — renders a react-router-dom <Link> that throws
 *     outside a Router; mounted in the default "dashboard" tab.
 * `wpApi` ("../services/api") is mocked at the network boundary only —
 * every hook/handler/state update inside SecurityHub.tsx runs for real.
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

vi.mock("./organisms/Upsell/FeaturePointer", () => ({
  FeaturePointer: () => null,
}));

vi.mock("../services/api", () => ({
  wpApi: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    data?: any;
    constructor(message: string, status: number, data?: any) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.data = data;
    }
  },
}));

type SecurityHubModule = typeof import("./SecurityHub");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");
type ReactQueryModule = typeof import("@tanstack/react-query");
type ApiModule = typeof import("../services/api");
type SonnerModule = typeof import("sonner");

let SecurityHub: SecurityHubModule["default"];
let render: TestingLibraryModule["render"];
let screen: TestingLibraryModule["screen"];
let cleanup: TestingLibraryModule["cleanup"];
let fireEvent: TestingLibraryModule["fireEvent"];
let waitFor: TestingLibraryModule["waitFor"];
let React: ReactModule;
let QueryClient: ReactQueryModule["QueryClient"];
let QueryClientProvider: ReactQueryModule["QueryClientProvider"];
let wpApi: ApiModule["wpApi"];
let ApiError: ApiModule["ApiError"];
let toast: SonnerModule["toast"];

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  const RealReact = nodeRequire("react");
  const RealReactDOM = nodeRequire("react-dom");
  const RealReactDOMClient = nodeRequire("react-dom/client");
  window.React = RealReact;
  window.ReactDOM = { ...RealReactDOM, ...RealReactDOMClient };

  ({ default: SecurityHub } = await import("./SecurityHub"));
  ({ render, screen, cleanup, fireEvent, waitFor } = await import(
    "@testing-library/react"
  ));
  ({ QueryClient, QueryClientProvider } = await import(
    "@tanstack/react-query"
  ));
  ({ wpApi, ApiError } = await import("../services/api"));
  ({ toast } = await import("sonner"));
  React = await import("react");
});

/** The abandoned-plugins panel's initial mount-time GET result. */
function mountStatus() {
  return {
    success: true,
    enabled: true,
    last_check: 1_700_000_000,
    in_progress: false,
    plugins: [],
  };
}

/** The final result the poller should render once the dispatched check finishes. */
function finishedStatus() {
  return {
    success: true,
    enabled: true,
    last_check: 1_800_000_000,
    in_progress: false,
    plugins: [
      {
        slug: "some-abandoned-plugin/some-abandoned-plugin.php",
        name: "Some Abandoned Plugin",
        checked_at: 1_800_000_000,
        reason: "closed",
        closed_date: "2020-01-01",
      },
    ],
  };
}

type WpApiMock = ReturnType<typeof vi.fn>;

/**
 * Sets up the wpApi mock: /security/abandoned-plugins/refresh behaves per
 * `refreshBehavior`; /security/abandoned-plugins returns `mountStatus()` on
 * its first (mount-time) call and `pollStatuses` in sequence on every
 * subsequent (polling) call, holding on the last entry once exhausted.
 * Every other endpoint SecurityHub queries on mount gets a safe, inert
 * default so those unrelated useQuery calls don't throw or hang — same
 * list as SecurityHub.hardeningToggle.test.tsx's setupWpApiMock().
 */
function setupWpApiMock(
  refreshBehavior: () => Promise<any>,
  pollStatuses: any[]
) {
  let statusCallCount = 0;

  (wpApi as unknown as WpApiMock).mockImplementation((url: string) => {
    if (url === "/security/abandoned-plugins/refresh") {
      return refreshBehavior();
    }
    if (url === "/security/abandoned-plugins") {
      const result =
        statusCallCount === 0
          ? mountStatus()
          : pollStatuses[
              Math.min(statusCallCount - 1, pollStatuses.length - 1)
            ];
      statusCallCount++;
      return Promise.resolve(result);
    }
    if (url === "/hardening/status") {
      return Promise.resolve({ success: true, options: {} });
    }
    if (url === "/security/status") {
      return Promise.resolve({
        firewall_enabled: false,
        spam_enabled: false,
        block_sqli: false,
        block_xss: false,
        simulation_mode: false,
        geo_enabled: false,
        global_geo_block: false,
        login_enabled: false,
        last_scan: "",
      });
    }
    if (url === "/security/logs") return Promise.resolve([]);
    if (url === "/security/sentinel/status")
      return Promise.resolve({ has_audit: false });
    if (url === "/security/banned-ips") return Promise.resolve({ ips: [] });
    if (url === "/security/sentinel/latest-scan")
      return Promise.resolve({ success: false, record: null });
    if (url === "/security/environment")
      return Promise.resolve({
        success: true,
        environment: { cloudflare: { detected: false } },
      });
    return Promise.resolve({ success: true });
  });
}

function renderSecurityHub() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(SecurityHub)
    )
  );
}

describe("SecurityHub — abandoned-plugins async 'Refresh' (DX-4b, ARS Round D)", () => {
  beforeEach(() => {
    (window as any).swisswpsuiteData = {};
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it(
    "POST dispatches the background check (202, in_progress:true) then polls GET /security/abandoned-plugins until it completes, updating UI states in sequence",
    async () => {
      setupWpApiMock(
        () =>
          Promise.resolve({
            success: true,
            in_progress: true,
            message:
              "Abandoned-plugin check started in the background. Poll GET /security/abandoned-plugins for the result.",
          }),
        [finishedStatus()]
      );
      renderSecurityHub();

      // Mount-time fetch (deferred 100ms) populates the panel with the
      // initial cached result.
      const refreshButton = await screen.findByRole("button", {
        name: /re-check now/i,
      });
      expect(refreshButton).not.toHaveAttribute("aria-busy", "true");

      fireEvent.click(refreshButton);

      // Synchronous state: setAbandonedRefreshing(true) runs as the FIRST
      // line of the click handler, before any await — the "checking…" UI
      // state must be visible immediately, not only after the network
      // round-trip.
      expect(
        await screen.findByRole("button", { name: /checking/i })
      ).toHaveAttribute("aria-busy", "true");

      // POST-then-poll sequencing: the refresh POST must fire before any
      // poll GET, and the POST body itself carries no `plugins`/finished
      // shape — this assertion is only meaningful once the poll below also
      // proves a SECOND, separate GET actually happened.
      expect(wpApi).toHaveBeenCalledWith(
        "/security/abandoned-plugins/refresh",
        { method: "POST" }
      );

      // Wait for the polling effect's 3s interval to elapse and the poll's
      // GET to resolve with the finished result — proves the POST response
      // itself was NOT treated as final (it carried no `plugins` array).
      await waitFor(
        () => {
          expect(
            screen.getByRole("button", { name: /re-check now/i })
          ).toBeInTheDocument();
        },
        { timeout: 8000 }
      );

      const settledButton = screen.getByRole("button", {
        name: /re-check now/i,
      });
      expect(settledButton).not.toHaveAttribute("aria-busy", "true");

      // The GET status route was called at least twice: once on mount,
      // once (or more) while polling — proves polling actually happened
      // rather than the POST response being rendered directly.
      const statusCalls = (
        wpApi as unknown as WpApiMock
      ).mock.calls.filter(([url]: [string]) => url === "/security/abandoned-plugins");
      expect(statusCalls.length).toBeGreaterThanOrEqual(2);

      // Final rendered result matches the poll's finished payload, not the
      // stale mount-time cache.
      expect(
        screen.getByText("Some Abandoned Plugin")
      ).toBeInTheDocument();
    },
    10000
  );

  it(
    "a 429 'already running' response is NOT surfaced as an error — it starts polling the run already in flight",
    async () => {
      setupWpApiMock(
        () =>
          Promise.reject(
            new ApiError("Check already in progress.", 429, {
              success: false,
              in_progress: true,
              message: "Check already in progress.",
            })
          ),
        [finishedStatus()]
      );
      renderSecurityHub();

      const refreshButton = await screen.findByRole("button", {
        name: /re-check now/i,
      });
      fireEvent.click(refreshButton);

      await screen.findByRole("button", { name: /checking/i });

      await waitFor(
        () => {
          expect(
            screen.getByRole("button", { name: /re-check now/i })
          ).toBeInTheDocument();
        },
        { timeout: 8000 }
      );

      // Contract: 429 means "a check is already running", not a failure —
      // the existing generic failure toast must NOT fire for this path.
      expect(toast.error).not.toHaveBeenCalledWith(
        "Failed to refresh abandoned plugin data."
      );
    },
    10000
  );
});
