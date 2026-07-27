import React from "react";
import { History, X, CheckCircle2 } from "lucide-react";
import { ScanHistoryDetail } from "../../../types";
import { SentinelGradeBadge } from "../Sentinel/SentinelGradeBadge";

export interface ScanHistoricalRecordProps {
  historicalScanDetail: ScanHistoryDetail;
  onClose: () => void;
}

const severityBg: Record<string, string> = {
  critical: "border-red-200 bg-red-50",
  high: "border-orange-200 bg-orange-50",
  medium: "border-amber-200 bg-amber-50",
  low: "border-blue-200 bg-blue-50",
  info: "border-neutral-200 bg-neutral-50",
};

const severityText: Record<string, string> = {
  critical: "text-red-700",
  high: "text-orange-800",
  medium: "text-amber-700",
  low: "text-blue-700",
  info: "text-neutral-600",
};

/**
 * ScanHistoricalRecord
 * -----------------------------------------------------------------------------
 * Renders a read-only view of a historical scan record, opened via the History
 * tab's VIEW button. Pure presentational organism — holds no state of its own.
 *
 * Extracted from SecurityHub.tsx (F-004) in v2.9.28.43.
 */
export function ScanHistoricalRecord({
  historicalScanDetail,
  onClose,
}: ScanHistoricalRecordProps) {
  return (
    <div
      className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-5"
      role="region"
      aria-label="Historical scan record"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <History
            size={18}
            className="text-swiss-navy shrink-0"
            aria-hidden="true"
          />
          <div>
            <h3 className="text-sm font-black text-swiss-navy uppercase tracking-tight">
              Scan Record —{" "}
              {new Date(historicalScanDetail.record.scanned_at).toLocaleString(
                undefined,
                {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                },
              )}
            </h3>
            <p className="text-xs font-medium text-neutral-500 mt-0.5">
              {historicalScanDetail.record.scan_type === "ai_audit"
                ? "AI Audit"
                : historicalScanDetail.record.scan_type === "full" ||
                    historicalScanDetail.record.scan_type === "full_ai"
                  ? "Full Scan + AI"
                  : "Quick Scan"}{" "}
              · {historicalScanDetail.record.findings_count ?? 0} findings ·{" "}
              {historicalScanDetail.record.critical_count ?? 0} critical
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {historicalScanDetail.record.security_grade && (
            <SentinelGradeBadge
              grade={historicalScanDetail.record.security_grade}
              size="sm"
            />
          )}
          <button
            onClick={onClose}
            aria-label="Close historical scan record"
            className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Layer 2 summary if present */}
      {historicalScanDetail.layer2_report && (
        <div className="p-4 rounded-xl bg-swiss-navy text-white">
          <p className="text-xs font-black uppercase tracking-widest text-white/60 mb-2">
            AI Summary
          </p>
          <p className="text-sm font-medium leading-relaxed">
            {historicalScanDetail.layer2_report.executive_summary}
          </p>
        </div>
      )}

      {/* Findings list */}
      {historicalScanDetail.layer1_findings.length > 0 ? (
        <div>
          <h4 className="text-xs font-black uppercase tracking-[0.08em] text-neutral-500 mb-3">
            Findings ({historicalScanDetail.layer1_findings.length})
          </h4>
          <ul role="list" className="space-y-2" aria-label="Scan findings">
            {historicalScanDetail.layer1_findings.map((finding, idx) => (
              <li
                key={finding.id ?? idx}
                className={`flex items-start gap-3 p-3 rounded-xl border ${severityBg[finding.severity] ?? "border-border bg-secondary"}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-neutral-800">
                      {finding.title}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-[0.08em] border ${severityBg[finding.severity] ?? "border-border"} ${severityText[finding.severity] ?? "text-neutral-600"}`}
                    >
                      {finding.severity}
                    </span>
                  </div>
                  {finding.details && (
                    <p className="text-xs text-neutral-500 font-medium mt-0.5 leading-snug">
                      {finding.details}
                    </p>
                  )}
                  {finding.remediation && (
                    <p className="text-xs text-neutral-600 font-medium mt-1 leading-snug">
                      <span className="font-black">Fix: </span>
                      {finding.remediation}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <CheckCircle2
            size={16}
            className="text-emerald-600 shrink-0"
            aria-hidden="true"
          />
          <span className="text-xs font-black text-emerald-700">
            No findings recorded for this scan.
          </span>
        </div>
      )}

      {/* H-6: Disclaimer for feature path references in AI-generated remediation text */}
      <p className="text-xs text-neutral-400 font-medium border-t border-border pt-3">
        Note: Feature paths in fix instructions may vary. Check Security Hub
        &gt; Hardening for the relevant setting.
      </p>
    </div>
  );
}

export default ScanHistoricalRecord;
