/**
 * File Integrity footer when the status is unknown (final .69 pass, fix round
 * FF-REACT-C, R3).
 *
 * The footer value is read from `core_integrity` in the `/security/status`
 * answer. Without that answer the footer cannot know whether the daily core
 * check ever ran, so it must not say "Never":
 *  - while the request is still loading it shows no value;
 *  - while the request is paused because the browser is offline it shows no
 *    value either (nothing was asked, nothing failed);
 *  - when the request failed (403, 500, no connection) it shows the same
 *    sentence the firewall tile on this tab shows: "Status unavailable —
 *    try again.";
 *  - when the request succeeded the three known states are unchanged.
 *
 * Production caller path: the real SecurityHub mounts the way the admin page
 * does, with its real `/security/status` query; only the network boundary
 * (`wpApi`) and the toast module are mocked. No JSX (React is stamped onto
 * window before SecurityHub is imported).
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
let waitFor: TL["waitFor"];
let React: typeof import("react");
let QueryClient: any;
let QueryClientProvider: any;
let wpApi: any;
let ApiError: any;
let onlineManager: any;

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  window.React = nodeRequire("react");
  window.ReactDOM = {
    ...nodeRequire("react-dom"),
    ...nodeRequire("react-dom/client"),
  };
  ({ default: SecurityHub } = await import("./SecurityHub"));
  ({ render, screen, cleanup, waitFor } =
    await import("@testing-library/react"));
  ({ QueryClient, QueryClientProvider, onlineManager } =
    await import("@tanstack/react-query"));
  ({ wpApi, ApiError } = await import("../services/api"));
  React = await import("react");
});

const STATUS = {
  firewall_enabled: true,
  spam_enabled: false,
  block_sqli: false,
  block_xss: false,
  simulation_mode: false,
  login_enabled: false,
  last_scan: "Never",
};

/** Inert defaults for every endpoint SecurityHub reads on mount; `status` is what `/security/status` does. */
function mockApi(status: () => Promise<unknown>) {
  (wpApi as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
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

/** The value next to the "Last Scan" label of the File Integrity card. */
const footerValue = async () => {
  const label = await screen.findByText("Last Scan");
  return label.nextElementSibling as HTMLElement;
};

const UNAVAILABLE = "Status unavailable — try again.";

describe("SecurityHub — File Integrity footer with an unknown status (R3)", () => {
  beforeEach(() => {
    (window as any).swisswpsuiteData = {};
  });

  afterEach(() => {
    cleanup();
    onlineManager.setOnline(true);
    vi.clearAllMocks();
  });

  it("loading: the footer shows no value", async () => {
    mockApi(() => new Promise(() => {}));
    mountHub();
    const value = await footerValue();
    expect(value.textContent).toBe("");
    // positive control: here the request was sent (and has not answered)
    expect(wpApi).toHaveBeenCalledWith("/security/status");
    // The firewall tile reads the same query: it is still checking too.
    expect(screen.queryByText(UNAVAILABLE)).not.toBeInTheDocument();
  });

  it("offline (query paused, never sent): the footer shows no value, not 'Never'", async () => {
    onlineManager.setOnline(false);
    mockApi(() => Promise.resolve(STATUS));
    mountHub();
    const value = await footerValue();
    expect(value.textContent).toBe("");
    // positive control: the query is paused. The status request was not sent
    // and nothing has failed, so the error sentence is not shown either.
    expect(wpApi).not.toHaveBeenCalledWith("/security/status");
    expect(screen.queryByText(UNAVAILABLE)).not.toBeInTheDocument();
  });

  it.each([
    ["a refusal (HTTP 403)", () => new ApiError("Forbidden", 403)],
    ["a server error (HTTP 500)", () => new ApiError("Server error", 500)],
    [
      "a request that never reached the server",
      () => new TypeError("Failed to fetch"),
    ],
  ])(
    "failed query, %s: the footer says the status is unavailable, not 'Never'",
    async (_label, makeError) => {
      mockApi(() => Promise.reject(makeError()));
      mountHub();
      // positive control: the request really failed (the firewall tile on the
      // same tab reports it with the same sentence)
      await screen.findAllByText(UNAVAILABLE);
      const value = await footerValue();
      expect(value.textContent).toBe(UNAVAILABLE);
      expect(value.textContent).not.toContain("Never");
    }
  );

  it("an answer without a core_integrity block (older backend): the footer shows no value", async () => {
    mockApi(() => Promise.resolve(STATUS));
    mountHub();
    // positive control: the answer arrived (the firewall tile left "Checking…")
    await waitFor(() =>
      expect(screen.queryByText("Checking…")).not.toBeInTheDocument()
    );
    const value = await footerValue();
    expect(value.textContent).toBe("");
    expect(screen.queryByText(UNAVAILABLE)).not.toBeInTheDocument();
  });

  it.each([
    [
      "enabled, never ran",
      { result: "not_run", enabled: true, checked_at: null },
      "Automatic daily checks enabled",
    ],
    [
      "switched off",
      { result: "not_run", enabled: false, checked_at: null },
      "Daily check off",
    ],
  ])(
    "control, %s: the known state is unchanged",
    async (_label, coreIntegrity, expected) => {
      mockApi(() =>
        Promise.resolve({
          ...STATUS,
          core_integrity: {
            issues_found: 0,
            informational_found: 0,
            ...coreIntegrity,
          },
        })
      );
      mountHub();
      await waitFor(async () =>
        expect((await footerValue()).textContent).toBe(expected)
      );
    }
  );

  it("control: a core check time is still shown as the time", async () => {
    const checkedAt = "2026-10-05T03:00:00+00:00";
    mockApi(() =>
      Promise.resolve({
        ...STATUS,
        core_integrity: {
          result: "clean",
          issues_found: 0,
          informational_found: 0,
          checked_at: checkedAt,
          enabled: true,
        },
      })
    );
    mountHub();
    await waitFor(async () =>
      expect((await footerValue()).textContent).toBe(
        new Date(checkedAt).toLocaleString()
      )
    );
  });
});
