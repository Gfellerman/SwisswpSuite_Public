/**
 * Scan labels, descriptions and messages.
 *
 * The values here describe what this build's scans actually run, so the
 * label a card shows and the work it performs are changed together.
 */

export const DEEP_SCAN_LABELS: Record<"deep-malware", string> = {
  "deep-malware": "Deep Scan",
};

export const DEEP_SCAN_DESCRIPTIONS: Record<"deep-malware", string> = {
  "deep-malware":
    "On demand, scans up to 5,000 PHP files (2 MB each) in your active plugins, active theme, and uploads folder, then runs multi-phase local signature analysis (multi-minute scan). A daily quick audit also runs automatically once the scan report e-mail is switched on.",
};

/** Fallback message when a deep scan cannot be started. */
export const DEEP_MALWARE_START_FAILURE_MESSAGE = "Could not start the scan.";

/**
 * Per-phase labels shown on the deep-scan card's running button. Every
 * lookup does `DEEP_MALWARE_PHASE_LABELS[phase] ?? undefined`, so a miss
 * falls back to the card's default "Scanning…" label.
 */
export const DEEP_MALWARE_PHASE_LABELS: Record<string, string> = {
  pending: "Preparing scan…",
  enumerate: "Discovering files…",
  local_scan: "Scanning file contents…",
  complete: "Scan complete",
};

/**
 * Labels for scan-history rows whose scan type this build does not write, so
 * an older row still renders a meaningful badge instead of an empty one.
 */
export const HISTORY_LABEL_DEEP_MALWARE = "Archived scan";
export const HISTORY_LABEL_LEGACY_FULL = "Archived scan";
export const HISTORY_LABEL_LEGACY_FULL_SCAN = "Archived scan";
