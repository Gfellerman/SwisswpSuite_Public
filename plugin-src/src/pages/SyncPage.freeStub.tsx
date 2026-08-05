/**
 * Authored by: Frontend Specialist
 * Skills: react-patterns, typescript-expert
 * Date: 2026-07-18 (upsell redesign 2026-08-04)
 *
 * Freemium Dual-Build (Phase 4, A4 fix) — FREE-EDITION-ONLY BUILD-TIME
 * REPLACEMENT for SyncPage.tsx.
 *
 * See AIContentPage.freeStub.tsx for the full mechanism writeup (same
 * pattern, applied here because SyncPage.tsx statically imports the
 * SyncManager.tsx module graph, which otherwise ships inside the Free
 * zip's SyncPage chunk despite the real file's own runtime `isProEdition()`
 * gate). `plugin/vite.config.ts` aliases the exact specifier
 * `'../pages/SyncPage'` (as written in router.tsx) to THIS file only when
 * built with `EDITION=free`. Pro builds never add the alias.
 *
 * Upsell redesign (2026-08-04, design point 1/2): content mirrors
 * SyncPage.tsx's own Free branch verbatim — one neutral "edition"
 * FeaturePointer, no bullets, no CTA pair.
 */
import React from "react";
import { FeaturePointer } from "../components/organisms/Upsell/FeaturePointer";
import { RefreshCw } from "lucide-react";

export const SyncPage: React.FC = () => (
  <div className="mx-auto max-w-2xl py-16 text-center">
    <RefreshCw
      size={40}
      className="mx-auto mb-4 text-neutral-400"
      aria-hidden="true"
    />
    {/* WCAG 1.3.1: sole top-level content directly under DashboardLayout's
        page <h1> (no intervening <h2>) — mirrors the real file's own
        comment. */}
    <h2 className="dark:text-foreground text-lg font-semibold text-neutral-900">
      Site Synchronisation
    </h2>
    <div className="mt-3">
      <FeaturePointer variant="edition" />
    </div>
  </div>
);

export default SyncPage;
