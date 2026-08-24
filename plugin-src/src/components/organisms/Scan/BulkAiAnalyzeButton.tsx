import React from "react";
import { Loader2, Lock, Sparkles } from "lucide-react";

/**
 * BulkAiAnalyzeButton — "Check N with AI" bulk-action button, used on all
 * three selectable findings lists in ScanResultPanel.tsx (the ai-audit
 * list in AuditResultView, and the actionable + low-severity threat lists
 * in MalwareResultView).
 *
 * Extracted (ARS Round D, D-K-1, WP.org R4 F-01, 2026-08-2x) so the whole
 * Pro-gated locked control can be aliased away in the Free build
 * (plugin/vite.config.ts, specifier "./BulkAiAnalyzeButton") rather than
 * merely relabeling it. `hasSentinelPro` is a license capability that is
 * structurally always false in Free — see AiAnalyzeFileButton.tsx's
 * docblock for the full rationale, identical here. The click handler
 * (batching/confirm-cap/toast logic) intentionally stays with each call
 * site in ScanResultPanel.tsx — only the rendered control itself (and its
 * copy/icon states) is extracted, so this component takes a plain
 * `onClick` rather than owning the batching logic.
 */
export interface BulkAiAnalyzeButtonProps {
  hasSentinelPro?: boolean;
  aiProgress: { current: number; total: number } | null;
  count: number;
  onClick: () => void;
}

export const BulkAiAnalyzeButton: React.FC<BulkAiAnalyzeButtonProps> = ({
  hasSentinelPro,
  aiProgress,
  count,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!hasSentinelPro || !!aiProgress}
    aria-disabled={!hasSentinelPro ? true : undefined}
    aria-label={`Analyze ${count} selected files with AI`}
    className={`bg-swiss-navy focus-visible:ring-swiss-navy inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black tracking-[0.08em] text-white uppercase hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none transition-colors${!hasSentinelPro || !!aiProgress ? "cursor-not-allowed opacity-50" : ""}`}
  >
    {!hasSentinelPro ? (
      <Lock size={10} aria-hidden="true" />
    ) : aiProgress ? (
      <Loader2 size={10} className="animate-spin" aria-hidden="true" />
    ) : (
      <Sparkles size={10} aria-hidden="true" />
    )}
    {aiProgress
      ? `Analyzing ${aiProgress.current} of ${aiProgress.total}…`
      : `Check ${count} with AI`}
  </button>
);
