/**
 * Dashboard when GET /stats fails (V63-V6-3).
 *
 * Install path: plugin/src/components/__tests__/Dashboard.statsError.test.tsx
 *
 * get_stats() has a single return path with HTTP 200 and always sends
 * last_backup ("Never" or "N ago"), so the Dashboard only lacks stats when the
 * request itself failed. In that state the page must say the data could not
 * be loaded and offer a retry. It must not claim the site has no backup and
 * must not tell the user to run a scan.
 *
 * Drives the real Dashboard with its real useQuery(["stats"]),
 * useQuery(["security-status"]) and useSettings() hooks; only `wpApi` and the
 * toast module are mocked. React externalisation workaround as in
 * DashboardTrafficIndicator.test.tsx. No JSX.
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
  ({ render, screen, cleanup, fireEvent, waitFor } = await import(
    "@testing-library/react"
  ));
  ({ QueryClient, QueryClientProvider } = await import(
    "@tanstack/react-query"
  ));
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

let statsShouldFail = true;

function installApiMock() {
  (wpApi as any).mockImplementation((url: string) => {
    if (url === "/stats") {
      return statsShouldFail
        ? Promise.reject(
            new ApiErrorCtor("Server error (HTTP 500)", 500, {})
          )
        : Promise.resolve(statsResponse());
    }
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

/** Waits until the stats query has settled in error and the page re-rendered. */
async function statsFailed(qc: any) {
  await waitFor(() =>
    expect(qc.getQueryState(["stats"])?.status).toBe("error")
  );
  await waitFor(() =>
    expect(screen.getByText("Last Backup").parentElement?.parentElement)
      .not.toHaveTextContent("...")
  );
}

const LOAD_ERROR = /dashboard data could not be loaded/i;

beforeEach(() => {
  (window as any).swisswpsuiteData = {
    apiUrl: "http://localhost/wp-json/swisswpsuite/v1",
    nonce: "test-nonce",
  };
  statsShouldFail = true;
  (wpApi as any).mockReset();
  installApiMock();
});

afterEach(() => {
  cleanup();
});

describe("Dashboard when GET /stats fails", () => {
  it("says the data could not be loaded, with a Try again button", async () => {
    renderDashboard();
    expect(await screen.findByText(LOAD_ERROR)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /try again/i })
    ).toBeInTheDocument();
  });

  it("does not claim the site has no backup", async () => {
    const qc = renderDashboard();
    await statsFailed(qc);
    expect(screen.queryByText(/no backup yet/i)).toBeNull();
  });

  it("does not tell the user to run a scan or activate anything", async () => {
    const qc = renderDashboard();
    await statsFailed(qc);
    expect(screen.queryByText(/run your first scan/i)).toBeNull();
    expect(screen.queryByText(/activate your license/i)).toBeNull();
  });

  it("Try again refetches /stats and shows the real values on success", async () => {
    renderDashboard();
    await screen.findByText(LOAD_ERROR);
    statsShouldFail = false;
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(await screen.findByText("3 hours ago")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(LOAD_ERROR)).toBeNull());
  });

  it("control: a working /stats shows the backup age and no load-error text", async () => {
    statsShouldFail = false;
    renderDashboard();
    expect(await screen.findByText("3 hours ago")).toBeInTheDocument();
    expect(screen.queryByText(LOAD_ERROR)).toBeNull();
  });
});
