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

/**
 * Dashboard quick action (final .69 pass, FC-4 / T38): the tile that opens
 * Settings is named for what it opens. The real Dashboard with its real hooks;
 * only `wpApi` and the toast module are mocked. No JSX.
 */
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
let fireEvent: TL["fireEvent"];
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
  ({ render, screen, cleanup, fireEvent } =
    await import("@testing-library/react"));
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
    if (url === "/stats")
      return Promise.resolve({
        seo_score: 40,
        threats_blocked: 7,
        last_backup: "3 hours ago",
        traffic_data: days.map((name) => ({ name, visits: 1, blocked: 0 })),
        seo_breakdown: { on_page: 40, technical: 40, content: 40 },
      });
    if (url === "/settings")
      return Promise.resolve({
        pageviewTrackingEnabled: true,
        firewallEnabled: true,
      });
    if (url === "/security/status")
      return Promise.resolve({ last_block_at: null });
    return Promise.reject(new Error("unmocked " + url));
  });
});

afterEach(() => cleanup());

describe("Dashboard — Open Settings tile (T38)", () => {
  it("is called 'Open Settings', says what Settings holds, and still opens Settings", async () => {
    const onNavigate = vi.fn();
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      React.createElement(
        QueryClientProvider,
        { client: qc },
        React.createElement(Dashboard, { onNavigate })
      )
    );
    expect(await screen.findByText("3 hours ago")).toBeInTheDocument();
    const tile = screen.getByRole("button", { name: /Open Settings/ });
    expect(tile.textContent).toContain(
      "Plugin settings, system logs and diagnostics"
    );
    expect(screen.queryByText("View Logs")).not.toBeInTheDocument();
    fireEvent.click(tile);
    expect(onNavigate).toHaveBeenCalledWith("settings");
  });
});
