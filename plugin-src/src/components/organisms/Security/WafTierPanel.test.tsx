/**
 * Vitest coverage for WafTierPanel.freeStub.tsx (WP.org R14 remediation,
 * v2.9.33.54) — the module vite.config.ts aliases in for EDITION=free.
 * Proves it always renders the plain, non-comparative panel regardless of
 * window.swisswpsuiteData or props, and never reads hasAdvancedWaf.
 *
 * React-externalization workaround: see WafUpsellCard.test.tsx's docblock
 * for the full rationale — copied here unchanged.
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, beforeAll, beforeEach } from "vitest";

type WafTierPanelStubModule = typeof import("./WafTierPanel");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");

let WafTierPanel: WafTierPanelStubModule["WafTierPanel"];
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

describe("WafTierPanel.freeStub", () => {
  beforeEach(() => {
    // @ts-expect-error -- test-only injection: even if hasAdvancedWaf were
    // somehow true, the stub must never read it.
    window.swisswpsuiteData = { hasAdvancedWaf: true };
  });

  afterEach(() => {
    cleanup();
  });

  it("always renders the plain panel and never the comparative 'Advanced WAF Active' claim", () => {
    render(React.createElement(WafTierPanel));

    expect(screen.getByText("Web Application Firewall")).toBeInTheDocument();
    expect(screen.queryByText("Advanced WAF Active")).not.toBeInTheDocument();
    expect(screen.queryByText(/28\+ SQLi/)).not.toBeInTheDocument();
  });
});
