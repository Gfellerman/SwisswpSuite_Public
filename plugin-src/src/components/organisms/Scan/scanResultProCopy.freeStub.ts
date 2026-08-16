/**
 * Free-edition stub for scanResultProCopy.ts (WP.org string census closure,
 * 2026-08-13, R2a). Wired via vite.config.ts's resolve.alias, active only
 * when EDITION === 'free'.
 *
 * REVISED (owner directive, mid-task 2026-08-13): `canRemediate`/
 * `hasSentinelPro` are license capabilities, always false on an unlicensed
 * Free install, so these locked Quarantine/Delete/Analyze buttons and their
 * tooltip/toast/aria-label DO genuinely render for real Free users today.
 * KEEP-BUT-RENAME, not vanish: neutral "Not available in this edition"
 * wording (the owner's own example phrase) instead of an empty string, so
 * the tooltip/toast/accessible-name still communicate the locked state —
 * just without naming Pro, upgrading, or a specific plan.
 */
export const REMEDIATION_LOCKED_TOOLTIP = "Not available in this edition";
export const REMEDIATION_LOCKED_TOAST =
  "This action isn't available in this edition.";
export const AI_ANALYSIS_LOCKED_LABEL = "Not available in this edition";
