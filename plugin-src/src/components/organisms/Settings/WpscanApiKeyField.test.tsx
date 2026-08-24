/**
 * Vitest coverage for WpscanApiKeyField (F6, 2026-08-18 — purchase-path
 * link fix): the "Not available on this plan → Learn more" link (shown when
 * `isProUser` is false) pointed at `https://www.swisswpsecure.com/pricing`,
 * validator-confirmed 404 live. Fixed to reuse the already-imported
 * `PRO_UPGRADE_URL` constant (`https://swisswpsecure.com/products/`,
 * validator-confirmed 200 live).
 *
 * React-externalization workaround (read before editing): identical to
 * WafUpsellCard.test.tsx / ErrorBoundary.test.tsx / LicenseManager.test.tsx —
 * this codebase externalizes React (WP.org Guideline 13), so
 * "react"/"react-dom"/"react/jsx-runtime" are Vite-aliased to shims that
 * read a pre-existing `window.React`/`window.ReactDOM` global. Real npm
 * react/react-dom are pulled in via Node's `createRequire` (bypassing
 * Vite's resolver) and stamped onto those globals in `beforeAll`, BEFORE any
 * aliased import runs; every subsequently-needed module is dynamically
 * imported inside that same `beforeAll`; this file never uses JSX (a JSX
 * literal anywhere hoists a top-level "react/jsx-runtime" import ahead of
 * the stamp) — every element is built with `React.createElement`.
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";

type WpscanModule = typeof import("./WpscanApiKeyField");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");
type EditionModule = typeof import("../../../lib/edition");

let WpscanApiKeyField: WpscanModule["WpscanApiKeyField"];
let render: TestingLibraryModule["render"];
let screen: TestingLibraryModule["screen"];
let cleanup: TestingLibraryModule["cleanup"];
let React: ReactModule;
let PRO_UPGRADE_URL: EditionModule["PRO_UPGRADE_URL"];

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  const RealReact = nodeRequire("react");
  const RealReactDOM = nodeRequire("react-dom");
  const RealReactDOMClient = nodeRequire("react-dom/client");
  window.React = RealReact;
  window.ReactDOM = { ...RealReactDOM, ...RealReactDOMClient };

  ({ WpscanApiKeyField } = await import("./WpscanApiKeyField"));
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  ({ PRO_UPGRADE_URL } = await import("../../../lib/edition"));
  React = await import("react");
});

describe("WpscanApiKeyField — locked-plan upsell link", () => {
  afterEach(() => {
    // See ErrorBoundary.test.tsx: @testing-library/react's automatic
    // afterEach(cleanup) needs `test.globals: true`, which this project's
    // vitest config does not set — clean up explicitly instead.
    cleanup();
    vi.restoreAllMocks();
  });

  it("points 'Learn more' at the live products page, not the dead /pricing URL", () => {
    render(
      React.createElement(WpscanApiKeyField, {
        settings: {} as never,
        onSave: vi.fn().mockResolvedValue(undefined),
        isProUser: false,
      })
    );

    const link = screen.getByRole("link", { name: /learn more/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", PRO_UPGRADE_URL);
    expect(link).toHaveAttribute("href", "https://swisswpsecure.com/products/");
    expect(link.getAttribute("href")).not.toBe(
      "https://www.swisswpsecure.com/pricing"
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
