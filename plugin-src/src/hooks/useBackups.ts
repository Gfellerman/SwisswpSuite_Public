import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { wpApi } from "../services/api";
import {
  ActiveBackupJobsResponse,
  BackupArchive,
  BackupEngineStatus,
  BackupSet,
} from "../types";

interface GenerateDownloadTokenResponse {
  success: boolean;
  token: string;
  url: string;
}

export interface CreateBackupVariables {
  scope: "full" | "db" | "files";
  destination?: "local" | "gdrive" | "dropbox" | "s3" | "ftp" | "b2";
  /** BACKUP-F3: Abort signal wired to fetch so Cancel actually interrupts the in-flight request. */
  signal?: AbortSignal;
}

/**
 * Phase 5 engine response (HTTP 202 Accepted).
 *
 * F-264/F-265 FIX: The chunked backup engine returns {success, job_id, message}
 * directly -- NOT the legacy {data:{url,name,date}, cloud_*} shape. The frontend
 * polls /backup/engine/status for progress after receiving this initial 202.
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

export function useBackups() {
  const queryClient = useQueryClient();
  // W6-A: persistent, dismissible notice shown when a restore succeeded but
  // left the database untouched (files-only restore). Deliberately NOT a
  // toast — a toast would be destroyed by the reload this replaces, and the
  // whole point is that the user must be able to actually read it.
  const [restoreNotice, setRestoreNotice] = useState<string | null>(null);

  // 1. Fetch Backups
  const {
    data: backupsResponse,
    isLoading: isLoadingBackups,
    error: loadError,
    refetch: refetchBackups,
  } = useQuery({
    queryKey: ["backups"],
    queryFn: async () => {
      // API returns { success: true, backups: [...], sets: [...] }
      return wpApi<{
        success: boolean;
        backups: BackupArchive[];
        sets?: BackupSet[];
      }>(`/backup/local/list?_nocache=${Date.now()}`);
    },
    staleTime: 30000, // 30 seconds
  });

  const backups = backupsResponse?.backups ?? [];

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
      // useBackupEngineStatus(job_id) for progress. Cloud outcome is surfaced
      // via the engine status polling, not the initial create response.
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
    onSuccess: (data) => {
      if (data.db_restored) {
        // Genuine DB import happened — force reload to reset DB connection
        // and session. Unchanged from the pre-W6-A behaviour.
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
          [data.db_notice, data.plugins_notice].filter(Boolean).join(" "),
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
  });

  // 5. Download Backup (token-based — avoids bare href that strips nonce)
  const downloadBackupMutation = useMutation({
    mutationFn: async (filename: string) => {
      const response = await wpApi<GenerateDownloadTokenResponse>(
        "/backup/local/generate-download-token",
        {
          method: "POST",
          body: JSON.stringify({ filename }),
        },
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

  const clearRestoreNotice = () => setRestoreNotice(null);

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
        // BUG-B FIX (2026-08-05): cloud objects a prune/automation-delete pass
        // could not remove remotely (missing cloud_id or a provider failure).
        // Additive fields — see SwissWPSuite_Backup_Sets::record_cloud_orphan().
        cloud_orphans?: Array<{
          index: number;
          provider: string;
          filename: string;
          reason: string;
          detected_at: string;
        }>;
        cloud_orphan_count?: number;
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
        { method: "POST" },
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["backups"] });
      queryClient.invalidateQueries({ queryKey: ["backup-orphans"] });
      toast.success(
        `Cleaned up ${data.deleted_count} orphaned files, freed ${data.freed_space}`,
      );
    },
    onError: () => {
      toast.error("Failed to clean up orphaned files.");
    },
  });
}

/**
 * P4 (2026-08-08 socratic re-audit repair plan): dismiss a single recorded
 * cloud-orphan entry (backend: SwissWPSuite_Backup_Sets::clear_cloud_orphan(),
 * wired up via POST /backup/local/orphans/cloud/dismiss). This does NOT touch
 * anything on the cloud provider itself -- it only clears the local
 * diagnostic record so the banner in BackupList.tsx stops listing it, for use
 * after the admin has manually removed the object from their cloud
 * dashboard. `index` is a zero-based position into the `cloud_orphans[]`
 * array returned by useOrphanBackups() -- the backend matches by index
 * position at read time, so this hook always invalidates ["backup-orphans"]
 * on success to force a re-fetch before any further dismiss (indices shift
 * after every clear).
 */
export function useDismissCloudOrphan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (index: number) =>
      wpApi<{
        success: boolean;
        message: string;
        cleared?: { provider: string; filename: string };
      }>("/backup/local/orphans/cloud/dismiss", {
        method: "POST",
        body: JSON.stringify({ index }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["backup-orphans"] });
      toast.success(data.message || "Cloud-orphan record cleared.");
    },
    onError: (error: Error) => {
      toast.error(`Failed to dismiss cloud-orphan record: ${error.message}`);
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
  const [restoreSetNotice, setRestoreSetNotice] = useState<string | null>(
    null,
  );

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
    onSuccess: (data) => {
      if (data.db_restored) {
        // Hard reload after a genuine DB import — same pattern as
        // single-file restore. Unchanged from pre-W6-A behaviour.
        window.location.reload();
        return;
      }
      if (data.db_notice || data.plugins_notice) {
        // Files-only outcome — see the matching comment in useBackups()
        // above for why this must not reload immediately.
        queryClient.invalidateQueries({ queryKey: ["backups"] });
        setRestoreSetNotice(
          [data.db_notice, data.plugins_notice].filter(Boolean).join(" "),
        );
        return;
      }
      window.location.reload();
    },
    onError: (error: Error) => {
      toast.error(`Set restore failed: ${error.message}`);
    },
  });

  // Delete all files in a set (local + cloud) and remove the set record.
  const deleteSetMutation = useMutation({
    mutationFn: (setId: string) =>
      wpApi<{ success: boolean }>(`/backup/sets/${setId}/delete`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backups"] });
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
        `/backup/engine/status?job_id=${jobId}`,
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
