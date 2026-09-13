import React from "react";
import { FileText, Ban } from "lucide-react";
import { SecurityLog } from "../../../types";

export interface SecurityLogsPanelProps {
  logs: SecurityLog[];
  // BUG #4 FIX (v2.9.28.45): Restore the per-row "Ban IP" action that was lost during F-004
  // organism extraction. The user can ban a suspicious IP directly from the
  // log row in one click.
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
    <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
      <div className="bg-card border border-black p-6">
        <div className="mb-8 flex items-center justify-between border-b border-black pb-4">
          <h3 className="flex items-center gap-2 text-xs font-black tracking-widest text-black uppercase">
            <FileText size={16} className="text-black" /> Security Event Log
          </h3>
        </div>

        <div className="overflow-hidden border border-black">
          <table className="w-full text-left text-sm font-black tracking-widest uppercase">
            <thead className="bg-background text-foreground dark:text-foreground">
              <tr className="bg-background dark:bg-secondary border-border dark:border-border/10 border-b text-left text-sm font-black tracking-widest text-neutral-700 uppercase">
                <th className="border-border dark:border-border/10 w-32 border-r p-4">
                  Timestamp
                </th>
                <th className="border-border dark:border-border/10 w-24 border-r p-4">
                  Type
                </th>
                <th className="border-border dark:border-border/10 w-32 border-r p-4">
                  Origin
                </th>
                <th className="border-border dark:border-border/10 border-r p-4">
                  Details
                </th>
                {onBanIp && <th className="w-28 p-4 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={onBanIp ? 5 : 4}
                    className="p-8 text-center text-sm font-black tracking-widest text-neutral-500 uppercase"
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
                    }
                  );
                  const ip = log.ip_address || "";
                  const isAlreadyBanned = ip !== "" && bannedIps.includes(ip);
                  return (
                    <tr
                      key={log.id}
                      className={index % 2 === 0 ? "bg-background" : ""}
                    >
                      <td className="border-r border-black/10 p-4 text-xs text-neutral-700">
                        {formattedDate}
                      </td>
                      <td className="border-r border-black/10 p-4">
                        <span
                          className={`border px-2 py-0.5 text-xs font-black tracking-widest uppercase ${badgeClass}`}
                        >
                          {log.severity}
                        </span>
                      </td>
                      <td className="border-r border-black/10 p-4 font-mono text-xs">
                        {log.ip_address || "—"}
                      </td>
                      <td className="border-r border-black/10 p-4 text-xs">
                        {log.event}
                        {isBlocked && (
                          <span className="ml-2 border border-red-600 bg-red-50 px-1.5 py-0.5 text-xs font-black tracking-widest text-red-600 uppercase">
                            BLOCKED
                          </span>
                        )}
                      </td>
                      {onBanIp && (
                        <td className="p-4 text-center">
                          {ip === "" ? (
                            <span className="text-xs text-neutral-400">—</span>
                          ) : isAlreadyBanned ? (
                            <span className="inline-flex items-center gap-1 border border-neutral-400 bg-neutral-50 px-2 py-1 text-xs font-black tracking-widest text-neutral-500 uppercase">
                              <Ban size={12} aria-hidden="true" />
                              Banned
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onBanIp(ip)}
                              aria-label={`Ban IP address ${ip}`}
                              className="inline-flex items-center gap-1 border border-red-600 px-2 py-1 text-xs font-black tracking-widest text-red-600 uppercase transition-colors hover:bg-red-50 focus:ring-2 focus:ring-red-600 focus:ring-offset-1 focus:outline-none active:bg-red-100"
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
        <p className="mt-4 text-center text-xs font-black tracking-widest text-neutral-700 uppercase">
          Only the most recent 20 high-priority security events are shown here.
        </p>
      </div>
    </div>
  );
}
