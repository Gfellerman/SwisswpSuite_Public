import React from "react";
import { History, X, CheckCircle2 } from "lucide-react";
import { ScanHistoryDetail } from "../../../types";
import { SentinelGradeBadge } from "../Sentinel/SentinelGradeBadge";
import { HISTORY_LABEL_LEGACY_FULL_SCAN } from "./scanCopy";

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
      className="bg-card border-border flex flex-col gap-5 rounded-2xl border p-6"
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
            <h3 className="text-swiss-navy text-sm font-black tracking-tight uppercase">
              Scan Record —{" "}
              {new Date(historicalScanDetail.record.scanned_at).toLocaleString(
                undefined,
                {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }
              )}
            </h3>
            <p className="mt-0.5 text-xs font-medium text-neutral-500">
              {historicalScanDetail.record.scan_type === "security_audit"
                ? "Security Audit"
                : HISTORY_LABEL_LEGACY_FULL_SCAN}{" "}
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
            className="rounded-lg p-1 text-neutral-400 transition-colors hover:text-neutral-700"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Findings list */}
      {historicalScanDetail.layer1_findings.length > 0 ? (
        <div>
          <h4 className="mb-3 text-xs font-black tracking-[0.08em] text-neutral-500 uppercase">
            Findings ({historicalScanDetail.layer1_findings.length})
          </h4>
          <ul role="list" className="space-y-2" aria-label="Scan findings">
            {historicalScanDetail.layer1_findings.map((finding, idx) => (
              <li
                key={finding.id ?? idx}
                className={`flex items-start gap-3 rounded-xl border p-3 ${severityBg[finding.severity] ?? "border-border bg-secondary"}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black text-neutral-800">
                      {finding.title}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black tracking-[0.08em] uppercase ${severityBg[finding.severity] ?? "border-border"} ${severityText[finding.severity] ?? "text-neutral-600"}`}
                    >
                      {finding.severity}
                    </span>
                  </div>
                  {finding.details && (
                    <p className="mt-0.5 text-xs leading-snug font-medium text-neutral-500">
                      {finding.details}
                    </p>
                  )}
                  {finding.remediation && (
                    <p className="mt-1 text-xs leading-snug font-medium text-neutral-600">
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
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <CheckCircle2
            size={16}
            className="shrink-0 text-emerald-600"
            aria-hidden="true"
          />
          <span className="text-xs font-black text-emerald-700">
            No findings recorded for this scan.
          </span>
        </div>
      )}

      {/* H-6: Disclaimer for feature path references in AI-generated remediation text */}
      <p className="border-border border-t pt-3 text-xs font-medium text-neutral-400">
        Note: Feature paths in fix instructions may vary. Check Security Hub
        &gt; Hardening for the relevant setting.
      </p>
    </div>
  );
}

export default ScanHistoricalRecord;
