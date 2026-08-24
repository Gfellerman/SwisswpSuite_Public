import React from "react";
import { Loader2, Lock, Sparkles } from "lucide-react";
import { AI_ANALYSIS_LOCKED_LABEL } from "./scanResultProCopy";

/**
 * AiAnalyzeFileButton — per-file "Analyze with AI" button shown on each row
 * of the deep-malware threat list (ScanResultPanel.tsx's MalwareResultView).
 *
 * Extracted (ARS Round D, D-K-1, WP.org R4 F-01, 2026-08-2x) so the whole
 * Pro-gated locked control can be aliased away in the Free build
 * (plugin/vite.config.ts, specifier "./AiAnalyzeFileButton") rather than
 * merely relabeling it. `hasSentinelPro` is a license capability that is
 * structurally always false in Free (no Sentinel AI class ships in that
 * edition — see D-A-1/D-C-1's Pro-companion route moves), so without this
 * extraction every genuine Free user would see this button rendered
 * disabled with a Lock icon on every threat row — itself the finding
 * (F-01: a visible padlocked control, independent of its tooltip wording).
 */
export interface AiAnalyzeFileButtonProps {
  file: string;
  hasSentinelPro?: boolean;
  isAnalyzing: boolean;
  onAnalyze: (file: string) => void;
}

export const AiAnalyzeFileButton: React.FC<AiAnalyzeFileButtonProps> = ({
  file,
  hasSentinelPro,
  isAnalyzing,
  onAnalyze,
}) => (
  <button
    type="button"
    onClick={() => onAnalyze(file)}
    disabled={!hasSentinelPro || isAnalyzing}
    aria-busy={isAnalyzing}
    aria-label={
      hasSentinelPro ? `Analyze ${file} with AI` : AI_ANALYSIS_LOCKED_LABEL
    }
    title={hasSentinelPro ? "Analyze with AI" : AI_ANALYSIS_LOCKED_LABEL}
    className="bg-swiss-navy focus-visible:ring-swiss-navy inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black tracking-[0.08em] text-white uppercase transition-colors hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
  >
    {isAnalyzing ? (
      <Loader2 size={10} className="animate-spin" aria-hidden="true" />
    ) : hasSentinelPro ? (
      <Sparkles size={10} aria-hidden="true" />
    ) : (
      <Lock size={10} aria-hidden="true" />
    )}
    {isAnalyzing ? "Analyzing…" : "Analyze"}
  </button>
);
