/**
 * Vitest coverage for DASH-1/DASH-2 Fix A.1/C.2 (VALIDATOR_DASH.md §7
 * scenario A-1, v2.9.33.49).
 *
 * Root cause this guards against (validator-derived, re-confirmed against
 * source before this test was written): `get_stats()`
 * (class-swisswpsuite-api-settings.php) builds `traffic_data` with an
 * unconditional `for ($i = 6; $i >= 0; $i--)` loop that ALWAYS emits
 * exactly 7 entries — `traffic_data.length` can never be 0 on a real
 * response. Dashboard.tsx's pre-fix code gated its "tracking off / no data
 * yet" messaging on `stats.traffic_data.length === 0`, a condition that has
 * been permanently unreachable since the F-09 commit (f25a4b00,
 * v2.9.33.33) that introduced it — the chart always rendered a flat-zero
 * "Visits" line with zero explanation. Fix A.1 replaces that dead gate with
 * an inline legend badge driven by `settings.pageviewTrackingEnabled` and
 * `traffic_data.every(v => v.visits === 0)`. Fix C.2 does the same for the
 * "Blocked" series using the new `settings.firewallEnabled` field (Fix
 * C.1, additive backend field) and `security-status`'s `last_block_at`.
 *
 * This test drives the REAL production callers: it renders <Dashboard>
 * inside a real QueryClientProvider and lets its real useQuery/useSettings
 * hooks fetch through a mocked `wpApi` — not a pre-seeded cache bypassing
 * the fetch, and not a reimplementation of the indicator logic.
 *
 * Fail-first evidence (a test must be proven to fail
 * against the unfixed code): this file was run against the pre-fix
 * Dashboard.tsx (recovered via `git show HEAD:plugin/src/components/
 * Dashboard.tsx`, the HEAD-baseline method — never git stash, per project
 * convention) with the fix reverted in a scratch copy, confirming every
 * "off"/"WAF off" assertion below goes RED (the dead-code gate never fires
 * because traffic_data.length is 7, not 0 — the old branch's own
 * "Turn on Dashboard Traffic Counter" copy never rendered either), then
 * GREEN again once the real (fixed) file was restored. See the executor's
 * final report for the exact commands run and console output.
 *
 * React-externalization workaround (read before editing): same rationale
 * as ErrorBoundary.test.tsx / SecurityHub.abandonedPluginsAsyncRefresh.test.tsx
 * — this codebase externalizes React (WP.org Guideline 13, 2026-08-12);
 * jsdom never loads window.React, so the real npm react/react-dom is
 * stamped onto those globals in beforeAll BEFORE any aliased import runs.
 * No JSX in this file, React.createElement only.
 *
 * `wpApi` is mocked at the network boundary only — Dashboard's own
 * useQuery(["stats"]), useQuery(["security-status"]), and useSettings()'s
 * useQuery(["settings"]) all run for real against the mock.
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

vi.mock("../../lib/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("../../services/api", () => ({
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

type DashboardModule = typeof import("../Dashboard");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");
type ReactQueryModule = typeof import("@tanstack/react-query");
type ApiModule = typeof import("../../services/api");

let Dashboard: DashboardModule["default"];
let render: TestingLibraryModule["render"];
let screen: TestingLibraryModule["screen"];
let cleanup: TestingLibraryModule["cleanup"];
let fireEvent: TestingLibraryModule["fireEvent"];
let waitFor: TestingLibraryModule["waitFor"];
let React: ReactModule;
let QueryClient: ReactQueryModule["QueryClient"];
let QueryClientProvider: ReactQueryModule["QueryClientProvider"];
let wpApi: ApiModule["wpApi"];

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  const RealReact = nodeRequire("react");
  const RealReactDOM = nodeRequire("react-dom");
  const RealReactDOMClient = nodeRequire("react-dom/client");
  window.React = RealReact;
  window.ReactDOM = { ...RealReactDOM, ...RealReactDOMClient };

  ({ default: Dashboard } = await import("../Dashboard"));
  ({ render, screen, cleanup, fireEvent, waitFor } =
    await import("@testing-library/react"));
  ({ QueryClient, QueryClientProvider } =
    await import("@tanstack/react-query"));
  ({ wpApi } = await import("../../services/api"));
  React = await import("react");
});

type WpApiMock = ReturnType<typeof vi.fn>;

/**
 * A real GET /stats response shape — 7-entry traffic_data, matching
 * get_stats()'s unconditional `for ($i = 6; $i >= 0; $i--)` loop exactly
 * (api-settings.php:388-403). `visitsAllZero` controls whether every entry
 * carries `visits: 0` (the "quiet week" / "tracking just turned on" case);
 * `blocked` values are left at 0 regardless — the Blocked-series indicator
 * under test is driven by `firewallEnabled`/`last_block_at`, not by the
 * chart's own blocked counts.
 */
function realGetStatsResponse(visitsAllZero: boolean) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return {
    seo_score: 0,
    threats_blocked: 0,
    last_backup: "Never",
    traffic_data: days.map((name, i) => ({
      name,
      visits: visitsAllZero ? 0 : i + 1,
      blocked: 0,
    })),
    seo_breakdown: { on_page: 0, technical: 0, content: 0 },
  };
}

function settingsResponse(overrides: Record<string, unknown> = {}) {
  return {
    apiKey: "",
    useCustomApi: false,
    customApiUrl: "",
    customModelId: "",
    license: {},
    tokens: {},
    transferStrategy: "auto",
    emailNotifications: false,
    betaFeatures: false,
    loginMaxRetries: 5,
    wpscanApiKey: "",
    patchstackApiKey: "",
    coreIntegrityEnabled: false,
    abandonedPluginCheckEnabled: false,
    pageviewTrackingEnabled: true,
    firewallEnabled: true,
    ...overrides,
  };
}

function securityStatusResponse(overrides: Record<string, unknown> = {}) {
  return {
    firewall_enabled: true,
    spam_enabled: false,
    block_sqli: true,
    block_xss: true,
    simulation_mode: false,
    login_enabled: true,
    last_scan: "",
    threats_blocked: 0,
    last_block_at: null,
    ...overrides,
  };
}

function setupWpApiMock(opts: {
  visitsAllZero?: boolean;
  settings?: Record<string, unknown>;
  securityStatus?: Record<string, unknown>;
}) {
  (wpApi as unknown as WpApiMock).mockImplementation((url: string) => {
    if (url === "/stats") {
      return Promise.resolve(realGetStatsResponse(opts.visitsAllZero ?? true));
    }
    if (url === "/settings") {
      return Promise.resolve(settingsResponse(opts.settings));
    }
    if (url === "/security/status") {
      return Promise.resolve(securityStatusResponse(opts.securityStatus));
    }
    return Promise.resolve({ success: true });
  });
}

function renderDashboard(onNavigate = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(Dashboard, { onNavigate })
    )
  );
  return { onNavigate };
}

describe("Dashboard traffic-chart legend indicators (DASH-1/DASH-2 Fix A.1/C.2)", () => {
  beforeEach(() => {
    (window as any).swisswpsuiteData = {
      apiUrl: "http://localhost/wp-json/swisswpsuite/v1",
      nonce: "test-nonce",
    };
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("F-11 (REAUDIT_DASH_R1.md round 2): does not paint 'No visits yet' while GET /settings is still pending, even though /stats has already resolved with all-zero visits", async () => {
    let resolveSettings!: (value: unknown) => void;
    const pendingSettings = new Promise((resolve) => {
      resolveSettings = resolve;
    });
    (wpApi as unknown as WpApiMock).mockImplementation((url: string) => {
      if (url === "/stats") {
        return Promise.resolve(realGetStatsResponse(true));
      }
      if (url === "/settings") return pendingSettings;
      if (url === "/security/status") {
        return Promise.resolve(securityStatusResponse());
      }
      return Promise.resolve({ success: true });
    });
    renderDashboard();

    // Proxy for "/stats has resolved and `stats` state has been set": the
    // Last Backup tile renders "-" (the `loading` placeholder) until
    // setLoading(false)/setStats() run, then switches to the real
    // stats.last_backup value ("Never" in this fixture) — a text change
    // that only happens once /stats has actually landed, independent of
    // /settings (which we are deliberately never resolving up to here).
    await waitFor(() => {
      expect(screen.getByText("Never")).toBeInTheDocument();
    });

    // /settings is still pending at this point — settings is `undefined`.
    // Pre-fix, `pageviewTrackingOff` read `undefined?.x === false` (=
    // false), so `visitsAllZero` went true off the now-loaded 7-entry
    // all-zero traffic_data and painted "No visits yet" one frame early.
    expect(screen.queryByText(/no visits yet/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /tracking is off/i })
    ).not.toBeInTheDocument();

    // Resolving settings as tracking-OFF proves the badge still flips
    // correctly once real data is in — this isn't just permanently blank.
    resolveSettings(
      settingsResponse({
        pageviewTrackingEnabled: false,
        firewallEnabled: true,
      })
    );
    const offBadge = await screen.findByRole("button", {
      name: /tracking is off/i,
    });
    expect(offBadge).toHaveTextContent(/tracking off/i);
  }, 10000);

  it("A-1: shows 'tracking off' next to Visits when pageviewTrackingEnabled is false, even though traffic_data always has 7 zero-value entries", async () => {
    setupWpApiMock({
      visitsAllZero: true,
      settings: { pageviewTrackingEnabled: false, firewallEnabled: true },
    });
    const { onNavigate } = renderDashboard();

    const offBadge = await screen.findByRole("button", {
      name: /tracking is off/i,
    });
    expect(offBadge).toHaveTextContent(/tracking off/i);

    // Must NOT fall through to the "no visits yet" wording — off beats
    // no-data, per the validator's corrected design (§1 Fix A).
    expect(screen.queryByText(/no visits yet/i)).not.toBeInTheDocument();

    // One-click, no-reload navigation to Settings (AJAX-SPA rule) — not a
    // page reload or external link.
    fireEvent.click(offBadge);
    expect(onNavigate).toHaveBeenCalledWith("settings");
  }, 10000);

  it("shows 'No visits yet' when tracking is ON but every traffic_data entry has visits: 0", async () => {
    setupWpApiMock({
      visitsAllZero: true,
      settings: { pageviewTrackingEnabled: true, firewallEnabled: true },
    });
    renderDashboard();

    expect(await screen.findByText(/no visits yet/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /tracking is off/i })
    ).not.toBeInTheDocument();
  }, 10000);

  it("C.2: shows 'WAF off' next to Blocked when settings.firewallEnabled is false", async () => {
    setupWpApiMock({
      visitsAllZero: false,
      settings: { pageviewTrackingEnabled: true, firewallEnabled: false },
      securityStatus: { last_block_at: "2026-09-01T10:00:00Z" },
    });
    renderDashboard();

    expect(await screen.findByText(/waf off/i)).toBeInTheDocument();
    // "off" must win over a stale/irrelevant last_block_at value.
    expect(screen.queryByText(/last block/i)).not.toBeInTheDocument();
  }, 10000);

  it("shows 'Last block <date>' next to Blocked when the WAF is on and a real block timestamp is present", async () => {
    setupWpApiMock({
      visitsAllZero: false,
      settings: { pageviewTrackingEnabled: true, firewallEnabled: true },
      securityStatus: { last_block_at: "2026-09-01T10:00:00Z" },
    });
    renderDashboard();

    expect(await screen.findByText(/last block/i)).toBeInTheDocument();
    expect(screen.queryByText(/waf off/i)).not.toBeInTheDocument();
  }, 10000);
});
