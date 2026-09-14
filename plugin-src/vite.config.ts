/**
 * SwissWPSuite AI - WordPress Security, Backup & SEO Plugin
 *
 * @package   SwissWPSuite_AI
 * @author    Swisswpsecure Team <info@swisswpsecure.com>
 * @license   GPL-2.0+
 * @link      https://swisswpsecure.com
 * @copyright 2026 Swisswpsecure Team
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { configDefaults } from "vitest/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_ROOT = path.resolve(__dirname, "src");

/**
 * Optional source overlay.
 *
 * `SWISSWPSUITE_OVERLAY` names a directory laid out with the same relative
 * structure as `src/`. When it is set, a file at `<overlay>/<rel>` takes
 * precedence over `src/<rel>` for every importer, and a relative import
 * written inside an overlay file resolves against `src/` when the overlay
 * has no file of its own at that path. When it is unset — which is the
 * default, and what `npm run build` and `npm run dev` do — the resolver is
 * not installed at all and `src/` is the only source root.
 *
 * The path is resolved against this directory. A relative value such as
 * `../some-overlay/src` is therefore interpreted from `plugin/`.
 */
const OVERLAY_DIR = (() => {
  const raw = (process.env.SWISSWPSUITE_OVERLAY || "").trim();
  if (!raw) return null;
  const abs = path.resolve(__dirname, raw);
  if (!fs.existsSync(abs)) {
    throw new Error(
      `SWISSWPSUITE_OVERLAY points at a directory that does not exist: ${abs}`
    );
  }
  return abs;
})();

/** Extensions tried when a specifier omits one, in resolution order. */
const RESOLVE_EXTS = [
  "",
  ".tsx",
  ".ts",
  ".jsx",
  ".js",
  "/index.tsx",
  "/index.ts",
];

function firstExisting(base: string): string | null {
  for (const ext of RESOLVE_EXTS) {
    const candidate = base + ext;
    if (candidate === base && !path.extname(base)) continue;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

/**
 * Two-way resolver for the overlay directory described above.
 *
 * 1. Any resolved path under `src/` is redirected to the overlay when the
 *    overlay holds a file at the same relative path.
 * 2. Any relative import written inside an overlay file that the overlay
 *    cannot satisfy is resolved against `src/` instead, so an overlay file
 *    can import the shared modules that stayed behind without rewriting a
 *    single import statement.
 */
function sourceOverlay(overlayDir: string): Plugin {
  return {
    name: "swisswpsuite-source-overlay",
    enforce: "pre",
    resolveId(source, importer) {
      if (source.startsWith("\0")) return null;

      // (2) relative import from inside the overlay → fall back to src/.
      if (
        importer &&
        importer.startsWith(overlayDir + path.sep) &&
        (source.startsWith("./") || source.startsWith("../"))
      ) {
        const wanted = path.resolve(path.dirname(importer), source);
        if (!firstExisting(wanted)) {
          const rel = path.relative(overlayDir, wanted);
          if (!rel.startsWith("..")) {
            const inSrc = firstExisting(path.join(SRC_ROOT, rel));
            if (inSrc) return inSrc;
          }
        }
        return null;
      }

      // (1) src/ path → overlay override.
      if (!source.startsWith(".") && !path.isAbsolute(source)) return null;
      const base = importer
        ? path.resolve(path.dirname(importer), source)
        : path.resolve(source);
      const rel = path.relative(SRC_ROOT, base);
      if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
      return firstExisting(path.join(overlayDir, rel));
    },
  };
}

/**
 * The bundled Immer runtime formats its minified production errors with a
 * link to a URL-shortener. A shortener hides its destination from anyone
 * reading the shipped file, so this rewrites that one exact literal to the
 * page it redirects to. The transform is deterministic, runs on every
 * build, and lives here in the published build configuration so the
 * published source reproduces the shipped bundle byte for byte.
 */
const IMMER_SHORTENED_URL = "https://bit.ly/3cXEKWf";
const IMMER_CANONICAL_URL =
  "https://github.com/immerjs/immer/blob/main/src/utils/errors.ts";

function expandShortenedLinks(): Plugin {
  return {
    name: "swisswpsuite-expand-shortened-links",
    renderChunk(code) {
      if (!code.includes(IMMER_SHORTENED_URL)) return null;
      return {
        code: code.split(IMMER_SHORTENED_URL).join(IMMER_CANONICAL_URL),
        map: null,
      };
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, ".", "");
  return {
    // Base path for assets. './' allows loading relative to the HTML file (good for file:// and subfolder deployments)
    base: "./",
    server: {
      port: 3000,
      host: "0.0.0.0",
      fs: {
        allow: OVERLAY_DIR ? [__dirname, OVERLAY_DIR] : [__dirname],
      },
    },
    plugins: [
      ...(OVERLAY_DIR ? [sourceOverlay(OVERLAY_DIR)] : []),
      react(),
      expandShortenedLinks(),
    ],
    resolve: {
      alias: {
        // WordPress.org Guideline 13 compliance (2026-08-12): "may not
        // include" libraries WP core already bundles. Core ships its own
        // React (registered under the `react`/`react-dom` script handles,
        // confirmed live against a WP 7.0.3 install — version 18.3.1) via
        // `wp-includes/js/dist/vendor/`. These four entries redirect every
        // `import ... from "react"` / `"react-dom"` / `"react-dom/client"` /
        // `"react/jsx-runtime"` (+ the dev-mode `"react/jsx-dev-runtime"`)
        // in this codebase to tiny local proxy modules
        // (`src/vendor-shims/*.ts`) that re-export from WordPress's
        // already-loaded `window.React`/`window.ReactDOM` globals instead
        // of a bundled copy — zero source changes needed anywhere else in
        // the app.
        //
        // Why `resolve.alias` to a local shim file, NOT
        // `build.rollupOptions.external`: this bundle ships as native ES
        // modules (`<script type="module">`, added by
        // class-swisswpsuite-admin.php's `add_type_attribute()` filter) so
        // that route-level code-splitting (`React.lazy()` + dynamic
        // `import()`) keeps working. Rollup's plain `external` option
        // leaves an unresolved bare `import ... from "react"` in the
        // OUTPUT `.js` file — for `format: 'es'` output that requires an
        // `<script type="importmap">` mapping "react" to a URL serving a
        // real ES module. WordPress's bundled react.js is the classic
        // global/UMD build (it sets `window.React`; it has no `export`
        // statements), so it cannot satisfy a bare-specifier ESM import at
        // all — an importmap pointing at it would 404/fail to parse as a
        // module. Switching the OUTPUT format to `iife`/`umd` (where
        // Rollup's `output.globals` DOES work for bare-specifier externals)
        // was also rejected: Rollup refuses code-split `iife`/`umd` builds,
        // and this bundle relies on route-level lazy-loading. Aliasing to a
        // local module sidesteps both problems — Vite's resolver fully
        // resolves the specifier at build time (no bare import survives
        // into the output at all, ESM-safe, code-splitting-safe), and the
        // proxy module reads the live global at RUNTIME so the "external"
        // effect (WP's copy, not ours, actually executes) is preserved.
        //
        // Order matters: Vite/Rollup alias `find` strings match either an
        // exact specifier OR a `find + "/"` PREFIX — so a generic "react"
        // entry would ALSO capture "react/jsx-runtime" and
        // "react/jsx-dev-runtime" (both literally start with "react/") if
        // it were listed first. The two subpath-specific entries below are
        // therefore listed BEFORE the bare "react" entry so they win the
        // match. ("react-dom" does NOT need the same ordering relative to
        // "react-dom/client" only because both are listed explicitly below
        // anyway — kept in the same specific-before-generic order for
        // consistency and to guard against a future re-order mistake.)
        //
        // See docs/architecture/FREEMIUM_DUAL_BUILD_ARCHITECTURE.md
        // "React externalization" section for the full audit + rationale.
        "react/jsx-dev-runtime": path.resolve(
          __dirname,
          "src/vendor-shims/react-jsx-runtime.ts"
        ),
        "react/jsx-runtime": path.resolve(
          __dirname,
          "src/vendor-shims/react-jsx-runtime.ts"
        ),
        "react-dom/client": path.resolve(
          __dirname,
          "src/vendor-shims/react-dom-client.ts"
        ),
        "react-dom": path.resolve(__dirname, "src/vendor-shims/react-dom.ts"),
        react: path.resolve(__dirname, "src/vendor-shims/react.ts"),
        "@": SRC_ROOT,
      },
    },
    // Vitest config (2026-08-15 fix). Previously there was no `test` block at
    // all, so a plain `npx vitest run` used vitest's own default environment
    // ('node') — 6 Vitest suites that touch `window` (jsdom-only DOM APIs, or
    // the React vendor-shim's `window.React` lookup) failed under that
    // default and only passed when a dev remembered to pass
    // `--environment jsdom` by hand. Setting it here makes `jsdom` the
    // default for every invocation (`npm test`, `npx vitest`, CI), matching
    // what the test files actually need — same fix shape as the React
    // vendor-shim aliases above (WordPress's admin runtime IS a browser DOM,
    // so jsdom is the correct default for this plugin's test surface, not an
    // arbitrary choice).
    //
    // `exclude` additionally excludes tests/e2e/** (Playwright specs) from
    // Vitest's own collection. `tests/e2e/plugin-activation.spec.ts` and
    // `tests/e2e/plugin.spec.ts` both import `test`/`expect` from
    // `@playwright/test`, which is a DIFFERENT test-runner API and throws at
    // collection time when the Playwright global test registry is touched
    // outside `playwright test` (see playwright.config.ts, which is the
    // correct/only runner for that directory: `testDir: './tests/e2e'`).
    // Vitest's default `include` glob (`**/*.{test,spec}.?(c|m)[jt]s?(x)`)
    // has no directory-based distinction between a Playwright `.spec.ts` and
    // a Vitest one, so without this exclude both frameworks try to collect
    // the same files. Spread `configDefaults.exclude` first (not a literal
    // override) so this doesn't silently drop vitest's own default excludes
    // (node_modules/, .git/) — verified via `node -e
    // "require('vitest/config').configDefaults.exclude"` before writing this
    // (vitest 4.1.10, this workstation): `["**/node_modules/**",
    // "**/.git/**"]`.
    test: {
      environment: "jsdom",
      exclude: [...configDefaults.exclude, "tests/e2e/**"],
      // Suites under `src/` and `tests/` describe THIS tree's behaviour and
      // run with no overlay configured. When an overlay IS configured the
      // run switches to the overlay's own suites, which describe what the
      // overlay contributes — running both sets against one resolution
      // would ask the same assertion about two different component trees.
      ...(OVERLAY_DIR
        ? {
            include: [
              path.join(OVERLAY_DIR, "..", "**/*.{test,spec}.?(c|m)[jt]s?(x)"),
            ],
          }
        : {}),
    },
    build: {
      // Emit the build manifest that PHP reads to resolve hashed asset
      // names. A string value is used as the file name relative to
      // `outDir`, so this writes `assets/manifest.json`; the boolean form
      // would write it into a dot-directory, and a WordPress plugin package
      // may not contain hidden files or directories.
      manifest: "manifest.json",
      outDir: "assets", // Output to the 'assets' folder in the root
      emptyOutDir: true, // Clean the folder before build
      // This build emits exactly one JS file and one CSS file, both named
      // in assets/manifest.json, so class-swisswpsuite-admin.php's single
      // wp_enqueue_script()/wp_enqueue_style() pair is the only script and
      // the only stylesheet this plugin ever loads — no runtime loader
      // exists alongside it. `modulePreload: false` disables Vite's
      // modulepreload polyfill/`<link rel="modulepreload">` injection,
      // which has no chunk to preload once `inlineDynamicImports` (below)
      // removes route-level code-splitting.
      //
      // `cssCodeSplit` is deliberately left at its Vite default (true), NOT
      // set to false: this codebase imports exactly one global stylesheet
      // (Tailwind, in `src/main.tsx`), so a single CSS asset is what Vite
      // emits either way — but `cssCodeSplit: false` changes the MANIFEST
      // SHAPE, moving the stylesheet out of `index.html.css[0]` into a
      // separate top-level `"style.css"` manifest entry (verified by
      // building both ways: with `false` the css array under `index.html`
      // disappears entirely). class-swisswpsuite-admin.php reads the
      // stylesheet at exactly `$manifest['index.html']['css'][0]`
      // (register_styles()) — breaking that shape would 404 every
      // admin-page stylesheet. Leaving `cssCodeSplit` at its default keeps
      // both the shape and the single-file outcome.
      modulePreload: false,
      rollupOptions: {
        input: {
          app: "index.html",
        },
        output: {
          entryFileNames: "entry-[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash][extname]",
          // `inlineDynamicImports: true` folds every dynamically-imported
          // route module into the single entry file at build time, so the
          // output carries no runtime chunk-dependency map and fetches no
          // separate JS file at all. This option is mutually exclusive with
          // Rollup's `manualChunks` (there is nothing left to place into a
          // separate chunk once everything is inlined into one file), and
          // `chunkFileNames` has no output to apply to for the same reason.
          inlineDynamicImports: true,
        },
      },
    },
  };
});
