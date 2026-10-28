import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "../lib/toast";
import { wpApi } from "../services/api";
import {
  ActiveBackupJobsResponse,
  BackupArchive,
  BackupEngineStatus,
  BackupSet,
} from "../types";

/**
 * WP.org R9 fix (FIX-1 / R-01, 2026-08-31): the persisted report written by
 * SwissWPSuite_Core::post_import_recovery() Step 8 (read-only detection of
 * active_plugins entries whose plugin file is missing on this site --
 * nothing is removed). Surfaced on GET /backup/local/list (see below) so it
 * survives the hard reload restoreBackupMutation triggers when db_restored
 * is true -- a plain in-request field on the restore response alone would
 * not reach the page after that reload. '' when there is nothing to report.
 */
interface MissingPluginsReport {
  plugins: string[];
  time: number;
}

function formatMissingPluginsNotice(report: MissingPluginsReport): string {
  return `Note: ${report.plugins.length} plugin(s) in this site's list of active plugins are not installed: ${report.plugins.join(", ")}. They were left untouched — review them on the Plugins screen.`;
}

interface GenerateDownloadTokenResponse {
  success: boolean;
  token: string;
  url: string;
}

export interface CreateBackupVariables {
  scope: "full" | "db" | "files";
  /** BACKUP-F3: Abort signal wired to fetch so Cancel actually interrupts the in-flight request. */
  signal?: AbortSignal;
}

/**
 * Phase 5 engine response (HTTP 202 Accepted).
 *
 * F-264/F-265 FIX: The chunked backup engine returns {success, job_id, message}
 * directly. The frontend polls /backup/engine/status for progress after
 * receiving this initial 202.
 */
export interface CreateBackupResponse {
  success: boolean;
  /** Engine job ID -- used to poll /backup/engine/status for progress. */
  job_id: string;
  /** Human-readable status message from the engine. */
  message: string;
}

interface RestoreBackupVariables {
  filename: string;
}

/**
 * W6-A: the backend now always returns HTTP 200 on a successful restore, even
 * when the archive's database dump was NOT imported (restore is files-only in
 * this version). `db_restored` distinguishes a genuine DB import from a
 * files-only outcome; `db_notice` carries the honest, non-error explanation
 * to show the user for the files-only case ('' when there is nothing to say).
 * Only real failures (missing/unreadable/corrupt archive) still return an
 * HTTP error, handled by onError below — this shape is success-only.
 */
interface RestoreBackupResponse {
  success: boolean;
  message: string;
  db_restored: boolean;
  db_notice: string;
  /**
   * LIVEQA run-book §3.4 (2026-08-04): non-empty when post_import_recovery()
   * pruned active_plugins entries whose plugin files are missing from this
   * site/backup ('' when nothing was pruned). Same "honest notice must reach
   * the frontend" treatment as db_notice above.
   */
  plugins_notice: string;
}

interface DeleteBackupVariables {
  filename: string;
}

/**
 * When a restore imports a database (`db_restored: true`), the mutation's
 * onSuccess reloads the page to reset the DB connection/session. That
 * reload destroys this hook's React state before it can render anything,
 * so any DB-import warning or repair sentence carried in `db_notice`,
 * `plugins_notice`, or the REST headline (`message`) would never reach the
 * web UI. The composed summary is written here to `sessionStorage` before
 * the reload and read back once, non-destructively, by every
 * `useBackups()` mount — see the lazy initializer below and
 * `useBackupSets()`'s restore-set mutation, which writes through the same
 * key. No new REST field: this uses `message`/`db_notice`/`plugins_notice`
 * exactly as the REST layer already sends them.
 */
const RESTORE_SUMMARY_STORAGE_KEY = "swisswpsuite_restore_summary";

/**
 * Best-effort write. Private browsing / blocked storage throws on some
 * browsers — that must never crash the mutation's onSuccess. When it
 * throws, the summary is simply lost and the reload proceeds exactly as it
 * would without any persisted text.
 */
function persistRestoreSummary(text: string): void {
  try {
    sessionStorage.setItem(RESTORE_SUMMARY_STORAGE_KEY, text);
  } catch {
    // See docblock above — best-effort, never surfaced to the user.
  }
}

/**
 * Non-destructive read: `useBackups()` mounts up to three times on the
 * Backups page (BackupsPage, BackupList, BackupControl). Deleting the key on
 * read would mean only whichever instance re-mounts first after the reload
 * ever sees the summary — the others would read `null`.
 */
function readPersistedRestoreSummary(): string | null {
  try {
    return sessionStorage.getItem(RESTORE_SUMMARY_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Cleared at the start of every restore mutation (`onMutate`), so a stale
 * summary from a prior restore never resurfaces after a later, clean one —
 * and explicitly on `clearRestoreNotice()` (user dismissal).
 */
function clearPersistedRestoreSummary(): void {
  try {
    sessionStorage.removeItem(RESTORE_SUMMARY_STORAGE_KEY);
  } catch {
    // Best-effort — see persistRestoreSummary() above.
  }
}

export function useBackups() {
  const queryClient = useQueryClient();
  // W6-A: persistent, dismissible notice shown when a restore succeeded but
  // left the database untouched (files-only restore). Deliberately NOT a
  // toast — a toast would be destroyed by the reload this replaces, and the
  // whole point is that the user must be able to actually read it.
  //
  // The lazy initializer also picks up a summary persisted to
  // sessionStorage by a DB-import restore just before its own reload — see
  // RESTORE_SUMMARY_STORAGE_KEY above. `null` when nothing was persisted.
  const [restoreNotice, setRestoreNotice] = useState<string | null>(() =>
    readPersistedRestoreSummary()
  );

  // 1. Fetch Backups
  const {
    data: backupsResponse,
    isLoading: isLoadingBackups,
    error: loadError,
    refetch: refetchBackups,
  } = useQuery({
    queryKey: ["backups"],
    queryFn: async () => {
      // API returns { success: true, backups: [...], sets: [...], missing_plugins_report: {...} | null }
      return wpApi<{
        success: boolean;
        backups: BackupArchive[];
        sets?: BackupSet[];
        missing_plugins_report?: MissingPluginsReport | null;
      }>(`/backup/local/list?_nocache=${Date.now()}`);
    },
    staleTime: 30000, // 30 seconds
  });

  const backups = backupsResponse?.backups ?? [];

  // WP.org R9 fix (FIX-1 / R-01, 2026-08-31): surface a persisted
  // missing-plugins report the moment the list loads -- this is what makes
  // the notice survive the post-restore hard reload (the mutation's onSuccess
  // below never runs after a reload; only this query does, on every mount).
  // `prev ?? …` never overwrites a notice already showing from the SAME
  // session's restore (e.g. a files-only db_notice).
  useEffect(() => {
    const report = backupsResponse?.missing_plugins_report;
    if (report && report.plugins.length > 0) {
      setRestoreNotice((prev) => prev ?? formatMissingPluginsNotice(report));
    }
  }, [backupsResponse?.missing_plugins_report]);

  // 2. Create Backup (Synchronous - High Timeout)
  const createBackupMutation = useMutation({
    mutationFn: async (variables: CreateBackupVariables) => {
      // BACKUP-F3: Extract signal from variables so it is not serialised into the JSON body.
      const { signal, ...bodyVars } = variables;
      return wpApi<CreateBackupResponse>("/backup/local/create", {
        method: "POST",
        body: JSON.stringify(bodyVars),
        signal,
      });
    },
    onSuccess: (data: CreateBackupResponse) => {
      queryClient.invalidateQueries({ queryKey: ["backups"] });
      // F-264/F-265: Engine returns 202 with job_id — the frontend polls
      // useBackupEngineStatus(job_id) for progress, not the initial create
      // response.
      toast.success(data.message || "Backup started");
    },
    onError: (error: Error) => {
      toast.error(`Backup failed: ${error.message}`);
    },
  });

  // 3. Restore Backup (Destructive - Hard Reload)
  const restoreBackupMutation = useMutation({
    mutationFn: async (variables: RestoreBackupVariables) => {
      return wpApi<RestoreBackupResponse>("/backup/local/restore", {
        method: "POST",
        body: JSON.stringify(variables),
      });
    },
    // Clears any previously persisted restore summary before this mutation
    // starts, so a stale entry left over from an earlier restore cannot
    // resurface after this one completes with nothing to report.
    onMutate: () => {
      clearPersistedRestoreSummary();
    },
    onSuccess: (data) => {
      if (data.db_restored) {
        // Genuine DB import happened — force reload to reset DB connection
        // and session. Unchanged from the pre-W6-A behaviour.
        //
        // When there is a warning or repair sentence to show
        // (db_notice/plugins_notice non-empty), the composed summary is
        // persisted to sessionStorage before the reload so it survives —
        // see RESTORE_SUMMARY_STORAGE_KEY above. A restore with nothing to
        // report persists nothing, matching the silent-clean-reload
        // behaviour.
        if (data.db_notice || data.plugins_notice) {
          persistRestoreSummary(
            [data.message, data.db_notice, data.plugins_notice]
              .filter(Boolean)
              .join(" ")
          );
        }
        window.location.reload();
        return;
      }
      // LIVEQA run-book §3.4 (2026-08-04): plugins_notice joins db_notice under
      // the same "must not reload immediately" rule — either one means there is
      // something honest to show the user before the list quietly moves on.
      if (data.db_notice || data.plugins_notice) {
        // Files were restored; the database was deliberately NOT touched
        // (restore is files-only in this version). The stated reason for
        // the reload above — resetting the DB connection/session — does not
        // apply here, and reloading now would destroy this notice before
        // the user can read it. Refresh the list in place instead and let
        // the user reload manually if/when they choose to.
        queryClient.invalidateQueries({ queryKey: ["backups"] });
        setRestoreNotice(
          [data.db_notice, data.plugins_notice].filter(Boolean).join(" ")
        );
        return;
      }
      // Intentional files-only restore of an archive that never contained a
      // database dump — nothing new to tell the user. Preserve prior
      // behaviour.
      window.location.reload();
    },
    // BKP-RST-5: Surface restore failures to the user — previously the spinner
    // would stop silently with no feedback when restore_local_backup() returned an error.
    onError: (error: Error) => {
      toast.error(`Restore failed: ${error.message}`);
    },
  });

  // 4. Delete Backup
  const deleteBackupMutation = useMutation({
    mutationFn: async (variables: DeleteBackupVariables) => {
      return wpApi<{ success: boolean }>("/backup/local/delete", {
        method: "POST",
        body: JSON.stringify(variables),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backups"] });
    },
    // The request is sent once (no automatic retry), so a failure has to be
    // shown here; the archive stays listed since nothing is removed.
    onError: (error: Error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  // 5. Download Backup (token-based — avoids bare href that strips nonce)
  const downloadBackupMutation = useMutation({
    mutationFn: async (filename: string) => {
      const response = await wpApi<GenerateDownloadTokenResponse>(
        "/backup/local/generate-download-token",
        {
          method: "POST",
          body: JSON.stringify({ filename }),
        }
      );
      return response;
    },
    onSuccess: (response) => {
      // Trigger browser download via hidden anchor — avoids popup blocker vs window.open
      const a = document.createElement("a");
      a.href = response.url;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
    onError: (error: Error) => {
      toast.error(`Download failed: ${error.message}`);
    },
  });

  const clearRestoreNotice = () => {
    setRestoreNotice(null);
    // Also drops the persisted sessionStorage summary — otherwise a
    // dismissed notice would reappear on this instance's next mount (e.g.
    // navigating away and back within the same tab session).
    clearPersistedRestoreSummary();
    // WP.org R9 fix (FIX-1 / R-01, 2026-08-31): best-effort dismiss of the
    // persisted report -- without this it would simply reappear on the next
    // ["backups"] refetch (staleTime is only 30s). Harmless no-op when there
    // was nothing to dismiss (e.g. a plain files-only db_notice with no
    // missing_plugins_report) -- delete_option() on an absent key is a no-op.
    wpApi("/backup/dismiss-missing-plugins-notice", { method: "POST" }).catch(
      () => {
        // Best-effort: a failed dismiss just means the notice may reappear
        // on the next list refresh -- not worth surfacing as an error toast.
      }
    );
  };

  /**
   * Clears this hook's restore-notice state and its persisted sessionStorage
   * copy WITHOUT calling the dismiss-notice endpoint (unlike
   * `clearRestoreNotice` above, which is the user-initiated dismissal and
   * does call it). A sibling restore mutation (set-level restore) calls this
   * right before it starts, so a still-showing single-file notice can never
   * be joined to the set restore's own in-place result by BackupList's
   * `composeRestoreNotices()`.
   */
  const resetRestoreNotice = () => {
    setRestoreNotice(null);
    clearPersistedRestoreSummary();
  };

  return {
    backups,
    isLoading: isLoadingBackups,
    loadError,
    refetchBackups,
    createBackup: createBackupMutation.mutate,
    isCreating: createBackupMutation.isPending,
    createError: createBackupMutation.error,
    restoreBackup: restoreBackupMutation.mutate,
    isRestoring: restoreBackupMutation.isPending,
    // BKP-RST-10: Expose which filename is being restored so BackupList can scope the
    // spinner to only the row being restored, rather than disabling all rows at once.
    restoringFilename: restoreBackupMutation.isPending
      ? (restoreBackupMutation.variables?.filename ?? null)
      : null,
    restoreError: restoreBackupMutation.error,
    // W6-A: persistent files-only-restore notice — see setRestoreNotice above.
    restoreNotice,
    clearRestoreNotice,
    resetRestoreNotice,
    deleteBackup: deleteBackupMutation.mutate,
    isDeleting: deleteBackupMutation.isPending,
    deleteError: deleteBackupMutation.error,
    downloadBackup: downloadBackupMutation.mutate,
    isDownloading: downloadBackupMutation.isPending,
    downloadingFilename: downloadBackupMutation.variables ?? null,
  };
}

export function useOrphanBackups() {
  return useQuery({
    queryKey: ["backup-orphans"],
    queryFn: () =>
      wpApi<{
        success: boolean;
        orphans: Array<{
          name: string;
          size: string;
          age_hours: number;
          reason: string;
        }>;
        total_size: string;
        total_count: number;
      }>("/backup/local/orphans"),
    staleTime: 120_000,
    retry: 1,
  });
}

export function useCleanupOrphans() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      wpApi<{ success: boolean; deleted_count: number; freed_space: string }>(
        "/backup/local/cleanup",
        { method: "POST" }
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["backups"] });
      queryClient.invalidateQueries({ queryKey: ["backup-orphans"] });
      toast.success(
        `Cleaned up ${data.deleted_count} orphaned files, freed ${data.freed_space}`
      );
    },
    onError: () => {
      toast.error("Failed to clean up orphaned files.");
    },
  });
}

/**
 * Reads the backup sets returned alongside the flat list.
 * Re-uses the same ["backups"] cache key so no extra network request is made.
 * Mutations for set-level restore and delete hit the new set endpoints.
 */
export function useBackupSets() {
  const queryClient = useQueryClient();
  // W6-A: same files-only-restore notice pattern as useBackups() above, kept
  // as separate state since set-restore and single-file-restore are
  // independent mutations that can each be mid-flight/notice-holding.
  const [restoreSetNotice, setRestoreSetNotice] = useState<string | null>(null);

  // Read sets from the already-cached list response (zero extra requests).
  const { data: backupsResponse, isLoading } = useQuery({
    queryKey: ["backups"],
    queryFn: async () =>
      wpApi<{
        success: boolean;
        backups: BackupArchive[];
        sets?: BackupSet[];
      }>(`/backup/local/list?_nocache=${Date.now()}`),
    staleTime: 30000,
  });

  const sets: BackupSet[] = backupsResponse?.sets ?? [];

  // Restore all files in a set (DB first — backend enforces ordering).
  const restoreSetMutation = useMutation({
    mutationFn: (setId: string) =>
      wpApi<{
        success: boolean;
        message: string;
        db_restored: boolean;
        db_notice: string;
        /** LIVEQA run-book §3.4 (2026-08-04) — see RestoreBackupResponse above. */
        plugins_notice: string;
      }>(`/backup/sets/${setId}/restore`, { method: "POST" }),
    // Same stale-summary guard as the single-file restore mutation above.
    onMutate: () => {
      clearPersistedRestoreSummary();
    },
    onSuccess: (data) => {
      if (data.db_restored) {
        // Hard reload after a genuine DB import — same pattern as
        // single-file restore. Unchanged from pre-W6-A behaviour.
        //
        // The summary is persisted before reloading — see the
        // RESTORE_SUMMARY_STORAGE_KEY docblock in useBackups() above. This
        // hook does not read the key back itself; the fresh useBackups()
        // mount after the reload does (BackupList.tsx already renders it
        // via `composeRestoreNotices()`).
        if (data.db_notice || data.plugins_notice) {
          persistRestoreSummary(
            [data.message, data.db_notice, data.plugins_notice]
              .filter(Boolean)
              .join(" ")
          );
        }
        window.location.reload();
        return;
      }
      if (data.db_notice || data.plugins_notice) {
        // Files-only outcome — see the matching comment in useBackups()
        // above for why this must not reload immediately.
        queryClient.invalidateQueries({ queryKey: ["backups"] });
        setRestoreSetNotice(
          [data.db_notice, data.plugins_notice].filter(Boolean).join(" ")
        );
        return;
      }
      window.location.reload();
    },
    onError: (error: Error) => {
      toast.error(`Set restore failed: ${error.message}`);
    },
  });

  // Delete all files in a set and remove the set record.
  const deleteSetMutation = useMutation({
    mutationFn: (setId: string) =>
      wpApi<{ success: boolean; skipped?: string[] }>(
        `/backup/sets/${setId}/delete`,
        {
          method: "POST",
        }
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["backups"] });
      // A file the server could not delete stays on disk and is listed as a
      // backup of its own; a file that was already gone is not a failure.
      const FAILED_SUFFIX = " (delete failed)";
      const skipped: unknown = data?.skipped;
      const stuck = (Array.isArray(skipped) ? skipped : [])
        .filter(
          (entry): entry is string =>
            typeof entry === "string" && entry.endsWith(FAILED_SUFFIX)
        )
        .map((entry) => entry.slice(0, -FAILED_SUFFIX.length));
      if (stuck.length > 0) {
        toast.warning(
          `Backup set deleted, but ${stuck.length} file(s) could not be removed from the server: ${stuck.join(", ")}.`,
          { duration: Infinity }
        );
        return;
      }
      toast.success("Backup set deleted.");
    },
    onError: (error: Error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  const clearRestoreSetNotice = () => setRestoreSetNotice(null);

  return {
    sets,
    isLoading,
    restoreSet: restoreSetMutation.mutate,
    isRestoringSet: restoreSetMutation.isPending,
    restoringSetId: restoreSetMutation.isPending
      ? (restoreSetMutation.variables ?? null)
      : null,
    // W6-A: persistent files-only-restore notice for set-level restore.
    restoreSetNotice,
    clearRestoreSetNotice,
    deleteSet: deleteSetMutation.mutate,
    isDeletingSet: deleteSetMutation.isPending,
    deletingSetId: deleteSetMutation.isPending
      ? (deleteSetMutation.variables ?? null)
      : null,
  };
}

/**
 * Polls the backup engine status every 2 seconds while a job_id is active.
 * Enabled only when jobId is non-null — automatically stops when cleared.
 */
export function useBackupEngineStatus(jobId: string | null) {
  return useQuery<{ success: boolean; data: BackupEngineStatus }>({
    queryKey: ["backup-engine-status", jobId],
    queryFn: () =>
      wpApi<{ success: boolean; data: BackupEngineStatus }>(
        `/backup/engine/status?job_id=${jobId}`
      ),
    enabled: !!jobId,
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
  });
}

/**
 * v2.9.30.100 — Rediscover non-terminal engine jobs (running/pending) on mount.
 *
 * The engine job_id (bkeng_*) lives only in the React memory of the tab that started
 * the backup, so after a tab-switch/reload the SPA had no way to find a still-running
 * job (the old /backup/status mount call 404'd). This queries the new
 * GET /backup/engine/active route so the Backups page can re-adopt a running job_id
 * and rehydrate the progress bar. Polled on a slow cadence (8s) only as a rediscovery
 * net — the per-job 2s poll in useBackupEngineStatus drives the live progress once a
 * job_id has been adopted.
 */
export function useActiveBackupJobs(enabled = true) {
  return useQuery<ActiveBackupJobsResponse>({
    queryKey: ["backup-engine-active"],
    queryFn: () => wpApi<ActiveBackupJobsResponse>("/backup/engine/active"),
    enabled,
    refetchInterval: 8000,
    refetchIntervalInBackground: false,
  });
}
