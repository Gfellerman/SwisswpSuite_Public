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

/**
 * N3 fix (Free Audit #1 / Package C, 2026-08-12): System Logs previously
 * rendered every line — INFO, WARNING, ERROR — with identical styling
 * (text-emerald-400/80), so a failed daily scan-report email (see F6) was
 * invisible unless an admin manually read every line. Log lines are raw
 * strings in the fixed "[TIMESTAMP] [LEVEL] [MODULE] Message" format (see
 * SwissWPSuite_Diagnostics::log() docblock in class-swisswpsuite-core.php),
 * so the level is parsed directly out of the text rather than requiring a
 * backend contract change. Colors follow the AA-safe light/dark pairing
 * already used by SEVERITY_STYLES above (red-700/amber-800 in light mode —
 * the default red-500/amber-500 fail WCAG AA against this panel's light
 * `bg-card`; red-400/amber-400 in dark mode). This is a visual enhancement
 * layered on top of the existing `[ERROR]`/`[WARNING]` text tag already in
 * every line, not the sole indicator (WCAG 1.4.1 — color is never the only
 * cue), so no new aria-* attributes are needed.
 */
function getLogLineClass(log: string): string {
  if (/\[ERROR\]/.test(log)) {
    return "text-red-700 dark:text-red-400 font-semibold";
  }
  if (/\[WARNING\]/.test(log)) {
    return "text-amber-800 dark:text-amber-400 font-semibold";
  }
  return "text-emerald-400/80 hover:text-emerald-300";
}

interface MaintenanceSettingsProps {
  settings?: SwissSettings;
  onSave?: (settings: Partial<SwissSettings>) => Promise<any>;
  isSaving?: boolean;
}

/**
 * OrphanedTablesConfirmDialog — the missing second step of the
 * drop-orphaned-tables flow (D-K-5). Minimal inline confirmation modal;
 * reuses the a11y pattern established by HardeningConfirmDialog.tsx /
 * BulkAiConfirmModal.tsx (role=dialog, aria-modal, Escape-to-cancel)
 * without pulling in either component's heavier, differently-shaped data
 * contract. This is a genuinely destructive DROP TABLE action — the
 * dialog exists specifically so a user reviews the exact table names
 * before they are dropped, never auto-confirmed.
 */
interface OrphanedTablesConfirmDialogProps {
  candidates: string[] | null;
  onConfirm: () => void;
  onCancel: () => void;
}
function OrphanedTablesConfirmDialog({
  candidates,
  onConfirm,
  onCancel,
}: OrphanedTablesConfirmDialogProps) {
  useEffect(() => {
    if (!candidates) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [candidates, onCancel]);

  if (!candidates) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="orphan-tables-confirm-title"
        aria-describedby="orphan-tables-confirm-body"
        className="border-border dark:bg-card w-full max-w-md rounded-2xl border bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3
            id="orphan-tables-confirm-title"
            className="dark:text-foreground text-base font-black text-neutral-900"
          >
            Drop {candidates.length} orphaned table
            {candidates.length !== 1 ? "s" : ""}?
          </h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel"
            className="hover:bg-secondary focus-visible:ring-swiss-navy shrink-0 rounded-full p-1 focus-visible:ring-2 focus-visible:outline-none"
          >
            <AlertTriangle
              size={16}
              className="text-red-500"
              aria-hidden="true"
            />
          </button>
        </div>
        <p
          id="orphan-tables-confirm-body"
          className="mb-3 text-sm text-neutral-700 dark:text-neutral-300"
        >
          These tables were left behind by uninstalled plugins and matched no
          installed plugin on this site. This cannot be undone — back up your
          database first.
        </p>
        <ul
          className="bg-background dark:bg-card/30 mb-4 max-h-40 space-y-1 overflow-y-auto rounded-lg p-3 font-mono text-xs"
          aria-label="Tables that will be dropped"
        >
          {candidates.map((table) => (
            <li key={table} className="text-neutral-800 dark:text-neutral-200">
              {table}
            </li>
          ))}
        </ul>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="border-border hover:bg-secondary focus-visible:ring-swiss-navy rounded-xl border px-4 py-2 text-sm font-black text-neutral-700 focus-visible:ring-2 focus-visible:outline-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className="focus-visible:ring-swiss-navy rounded-xl bg-red-600 px-4 py-2 text-sm font-black text-white hover:bg-red-700 focus-visible:ring-2 focus-visible:outline-none"
          >
            Drop {candidates.length === 1 ? "table" : "tables"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function MaintenanceSettings({
  settings,
  onSave,
  isSaving,
}: MaintenanceSettingsProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  // ARS Round D (D-K-5, WP.org R4 F-11/F-17, 2026-08-2x): "Drop Orphaned
  // Tables" is a genuine two-step DROP TABLE action backend-side
  // (class-swisswpsuite-api-settings.php's perform_maintenance() — a first
  // call with no confirm_tables is ALWAYS a dry run) but this component
  // never sent the second confirm_tables request, so the button could
  // never actually drop a table — see
  // handoff/L-B_orphaned-tables-ui-contract.md. This holds the dry-run
  // candidate list between the two requests; non-null shows the confirm
  // dialog.
  const [orphanTableCandidates, setOrphanTableCandidates] = useState<
    string[] | null
  >(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [systemWarnings, setSystemWarnings] = useState<SystemLogsWarning[]>([]);

  // Cache Manager state
  const [cacheStatus, setCacheStatus] = useState<CacheStatusResponse | null>(
    null
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
        }
      );
      if (data.success) {
        toast.success(data.message || "Done.");
      } else {
        toast.error("Failed: " + data.message);
      }
    } catch (e: any) {
      toast.error(
        "Maintenance action failed: " + (e.message || "Unknown error")
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

  // ARS Round D (D-K-5): step 1 — dry run. The backend NEVER drops a table
  // on this call (no confirm_tables sent); it returns the candidate list.
  const handleDropOrphanedTables = async () => {
    setActionLoading("drop_orphaned_tables");
    try {
      const data = await wpApi<{
        success: boolean;
        message: string;
        dry_run: boolean;
        candidates: string[];
      }>("/maintenance", {
        method: "POST",
        body: JSON.stringify({ action: "drop_orphaned_tables" }),
      });
      if (!data.success) {
        toast.error("Failed: " + data.message);
        return;
      }
      if (data.candidates && data.candidates.length > 0) {
        setOrphanTableCandidates(data.candidates);
      } else {
        // Nothing to confirm — surface the backend's own message
        // ("No orphaned tables found." or the ambiguous-skip note).
        toast.success(data.message || "No orphaned tables found.");
      }
    } catch (e: any) {
      toast.error(
        "Maintenance action failed: " + (e.message || "Unknown error")
      );
    } finally {
      setActionLoading(null);
    }
  };

  // Step 2 — the explicit confirm. Resends the EXACT candidate list step 1
  // returned, per the backend contract (confirm_tables must match a
  // current candidate name to be dropped; anything else is ignored).
  const confirmDropOrphanedTables = async () => {
    const candidates = orphanTableCandidates;
    if (!candidates) return;
    setOrphanTableCandidates(null);
    setActionLoading("drop_orphaned_tables");
    try {
      const data = await wpApi<{ success: boolean; message: string }>(
        "/maintenance",
        {
          method: "POST",
          body: JSON.stringify({
            action: "drop_orphaned_tables",
            confirm_tables: candidates,
          }),
        }
      );
      if (data.success) {
        toast.success(data.message || "Done.");
      } else {
        toast.error("Failed: " + data.message);
      }
    } catch (e: any) {
      toast.error(
        "Maintenance action failed: " + (e.message || "Unknown error")
      );
    } finally {
      setActionLoading(null);
    }
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
                  className={`mt-0.5 h-4 w-4 shrink-0 ${styles.icon}`}
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
        <div className="border-border dark:border-border mb-4 flex items-center gap-2 border-b pb-4">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <h3 className="text-base font-semibold">Maintenance Tools</h3>
        </div>
        <div className="space-y-3">
          {MAINTENANCE_ACTIONS.map((tool) => (
            <div
              key={tool.id}
              className="bg-background dark:bg-card/30 border-border dark:border-border flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium">{tool.label}</p>
                <p className="mt-0.5 text-xs text-neutral-700">{tool.desc}</p>
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
        <div className="border-border dark:border-border mb-4 flex items-center gap-2 border-b pb-4">
          <Trash2 className="h-4 w-4 text-red-500" />
          <h3 className="text-base font-semibold">Database Cleanup</h3>
          <span className="ml-auto text-xs text-neutral-500">
            Removes orphaned data that accumulates over time
          </span>
        </div>
        <div className="space-y-3">
          {DATABASE_CLEANUP_ACTIONS.map((tool) => (
            <div
              key={tool.id}
              className="bg-background dark:bg-card/30 border-border dark:border-border flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium">{tool.label}</p>
                <p className="mt-0.5 text-xs text-neutral-700">{tool.desc}</p>
              </div>
              <Button
                variant="outline"
                onClick={() =>
                  // ARS Round D (D-K-5): drop_orphaned_tables is a real
                  // two-step DROP TABLE flow (dry run -> review -> confirm
                  // with the exact candidate list), not the generic
                  // blind "are you sure" toast every other cleanup action
                  // uses — that toast can never populate confirm_tables.
                  tool.id === "drop_orphaned_tables"
                    ? handleDropOrphanedTables()
                    : handleMaintenance(tool.id)
                }
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
        <div className="border-border dark:border-border mb-4 flex items-center gap-2 border-b pb-4">
          <Trash2 className="h-4 w-4 text-blue-500" />
          <h3 className="text-base font-semibold">Cache Management</h3>
        </div>
        <div className="bg-background dark:bg-card/30 border-border dark:border-border flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Clear Site Cache</p>
            <p className="text-xs text-neutral-700">
              Purge all server and plugin caches. Detected:{" "}
              <span className="dark:text-foreground font-semibold text-neutral-900">
                {cacheStatus
                  ? cacheStatus.plugin ||
                    cacheStatus.managed_host ||
                    "WordPress Object Cache"
                  : "Checking..."}
              </span>
            </p>
            {cacheStatus && (
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-neutral-600">
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
                  <span className="font-medium text-amber-600">
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
        <div className="border-border dark:border-border bg-background dark:bg-card/50 flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-neutral-700" />
            <h3 className="text-base font-semibold">System Logs</h3>
            <span className="ml-1 text-xs tracking-widest text-neutral-700 uppercase">
              Live · 5s refresh
            </span>
          </div>
          <button
            onClick={fetchLogs}
            className="hover:bg-muted dark:hover:bg-muted rounded-lg p-2 transition-colors"
            title="Refresh logs"
          >
            <RefreshCw
              className={`h-4 w-4 text-neutral-700 ${loadingLogs ? "animate-spin" : ""}`}
            />
          </button>
        </div>
        <div className="bg-card h-64 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed">
          {logs.length === 0 ? (
            <div className="pt-8 text-center text-xs tracking-widest text-neutral-700 uppercase italic">
              No log entries found.
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log, i) => (
                <div
                  key={i}
                  className={`flex gap-3 transition-colors ${getLogLineClass(log)}`}
                >
                  <span className="shrink-0 text-neutral-600">[{i + 1}]</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <OrphanedTablesConfirmDialog
        candidates={orphanTableCandidates}
        onConfirm={confirmDropOrphanedTables}
        onCancel={() => setOrphanTableCandidates(null)}
      />
    </div>
  );
}
