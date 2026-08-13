/**
 * SwissWPSuite AI - The Ultimate All-in-One WordPress Plugin
 *
 * @package   SwissWPSuite_AI
 * @author    Swisswpsecure Team <info@swisswpsecure.com>
 * @license   GPL-2.0+
 * @link      https://www.swisswpsecure.com
 * @copyright 2026 Swisswpsecure Team
 */

import path from "path";
import { fileURLToPath } from "url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Freemium Dual-Build (Phase 4, A4 fix, 2026-07-18): which edition this
// build is producing. Set by build_plugin.sh via `EDITION="$EDITION" npm
// run build` — a plain shell env var, not a `.env` file value, so it is
// read directly from `process.env` rather than via `loadEnv()` (which only
// loads `.env` files). Defaults to 'pro' so `npm run dev` / a bare
// `npm run build` with no EDITION set behaves exactly as before this change
// (full/Pro build) — zero risk to the existing dev workflow.
const EDITION = process.env.EDITION === "free" ? "free" : "pro";

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, ".", "");
  return {
    // Base path for assets. './' allows loading relative to the HTML file (good for file:// and subfolder deployments)
    base: "./",
    server: {
      port: 3000,
      host: "0.0.0.0",
    },
    plugins: [react()],
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
        // Applies to BOTH editions (Free and Pro) — this is a WP.org
        // compliance fix for the shared source tree, not an edition-gated
        // feature. See docs/architecture/FREEMIUM_DUAL_BUILD_ARCHITECTURE.md
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
        "@": path.resolve(__dirname, "src"),
        // Freemium Dual-Build (A4 fix): Free-edition-only redirects for the
        // 3 fully-Pro-only route/component modules (AI Content, Sync page,
        // SyncManager). These modules already gate their OWN render on
        // `isProEdition()` and show a ProUpsellPlaceholder in Free — but
        // that is a runtime check, and each one is reached via
        // `React.lazy(() => import(...))` in router.tsx / BackupsPage.tsx,
        // which creates a dynamic-import chunk boundary that Rollup
        // discovers by static AST analysis of the `import()` call site —
        // NOT by evaluating whether the code behind it is reachable at
        // runtime. A runtime-only gate therefore still leaves the real
        // (heavy — ContentEnhancer / SyncManager, ~18-42KB each) chunk
        // physically present in the Free zip.
        //
        // Vite's alias resolution runs at module-resolve time, BEFORE
        // Rollup ever parses the real target file — so redirecting the
        // exact import specifier (as literally written at each call site)
        // to a tiny Free-only stub means the real file, and everything it
        // transitively imports, never enters the Free build's module graph
        // at all. Pro builds (EDITION !== 'free') never add these entries,
        // so the real files are completely unaffected there.
        //
        // Each key is the EXACT string written at its one known call site
        // (verified via grep — 2026-07-18): '../pages/AIContentPage' and
        // '../pages/SyncPage' in src/lib/router.tsx; '../components/Sync/
        // SyncManager' in src/pages/BackupsPage.tsx (SyncPage.tsx uses the
        // identical relative string for its own now-aliased-away import of
        // SyncManager, so this one entry covers both). Vite alias matching
        // is exact-string / prefix-segment based on the raw specifier, not
        // the resolved path — if a future file imports one of these targets
        // using a DIFFERENT relative path, it will bypass this alias and
        // re-introduce the leak; re-grep the target's basename across
        // src/ after adding a new call site.
        //
        // WP.org round-3 remediation (Sprint W2, D6 + A9/V6, 2026-07-26):
        // two more entries, same mechanism. '../components/organisms/
        // Settings/LicenseManager' is the exact specifier written at its
        // one call site (src/pages/SettingsPage.tsx) — the License system
        // has nothing left to unlock in Free (Guideline 6) once every
        // locally-implemented feature is de-gated, so Free gets a static
        // no-network stub instead of the real ~1,900-line component.
        // '../hooks/useTokenBalance' is the identical specifier used at
        // all three real importers (SecurityHub.tsx, ContentEnhancer.tsx,
        // SeoManager.tsx — verified by grep 2026-07-26), so one entry
        // covers all three; its real MIN_COST quota map must not ship in
        // the Free bundle at all, even as unreachable dead code.
        //
        // WP.org round-3 remediation (Sprint W2c, 2026-07-27): four more
        // entries, same mechanism. These four cover the remaining leaks a
        // controller audit of the built Free zip found — a Pro-only
        // component whose RENDER was already gated by `isProEditionBuild`/
        // `isProEdition()` at its call site, but reached via a plain static
        // `import` (not React.lazy), so Rollup still compiled it into the
        // Free chunk regardless. '../components/Migration/MigrationStation'
        // and '../components/organisms/Backups/CloudStoragePanel' are both
        // imported once, in src/pages/BackupsPage.tsx.
        // '../components/organisms/Settings/TwoFactorSettings' is imported
        // once, in src/pages/SettingsPage.tsx. './organisms/UpdateGuard/
        // UpdateGuardCard' is imported once, in src/components/
        // SecurityHub.tsx — this one alias also removes UpdateGuardCard's
        // three transitive children (SnapshotList, UpdateReviewPanel,
        // UpdateBlockedBanner), since grep confirmed they have no other
        // importer in src/. Each stub still renders a real (compact)
        // ProUpsellPlaceholder rather than null, per this codebase's
        // established graceful-degradation convention, even though none of
        // the four are actually reachable at runtime in Free today.
        //
        // WP.org compliance sprint F3 (register row #23, owner decision
        // (b), 2026-08-01): one more entry, same mechanism.
        // '../components/organisms/Settings/ApiConfig' is imported once, in
        // src/pages/SettingsPage.tsx. Its RENDER is already gated by
        // `isProEdition()` at that call site, but `SettingsPage.tsx` reaches
        // it via a plain static import (not React.lazy), so Rollup still
        // compiled the real ApiConfig.tsx — and the literal
        // "/settings/test-connection" string it POSTs to — into the shipped
        // Free SettingsPage chunk. `public/readme.txt` states the Free
        // plugin "does no AI processing, and makes no AI calls"; the Free
        // zip must contain no code that can POST to a BYO AI endpoint, so
        // the real BYO-AI panel is removed from the Free build graph
        // entirely rather than merely left unreachable at runtime.
        //
        // WP.org frontend physical-exclusion sweep (2026-08-12, owner-caught
        // 3rd-rejection response): two more entries, same mechanism — found
        // by an exhaustive re-audit of every `isProEdition()`/
        // `isProEditionBuild` call site in src/ after the owner personally
        // caught the TwoFactorSettings leak in a submitted zip (that
        // specific leak turned out to already be fixed by the F3 entry
        // above at the time of the re-audit — this pass found two more that
        // were NOT yet covered).
        // '../components/organisms/Settings/EncryptionSettings' is imported
        // once, in src/pages/SettingsPage.tsx (the backup-archive
        // encryption password field, gated `isProEdition() &&` right next
        // to the TwoFactorSettings gate — TD-60: Free's restorer hard-
        // rejects .zip.enc files, so Free must never even offer to set one).
        // './organisms/Security/GeoLockdownCard' is imported once, in
        // src/components/SecurityHub.tsx — NEWLY extracted from inline JSX
        // in that file specifically so it CAN be aliased (geo-blocking was
        // previously hand-written directly inside the SecurityHub.tsx
        // monolith with no separate module boundary to alias against; see
        // docs/architecture/FREEMIUM_DUAL_BUILD_ARCHITECTURE.md's
        // 2026-08-12 amendment for the extraction rationale and the
        // component_extraction PRE-mode safety check performed first). The
        // extraction was presentational-only — zero state/effects moved,
        // only the JSX + prop-threading — SecurityHub.tsx's own geo state
        // (geoEnabled, geoSettings, etc.) and its `geoEnabled`-driven
        // "Geo-Lock Active" tab badge (used elsewhere in the same file) are
        // completely unaffected.
        // A THIRD entry from the same 2026-08-12 sweep: '../lib/
        // logAdvisorGuideContent' is imported once, in src/components/
        // SecurityHub.tsx. This is the actual root cause the owner's grep
        // hit — a hardcoded manual-2FA-setup-guide text object PLUS the
        // "Enable Geo-Lock" action-button label (the exact "Scan the QR
        // code"/"backup recovery codes"/"Enable Geo-Lock" strings),
        // completely INDEPENDENT of the real TwoFactorSettings.tsx /
        // GeoLockdownCard.tsx components (already correctly aliased
        // above). Both live in SecurityHub.tsx's Log Advisor action-button
        // dispatcher (getLogActionButton, P4/P5 branches), reached only via
        // the "Analyze Logs with AI" button, itself gated
        // `isProEditionBuild && hasSecurity` and therefore unreachable in
        // Free at runtime — but SecurityHub.tsx is the always-present main
        // Security page in both editions, so the plain inline string/object
        // literals were still compiled into the Free bundle regardless.
        // (The dispatcher's other branches — WAF, login, spam, SQLi, XSS,
        // debug/perms/hardening fixes, update links — are generic labels
        // for otherwise-free features and were deliberately left inline.)
        //
        // Coordinator follow-up (2026-08-12, same sweep): SeoManager.tsx
        // (2,877 lines) had the SAME violation shape at much larger scale —
        // 13 isProEditionBuild-gated AI-SEO-generation call sites woven
        // throughout a file that also carries the genuinely-free SEO
        // Health Check / Sitemap / llms.txt features (so the whole file
        // cannot be aliased away). Fixed via a full extraction — see
        // docs/architecture/FREEMIUM_DUAL_BUILD_ARCHITECTURE.md's
        // 2026-08-12 "SeoAiWorkbench extraction" addendum for the complete
        // state/effects/handler boundary analysis. Two new entries:
        // './organisms/Seo/SeoAiWorkbench' (imported once, in
        // src/components/SeoManager.tsx) — the entire AI bulk-generate
        // workbench (bulk buttons, items table, batch/queue banners,
        // preview modal, client-batch modal), fully self-contained, zero
        // props from SeoManager.tsx. './organisms/Seo/
        // SeoCategoryQuickFixButton' (imported once, in the SAME file) —
        // the one Pro-only control that lives INSIDE the always-free SEO
        // Health Check modal (a per-category AI quick-fix button),
        // deliberately extracted as its own small independently-aliased
        // component rather than sharing SeoAiWorkbench's internal state,
        // specifically so SeoManager.tsx never needs to import anything
        // from the (Free-excluded) workbench module.
        ...(EDITION === "free"
          ? {
              "../pages/AIContentPage": path.resolve(
                __dirname,
                "src/pages/AIContentPage.freeStub.tsx"
              ),
              "../pages/SyncPage": path.resolve(
                __dirname,
                "src/pages/SyncPage.freeStub.tsx"
              ),
              "../components/Sync/SyncManager": path.resolve(
                __dirname,
                "src/components/Sync/SyncManager.freeStub.tsx"
              ),
              "../components/organisms/Settings/LicenseManager": path.resolve(
                __dirname,
                "src/components/organisms/Settings/LicenseManager.freeStub.tsx"
              ),
              "../hooks/useTokenBalance": path.resolve(
                __dirname,
                "src/hooks/useTokenBalance.freeStub.ts"
              ),
              "../components/Migration/MigrationStation": path.resolve(
                __dirname,
                "src/components/Migration/MigrationStation.freeStub.tsx"
              ),
              "../components/organisms/Backups/CloudStoragePanel": path.resolve(
                __dirname,
                "src/components/organisms/Backups/CloudStoragePanel.freeStub.tsx"
              ),
              "../components/organisms/Settings/TwoFactorSettings":
                path.resolve(
                  __dirname,
                  "src/components/organisms/Settings/TwoFactorSettings.freeStub.tsx"
                ),
              "./organisms/UpdateGuard/UpdateGuardCard": path.resolve(
                __dirname,
                "src/components/organisms/UpdateGuard/UpdateGuardCard.freeStub.tsx"
              ),
              "../components/organisms/Settings/ApiConfig": path.resolve(
                __dirname,
                "src/components/organisms/Settings/ApiConfig.freeStub.tsx"
              ),
              "../components/organisms/Settings/EncryptionSettings":
                path.resolve(
                  __dirname,
                  "src/components/organisms/Settings/EncryptionSettings.freeStub.tsx"
                ),
              "./organisms/Security/GeoLockdownCard": path.resolve(
                __dirname,
                "src/components/organisms/Security/GeoLockdownCard.freeStub.tsx"
              ),
              "./organisms/Security/TwoFactorNudgeLink": path.resolve(
                __dirname,
                "src/components/organisms/Security/TwoFactorNudgeLink.freeStub.tsx"
              ),
              "../lib/logAdvisorGuideContent": path.resolve(
                __dirname,
                "src/lib/logAdvisorGuideContent.freeStub.ts"
              ),
              "./organisms/Seo/SeoAiWorkbench": path.resolve(
                __dirname,
                "src/components/organisms/Seo/SeoAiWorkbench.freeStub.tsx"
              ),
              "./organisms/Seo/SeoCategoryQuickFixButton": path.resolve(
                __dirname,
                "src/components/organisms/Seo/SeoCategoryQuickFixButton.freeStub.tsx"
              ),
            }
          : {}),
      },
    },
    build: {
      manifest: true, // Generate manifest.json for PHP to read
      outDir: "assets", // Output to the 'assets' folder in the root
      emptyOutDir: true, // Clean the folder before build
      rollupOptions: {
        input: {
          app: "index.html",
        },
        output: {
          entryFileNames: "entry-[name]-[hash].js",
          chunkFileNames: "chunks/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash][extname]",
          manualChunks: {
            // "react"/"react-dom" removed 2026-08-12: the resolve.alias
            // block above redirects both specifiers to local
            // src/vendor-shims/*.ts proxy modules before Rollup ever sees
            // an npm-package import, so these two chunk-matcher strings
            // (which match by node_modules package path) would never match
            // anything again — the tiny shim files simply live wherever
            // their importers pull them in.
            vendor: [
              "react-router-dom",
              "@tanstack/react-query",
              "zustand",
              "recharts",
              "lucide-react",
              "@radix-ui/react-slot",
              "class-variance-authority",
              "clsx",
              "tailwind-merge",
              "sonner",
            ],
          },
        },
      },
    },
  };
});
