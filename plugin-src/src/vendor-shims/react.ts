/**
 * WordPress.org Guideline 13 compliance shim — "react"
 *
 * WordPress core bundles its own copy of React (registered under the
 * `react` script handle, exposing `window.React`) since it powers Gutenberg
 * via `@wordpress/element`. Guideline 13 forbids a directory plugin from
 * shipping a second copy of a library core already bundles. This module
 * REPLACES the real `react` package at build time (see the `resolve.alias`
 * entry in vite.config.ts) so every `import ... from "react"` in this
 * codebase resolves, at runtime, to WordPress's already-loaded instance
 * instead of a bundled copy — with zero source changes anywhere else.
 *
 * `plugin/includes/class-swisswpsuite-admin.php`'s `wp_enqueue_script()`
 * call for this bundle depends on the `react` script handle, guaranteeing
 * WordPress has already executed `wp-includes/js/dist/vendor/react.js`
 * (which sets `window.React`) before this module ever runs.
 *
 * Only the stable public API present in WordPress core's bundled version
 * (18.3.1 as of this writing — confirmed live 2026-08-12) is re-exported.
 * React 19-only names (`use`, `useActionState`, `useOptimistic`, `Activity`,
 * `cache`, `cacheSignal`, `useEffectEvent`, …) are deliberately NOT exported
 * — this codebase does not use them (verified by a full grep audit before
 * this externalization was implemented; see
 * docs/architecture/FREEMIUM_DUAL_BUILD_ARCHITECTURE.md's "React
 * externalization" section).
 */

declare global {
  interface Window {
    React?: typeof import("react");
  }
}

const R = window.React;

if (!R) {
  throw new Error(
    "SwissSuite AI: window.React is missing. WordPress's own 'react' " +
      "script did not load before this plugin's bundle ran — check the " +
      "dependency array on the wp_enqueue_script() call in " +
      "class-swisswpsuite-admin.php (must include 'react')."
  );
}

export default R;

export const Children = R.Children;
export const Component = R.Component;
export const Fragment = R.Fragment;
export const Profiler = R.Profiler;
export const PureComponent = R.PureComponent;
export const StrictMode = R.StrictMode;
export const Suspense = R.Suspense;
export const cloneElement = R.cloneElement;
export const createContext = R.createContext;
export const createElement = R.createElement;
export const createRef = R.createRef;
export const forwardRef = R.forwardRef;
export const isValidElement = R.isValidElement;
export const lazy = R.lazy;
export const memo = R.memo;
export const startTransition = R.startTransition;
export const useCallback = R.useCallback;
export const useContext = R.useContext;
export const useDebugValue = R.useDebugValue;
export const useDeferredValue = R.useDeferredValue;
export const useEffect = R.useEffect;
export const useId = R.useId;
export const useImperativeHandle = R.useImperativeHandle;
export const useInsertionEffect = R.useInsertionEffect;
export const useLayoutEffect = R.useLayoutEffect;
export const useMemo = R.useMemo;
export const useReducer = R.useReducer;
export const useRef = R.useRef;
export const useState = R.useState;
export const useSyncExternalStore = R.useSyncExternalStore;
export const useTransition = R.useTransition;
export const version = R.version;
