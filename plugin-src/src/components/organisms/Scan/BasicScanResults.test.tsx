/**
 * Vitest coverage for BasicScanResults (fleet-findings-2026-09-03, B2 /
 * INTEG-441): the "All core files intact" early return used to be gated on
 * `issues_found === 0` alone. Once `issues_found` was narrowed to real
 * integrity issues only (core_modified/core_missing) and a new,
 * additive `informational_found` field introduced (see
 * SwissWPSuite_Security::perform_core_scan()), a clean site with only
 * informational findings (bundled plugins/themes, known-safe deletions)
 * would have `issues_found === 0` while still holding informational
 * findings the component was built to group and explain — the early
 * return would swallow them entirely and its "N informational" branch
 * would become dead code by construction (validator finding V-D,
 * VALIDATOR_FLEET_FIXES.md §2.2).
 *
 * FIX UNDER TEST: the early return now checks
 * `issues_found === 0 && informational_found === 0`; the informational
 * badge and "no real issues" banner text now read `informational_found`
 * instead of `issues_found`.
 *
 * This is the validator-authored B2-T3 scenario (VALIDATOR_FLEET_FIXES.md
 * §6): props `{issues_found: 0, informational_found: 3, details: [3
 * informational]}` must render the grouped informational view, not the
 * "All core files intact" early return.
 *
 * React-externalization workaround (read before editing): this codebase
 * externalizes React (WP.org Guideline 13, 2026-08-12) — vite.config.ts's
 * resolve.alias redirects every `import ... from "react"` / "react-dom" /
 * "react-dom/client" / "react/jsx-runtime" to a proxy module under
 * src/vendor-shims/ that reads WordPress's already-loaded `window.React` /
 * `window.ReactDOM` GLOBAL at import time. See ErrorBoundary.test.tsx /
 * WafUpsellCard.test.tsx for the full rationale (same workaround, copied
 * here): pre-stamp window.React / window.ReactDOM from the REAL npm
 * packages via Node's own `createRequire` in `beforeAll`, defer every
 * import that transitively needs "react"/"react-dom"/"react/jsx-runtime"
 * to a runtime `await import()` inside that same `beforeAll`, and never
 * use JSX syntax anywhere in this file — every element is built with
 * `React.createElement` instead.
 *
 * Per CLAUDE.md §0.5 rule 1 / corollary 1, the first test below was run
 * against the unfixed source FIRST (RED: the early return fired on
 * issues_found===0 alone, so the grouped view and "3 informational" text
 * never rendered), then re-run after the fix (GREEN). Reverted via the
 * Edit tool, never via git checkout/stash/restore.
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, beforeAll } from "vitest";

type BasicScanResultsModule = typeof import("./BasicScanResults");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");

let BasicScanResults: BasicScanResultsModule["BasicScanResults"];
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

  ({ BasicScanResults } = await import("./BasicScanResults"));
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  React = await import("react");
});

describe("BasicScanResults", () => {
  afterEach(() => {
    // See ErrorBoundary.test.tsx: @testing-library/react's automatic
    // afterEach(cleanup) needs `test.globals: true`, which this project's
    // vitest config does not set — clean up explicitly instead.
    cleanup();
  });

  it("B2-T3: renders the grouped informational view (not the all-intact early return) when issues_found is 0 but informational_found is not", () => {
    const scanResults = {
      issues_found: 0,
      informational_found: 3,
      details: [
        {
          file: "wp-content/plugins/akismet/akismet.php",
          status: "missing",
          category: "bundled_plugin",
        },
        {
          file: "wp-content/plugins/akismet/class-akismet.php",
          status: "missing",
          category: "bundled_plugin",
        },
        {
          file: "wp-content/themes/twentytwentyfour/style.css",
          status: "missing",
          category: "theme_modified",
        },
      ],
    };

    render(
      React.createElement(BasicScanResults, {
        scanResults,
        expanded: false,
        onToggleExpanded: () => {},
      })
    );

    expect(
      screen.queryByText(/all core files intact/i)
    ).not.toBeInTheDocument();
    expect(screen.getByText(/3 informational/i)).toBeInTheDocument();
    expect(
      screen.getByText(/uninstalled bundled plugins/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/bundled theme changes/i)).toBeInTheDocument();
  });

  it("still shows the all-intact banner when both issues_found and informational_found are zero", () => {
    const scanResults = {
      issues_found: 0,
      informational_found: 0,
      details: [],
    };

    render(
      React.createElement(BasicScanResults, {
        scanResults,
        expanded: false,
        onToggleExpanded: () => {},
      })
    );

    expect(screen.getByText(/all core files intact/i)).toBeInTheDocument();
  });

  it("renders real-issue styling (danger badge, remediation advice) when issues_found is nonzero", () => {
    const scanResults = {
      issues_found: 1,
      informational_found: 0,
      details: [
        {
          file: "tests/bootstrap.php",
          status: "modified",
          category: "core_modified",
        },
      ],
    };

    render(
      React.createElement(BasicScanResults, {
        scanResults,
        expanded: false,
        onToggleExpanded: () => {},
      })
    );

    expect(screen.getByText(/1 potential issue/i)).toBeInTheDocument();
    expect(screen.getByText(/modified core files/i)).toBeInTheDocument();
  });
});
