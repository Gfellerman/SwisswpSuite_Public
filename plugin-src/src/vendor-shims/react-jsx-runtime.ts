/**
 * WordPress.org Guideline 13 compliance shim — "react/jsx-runtime" and
 * "react/jsx-dev-runtime"
 *
 * tsconfig.json uses `"jsx": "react-jsx"` (the automatic runtime), so
 * @vitejs/plugin-react compiles every `.tsx` file's JSX into calls to
 * `jsx`/`jsxs` (production) or `jsxDEV` (Vite dev server) imported from
 * these two subpaths — NOT `React.createElement`, and NOT a per-file
 * `import React from "react"`.
 *
 * Unlike the classic API, React's own npm package has never shipped a
 * global/UMD build of the jsx-runtime entry points (they were designed for
 * bundler consumption only), and WordPress core does not register a
 * separate script handle for them — confirmed live 2026-08-12 (only
 * `react`, `react-dom`, and `wp-element` handles exist). Rather than switch
 * the whole codebase to the classic runtime (`React.createElement`, which
 * would require adding an explicit `import React from "react"` to every one
 * of the many `.tsx` files that currently rely on the automatic runtime's
 * implicit injection — a much larger, riskier diff), this module implements
 * the small, well-established jsx/jsxs/jsxDEV → createElement compatibility
 * shim on top of the externalized `react.ts` shim (which itself proxies to
 * WordPress's `window.React`). This is the same technique used by
 * `preact/compat`'s jsx-runtime and similar interop shims — `jsx`/`jsxs`
 * differ from `createElement` only in how children/key are packed into the
 * props object; the underlying element construction is identical.
 */

import ReactShim, { Fragment as FragmentShim } from "./react";

type JsxProps = Record<string, unknown> & { children?: unknown };

function jsx(type: unknown, props: JsxProps, key?: unknown) {
  const config: JsxProps = { ...props };
  if (key !== undefined) {
    (config as Record<string, unknown>).key = String(key);
  }
  // `createElement`'s signature is (type, props, ...children). When no
  // extra positional children are passed, it uses `props.children` as-is —
  // exactly what jsx/jsxs already packed into `config.children` above — so
  // a single call with no trailing arguments is correct for both the
  // single-child and multi-child (array) cases.
  return (
    ReactShim as unknown as {
      createElement: (t: unknown, p: unknown) => unknown;
    }
  ).createElement(type, config);
}

export const jsxs = jsx;
export { jsx };

export function jsxDEV(
  type: unknown,
  props: JsxProps,
  key?: unknown,
  _isStaticChildren?: boolean,
  _source?: unknown,
  _self?: unknown
) {
  return jsx(type, props, key);
}

export const Fragment = FragmentShim;
