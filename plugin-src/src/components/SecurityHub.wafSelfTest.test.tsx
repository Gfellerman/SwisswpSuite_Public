/**
 * Vitest coverage for the WAF Self-Test tile (B.6/DASH-2,
 * VALIDATOR_DASH.md §1 Fix B / §7, v2.9.33.49).
 *
 * Backend contract this test codes against — VERIFIED against the built
 * backend (class-swisswpsuite-api-security.php, class-swisswpsuite-
 * security.php), a PARALLEL PHP executor's work that landed mid-session.
 * The frontend still degrades safely to "never"/"off" against an older
 * backend that omits `waf_self_test` entirely, since the field is
 * additive/optional on SecurityStatus:
 *   - GET /security/status gains an optional `waf_self_test` field:
 *     { last_run: string|null; result: "ok"|"failed"|"unknown"|"off"|"never";
 *       http_code: number|null; blocked_row_seen: boolean|null; detail: string }
 *   - POST /security/waf-self-test runs the probe and returns
 *     { success: boolean; result?: { time: string; result: <same enum>;
 *       http_code: number|null; blocked_row_seen: boolean|null; detail: string } }
 *     — note the DIFFERENT top-level key (`result`, not `waf_self_test`)
 *     AND the different timestamp field name (`time`, not `last_run`) from
 *     the GET endpoint's shape. This mismatch was caught by /contract_sync
 *     against the real source and fixed in SecurityHub.tsx's
 *     runWafSelfTest(), which re-shapes the POST payload into the GET
 *     shape before calling setWafSelfTest().
 *
 * This test drives the REAL production render path: it mounts the actual
 * <SecurityHub> on its default "dashboard" tab (the WAF card renders there
 * unconditionally — confirmed via source, same card as the Smart Firewall
 * toggle) and, for the click scenario, fires the
 * real on-screen "Run self-test now" button — not a reimplementation of
 * runWafSelfTest().
 *
 * Fail-first evidence (a test must be proven to fail
 * against the unfixed code): every assertion below was run against the
 * pre-B.6 SecurityHub.tsx (recovered via `git show HEAD:plugin/src/
 * components/SecurityHub.tsx`, the HEAD-baseline method — never git stash)
 * and confirmed to fail (no "WAF Self-Test" heading, no "Run self-test now"
 * button exist at all pre-fix), then to pass again once the real (fixed)
 * file was restored. See the executor's final report for the exact
 * commands and console output.
 *
 * React-externalization workaround + scope-narrowing mocks: identical
 * rationale and choices as SecurityHub.abandonedPluginsAsyncRefresh.test.tsx
 * (same file, same "dashboard" tab) — see that file's header for the full
 * explanation. `wpApi` is mocked at the network boundary only.
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

vi.mock("../lib/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

// Renders a react-router <Link>; these suites mount SecurityHub outside a
// Router, so the real component cannot be used here.
vi.mock("./organisms/Security/TwoFactorNudgeLink", () => ({
  TwoFactorNudgeLink: () => null,
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
type SonnerModule = typeof import("../lib/toast");

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
let toast: SonnerModule["toast"];

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  const RealReact = nodeRequire("react");
  const RealReactDOM = nodeRequire("react-dom");
  const RealReactDOMClient = nodeRequire("react-dom/client");
  window.React = RealReact;
  window.ReactDOM = { ...RealReactDOM, ...RealReactDOMClient };

  ({ default: SecurityHub } = await import("./SecurityHub"));
  ({ render, screen, cleanup, fireEvent, waitFor } =
    await import("@testing-library/react"));
  ({ QueryClient, QueryClientProvider } =
    await import("@tanstack/react-query"));
  ({ wpApi } = await import("../services/api"));
  ({ toast } = await import("../lib/toast"));
  React = await import("react");
});

type WpApiMock = ReturnType<typeof vi.fn>;

function securityStatusResponse(overrides: Record<string, unknown> = {}) {
  return {
    firewall_enabled: true,
    spam_enabled: false,
    block_sqli: true,
    block_xss: true,
    simulation_mode: false,
    geo_enabled: false,
    global_geo_block: false,
    login_enabled: true,
    last_scan: "",
    waf_self_test: null,
    ...overrides,
  };
}

/**
 * Every other endpoint SecurityHub queries on mount gets a safe, inert
 * default so those unrelated useQuery calls don't throw or hang — same
 * list as SecurityHub.abandonedPluginsAsyncRefresh.test.tsx's
 * setupWpApiMock().
 */
function setupWpApiMock(opts: {
  status?: Record<string, unknown>;
  selfTestPost?: () => Promise<any>;
  statusError?: boolean;
}) {
  let statusCallCount = 0;

  (wpApi as unknown as WpApiMock).mockImplementation((url: string) => {
    if (url === "/security/status") {
      statusCallCount++;
      if (opts.statusError) {
        return Promise.reject(new Error("network error"));
      }
      return Promise.resolve(securityStatusResponse(opts.status));
    }
    if (url === "/security/waf-self-test") {
      return (
        opts.selfTestPost ?? (() => Promise.resolve({ success: true }))
      )();
    }
    if (url === "/hardening/status") {
      return Promise.resolve({ success: true, options: {} });
    }
    if (url === "/security/logs") return Promise.resolve([]);
    if (url === "/security/banned-ips") return Promise.resolve({ ips: [] });
    if (url === "/security/sentinel/latest-scan")
      return Promise.resolve({ success: false, record: null });
    if (url === "/security/environment")
      return Promise.resolve({
        success: true,
        environment: { cloudflare: { detected: false } },
      });
    if (url === "/security/abandoned-plugins")
      return Promise.resolve({
        success: true,
        enabled: false,
        last_check: 0,
        in_progress: false,
        plugins: [],
      });
    return Promise.resolve({ success: true });
  });

  return {
    getStatusCallCount: () => statusCallCount,
  };
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

describe("SecurityHub — WAF Self-Test tile (B.6/DASH-2)", () => {
  beforeEach(() => {
    (window as any).swisswpsuiteData = {};
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("loading: before /security/status resolves, does NOT assert 'currently disabled' even when the real firewall setting is ON (F-9, REAUDIT_DASH_R1.md round 2)", () => {
    // firewallEnabled starts life as useState(false) — this deliberately
    // configures the REAL eventual answer as ON, so any assertion of
    // "disabled" observed before the query has data is provably a lie,
    // not a coincidence of the fixture. No await/findBy* here: the mock's
    // Promise.resolve() settles on the next microtask, so a synchronous
    // assertion immediately after render() is the only way to observe the
    // pre-data first paint deterministically (same technique as the
    // synchronous "Running…" busy-state assertion below).
    setupWpApiMock({ status: { firewall_enabled: true } });
    renderSecurityHub();

    expect(
      screen.queryByText(/firewall is currently disabled/i)
    ).not.toBeInTheDocument();
  });

  it("off: firewall disabled — shows 'firewall is currently disabled' and disables the button", async () => {
    setupWpApiMock({ status: { firewall_enabled: false } });
    renderSecurityHub();

    expect(
      await screen.findByText(/firewall is currently disabled/i)
    ).toBeInTheDocument();
    const button = screen.getByRole("button", {
      name: /run self-test now/i,
    });
    expect(button).toBeDisabled();
  });

  it("never: firewall on, no self-test has ever run — shows 'Never run' and an enabled button", async () => {
    setupWpApiMock({
      status: { firewall_enabled: true, waf_self_test: null },
    });
    renderSecurityHub();

    expect(await screen.findByText(/never run/i)).toBeInTheDocument();
    const button = screen.getByRole("button", {
      name: /run self-test now/i,
    });
    expect(button).not.toBeDisabled();
  });

  it("ok: shows the OK verdict with its timestamp", async () => {
    setupWpApiMock({
      status: {
        firewall_enabled: true,
        waf_self_test: {
          last_run: "2026-09-03T08:00:00Z",
          result: "ok",
          http_code: 403,
          blocked_row_seen: true,
          detail: "blocked as expected",
        },
      },
    });
    renderSecurityHub();

    const okLine = await screen.findByText(/^OK/);
    expect(okLine).toBeInTheDocument();
    expect(okLine.textContent).toMatch(/—/); // timestamp appended
  });

  it("failed: shows the FAILED verdict distinctly from OK", async () => {
    setupWpApiMock({
      status: {
        firewall_enabled: true,
        waf_self_test: {
          last_run: "2026-09-03T08:00:00Z",
          result: "failed",
          http_code: 200,
          blocked_row_seen: false,
          detail: "request was not blocked",
        },
      },
    });
    renderSecurityHub();

    // NOT /failed/i — the pre-existing Login Safeguard card's helper text
    // ("After this many failed logins, the IP is temporarily locked out...")
    // already contains the lowercase substring "failed" elsewhere on this
    // same "dashboard" tab (found via a deliberate fail-first check: an
    // early, looser version of this assertion passed even against the
    // pre-B.6 baseline with no WAF Self-Test tile at all — a false-positive
    // this codebase's Evidence Contract exists to catch, rule 6). The tile's
    // own text is uppercase "FAILED" at the very start of its status line —
    // an anchored, case-sensitive match is unambiguous.
    expect(await screen.findByText(/^FAILED/)).toBeInTheDocument();
    expect(screen.queryByText(/^OK/)).not.toBeInTheDocument();
  });

  it("unknown: loopback unreachable is reported as unknown, never as OK", async () => {
    setupWpApiMock({
      status: {
        firewall_enabled: true,
        waf_self_test: {
          last_run: "2026-09-03T08:00:00Z",
          result: "unknown",
          http_code: 0,
          blocked_row_seen: null,
          detail: "loopback request timed out",
        },
      },
    });
    renderSecurityHub();

    expect(
      await screen.findByText(/unknown \(loopback unreachable\)/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/^OK/)).not.toBeInTheDocument();
  });

  // R4-1 (VALIDATOR_DASH_R4.md §3.7): `result === "unknown"` has SIX
  // distinct causes, and `http_code` is a TOTAL function onto the cause
  // class (see SwissWPSuite_Security::run_waf_self_test()'s ladder). Each
  // case below pins one cause class to its label AND asserts the backend's
  // own `detail` sentence is rendered underneath — the field was fetched,
  // typed, and stored since v2.9.33.49 but never read until this fix.
  //
  // Fail-first: reverting the tile's label expression
  // from `Unknown ({unknownCause(wafSelfTest.http_code)})` back to the old
  // literal `Unknown (loopback unreachable)` turns exactly 5 of these 6
  // cases red — case "http_code: 0" stays green BY DESIGN, since that is
  // the one cause for which the old label happened to be true, which is
  // exactly why the bug shipped invisibly. Reverting the
  // `{wafSelfTest.detail ? … : null}` block to `null` turns all 7 detail
  // assertions in this describe block red (the 6 below + the "failed"
  // case).
  it.each([
    {
      label: "http_code null -> loopback request failed",
      http_code: null as number | null,
      detail: "Loopback request failed: cURL error 28",
      labelPattern: /unknown \(loopback request failed\)/i,
      detailPattern: /cURL error 28/,
    },
    {
      label: "http_code 0 -> loopback unreachable",
      http_code: 0,
      detail: "Loopback returned HTTP 0 — the site could not be reached.",
      labelPattern: /unknown \(loopback unreachable\)/i,
      detailPattern: /HTTP 0/,
    },
    {
      label: "http_code 503 -> site did not respond normally",
      http_code: 503,
      detail:
        "The site did not respond normally to the self-test probe (HTTP 503).",
      labelPattern: /unknown \(site did not respond normally\)/i,
      detailPattern: /HTTP 503/,
    },
    {
      label: "http_code 403 -> blocked before the firewall ran",
      http_code: 403,
      detail:
        "The request was blocked before the firewall could evaluate it — likely an upstream/CDN rule.",
      labelPattern: /unknown \(blocked before the firewall ran\)/i,
      detailPattern: /upstream\/CDN/,
    },
    {
      label: "http_code 200 -> probe never reached the firewall",
      http_code: 200,
      detail:
        "The probe never reached the firewall — it was served from a cache.",
      labelPattern: /unknown \(probe never reached the firewall\)/i,
      detailPattern: /served from a cache/,
    },
    {
      label: "http_code 418 -> unexpected response (HTTP 418)",
      http_code: 418,
      detail: "The self-test probe did not reach a normal page.",
      labelPattern: /unknown \(unexpected response \(HTTP 418\)\)/i,
      detailPattern: /did not reach a normal page/,
    },
  ])(
    "unknown cause map: $label — renders the cause label and the backend detail sentence",
    async ({ http_code, detail, labelPattern, detailPattern }) => {
      setupWpApiMock({
        status: {
          firewall_enabled: true,
          waf_self_test: {
            last_run: "2026-09-03T08:00:00Z",
            result: "unknown",
            http_code,
            blocked_row_seen: null,
            detail,
          },
        },
      });
      renderSecurityHub();

      expect(await screen.findByText(labelPattern)).toBeInTheDocument();
      expect(await screen.findByText(detailPattern)).toBeInTheDocument();
    }
  );

  it("failed: renders the backend's detail sentence under the FAILED verdict (carries the probed rule name)", async () => {
    setupWpApiMock({
      status: {
        firewall_enabled: true,
        waf_self_test: {
          last_run: "2026-09-03T08:00:00Z",
          result: "failed",
          http_code: 200,
          blocked_row_seen: false,
          detail:
            "The firewall ran but did not detect the SQL-injection test attack (HTTP 200).",
        },
      },
    });
    renderSecurityHub();

    expect(await screen.findByText(/^FAILED/)).toBeInTheDocument();
    expect(
      await screen.findByText(/SQL-injection test attack/)
    ).toBeInTheDocument();
  });

  it("error: /security/status rejects — shows an error state with the button enabled", async () => {
    // R2-4 (REAUDIT_DASH_R2.md, v2.9.33.49 round 3): before the fix, a
    // rejected /security/status query left data === undefined forever,
    // which is indistinguishable from "still loading" — the tile stayed on
    // "Checking…" permanently and the button stayed disabled because
    // firewallEnabled never leaves its useState(false) default. This drives
    // the real production render path (no reimplementation of the query).
    setupWpApiMock({ status: { firewall_enabled: true }, statusError: true });
    renderSecurityHub();

    expect(await screen.findByText(/status unavailable/i)).toBeInTheDocument();

    expect(screen.queryByText(/checking/i)).not.toBeInTheDocument();

    const button = screen.getByRole("button", {
      name: /run self-test now/i,
    });
    expect(button).not.toBeDisabled();
  });

  it("Run self-test now: posts to /security/waf-self-test, shows a busy state, then refreshes the tile from the invalidated security-status query", async () => {
    const mocks = setupWpApiMock({
      status: { firewall_enabled: true, waf_self_test: null },
      selfTestPost: () =>
        Promise.resolve({
          success: true,
          // Real POST shape (class-swisswpsuite-api-security.php::
          // run_waf_self_test_now()): nested under `result`, timestamp
          // field is `time` — NOT `waf_self_test`/`last_run` (that's only
          // GET /security/status's shape). See this file's header note.
          result: {
            time: "2026-09-03T09:00:00Z",
            result: "ok",
            http_code: 403,
            blocked_row_seen: true,
            detail: "blocked as expected",
          },
        }),
    });
    renderSecurityHub();

    const button = await screen.findByRole("button", {
      name: /run self-test now/i,
    });
    expect(await screen.findByText(/never run/i)).toBeInTheDocument();

    fireEvent.click(button);

    // Synchronous busy state — setRunningWafSelfTest(true) runs as the
    // FIRST line of runWafSelfTest(), before any await, matching the
    // project's established loading-state pattern (identical assertion
    // shape to SecurityHub.abandonedPluginsAsyncRefresh.test.tsx). This
    // must be a SYNCHRONOUS query (no `await`/findBy*): the mock's
    // Promise.resolve() settles on the very next microtask, so an async
    // findBy* poll can observe the DOM only after the busy state has
    // already reverted — asserting immediately, in the same tick as
    // fireEvent.click, is the only way to catch it deterministically.
    expect(screen.getByRole("button", { name: /running/i })).toHaveAttribute(
      "aria-busy",
      "true"
    );

    expect(wpApi).toHaveBeenCalledWith("/security/waf-self-test", {
      method: "POST",
    });

    await waitFor(() => {
      expect(screen.getByText(/^OK/)).toBeInTheDocument();
    });

    expect(toast.success).toHaveBeenCalled();

    // Cache invalidation triggered a real second GET /security/status —
    // proves the tile refresh is wired through TanStack Query, not just
    // the POST response's local setState.
    expect(mocks.getStatusCallCount()).toBeGreaterThanOrEqual(2);
  }, 10000);
});
