/**
 * Vitest coverage for SeoManager's "Your Sitemap" modal card gating on the
 * settings field `sitemapEnabled` (A-3, ARS Round C Phase 1b, 2026-08-23).
 *
 * Handoff: scratchpad/c/handoff/lane4_seomanager.md (F-08 / P1-03) flagged
 * that the "Sitemap Active" badge rendered unconditionally regardless of
 * `swisswpsuite_sitemap_enabled` — a UX contradiction since /sitemap.xml
 * genuinely 404s while the opt-in-disabled default holds.
 *
 * React-externalization workaround (read before editing): same rationale
 * as GeneralSettings.test.tsx / SeoSettings.test.tsx — this codebase
 * externalizes React (WP.org Guideline 13, 2026-08-12); jsdom never loads
 * window.React, so the real npm react/react-dom is stamped onto those
 * globals in beforeAll BEFORE any aliased import runs. No JSX in this
 * file, React.createElement only.
 *
 * useSettings() is mocked directly (rather than wiring a QueryClientProvider
 * + wpApi network mock) — SeoManager makes no other TanStack Query calls of
 * its own, so this gives full, direct control over the loading/loaded/
 * enabled/disabled states under test. FeaturePointer is mocked out because
 * it renders a react-router-dom <Link>, which is unrelated to what this
 * file tests and would otherwise require a Router wrapper for no benefit
 * (isProEdition() defaults to Free with no window.swisswpsuiteData.edition
 * set, so the AI-workbench branch that would need it isn't exercised here).
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

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../hooks/useSettings", () => ({
  useSettings: vi.fn(),
}));

vi.mock("./organisms/Upsell/FeaturePointer", () => ({
  FeaturePointer: () => null,
}));

type SeoManagerModule = typeof import("./SeoManager");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");
type SettingsHookModule = typeof import("../hooks/useSettings");

let SeoManager: SeoManagerModule["default"];
let render: TestingLibraryModule["render"];
let screen: TestingLibraryModule["screen"];
let cleanup: TestingLibraryModule["cleanup"];
let React: ReactModule;
let useSettings: SettingsHookModule["useSettings"];

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  const RealReact = nodeRequire("react");
  const RealReactDOM = nodeRequire("react-dom");
  const RealReactDOMClient = nodeRequire("react-dom/client");
  window.React = RealReact;
  window.ReactDOM = { ...RealReactDOM, ...RealReactDOMClient };

  ({ default: SeoManager } = await import("./SeoManager"));
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  ({ useSettings } = await import("../hooks/useSettings"));
  React = await import("react");
});

function mockSettings(
  overrides: Partial<import("../hooks/useSettings").SwissSettings> = {},
  isLoading = false
) {
  (useSettings as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    settings: { ...overrides },
    isLoading,
    isError: false,
    error: null,
    refetchSettings: vi.fn(),
  });
}

async function openSitemapModal() {
  const openButton = screen.getByRole("button", { name: /sitemap/i });
  openButton.click();
}

async function openLlmModal() {
  const openButton = screen.getByRole("button", {
    name: /ai assistant guide/i,
  });
  openButton.click();
}

describe("SeoManager — Sitemap modal gated on sitemapEnabled (A-3, ARS Round C Phase 1b)", () => {
  beforeEach(() => {
    delete (window as any).swisswpsuiteData;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows the neutral disabled line (not 'Sitemap Active') when sitemapEnabled is false", async () => {
    mockSettings({ sitemapEnabled: false });
    render(React.createElement(SeoManager));

    await openSitemapModal();

    expect(
      screen.getByText(/enable the xml sitemap in settings.*seo/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/sitemap active/i)).not.toBeInTheDocument();
  });

  it("shows the neutral disabled line when sitemapEnabled is absent from settings (opt-in-disabled default)", async () => {
    mockSettings({});
    render(React.createElement(SeoManager));

    await openSitemapModal();

    expect(
      screen.getByText(/enable the xml sitemap in settings.*seo/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/sitemap active/i)).not.toBeInTheDocument();
  });

  it("shows 'Sitemap Active' when sitemapEnabled is true", async () => {
    mockSettings({ sitemapEnabled: true });
    render(React.createElement(SeoManager));

    await openSitemapModal();

    expect(screen.getByText(/sitemap active/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/enable the xml sitemap in settings.*seo/i)
    ).not.toBeInTheDocument();
  });

  it("shows a loading state instead of flashing 'disabled' while the settings GET is in flight", async () => {
    mockSettings({}, true);
    render(React.createElement(SeoManager));

    await openSitemapModal();

    expect(screen.getByText(/checking sitemap status/i)).toBeInTheDocument();
    expect(screen.queryByText(/sitemap active/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/enable the xml sitemap in settings.*seo/i)
    ).not.toBeInTheDocument();
  });
});

describe("SeoManager — llms.txt 'Check Live File' link gated on llmsTxtEnabled (FIX-8, D-3, FIX_PLAN_v2.9.33.39, 2026-08-31)", () => {
  beforeEach(() => {
    delete (window as any).swisswpsuiteData;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows the disabled explanation, not a live link, when llmsTxtEnabled is false", async () => {
    mockSettings({ llmsTxtEnabled: false });
    render(React.createElement(SeoManager));

    await openLlmModal();

    expect(
      screen.queryByRole("link", { name: /check live file/i })
    ).not.toBeInTheDocument();
    const disabledEl = screen.getByTitle(
      /enable the llms\.txt feature to publish this file first/i
    );
    expect(disabledEl).toBeInTheDocument();
    expect(disabledEl).not.toHaveAttribute("aria-disabled");
    expect(
      screen.getByText(
        /unavailable: enable the llms\.txt feature to publish this file first/i
      )
    ).toBeInTheDocument();
  });

  it("shows the disabled explanation when llmsTxtEnabled is absent from settings (opt-in-disabled default)", async () => {
    mockSettings({});
    render(React.createElement(SeoManager));

    await openLlmModal();

    expect(
      screen.queryByRole("link", { name: /check live file/i })
    ).not.toBeInTheDocument();
    const disabledEl = screen.getByTitle(
      /enable the llms\.txt feature to publish this file first/i
    );
    expect(disabledEl).toBeInTheDocument();
    expect(disabledEl).not.toHaveAttribute("aria-disabled");
    expect(
      screen.getByText(
        /unavailable: enable the llms\.txt feature to publish this file first/i
      )
    ).toBeInTheDocument();
  });

  it("shows the live 'Check Live File' link when llmsTxtEnabled is true", async () => {
    mockSettings({ llmsTxtEnabled: true });
    render(React.createElement(SeoManager));

    await openLlmModal();

    expect(
      screen.getByRole("link", { name: /check live file/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByTitle(
        /enable the llms\.txt feature to publish this file first/i
      )
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        /unavailable: enable the llms\.txt feature to publish this file first/i
      )
    ).not.toBeInTheDocument();
  });
});
