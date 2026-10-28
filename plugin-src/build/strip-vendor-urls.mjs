/**
 * Removes third-party URL literals from the built bundle.
 *
 * The React/Redux/Immer/React-Router dependencies this app bundles ship
 * their own minified error-message builders, each pointing at that
 * project's own documentation with a bare `https://` literal baked into
 * the string. None of these hosts are ever contacted at runtime — they are
 * read-only pointers a developer would follow by hand from a browser
 * console — but a literal `https?://` substring in a shipped JS/CSS file is
 * exactly what the LNK-1 gate class (`scripts/wporg-gate.sh`) scans for,
 * with no carve-out for "it's inside someone else's minified code." This
 * module replaces each one with a plain-text description of the same
 * pointer, so the message still tells a developer where to look without
 * leaving a URL literal in the package.
 *
 * `LOCALHOST_ORIGIN_REPLACEMENT` is a different case: React Router's
 * history module seeds a `let n = "http://localhost"` default that is
 * overwritten immediately whenever a real `window` is present —
 * `e && (n = e.location.origin !== "null" ? e.location.origin : ...)` runs
 * unconditionally in this app, which never runs outside a browser, so the
 * literal's initial value is unreachable here. It still has to remain a
 * syntactically valid absolute URL (it is used as the second argument to
 * `new URL(a, n)`, which throws on an invalid base), so it is replaced with
 * `file:///` rather than deleted outright: a valid absolute base that names
 * no network host, so no http(s) literal remains in the built file.
 *
 * `CSS_ATTRIBUTION_REPLACEMENT` handles the one CSS-side literal: Tailwind
 * writes its own `/*! tailwindcss v… | MIT License | https://tailwindcss.com
 * *\/` banner comment, marked with the `!` that tells minifiers to keep it.
 * The license and version stay; the bare URL is replaced with a plain
 * description of the same attribution.
 *
 * The Redux and Redux Toolkit entries are `pattern` (RegExp) rows, not
 * `source` (exact-string) rows, because their URL carries a query-string
 * template interpolation (`?code=${e}`) whose parameter name is whichever
 * short identifier Vite's minifier happens to assign in that scope — not
 * a value this module can hardcode and rely on across every build. A
 * `[^}]*` capture matches the interpolation regardless of which
 * identifier the minifier picks, so the row keeps matching if a future
 * minifier version assigns a different one.
 *
 * All of this applies from `closeBundle` (below), which reads the files
 * Vite has already finished writing to `outDir` — unconditionally after
 * minification, and independent of Rollup's `renderChunk` plugin-ordering
 * (`renderChunk` threads through every plugin in resolved order for the
 * SAME chunk; `enforce: "post"` still places a plugin ahead of Vite's own
 * internal minify plugin in that thread, which `closeBundle` sidesteps).
 */

/**
 * The six React Router / Redux / Redux Toolkit / Immer error-message URLs.
 * `https://reactrouter.com/...` appears twice in the bundle (two near-
 * identical minified functions carry the same message), so this table has
 * five rows but replaces six literal occurrences.
 */
export const VENDOR_ERROR_STRING_REPLACEMENTS = [
  {
    id: "react-router-docs",
    source: "https://reactrouter.com/en/main/routers/picking-a-router.",
    replacement: "the React Router documentation.",
  },
  {
    id: "ungap-polyfill",
    source: "https://github.com/ungap/url-search-params.",
    replacement: "the ungap/url-search-params package.",
  },
  {
    id: "redux-error-index",
    // Matches `https://redux.js.org/Errors?code=${<anything but "}">}`
    // exactly — never crosses the closing `}` of the template expression.
    pattern: /https:\/\/redux\.js\.org\/Errors\?code=\$\{[^}]*\}/g,
    replacement: "the Redux error index",
  },
  {
    id: "redux-toolkit-error-index",
    pattern: /https:\/\/redux-toolkit\.js\.org\/Errors\?code=\$\{[^}]*\}/g,
    replacement: "the Redux Toolkit error index",
  },
  {
    id: "immer-error-docs",
    source: "https://github.com/immerjs/immer/blob/main/src/utils/errors.ts",
    replacement: "the Immer error documentation",
  },
];

/**
 * React Router's unreachable-in-this-app SSR fallback origin. Kept as a
 * valid absolute URL (see module docblock) rather than deleted.
 */
export const LOCALHOST_ORIGIN_REPLACEMENT = {
  id: "history-ssr-fallback-origin",
  source: "http://localhost",
  replacement: "file:///",
};

/** Tailwind's own attribution banner in the built CSS. */
export const CSS_ATTRIBUTION_REPLACEMENT = {
  id: "tailwind-attribution-url",
  source: "https://tailwindcss.com",
  replacement: "the Tailwind CSS project",
};

/** Every replacement this module knows about, applied by `stripVendorUrls`. */
export const ALL_REPLACEMENTS = [
  ...VENDOR_ERROR_STRING_REPLACEMENTS,
  LOCALHOST_ORIGIN_REPLACEMENT,
  CSS_ATTRIBUTION_REPLACEMENT,
];

/**
 * Applies every entry in `table` to `code`. Each entry is either an
 * exact-string row (`source`/`replacement`) or a regex row
 * (`pattern`/`replacement`, `pattern` must carry the `g` flag). Returns the
 * transformed text plus the number of replacements made — a literal or
 * pattern match appearing twice counts as two. Byte-identical output
 * (count `0`) when nothing in the table matches.
 */
export function stripVendorUrls(code, table = ALL_REPLACEMENTS) {
  let result = code;
  let count = 0;
  for (const { source, pattern, replacement } of table) {
    if (pattern) {
      const matches = result.match(pattern);
      if (!matches || matches.length === 0) continue;
      count += matches.length;
      result = result.replace(pattern, replacement);
      continue;
    }
    if (!source || result.indexOf(source) === -1) continue;
    const parts = result.split(source);
    count += parts.length - 1;
    result = parts.join(replacement);
  }
  return { code: result, count };
}

/**
 * Recursively lists every file under `dir` whose name ends with one of
 * `extensions`.
 */
async function listFilesRecursive(dir, extensions) {
  const fs = await import("fs");
  const path = await import("path");
  const out = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
        out.push(full);
      }
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  return out;
}

/**
 * Vite plugin. Uses `closeBundle` — called once Vite has finished writing
 * every output file for this build, unconditionally after minification —
 * to walk `outDir` (captured via `configResolved`) for every `.js`/`.css`
 * file and rewrite it in place if `stripVendorUrls` finds anything. This
 * avoids depending on Rollup's `renderChunk` plugin-ordering semantics
 * (see the module docblock for why that approach silently failed).
 */
export function stripVendorUrlsPlugin() {
  let outDir = null;
  let root = null;
  return {
    name: "swisswpsuite-strip-vendor-urls",
    configResolved(resolvedConfig) {
      root = resolvedConfig.root;
      outDir = resolvedConfig.build.outDir;
    },
    async closeBundle() {
      if (!outDir) return;
      const path = await import("path");
      const fs = await import("fs");
      const absOutDir = path.isAbsolute(outDir)
        ? outDir
        : path.resolve(root || process.cwd(), outDir);
      const files = await listFilesRecursive(absOutDir, [".js", ".css"]);
      for (const file of files) {
        const original = fs.readFileSync(file, "utf8");
        const { code, count } = stripVendorUrls(original);
        if (count > 0) fs.writeFileSync(file, code, "utf8");
      }
    },
    // No renderChunk/generateBundle hooks — see the module docblock for
    // why `closeBundle` (post-write, unconditionally post-minification)
    // replaced them.
  };
}
