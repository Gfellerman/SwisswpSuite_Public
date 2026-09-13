/**
 * The scan result panel's phase pills, badges and finding controls.
 *
 * ScanResultPanel.tsx owns the result layout; what a finished scan reports
 * about the phases it ran, and which controls a finding row or a selection
 * offers, come from here so the panel only shows what the scan can do.
 */

import type React from "react";

/** One "phase: status" pill on a scan result panel. */
export interface ScanPhasePill {
  /** Phase name shown on the pill. */
  label: string;
  /** Phase status this build reports: `ok`. Any other string renders as a neutral, unstyled fallback. */
  value: string;
}

/** Labels for the deep-scan phases this build runs, in pill order. */
const PHASE_LABELS: Array<[string, string]> = [
  ["enumerate", "File list"],
  ["local_scan", "Signature scan"],
];

/** Status pills for the phases a finished deep scan actually ran. */
export function buildScanPhasePills(
  result: Record<string, unknown>
): ScanPhasePill[] {
  const phases = (result.phases ?? {}) as Record<
    string,
    { status?: string } | undefined
  >;
  const pills: ScanPhasePill[] = [];
  for (const [id, label] of PHASE_LABELS) {
    const status = phases[id]?.status;
    if (typeof status === "string" && status !== "") {
      pills.push({ label, value: status });
    }
  }
  return pills;
}

/** What a badge or notice about a finished scan is given. */
export interface ScanResultDetailProps {
  /** The finished scan's response envelope. */
  result: Record<string, unknown>;
}

/** Badges shown next to the scan mode, in render order. */
export const scanResultBadges: React.FC<ScanResultDetailProps>[] = [];

/** Notices about how a finished scan ran, in render order. */
export const scanResultNotices: React.FC<ScanResultDetailProps>[] = [];

/** A finding as the selection controls need to see it. */
export interface SelectableFinding {
  /** Stable finding id. */
  id: string;
  /** Evidence string — a file path for file findings. */
  evidence?: string;
  /** Automation category the backend assigned. */
  fix_type?: string;
  /** Core-integrity finding category, when the finding came from that check. */
  integrity_category?: string;
  /** Human-readable finding title. */
  title: string;
}

/** What a control acting on a set of selected findings is given. */
export interface ScanSelectionActionProps {
  /** Evidence paths the user has selected. */
  selected: string[];
  /** Every finding in the result, so a selection can be looked up. */
  findings?: SelectableFinding[];
  /** Hand one file to the page for inspection. */
  onInspect: (file: string, options?: { bulk?: boolean }) => void;
  /** Clear the current selection. */
  onClearSelection: () => void;
  /** Note the findings that have no source file to inspect. */
  onNoSourceFile?: (ids: string[]) => void;
}

/** Controls offered for a set of selected findings, in render order. */
export const scanSelectionActions: React.FC<ScanSelectionActionProps>[] = [];

/** What a control on a single finding row is given. */
export interface ScanFindingActionProps {
  /** The file the finding is about. */
  file: string;
  /** True while this file is being inspected. */
  isInspecting: boolean;
  /** Hand the file to the page for inspection. */
  onInspect: (file: string) => void;
}

/** Controls offered on a single finding row, in render order. */
export const scanFindingActions: React.FC<ScanFindingActionProps>[] = [];
