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
    emailNotifications: true,
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

describe("GeneralSettings — Beta Features toggle", () => {
  afterEach(() => {
    cleanup();
    delete (window as any).swisswpsuiteData;
  });

  it("renders no Beta Features toggle — this build has no beta section for it to unlock", () => {
    render(
      React.createElement(GeneralSettings, {
        settings: baseSettings({ }),
        onSave: async () => ({ success: true }),
        isSaving: false,
      })
    );

    // Positive control: the panel really rendered.
    expect(
      screen.getByRole("switch", { name: /email notifications/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("switch", { name: /beta features/i })
    ).not.toBeInTheDocument();
  });
});

describe("GeneralSettings — Alert Digest Frequency select (A-21, DIAG-EMAIL E-5, VALIDATOR_DIAG_EMAIL.md §4 D6)", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the stored frequency value in the select", () => {
    render(
      React.createElement(GeneralSettings, {
        settings: baseSettings({ alertDigestFrequency: "twicedaily" }),
        onSave: async () => ({ success: true }),
        isSaving: false,
      })
    );

    const select = screen.getByLabelText(
      /alert digest frequency/i
    ) as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe("twicedaily");
  });

  it("falls back to the 'daily' default (owner gate G2) when the field is absent from settings", () => {
    render(
      React.createElement(GeneralSettings, {
        settings: baseSettings(),
        onSave: async () => ({ success: true }),
        isSaving: false,
      })
    );

    const select = screen.getByLabelText(
      /alert digest frequency/i
    ) as HTMLSelectElement;
    expect(select.value).toBe("daily");
  });

  it("changing the select calls onSave with { alertDigestFrequency } exactly once — no Save button present", () => {
    const onSave = vi.fn(async () => ({ success: true }));
    render(
      React.createElement(GeneralSettings, {
        settings: baseSettings({ alertDigestFrequency: "daily" }),
        onSave,
        isSaving: false,
      })
    );

    const select = screen.getByLabelText(
      /alert digest frequency/i
    ) as HTMLSelectElement;
    // jsdom <select> onChange fires via a native change event.
    select.value = "twicedaily";
    select.dispatchEvent(new Event("change", { bubbles: true }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      alertDigestFrequency: "twicedaily",
    });
    expect(
      screen.queryByRole("button", { name: /^save$/i })
    ).not.toBeInTheDocument();
  });

  it("helper text states the immediate-send condition and the 'off' data-loss consequence truthfully (R2-06, VALIDATOR_V51_ROUND3_FIXES.md Lane U)", () => {
    render(
      React.createElement(GeneralSettings, {
        settings: baseSettings(),
        onSave: async () => ({ success: true }),
        isSaving: false,
      })
    );

    expect(
      screen.getByText(
        /critical alerts are sent immediately when alert e-mails are switched on \(at most 5 per day\)\. everything else is bundled into this summary — turning the summary off also discards any events still waiting to be summarised\./i
      )
    ).toBeInTheDocument();
  });
});
