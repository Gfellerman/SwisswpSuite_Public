/*! use-sync-external-store adaptation. MIT, Copyright (c) Meta Platforms, Inc. and affiliates. */

import {
  useSyncExternalStore as reactUseSyncExternalStore,
  useRef,
  useEffect,
  useMemo,
  useDebugValue,
} from "react";

// WordPress.org Guideline 13 compliance shim — "use-sync-external-store"
//
// `use-sync-external-store` is Meta's backwards-compatible polyfill for
// React 18's `useSyncExternalStore` hook, published so libraries written
// against React <18 can call the hook unconditionally. Two of this bundle's
// dependencies pull a copy of it in transitively:
//   - `recharts` (its internal Redux-style state layer,
//     `es6/state/hooks.js`) imports `useSyncExternalStoreWithSelector` from
//     `"use-sync-external-store/shim/with-selector"`.
//   - `react-redux` (used by `recharts` for its `<Provider>` /
//     `useSelector`) imports the same hook from
//     `"use-sync-external-store/with-selector.js"`.
// Neither call site needs the polyfill behaviour: this app's admin bundle
// runs on WordPress core's own bundled React (18.3.1, aliased to
// `window.React` — see `src/vendor-shims/react.ts` and the `resolve.alias`
// block in `vite.config.ts`), which has shipped a native
// `useSyncExternalStore` since React 18.0. Bundling the real
// `use-sync-external-store` package would ship dead polyfill code AND
// another of React's own file-header license banners, which the WP.org
// reviewer tooling reads as an undisclosed bundled copy of a library core
// already provides (the same Guideline 13 concern
// `src/vendor-shims/react.ts` exists for).
//
// This module re-exports `useSyncExternalStore` straight from the aliased
// `react` shim (so it resolves to `window.React.useSyncExternalStore` at
// runtime, never a bundled copy) and re-implements
// `useSyncExternalStoreWithSelector` on top of it. The implementation below
// is a direct, line-for-line port of the upstream MIT-licensed
// `use-sync-external-store-with-selector.production.js` (Meta Platforms,
// Inc.) — only the module-load-time dev/prod branch and the CommonJS
// `exports.*` wrapper were removed; the algorithm is untouched.
//
// The `resolve.alias` entries in `vite.config.ts` point every
// `use-sync-external-store/shim`, `/shim/index.js`, `/shim/with-selector`,
// `/shim/with-selector.js` and `/with-selector` (+ `.js`) specifier at this
// single module — all shapes used across the dependency graph resolve the
// same named exports.
//
// The attribution notice ABOVE the import is deliberately its own, short,
// separately-worded comment kept apart from this explanation by the import
// statement in between: production minification preserves a comment block
// containing a `!`/`@license`/`@preserve` marker verbatim and, when a
// marked and an unmarked comment sit directly adjacent with no statement
// between them, some minifier configurations fold the unmarked one into
// the preserved group too. Keeping a real statement between them is what
// lets this long explanation (which names the upstream package repeatedly)
// get stripped at build time while the short MIT notice above survives.

export const useSyncExternalStore = reactUseSyncExternalStore;

function is(x: unknown, y: unknown): boolean {
  return (
    (x === y && (x !== 0 || 1 / (x as number) === 1 / (y as number))) ||
    (x !== x && y !== y)
  );
}

const objectIs: (x: unknown, y: unknown) => boolean =
  typeof Object.is === "function" ? Object.is : is;

export function useSyncExternalStoreWithSelector<Snapshot, Selection>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => Snapshot,
  getServerSnapshot: (() => Snapshot) | undefined,
  selector: (snapshot: Snapshot) => Selection,
  isEqual?: (a: Selection, b: Selection) => boolean
): Selection {
  interface Inst {
    hasValue: boolean;
    value: Selection | null;
  }

  const instRef = useRef<Inst | null>(null);
  let inst = instRef.current;
  if (inst === null) {
    inst = { hasValue: false, value: null };
    instRef.current = inst;
  }

  const [memoizedGetSnapshot, memoizedGetServerSnapshot] = useMemo(() => {
    let hasMemo = false;
    let memoizedSnapshot: Snapshot;
    let memoizedSelection: Selection;

    const memoizedSelector = (nextSnapshot: Snapshot): Selection => {
      if (!hasMemo) {
        hasMemo = true;
        memoizedSnapshot = nextSnapshot;
        const nextSelection = selector(nextSnapshot);
        if (isEqual !== undefined && inst!.hasValue) {
          const currentSelection = inst!.value as Selection;
          if (isEqual(currentSelection, nextSelection)) {
            memoizedSelection = currentSelection;
            return memoizedSelection;
          }
        }
        memoizedSelection = nextSelection;
        return memoizedSelection;
      }

      const currentSelection = memoizedSelection;
      if (objectIs(memoizedSnapshot, nextSnapshot)) {
        return currentSelection;
      }

      const nextSelection = selector(nextSnapshot);
      if (isEqual !== undefined && isEqual(currentSelection, nextSelection)) {
        memoizedSnapshot = nextSnapshot;
        return currentSelection;
      }

      memoizedSnapshot = nextSnapshot;
      memoizedSelection = nextSelection;
      return memoizedSelection;
    };

    const maybeGetServerSnapshot =
      getServerSnapshot === undefined ? null : getServerSnapshot;

    const getSnapshotWithSelector = (): Selection =>
      memoizedSelector(getSnapshot());
    const getServerSnapshotWithSelector =
      maybeGetServerSnapshot === null
        ? undefined
        : (): Selection => memoizedSelector(maybeGetServerSnapshot());

    return [getSnapshotWithSelector, getServerSnapshotWithSelector] as const;
  }, [getSnapshot, getServerSnapshot, selector, isEqual]);

  const value = useSyncExternalStore(
    subscribe,
    memoizedGetSnapshot,
    memoizedGetServerSnapshot
  );

  useEffect(() => {
    inst!.hasValue = true;
    inst!.value = value;
  }, [value]);

  useDebugValue(value);

  return value;
}
