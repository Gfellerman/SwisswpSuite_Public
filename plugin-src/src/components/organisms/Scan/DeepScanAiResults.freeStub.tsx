import React from "react";

/**
 * Free-edition stub for DeepScanAiResults.tsx (WP.org R4, owner ruling OD-3,
 * 2026-08-22). Wired via plugin/vite.config.ts's resolve.alias, active only
 * when EDITION === 'free' — see the real module's docblock for the full
 * rationale.
 *
 * Both exports are no-ops: the Free deep-malware (Layer 2) result panel
 * shows the scan's findings, sources, and phase-status pills (VPS hash /
 * WPScan / Patchstack) exactly like the Pro build, but never an AI grade
 * badge or an "AI: {status}" pill — the AI-analysis layer stays genuinely
 * Pro-only serviceware (gated inside
 * SwissWPSuite_Deep_Scan_Pipeline::ai_analysis_phase() via
 * has_capability('sentinel_pro')), and per this project's string-presence
 * doctrine the copy describing an AI result must be physically absent from
 * the Free bundle, not merely unreachable at runtime.
 */
export const AiGradeBadge: React.FC<{ grade: string | null | undefined }> = (
  _props
) => null;

export interface AiStatusPillEntry {
  label: string;
  value: string;
}

export function buildAiStatusPill(
  _status: string | null | undefined
): AiStatusPillEntry | null {
  return null;
}
