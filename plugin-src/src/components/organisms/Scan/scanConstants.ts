/**
 * Scan Consolidation — Shared constants (v2.9.28.0)
 *
 * Central source of truth for scan-type identifiers, labels, descriptions,
 * and tier requirements. Consumed by ScanCard, ScanResultPanel, and any
 * future scan-related UI that needs to reference these values.
 */

// ── Scan type discriminant union ────────────────────────────────────────────

export const SCAN_TYPES = {
  AI_AUDIT: "ai-audit",
  MALWARE: "malware",
  /**
   * @deprecated v2.9.29.0 — Replaced by DEEP_MALWARE. Kept in the union for
   * one release while in-flight components migrate. Routes to a 410-emitting
   * backend endpoint if triggered, so failures are explicit rather than silent.
   */
  FULL_AI: "full-ai",
  /**
   * v2.9.29.0 (3-Scan Redesign) — async pipeline-driven malware scan with
   * VPS hash + WPScan + Patchstack + AI analysis. Pro tier only.
   */
  DEEP_MALWARE: "deep-malware",
} as const;

export type ScanTypeValue = (typeof SCAN_TYPES)[keyof typeof SCAN_TYPES];

// ── Human-readable labels ────────────────────────────────────────────────────

export const SCAN_LABELS: Record<ScanTypeValue, string> = {
  "ai-audit": "Security Audit",
  malware: "Malware Scan",
  "full-ai": "Full AI Scan",
  "deep-malware": "Deep Malware Scan",
};

// ── Plain-English descriptions shown in the ScanCard ────────────────────────

// v2.9.28.04 (Issue 3): descriptions were rewritten so users can tell at a glance
// what each scan actually checks. The old wording overlapped — Security Audit said
// "checks file integrity" and Malware Scan said "scans files for signatures", which
// made users expect the same finding count from both. They check different things:
//   - Security Audit  → POSTURE (config, headers, hardening, users, plugins/themes
//                       metadata) PLUS basic file-signature checks on PHP files in
//                       plugins, themes, and uploads using a curated signature list.
//                       Catches known webshells and high-confidence obfuscation patterns.
//   - Malware Scan    → FILES (signature scan of up to 100 PHP files — fast, bounded).
//   - Deep Malware    → FILES (5,000+ files, VPS hash database, CVE lookups, AI analysis).
// The Security Audit file-signature check is intentionally lightweight — it flags
// obvious threats (eval+base64, webshell names, heavily obfuscated payloads). For
// exhaustive file coverage use Deep Malware Scan.
// It is normal for Security Audit to grade A while Malware Scan reports modified
// core files — they audit different layers of the site.
export const SCAN_DESCRIPTIONS: Record<ScanTypeValue, string> = {
  "ai-audit":
    "Audits your security POSTURE: configuration, headers, user accounts, hardening settings, plugin/theme metadata, and basic file-signature checks on PHP files in plugins, themes, and uploads. Grades how the site is set up. For a comprehensive deep malware scan (5,000+ files, VPS hash database), use the Deep Malware Scan. Runs entirely on your server — no AI, no tokens, no API key, and no license required. Runs automatically every 24 hours.",
  malware:
    "Bounded signature scan of up to 100 PHP files in plugins, themes, and uploads — under 30 seconds on most sites. Free tier. For a comprehensive deep scan with VPS hash database, CVE lookups, and AI analysis, use the Deep Malware Scan below.",
  "full-ai":
    "Security Audit plus an AI-powered deep pass: CVE database matching, attack-chain analysis, and cross-correlation across layers. Highest accuracy; consumes more AI tokens. Pro only.",
  "deep-malware":
    "Comprehensive malware scan: enumerates every PHP file in plugins, themes, and uploads, then runs them through the SwissSuite VPS hash database, local signature scan, WPScan and Patchstack CVE lookups, and final AI analysis with an A–F grade. Multi-minute scan; consumes AI tokens. Pro only.",
};

// ── Tier requirements ────────────────────────────────────────────────────────

/**
 * 'none'  — available on every tier (no license required)
 * 'free'  — available on the free tier and above
 * 'pro'   — requires an active Pro license
 */
export const SCAN_TIER: Record<ScanTypeValue, "none" | "free" | "pro"> = {
  "ai-audit": "free",
  malware: "free",
  "full-ai": "pro",
  "deep-malware": "pro",
};

// ── Malware scan modes ───────────────────────────────────────────────────────
// v2.9.30.x — Removed. The Quick/Deep toggle was a v2.9.28.x relic; v2.9.29.0
// moved Deep scanning to its own dedicated `deep-malware` card (async pipeline).
// The Malware Scan card now runs Quick only — no mode argument needed.
