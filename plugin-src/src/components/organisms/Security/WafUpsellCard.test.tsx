/**
 * Vitest coverage for WafUpsellCard (F6, 2026-08-18): the "Upgrade to
 * Security Plan" CTA previously pointed at
 * `https://swisswpsecure.com/#pricing`, an anchor the live site does not
 * have (validator-confirmed via the built site's HTML). Fixed to
 * `https://swisswpsecure.com/products/` (validator-confirmed 200 live).
 *
 * React-externalization workaround (read before editing): this codebase
 * externalizes React (WP.org Guideline 13, 2026-08-12) — vite.config.ts's
 * resolve.alias redirects every `import ... from "react"` / "react-dom" /
 * "react-dom/client" / "react/jsx-runtime" to a proxy module under
 * src/vendor-shims/ that reads WordPress's already-loaded `window.React` /
 * `window.ReactDOM` GLOBAL at import time. There is no real WP admin page
 * loading those globals in this jsdom test environment, so any test that
 * statically imports React (or JSX, which auto-imports "react/jsx-runtime")
 * crashes at module-evaluation time. See ErrorBoundary.test.tsx for the
 * full rationale (same workaround, copied here): pre-stamp window.React /
 * window.ReactDOM from the REAL npm packages via Node's own
 * `createRequire` in `beforeAll`, defer every import that transitively
 * needs "react"/"react-dom"/"react/jsx-runtime" to a runtime `await
 * import()` inside that same `beforeAll`, and never use JSX syntax
 * anywhere in this file (a JSX literal anywhere in the source causes the
 * compiler to auto-inject a hoisted, top-level "react/jsx-runtime" import
 * regardless of where in the file the JSX appears) — every element is
 * built with `React.createElement` instead.
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, beforeAll } from "vitest";

type WafUpsellCardModule = typeof import("./WafUpsellCard");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");

let WafUpsellCard: WafUpsellCardModule["WafUpsellCard"];
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

  ({ WafUpsellCard } = await import("./WafUpsellCard"));
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  React = await import("react");
});

describe("WafUpsellCard", () => {
  afterEach(() => {
    // See ErrorBoundary.test.tsx: @testing-library/react's automatic
    // afterEach(cleanup) needs `test.globals: true`, which this project's
    // vitest config does not set — clean up explicitly instead.
    cleanup();
  });

  it("links the upgrade CTA to the live /products/ page, not the dead #pricing anchor", () => {
    render(React.createElement(WafUpsellCard));

    const link = screen.getByRole("link", {
      name: /upgrade to security plan/i,
    });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://swisswpsecure.com/products/");
    expect(link.getAttribute("href")).not.toBe(
      "https://swisswpsecure.com/#pricing"
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
