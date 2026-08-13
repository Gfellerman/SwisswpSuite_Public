/**
 * WordPress.org Guideline 13 compliance shim — "react-dom"
 *
 * Mirrors react.ts: replaces the real `react-dom` package with a proxy onto
 * WordPress core's already-loaded `window.ReactDOM` (the `react-dom`
 * script handle). See react.ts for the full rationale.
 */

declare global {
  interface Window {
    // Optional createRoot/hydrateRoot here (rather than a plain
    // `typeof import("react-dom")`) because react-dom-client.ts augments
    // this SAME `Window.ReactDOM` property — TypeScript requires every
    // declaration of a property across merged global augmentations to have
    // an identical type, so the two shim files share one declaration here.
    ReactDOM?: typeof import("react-dom") & {
      createRoot?: typeof import("react-dom/client").createRoot;
      hydrateRoot?: typeof import("react-dom/client").hydrateRoot;
    };
  }
}

const RD = window.ReactDOM;

if (!RD) {
  throw new Error(
    "SwissSuite AI: window.ReactDOM is missing. WordPress's own " +
      "'react-dom' script did not load before this plugin's bundle ran — " +
      "check the dependency array on the wp_enqueue_script() call in " +
      "class-swisswpsuite-admin.php (must include 'react-dom')."
  );
}

export default RD;

export const createPortal = RD.createPortal;
export const findDOMNode = (RD as unknown as { findDOMNode?: unknown })
  .findDOMNode;
export const flushSync = RD.flushSync;
export const unstable_batchedUpdates = RD.unstable_batchedUpdates;
export const version = RD.version;
