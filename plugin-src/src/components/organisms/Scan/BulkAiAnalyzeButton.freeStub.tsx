import React from "react";

/**
 * Free-edition stub for BulkAiAnalyzeButton.tsx (ARS Round D, D-K-1,
 * WP.org R4 F-01). Wired via vite.config.ts's resolve.alias, active only
 * when EDITION === 'free'. Renders nothing — `hasSentinelPro` is
 * structurally always false in Free, so this control has zero function in
 * that edition; per doctrine ("Free bundle must contain zero
 * padlocked/dead controls") it must be physically absent, not merely
 * disabled with neutral wording.
 */
export interface BulkAiAnalyzeButtonProps {
  hasSentinelPro?: boolean;
  aiProgress: { current: number; total: number } | null;
  count: number;
  onClick: () => void;
}

export const BulkAiAnalyzeButton: React.FC<BulkAiAnalyzeButtonProps> = (
  _props
) => null;
