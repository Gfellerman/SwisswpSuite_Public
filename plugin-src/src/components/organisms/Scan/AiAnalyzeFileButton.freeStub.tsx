import React from "react";

/**
 * Free-edition stub for AiAnalyzeFileButton.tsx (ARS Round D, D-K-1, WP.org
 * R4 F-01). Wired via vite.config.ts's resolve.alias, active only when
 * EDITION === 'free'. Renders nothing — `hasSentinelPro` is structurally
 * always false in Free, so this control has zero function in that
 * edition; per doctrine ("Free bundle must contain zero padlocked/dead
 * controls") it must be physically absent, not merely disabled with
 * neutral wording.
 */
export interface AiAnalyzeFileButtonProps {
  file: string;
  hasSentinelPro?: boolean;
  isAnalyzing: boolean;
  onAnalyze: (file: string) => void;
}

export const AiAnalyzeFileButton: React.FC<AiAnalyzeFileButtonProps> = (
  _props
) => null;
