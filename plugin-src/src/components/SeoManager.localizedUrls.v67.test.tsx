/**
 * The addresses the SEO screen shows and links to come from the localised
 * payload (window.swisswpsuiteData.sitemapUrl / llmsTxtUrl), not from
 * "<homeUrl>/sitemap.xml" spelled in the component. Plain permalinks have no
 * /sitemap.xml or /llms.txt rewrite, so the server hands over the address that
 * actually serves each file.
 *
 *   A-FE-1  the sitemap link and the printed sitemap address are sitemapUrl.
 *   A-FE-2  a field that is missing (or not a string) renders no link and no
 *           built-from-homeUrl address.
 *   A-FE-3  the llms.txt link and the address named in the instructions are
 *           llmsTxtUrl, with the switch on and with it off.
 *
 * Same React-externalization workaround as SeoManager.test.tsx: the real npm
 * react / react-dom are stamped onto window before any aliased import runs.
 * No JSX in this file, React.createElement only.
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
  },
}));

vi.mock("../hooks/useSettings", () => ({
  useSettings: vi.fn(),
}));

vi.mock("./organisms/Seo/SeoAiWorkbench", () => ({
  SeoAiWorkbench: () => null,
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
  window.React = nodeRequire("react");
  window.ReactDOM = {
    ...nodeRequire("react-dom"),
    ...nodeRequire("react-dom/client"),
  };
  ({ default: SeoManager } = await import("./SeoManager"));
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  ({ useSettings } = await import("../hooks/useSettings"));
  React = await import("react");
});

const HOME = "https://example.test";
const PLAIN_SITEMAP = `${HOME}/?swisswpsuite_sitemap=1`;
const PLAIN_LLMS = `${HOME}/?swisswpsuite_llms_txt=1`;

function setData(extra: Record<string, unknown>) {
  (window as any).swisswpsuiteData = {
    apiUrl: `${HOME}/wp-json/swisswpsuite/v1`,
    nonce: "n",
    homeUrl: HOME,
    ...extra,
  };
}

function mockSettings(
  overrides: Partial<import("../hooks/useSettings").SwissSettings> = {}
) {
  (useSettings as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    settings: { ...overrides },
    isLoading: false,
    isError: false,
    error: null,
    refetchSettings: vi.fn(),
  });
}

async function openSitemapModal() {
  screen.getByRole("button", { name: /sitemap/i }).click();
  await screen.findByRole("heading", { name: /your sitemap/i });
}

async function openGuide() {
  screen.getByRole("button", { name: /ai assistant guide/i }).click();
  await screen.findByRole("heading", { name: /ai assistant guide/i });
}

function checkLiveFileLink() {
  return screen.queryByRole("link", { name: /check live file/i });
}

beforeEach(() => {
  // The guide window fetches a preview of the file; answer it.
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ content: "# Example site" }),
  }) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  delete (window as any).swisswpsuiteData;
});

describe("A-FE-1: the sitemap address is sitemapUrl", () => {
  it("plain permalinks: the link and the printed address are the query-variable address", async () => {
    setData({ sitemapUrl: PLAIN_SITEMAP });
    mockSettings({ sitemapEnabled: true });
    render(React.createElement(SeoManager));
    await openSitemapModal();

    const link = screen.getByTitle("Open sitemap in a new tab");
    expect(link).toHaveAttribute("href", PLAIN_SITEMAP);
    expect(screen.getByText(PLAIN_SITEMAP)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("/sitemap.xml");
  });

  it("pretty permalinks: the link and the printed address are the /sitemap.xml address", async () => {
    setData({ sitemapUrl: `${HOME}/sitemap.xml` });
    mockSettings({ sitemapEnabled: true });
    render(React.createElement(SeoManager));
    await openSitemapModal();

    expect(screen.getByTitle("Open sitemap in a new tab")).toHaveAttribute(
      "href",
      `${HOME}/sitemap.xml`
    );
    expect(screen.getByText(`${HOME}/sitemap.xml`)).toBeInTheDocument();
  });

  it("the address does not depend on homeUrl", async () => {
    setData({ homeUrl: undefined, sitemapUrl: PLAIN_SITEMAP });
    mockSettings({ sitemapEnabled: true });
    render(React.createElement(SeoManager));
    await openSitemapModal();

    expect(screen.getByTitle("Open sitemap in a new tab")).toHaveAttribute(
      "href",
      PLAIN_SITEMAP
    );
  });
});

describe("A-FE-2: a missing field renders no link and no built address", () => {
  const missing: Array<[string, Record<string, unknown>]> = [
    ["absent", {}],
    ["empty string", { sitemapUrl: "" }],
    ["array", { sitemapUrl: [PLAIN_SITEMAP] }],
    ["number", { sitemapUrl: 5 }],
    ["null", { sitemapUrl: null }],
  ];

  it.each(missing)(
    "sitemap field %s: no sitemap link, no address",
    async (_n, extra) => {
      setData(extra);
      mockSettings({ sitemapEnabled: true });
      render(React.createElement(SeoManager));
      await openSitemapModal();

      // Positive control: the modal itself is open.
      expect(screen.getByText(/sitemap active/i)).toBeInTheDocument();
      expect(
        screen.queryByTitle("Open sitemap in a new tab")
      ).not.toBeInTheDocument();
      expect(document.body.textContent).not.toMatch(/sitemap\.xml/);
      expect(document.body.textContent).not.toContain("undefined");
    }
  );

  it("llms.txt field absent, switch on: no 'Check Live File' link and no address in the instructions", async () => {
    setData({});
    mockSettings({ llmsTxtEnabled: true });
    render(React.createElement(SeoManager));
    await openGuide();

    // Positive control: the switch-on instructions are showing.
    expect(
      screen.getByText(/this plugin publishes the text below/i)
    ).toBeInTheDocument();
    expect(checkLiveFileLink()).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\/llms\.txt/);
    expect(document.body.textContent).not.toContain("undefined");
  });

  it.each([
    ["empty string", ""],
    ["array", [PLAIN_LLMS]],
    ["number", 7],
  ])("llms.txt field %s, switch on: no link", async (_n, value) => {
    setData({ llmsTxtUrl: value });
    mockSettings({ llmsTxtEnabled: true });
    render(React.createElement(SeoManager));
    await openGuide();

    expect(
      screen.getByText(/this plugin publishes the text below/i)
    ).toBeInTheDocument();
    expect(checkLiveFileLink()).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain("undefined");
  });

  it("llms.txt field absent, switch off: the instructions still read as a sentence", async () => {
    setData({});
    mockSettings({ llmsTxtEnabled: false });
    render(React.createElement(SeoManager));
    await openGuide();

    expect(document.body.textContent).toMatch(
      /This plugin publishes it once "AI Assistant Guide \(\/llms\.txt\)" is turned on/
    );
    expect(checkLiveFileLink()).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain("undefined");
  });
});

describe("A-FE-3: the llms.txt address is llmsTxtUrl", () => {
  it("switch on, plain permalinks: the link and the instructions use the query-variable address", async () => {
    setData({ llmsTxtUrl: PLAIN_LLMS });
    mockSettings({ llmsTxtEnabled: true });
    render(React.createElement(SeoManager));
    await openGuide();

    const link = checkLiveFileLink();
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", PLAIN_LLMS);
    expect(document.body.textContent).toContain(
      `This plugin publishes the text below at ${PLAIN_LLMS}. It tells`
    );
  });

  it("switch on, pretty permalinks: the link and the instructions use the /llms.txt address", async () => {
    setData({ llmsTxtUrl: `${HOME}/llms.txt` });
    mockSettings({ llmsTxtEnabled: true });
    render(React.createElement(SeoManager));
    await openGuide();

    expect(checkLiveFileLink()).toHaveAttribute("href", `${HOME}/llms.txt`);
    expect(document.body.textContent).toContain(
      `This plugin publishes the text below at ${HOME}/llms.txt. It tells`
    );
  });

  it("switch off: no link, and the instructions name llmsTxtUrl as the address it will be published at", async () => {
    setData({ llmsTxtUrl: PLAIN_LLMS });
    mockSettings({ llmsTxtEnabled: false });
    render(React.createElement(SeoManager));
    await openGuide();

    expect(checkLiveFileLink()).not.toBeInTheDocument();
    expect(document.body.textContent).toContain(
      `This plugin publishes it at ${PLAIN_LLMS} once "AI Assistant Guide (/llms.txt)" is turned on`
    );
  });
});
