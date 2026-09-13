/**
 * Vitest coverage for DashboardLayout's navigation: it carries no tier
 * badge and no locked/disabled nav item, driving the real component's
 * render path rather than a snapshot of the removed JSX.
 *
 * React-externalization workaround (read before editing): this codebase
 * externalizes React (WP.org Guideline 13, 2026-08-12) — vite.config.ts's
 * resolve.alias redirects every `import ... from "react"` / "react-dom" /
 * "react-dom/client" / "react/jsx-runtime" to a proxy module under
 * src/vendor-shims/ that reads WordPress's already-loaded `window.React` /
 * `window.ReactDOM` GLOBAL at import time. There is no real WP admin page
 * loading those globals in this jsdom test environment, so any module that
 * statically imports React (or JSX, which auto-imports "react/jsx-runtime")
 * — including react-router-dom, which itself depends on React — crashes at
 * module-evaluation time unless those globals are stamped first. Same
 * workaround as WafUpsellCard.test.tsx / GeneralSettings.test.tsx: pre-stamp
 * window.React / window.ReactDOM from the REAL npm packages via Node's own
 * `createRequire` in `beforeAll`, defer every import that transitively needs
 * "react"/"react-dom"/"react-router-dom" to a runtime `await import()`
 * inside that same `beforeAll`, and never use JSX syntax anywhere in this
 * file (a JSX literal anywhere in the source causes the compiler to
 * auto-inject a hoisted, top-level "react/jsx-runtime" import regardless of
 * where in the file the JSX appears) — every element is built with
 * `React.createElement` instead.
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, beforeAll, beforeEach } from "vitest";

type DashboardLayoutModule = typeof import("./DashboardLayout");
type RouterModule = typeof import("react-router-dom");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");

let DashboardLayout: DashboardLayoutModule["DashboardLayout"];
let MemoryRouter: RouterModule["MemoryRouter"];
let Routes: RouterModule["Routes"];
let Route: RouterModule["Route"];
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

  ({ DashboardLayout } = await import("./DashboardLayout"));
  ({ MemoryRouter, Routes, Route } = await import("react-router-dom"));
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  React = await import("react");
});

function renderLayout() {
  return render(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/"] },
      React.createElement(
        Routes,
        null,
        React.createElement(Route, {
          path: "/",
          element: React.createElement(DashboardLayout),
          children: React.createElement(Route, {
            index: true,
            element: React.createElement("div", null, "child route content"),
          }),
        })
      )
    )
  );
}

describe("DashboardLayout — navigation carries no tier or lock state", () => {
  afterEach(() => {
    cleanup();
    delete (window as any).swisswpsuiteData;
  });

  // The fixture below is the exact shape that USED to drive the removed
  // UI: an install claiming a paid tier whose capability list grants
  // neither seo_meta nor content_rewrite. Against the pre-fix component
  // this rendered a "License Tier" badge, two padlocked nav items and an
  // "AI Content" entry; each assertion here fails on that code.
  function stampPayload() {
    (window as any).swisswpsuiteData = {
      edition: "pro",
      license: {
        tier: "sentinel_pro",
        tier_name: "Sentinel Pro",
        capabilities: [],
      },
    };
  }

  it("positive control: the sidebar navigation actually rendered", () => {
    stampPayload();
    renderLayout();
    expect(screen.getByText("Security")).toBeInTheDocument();
  });

  it("renders no tier badge", () => {
    stampPayload();
    renderLayout();
    expect(screen.queryByText(/license tier/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Sentinel Pro")).not.toBeInTheDocument();
  });

  it("renders no locked navigation item", () => {
    stampPayload();
    const { container } = renderLayout();
    expect(container.querySelectorAll(".cursor-not-allowed")).toHaveLength(0);
    expect(container.querySelectorAll(".grayscale")).toHaveLength(0);
  });

  it("does not offer an AI Content destination", () => {
    stampPayload();
    renderLayout();
    expect(screen.queryByText("AI Content")).not.toBeInTheDocument();
  });
});

describe("DashboardLayout — sidebar wordmark rebrand (ARS Round D, D-K-8; owner ruling 2026-08-24: 'SwissWP…' rendering risks confusion with the swisswpsecure.com company trademark)", () => {
  afterEach(() => {
    cleanup();
    delete (window as any).swisswpsuiteData;
  });

  // The tagline under the wordmark is a build-time source-overlay swap
  // (brandTagline.ts): `plugin/src/…/brandTagline.ts` ships
  // "SECURITY & BACKUP SUITE" and `pro-overlay/src/…/brandTagline.ts`
  // overrides it to "AI SECURITY SUITE" only when Vite is built with
  // SWISSWPSUITE_OVERLAY set. This suite imports DashboardLayout directly
  // (no overlay configured), so it always exercises the Free tagline
  // module regardless of the `edition` value stamped into
  // window.swisswpsuiteData — that flag drives nav/tier gating elsewhere
  // in the component, not which tagline file was bundled. Pro's overlay
  // value is a separate, file-identity assertion — see
  // pro-overlay/tests/Unit/brandTagline.test.ts, not a runtime branch this
  // suite could exercise.
  it("renders the SwissSuite AI wordmark and the Free tagline, no SwissWP token — Free edition", () => {
    (window as any).swisswpsuiteData = {
      edition: "free",
      license: {
        tier: "free",
        tier_name: "Free",
        capabilities: [],
      },
    };

    const { container } = renderLayout();

    // Text is split across two adjacent DOM nodes (`SWISS` + a nested
    // `<span>SUITE</span>`), so testing-library's default per-node text
    // matcher (direct text-node children only) would see "SWISS" and
    // "SUITE" as two separate node texts rather than one combined string —
    // assert on the full recursive textContent instead of getByText.
    expect(container.textContent).toContain("SWISSSUITE");
    expect(container.textContent).toContain("SECURITY & BACKUP SUITE");
    expect(container.textContent).not.toContain("AI SECURITY SUITE");
    expect(container.textContent).not.toMatch(/SWISSWP/i);
    expect(container.textContent).not.toMatch(/SECURE SUITE/i);
  });

  it("renders the SwissSuite AI wordmark and the Free tagline module (no overlay configured) — Pro edition data flag", () => {
    (window as any).swisswpsuiteData = {
      edition: "pro",
      license: {
        tier: "sentinel_pro",
        tier_name: "Sentinel Pro",
        capabilities: [],
      },
    };

    const { container } = renderLayout();

    expect(container.textContent).toContain("SWISSSUITE");
    expect(container.textContent).toContain("SECURITY & BACKUP SUITE");
    expect(container.textContent).not.toMatch(/SWISSWP/i);
    expect(container.textContent).not.toMatch(/SECURE SUITE/i);
  });
});
