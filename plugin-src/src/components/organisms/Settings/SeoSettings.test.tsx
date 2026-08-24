/**
 * Vitest coverage for SeoSettings' Sitemap / AI Assistant Guide toggles
 * (P1-03/F-08 sitemap toggle + P1-06/F-11 llms.txt toggle, ARS Round C
 * Lane 4, 2026-08-23).
 *
 * Fail-first evidence (see LANE_4 report for the paired PASS run): before
 * this component gained the two ToggleRow controls, `screen.getByRole
 * ("switch", { name: /xml sitemap/i })` and the llms.txt equivalent threw
 * TestingLibraryElementError ("Unable to find role='switch'") on every one
 * of these tests — there was no toggle in the DOM at all.
 *
 * React-externalization workaround (read before editing): same rationale
 * as GeneralSettings.test.tsx / useHardening.test.ts — this codebase
 * externalizes React (WP.org Guideline 13, 2026-08-12); jsdom never loads
 * window.React, so the real npm react/react-dom is stamped onto those
 * globals in beforeAll BEFORE any aliased import runs. SeoSettings also
 * pulls in @tanstack/react-query (useQuery for the OG-image attachment
 * fetch), so a QueryClientProvider wrapper is required even though the
 * query itself is `enabled: false` for every fixture below (attachmentId
 * defaults to 0) — useQuery() throws synchronously without a QueryClient
 * in context regardless of `enabled`.
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

type SeoSettingsModule = typeof import("./SeoSettings");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");
type ReactQueryModule = typeof import("@tanstack/react-query");
type SettingsModule = typeof import("../../../hooks/useSettings");

let SeoSettings: SeoSettingsModule["SeoSettings"];
let render: TestingLibraryModule["render"];
let screen: TestingLibraryModule["screen"];
let cleanup: TestingLibraryModule["cleanup"];
let React: ReactModule;
let QueryClient: ReactQueryModule["QueryClient"];
let QueryClientProvider: ReactQueryModule["QueryClientProvider"];

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  const RealReact = nodeRequire("react");
  const RealReactDOM = nodeRequire("react-dom");
  const RealReactDOMClient = nodeRequire("react-dom/client");
  window.React = RealReact;
  window.ReactDOM = { ...RealReactDOM, ...RealReactDOMClient };
  // window.wp.media is referenced by SeoSettings' module-level `declare const
  // window` type only, not called by any test below — no runtime stub needed
  // since we never click "Select Image".

  ({ SeoSettings } = await import("./SeoSettings"));
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  ({ QueryClient, QueryClientProvider } = await import(
    "@tanstack/react-query"
  ));
  React = await import("react");
});

function baseSettings(
  overrides: Partial<import("../../../hooks/useSettings").SwissSettings> = {}
): import("../../../hooks/useSettings").SwissSettings {
  return {
    apiKey: "",
    useCustomApi: false,
    customApiUrl: "",
    customModelId: "",
    autoUpdatePlugin: true,
    emailNotifications: true,
    betaFeatures: false,
    loginMaxRetries: 5,
    ...overrides,
  };
}

function renderSeoSettings(
  settings: import("../../../hooks/useSettings").SwissSettings,
  onSave: (
    s: Partial<import("../../../hooks/useSettings").SwissSettings>
  ) => Promise<any>
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(SeoSettings, { settings, onSave })
    )
  );
}

describe("SeoSettings — Sitemap toggle (P1-03/F-08)", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders OFF (aria-checked=false) when sitemapEnabled is absent — opt-in contract", () => {
    renderSeoSettings(baseSettings(), async () => ({ success: true }));

    const toggle = screen.getByRole("switch", { name: /xml sitemap/i });
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("renders ON (aria-checked=true) when sitemapEnabled is true", () => {
    renderSeoSettings(
      baseSettings({ sitemapEnabled: true }),
      async () => ({ success: true })
    );

    const toggle = screen.getByRole("switch", { name: /xml sitemap/i });
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("clicking the toggle calls onSave with { sitemapEnabled: true } — one-click AJAX save, no Save button", () => {
    const onSave = vi.fn(async () => ({ success: true }));
    renderSeoSettings(baseSettings(), onSave);

    const toggle = screen.getByRole("switch", { name: /xml sitemap/i });
    toggle.click();

    expect(onSave).toHaveBeenCalledWith({ sitemapEnabled: true });
  });
});

describe("SeoSettings — AI Assistant Guide (llms.txt) toggle (P1-06/F-11)", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders OFF (aria-checked=false) when llmsTxtEnabled is absent — opt-in contract", () => {
    renderSeoSettings(baseSettings(), async () => ({ success: true }));

    const toggle = screen.getByRole("switch", {
      name: /ai assistant guide/i,
    });
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("renders ON (aria-checked=true) when llmsTxtEnabled is true", () => {
    renderSeoSettings(
      baseSettings({ llmsTxtEnabled: true }),
      async () => ({ success: true })
    );

    const toggle = screen.getByRole("switch", {
      name: /ai assistant guide/i,
    });
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("clicking the toggle calls onSave with { llmsTxtEnabled: true } — one-click AJAX save, no Save button", () => {
    const onSave = vi.fn(async () => ({ success: true }));
    renderSeoSettings(baseSettings(), onSave);

    const toggle = screen.getByRole("switch", {
      name: /ai assistant guide/i,
    });
    toggle.click();

    expect(onSave).toHaveBeenCalledWith({ llmsTxtEnabled: true });
  });

  it("the two toggles are independent — flipping sitemap does not touch llmsTxtEnabled in the onSave payload", () => {
    const onSave = vi.fn(async () => ({ success: true }));
    renderSeoSettings(baseSettings({ llmsTxtEnabled: true }), onSave);

    const sitemapToggle = screen.getByRole("switch", { name: /xml sitemap/i });
    sitemapToggle.click();

    expect(onSave).toHaveBeenCalledWith({ sitemapEnabled: true });
    expect(onSave).not.toHaveBeenCalledWith(
      expect.objectContaining({ llmsTxtEnabled: expect.anything() })
    );
  });
});

describe("SeoSettings — Basic SEO Meta Tags toggle (ARS Round D delta, M6)", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders OFF (aria-checked=false) when seoMetaInjectionEnabled is absent — opt-in contract", () => {
    renderSeoSettings(baseSettings(), async () => ({ success: true }));

    const toggle = screen.getByRole("switch", {
      name: /basic seo meta tags/i,
    });
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("renders ON (aria-checked=true) when seoMetaInjectionEnabled is true", () => {
    renderSeoSettings(
      baseSettings({ seoMetaInjectionEnabled: true }),
      async () => ({ success: true })
    );

    const toggle = screen.getByRole("switch", {
      name: /basic seo meta tags/i,
    });
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("clicking the toggle calls onSave with { seoMetaInjectionEnabled: true } — one-click AJAX save, no Save button", () => {
    const onSave = vi.fn(async () => ({ success: true }));
    renderSeoSettings(baseSettings(), onSave);

    const toggle = screen.getByRole("switch", {
      name: /basic seo meta tags/i,
    });
    toggle.click();

    expect(onSave).toHaveBeenCalledWith({ seoMetaInjectionEnabled: true });
  });

  it("clicking again (currently ON) calls onSave with { seoMetaInjectionEnabled: false }", () => {
    const onSave = vi.fn(async () => ({ success: true }));
    renderSeoSettings(
      baseSettings({ seoMetaInjectionEnabled: true }),
      onSave
    );

    const toggle = screen.getByRole("switch", {
      name: /basic seo meta tags/i,
    });
    toggle.click();

    expect(onSave).toHaveBeenCalledWith({ seoMetaInjectionEnabled: false });
  });

  it("is independent from the sitemap/llms.txt toggles — flipping it does not touch their fields in the onSave payload", () => {
    const onSave = vi.fn(async () => ({ success: true }));
    renderSeoSettings(
      baseSettings({ sitemapEnabled: true, llmsTxtEnabled: true }),
      onSave
    );

    const toggle = screen.getByRole("switch", {
      name: /basic seo meta tags/i,
    });
    toggle.click();

    expect(onSave).toHaveBeenCalledWith({ seoMetaInjectionEnabled: true });
    expect(onSave).not.toHaveBeenCalledWith(
      expect.objectContaining({ sitemapEnabled: expect.anything() })
    );
    expect(onSave).not.toHaveBeenCalledWith(
      expect.objectContaining({ llmsTxtEnabled: expect.anything() })
    );
  });
});
