import React from "react";

/**
 * Free-edition stub for LicenseTierBadge.tsx (ARS Round D, D-K-3, WP.org
 * R4 F-01/F-41). Wired via vite.config.ts's resolve.alias, active only
 * when EDITION === 'free'. Renders nothing — "License Tier" is Pro-only
 * vocabulary that must be physically absent from the Free bundle, not
 * merely unreachable at runtime.
 */
export interface LicenseTierBadgeProps {
  tierName: string;
}

export const LicenseTierBadge: React.FC<LicenseTierBadgeProps> = (_props) =>
  null;
