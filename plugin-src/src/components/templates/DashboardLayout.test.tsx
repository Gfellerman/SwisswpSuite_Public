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
 * workaround as WafTierPanel.test.tsx / GeneralSettings.test.tsx: pre-stamp
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

describe("DashboardLayout — navigation is the fixed Free set, with no tier badge and no locked item", () => {
  afterEach(() => {
    cleanup();
    delete (window as any).swisswpsuiteData;
  });

  // DashboardLayout's navItems array is a fixed, hard-coded list — it does
  // not read window.swisswpsuiteData at all. These assertions lock that:
  // no fixture value can make a tier badge, a locked/disabled nav item, or
  // an entry outside the five static destinations (Dashboard, Security,
  // SEO, Backup, Settings) appear.
  function stampPayload() {
    (window as any).swisswpsuiteData = {
      license: { tier_name: "Free" },
    };
  }

  it("positive control: the sidebar navigation actually rendered", () => {
    stampPayload();
    renderLayout();
    expect(screen.getByText("Security")).toBeInTheDocument();
  });

  it("renders exactly the five static Free nav destinations, nothing more", () => {
    stampPayload();
    const { container } = renderLayout();
    const nav = container.querySelector("nav");
    expect(nav).not.toBeNull();
    const navLabels = Array.from(nav!.querySelectorAll("a")).map(
      (a) => a.textContent
    );
    expect(navLabels).toEqual([
      "Dashboard",
      "Security",
      "SEO",
      "Backup",
      "Settings",
    ]);
    expect(navLabels).not.toContain("Sync");
    expect(navLabels).not.toContain("Migration");
    expect(navLabels).not.toContain("AI Content");
  });

  it("renders no tier badge", () => {
    stampPayload();
    renderLayout();
    expect(screen.queryByText(/license tier/i)).not.toBeInTheDocument();
  });

  it("renders no locked navigation item", () => {
    stampPayload();
    const { container } = renderLayout();
    expect(container.querySelectorAll(".cursor-not-allowed")).toHaveLength(0);
    expect(container.querySelectorAll(".grayscale")).toHaveLength(0);
  });
});

describe("DashboardLayout — sidebar wordmark rebrand ('SwissWP…' rendering risks confusion with the swisswpsecure.com company trademark)", () => {
  afterEach(() => {
    cleanup();
    delete (window as any).swisswpsuiteData;
  });

  // The tagline under the wordmark comes from a module this build's Vite
  // config selects at build time (brandTagline.ts) — DashboardLayout itself
  // never branches on window.swisswpsuiteData to choose a tagline. The
  // second test below proves that: it stamps an arbitrary, unrelated
  // payload shape and confirms the wordmark and tagline are unchanged —
  // nothing in window.swisswpsuiteData can affect which tagline renders.
  it("renders the SwissSuite AI wordmark and this build's tagline, no SwissWP token", () => {
    (window as any).swisswpsuiteData = {
      license: { tier_name: "Free" },
    };

    const { container } = renderLayout();

    // Text is split across two adjacent DOM nodes (`SWISS` + a nested
    // `<span>SUITE</span>`), so testing-library's default per-node text
    // matcher (direct text-node children only) would see "SWISS" and
    // "SUITE" as two separate node texts rather than one combined string —
    // assert on the full recursive textContent instead of getByText.
    expect(container.textContent).toContain("SWISSSUITE");
    expect(container.textContent).toContain("SECURITY & BACKUP SUITE");
    expect(container.textContent).not.toMatch(/SWISSWP/i);
    expect(container.textContent).not.toMatch(/SECURE SUITE/i);
  });

  it("renders the same wordmark and tagline no matter what window.swisswpsuiteData contains", () => {
    (window as any).swisswpsuiteData = {
      arbitraryField: "anything-at-all",
      nested: { value: 123 },
    };

    const { container } = renderLayout();

    expect(container.textContent).toContain("SWISSSUITE");
    expect(container.textContent).toContain("SECURITY & BACKUP SUITE");
    expect(container.textContent).not.toMatch(/SWISSWP/i);
    expect(container.textContent).not.toMatch(/SECURE SUITE/i);
  });
});
