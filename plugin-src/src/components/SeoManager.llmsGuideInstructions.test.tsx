/**
 * V63-V5-7 (F12, both builds): the "AI Assistant Guide (llms.txt)" window
 * tells the site owner how the file actually gets published. The plugin
 * serves /llms.txt itself while the Settings > SEO switch "AI Assistant
 * Guide (/llms.txt)" is on; creating a WordPress page named "llms.txt"
 * gives the slug `llms-txt`, so that advice never published anything.
 *
 * Drives the real SeoManager render path: the user opens the window from
 * the SEO page button. Only the settings hook and the toast module are
 * replaced, as in SeoManager.test.tsx.
 *
 * Executor: place at plugin/src/components/SeoManager.llmsGuideInstructions.test.tsx
 * (no overlay copy exists; SeoManager.tsx ships in both builds).
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

function mockSettings(llmsTxtEnabled: boolean) {
  (useSettings as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    settings: { llmsTxtEnabled },
    isLoading: false,
    isError: false,
    error: null,
    refetchSettings: vi.fn(),
  });
}

function openGuide() {
  screen.getByRole("button", { name: /ai assistant guide/i }).click();
}

describe("SeoManager — AI Assistant Guide window explains the real publishing path", () => {
  beforeEach(() => {
    (window as any).swisswpsuiteData = {
      apiUrl: "https://example.test/wp-json/swisswpsuite/v1",
      nonce: "n",
      homeUrl: "https://example.test",
      llmsTxtUrl: "https://example.test/llms.txt",
    };
    // The window fetches a preview of the file; answer it.
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

  it("positive control: the guide window opened", async () => {
    mockSettings(false);
    render(React.createElement(SeoManager));
    openGuide();
    expect(
      await screen.findByRole("heading", { name: /ai assistant guide/i })
    ).toBeInTheDocument();
  });

  it("switch off: no 'create a page' advice, and a link to the Settings > SEO switch", async () => {
    mockSettings(false);
    const { container } = render(React.createElement(SeoManager));
    openGuide();
    await screen.findByRole("heading", { name: /ai assistant guide/i });

    expect(container.textContent).not.toMatch(/create a wordpress page/i);
    const toSettings = Array.from(container.querySelectorAll("a")).filter(
      (a) => a.getAttribute("href") === "#/settings?tab=seo"
    );
    expect(toSettings.length).toBe(1);
  });

  it("switch on: no 'create a page' advice, and the text names the live address", async () => {
    mockSettings(true);
    const { container } = render(React.createElement(SeoManager));
    openGuide();
    await screen.findByRole("heading", { name: /ai assistant guide/i });

    expect(container.textContent).not.toMatch(/create a wordpress page/i);
    // The address must appear in the visible instructions, not only in
    // the "Check Live File" link's href.
    expect(container.textContent).toContain("example.test/llms.txt");
  });
});
