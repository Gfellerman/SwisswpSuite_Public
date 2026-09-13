import type { ScanHistoryRecord, SentinelLayer1Finding } from "../../../types";

/**
 * Title shown on the Dashboard tab's post-scan summary card. This build's
 * own scan does not assign the record a security_grade, so the title is
 * always the same generic completion message.
 */
export function buildScanSummaryTitle(
  _record: ScanHistoryRecord | null | undefined
): string {
  return "Quick Scan Complete";
}

/**
 * Subtitle shown under the title, given the findings from the same scan.
 * This build's scanner assigns every finding a review-only fix_type (or
 * none at all), so nothing here is fixable with a single click — the
 * subtitle always points the user at the Scan tab to review the findings.
 */
export function buildScanSummarySubtitle(
  _findings: SentinelLayer1Finding[]
): string {
  return "Review findings on the Scan tab";
}
