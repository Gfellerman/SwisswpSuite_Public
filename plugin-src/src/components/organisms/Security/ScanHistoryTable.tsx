/**
 * ScanHistoryTable — extracted from SecurityHub.tsx (HIGH-36)
 * Renders the History tab: scan records table with Pro gating.
 */
import React from "react";
import { History, Lock, Loader } from "lucide-react";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { SentinelGradeBadge } from "../Sentinel/SentinelGradeBadge";
import { ScanHistoryRecord } from "../../../types";

interface ScanHistoryTableProps {
  scanHistory: ScanHistoryRecord[];
  hasSentinelPro: boolean;
  loadingRecordId: number | null;
  onRefresh: () => void;
  onViewRecord: (record: ScanHistoryRecord) => void;
}

export const ScanHistoryTable: React.FC<ScanHistoryTableProps> = ({
  scanHistory,
  hasSentinelPro,
  loadingRecordId,
  onRefresh,
  onViewRecord,
}) => {
  const visibleRecords = hasSentinelPro ? scanHistory : scanHistory.slice(0, 1);
  const hiddenCount = scanHistory.length - 1;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
      <div className="bg-card border border-black p-6">
        <div className="flex justify-between items-center mb-8 border-b border-black pb-4">
          <h3 className="font-black text-xs uppercase tracking-widest text-black flex items-center gap-2">
            <History size={16} className="text-black" aria-hidden="true" />
            Scan History
          </h3>
          <Button
            variant="ghost"
            onClick={onRefresh}
            className="text-sm font-black uppercase tracking-widest hover:bg-background"
            aria-label="Refresh scan history"
          >
            Refresh
          </Button>
        </div>

        {!hasSentinelPro && (
          <div className="mb-6 flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <Lock
              size={16}
              className="text-amber-600 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-amber-700 mb-1">
                Pro Feature
              </p>
              <p className="text-xs font-medium text-amber-700">
                Pro users can view their full scan history and re-inspect
                previous reports.{" "}
                <a
                  href="https://swisswpsecure.com/products"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 font-black"
                >
                  Upgrade to Pro
                </a>
              </p>
            </div>
          </div>
        )}

        <div className="border border-black overflow-hidden">
          <table
            className="w-full text-left text-sm font-black uppercase tracking-widest"
            aria-label="Scan history"
          >
            <thead className="bg-background text-foreground dark:text-foreground">
              <tr className="bg-background dark:bg-secondary border-b border-border dark:border-border/10 text-left text-sm font-black tracking-widest uppercase text-neutral-700">
                <th className="p-4 border-r border-border dark:border-border/10">
                  Date
                </th>
                <th className="p-4 border-r border-border dark:border-border/10">
                  Type
                </th>
                <th className="p-4 border-r border-border dark:border-border/10 text-center">
                  Grade
                </th>
                <th className="p-4 border-r border-border dark:border-border/10 text-center">
                  Findings
                </th>
                <th className="p-4 border-r border-border dark:border-border/10 text-center">
                  Critical
                </th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {visibleRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-12 text-center text-neutral-500 text-xs font-black uppercase tracking-widest"
                  >
                    No scan history yet. Run a scan to start tracking
                    your security posture.
                  </td>
                </tr>
              ) : (
                visibleRecords.map((record) => (
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
                            ? "Deep Malware"
                            : record.scan_type === "full" ||
                                record.scan_type === "full_ai"
                              ? "Full + AI"
                              : "Quick Scan"}
                      </Badge>
                    </td>
                    <td className="p-4 flex justify-center">
                      {record.security_grade ? (
                        <SentinelGradeBadge
                          grade={record.security_grade}
                          size="sm"
                        />
                      ) : (
                        <span className="text-xs text-neutral-400 font-black uppercase tracking-widest">
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
                        className="text-xs font-black uppercase tracking-widest text-swiss-navy hover:text-brand-accent transition-colors underline underline-offset-2 disabled:opacity-50 disabled:cursor-wait inline-flex items-center gap-1"
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

        {/* Upgrade CTA for free users with more than 1 scan */}
        {!hasSentinelPro && hiddenCount > 0 && (
          <div className="mt-4 p-4 bg-background border border-border rounded-xl text-center">
            <p className="text-xs font-black uppercase tracking-widest text-neutral-500">
              {hiddenCount} older scan{hiddenCount !== 1 ? "s" : ""} hidden.{" "}
              <a
                href="https://swisswpsecure.com/products"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-accent underline underline-offset-2 hover:text-swiss-navy"
              >
                Upgrade to Pro
              </a>{" "}
              to view full history.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
