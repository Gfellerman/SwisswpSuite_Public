/**
 * Vitest coverage for GeneralSettings' Dashboard Traffic Counter toggle
 * (F-09 Option A, ARS Round B2, D4-2, 2026-08-23).
 *
 * React-externalization workaround (read before editing): this codebase
 * externalizes React (WP.org Guideline 13, 2026-08-12) — vite.config.ts's
 * resolve.alias redirects every `import ... from "react"` to a proxy reading
 * WordPress's already-loaded `window.React` global at import time. jsdom
 * never loads that global, so this file stamps the REAL npm react/react-dom
 * onto those globals in `beforeAll`, BEFORE any aliased import runs (same
 * pattern as HardeningOptionsGrid.test.tsx / WafUpsellCard.test.tsx) — no
 * JSX anywhere in this file, `React.createElement` only.
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";

type GeneralSettingsModule = typeof import("./GeneralSettings");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");
type SettingsModule = typeof import("../../../hooks/useSettings");

let GeneralSettings: GeneralSettingsModule["GeneralSettings"];
let render: TestingLibraryModule["render"];
let screen: TestingLibraryModule["screen"];
let cleanup: TestingLibraryModule["cleanup"];
let React: ReactModule;

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  const RealReact = nodeRequire("react");
  const RealReactDOM = nodeRequire("react-dom");
  const RealReactDOMClient = nodeRequire("react-dom/client");
  window.React = RealReact;
  window.ReactDOM = { ...RealReactDOM, ...RealReactDOMClient };

  ({ GeneralSettings } = await import("./GeneralSettings"));
  ({ render, screen, cleanup } = await import("@testing-library/react"));
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

describe("GeneralSettings — Dashboard Traffic Counter toggle (F-09 Option A)", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders OFF (aria-checked=false) when pageviewTrackingEnabled is absent (off-by-default contract)", () => {
    render(
      React.createElement(GeneralSettings, {
        settings: baseSettings(),
        onSave: async () => ({ success: true }),
        isSaving: false,
      })
    );

    const toggle = screen.getByRole("switch", {
      name: /dashboard traffic counter/i,
    });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(
      screen.getByText(
        /counts pageviews per day and page type to power the dashboard traffic chart\. runs entirely on your server: no ip addresses, cookies, or personal data are collected or transmitted\. off by default\./i
      )
    ).toBeInTheDocument();
  });

  it("renders ON (aria-checked=true) when pageviewTrackingEnabled is true", () => {
    render(
      React.createElement(GeneralSettings, {
        settings: baseSettings({ pageviewTrackingEnabled: true }),
        onSave: async () => ({ success: true }),
        isSaving: false,
      })
    );

    const toggle = screen.getByRole("switch", {
      name: /dashboard traffic counter/i,
    });
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("clicking the toggle calls onSave with { pageviewTrackingEnabled: true } — one-click AJAX save, no Save button", () => {
    const onSave = vi.fn(async () => ({ success: true }));
    render(
      React.createElement(GeneralSettings, {
        settings: baseSettings(),
        onSave,
        isSaving: false,
      })
    );

    const toggle = screen.getByRole("switch", {
      name: /dashboard traffic counter/i,
    });
    toggle.click();

    expect(onSave).toHaveBeenCalledWith({ pageviewTrackingEnabled: true });
  });
});

describe("GeneralSettings — Email Notifications off-by-default fallback (A-2, ARS Round C Phase 1b, 2026-08-23)", () => {
  afterEach(() => {
    cleanup();
  });

  // A-2: config.emailNotifications ?? true -> ?? false, matching the new
  // backend default (swisswpsuite_email_notifications now seeds/falls back
  // to 'no' per handoff/lane*_manifest.md B-2/C-2). Real GET responses
  // always include a real boolean for this field (SwissSettings marks it
  // required), so this exercises the same defensive-fallback path already
  // covered for betaFeatures/pageviewTrackingEnabled: a settings object
  // missing the field (stale cache, rollout skew, malformed response).
  it("renders OFF (aria-checked=false) when emailNotifications is absent from settings (off-by-default contract)", () => {
    const settingsMissingField = {
      ...baseSettings(),
      emailNotifications: undefined,
    } as unknown as import("../../../hooks/useSettings").SwissSettings;

    render(
      React.createElement(GeneralSettings, {
        settings: settingsMissingField,
        onSave: async () => ({ success: true }),
        isSaving: false,
      })
    );

    const toggle = screen.getByRole("switch", {
      name: /email notifications/i,
    });
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("renders ON (aria-checked=true) when settings.emailNotifications is explicitly true", () => {
    render(
      React.createElement(GeneralSettings, {
        settings: baseSettings({ emailNotifications: true }),
        onSave: async () => ({ success: true }),
        isSaving: false,
      })
    );

    const toggle = screen.getByRole("switch", {
      name: /email notifications/i,
    });
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("clicking the toggle calls onSave with { emailNotifications: true } — one-click AJAX save, no Save button", () => {
    const onSave = vi.fn(async () => ({ success: true }));
    render(
      React.createElement(GeneralSettings, {
        settings: baseSettings({ emailNotifications: false }),
        onSave,
        isSaving: false,
      })
    );

    const toggle = screen.getByRole("switch", {
      name: /email notifications/i,
    });
    toggle.click();

    expect(onSave).toHaveBeenCalledWith({ emailNotifications: true });
  });
});

describe("GeneralSettings — Beta Features toggle (D-K-4 follow-up fix, lane-K verifier, 2026-08-24)", () => {
  afterEach(() => {
    cleanup();
    delete (window as any).swisswpsuiteData;
  });

  it("renders the Beta Features toggle on a Pro-edition build — restores its ONLY UI writer for swisswpsuite_beta_features (BackupsPage.tsx Sync/Migration gate)", () => {
    (window as any).swisswpsuiteData = { edition: "pro" };
    render(
      React.createElement(GeneralSettings, {
        settings: baseSettings({ betaFeatures: false }),
        onSave: async () => ({ success: true }),
        isSaving: false,
      })
    );

    expect(
      screen.getByRole("switch", { name: /beta features/i })
    ).toBeInTheDocument();
  });

  it("does NOT render the Beta Features toggle on a Free-edition build — Sync/Migration are physically absent in Free, nothing for it to unlock", () => {
    (window as any).swisswpsuiteData = { edition: "free" };
    render(
      React.createElement(GeneralSettings, {
        settings: baseSettings({ betaFeatures: false }),
        onSave: async () => ({ success: true }),
        isSaving: false,
      })
    );

    expect(
      screen.queryByRole("switch", { name: /beta features/i })
    ).not.toBeInTheDocument();
  });

  it("clicking the Pro-edition toggle calls onSave with { betaFeatures: true } — one-click AJAX save, no Save button", () => {
    (window as any).swisswpsuiteData = { edition: "pro" };
    const onSave = vi.fn(async () => ({ success: true }));
    render(
      React.createElement(GeneralSettings, {
        settings: baseSettings({ betaFeatures: false }),
        onSave,
        isSaving: false,
      })
    );

    const toggle = screen.getByRole("switch", { name: /beta features/i });
    toggle.click();

    expect(onSave).toHaveBeenCalledWith({ betaFeatures: true });
  });
});
