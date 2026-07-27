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

interface RestoreBackupResponse {
  success: boolean;
  message: string;
}

interface DeleteBackupVariables {
  filename: string;
}

export function useBackups() {
  const queryClient = useQueryClient();

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
    onSuccess: () => {
      // Force reload to reset DB connection and session
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
 * Reads the backup sets returned alongside the flat list.
 * Re-uses the same ["backups"] cache key so no extra network request is made.
 * Mutations for set-level restore and delete hit the new set endpoints.
 */
export function useBackupSets() {
  const queryClient = useQueryClient();

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
      wpApi<{ success: boolean; message: string }>(
        `/backup/sets/${setId}/restore`,
        { method: "POST" },
      ),
    onSuccess: () => {
      // Hard reload after restore — same pattern as single-file restore.
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

  return {
    sets,
    isLoading,
    restoreSet: restoreSetMutation.mutate,
    isRestoringSet: restoreSetMutation.isPending,
    restoringSetId: restoreSetMutation.isPending
      ? (restoreSetMutation.variables ?? null)
      : null,
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
