import React from "react";

/**
 * Free-edition stub for BetaFeatureGate.tsx (ARS Round D delta, M1,
 * 2026-08-24). Wired via `plugin/vite.config.ts`'s `resolve.alias`, active
 * only when `EDITION === 'free'`. Both exports render nothing — Sync and
 * Migration (the only features `BetaGate`/`BetaBanner` ever gate) are
 * fully Pro-only, physically absent from the Free zip, so a Free install
 * has nothing for either component to describe. The literal "Beta
 * Features" copy must be physically absent from the Free bundle too, not
 * merely unreachable at runtime — see BetaFeatureGate.tsx's own docblock.
 */
export interface BetaGateProps {
  feature: string;
}

export const BetaGate: React.FC<BetaGateProps> = (_props) => null;

export interface BetaBannerProps {
  feature: string;
}

export const BetaBanner: React.FC<BetaBannerProps> = (_props) => null;
