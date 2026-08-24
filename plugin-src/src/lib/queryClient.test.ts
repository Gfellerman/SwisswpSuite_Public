/**
 * Vitest coverage for queryClient.ts's shouldForwardTanStackError() (audit
 * gap: "failed API calls a component doesn't render are logged nowhere").
 *
 * React-externalization workaround (read before editing): this codebase
 * externalizes React (WP.org Guideline 13, 2026-08-12) — vite.config.ts's
 * resolve.alias redirects every `import ... from "react"` to a proxy
 * module under src/vendor-shims/ that reads WordPress's already-loaded
 * `window.React` GLOBAL at import time. There is no real WP admin page
 * loading that global in this jsdom test environment. queryClient.ts
 * itself never touches React directly, but it imports `QueryCache`,
 * `QueryClient`, `MutationCache` from "@tanstack/react-query" — and that
 * package's own entry module (build/modern/index.js) unconditionally
 * re-exports from "./useQuery.js" etc., which import "react" at module
 * top-level. Because ES module evaluation runs a module's ENTIRE static
 * import graph regardless of which named exports the importer actually
 * uses, simply `import`ing queryClient.ts transitively hits the same
 * "window.React is missing" throw documented in
 * plugin/src/components/ErrorBoundary.test.tsx's header comment — verified
 * directly against node_modules/@tanstack/react-query/build/modern/index.js
 * before writing this file, not assumed.
 *
 * This file works around it exactly like ErrorBoundary.test.tsx does,
 * without touching vite.config.ts or any shared setup file:
 *   1. Obtains the REAL npm react/react-dom packages via Node's own
 *      `createRequire` and stamps them onto `window.React`/`window.ReactDOM`
 *      in `beforeAll`, BEFORE anything that needs the aliased "react"
 *      module is ever imported.
 *   2. Defers the `import("./queryClient")` that transitively needs
 *      "react" to a runtime `await import()` inside that same `beforeAll`
 *      — a plain top-level `import` is hoisted and evaluated before this
 *      file's own body ever runs, which would defeat step 1.
 *
 * No JSX/component rendering happens in this file at all — it tests one
 * pure decision function — so, unlike ErrorBoundary.test.tsx, there is no
 * need to avoid JSX syntax or import @testing-library/react.
 */
import { createRequire } from "node:module";
import { describe, it, expect, beforeAll } from "vitest";

type QueryClientModule = typeof import("./queryClient");

let shouldForwardTanStackError: QueryClientModule["shouldForwardTanStackError"];

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  const RealReact = nodeRequire("react");
  const RealReactDOM = nodeRequire("react-dom");
  const RealReactDOMClient = nodeRequire("react-dom/client");
  window.React = RealReact;
  window.ReactDOM = { ...RealReactDOM, ...RealReactDOMClient };

  ({ shouldForwardTanStackError } = await import("./queryClient"));
});

// Stand-ins for the injectable isOwnScriptFn parameter — the pure function
// under test never touches window.swisswpsuiteData itself, so these avoid
// needing to fake that global for every case.
const passesAttribution = () => true;
const failsAttribution = () => false;

describe("shouldForwardTanStackError", () => {
  it("forwards a fresh, own-script, under-cap, non-duplicate, non-self failure", () => {
    expect(
      shouldForwardTanStackError(
        "security-status",
        "Server error (HTTP 500)",
        "Error: boom\n  at wpApi (assets/entry-app.js:1:1)",
        /* isDuplicate */ false,
        /* countSoFar */ 0,
        passesAttribution
      )
    ).toBe(true);
  });

  it("does NOT forward when the key segment names the js-error endpoint itself (self-reporting loop guard)", () => {
    expect(
      shouldForwardTanStackError(
        "debug/js-error",
        "Server error (HTTP 500)",
        "Error: boom\n  at wpApi (assets/entry-app.js:1:1)",
        false,
        0,
        passesAttribution
      )
    ).toBe(false);
  });

  it("does NOT forward when the js-error endpoint appears in the message instead of the key", () => {
    expect(
      shouldForwardTanStackError(
        "some-other-query",
        "Failed to POST /debug/js-error: Server error (HTTP 500)",
        "Error: boom\n  at wpApi (assets/entry-app.js:1:1)",
        false,
        0,
        passesAttribution
      )
    ).toBe(false);
  });

  it("does NOT forward once the per-page-load cap is reached", () => {
    expect(
      shouldForwardTanStackError(
        "security-status",
        "Server error (HTTP 500)",
        "Error: boom\n  at wpApi (assets/entry-app.js:1:1)",
        false,
        /* countSoFar */ 5,
        passesAttribution
      )
    ).toBe(false);
  });

  it("forwards right up to the cap boundary (count 4 of max 5) but not past it", () => {
    expect(
      shouldForwardTanStackError(
        "security-status",
        "Server error (HTTP 500)",
        "Error: boom\n  at wpApi (assets/entry-app.js:1:1)",
        false,
        4,
        passesAttribution
      )
    ).toBe(true);
  });

  it("does NOT forward a duplicate (key + message) signature already forwarded this page load", () => {
    expect(
      shouldForwardTanStackError(
        "security-status",
        "Server error (HTTP 500)",
        "Error: boom\n  at wpApi (assets/entry-app.js:1:1)",
        /* isDuplicate */ true,
        0,
        passesAttribution
      )
    ).toBe(false);
  });

  it("does NOT forward when own-script attribution fails (fail-closed doctrine)", () => {
    expect(
      shouldForwardTanStackError(
        "security-status",
        "Failed to fetch",
        "TypeError: Failed to fetch\n  at fetch (chrome-internal)",
        false,
        0,
        failsAttribution
      )
    ).toBe(false);
  });

  it("does NOT forward a stackless error — under-reporting by design, never fabricate a source", () => {
    // Mirrors the real isOwnScript() behavior (empty source/stack fails
    // closed) rather than the injected stand-in, to prove the documented
    // "stackless errors are dropped" doctrine end to end.
    expect(
      shouldForwardTanStackError(
        "security-status",
        "Something failed with no stack",
        "",
        false,
        0
        // isOwnScriptFn omitted — uses the REAL isOwnScript, which fails
        // closed on an empty source string regardless of assetsBaseUrl.
      )
    ).toBe(false);
  });
});
