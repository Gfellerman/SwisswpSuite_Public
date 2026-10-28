/**
 * Dashboard "Try again" after GET /stats fails.
 *
 * Install path: plugin/src/components/__tests__/Dashboard.statsRetry.test.tsx
 *
 * Drives the real Dashboard with its real useQuery(["stats"]),
 * useQuery(["security-status"]) and useSettings() hooks; only `wpApi` and the
 * toast module are mocked. The /stats request is answered from a handler the
 * test swaps, so a retry can be held in flight and settled by hand.
 *
 * Expected behaviour:
 *  - the load-error alert stays on screen during the retry;
 *  - "Try again" keeps keyboard focus through the retry and reports itself
 *    unavailable with aria-disabled (a native `disabled` would drop focus to
 *    the page); a second click starts no second request;
 *  - after a failed retry the button is available again and still focused;
 *  - the alert text is drawn with theme tokens that keep their contrast in
 *    both colour schemes (fixed neutral palette classes do not change in dark
 *    mode, jsdom computes no colours, so the classes are what this locks).
 *
 * React externalisation workaround as in DashboardTrafficIndicator.test.tsx.
 * No JSX.
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
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
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

type TL = typeof import("@testing-library/react");
let Dashboard: any;
let render: TL["render"];
let screen: TL["screen"];
let cleanup: TL["cleanup"];
let fireEvent: TL["fireEvent"];
let waitFor: TL["waitFor"];
let act: TL["act"];
let within: TL["within"];
let React: typeof import("react");
let QueryClient: any;
let QueryClientProvider: any;
let wpApi: any;
let ApiErrorCtor: any;

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  window.React = nodeRequire("react");
  window.ReactDOM = {
    ...nodeRequire("react-dom"),
    ...nodeRequire("react-dom/client"),
  };
  ({ default: Dashboard } = await import("../Dashboard"));
  ({ render, screen, cleanup, fireEvent, waitFor, act, within } =
    await import("@testing-library/react"));
  ({ QueryClient, QueryClientProvider } =
    await import("@tanstack/react-query"));
  ({ wpApi, ApiError: ApiErrorCtor } = await import("../../services/api"));
  React = await import("react");
});

function statsResponse() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return {
    seo_score: 40,
    threats_blocked: 0,
    last_backup: "3 hours ago",
    traffic_data: days.map((name) => ({ name, visits: 1, blocked: 0 })),
    seo_breakdown: { on_page: 40, technical: 40, content: 40 },
  };
}

interface Deferred {
  promise: Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

function deferred(): Deferred {
  let resolve!: (value: unknown) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<unknown>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const serverError = () => new ApiErrorCtor("Server error (HTTP 500)", 500, {});

let statsHandler: () => Promise<unknown>;

function statsCalls(): number {
  return (wpApi as any).mock.calls.filter((c: any[]) => c[0] === "/stats")
    .length;
}

function installApiMock() {
  (wpApi as any).mockImplementation((url: string) => {
    if (url === "/stats") return statsHandler();
    if (url === "/settings") {
      return Promise.resolve({
        pageviewTrackingEnabled: true,
        firewallEnabled: true,
      });
    }
    if (url === "/security/status") {
      return Promise.resolve({ last_block_at: null });
    }
    return Promise.reject(new Error(`unmocked ${url}`));
  });
}

function renderDashboard() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(Dashboard, { onNavigate: vi.fn() })
    )
  );
  return qc;
}

const LOAD_ERROR = /dashboard data could not be loaded/i;

beforeEach(() => {
  (window as any).swisswpsuiteData = {
    apiUrl: "http://localhost/wp-json/swisswpsuite/v1",
    nonce: "test-nonce",
  };
  statsHandler = () => Promise.reject(serverError());
  (wpApi as any).mockReset();
  installApiMock();
});

afterEach(() => {
  cleanup();
});

describe("Dashboard: Try again while the retry is in flight", () => {
  it("keeps the alert and the focus, reports aria-disabled and ignores a second click", async () => {
    const qc = renderDashboard();
    await screen.findByText(LOAD_ERROR);
    const retry = screen.getByRole("button", { name: /try again/i });
    retry.focus();
    expect(document.activeElement).toBe(retry);
    expect(retry).toHaveAttribute("aria-disabled", "false");

    const pending = deferred();
    statsHandler = () => pending.promise;
    const before = statsCalls();
    const statsQuery = qc.getQueryCache().find({ queryKey: ["stats"] });
    const fetchSpy = vi.spyOn(statsQuery, "fetch");

    fireEvent.click(retry);
    await waitFor(() => expect(statsCalls()).toBe(before + 1));
    await waitFor(() => expect(retry).toHaveAttribute("aria-disabled", "true"));
    expect(retry.isConnected).toBe(true);
    expect(screen.getByRole("alert")).toHaveTextContent(LOAD_ERROR);
    expect(document.activeElement).toBe(retry);

    // A second click while the retry runs asks for nothing more. (The query
    // joins the running request anyway, so the request count alone cannot
    // tell; the spy on the query's fetch can.)
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    fireEvent.click(retry);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(statsCalls()).toBe(before + 1);

    // The retry fails: the alert stays, the button is available again and it
    // never lost focus.
    await act(async () => {
      pending.reject(serverError());
    });
    await waitFor(() =>
      expect(retry).toHaveAttribute("aria-disabled", "false")
    );
    expect(screen.getByRole("alert")).toHaveTextContent(LOAD_ERROR);
    expect(document.activeElement).toBe(retry);

    // Available again means a click starts a request again.
    statsHandler = () => Promise.resolve(statsResponse());
    fireEvent.click(retry);
    expect(await screen.findByText("3 hours ago")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(LOAD_ERROR)).toBeNull());
  });
});

describe("Dashboard: load-error alert text contrast", () => {
  it("draws the heading line, the explanation and the button label with the foreground theme token", async () => {
    renderDashboard();
    const alert = await screen.findByRole("alert");
    const heading = within(alert).getByText(
      /dashboard data could not be loaded/i
    );
    const explanation = within(alert).getByText(
      /the site summary request did not succeed/i
    );
    const button = within(alert).getByRole("button", { name: /try again/i });
    for (const el of [heading, explanation, button]) {
      expect(el).toHaveClass("text-foreground");
      expect(el.className).not.toMatch(/text-neutral-/);
    }
  });
});
