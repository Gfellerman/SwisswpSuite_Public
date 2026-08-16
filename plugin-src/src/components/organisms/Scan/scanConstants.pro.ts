/**
 * Scan Consolidation — Pro-only scan copy (v2.9.33.17)
 *
 * WP.org compliance (B12a residual closure, 2026-08-13): the descriptive
 * labels/copy for the two Pro-only scan types — "full-ai" (deprecated/dead
 * per T4, but its STRING still shipped) and "deep-malware" ("Layer 2") —
 * used to live inline in the shared scanConstants.ts object literals
 * (SCAN_LABELS / SCAN_DESCRIPTIONS). Because scanConstants.ts is imported
 * unconditionally by ScanCard.tsx (which ALSO renders the legitimately-free
 * "ai-audit"/"malware" cards), those Pro-descriptive strings — "Layer 2
 * Scan", "Full AI Scan", "Pro only", "consumes AI tokens", "automatic AI
 * verification of every result" — compiled into the Free JS bundle
 * regardless of the runtime `isProEditionBuild` gate at the ScanCard/
 * ScanResultPanel call sites in SecurityHub.tsx (same violation class
 * documented in docs/architecture/FREEMIUM_DUAL_BUILD_ARCHITECTURE.md's
 * 2026-08-12 frontend physical-exclusion amendment — a runtime gate stops
 * a component from RENDERING, not from being COMPILED). Tracked as 2 OPEN
 * entries in .claude/skills/wporg_compliance/SKILL.md's B12a fingerprint
 * list ("Deep Malware Scan / Layer 2 label+description" and "Full AI Scan
 * label+description").
 *
 * Fix: extracted into this sibling module, aliased away in the Free build
 * via `plugin/vite.config.ts`'s resolve.alias (exact specifier
 * "./scanConstants.pro", as written at its one importer, scanConstants.ts)
 * — same mechanism as GeoLockdownCard/EncryptionSettings/TwoFactorSettings/
 * etc. In Free, `scanConstants.pro.freeStub.ts` supplies neutral
 * empty-string placeholders instead.
 *
 * Dispatch-only data (SCAN_TYPES union keys, SCAN_TIER) stays in
 * scanConstants.ts — those are structural identifiers used for lookups and
 * gating, not descriptive copy, per this project's own B12a doctrine
 * (type-level union literals may remain; B12a fingerprints target rendered
 * strings).
 */

export const PRO_SCAN_LABELS: Record<"full-ai" | "deep-malware", string> = {
  "full-ai": "Full AI Scan",
  "deep-malware": "Layer 2 Scan",
};

export const PRO_SCAN_DESCRIPTIONS: Record<"full-ai" | "deep-malware", string> =
  {
    "full-ai":
      "Security Audit plus an AI-powered deep pass: CVE database matching, attack-chain analysis, and cross-correlation across layers. Highest accuracy; consumes more AI tokens. Pro only.",
    "deep-malware":
      "A deep scan with automatic AI verification of every result: enumerates every PHP file in plugins, themes, and uploads, runs them through the SwissSuite VPS hash database plus WPScan and Patchstack CVE lookups, then has AI verify and grade the findings A–F before presenting them. Multi-minute scan; consumes AI tokens. Pro only.",
  };

/**
 * v2.9.33.17 (same B12a closure) — SecurityHub.tsx's deep-malware start
 * handler (`handleTriggerScan`) throws this as a fallback when the backend
 * omits its own `message`. That handler function is NOT itself
 * edition-gated (only the ScanCard/ScanResultPanel *render* is), so the
 * literal used to compile into the Free bundle regardless. Imported from
 * "./organisms/Scan/scanConstants.pro" at SecurityHub.tsx (a DIFFERENT
 * literal specifier than "./scanConstants.pro" used inside this directory's
 * own scanConstants.ts — vite.config.ts carries a separate alias entry for
 * each, per the project's hazard-#1 doctrine).
 */
export const DEEP_MALWARE_START_FAILURE_MESSAGE =
  "Could not start Deep Malware Scan.";

/**
 * v2.9.33.17 (same B12a closure, controller-directed expansion) — was an
 * inline `const DEEP_MALWARE_PHASE_LABELS` in SecurityHub.tsx, a
 * user-facing phase dictionary shown on the deep-malware ScanCard's
 * loading button. Two entries named bare third-party service names —
 * "Looking up plugin vulnerabilities (WPScan)…" and "Verifying security
 * patches (Patchstack)…" — matching the controller's newly-added bare
 * "WPScan"/"Patchstack" B12a fingerprints. The whole dictionary is
 * deep-malware-only (100% Pro-gated concept), so the whole object moved
 * here rather than only the 2 offending entries — SecurityHub.tsx is a
 * shared, always-compiled file regardless of the render-level
 * `isProEditionBuild` gate on the card that consumes it.
 */
/**
 * v2.9.33.17 (same B12a closure, controller-directed sweep) — was an inline
 * `{ label: "WPScan", value: result.wpscan_status }` / `{ label:
 * "Patchstack", ... }` array literal inside `ScanResultPanel.tsx`'s
 * `MalwareResultView` "deep scan phase status" pills. That component is
 * shared with the genuinely-free `malware` scan type (not just
 * deep-malware), so the whole file ships in Free — these two bare
 * third-party service-name labels compiled in regardless of whether
 * `result.wpscan_status`/`.patchstack_status` is ever actually populated
 * (only the Pro-only deep-malware pipeline sets them). "VPS hash" and "AI"
 * labels in the same array are left inline — they name this product's own
 * service/generic AI, not a third-party brand, so they are not in scope for
 * this closure.
 */
export const DEEP_SCAN_SOURCE_LABELS = {
  wpscan: "WPScan",
  patchstack: "Patchstack",
};

/**
 * v2.9.33.18 (WP.org string-census closure, R3): SCAN_DESCRIPTIONS' "ai-audit"
 * and "malware" entries in scanConstants.ts each end with a tail sentence
 * that describes Layer 2's exact Pro-only capabilities (VPS hash database,
 * CVE lookups, AI analysis) WITHOUT ever using the word "Pro" — the exact
 * class of string a keyword blacklist cannot catch (see
 * docs/audit/FREE_BUNDLE_STRING_CENSUS_2026-08-13.md). Split out here so the
 * Free build gets only the front portion (its own freeStub below), while
 * this Pro module keeps the full text with the Layer-2 tail.
 */
export const AI_AUDIT_DESCRIPTION =
  'One scan, two checks: a signature scan of up to 100 PHP files in plugins, themes, and uploads (catches known webshells and obfuscated payloads), plus a full audit of your security POSTURE — configuration, headers, user accounts, hardening settings, and plugin/theme metadata. Runs entirely on your server — no AI, no tokens, no API key, and no license required. Runs automatically every 24 hours. Use "Check with AI" below to have a security-plan AI review any finding. For exhaustive file coverage (5,000+ files, VPS hash database, CVE lookups), use Layer 2 below.';

export const MALWARE_DESCRIPTION =
  "Bounded signature scan of up to 100 PHP files in plugins, themes, and uploads — under 30 seconds on most sites. Free tier. For a comprehensive deep scan with VPS hash database, CVE lookups, and AI analysis, use Layer 2 below.";

/**
 * v2.9.33.18 (WP.org string-census closure, R5): historical-record scan-type
 * labels used by ScanHistoryTable.tsx / ScanHistoricalRecord.tsx to render
 * PAST scan records whose scan_type is a Pro-only pipeline ("malware_deep",
 * legacy "full"/"full_ai"). These are informational labels for a specific
 * user's own historical data, not an upsell — but they name a Pro-only
 * capability by its product name ("Deep Malware", "Full + AI"), so per this
 * census's doctrine they must not compile into the Free bundle. Free stub
 * (below) substitutes a neutral generic label so old history rows still
 * render something meaningful for a lapsed-Pro or edition-switched site.
 */
export const HISTORY_LABEL_DEEP_MALWARE = "Deep Malware";
export const HISTORY_LABEL_FULL_AI = "Full + AI";
export const HISTORY_LABEL_FULL_SCAN_AI = "Full Scan + AI";

export const DEEP_MALWARE_PHASE_LABELS: Record<string, string> = {
  pending: "Preparing scan…",
  enumerate: "Discovering files…",
  hashing: "Computing file fingerprints…",
  vps_lookup: "Checking threat database…",
  local_scan: "Scanning file contents…",
  wpscan: "Looking up plugin vulnerabilities (WPScan)…",
  patchstack: "Verifying security patches (Patchstack)…",
  ai_analysis: "Running AI security analysis…",
  complete: "Scan complete",
};
