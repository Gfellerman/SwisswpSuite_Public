/**
 * ScanHistoryTable — extracted from SecurityHub.tsx (HIGH-36)
 * Renders the History tab: the full scan-records table. The server returns
 * the whole window, so the table shows every row it is given.
 */
import React from "react";
import { History, Loader } from "lucide-react";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { SentinelGradeBadge } from "../Sentinel/SentinelGradeBadge";
import { ScanHistoryRecord } from "../../../types";
import { getScanHistoryBadge } from "./scanHistoryBadge";

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
                      {(() => {
                        const badge = getScanHistoryBadge(record.scan_type);
                        return (
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        );
                      })()}
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
