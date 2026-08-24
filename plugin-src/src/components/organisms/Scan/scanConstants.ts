/**
 * Scan Consolidation — Shared constants (v2.9.28.0)
 *
 * Central source of truth for scan-type identifiers, labels, descriptions,
 * and tier requirements. Consumed by ScanCard, ScanResultPanel, and any
 * future scan-related UI that needs to reference these values.
 *
 * WP.org B12a residual closure (2026-08-13, v2.9.33.17): the "full-ai" and
 * "deep-malware" entries of SCAN_LABELS/SCAN_DESCRIPTIONS below used to be
 * inline literals here. Because this module is imported unconditionally by
 * ScanCard.tsx (which also renders the legitimately-free "ai-audit"/
 * "malware" cards), those Pro-descriptive strings compiled into the Free
 * bundle regardless of the runtime isProEditionBuild gate at their
 * SecurityHub.tsx call sites. Extracted into the sibling
 * `scanConstants.pro.ts` module (aliased to `scanConstants.pro.freeStub.ts`
 * in the Free build via vite.config.ts) — see that file's docblock for the
 * full mechanism. "ai-audit"/"malware" copy stays here (genuinely free in
 * both editions); SCAN_TYPES/SCAN_TIER stay here too (dispatch data, not
 * descriptive copy).
 */
import {
  PRO_SCAN_LABELS,
  PRO_SCAN_DESCRIPTIONS,
  AI_AUDIT_DESCRIPTION,
  MALWARE_DESCRIPTION,
} from "./scanConstants.pro";

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

// Package E / G2 Scan UI Consolidation (2026-08-13, owner-locked design —
// docs/reports/OWNER_BACKLOG_2026-08-09_SOCRATIC_QUEUE.md §G, D1/D3):
//   - "ai-audit" is now the merged Layer 1 card. It already ran BOTH the
//     signature scan AND the posture check on Free (that overlap is exactly
//     why the old separate "Malware Scan" card was redundant — see D1's
//     rationale and the removed ScanCard/ScanResultPanel render in
//     SecurityHub.tsx). Relabeled from "Security Audit" to "Layer 1 Scan"
//     — plain-English, no internal jargon, while keeping the owner's
//     "Layer 1" framing visible. FINAL COPY FLAGGED FOR OWNER REVIEW.
//   - "deep-malware" is re-presented per D3 as "Layer 2" — same Pro-only
//     gating, same pipeline, copy-only change: its existing ai_analysis
//     phase already is "automatic AI verification of results", which the
//     new label/description now say explicitly instead of leaving it
//     implicit. FINAL COPY FLAGGED FOR OWNER REVIEW.
//   - "malware" and "full-ai" entries are PRESERVED in this map (their
//     scanType strings are still structurally referenced — see
//     ScanCard.tsx's shared "malware"|"deep-malware" result-shape branch —
//     and full-ai's SCAN_TYPES.FULL_AI union member is deleted separately in
//     the T4 dead-path removal, not here) but no ScanCard/ScanResultPanel
//     instance renders "malware" as its own card anymore.
//   - "full-ai"/"deep-malware" VALUES now come from the sibling
//     scanConstants.pro.ts module (empty strings in the Free build via its
//     .freeStub.ts alias) — see this file's top docblock, 2026-08-13.
export const SCAN_LABELS: Record<ScanTypeValue, string> = {
  "ai-audit": "Layer 1 Scan",
  malware: "Malware Scan",
  ...PRO_SCAN_LABELS,
};

// ── Plain-English descriptions shown in the ScanCard ────────────────────────

// v2.9.28.04 (Issue 3): descriptions were rewritten so users can tell at a glance
// what each scan actually checks.
// v2.9.33.16 (Package E / G2, 2026-08-13): "ai-audit" description rewritten to
// describe the MERGED Layer 1 card (signature scan + posture check, both
// kept per D1) instead of posture-only. "deep-malware" description rewritten
// to explicitly name the automatic AI verification step per D3's
// re-presentation ("deep scan with automatic AI verification of results").
// "full-ai"/"deep-malware" VALUES now come from the sibling
// scanConstants.pro.ts module (empty strings in the Free build via its
// .freeStub.ts alias) — see this file's top docblock, 2026-08-13.
// v2.9.33.18 (WP.org string-census closure, R3): "ai-audit"/"malware" VALUES
// now come from the sibling scanConstants.pro.ts module (truncated,
// Layer-2-reference-free text in the Free build via its .freeStub.ts alias)
// — see that file's docblock for the full mechanism.
export const SCAN_DESCRIPTIONS: Record<ScanTypeValue, string> = {
  "ai-audit": AI_AUDIT_DESCRIPTION,
  malware: MALWARE_DESCRIPTION,
  ...PRO_SCAN_DESCRIPTIONS,
};

// ── Tier requirements ────────────────────────────────────────────────────────

/**
 * 'none'  — available on every tier (no license required)
 * 'free'  — available on the free tier and above
 * 'pro'   — requires an active Pro license
 *
 * WP.org R4 (owner ruling OD-3, 2026-08-22): "deep-malware" changed from
 * 'pro' to 'free' — the route now registers unconditionally
 * (api-security.php) and the ScanCard/ScanResultPanel render unconditionally
 * (SecurityHub.tsx). Leaving this at 'pro' would have made the ScanCard's
 * TierBadge show "PRO" on a scan every Free user can now actually trigger —
 * a truthfulness defect, not just a compliance one (same class of bug this
 * project's UI-truthfulness sprint, v2.9.33.29, was about). AI verification
 * within the scan stays genuinely Pro (gated inside
 * ai_analysis_phase()/has_capability('sentinel_pro')), which is why
 * "full-ai" (the retired all-in-one card) stays 'pro' — it has no
 * Free-usable local phase at all.
 */
export const SCAN_TIER: Record<ScanTypeValue, "none" | "free" | "pro"> = {
  "ai-audit": "free",
  malware: "free",
  "full-ai": "pro",
  "deep-malware": "free",
};

// ── Malware scan modes ───────────────────────────────────────────────────────
// v2.9.30.x — Removed. The Quick/Deep toggle was a v2.9.28.x relic; v2.9.29.0
// moved Deep scanning to its own dedicated `deep-malware` card (async pipeline).
// The Malware Scan card now runs Quick only — no mode argument needed.
