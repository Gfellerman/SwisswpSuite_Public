import React from "react";

/**
 * LicenseTierBadge — the "License Tier" / tier-name pair shown in the
 * DashboardLayout header on every screen.
 *
 * Extracted from DashboardLayout.tsx (ARS Round D, D-K-3, WP.org R4
 * F-01/F-41, 2026-08-2x) so it can be aliased away in the Free build
 * (plugin/vite.config.ts, specifier "./LicenseTierBadge") instead of only
 * runtime-gating it. DashboardLayout.tsx itself is the always-present app
 * shell (never aliasable — it ships in every edition), so a plain
 * `{isProEditionBuild && <div>License Tier</div>}` conditional still
 * compiles the literal "License Tier" string into the Free bundle even
 * though it never renders there; per this project's string-presence
 * doctrine that is not sufficient.
 *
 * This is a deliberate reversal of the 2026-08-13 controller ruling that
 * left this block unchanged (C2 Group H, "explicitly flagged in the
 * baseline's own docstring as AMBIGUOUS... controller explicitly ruled to
 * leave unchanged") — the reviewer re-flagged the same surface in R4, and
 * current Round D doctrine ("Free bundle must contain zero padlocked/dead
 * controls") supersedes that prior "leave unchanged" call. Pro is
 * unaffected — this component still renders there exactly as before.
 */
export interface LicenseTierBadgeProps {
  tierName: string;
}

export const LicenseTierBadge: React.FC<LicenseTierBadgeProps> = ({
  tierName,
}) => (
  <div className="hidden flex-col items-end lg:flex!">
    <span className="text-xs font-bold tracking-wider text-neutral-700 uppercase">
      License Tier
    </span>
    <span className="dark:text-foreground text-xs font-black tracking-wide text-neutral-900 uppercase">
      {tierName}
    </span>
  </div>
);
