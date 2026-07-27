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
            vendor: [
              "react",
              "react-dom",
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
