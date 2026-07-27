/**
 * Authored by: Frontend Specialist
 * Skills: react-patterns, typescript-expert
 * Date: 2026-07-18
 *
 * Freemium Dual-Build (Phase 4, A4 fix) — FREE-EDITION-ONLY BUILD-TIME
 * REPLACEMENT for SyncPage.tsx.
 *
 * See AIContentPage.freeStub.tsx for the full mechanism writeup (same
 * pattern, applied here because SyncPage.tsx statically imports the ~42KB
 * SyncManager.tsx, which otherwise ships inside the Free zip's SyncPage
 * chunk despite the real file's own runtime `isProEdition()` gate).
 * `plugin/vite.config.ts` aliases the exact specifier `'../pages/SyncPage'`
 * (as written in router.tsx) to THIS file only when built with
 * `EDITION=free`. Pro builds never add the alias.
 *
 * Content mirrors SyncPage.tsx's own Free branch verbatim.
 */
import React from "react";
import { ProUpsellPlaceholder } from "../components/organisms/Upsell/ProUpsellPlaceholder";
import { hasEditionMismatch } from "../lib/edition";
import { RefreshCw } from "lucide-react";

export const SyncPage: React.FC = () => (
  <ProUpsellPlaceholder
    feature="Site Synchronisation"
    icon={RefreshCw}
    // WCAG 1.3.1: sole top-level content directly under DashboardLayout's
    // page <h1> (no intervening <h2>) — mirrors the real file's own comment.
    headingLevel="h2"
    description="Keep a staging site and your live site in sync — push content changes both ways with a diff view before anything is applied."
    bullets={[
      "Two-way content sync between staging and live",
      "Diff-based push — review changes before they apply",
      "Scheduled sync + full connection/activity logs",
    ]}
    editionMismatch={hasEditionMismatch()}
  />
);

export default SyncPage;
