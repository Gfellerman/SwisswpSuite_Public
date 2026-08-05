/**
 * Authored by: Frontend Specialist
 * Skills: react-patterns, typescript-expert
 * Date: 2026-07-27 (upsell redesign 2026-08-04)
 *
 * WP.org round-3 remediation, Sprint W2c (Free JS-bundle hygiene) —
 * FREE-EDITION-ONLY BUILD-TIME REPLACEMENT for
 * components/Migration/MigrationStation.tsx (the ~169KB Site Migration UI).
 *
 * `plugin/vite.config.ts` aliases the exact specifier
 * "../components/Migration/MigrationStation" (as written at BackupsPage.tsx's
 * one call site) to THIS file only when built with EDITION=free. See
 * AIContentPage.freeStub.tsx for the full Rollup static-import-elision
 * writeup (identical mechanism).
 *
 * Upsell redesign (2026-08-04, design point 1): BackupsPage.tsx's Migration
 * sub-tab no longer swaps this component for a per-section
 * ProUpsellPlaceholder in Free — the sub-tab renders one page-level
 * `FeaturePointer` directly (see BackupsPage.tsx's migration-section
 * branch). This stub is not reached by any call site in Free any more;
 * kept only as defensive parity for the vite.config.ts alias entry.
 */
import React from "react";

interface MigrationStationProps {
  onCancel: () => void;
}

export const MigrationStation: React.FC<MigrationStationProps> = () => null;

export default MigrationStation;
