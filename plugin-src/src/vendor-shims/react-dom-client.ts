/**
 * WordPress.org Guideline 13 compliance shim — "react-dom/client"
 *
 * `createRoot` (used once, in src/index.tsx to mount the SPA) lives in the
 * `react-dom/client` subpath export. WordPress's bundled `react-dom.js`
 * global build exposes `createRoot`/`hydrateRoot` directly on
 * `window.ReactDOM` (React 18's UMD build folded the client entry point
 * into the main global for exactly this script-tag use case — verified
 * against the live WP 7.0.3 install's react-dom.js bundle, 2026-08-12).
 * See react.ts for the full externalization rationale.
 */

// `Window.ReactDOM`'s type (including the optional createRoot/hydrateRoot
// members read below) is declared once, in react-dom.ts, since TypeScript
// requires merged global augmentations of the same property to match
// exactly. Importing that module here (for its side-effecting `declare
// global` block) makes the augmentation visible without redeclaring it.
import "./react-dom";

const RD = window.ReactDOM;

if (!RD || typeof RD.createRoot !== "function") {
  throw new Error(
    "SwissSuite AI: window.ReactDOM.createRoot is missing. Either " +
      "WordPress's 'react-dom' script did not load before this plugin's " +
      "bundle ran, or the loaded build does not expose createRoot on the " +
      "global (unexpected for WP core >= 6.2's bundled React 18) — check " +
      "the wp_enqueue_script() dependency array in " +
      "class-swisswpsuite-admin.php."
  );
}

export const createRoot = RD.createRoot;
export const hydrateRoot = RD.hydrateRoot;

// src/index.tsx does `import ReactDOM from "react-dom/client"` (a default
// import) then calls `ReactDOM.createRoot(...)`. The real "react-dom/client"
// package is CJS; Vite/Rollup's CJS→ESM interop synthesizes a `default`
// export equal to the whole `module.exports` object for such packages
// automatically. This shim is a real ES module, which gets no such
// automatic synthesis, so the equivalent default export is provided
// explicitly here.
export default { createRoot, hydrateRoot };
