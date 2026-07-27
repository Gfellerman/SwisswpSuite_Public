/**
 * Authored by: Frontend Specialist
 * Skills: react-patterns, typescript-expert
 * Date: 2026-07-18
 *
 * Freemium Dual-Build (Phase 4, A4 fix) — FREE-EDITION-ONLY BUILD-TIME
 * REPLACEMENT for components/Sync/SyncManager.tsx (the ~42KB, 2100+ line
 * live Sync UI).
 *
 * `BackupsPage.tsx` (which DOES ship in Free — Local Backup lives there)
 * lazy-loads SyncManager via `React.lazy(() => import("../components/Sync/
 * SyncManager"))`, and only ever renders it behind an `isProEditionBuild`
 * check that is always false in Free — but per the same Rollup static-
 * analysis reasoning documented in AIContentPage.freeStub.tsx, that runtime
 * gate does not stop Rollup from still emitting the SyncManager chunk. This
 * component is also imported a second way, statically, by SyncPage.tsx —
 * but SyncPage.tsx itself is aliased away in Free (see
 * SyncPage.freeStub.tsx), so this alias only needs to intercept
 * BackupsPage.tsx's direct dynamic import in practice. Both call sites use
 * the identical relative specifier `"../components/Sync/SyncManager"`
 * (both importing files live in the same `src/pages/` directory), so one
 * alias entry in `plugin/vite.config.ts` covers both.
 *
 * This component is never actually mounted at runtime in Free (the
 * `isProEditionBuild` ternary in BackupsPage.tsx never reaches the branch
 * that renders it), so its content is inert — but it renders a real
 * (compact) upsell rather than `null`, matching this codebase's
 * "graceful degradation" convention (see
 * docs/architecture/FREEMIUM_DUAL_BUILD_ARCHITECTURE.md §3) in case a
 * future refactor of BackupsPage.tsx ever reaches this branch directly.
 */
import React from "react";
import { ProUpsellPlaceholder } from "../organisms/Upsell/ProUpsellPlaceholder";
import { hasEditionMismatch } from "../../lib/edition";
import { RefreshCw } from "lucide-react";

const SyncManager: React.FC = () => (
  <ProUpsellPlaceholder
    feature="Site Synchronisation"
    variant="compact"
    icon={RefreshCw}
    description="Keep a staging site and your live site in sync — push content changes both ways with a diff view before anything is applied."
    bullets={[
      "Two-way content sync between staging and live",
      "Diff-based push — review changes before they apply",
    ]}
    editionMismatch={hasEditionMismatch()}
  />
);

export default SyncManager;
