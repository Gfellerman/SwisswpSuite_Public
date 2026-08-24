import React from "react";
import { Sparkles } from "lucide-react";

/**
 * DeepScanAiResults — AI-verdict rendering for the Deep Malware Scan (Layer 2)
 * result panel (v2.9.33.30, WP.org R4 / owner ruling OD-3).
 *
 * Extracted from ScanResultPanel.tsx's MalwareResultView so this module can
 * be aliased away in the Free build (plugin/vite.config.ts, specifier
 * "./DeepScanAiResults", as written at its one importer). MalwareResultView
 * is SHARED between the genuinely-free "malware" (quick) scan and the now-
 * also-free "deep-malware" (Layer 2) scan, so it cannot itself be swapped
 * wholesale — only these two AI-specific sub-elements need to disappear
 * from Free:
 *
 *   - AiGradeBadge: the "Grade {A-F|?}" pill shown when result.ai_grade is
 *     present. The deep-malware pipeline ALWAYS sets ai_grade on a
 *     completed scan (falls back to "?" when AI didn't run — see
 *     class-swisswpsuite-api-security.php's get_scan_deep_malware_status(),
 *     `$grade = ai_grade ?? '?'`), so without this extraction every Free
 *     deep-malware scan would render "Grade ?" — a visible AI-results
 *     element even though nothing was ever AI-analyzed (Free structurally
 *     never has the sentinel_pro capability the pipeline's
 *     ai_analysis_phase() gates on).
 *   - buildAiStatusPill: the "AI: {status}" entry in the phase-status pill
 *     row (VPS hash / WPScan / Patchstack / AI). The other three pills stay
 *     inline in ScanResultPanel.tsx — they describe genuinely-free
 *     EXTERNAL-SERVICE phases that run for every caller regardless of
 *     edition; only the AI entry is extracted here.
 *
 * The Free stub (DeepScanAiResults.freeStub.tsx) makes both a no-op. This
 * outcome already holds by DATA (Free never gets ai_status === 'ok'), but
 * per this project's string-presence doctrine a runtime-only gate on the
 * *data* is not sufficient — the *copy itself* ("Grade", "AI grade", "AI")
 * must be physically absent from the Free bundle, matching every other
 * .freeStub module in this directory.
 */

export const AiGradeBadge: React.FC<{ grade: string | null | undefined }> = ({
  grade,
}) => {
  if (!grade) return null;
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 ${
        grade === "A" || grade === "B"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : grade === "C"
            ? "border-amber-200 bg-amber-50 text-amber-800"
            : grade === "?"
              ? "bg-secondary border-border text-neutral-700"
              : "border-red-200 bg-red-50 text-red-800"
      }`}
      aria-label={`AI grade ${grade}`}
    >
      <Sparkles size={14} aria-hidden="true" />
      <span className="text-xs font-black">
        Grade <span className="font-black uppercase">{grade}</span>
      </span>
    </div>
  );
};

export interface AiStatusPillEntry {
  label: string;
  value: string;
}

/** Returns the "AI" phase-status pill entry, or null when there is nothing to show. */
export function buildAiStatusPill(
  status: string | null | undefined
): AiStatusPillEntry | null {
  if (!status) return null;
  return { label: "AI", value: status };
}
