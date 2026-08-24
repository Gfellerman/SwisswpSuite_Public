/**
 * Free-edition stub for scanConstants.pro.ts (WP.org B12a residual closure,
 * 2026-08-13; REVISED 2026-08-22 for R4/OD-3). Wired via
 * `plugin/vite.config.ts`'s resolve.alias, active only when
 * `EDITION === 'free'` — redirects the exact "./scanConstants.pro"
 * specifier (as written in scanConstants.ts, its one importer) to this file
 * at module-resolve time, before Rollup ever parses the real one.
 *
 * "full-ai" stays an empty placeholder: it has no Free-usable phase and no
 * ScanCard/ScanResultPanel call site renders it — per this project's B12a
 * doctrine, nothing in the Free bundle may describe, name, or advertise a
 * Pro-only-in-full scan type, and an empty string is the safest placeholder
 * precisely because it can never accidentally read as Pro-descriptive copy.
 *
 * "deep-malware" changed (WP.org R4, owner ruling OD-3, 2026-08-22): this
 * scan is now enabled in Free (see api-security.php's route-registration
 * comment + SecurityHub.tsx's ScanCard/ScanResultPanel call site, both no
 * longer isProEditionBuild-gated), so its label/description ARE a real
 * user-facing surface in Free now and must not be empty — an empty label
 * would render a blank card title. The description below covers ONLY the
 * phases that actually run for a Free/no-license caller (enumerate,
 * hashing, VPS hash-database lookup, local signature scan, WPScan CVE
 * lookup, Patchstack CVE lookup) and deliberately omits any mention of AI,
 * tokens, grading, or "Pro" — the pipeline's final ai_analysis phase still
 * executes for Free callers (it soft-degrades to `degraded_no_tokens`
 * inside SwissWPSuite_Deep_Scan_Pipeline::ai_analysis_phase()), but its
 * *result* is physically excluded from render on Free (see
 * DeepScanAiResults.tsx's docblock) — this description must not advertise
 * a capability the Free UI then never shows the output of.
 *
 * Must NOT import from the real scanConstants.pro.ts — even a type-only
 * import — per the established .freeStub convention (see
 * docs/architecture/FREEMIUM_DUAL_BUILD_ARCHITECTURE.md's 2026-08-12
 * amendment, hazard #2: a stub-authored import of its own real counterpart
 * is a DIFFERENT literal specifier than the one aliased, and resolves
 * straight through to the real file). The literal-key type is redeclared
 * locally instead of importing it.
 */

export const PRO_SCAN_LABELS: Record<"full-ai" | "deep-malware", string> = {
  "full-ai": "",
  "deep-malware": "Layer 2 Scan",
};

export const PRO_SCAN_DESCRIPTIONS: Record<"full-ai" | "deep-malware", string> =
  {
    "full-ai": "",
    "deep-malware":
      // R4 follow-up (2026-08-22, controller): the earlier wording claimed VPS
      // hash-database + WPScan/Patchstack lookups, but those phases soft-degrade
      // in Free (their client classes are physically excluded from the build) —
      // describe only what the Free scan actually executes.
      "A deeper scan: enumerates every PHP file in plugins, themes, and uploads, hashes each one, and runs multi-phase local signature analysis. Multi-minute scan.",
  };

/**
 * Free stub for the deep-malware start-failure fallback message (see the
 * real scanConstants.pro.ts for the mechanism). Neutral — no scan name.
 */
export const DEEP_MALWARE_START_FAILURE_MESSAGE = "Could not start the scan.";

/**
 * Free stub for the deep-malware phase-label dictionary. An empty object
 * type-checks fine against `Record<string, string>` (no required keys) and
 * is functionally safe: every lookup site does
 * `DEEP_MALWARE_PHASE_LABELS[phase] ?? undefined`, so a miss just falls
 * back to the ScanCard's default "Scanning…" label — and this dictionary
 * is unreachable in Free at runtime anyway (the deep-malware card that
 * consumes it is gated `isProEditionBuild &&` at its SecurityHub.tsx call
 * site), so no placeholder values are needed at all.
 */
export const DEEP_MALWARE_PHASE_LABELS: Record<string, string> = {};

/**
 * Free stub for the deep-scan status-pill source labels. Empty strings —
 * safe because the pill this drives only renders when
 * `result.wpscan_status`/`.patchstack_status` is truthy, which never
 * happens in Free (only the Pro-only deep-malware pipeline sets them).
 */
export const DEEP_SCAN_SOURCE_LABELS = {
  wpscan: "",
  patchstack: "",
};

/**
 * Free stub for the R3 Layer-1-description split (see the real
 * scanConstants.pro.ts for the mechanism/rationale). Free keeps only the
 * portion of each description that describes what Layer 1 itself does —
 * truncated BEFORE any Layer-2/AI/"Check with AI" reference, per the
 * controller's explicit R3 ruling. Genuinely free, complete sentences on
 * their own — not a dangling fragment.
 */
export const AI_AUDIT_DESCRIPTION =
  "One scan, two checks: a signature scan of up to 100 PHP files in plugins, themes, and uploads (catches known webshells and obfuscated payloads), plus a full audit of your security POSTURE — configuration, headers, user accounts, hardening settings, and plugin/theme metadata. Runs entirely on your server — no AI, no tokens, no API key, and no license required. Runs automatically every 24 hours.";

export const MALWARE_DESCRIPTION =
  "Bounded signature scan of up to 100 PHP files in plugins, themes, and uploads — under 30 seconds on most sites.";

/**
 * Free stub for the R5 historical-record scan-type labels. Neutral generic
 * label — no Pro product name — so old history rows (e.g. from a lapsed-Pro
 * or edition-switched site) still render something meaningful instead of an
 * empty badge.
 */
export const HISTORY_LABEL_DEEP_MALWARE = "Archived scan";
export const HISTORY_LABEL_FULL_AI = "Archived scan";
export const HISTORY_LABEL_FULL_SCAN_AI = "Archived scan";
