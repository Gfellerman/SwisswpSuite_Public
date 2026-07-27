/**
 * AGENT: frontend-specialist
 * Skills: react-patterns, ui-ux-pro-max
 * Date: 2026-02-19
 *
 * Maintenance Tools + System Logs
 * Migrated from legacy Settings.tsx (v2.8.8)
 */

import { useState, useEffect } from "react";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { wpApi } from "../../../services/api";
import { toast } from "sonner";
import {
  AlertTriangle,
  AlertCircle,
  Terminal,
  RefreshCw,
  Trash2,
} from "lucide-react";
import type {
  CacheStatusResponse,
  CachePurgeResponse,
  SystemLogsWarning,
} from "../../../types";

import { SwissSettings } from "../../../hooks/useSettings";

const MAINTENANCE_ACTIONS = [
  {
    id: "clear_transients",
    label: "Clear Transients",
    desc: "Removes expired temporary data from the database.",
  },
  {
    id: "delete_revisions",
    label: "Delete Post Revisions",
    desc: "Removes old post revision history to save space.",
  },
  {
    id: "spam_comments",
    label: "Delete Spam Comments",
    desc: "Permanently deletes all comments marked as spam.",
  },
  {
    id: "optimize_db",
    label: "Optimize Database Tables",
    desc: "Runs SQL OPTIMIZE on all site tables to reclaim disk space.",
  },
];

const DATABASE_CLEANUP_ACTIONS = [
  {
    id: "clean_orphan_postmeta",
    label: "Clean Orphaned Post Meta",
    desc: "Removes metadata left behind by deleted posts. These entries are unreachable and waste space.",
  },
  {
    id: "clean_orphan_commentmeta",
    label: "Clean Orphaned Comment Meta",
    desc: "Removes metadata left behind by deleted comments.",
  },
  {
    id: "clean_trashed_posts",
    label: "Empty Trash",
    desc: "Permanently deletes all posts and pages currently in the trash.",
  },
  {
    id: "clean_auto_drafts",
    label: "Delete Auto-Drafts",
    desc: "Removes auto-draft posts created when opening the editor without publishing.",
  },
  {
    id: "clean_orphan_relationships",
    label: "Clean Orphaned Term Relationships",
    desc: "Removes category/tag associations pointing to posts that no longer exist.",
  },
  {
    id: "drop_orphaned_tables",
    label: "Drop Orphaned Tables",
    desc: "Drops database tables left behind by uninstalled plugins. Core tables and tables belonging to active plugins are never touched. Back up your database first.",
  },
];

const SEVERITY_STYLES: Record<
  "low" | "medium" | "high",
  { banner: string; icon: string }
> = {
  low: {
    banner:
      "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
    icon: "text-amber-500",
  },
  medium: {
    banner:
      "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800",
    icon: "text-orange-500",
  },
  high: {
    banner: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
    icon: "text-red-500",
  },
};

interface MaintenanceSettingsProps {
  settings?: SwissSettings;
  onSave?: (settings: Partial<SwissSettings>) => Promise<any>;
  isSaving?: boolean;
}

export function MaintenanceSettings({
  settings,
  onSave,
  isSaving,
}: MaintenanceSettingsProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [systemWarnings, setSystemWarnings] = useState<SystemLogsWarning[]>([]);

  // Cache Manager state
  const [cacheStatus, setCacheStatus] = useState<CacheStatusResponse | null>(
    null,
  );
  const [cachePurging, setCachePurging] = useState(false);

  const fetchCacheStatus = async () => {
    try {
      const data = await wpApi<CacheStatusResponse>("/cache/status");
      setCacheStatus(data);
    } catch (e) {
      // SET-017 FIX: Suppress console noise in production. fetchLogs runs on a
      // 5s interval — a persistent error (401, network outage) would otherwise
      // spam the browser console. Guarded by DEV flag so devs still see issues.
      if (import.meta.env.DEV) {
        console.error("Failed to fetch cache status", e);
      }
    }
  };

  const handleCachePurge = async () => {
    setCachePurging(true);
    try {
      const data = await wpApi<CachePurgeResponse>("/cache/purge", {
        method: "POST",
      });
      if (data.success) {
        toast.success(data.message || "Cache purged successfully.");
      } else {
        toast.error(data.message || "Cache purge failed.");
      }
      // Refresh status to update cooldown timer
      await fetchCacheStatus();
    } catch (e: any) {
      if (e.status === 429) {
        toast.error("Rate limited. Please wait before purging again.");
      } else {
        toast.error("Cache purge failed: " + (e.message || "Unknown error"));
      }
    } finally {
      setCachePurging(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await wpApi<{
        logs: string[];
        warnings?: SystemLogsWarning[];
      }>("/system-logs");
      if (data.logs) setLogs(data.logs);
      if (data.warnings) setSystemWarnings(data.warnings);
    } catch (e) {
      // SET-017 FIX: This runs every 5s via the interval below. In production,
      // a persistent fetch error (e.g. session expired) would spam the console.
      // Keep logging for local dev only.
      if (import.meta.env.DEV) {
        console.error("Failed to fetch logs", e);
      }
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchCacheStatus();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const doMaintenance = async (action: string) => {
    setActionLoading(action);
    try {
      const data = await wpApi<{ success: boolean; message: string }>(
        "/maintenance",
        {
          method: "POST",
          body: JSON.stringify({ action }),
        },
      );
      if (data.success) {
        toast.success(data.message || "Done.");
      } else {
        toast.error("Failed: " + data.message);
      }
    } catch (e: any) {
      toast.error(
        "Maintenance action failed: " + (e.message || "Unknown error"),
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleMaintenance = (action: string) => {
    toast.warning("Are you sure? This action cannot be undone.", {
      duration: 15000,
      action: {
        label: "Confirm",
        onClick: () => doMaintenance(action),
      },
    });
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* System Warnings Banner */}
      {systemWarnings.length > 0 && (
        <div
          role="status"
          aria-live="polite"
          aria-label="System warnings"
          className="space-y-2"
        >
          {systemWarnings.map((warning) => {
            const styles = SEVERITY_STYLES[warning.severity];
            return (
              <div
                key={warning.code}
                className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${styles.banner}`}
              >
                <AlertCircle
                  className={`w-4 h-4 mt-0.5 shrink-0 ${styles.icon}`}
                  aria-hidden="true"
                />
                <p className="text-sm leading-relaxed text-neutral-800 dark:text-neutral-200">
                  {warning.message}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Maintenance Tools */}
      <Card className="p-6">
        <div className="flex items-center gap-2 pb-4 mb-4 border-b border-border dark:border-border">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h3 className="font-semibold text-base">Maintenance Tools</h3>
        </div>
        <div className="space-y-3">
          {MAINTENANCE_ACTIONS.map((tool) => (
            <div
              key={tool.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-background dark:bg-card/30 rounded-xl border border-border dark:border-border"
            >
              <div>
                <p className="font-medium text-sm">{tool.label}</p>
                <p className="text-xs text-neutral-700 mt-0.5">{tool.desc}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => handleMaintenance(tool.id)}
                loading={actionLoading === tool.id}
                className="min-h-[40px] shrink-0"
              >
                Run
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Database Cleanup */}
      <Card className="p-6">
        <div className="flex items-center gap-2 pb-4 mb-4 border-b border-border dark:border-border">
          <Trash2 className="w-4 h-4 text-red-500" />
          <h3 className="font-semibold text-base">Database Cleanup</h3>
          <span className="text-xs text-neutral-500 ml-auto">
            Removes orphaned data that accumulates over time
          </span>
        </div>
        <div className="space-y-3">
          {DATABASE_CLEANUP_ACTIONS.map((tool) => (
            <div
              key={tool.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-background dark:bg-card/30 rounded-xl border border-border dark:border-border"
            >
              <div>
                <p className="font-medium text-sm">{tool.label}</p>
                <p className="text-xs text-neutral-700 mt-0.5">{tool.desc}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => handleMaintenance(tool.id)}
                loading={actionLoading === tool.id}
                className="min-h-[40px] shrink-0"
              >
                Clean
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Cache Management (FREE TIER) */}
      <Card className="p-6">
        <div className="flex items-center gap-2 pb-4 mb-4 border-b border-border dark:border-border">
          <Trash2 className="w-4 h-4 text-blue-500" />
          <h3 className="font-semibold text-base">Cache Management</h3>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-background dark:bg-card/30 rounded-xl border border-border dark:border-border">
          <div className="space-y-1.5">
            <p className="font-medium text-sm">Clear Site Cache</p>
            <p className="text-xs text-neutral-700">
              Purge all server and plugin caches. Detected:{" "}
              <span className="font-semibold text-neutral-900 dark:text-foreground">
                {cacheStatus
                  ? cacheStatus.plugin ||
                    cacheStatus.managed_host ||
                    "WordPress Object Cache"
                  : "Checking..."}
              </span>
            </p>
            {cacheStatus && (
              <div className="flex flex-wrap gap-3 text-xs text-neutral-600 mt-1">
                <span>
                  Object Cache:{" "}
                  <span className="font-medium">
                    {cacheStatus.object_cache}
                  </span>
                </span>
                <span>
                  OPcache:{" "}
                  <span className="font-medium">
                    {cacheStatus.opcache_enabled ? "Active" : "Inactive"}
                  </span>
                </span>
                {cacheStatus.cooldown_remaining > 0 && (
                  <span className="text-amber-600 font-medium">
                    Cooldown: {cacheStatus.cooldown_remaining}s
                  </span>
                )}
              </div>
            )}
          </div>
          <Button
            variant="primary"
            onClick={handleCachePurge}
            loading={cachePurging}
            disabled={
              cachePurging ||
              (cacheStatus !== null && cacheStatus.cooldown_remaining > 0)
            }
            className="min-h-[40px] shrink-0"
          >
            Clear Cache
          </Button>
        </div>
      </Card>

      {/* System Logs */}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border dark:border-border bg-background dark:bg-card/50">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-neutral-700" />
            <h3 className="font-semibold text-base">System Logs</h3>
            <span className="text-xs text-neutral-700 uppercase tracking-widest ml-1">
              Live · 5s refresh
            </span>
          </div>
          <button
            onClick={fetchLogs}
            className="p-2 rounded-lg hover:bg-muted dark:hover:bg-muted transition-colors"
            title="Refresh logs"
          >
            <RefreshCw
              className={`w-4 h-4 text-neutral-700 ${loadingLogs ? "animate-spin" : ""}`}
            />
          </button>
        </div>
        <div className="bg-card h-64 overflow-y-auto font-mono text-[11px] leading-relaxed p-4">
          {logs.length === 0 ? (
            <div className="text-neutral-700 italic text-center pt-8 uppercase tracking-widest text-xs">
              No log entries found.
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log, i) => (
                <div
                  key={i}
                  className="flex gap-3 text-emerald-400/80 hover:text-emerald-300 transition-colors"
                >
                  <span className="text-neutral-600 shrink-0">[{i + 1}]</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
