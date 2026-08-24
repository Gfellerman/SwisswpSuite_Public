/**
 * ScanHistoryTable — extracted from SecurityHub.tsx (HIGH-36)
 * Renders the History tab: full scan records table (ARS R-05, 2026-08-22 —
 * the server already returns the full window to every user; the table no
 * longer truncates). The "additional plan required" banner that used to sit
 * above the table (see the sibling notice component this file no longer
 * imports) was removed the same day (controller-verified: neither
 * `/security/sentinel/scan-history` list nor `/{id}` record-view route gates
 * on a plan/capability server-side — `check_permission` is `manage_options`
 * only — so that banner's copy advertised a paywall that does not exist).
 */
import React from "react";
import { History, Loader } from "lucide-react";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { SentinelGradeBadge } from "../Sentinel/SentinelGradeBadge";
import { ScanHistoryRecord } from "../../../types";
import {
  HISTORY_LABEL_DEEP_MALWARE,
  HISTORY_LABEL_FULL_AI,
} from "../Scan/scanConstants.pro";

interface ScanHistoryTableProps {
  scanHistory: ScanHistoryRecord[];
  loadingRecordId: number | null;
  onRefresh: () => void;
  onViewRecord: (record: ScanHistoryRecord) => void;
}

export const ScanHistoryTable: React.FC<ScanHistoryTableProps> = ({
  scanHistory,
  loadingRecordId,
  onRefresh,
  onViewRecord,
}) => {
  return (
    <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
      <div className="bg-card border border-black p-6">
        <div className="mb-8 flex items-center justify-between border-b border-black pb-4">
          <h3 className="flex items-center gap-2 text-xs font-black tracking-widest text-black uppercase">
            <History size={16} className="text-black" aria-hidden="true" />
            Scan History
          </h3>
          <Button
            variant="ghost"
            onClick={onRefresh}
            className="hover:bg-background text-sm font-black tracking-widest uppercase"
            aria-label="Refresh scan history"
          >
            Refresh
          </Button>
        </div>

        <div className="overflow-hidden border border-black">
          <table
            className="w-full text-left text-sm font-black tracking-widest uppercase"
            aria-label="Scan history"
          >
            <thead className="bg-background text-foreground dark:text-foreground">
              <tr className="bg-background dark:bg-secondary border-border dark:border-border/10 border-b text-left text-sm font-black tracking-widest text-neutral-700 uppercase">
                <th className="border-border dark:border-border/10 border-r p-4">
                  Date
                </th>
                <th className="border-border dark:border-border/10 border-r p-4">
                  Type
                </th>
                <th className="border-border dark:border-border/10 border-r p-4 text-center">
                  Grade
                </th>
                <th className="border-border dark:border-border/10 border-r p-4 text-center">
                  Findings
                </th>
                <th className="border-border dark:border-border/10 border-r p-4 text-center">
                  Critical
                </th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {scanHistory.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-12 text-center text-xs font-black tracking-widest text-neutral-500 uppercase"
                  >
                    No scan history yet. Run a scan to start tracking your
                    security posture.
                  </td>
                </tr>
              ) : (
                scanHistory.map((record) => (
                  <tr
                    key={record.id}
                    className="hover:bg-secondary/50 transition-colors"
                  >
                    <td className="p-4 text-xs font-bold text-neutral-700">
                      {new Date(record.scanned_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="p-4">
                      {/* v2.9.29.0 — 'malware_deep' is the new Deep Malware
                          Scan pipeline scan type. 'full_ai' and 'full' are
                          legacy types kept so historical records render
                          correctly after the 3-Scan Redesign rollout. */}
                      <Badge
                        variant={
                          record.scan_type === "ai_audit"
                            ? "info"
                            : record.scan_type === "full" ||
                                record.scan_type === "full_ai" ||
                                record.scan_type === "malware_deep"
                              ? "success"
                              : "neutral"
                        }
                      >
                        {record.scan_type === "ai_audit"
                          ? "Security Audit"
                          : record.scan_type === "malware_deep"
                            ? HISTORY_LABEL_DEEP_MALWARE
                            : record.scan_type === "full" ||
                                record.scan_type === "full_ai"
                              ? HISTORY_LABEL_FULL_AI
                              : "Quick Scan"}
                      </Badge>
                    </td>
                    <td className="flex justify-center p-4">
                      {record.security_grade ? (
                        <SentinelGradeBadge
                          grade={record.security_grade}
                          size="sm"
                        />
                      ) : (
                        <span className="text-xs font-black tracking-widest text-neutral-400 uppercase">
                          --
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center text-xs font-black text-neutral-700">
                      {record.findings_count ?? 0}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`text-xs font-black ${(record.critical_count ?? 0) > 0 ? "text-red-600" : "text-neutral-500"}`}
                      >
                        {record.critical_count ?? 0}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => onViewRecord(record)}
                        disabled={loadingRecordId === record.id}
                        className="text-swiss-navy hover:text-brand-accent inline-flex items-center gap-1 text-xs font-black tracking-widest uppercase underline underline-offset-2 transition-colors disabled:cursor-wait disabled:opacity-50"
                        aria-label={`View scan from ${record.scanned_at}`}
                      >
                        {loadingRecordId === record.id ? (
                          <>
                            <Loader
                              size={12}
                              className="animate-spin"
                              aria-hidden="true"
                            />
                            Loading...
                          </>
                        ) : (
                          "View"
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
