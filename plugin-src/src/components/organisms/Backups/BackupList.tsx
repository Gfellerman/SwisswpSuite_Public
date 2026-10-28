// frontend-specialist fix: atoms/ → ui/ to eliminate cva TDZ in shared chunk
import React, { useEffect, useState } from "react";
import { Card } from "../../ui/Card";
import { Badge } from "../../ui/Badge";
import {
  useBackups,
  useBackupSets,
  useOrphanBackups,
  useCleanupOrphans,
} from "../../../hooks/useBackups";
import {
  Download,
  RotateCcw,
  Trash2,
  HardDrive,
  Calendar,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
  Layers,
  Info,
  X,
} from "lucide-react";
import { BackupArchive, BackupSet } from "../../../types";
import { toast } from "../../../lib/toast";

// ── Scope badge ───────────────────────────────────────────────────────────────
const SCOPE_LABEL: Record<string, string> = {
  full: "Full Backup",
  db: "Database",
  files: "Files Only",
};

const SCOPE_BADGE_CLASS: Record<string, string> = {
  full: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  db: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  files: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const scopeBadge = (scope: string) => (
  <span
    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SCOPE_BADGE_CLASS[scope] ?? "bg-neutral-100 text-neutral-700"}`}
  >
    {SCOPE_LABEL[scope] ?? scope}
  </span>
);

// ── Restore confirmation for a database-only backup ──────────────────────────
// Restore writes files only; a backup that holds nothing but a database copy
// changes nothing on the site.
const DB_ONLY_RESTORE_CONFIRM =
  "This backup holds only a database copy, which this plugin does not import. Your posts, pages and files will not change.";

// ── Storage badge ────────────────────────────────────────────────────────────
// Every backup this build writes is stored on the site's own server.
const localStorageBadge = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
    <HardDrive className="h-3 w-3" aria-hidden="true" />
    Local
  </span>
);

// A single-file restore and a set restore hold independent notice state
// (restoreNotice / restoreSetNotice) and can each carry different, honest
// text about the SAME event: a set restore's own db+plugins summary lands
// in restoreSetNotice, while the list endpoint's persisted missing-plugins
// report can independently refill restoreNotice moments later. Neither
// carrier is ever wrong — dropping either one hides real information, so
// both are shown: the containing (longer) text when one is a superset of
// the other, or both joined when neither contains the other.
function composeRestoreNotices(
  restoreSetNotice: string | null,
  restoreNotice: string | null
): string | null {
  if (!restoreSetNotice) return restoreNotice;
  if (!restoreNotice) return restoreSetNotice;
  if (restoreSetNotice === restoreNotice) return restoreSetNotice;
  if (restoreSetNotice.includes(restoreNotice)) return restoreSetNotice;
  if (restoreNotice.includes(restoreSetNotice)) return restoreNotice;
  return `${restoreSetNotice} ${restoreNotice}`;
}

export const BackupList: React.FC = () => {
  const {
    backups,
    isLoading,
    loadError,
    restoreBackup,
    isRestoring,
    restoringFilename,
    deleteBackup,
    isDeleting,
    downloadBackup,
    isDownloading,
    downloadingFilename,
    restoreNotice,
    clearRestoreNotice,
    resetRestoreNotice,
  } = useBackups();
  const {
    sets,
    restoreSet,
    isRestoringSet,
    restoringSetId,
    deleteSet,
    isDeletingSet,
    deletingSetId,
    restoreSetNotice,
    clearRestoreSetNotice,
  } = useBackupSets();

  // Every restore in this build restores files only — the database copy
  // inside a backup is never imported — so this notice always carries
  // that honest text here. Single-file and set-level restores hold
  // independent notice state in their respective hooks. A set-in-place
  // restore reliably populates BOTH carriers (the set summary and the
  // refilled per-file report), so composeRestoreNotices() below combines
  // them rather than picking one.
  const activeRestoreNotice = composeRestoreNotices(
    restoreSetNotice,
    restoreNotice
  );
  const dismissActiveRestoreNotice = () => {
    clearRestoreNotice();
    clearRestoreSetNotice();
  };

  // a11y-engineer review (W6-A): the visible banner below is NOT the live
  // region. It mounts and is populated in the same render, which NVDA/JAWS
  // can miss (the established "two-step" pattern). This always-mounted sr-only
  // span is the actual announcement target — cleared then re-populated one
  // tick later so assistive tech observes a real mutation.
  const [restoreAnnouncement, setRestoreAnnouncement] = useState("");
  useEffect(() => {
    if (!activeRestoreNotice) return;
    setRestoreAnnouncement("");
    const t = setTimeout(() => setRestoreAnnouncement(activeRestoreNotice), 0);
    return () => clearTimeout(t);
  }, [activeRestoreNotice]);
  const { data: orphanData } = useOrphanBackups();
  const cleanupMutation = useCleanupOrphans();

  // Every file name a set lists, in both spellings (with and without ".enc"),
  // so an archive that belongs to a set is shown inside that set only.
  const setFileNames = new Set<string>();
  for (const set of sets) {
    for (const file of set.files ?? []) {
      setFileNames.add(file.filename);
      setFileNames.add(
        file.filename.endsWith(".enc")
          ? file.filename.slice(0, -4)
          : `${file.filename}.enc`
      );
    }
  }
  // Archives no set lists, such as backup files copied into the folder by hand.
  const looseBackups = backups.filter((b) => !setFileNames.has(b.name));

  // Expand/collapse state for set rows — keyed by set ID.
  const [expandedSets, setExpandedSets] = useState<Set<string>>(new Set());

  const toggleExpand = (setId: string) => {
    setExpandedSets((prev) => {
      const next = new Set(prev);
      if (next.has(setId)) {
        next.delete(setId);
      } else {
        next.add(setId);
      }
      return next;
    });
  };

  // Helper to format nice dates
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const handleRestore = (backup: BackupArchive) => {
    toast.warning(
      // STEP 4.2 (v2.9.33.61): this build restores files only. The
      // database copy inside a backup is never imported, so this confirm
      // text must not promise otherwise (WP.org R15 transparency doctrine
      // — the user must always know what is going on).
      backup.type === "db"
        ? DB_ONLY_RESTORE_CONFIRM
        : `This will replace your current files with the files in the backup file ${backup.name}. Your existing files will be overwritten. If it holds a database copy, that copy is not imported; your current database is not replaced. This cannot be undone.`,
      {
        action: {
          label: "Yes, restore from this backup",
          onClick: () => {
            // A still-showing set-restore notice must not be joined to
            // this restore's own result by composeRestoreNotices() below.
            clearRestoreSetNotice();
            restoreBackup({ filename: backup.name });
          },
        },
      }
    );
  };

  const handleDelete = (backup: BackupArchive) => {
    toast.warning(
      `Delete the backup file ${backup.name}? This cannot be undone.`,
      {
        action: {
          label: "Yes, delete this file",
          onClick: () => deleteBackup({ filename: backup.name }),
        },
      }
    );
  };

  // ── Set-level actions ───────────────────────────────────────────────────────

  const handleRestoreSet = (set: BackupSet) => {
    toast.warning(
      // STEP 4.2 (v2.9.33.61): same correction as handleRestore() above —
      // this build restores files only, and the database copy inside a set
      // is never imported.
      set.scope === "db"
        ? DB_ONLY_RESTORE_CONFIRM
        : `Restore the backup created ${formatDate(set.created_at)}? This backup set has ${set.file_count} archive file${set.file_count !== 1 ? "s" : ""}; the site files in it will be restored to disk. If it also holds a database copy, that copy is not imported; your current database is not replaced. This cannot be undone.`,
      {
        action: {
          label: "Yes, restore this backup",
          onClick: () => {
            // A still-showing single-file restore notice must not be
            // joined to this restore's own result by composeRestoreNotices()
            // below.
            resetRestoreNotice();
            restoreSet(set.id);
          },
        },
      }
    );
  };

  const handleDeleteSet = (set: BackupSet) => {
    toast.warning(
      `Delete the backup set from ${formatDate(set.created_at)}? All ${set.file_count} file${set.file_count !== 1 ? "s" : ""} (${set.human_size}) will be permanently removed.`,
      {
        action: {
          label: "Yes, delete this set",
          onClick: () => deleteSet(set.id),
        },
      }
    );
  };

  const formatTrigger = (set: BackupSet) => {
    switch (set.trigger) {
      case "scheduled":
        return "Scheduled";
      default:
        return "Manual";
    }
  };

  const getBadgeType = (type: string) => {
    switch (type) {
      case "full":
        return "success";
      case "db":
        return "info";
      case "files":
        return "warning";
      default:
        return "neutral";
    }
  };

  const getBadgeLabel = (type: string) => {
    switch (type) {
      case "full":
        return "Full";
      case "db":
        return "Database";
      case "files":
        return "Files Only";
      case "unknown":
        return "Contents not checked";
      default:
        return type;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "full":
        return "Full backup";
      case "db":
        return "Posts & settings";
      case "files":
        return "Files only";
      case "unknown":
        return "Backup file";
      default:
        return type;
    }
  };

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-border dark:border-border border-b p-6">
        <h2 className="dark:text-foreground flex items-center gap-2 text-lg font-semibold text-gray-900">
          <HardDrive className="text-muted-foreground h-5 w-5" />
          Your Saved Backups
        </h2>
      </div>

      {/* ── W6-A: files-only restore notice ──────────────────────────────
          Persistent (not a toast) and dismissible — a toast would be
          destroyed by the reload this replaces. Informational, not an
          error: the restore succeeded, the database was simply not part of
          it in this version. The sr-only span above is the real live
          region (always mounted, two-step text population); this div is
          purely visual and intentionally carries no role/aria-live of its
          own to avoid a double announcement. */}
      <span role="status" className="sr-only">
        {restoreAnnouncement}
      </span>
      {activeRestoreNotice && (
        <div className="mx-6 mt-4 mb-0 flex items-start justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
          <div className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-200">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{activeRestoreNotice}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Reload Page
            </button>
            <button
              onClick={dismissActiveRestoreNotice}
              aria-label="Dismiss notice"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-blue-600 transition-colors hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* ── Orphan cleanup banner ──────────────────────────────────────── */}
      {orphanData && orphanData.total_count > 0 && (
        <div className="mx-6 mt-4 mb-0 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
          <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {orphanData.total_count} orphaned backup
              {orphanData.total_count !== 1 ? " files" : " file"} using{" "}
              {orphanData.total_size}
            </span>
          </div>
          <button
            onClick={() => cleanupMutation.mutate()}
            disabled={cleanupMutation.isPending}
            className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
            aria-label="Clean up orphaned backup files"
            aria-busy={cleanupMutation.isPending}
          >
            {cleanupMutation.isPending ? "Cleaning..." : "Clean Up"}
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/30 dark:bg-card/50 text-muted-foreground">
            <tr>
              <th className="px-6 py-3 font-medium">Backup</th>
              <th className="px-6 py-3 font-medium">What's Included</th>
              <th className="px-6 py-3 font-medium">Stored In</th>
              <th className="px-6 py-3 font-medium">Created</th>
              <th className="px-6 py-3 font-medium">Size</th>
              <th className="px-6 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-muted-foreground px-6 py-8 text-center"
                >
                  Loading backups...
                </td>
              </tr>
            ) : loadError && sets.length === 0 && backups.length === 0 ? (
              /* ── The list request failed and there is nothing to show ──── */
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-8 text-center text-red-700 dark:text-red-400"
                >
                  <span role="alert">
                    Your backups could not be loaded. Reload the page to try
                    again.
                  </span>
                </td>
              </tr>
            ) : sets.length === 0 && backups.length === 0 ? (
              /* ── Empty state (no sets AND no legacy backups) ─────────────── */
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <HardDrive
                      className="h-8 w-8 text-neutral-600 dark:text-neutral-500"
                      aria-hidden="true"
                    />
                    <p className="dark:text-foreground text-sm font-semibold text-gray-900">
                      No backups stored on this site
                    </p>
                    <p className="text-muted-foreground max-w-md text-sm">
                      {
                        'Backups you create with "Save Backup Now" above are listed here.'
                      }
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              <>
                {/* ── Grouped set rows (engine-based backups) ─────────────── */}
                {sets.map((set) => {
                  const isExpanded = expandedSets.has(set.id);
                  const isRestoringThis =
                    isRestoringSet && restoringSetId === set.id;
                  const isDeletingThis =
                    isDeletingSet && deletingSetId === set.id;

                  return (
                    <React.Fragment key={set.id}>
                      {/* ── Set summary row ─────────────────────────────── */}
                      <tr className="group hover:bg-background dark:hover:bg-secondary/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {/* Expand/collapse toggle */}
                            <button
                              onClick={() => toggleExpand(set.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  toggleExpand(set.id);
                                }
                              }}
                              aria-expanded={isExpanded}
                              aria-label={`${isExpanded ? "Collapse" : "Expand"} backup set from ${formatDate(set.created_at)}`}
                              className="text-muted-foreground dark:hover:text-foreground transition-colors hover:text-gray-900"
                            >
                              {isExpanded ? (
                                <ChevronDown
                                  className="h-4 w-4"
                                  aria-hidden="true"
                                />
                              ) : (
                                <ChevronRight
                                  className="h-4 w-4"
                                  aria-hidden="true"
                                />
                              )}
                            </button>
                            <div>
                              <div className="dark:text-foreground flex flex-wrap items-center gap-1.5 font-medium text-gray-900">
                                {getTypeLabel(set.scope)}
                                <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                                  <Layers
                                    className="h-3 w-3"
                                    aria-hidden="true"
                                  />
                                  {set.file_count} file
                                  {set.file_count !== 1 ? "s" : ""}
                                </span>
                                <span
                                  className="bg-muted rounded-full px-2 py-0.5 text-xs text-neutral-600 dark:text-neutral-400"
                                  title="The 10 most recent backups are kept; older ones are removed automatically"
                                >
                                  {formatTrigger(set)}
                                </span>
                              </div>
                              {set.human_elapsed && (
                                <div className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                                  <Clock
                                    className="h-3 w-3"
                                    aria-hidden="true"
                                  />
                                  Processing time {set.human_elapsed}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">{scopeBadge(set.scope)}</td>
                        <td className="px-6 py-4">{localStorageBadge()}</td>
                        <td className="text-muted-foreground px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" aria-hidden="true" />
                            {formatDate(set.created_at)}
                          </div>
                        </td>
                        <td className="text-muted-foreground px-6 py-4 font-mono text-xs">
                          {set.human_size}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1">
                            <button
                              onClick={() => handleRestoreSet(set)}
                              disabled={isRestoringThis}
                              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-amber-600 dark:hover:bg-amber-900/20 dark:hover:text-amber-600"
                              aria-label={`Restore site from backup set created ${formatDate(set.created_at)}`}
                              aria-busy={isRestoringThis}
                            >
                              <RotateCcw
                                className={`h-3.5 w-3.5 ${isRestoringThis ? "animate-spin" : ""}`}
                                aria-hidden="true"
                              />
                              <span className="hidden sm:inline!">Restore</span>
                            </button>
                            <button
                              onClick={() => handleDeleteSet(set)}
                              disabled={isDeletingThis}
                              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                              aria-label={`Delete backup set from ${formatDate(set.created_at)}`}
                              aria-busy={isDeletingThis}
                            >
                              <Trash2
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                              <span className="hidden sm:inline!">Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* ── Expanded file rows ───────────────────────────── */}
                      {isExpanded &&
                        set.files.map((file) => (
                          <tr
                            key={file.filename}
                            className="bg-muted/20 dark:bg-card/30 text-xs"
                          >
                            <td
                              className="text-muted-foreground py-2.5 pr-6 pl-16 font-mono break-all"
                              title={file.filename}
                            >
                              {file.filename}
                            </td>
                            <td className="px-6 py-2.5">
                              <span className="text-muted-foreground text-xs capitalize">
                                {file.category}
                              </span>
                            </td>
                            <td className="px-6 py-2.5">
                              {localStorageBadge()}
                            </td>
                            <td
                              className="text-muted-foreground px-6 py-2.5"
                              colSpan={2}
                            >
                              {file.human_size}
                            </td>
                            <td className="px-6 py-2.5 text-right">
                              <button
                                onClick={() => downloadBackup(file.filename)}
                                disabled={
                                  isDownloading &&
                                  downloadingFilename === file.filename
                                }
                                className="text-muted-foreground inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition-colors hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-500"
                                aria-label={`Download ${file.filename}`}
                                aria-busy={
                                  isDownloading &&
                                  downloadingFilename === file.filename
                                }
                              >
                                <Download
                                  className={`h-3 w-3 ${isDownloading && downloadingFilename === file.filename ? "animate-pulse" : ""}`}
                                  aria-hidden="true"
                                />
                                <span className="hidden sm:inline!">
                                  Download
                                </span>
                              </button>
                            </td>
                          </tr>
                        ))}
                    </React.Fragment>
                  );
                })}

                {/* ── Archives that belong to no set ── */}
                {looseBackups.map((backup) => (
                  <tr
                    key={backup.name}
                    className="group hover:bg-background dark:hover:bg-secondary/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="dark:text-foreground font-medium text-gray-900">
                        {getTypeLabel(backup.type)}
                      </div>
                      <div
                        className="text-muted-foreground mt-0.5 font-mono text-xs break-all"
                        title={backup.name}
                      >
                        {backup.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={getBadgeType(backup.type)}>
                        {getBadgeLabel(backup.type)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">{localStorageBadge()}</td>
                    <td className="text-muted-foreground px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" aria-hidden="true" />
                        {formatDate(backup.timestamp)}
                      </div>
                      <div className="text-muted-foreground mt-0.5 pl-5 text-xs">
                        {"The file's last-modified date"}
                      </div>
                    </td>
                    <td className="text-muted-foreground px-6 py-4 font-mono text-xs">
                      {backup.size}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <button
                          onClick={() => downloadBackup(backup.name)}
                          disabled={
                            isDownloading && downloadingFilename === backup.name
                          }
                          className="text-muted-foreground inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-500"
                          aria-label={`Download ${backup.name}`}
                          aria-busy={
                            isDownloading && downloadingFilename === backup.name
                          }
                        >
                          <Download
                            className={`h-3.5 w-3.5 ${isDownloading && downloadingFilename === backup.name ? "animate-pulse" : ""}`}
                            aria-hidden="true"
                          />
                          <span className="hidden sm:inline!">Download</span>
                        </button>
                        <button
                          onClick={() => handleRestore(backup)}
                          disabled={
                            isRestoring && restoringFilename === backup.name
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50 dark:text-amber-600 dark:hover:bg-amber-900/20 dark:hover:text-amber-600"
                          aria-label={`Restore from backup file ${backup.name}`}
                          aria-busy={
                            isRestoring && restoringFilename === backup.name
                          }
                        >
                          <RotateCcw
                            className={`h-3.5 w-3.5 ${isRestoring && restoringFilename === backup.name ? "animate-spin" : ""}`}
                            aria-hidden="true"
                          />
                          <span className="hidden sm:inline!">Restore</span>
                        </button>
                        <button
                          onClick={() => handleDelete(backup)}
                          disabled={isDeleting}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                          aria-label={`Delete backup file ${backup.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span className="hidden sm:inline!">Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-muted-foreground mt-2 px-6 pb-4 text-xs">
        The 10 most recent backups are kept; older ones are removed
        automatically.
      </p>
    </Card>
  );
};
