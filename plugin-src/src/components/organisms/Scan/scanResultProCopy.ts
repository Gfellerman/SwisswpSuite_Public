/**
 * scanResultProCopy — Pro-only locked-action copy for ScanResultPanel.tsx
 *
 * WP.org compliance (2026-08-13, v2.9.33.18 census closure, R2a): these
 * strings describe/gate the paid-plan remediation actions (Quarantine,
 * Delete, per-file "Analyze with AI") shown as locked buttons when
 * `canRemediate`/`hasSentinelPro` is false. That state IS reachable by
 * genuine Free users (canRemediate/hasSentinelPro are license-capability
 * checks, always false on an unlicensed Free install) — but per this
 * project's doctrine (docs/audit/FREE_BUNDLE_STRING_CENSUS_2026-08-13.md)
 * string PRESENCE in the Free bundle is the mechanism, not runtime
 * reachability. Extracted so vite.config.ts can alias this module away in
 * the Free build; the freeStub sibling supplies neutral/empty values so the
 * locked buttons keep rendering disabled with a Lock icon (no functional
 * regression — R6) but with no Pro-naming copy attached.
 */
export const REMEDIATION_LOCKED_TOOLTIP = "Requires a paid plan";
export const REMEDIATION_LOCKED_TOAST =
  "This action isn't available on your plan.";
export const AI_ANALYSIS_LOCKED_LABEL = "AI Analysis requires Pro license";

/**
 * WP.org R4 census addition (2026-08-22): BulkAiConfirmModal's Free-edition
 * body text. This modal only opens via a native `disabled`-gated button
 * (hasSentinelPro required), so the isFreeEdition() branch that consumes
 * this string is unreachable for a genuine Free user — but per this
 * project's string-presence doctrine that does not exempt the literal from
 * physical exclusion. Real/Pro-build text kept verbatim (harmless there —
 * Pro's isFreeEdition() is always false too, so this branch never renders
 * in Pro either; it exists only to give the Free build something to alias
 * away).
 */
export const BULK_AI_FREE_EDITION_NOTICE =
  "AI-powered analysis isn’t included in the free plugin — it fires zero AI tokens in this build.";

/**
 * ARS Round D (D-K-1/D-K-9, WP.org R4 F-01, 2026-08-2x): the bulk-AI-batch
 * progress/result toast copy from ScanResultPanel.tsx's (two, duplicated)
 * `startAiBatch()` helpers. These toasts can only ever fire via the
 * AI-bulk-analyze controls (AiAnalyzeFileButton / BulkAiAnalyzeButton /
 * BulkAiConfirmModal), all three of which are aliased away in the Free
 * build — so `startAiBatch()` itself is unreachable there — but
 * `startAiBatch()`'s own source (including these string literals) still
 * compiles into ScanResultPanel.tsx regardless, since that file ships in
 * both editions. Per this project's string-presence doctrine the literals
 * must still be physically absent from Free; the freeStub sibling supplies
 * neutral non-AI placeholder text these functions can safely return
 * without ever actually being shown (the calling code path is dead there).
 */
export function buildAiBatchStartToast(count: number): string {
  return count === 1
    ? "Analyzing 1 file with AI…"
    : `Analyzing ${count} files with AI…`;
}

export function buildAiBatchFailureToast(failed: number): string {
  return failed === 1
    ? "AI analysis failed — file could not be analyzed."
    : `AI analysis failed — none of the ${failed} files could be analyzed.`;
}

export function buildAiBatchPartialToast(
  succeeded: number,
  total: number,
  failed: number
): string {
  return `AI analyzed ${succeeded} of ${total} files. ${failed} could not be analyzed.`;
}

export function buildAiBatchCompleteToast(total: number): string {
  return total === 1
    ? "AI analysis complete."
    : `AI analysis complete: ${total} files processed.`;
}

/**
 * AuditResultView's "mixed selection" toast (some selected findings are
 * file-backed and analyzable, some are configuration checks that get
 * skipped). Same reachability/doctrine note as the functions above — only
 * this single call site uses it, in the bulk-analyze onClick passed to
 * BulkAiAnalyzeButton.
 */
export function buildAiBatchMixedSelectionToast(
  analyzableCount: number,
  skippedCount: number
): string {
  return `Analyzing ${analyzableCount} file${analyzableCount > 1 ? "s" : ""} with AI — ${skippedCount} configuration finding${skippedCount > 1 ? "s" : ""} skipped (see inline notes).`;
}
