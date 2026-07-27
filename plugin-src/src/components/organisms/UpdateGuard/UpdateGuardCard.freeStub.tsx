/**
 * Authored by: Frontend Specialist
 * Skills: react-patterns, typescript-expert
 * Date: 2026-07-27
 *
 * WP.org round-3 remediation, Sprint W2c (Free JS-bundle hygiene) —
 * FREE-EDITION-ONLY BUILD-TIME REPLACEMENT for
 * components/organisms/UpdateGuard/UpdateGuardCard.tsx (~33KB, plus its
 * transitive children SnapshotList (~29KB), UpdateReviewPanel, and
 * UpdateBlockedBanner — Update Guard virtual-patching UI, Pro-only. Grep
 * confirmed SnapshotList/UpdateReviewPanel/UpdateBlockedBanner have no OTHER
 * importer anywhere in src/ besides UpdateGuardCard.tsx itself, so aliasing
 * this one file removes all four from the Free module graph).
 *
 * `SecurityHub.tsx` already gates the real component's RENDER behind
 * `isProEditionBuild` (a Free visitor always sees the "Update Guard"
 * ProUpsellPlaceholder instead), but per the same Rollup static-analysis
 * reasoning documented in AIContentPage.freeStub.tsx, a runtime-only gate
 * does not stop Rollup from still emitting UpdateGuardCard's code (plus its
 * three child components) inside the shipped SecurityPage chunk — it's a
 * plain top-level
 * `import UpdateGuardCard from "./organisms/UpdateGuard/UpdateGuardCard"`
 * (static, not React.lazy).
 *
 * `plugin/vite.config.ts` aliases the exact specifier
 * "./organisms/UpdateGuard/UpdateGuardCard" (as written at SecurityHub.tsx's
 * one call site) to THIS file only when built with EDITION=free. Vite's
 * alias resolution happens at module-resolve time, before Rollup ever
 * parses the real UpdateGuardCard.tsx — so in a Free build the real file,
 * and everything it transitively imports (SnapshotList, UpdateReviewPanel,
 * UpdateBlockedBanner), never enters the module graph at all. Pro builds
 * never add the alias.
 *
 * This component is never actually mounted at runtime in Free
 * (SecurityHub's own `isProEditionBuild` ternary never reaches the branch
 * that renders it), so its content is inert — but it renders a real
 * (compact) upsell rather than `null`, matching this codebase's "graceful
 * degradation" convention (see SyncManager.freeStub.tsx) in case a future
 * refactor of SecurityHub.tsx ever reaches this branch directly. Copy/props
 * below mirror SecurityHub.tsx's own already-shipped Update Guard
 * placeholder verbatim (feature/description/bullets, "compact" variant, no
 * icon override — the real call site passes none, so this defaults to
 * `Lock` same as there — default "h3" heading, unchanged from that call
 * site, since Update Guard sits among sibling dashboard cards, not as sole
 * page content). Prop signature mirrors the real component's
 * `UpdateGuardCardProps` exactly (status/snapshots/reviews/isLoading/
 * hasSentinelPro/onSettingsChange) so SecurityHub.tsx needs no change for
 * either edition; every prop is accepted and intentionally unused — there
 * is no live status/snapshot/review data to show here, and no settings to
 * change. Real file has ONLY a default export (no named export) — mirrored
 * exactly below.
 */
import React from "react";
import { ProUpsellPlaceholder } from "../Upsell/ProUpsellPlaceholder";
import { hasEditionMismatch } from "../../../lib/edition";
import type {
  UpdateGuardStatus,
  UpdateGuardReview,
  UpdateSnapshot,
} from "../../../types";

export interface UpdateGuardCardProps {
  status: UpdateGuardStatus | null;
  snapshots: UpdateSnapshot[];
  reviews: UpdateGuardReview[];
  isLoading: boolean;
  hasSentinelPro: boolean;
  onSettingsChange: () => void;
}

const UpdateGuardCard: React.FC<UpdateGuardCardProps> = () => (
  <ProUpsellPlaceholder
    feature="Update Guard"
    variant="compact"
    description="Virtual patching for WordPress auto-updates — snapshots every update, scans staged packages before they apply, and can auto-rollback if something looks wrong."
    bullets={[
      "Pre-update snapshot + staged-package scan",
      "Review queue or automatic block-on-match",
      "One-click atomic rollback if an update misbehaves",
    ]}
    editionMismatch={hasEditionMismatch()}
  />
);

export default UpdateGuardCard;
