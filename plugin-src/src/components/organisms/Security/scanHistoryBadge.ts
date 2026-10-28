/**
 * Badge shown on a Scan History row, keyed off the record's `scan_type`.
 *
 * This build's own scan writers store 'security_audit' (the daily audit) and
 * 'malware_deep' (a finished manual Deep Scan; see
 * class-swisswpsuite-scan-orchestrator.php's record_completed_scan()). Any other
 * stored value is a row this build did not write — an older install, or one
 * written by a different version — so it renders with one neutral "archived"
 * badge rather than naming what produced it.
 */
import {
  HISTORY_LABEL_DEEP_MALWARE,
  HISTORY_LABEL_LEGACY_FULL,
} from "../Scan/scanCopy";

export interface ScanHistoryBadge {
  label: string;
  variant: "info" | "neutral";
}

export function getScanHistoryBadge(scanType: string): ScanHistoryBadge {
  if (scanType === "security_audit") {
    return { label: "Security Audit", variant: "info" };
  }
  if (scanType === "malware_deep") {
    return { label: HISTORY_LABEL_DEEP_MALWARE, variant: "info" };
  }
  return { label: HISTORY_LABEL_LEGACY_FULL, variant: "neutral" };
}
