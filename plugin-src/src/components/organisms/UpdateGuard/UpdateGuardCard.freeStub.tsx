/**
 * Authored by: Frontend Specialist
 * Skills: react-patterns, typescript-expert
 * Date: 2026-07-27 (upsell redesign 2026-08-04)
 *
 * WP.org round-3 remediation, Sprint W2c (Free JS-bundle hygiene) —
 * FREE-EDITION-ONLY BUILD-TIME REPLACEMENT for
 * components/organisms/UpdateGuard/UpdateGuardCard.tsx (~33KB, plus its
 * transitive children SnapshotList, UpdateReviewPanel, UpdateBlockedBanner
 * — Update Guard virtual-patching UI, Pro-only).
 *
 * `plugin/vite.config.ts` aliases the exact specifier
 * "./organisms/UpdateGuard/UpdateGuardCard" (as written at SecurityHub.tsx's
 * one call site) to THIS file only when built with EDITION=free. See
 * AIContentPage.freeStub.tsx for the full Rollup static-import-elision
 * writeup (identical mechanism).
 *
 * Upsell redesign (2026-08-04, design point 1): SecurityHub.tsx's dashboard
 * sub-tab no longer swaps Update Guard for a per-card ProUpsellPlaceholder
 * in Free — the card is simply omitted, and the sub-tab carries one page-
 * level `FeaturePointer` instead (see SecurityHub.tsx's dashboard sub-tab
 * header). This component is not reached by any call site in Free any
 * more; kept only as defensive parity for the vite.config.ts alias entry.
 * Renders nothing rather than a placeholder card.
 */
import React from "react";
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

const UpdateGuardCard: React.FC<UpdateGuardCardProps> = () => null;

export default UpdateGuardCard;
