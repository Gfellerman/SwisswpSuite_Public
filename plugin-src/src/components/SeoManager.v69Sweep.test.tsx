/**
 * S28 (truth-sweep lane SW-B): the SEO Health Check modal names the three
 * sub-scores of the SEO score the way the Dashboard's SEO Health Breakdown
 * does: Meta Coverage, Technical, Image Alt Text.
 *
 * Production caller path: the user clicks "SEO Health Check", SeoManager
 * fetches `${apiUrl}/seo/scan`, and the modal shows the three sub-scores.
 * Only `fetch`, the settings hook and the toast module are replaced. No JSX.
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
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../hooks/useSettings", () => ({
  useSettings: vi.fn(),
}));

vi.mock("./organisms/Seo/SeoAiWorkbench", () => ({
  SeoAiWorkbench: () => null,
}));

type TL = typeof import("@testing-library/react");
let SeoManager: any;
let render: TL["render"];
let screen: TL["screen"];
let cleanup: TL["cleanup"];
let fireEvent: TL["fireEvent"];
let React: typeof import("react");
let useSettings: any;

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  window.React = nodeRequire("react");
  window.ReactDOM = {
    ...nodeRequire("react-dom"),
    ...nodeRequire("react-dom/client"),
  };
  ({ default: SeoManager } = await import("./SeoManager"));
  ({ render, screen, cleanup, fireEvent } =
    await import("@testing-library/react"));
  ({ useSettings } = await import("../hooks/useSettings"));
  React = await import("react");
});

const entry = { total: 0, missing: 0, optimized: 0 };

const SCAN = {
  seo_score: 55,
  seo_breakdown: { on_page: 41, technical: 62, content: 73 },
  max_achievable_seo_score: 90,
  score: 50,
  max_achievable_score: 90,
  total_items: 0,
  optimized_items: 0,
  details: { product: entry, post: entry, page: entry, image: entry },
  non_compliant_items: [],
};

beforeEach(() => {
  (window as any).swisswpsuiteData = {
    apiUrl: "http://localhost/wp-json/swisswpsuite/v1",
    nonce: "test-nonce",
  };
  (useSettings as ReturnType<typeof vi.fn>).mockReturnValue({
    settings: {},
    isLoading: false,
    isError: false,
    error: null,
    refetchSettings: vi.fn(),
  });
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) =>
      Promise.resolve({
        ok: url.endsWith("/seo/scan"),
        json: () => Promise.resolve(SCAN),
      })
    )
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("SeoManager — Health Check sub-score names (S28)", () => {
  it("shows Meta Coverage, Technical and Image Alt Text next to the real percentages", async () => {
    render(React.createElement(SeoManager));
    fireEvent.click(screen.getByRole("button", { name: /seo health check/i }));

    // Positive control: the scan result arrived (headline score is shown).
    expect(await screen.findByText("Overall SEO Score")).toBeInTheDocument();

    const cellOf = (label: string) =>
      screen.getByText(label).parentElement as HTMLElement;
    expect(cellOf("Meta Coverage")).toHaveTextContent("41%");
    expect(cellOf("Technical")).toHaveTextContent("62%");
    expect(cellOf("Image Alt Text")).toHaveTextContent("73%");
    expect(screen.queryByText("On-Page")).not.toBeInTheDocument();
    expect(screen.queryByText("Content")).not.toBeInTheDocument();

    // Contrast (WCAG 1.4.3): 10px labels on the secondary surface need 4.5:1.
    // neutral-500 was 3.14:1 (light) and 3.36:1 (dark); neutral-700 is 6.89:1
    // and neutral-300 is 10.73:1.
    for (const label of ["Meta Coverage", "Technical", "Image Alt Text"]) {
      const el = screen.getByText(label);
      expect(el).toHaveClass("text-neutral-700", "dark:text-neutral-300");
      expect(el).not.toHaveClass("text-neutral-500");
    }
  });
});
