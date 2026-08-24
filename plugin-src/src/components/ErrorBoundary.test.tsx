/**
 * Vitest coverage for ErrorBoundary (audit gap: "no ErrorBoundary anywhere in
 * plugin/src — a render/commit-phase error unmounts the whole admin SPA to a
 * blank screen and is never reported").
 *
 * Location note: existing repo convention keeps vitest specs under
 * plugin/tests/Unit/ (see Welcome.test.tsx et al.), but this task's touch
 * scope is restricted to files under plugin/src/ — this file is
 * deliberately co-located with the component it tests instead.
 *
 * React-externalization workaround (read before editing): this codebase
 * externalizes React (WP.org Guideline 13, 2026-08-12) — vite.config.ts's
 * resolve.alias redirects every `import ... from "react"` / "react-dom" /
 * "react-dom/client" / "react/jsx-runtime" to a proxy module under
 * src/vendor-shims/ that reads WordPress's already-loaded `window.React` /
 * `window.ReactDOM` GLOBAL at import time. There is no real WP admin page
 * loading those globals in this jsdom test environment, so any test that
 * statically imports React (or JSX, which auto-imports "react/jsx-runtime")
 * crashes at module-evaluation time — this is exactly why 3 pre-existing
 * vitest files (Welcome.test.tsx et al.) currently fail; that is a known,
 * out-of-scope infra gap, not touched here (see plugin/vite.config.ts's
 * resolve.alias block and .claude/agent-memory/frontend-specialist for the
 * full externalization rationale).
 *
 * This file works around it, without touching vite.config.ts or any shared
 * setup file (out of this task's touch scope), by:
 *   1. Obtaining the REAL npm react/react-dom packages via Node's own
 *      `createRequire` — a resolution path Vite's alias never sees, since
 *      the alias only intercepts specifiers passed through Vite's own
 *      import/resolve pipeline — and stamping them onto
 *      `window.React`/`window.ReactDOM` in `beforeAll`, BEFORE anything that
 *      needs the aliased modules is ever imported.
 *   2. Deferring every import that transitively needs
 *      "react"/"react-dom"/"react/jsx-runtime" (ErrorBoundary itself,
 *      @testing-library/react) to a runtime `await import()` inside that
 *      same `beforeAll` — a plain top-level `import` is hoisted and
 *      evaluated before this file's own body ever runs, which would defeat
 *      step 1.
 *   3. Avoiding JSX syntax anywhere in this file (a JSX literal anywhere in
 *      the source causes the compiler to auto-inject a hoisted, top-level
 *      "react/jsx-runtime" import regardless of where in the file the JSX
 *      appears) — every element is built with `React.createElement`
 *      instead, using the dynamically-imported `React` reference from step 2.
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import type { ErrorBoundaryReportPayload } from "./ErrorBoundary";

type ErrorBoundaryModule = typeof import("./ErrorBoundary");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");

let ErrorBoundary: ErrorBoundaryModule["ErrorBoundary"];
let render: TestingLibraryModule["render"];
let screen: TestingLibraryModule["screen"];
let cleanup: TestingLibraryModule["cleanup"];
let React: ReactModule;

// Plain function components — declared with no JSX in their bodies so
// defining them (a no-op until called) is safe before React exists.
function Bomb(): never {
  throw new Error("boom");
}

function Calm() {
  return React.createElement("div", null, "all good");
}

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  const RealReact = nodeRequire("react");
  const RealReactDOM = nodeRequire("react-dom");
  const RealReactDOMClient = nodeRequire("react-dom/client");
  window.React = RealReact;
  window.ReactDOM = { ...RealReactDOM, ...RealReactDOMClient };

  ({ ErrorBoundary } = await import("./ErrorBoundary"));
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  React = await import("react");
});

describe("ErrorBoundary", () => {
  afterEach(() => {
    // @testing-library/react's automatic afterEach(cleanup) registration
    // relies on a GLOBAL `afterEach` (globalThis.afterEach) being present —
    // this project's vitest config does not set `test.globals: true`
    // (tests import describe/it/expect/afterEach explicitly, matching
    // Welcome.test.tsx's existing convention), so that auto-registration
    // never fires and the DOM would otherwise leak between the two `it`
    // blocks below. Clean up explicitly instead.
    cleanup();
    vi.restoreAllMocks();
  });

  it("catches a render-phase error, shows the fallback UI, and reports exactly once", () => {
    // React logs the caught error to console.error itself (in addition to
    // this boundary's own onReport) — silence it so the test output stays
    // clean; this has no effect on the assertions below.
    vi.spyOn(console, "error").mockImplementation(() => {});
    const onReport = vi.fn();

    render(
      React.createElement(ErrorBoundary, {
        onReport,
        children: React.createElement(Bomb),
      })
    );

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reload page/i })).toBeInTheDocument();

    // Bonus coverage (a11y-engineer fix #2, focus management): the fallback
    // container is tabIndex={-1} and programmatically focused in
    // componentDidUpdate on the false->true hasError transition, so a
    // keyboard user lands directly on the alert instead of WP-admin chrome.
    expect(document.activeElement).toBe(alert);

    expect(onReport).toHaveBeenCalledTimes(1);
    const payload = onReport.mock.calls[0][0] as ErrorBoundaryReportPayload;
    expect(payload.type).toBe("react-boundary");
    expect(payload.message).toBe("boom");
    expect(payload.stack).toContain("componentStack");
  });

  it("renders children untouched and never reports when nothing throws", () => {
    const onReport = vi.fn();

    render(
      React.createElement(ErrorBoundary, {
        onReport,
        children: React.createElement(Calm),
      })
    );

    expect(screen.getByText("all good")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(onReport).not.toHaveBeenCalled();
  });
});
