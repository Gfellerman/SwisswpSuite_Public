/**
 * Signed Dashboard texts (U44, U47, U48), Free build.
 *
 * Drives the real Dashboard with its real useQuery(["stats"]),
 * useQuery(["security-status"]) and useSettings() hooks; only `wpApi` and the
 * toast module are mocked. React externalisation workaround as in
 * Dashboard.statsError.test.tsx. No JSX.
 *
 * Install path: plugin/src/components/__tests__/Dashboard.v69Text.test.tsx.
 * The extended build's counterpart is
 * pro-overlay/src/components/Dashboard.proTile.pro.test.tsx.
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
  ApiError: class ApiError extends Error {},
}));

type TL = typeof import("@testing-library/react");
let Dashboard: any;
let render: TL["render"];
let screen: TL["screen"];
let cleanup: TL["cleanup"];
let React: typeof import("react");
let QueryClient: any;
let QueryClientProvider: any;
let wpApi: any;

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  window.React = nodeRequire("react");
  window.ReactDOM = {
    ...nodeRequire("react-dom"),
    ...nodeRequire("react-dom/client"),
  };
  ({ default: Dashboard } = await import("../Dashboard"));
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  ({ QueryClient, QueryClientProvider } =
    await import("@tanstack/react-query"));
  ({ wpApi } = await import("../../services/api"));
  React = await import("react");
});

beforeEach(() => {
  (window as any).swisswpsuiteData = {
    apiUrl: "http://localhost/wp-json/swisswpsuite/v1",
    nonce: "test-nonce",
  };
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  (wpApi as any).mockReset();
  (wpApi as any).mockImplementation((url: string) => {
    if (url === "/stats") {
      return Promise.resolve({
        seo_score: 40,
        threats_blocked: 7,
        last_backup: "3 hours ago",
        traffic_data: days.map((name) => ({ name, visits: 1, blocked: 0 })),
        seo_breakdown: { on_page: 40, technical: 40, content: 40 },
      });
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
});

afterEach(() => {
  cleanup();
});

function mountDashboard() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(Dashboard, { onNavigate: vi.fn() })
    )
  );
}

const flat = (el: Element | null) =>
  (el?.textContent ?? "").replace(/\s+/g, " ").trim();

describe("Dashboard (Free) — signed texts U44, U47, U48", () => {
  it("U47: the Threats Blocked tile says what the number counts", async () => {
    const { container } = mountDashboard();
    // The Last Backup value renders only once the stats have arrived: the
    // positive control that the data path ran.
    expect(await screen.findByText("3 hours ago")).toBeInTheDocument();
    expect(flat(container)).toContain("Threats Blocked");
    expect(flat(container)).toContain("Blocked requests in the security log");
    expect(flat(container)).not.toContain("Based on last scan");
  });

  it("U48: the Run Security Scan tile describes a malware and security-issue scan", async () => {
    const { container } = mountDashboard();
    expect(await screen.findByText("Run Security Scan")).toBeInTheDocument();
    expect(flat(container)).toContain(
      "Scan for malware and site security issues"
    );
    expect(flat(container)).not.toContain(
      "blocked threats, and site vulnerabilities"
    );
  });

  it("U44: the Back Up Site tile says it restores files", async () => {
    const { container } = mountDashboard();
    expect(await screen.findByText("Back Up Site")).toBeInTheDocument();
    expect(flat(container)).toContain(
      "Save a copy of your site — restore its files any time"
    );
    expect(flat(container)).not.toContain("restore it any time");
  });
});
