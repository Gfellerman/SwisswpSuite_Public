/**
 * Scan Consolidation — Shared constants (v2.9.28.0)
 *
 * Central source of truth for scan-type identifiers, labels and
 * descriptions. Consumed by ScanCard, ScanResultPanel, and any future
 * scan-related UI that needs to reference these values.
 *
 * The label and description VALUES come from `scanCopy.ts`; the dispatch
 * data (SCAN_TYPES) stays here.
 */
import { DEEP_SCAN_LABELS, DEEP_SCAN_DESCRIPTIONS } from "./scanCopy";

// ── Scan type discriminant union ────────────────────────────────────────────

export const SCAN_TYPES = {
  /**
   * v2.9.29.0 (3-Scan Redesign) — async pipeline-driven malware scan. The
   * only scan type this build's Scan tab has a card for.
   */
  DEEP_MALWARE: "deep-malware",
} as const;

export type ScanTypeValue = (typeof SCAN_TYPES)[keyof typeof SCAN_TYPES];

// ── Human-readable labels ────────────────────────────────────────────────────

export const SCAN_LABELS: Record<ScanTypeValue, string> = {
  ...DEEP_SCAN_LABELS,
};

// ── Plain-English descriptions shown in the ScanCard ────────────────────────

// Descriptions are worded so a user can tell at a glance what each scan
// actually checks. All VALUES come from scanCopy.ts — see this file's top
// docblock.
export const SCAN_DESCRIPTIONS: Record<ScanTypeValue, string> = {
  ...DEEP_SCAN_DESCRIPTIONS,
};
