/**
 * Dashboard "Try again" after GET /stats fails: where keyboard focus goes when
 * the retry succeeds.
 *
 * Install path: plugin/src/components/__tests__/Dashboard.retryFocus.test.tsx
 *
 * Drives the real Dashboard with its real useQuery(["stats"]),
 * useQuery(["security-status"]) and useSettings() hooks; only `wpApi` and the
 * toast module are mocked. The /stats request is answered from a handler the
 * test swaps, so a retry can be held in flight and settled by hand.
 *
 * Expected behaviour:
 *  - when a retry the user started succeeds, the load-error alert (and the
 *    button that held focus) leaves the page, so focus goes to the "SITE
 *    OVERVIEW" heading (`tabIndex={-1}`) instead of falling to <body>;
 *  - that happens only while focus is on <body> (the button left the page) or
 *    nowhere: a control the user moved to during the retry keeps focus;
 *  - a retry that fails ends the retry: a later successful refresh that the
 *    user did not ask for moves nothing;
 *  - an ordinary first load moves nothing;
 *  - the focused heading is drawn with a visible outline (jsdom computes no
 *    styles, so the utility classes are what this locks).
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
  ({ render, screen, cleanup, fireEvent, waitFor, act } =
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
const LOADED = "3 hours ago";

function heading(): HTMLElement {
  return screen.getByRole("heading", { level: 2, name: /site overview/i });
}

/** A focusable control outside the Dashboard, like the WordPress admin menu. */
function addOutsideControl(): HTMLButtonElement {
  const outside = document.createElement("button");
  outside.type = "button";
  outside.textContent = "Outside control";
  document.body.appendChild(outside);
  return outside;
}

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
  document.body.innerHTML = "";
});

describe("Dashboard: focus after a successful Try again", () => {
  it("moves focus from the vanished button to the SITE OVERVIEW heading", async () => {
    renderDashboard();
    await screen.findByText(LOAD_ERROR);
    const retry = screen.getByRole("button", { name: /try again/i });
    retry.focus();
    expect(document.activeElement).toBe(retry);

    const pending = deferred();
    statsHandler = () => pending.promise;
    fireEvent.click(retry);
    await waitFor(() => expect(retry).toHaveAttribute("aria-disabled", "true"));
    // The retry button still holds focus while the retry runs.
    expect(document.activeElement).toBe(retry);

    await act(async () => {
      pending.resolve(statsResponse());
    });
    expect(await screen.findByText(LOADED)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(LOAD_ERROR)).toBeNull());
    expect(retry.isConnected).toBe(false);

    const h = heading();
    expect(h).toHaveAttribute("tabindex", "-1");
    expect(document.activeElement).toBe(h);
  });

  it("also moves focus when the retry was started with focus on <body> (a pointer click that does not focus the button)", async () => {
    renderDashboard();
    await screen.findByText(LOAD_ERROR);
    const retry = screen.getByRole("button", { name: /try again/i });
    expect(document.activeElement).toBe(document.body);

    statsHandler = () => Promise.resolve(statsResponse());
    fireEvent.click(retry);
    expect(await screen.findByText(LOADED)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(LOAD_ERROR)).toBeNull());
    expect(document.activeElement).toBe(heading());
  });

  it("a retry that fails first and succeeds on the next click still ends on the heading", async () => {
    renderDashboard();
    await screen.findByText(LOAD_ERROR);
    const retry = screen.getByRole("button", { name: /try again/i });
    retry.focus();

    const first = deferred();
    statsHandler = () => first.promise;
    fireEvent.click(retry);
    await waitFor(() => expect(retry).toHaveAttribute("aria-disabled", "true"));
    await act(async () => {
      first.reject(serverError());
    });
    await waitFor(() =>
      expect(retry).toHaveAttribute("aria-disabled", "false")
    );
    // The failed retry moved nothing: the button still has focus.
    expect(document.activeElement).toBe(retry);
    expect(heading()).not.toBe(document.activeElement);

    statsHandler = () => Promise.resolve(statsResponse());
    fireEvent.click(retry);
    expect(await screen.findByText(LOADED)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(LOAD_ERROR)).toBeNull());
    expect(document.activeElement).toBe(heading());
  });

  it("leaves focus alone when the user moved it elsewhere while the retry ran", async () => {
    renderDashboard();
    await screen.findByText(LOAD_ERROR);
    const retry = screen.getByRole("button", { name: /try again/i });
    retry.focus();

    const pending = deferred();
    statsHandler = () => pending.promise;
    fireEvent.click(retry);
    await waitFor(() => expect(retry).toHaveAttribute("aria-disabled", "true"));

    const outside = addOutsideControl();
    outside.focus();
    expect(document.activeElement).toBe(outside);

    await act(async () => {
      pending.resolve(statsResponse());
    });
    expect(await screen.findByText(LOADED)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(LOAD_ERROR)).toBeNull());
    expect(document.activeElement).toBe(outside);
    expect(heading()).not.toBe(document.activeElement);
  });

  it("a failed retry ends the retry: a later successful refresh that nobody asked for moves no focus", async () => {
    const qc = renderDashboard();
    await screen.findByText(LOAD_ERROR);
    const retry = screen.getByRole("button", { name: /try again/i });
    retry.focus();

    const pending = deferred();
    statsHandler = () => pending.promise;
    fireEvent.click(retry);
    await waitFor(() => expect(retry).toHaveAttribute("aria-disabled", "true"));
    await act(async () => {
      pending.reject(serverError());
    });
    await waitFor(() =>
      expect(retry).toHaveAttribute("aria-disabled", "false")
    );

    // The user clicks the page background: focus is on <body>.
    retry.blur();
    expect(document.activeElement).toBe(document.body);

    // A refresh the user did not start (window refocus, another screen's
    // invalidation) now succeeds.
    statsHandler = () => Promise.resolve(statsResponse());
    await act(async () => {
      await qc.refetchQueries({ queryKey: ["stats"] });
    });
    expect(await screen.findByText(LOADED)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(LOAD_ERROR)).toBeNull());
    expect(document.activeElement).toBe(document.body);
    expect(heading()).not.toBe(document.activeElement);
  });

  it("an ordinary first load, with no retry, moves no focus", async () => {
    statsHandler = () => Promise.resolve(statsResponse());
    renderDashboard();
    expect(await screen.findByText(LOADED)).toBeInTheDocument();
    expect(screen.queryByText(LOAD_ERROR)).toBeNull();
    expect(document.activeElement).toBe(document.body);
    expect(heading()).not.toBe(document.activeElement);
  });
});

describe("Dashboard: the SITE OVERVIEW heading as a focus target", () => {
  it("is focusable by script (tabindex -1, not in the Tab order) and shows an outline when focused", async () => {
    statsHandler = () => Promise.resolve(statsResponse());
    renderDashboard();
    await screen.findByText(LOADED);
    const h = heading();
    expect(h).toHaveAttribute("tabindex", "-1");
    expect(h.className).toMatch(/(^|\s)focus:outline-2(\s|$)/);
    expect(h.className).toMatch(/(^|\s)focus:outline-ring(\s|$)/);
    expect(h.className).not.toMatch(/outline-none|outline-hidden/);
    h.focus();
    expect(document.activeElement).toBe(h);
  });
});
