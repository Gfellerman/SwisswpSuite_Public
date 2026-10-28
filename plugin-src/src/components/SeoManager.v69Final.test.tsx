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
 * SEO page (final .69 pass): the Health Check report says only what the scan
 * measured (FD-1 T41, FD-2/FD-3 T42-T46), a failed scan clears the old report
 * (FD-5, AC-17) and the page description matches what the buttons do (FD-7,
 * T47). The real SeoManager; only `fetch`, the settings hook and the toast
 * module are replaced. No JSX.
 */
vi.mock("../lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("../hooks/useSettings", () => ({ useSettings: vi.fn() }));
vi.mock("./organisms/Seo/SeoAiWorkbench", () => ({
  SeoAiWorkbench: () => null,
}));

type TL = typeof import("@testing-library/react");
let SeoManager: any;
let render: TL["render"];
let screen: TL["screen"];
let cleanup: TL["cleanup"];
let fireEvent: TL["fireEvent"];
let waitFor: TL["waitFor"];
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
  ({ render, screen, cleanup, fireEvent, waitFor } =
    await import("@testing-library/react"));
  ({ useSettings } = await import("../hooks/useSettings"));
  React = await import("react");
});

const none = { total: 0, missing: 0, optimized: 0 };

const item = (id: number, title: string, type: string, reason: string) => ({
  id,
  title,
  type,
  reason,
  length: 20,
});

const SCAN = {
  seo_score: 55,
  seo_breakdown: { on_page: 41, technical: 62, content: 73 },
  max_achievable_seo_score: 90,
  score: 50,
  max_achievable_score: 90,
  total_items: 8,
  optimized_items: 3,
  details: {
    product: none,
    post: { total: 5, missing: 3, optimized: 2 },
    page: none,
    image: { total: 3, missing: 1, optimized: 2 },
  },
  non_compliant_items: [
    item(1, "Post A", "post", "missing"),
    item(2, "photo.jpg", "image", "missing"),
    item(3, "Page B", "page", "below_threshold"),
    item(4, "Post C", "post", "short_content"),
  ],
};

let scanAnswers: Array<() => unknown>;

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
  scanAnswers = [() => ({ ok: true, json: () => Promise.resolve(SCAN) })];
  let call = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (!url.endsWith("/seo/scan")) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
      }
      const answer = scanAnswers[Math.min(call, scanAnswers.length - 1)];
      call += 1;
      return Promise.resolve(answer());
    })
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const flat = (el: Element | null) =>
  (el?.textContent ?? "").replace(/\s+/g, " ").trim();

async function runScan() {
  fireEvent.click(
    screen.getAllByRole("button", { name: /seo health check/i })[0]
  );
}

async function openDetails() {
  fireEvent.click(
    await screen.findByRole("button", { name: /items needing attention/i })
  );
}

describe("SeoManager — Health Check texts (FD-1, FD-2, FD-3, FD-7)", () => {
  it("T47: the page description names what the buttons do", () => {
    render(React.createElement(SeoManager));
    expect(
      screen.getByText(
        "Improve how your site appears in search engines and AI assistants. Run an SEO Health Check, check your Sitemap, and create an AI Assistant Guide below."
      )
    ).toBeInTheDocument();
  });

  it("T41: a category badge says 'Needs Attention' and carries no count", async () => {
    const { container } = render(React.createElement(SeoManager));
    await runScan();
    expect(await screen.findByText("Overall SEO Score")).toBeInTheDocument();
    expect(screen.getAllByText("Needs Attention").length).toBeGreaterThan(0);
    expect(flat(container)).not.toMatch(/\d+ Needs Attention/);
  });

  it("T46: an image without a description reads 'No alt text'; a post still reads 'No description'", async () => {
    render(React.createElement(SeoManager));
    await runScan();
    await openDetails();
    const row = async (title: string) =>
      (await screen.findByText(title)).closest(
        "div.flex.items-center.justify-between"
      ) as HTMLElement;
    expect(flat(await row("photo.jpg"))).toContain("No alt text");
    expect(flat(await row("Post A"))).toContain("No description");
  });

  it("T42-T45: the advice names where descriptions and alt text are read from, as sample counts", async () => {
    const { container } = render(React.createElement(SeoManager));
    await runScan();
    await screen.findByText("Overall SEO Score");
    await openDetails();
    const text = flat(container);
    // T43: two items lack a description or alt text
    expect(text).toContain(
      "At least 2 items have no description or image alt text. Descriptions are read from Yoast SEO or Rank Math, and alt text from the Media Library; add them there, then run the Health Check again."
    );
    // T44: below-threshold + short-content items
    expect(text).toContain(
      "At least 2 items have a description or image alt text that is shorter than the target."
    );
    // T42 / T45: group notes
    expect(text).toContain(
      "These pages have a short description and very little page text. The Health Check reads descriptions from Yoast SEO or Rank Math; lengthen the description there, then run the Health Check again."
    );
    expect(text).toContain(
      "These items have a description, or for images alt text, shorter than the target."
    );
    expect(text).not.toContain("no description at all");
  });
});

describe("SeoManager — a failed scan clears the old report (FD-5, AC-17)", () => {
  it("AC-17: the second scan answers 500 and the first report is no longer shown", async () => {
    scanAnswers = [
      () => ({ ok: true, json: () => Promise.resolve(SCAN) }),
      () => ({ ok: false, json: () => Promise.resolve({}) }),
    ];
    render(React.createElement(SeoManager));
    await runScan();
    expect(await screen.findByText("Overall SEO Score")).toBeInTheDocument();
    await runScan();
    await waitFor(() =>
      expect(screen.getByText(/Health Check Failed/)).toBeInTheDocument()
    );
    expect(screen.queryByText("Overall SEO Score")).not.toBeInTheDocument();
  });
});
