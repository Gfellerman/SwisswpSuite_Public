import React from "react";
import { FileText, Ban } from "lucide-react";
import { SecurityLog } from "../../../types";

export interface SecurityLogsPanelProps {
  logs: SecurityLog[];
  // BUG #4 FIX (v2.9.28.45): Restore the per-row "Ban IP" action that was lost during F-004
  // organism extraction. Free of the AI-advisor gating and the manual-IP input field, the
  // user can ban a suspicious IP directly from the log row in one click.
  onBanIp?: (ip: string) => void;
  bannedIps?: string[];
}

const severityStyles: Record<string, string> = {
  low: "border-blue-600 text-blue-600 bg-blue-50",
  medium: "border-amber-600 text-amber-600 bg-amber-50",
  high: "border-red-600 text-red-600 bg-red-50",
};

export function SecurityLogsPanel({
  logs,
  onBanIp,
  bannedIps = [],
}: SecurityLogsPanelProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
      <div className="bg-card border border-black p-6">
        <div className="flex justify-between items-center mb-8 border-b border-black pb-4">
          <h3 className="font-black text-xs uppercase tracking-widest text-black flex items-center gap-2">
            <FileText size={16} className="text-black" /> Security Event Log
          </h3>
        </div>

        <div className="border border-black overflow-hidden">
          <table className="w-full text-left text-sm font-black uppercase tracking-widest">
            <thead className="bg-background text-foreground dark:text-foreground">
              <tr className="bg-background dark:bg-secondary border-b border-border dark:border-border/10 text-left text-sm font-black tracking-widest uppercase text-neutral-700 ">
                <th className="p-4 border-r border-border dark:border-border/10 w-32">
                  Timestamp
                </th>
                <th className="p-4 border-r border-border dark:border-border/10 w-24">
                  Type
                </th>
                <th className="p-4 border-r border-border dark:border-border/10 w-32">
                  Origin
                </th>
                <th className="p-4 border-r border-border dark:border-border/10">
                  Details
                </th>
                {onBanIp && <th className="p-4 w-28 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={onBanIp ? 5 : 4}
                    className="p-8 text-center text-sm font-black uppercase tracking-widest text-neutral-500"
                  >
                    No security events recorded yet. Events will appear here as
                    your WAF and login protection activate.
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => {
                  const badgeClass =
                    severityStyles[log.severity] ??
                    "border-neutral-600 text-neutral-600 bg-neutral-50";
                  const isBlocked = log.blocked === true || log.blocked === 1;
                  const formattedDate = new Date(log.created_at).toLocaleString(
                    undefined,
                    {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  );
                  const ip = log.ip_address || "";
                  const isAlreadyBanned = ip !== "" && bannedIps.includes(ip);
                  return (
                    <tr
                      key={log.id}
                      className={index % 2 === 0 ? "bg-background" : ""}
                    >
                      <td className="p-4 border-r border-black/10 text-neutral-700 text-xs">
                        {formattedDate}
                      </td>
                      <td className="p-4 border-r border-black/10">
                        <span
                          className={`border px-2 py-0.5 text-xs font-black uppercase tracking-widest ${badgeClass}`}
                        >
                          {log.severity}
                        </span>
                      </td>
                      <td className="p-4 border-r border-black/10 text-xs font-mono">
                        {log.ip_address || "—"}
                      </td>
                      <td className="p-4 border-r border-black/10 text-xs">
                        {log.event}
                        {isBlocked && (
                          <span className="ml-2 border border-red-600 text-red-600 px-1.5 py-0.5 text-xs font-black uppercase tracking-widest bg-red-50">
                            BLOCKED
                          </span>
                        )}
                      </td>
                      {onBanIp && (
                        <td className="p-4 text-center">
                          {ip === "" ? (
                            <span className="text-xs text-neutral-400">—</span>
                          ) : isAlreadyBanned ? (
                            <span className="inline-flex items-center gap-1 border border-neutral-400 text-neutral-500 px-2 py-1 text-xs font-black uppercase tracking-widest bg-neutral-50">
                              <Ban size={12} aria-hidden="true" />
                              Banned
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onBanIp(ip)}
                              aria-label={`Ban IP address ${ip}`}
                              className="inline-flex items-center gap-1 border border-red-600 text-red-600 hover:bg-red-50 active:bg-red-100 px-2 py-1 text-xs font-black uppercase tracking-widest transition-colors focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-1"
                            >
                              <Ban size={12} aria-hidden="true" />
                              Ban IP
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs font-black text-neutral-700 uppercase tracking-widest mt-4 text-center">
          Only the most recent 50 high-priority security events are shown here.
        </p>
      </div>
    </div>
  );
}
