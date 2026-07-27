// frontend-specialist fix: atoms/ → ui/ to eliminate cva TDZ in shared chunk
import React, { useState } from "react";
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
  Cloud,
  Server,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
  Layers,
} from "lucide-react";
import { BackupArchive, BackupSet } from "../../../types";
import { toast } from "sonner";

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
    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${SCOPE_BADGE_CLASS[scope] ?? "bg-neutral-100 text-neutral-700"}`}
  >
    {SCOPE_LABEL[scope] ?? scope}
  </span>
);

// ── Destination badge ─────────────────────────────────────────────────────────
const destinationBadge = (dest?: string) => {
  const map: Record<
    string,
    { label: string; className: string; icon: React.ElementType }
  > = {
    local: {
      label: "Local",
      className:
        "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
      icon: HardDrive,
    },
    gdrive: {
      label: "Google Drive",
      className:
        "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
      icon: Cloud,
    },
    dropbox: {
      label: "Dropbox",
      className:
        "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
      icon: Cloud,
    },
    s3: {
      label: "Amazon S3",
      className:
        "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
      icon: Cloud,
    },
    ftp: {
      label: "FTP Server",
      className:
        "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
      icon: Server,
    },
    b2: {
      label: "Backblaze B2",
      className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
      icon: Cloud,
    },
  };
  const info = map[dest || "local"] || map.local;
  const Icon = info.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${info.className}`}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      {info.label}
    </span>
  );
};

export const BackupList: React.FC = () => {
  const {
    backups,
    isLoading,
    restoreBackup,
    isRestoring,
    restoringFilename,
    deleteBackup,
    isDeleting,
    downloadBackup,
    isDownloading,
    downloadingFilename,
  } = useBackups();
  const {
    sets,
    restoreSet,
    isRestoringSet,
    restoringSetId,
    deleteSet,
    isDeletingSet,
    deletingSetId,
  } = useBackupSets();
  const { data: orphanData } = useOrphanBackups();
  const cleanupMutation = useCleanupOrphans();

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
      `This will replace your current site with the backup from ${formatDate(backup.timestamp)}. Your existing posts, settings, and files will be overwritten. This cannot be undone.`,
      {
        action: {
          label: "Yes, restore from this backup",
          onClick: () => restoreBackup({ filename: backup.name }),
        },
      },
    );
  };

  const handleDelete = (backup: BackupArchive) => {
    toast.warning(
      `Delete the backup from ${formatDate(backup.timestamp)}? This cannot be undone.`,
      {
        action: {
          label: "Yes, delete this backup",
          onClick: () => deleteBackup({ filename: backup.name }),
        },
      },
    );
  };

  // ── Set-level actions ───────────────────────────────────────────────────────

  const handleRestoreSet = (set: BackupSet) => {
    const allCloud = set.files.every((f) => f.location === "cloud");
    if (allCloud) {
      toast.error(
        "This backup is stored in the cloud only. Download it from your cloud provider before restoring.",
      );
      return;
    }
    toast.warning(
      `Restore your site from the backup created ${formatDate(set.created_at)}? All ${set.file_count} file${set.file_count !== 1 ? "s" : ""} will be restored. This cannot be undone.`,
      {
        action: {
          label: "Yes, restore this backup",
          onClick: () => restoreSet(set.id),
        },
      },
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
      },
    );
  };

  const formatTrigger = (set: BackupSet) => {
    switch (set.trigger) {
      case "scheduled":
        return "Scheduled";
      case "sentinel":
        return "Sentinel";
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
        return "Complete";
      case "db":
        return "Database";
      case "files":
        return "Files Only";
      default:
        return type;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "full":
        return "Complete backup";
      case "db":
        return "Posts & settings";
      case "files":
        return "Files only";
      default:
        return type;
    }
  };

  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-6 border-b border-border dark:border-border">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-foreground flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-muted-foreground" />
          Your Saved Backups
        </h2>
      </div>

      {/* ── Orphan cleanup banner ──────────────────────────────────────── */}
      {orphanData && orphanData.total_count > 0 && (
        <div className="flex items-center justify-between p-3 mx-6 mt-4 mb-0 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              {orphanData.total_count} orphaned backup
              {orphanData.total_count !== 1 ? " files" : " file"} using{" "}
              {orphanData.total_size}
            </span>
          </div>
          <button
            onClick={() => cleanupMutation.mutate()}
            disabled={cleanupMutation.isPending}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
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
              <th className="px-6 py-3 font-medium text-right sticky right-0 bg-muted/30 dark:bg-card/50">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-8 text-center text-muted-foreground"
                >
                  Loading backups...
                </td>
              </tr>
            ) : sets.length === 0 && backups.length === 0 ? (
              /* ── Empty state (no sets AND no legacy backups) ─────────────── */
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <HardDrive
                      className="w-8 h-8 text-muted-foreground/40"
                      aria-hidden="true"
                    />
                    <p className="font-semibold text-gray-900 dark:text-foreground text-sm">
                      No backups yet
                    </p>
                    <p className="text-sm text-muted-foreground max-w-md">
                      {
                        "You're one click away from protecting your site. Choose a backup type above and hit \"Save Backup Now\" — we'll handle the rest."
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
                  const allCloud = set.files.every(
                    (f) => f.location === "cloud",
                  );

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
                              className="text-muted-foreground hover:text-gray-900 dark:hover:text-foreground transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronDown
                                  className="w-4 h-4"
                                  aria-hidden="true"
                                />
                              ) : (
                                <ChevronRight
                                  className="w-4 h-4"
                                  aria-hidden="true"
                                />
                              )}
                            </button>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-foreground flex items-center gap-1.5 flex-wrap">
                                {getTypeLabel(set.scope)}
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <Layers
                                    className="w-3 h-3"
                                    aria-hidden="true"
                                  />
                                  {set.file_count} file
                                  {set.file_count !== 1 ? "s" : ""}
                                </span>
                                <span
                                  className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                                  title={
                                    set.trigger === "scheduled"
                                      ? "Automatically pruned — keeps the last N scheduled backups per automation"
                                      : "Manual backups are kept until you delete them manually"
                                  }
                                >
                                  {formatTrigger(set)}
                                </span>
                              </div>
                              {set.human_elapsed && (
                                <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                                  <Clock
                                    className="w-3 h-3"
                                    aria-hidden="true"
                                  />
                                  Completed in {set.human_elapsed}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">{scopeBadge(set.scope)}</td>
                        <td className="px-6 py-4">
                          {destinationBadge(set.destination)}
                          {allCloud && (
                            <span
                              className="ml-1.5 text-xs text-blue-600"
                              title="All files stored in cloud"
                            >
                              cloud only
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3" aria-hidden="true" />
                            {formatDate(set.created_at)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground font-mono text-xs">
                          {set.human_size}
                        </td>
                        <td className="px-6 py-4 text-right sticky right-0 bg-card dark:bg-secondary">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleRestoreSet(set)}
                              disabled={isRestoringThis || allCloud}
                              title={
                                allCloud
                                  ? "Download from cloud provider to restore"
                                  : undefined
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label={`Restore site from backup set created ${formatDate(set.created_at)}`}
                              aria-busy={isRestoringThis}
                            >
                              <RotateCcw
                                className={`w-3.5 h-3.5 ${isRestoringThis ? "animate-spin" : ""}`}
                                aria-hidden="true"
                              />
                              <span className="hidden sm:inline">Restore</span>
                            </button>
                            <button
                              onClick={() => handleDeleteSet(set)}
                              disabled={isDeletingThis}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                              aria-label={`Delete backup set from ${formatDate(set.created_at)}`}
                              aria-busy={isDeletingThis}
                            >
                              <Trash2
                                className="w-3.5 h-3.5"
                                aria-hidden="true"
                              />
                              <span className="hidden sm:inline">Delete</span>
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
                              className="pl-16 pr-6 py-2.5 text-muted-foreground font-mono truncate max-w-[280px]"
                              title={file.filename}
                            >
                              {file.filename}
                            </td>
                            <td className="px-6 py-2.5">
                              <span className="text-xs text-muted-foreground capitalize">
                                {file.category}
                              </span>
                            </td>
                            <td className="px-6 py-2.5">
                              {destinationBadge(
                                file.location === "cloud"
                                  ? file.provider
                                  : "local",
                              )}
                            </td>
                            <td
                              className="px-6 py-2.5 text-muted-foreground"
                              colSpan={2}
                            >
                              {file.human_size}
                            </td>
                            <td className="px-6 py-2.5 text-right sticky right-0 bg-muted/20 dark:bg-card/30">
                              {file.location === "local" && (
                                <button
                                  onClick={() => downloadBackup(file.filename)}
                                  disabled={
                                    isDownloading &&
                                    downloadingFilename === file.filename
                                  }
                                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors disabled:opacity-50"
                                  aria-label={`Download ${file.filename}`}
                                  aria-busy={
                                    isDownloading &&
                                    downloadingFilename === file.filename
                                  }
                                >
                                  <Download
                                    className={`w-3 h-3 ${isDownloading && downloadingFilename === file.filename ? "animate-pulse" : ""}`}
                                    aria-hidden="true"
                                  />
                                  <span className="hidden sm:inline">
                                    Download
                                  </span>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                    </React.Fragment>
                  );
                })}

                {/* ── Legacy flat list (fallback / pre-engine backups) ─────── */}
                {sets.length === 0 &&
                  backups.map((backup) => (
                    <tr
                      key={backup.name}
                      className="group hover:bg-background dark:hover:bg-secondary/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 dark:text-foreground">
                          {getTypeLabel(backup.type)}
                          {backup.is_auto && (
                            <span className="ml-2 text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                              Scheduled
                            </span>
                          )}
                        </div>
                        <div
                          className="text-xs text-muted-foreground mt-0.5 font-mono truncate max-w-[300px]"
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
                      <td className="px-6 py-4">
                        {destinationBadge(backup.destination)}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3" aria-hidden="true" />
                          {formatDate(backup.timestamp)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground font-mono text-xs">
                        {backup.size}
                      </td>
                      <td className="px-6 py-4 text-right sticky right-0 bg-card dark:bg-secondary">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => downloadBackup(backup.name)}
                            disabled={
                              isDownloading &&
                              downloadingFilename === backup.name
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors disabled:opacity-50"
                            aria-label={`Download backup from ${formatDate(backup.timestamp)}`}
                            aria-busy={
                              isDownloading &&
                              downloadingFilename === backup.name
                            }
                          >
                            <Download
                              className={`w-3.5 h-3.5 ${isDownloading && downloadingFilename === backup.name ? "animate-pulse" : ""}`}
                              aria-hidden="true"
                            />
                            <span className="hidden sm:inline">Download</span>
                          </button>
                          <button
                            onClick={() => handleRestore(backup)}
                            disabled={
                              isRestoring && restoringFilename === backup.name
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors disabled:opacity-50"
                            aria-label={`Restore site from backup created ${formatDate(backup.timestamp)}`}
                            aria-busy={
                              isRestoring && restoringFilename === backup.name
                            }
                          >
                            <RotateCcw
                              className={`w-3.5 h-3.5 ${isRestoring && restoringFilename === backup.name ? "animate-spin" : ""}`}
                              aria-hidden="true"
                            />
                            <span className="hidden sm:inline">Restore</span>
                          </button>
                          <button
                            onClick={() => handleDelete(backup)}
                            disabled={isDeleting}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                            aria-label={`Delete backup from ${formatDate(backup.timestamp)}`}
                          >
                            <Trash2
                              className="w-3.5 h-3.5"
                              aria-hidden="true"
                            />
                            <span className="hidden sm:inline">Delete</span>
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
      <p className="text-xs text-muted-foreground mt-2 px-6 pb-4">
        Retention limits apply to scheduled backups only. Manual backups must be
        deleted manually.
      </p>
    </Card>
  );
};
