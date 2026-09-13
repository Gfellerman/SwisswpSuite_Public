/**
 * AC-9 lock: the Settings surface renders against the response this build's
 * `GET /settings` actually sends.
 *
 * That response carries no spending-allowance block and no model-provider
 * fields — `tokens`, `apiKey`, `useCustomApi`, `customApiUrl`,
 * `customModelId`, `betaFeatures`, `license`, `wpscanApiKey`,
 * `patchstackApiKey` and their `has*` companions are absent from the object,
 * not zeroed and not null. A reader that assumes any of them is present
 * throws on the first paint, which is the failure this file exists to catch.
 *
 * Fail-first (CLAUDE.md §0.5 rule 1): against the pre-fix tree the fixture
 * below does not type-check and `expect(...).not.toThrow()` is the only part
 * that would still pass, because `SettingsResponse` declared five of these
 * keys as required — that is exactly the contract this test now pins open.
 *
 * React-externalization workaround (read before editing): this codebase
 * externalizes React (WP.org Guideline 13, 2026-08-12) — vite.config.ts's
 * resolve.alias redirects every `import ... from "react"` to a proxy reading
 * WordPress's already-loaded `window.React` global at import time. jsdom
 * never loads that global, so this file stamps the REAL npm react/react-dom
 * onto those globals in `beforeAll`, BEFORE any aliased import runs (same
 * pattern as GeneralSettings.test.tsx) — no JSX anywhere in this file,
 * `React.createElement` only.
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, beforeAll } from "vitest";

type GeneralSettingsModule = typeof import("./GeneralSettings");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");
type SwissSettings = import("../../../hooks/useSettings").SwissSettings;

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

afterEach(() => cleanup());

/** Exactly what this build's `GET /settings` returns — nothing more. */
const SHIPPED_RESPONSE: SwissSettings = {
  emailNotifications: true,
  loginMaxRetries: 5,
};

/** Keys a reader must never assume are present. */
const ABSENT_KEYS = [
  "tokens",
  "license",
  "apiKey",
  "hasApiKey",
  "useCustomApi",
  "customApiUrl",
  "customModelId",
  "betaFeatures",
  "wpscanApiKey",
  "hasWpscanApiKey",
  "patchstackApiKey",
  "hasPatchstackApiKey",
];

describe("Settings surface — renders against the shipped response shape", () => {
  it("positive control: the fixture really omits every key under test", () => {
    const present = ABSENT_KEYS.filter(
      (k) => k in (SHIPPED_RESPONSE as unknown as Record<string, unknown>)
    );
    expect(present).toEqual([]);
    expect(Object.keys(SHIPPED_RESPONSE)).toContain("emailNotifications");
  });

  it("renders without throwing when every one of those keys is absent", () => {
    expect(() =>
      render(
        React.createElement(GeneralSettings, {
          settings: SHIPPED_RESPONSE,
          onSave: async () => ({ success: true }),
          isSaving: false,
        })
      )
    ).not.toThrow();
  });

  it("paints its own controls, so the render was real and not empty", () => {
    render(
      React.createElement(GeneralSettings, {
        settings: SHIPPED_RESPONSE,
        onSave: async () => ({ success: true }),
        isSaving: false,
      })
    );
    expect(screen.getAllByRole("switch").length).toBeGreaterThan(0);
  });
});
