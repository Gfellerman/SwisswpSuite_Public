/**
 * Badge shown on a Scan History row, keyed off the record's `scan_type`.
 *
 * This build's own scan writer stores exactly one value, 'security_audit'
 * (see class-swisswpsuite-scan-orchestrator.php's persist_security_audit_
 * history()). Any other stored value is a row this build did not write —
 * an older install, or one written by a different version — so it renders
 * with one neutral "archived" badge rather than naming what produced it.
 */
import { HISTORY_LABEL_LEGACY_FULL } from "../Scan/scanCopy";

export interface ScanHistoryBadge {
  label: string;
  variant: "info" | "neutral";
}

export function getScanHistoryBadge(scanType: string): ScanHistoryBadge {
  if (scanType === "security_audit") {
    return { label: "Security Audit", variant: "info" };
  }
  return { label: HISTORY_LABEL_LEGACY_FULL, variant: "neutral" };
}
