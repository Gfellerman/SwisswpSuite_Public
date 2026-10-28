/**
 * Truth-sweep Dashboard texts (lane SW-B), Free build:
 *
 *  - S27  the traffic chart counts page views, not visits: legend, the
 *         "no data" badge and the tooltip series name.
 *  - S28  the SEO tile's sub-line names the three parts of the score as the
 *         SEO Health Breakdown card does.
 *  - S42  the on-page diagnostics note says what the plugin checks and who
 *         makes the changes.
 *
 * Drives the real Dashboard with its real useQuery hooks; only `wpApi` and the
 * toast module are mocked, and recharts' ResponsiveContainer is given a fixed
 * size (jsdom has no layout) so the chart tooltip can be opened. No JSX.
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

vi.mock("recharts", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: any }) =>
      (window as any).React.cloneElement(children, {
        width: 700,
        height: 320,
      }),
  };
});

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

function mockApi(visits: number) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  (wpApi as any).mockReset();
  (wpApi as any).mockImplementation((url: string) => {
    if (url === "/stats") {
      return Promise.resolve({
        seo_score: 40,
        threats_blocked: 7,
        last_backup: "3 hours ago",
        traffic_data: days.map((name) => ({ name, visits, blocked: 0 })),
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
}

beforeEach(() => {
  (window as any).swisswpsuiteData = {
    apiUrl: "http://localhost/wp-json/swisswpsuite/v1",
    nonce: "test-nonce",
  };
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

describe("Dashboard (Free) — truth-sweep texts S27, S28, S42", () => {
  it("S27: the chart legend reads Page views, and the tooltip names the series Page views", async () => {
    mockApi(5);
    const { container } = mountDashboard();
    // Positive control: stats arrived (the Last Backup tile shows its value).
    expect(await screen.findByText("3 hours ago")).toBeInTheDocument();

    expect(screen.getByText("Page views")).toBeInTheDocument();
    expect(screen.queryByText("Visits")).not.toBeInTheDocument();

    // Open the chart tooltip the way a visitor does: move the pointer over it.
    const wrapper = container.querySelector(".recharts-wrapper") as HTMLElement;
    expect(wrapper).not.toBeNull();
    fireEvent.mouseMove(wrapper, { clientX: 350, clientY: 160 });
    const names = await vi.waitFor(() => {
      const found = Array.from(
        container.querySelectorAll(".recharts-tooltip-item-name")
      ).map((n) => n.textContent);
      expect(found.length).toBeGreaterThan(0);
      return found;
    });
    expect(names).toContain("Page views");
    expect(names).not.toContain("visits");
  });

  it("S27: with tracking on and no traffic the badge reads No page views yet", async () => {
    mockApi(0);
    mountDashboard();
    expect(await screen.findByText("No page views yet")).toBeInTheDocument();
    expect(screen.queryByText("No visits yet")).not.toBeInTheDocument();
  });

  it("S28 and S42: the SEO tile and the diagnostics note use the sub-score names", async () => {
    mockApi(5);
    const { container } = mountDashboard();
    expect(await screen.findByText("3 hours ago")).toBeInTheDocument();

    expect(
      await screen.findByText(
        "Mean of meta coverage, technical & image alt text"
      )
    ).toBeInTheDocument();
    expect(flat(container)).not.toContain("Mean of on-page");
    expect(flat(container)).toContain(
      "Technical score reflects server and WordPress configuration (HTTPS, permalinks, PHP version, debug mode) — the plugin checks these; you or your host make the changes. Meta Coverage and Image Alt Text scores reflect your content decisions — the plugin identifies what is missing; you make the changes."
    );
    expect(flat(container)).not.toContain("monitors and can help fix");

    // Contrast (WCAG 1.4.3): this 10px note needs 4.5:1. neutral-500 was
    // 3.73:1 on the light page and 3.89:1 on the dark page; neutral-700 is
    // 8.19:1 and neutral-300 is 12.43:1.
    const note = screen.getByText(
      /Technical score reflects server and WordPress/
    );
    expect(note).toHaveClass("text-neutral-700", "dark:text-neutral-300");
    expect(note).not.toHaveClass("text-neutral-500");

    // Same rule for the italic line under the card heading (10px, page
    // surface): neutral-500 was 3.73:1 / 3.89:1.
    const subtitle = screen.getByText(
      /Composite of metadata coverage, technical health/
    );
    expect(subtitle).toHaveClass("text-neutral-700", "dark:text-neutral-300");
    expect(subtitle).not.toHaveClass("text-neutral-500");
  });
});
