/**
 * File Integrity card: the reload hint (final .69 pass, fix round FF-REACT-C).
 *
 * The daily core check runs on the server, on its own schedule. An open
 * Security page reads the status once when it opens and does not read it
 * again, so a check that finishes while the page is open does not show until
 * the page is loaded again. Under the "Last Scan" value the card says so:
 * "Reload the page to see the latest result."
 *
 * The sentence is shown only where it is true and useful: the daily check is
 * on. It is not shown while the status is loading or has failed, or when the
 * daily check is off (a reload cannot bring a result that will never come).
 *
 * Production caller path: the real SecurityHub mounts the way the admin page
 * does, with its real `["security-status"]` query; only the network boundary
 * (`wpApi`) and the toast module are mocked. The "proof" tests below use the
 * real shared query client and load the page twice, the second time from a
 * fresh module registry (what a browser reload does). No JSX (React is stamped
 * onto window before SecurityHub is imported).
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

vi.mock("./organisms/Security/TwoFactorNudgeLink", () => ({
  TwoFactorNudgeLink: () => null,
}));

vi.mock("../services/api", () => ({
  wpApi: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = "ApiError";
      this.status = status;
    }
  },
}));

type TL = typeof import("@testing-library/react");
let SecurityHub: any;
let render: TL["render"];
let screen: TL["screen"];
let cleanup: TL["cleanup"];
let act: TL["act"];
let waitFor: TL["waitFor"];
let React: typeof import("react");
let QueryClient: any;
let QueryClientProvider: any;
let queryClient: any;
let wpApi: any;
let ApiError: any;

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  window.React = nodeRequire("react");
  window.ReactDOM = {
    ...nodeRequire("react-dom"),
    ...nodeRequire("react-dom/client"),
  };
  ({ default: SecurityHub } = await import("./SecurityHub"));
  ({ render, screen, cleanup, act, waitFor } =
    await import("@testing-library/react"));
  ({ QueryClient, QueryClientProvider } =
    await import("@tanstack/react-query"));
  ({ queryClient } = await import("../lib/queryClient"));
  ({ wpApi, ApiError } = await import("../services/api"));
  React = await import("react");
});

const HINT = "Reload the page to see the latest result.";
const FIRST_CHECK = "2026-10-05T03:00:00+00:00";
const SECOND_CHECK = "2026-10-26T09:15:00+00:00";

const STATUS = {
  firewall_enabled: true,
  spam_enabled: false,
  block_sqli: false,
  block_xss: false,
  simulation_mode: false,
  login_enabled: false,
  last_scan: "Never",
};

const coreIntegrity = (over: Record<string, unknown> = {}) => ({
  result: "clean",
  issues_found: 0,
  informational_found: 0,
  checked_at: FIRST_CHECK,
  enabled: true,
  ...over,
});

/** Inert defaults for every endpoint SecurityHub reads on mount; `status` is what `/security/status` does. */
function mockApiOn(api: any, status: () => Promise<unknown>) {
  (api as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
    if (url === "/security/status") return status();
    if (url === "/hardening/status")
      return Promise.resolve({ success: true, options: {} });
    if (url === "/security/logs") return Promise.resolve([]);
    if (url === "/security/banned-ips")
      return Promise.resolve({
        ips: [],
        allowed_ips: [],
        current_ip: "203.0.113.5",
      });
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

function mountHub() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    React.createElement(
      QueryClientProvider,
      { client },
      React.createElement(SecurityHub)
    )
  );
}

const footerRow = async () =>
  (await screen.findByText("Last Scan")).parentElement as HTMLElement;
const footerValue = async () =>
  (await footerRow()).lastElementChild as HTMLElement;
/** Same as footerValue, for tests with a faked clock (findBy* would wait on the faked timers). */
const footerValueNow = () =>
  screen.getByText("Last Scan").parentElement!.lastElementChild as HTMLElement;
const hints = () => screen.queryAllByText(HINT);

describe("SecurityHub — reload hint under the File Integrity 'Last Scan' value", () => {
  beforeEach(() => {
    (window as any).swisswpsuiteData = {};
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("daily check on, with a check time: the sentence sits directly under the value", async () => {
    mockApiOn(wpApi, () =>
      Promise.resolve({ ...STATUS, core_integrity: coreIntegrity() })
    );
    mountHub();
    await waitFor(async () =>
      expect((await footerValue()).textContent).toBe(
        new Date(FIRST_CHECK).toLocaleString()
      )
    );
    expect(hints()).toHaveLength(1);
    const row = await footerRow();
    expect(row.nextElementSibling).toBe(hints()[0]);
    expect(hints()[0].textContent).toBe(HINT);
  });

  it("daily check on, never ran yet: the sentence is shown", async () => {
    mockApiOn(wpApi, () =>
      Promise.resolve({
        ...STATUS,
        core_integrity: coreIntegrity({ result: "not_run", checked_at: null }),
      })
    );
    mountHub();
    await waitFor(async () =>
      expect((await footerValue()).textContent).toBe(
        "Automatic daily checks enabled"
      )
    );
    expect(hints()).toHaveLength(1);
  });

  it.each([
    ["off, never ran", { enabled: false, result: "not_run", checked_at: null }],
    ["off, with an earlier check time", { enabled: false }],
  ])(
    "daily check %s: no sentence (a reload cannot bring a new result)",
    async (_label, over) => {
      mockApiOn(wpApi, () =>
        Promise.resolve({ ...STATUS, core_integrity: coreIntegrity(over) })
      );
      mountHub();
      // positive control: the answer arrived and is on screen
      await waitFor(async () =>
        expect((await footerValue()).textContent).not.toBe("")
      );
      expect(hints()).toHaveLength(0);
    }
  );

  it("status loading: no sentence", async () => {
    mockApiOn(wpApi, () => new Promise(() => {}));
    mountHub();
    // positive control: the page is up and the status request is pending
    await footerRow();
    expect(wpApi).toHaveBeenCalledWith("/security/status");
    expect(hints()).toHaveLength(0);
  });

  it.each([
    ["a refusal (HTTP 403)", () => new ApiError("Forbidden", 403)],
    ["a server error (HTTP 500)", () => new ApiError("Server error", 500)],
    ["no connection", () => new TypeError("Failed to fetch")],
  ])("status failed, %s: no sentence", async (_label, makeError) => {
    mockApiOn(wpApi, () => Promise.reject(makeError()));
    mountHub();
    // positive control: the request really failed (the firewall tile on the
    // same tab says so)
    await screen.findAllByText("Status unavailable — try again.");
    expect(hints()).toHaveLength(0);
  });

  it("an answer without a core_integrity block (older backend): no sentence", async () => {
    mockApiOn(wpApi, () => Promise.resolve(STATUS));
    mountHub();
    // positive control: the answer arrived (the firewall tile left "Checking…")
    await waitFor(() =>
      expect(screen.queryByText("Checking…")).not.toBeInTheDocument()
    );
    await footerRow();
    expect(hints()).toHaveLength(0);
  });
});

describe("SecurityHub — the reload hint is true (proof)", () => {
  let serverCheckedAt: string;
  const serverAnswer = () =>
    Promise.resolve({
      ...STATUS,
      core_integrity: coreIntegrity({ checked_at: serverCheckedAt }),
    });

  beforeEach(() => {
    (window as any).swisswpsuiteData = {};
    queryClient.clear();
    serverCheckedAt = FIRST_CHECK;
  });

  afterEach(() => {
    cleanup();
    queryClient.clear();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("without a reload an open page keeps the answer it read when it opened", async () => {
    vi.useFakeTimers();
    mockApiOn(wpApi, serverAnswer);
    render(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(SecurityHub)
      )
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(footerValueNow().textContent).toBe(
      new Date(FIRST_CHECK).toLocaleString()
    );

    // the daily check finishes on the server while the page is open
    serverCheckedAt = SECOND_CHECK;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60_000);
    });
    expect(footerValueNow().textContent).toBe(
      new Date(FIRST_CHECK).toLocaleString()
    );
    expect(
      (wpApi as ReturnType<typeof vi.fn>).mock.calls.filter(
        ([url]: [string]) => url === "/security/status"
      )
    ).toHaveLength(1);
    // so the sentence is on screen
    expect(hints()).toHaveLength(1);
  });

  it("a reload starts the page again, reads the status again and shows the check that finished meanwhile", async () => {
    // first page load
    mockApiOn(wpApi, serverAnswer);
    render(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(SecurityHub)
      )
    );
    await waitFor(async () =>
      expect((await footerValue()).textContent).toBe(
        new Date(FIRST_CHECK).toLocaleString()
      )
    );

    // the daily check finishes on the server; the browser reloads the page:
    // the old page is gone and the scripts run again with nothing carried over
    serverCheckedAt = SECOND_CHECK;
    cleanup();
    // the request log of the old page does not carry over either
    (wpApi as ReturnType<typeof vi.fn>).mockClear();
    vi.resetModules();
    const fresh = {
      SecurityHub: (await import("./SecurityHub")).default,
      QueryClientProvider: (await import("@tanstack/react-query"))
        .QueryClientProvider,
      queryClient: (await import("../lib/queryClient")).queryClient,
      wpApi: (await import("../services/api")).wpApi,
    };
    expect(fresh.queryClient).not.toBe(queryClient);
    expect(fresh.queryClient.getQueryCache().getAll()).toHaveLength(0);
    mockApiOn(fresh.wpApi, serverAnswer);

    render(
      React.createElement(
        fresh.QueryClientProvider,
        { client: fresh.queryClient },
        React.createElement(fresh.SecurityHub)
      )
    );
    await waitFor(async () =>
      expect((await footerValue()).textContent).toBe(
        new Date(SECOND_CHECK).toLocaleString()
      )
    );
    expect(
      (fresh.wpApi as ReturnType<typeof vi.fn>).mock.calls.filter(
        ([url]: [string]) => url === "/security/status"
      )
    ).toHaveLength(1);
    expect(hints()).toHaveLength(1);
  });
});
