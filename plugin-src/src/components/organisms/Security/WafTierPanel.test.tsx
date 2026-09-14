/**
 * Vitest coverage for WafTierPanel — the firewall summary card on the
 * Security dashboard. This build ships one WAF rule set and applies it
 * unconditionally, so the panel takes no props: it always renders the
 * same static list of what that rule set blocks, and never renders a
 * comparative "tier" claim.
 *
 * React-externalization workaround (read before editing): this codebase
 * externalizes React (WP.org Guideline 13, 2026-08-12) — vite.config.ts's
 * resolve.alias redirects every `import ... from "react"` / "react-dom" /
 * "react-dom/client" / "react/jsx-runtime" to a proxy module under
 * src/vendor-shims/ that reads WordPress's already-loaded `window.React` /
 * `window.ReactDOM` global at import time. jsdom never loads that global,
 * so this file stamps the REAL npm react/react-dom onto those globals in
 * `beforeAll`, BEFORE any aliased import runs (same pattern as
 * ErrorBoundary.test.tsx) — no JSX in this file, `React.createElement`
 * only.
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, beforeAll } from "vitest";

type WafTierPanelModule = typeof import("./WafTierPanel");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");

let WafTierPanel: WafTierPanelModule["WafTierPanel"];
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

  ({ WafTierPanel } = await import("./WafTierPanel"));
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  React = await import("react");
});

describe("WafTierPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the firewall panel heading and its rule list", () => {
    render(React.createElement(WafTierPanel));

    expect(screen.getByText("Web Application Firewall")).toBeInTheDocument();
    expect(
      screen.getByText("SQL injection pattern blocking")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Cross-site scripting (XSS) pattern blocking")
    ).toBeInTheDocument();
    expect(screen.getByText("Path traversal protection")).toBeInTheDocument();
  });

  it("renders identically regardless of window.swisswpsuiteData — the panel takes no props and reads no global", () => {
    // @ts-expect-error -- test-only injection: the panel must never read
    // this, no matter what it contains.
    window.swisswpsuiteData = { hasAdvancedWaf: true };

    render(React.createElement(WafTierPanel));

    expect(screen.getByText("Web Application Firewall")).toBeInTheDocument();

    delete (window as any).swisswpsuiteData;
  });
});
