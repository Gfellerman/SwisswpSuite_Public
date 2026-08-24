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

/**
 * WP.org R4 census addition (2026-08-22). See the real module's docblock —
 * this branch is unreachable for a genuine Free user (the button that would
 * open this modal is natively `disabled`), but the string must still not
 * name AI tokens or "the free plugin" per this project's string-presence
 * doctrine. Neutral wording, no CTA.
 */
export const BULK_AI_FREE_EDITION_NOTICE =
  "AI-powered analysis isn't available in this edition.";

/**
 * ARS Round D (D-K-1/D-K-9, WP.org R4 F-01, 2026-08-2x): `startAiBatch()`'s
 * toast copy — see the real module's docblock. This call path is dead in
 * Free (every control that could reach it is itself aliased away), so the
 * exact wording returned here is never actually shown to a user; it exists
 * only so the literal "with AI"/"AI analysis" strings the real module
 * carries do not compile into the Free bundle.
 */
export function buildAiBatchStartToast(_count: number): string {
  return "Working…";
}

export function buildAiBatchFailureToast(_failed: number): string {
  return "The action failed.";
}

export function buildAiBatchPartialToast(
  _succeeded: number,
  _total: number,
  _failed: number
): string {
  return "The action partially completed.";
}

export function buildAiBatchCompleteToast(_total: number): string {
  return "Done.";
}

export function buildAiBatchMixedSelectionToast(
  _analyzableCount: number,
  _skippedCount: number
): string {
  return "Some selected findings were skipped — see the inline notes.";
}
