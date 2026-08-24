// frontend-specialist fix: atoms/ → ui/ to eliminate cva TDZ in shared chunk
import React, { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CLOUD_TTL } from "../../../lib/cacheTtl";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import {
  useBackups,
  useBackupEngineStatus,
  useActiveBackupJobs,
} from "../../../hooks/useBackups";
import { useSettings } from "../../../hooks/useSettings";
import { wpApi } from "../../../services/api";
import { toast } from "sonner";
import {
  Loader2,
  AlertTriangle,
  HardDrive,
  Database,
  FileText,
  XCircle,
  Server,
  Cloud,
  Lock,
  FolderX,
  X,
} from "lucide-react";
import type { CreateBackupVariables } from "../../../hooks/useBackups";
import type { BackupExcludePathsResponse } from "../../../types";

// ─── Types ────────────────────────────────────────────────────────────────────

type CloudProvider = "gdrive" | "dropbox" | "s3" | "ftp" | "b2";

interface NestedInstallDialogState {
  isOpen: boolean;
  /** Nested install dirs not yet in the exclusion list. */
  unexcluded: string[];
  /** Currently active exclusion_paths list (needed so we can append to it). */
  currentExclusions: string[];
  /** Whether the "Exclude it" button is in-flight (saving exclusions). */
  isSaving: boolean;
}
type BackupDestination = "local" | CloudProvider;

// Normalised status shape — every provider endpoint returns at least one of these.
// We treat a provider as "available" when ANY truthy flag is present.
interface CloudProviderStatus {
  connected?: boolean;
  configured?: boolean;
  has_keys?: boolean;
}

// ─── Hook: Connected Providers ────────────────────────────────────────────────
// refetchOnMount: "always" ensures we get live status on every page visit, not
// cached data from before the user added credentials.  staleTime: 0 lets
// background refetches stay fast while mount always goes to the network.

interface ConnectedProviders {
  gdrive: boolean;
  dropbox: boolean;
  s3: boolean;
  ftp: boolean;
  b2: boolean;
  isLoading: boolean;
}

/** Returns true if any truthy flag is present in the status response. */
function isProviderReady(data: CloudProviderStatus | undefined): boolean {
  if (!data) return false;
  return !!(data.connected || data.configured || data.has_keys);
}

function useConnectedProviders(): ConnectedProviders {
  // EXP-4: Skip cloud status queries for free-tier users.
  // All 5 cloud endpoints require check_pro_permission — free-tier gets 403 on every call.
  // Without this guard, 5 providers × 2 retries = 10 failing requests per backup page visit.
  const hasCloudCapability =
    Array.isArray(window.swisswpsuiteData?.license?.capabilities) &&
    window.swisswpsuiteData.license.capabilities.includes("backup_cloud");

  // v2.9.30.117: staleTime 0→CLOUD_TTL (120 s), refetchOnMount "always"→true.
  // Cloud provider connection state changes only on user action (connect/disconnect),
  // which calls queryClient.invalidateQueries on the matching key — so freshness
  // is guaranteed on action while idle tab-switches are served from cache.
  const queryOpts = {
    staleTime: CLOUD_TTL,
    refetchOnMount: true,
    retry: 1,
    enabled: hasCloudCapability,
  };

  const { data: gdriveData, isLoading: gdriveLoading } =
    useQuery<CloudProviderStatus>({
      queryKey: ["gdrive-status"],
      queryFn: () =>
        wpApi<CloudProviderStatus>(
          `/backup/cloud/gdrive/status?_nocache=${Date.now()}`
        ),
      ...queryOpts,
    });
  const { data: dropboxData, isLoading: dropboxLoading } =
    useQuery<CloudProviderStatus>({
      queryKey: ["dropbox-status"],
      queryFn: () =>
        wpApi<CloudProviderStatus>(
          `/backup/cloud/dropbox/status?_nocache=${Date.now()}`
        ),
      ...queryOpts,
    });
  // S3 uses a dedicated status endpoint (not /cloud/list which only returns
  // configured=true after files already exist there).
  const { data: s3Data, isLoading: s3Loading } = useQuery<CloudProviderStatus>({
    queryKey: ["s3-status"],
    queryFn: () =>
      wpApi<CloudProviderStatus>(
        `/backup/cloud/s3/status?_nocache=${Date.now()}`
      ),
    ...queryOpts,
  });
  const { data: ftpData, isLoading: ftpLoading } =
    useQuery<CloudProviderStatus>({
      queryKey: ["ftp-status"],
      queryFn: () =>
        wpApi<CloudProviderStatus>(
          `/backup/cloud/ftp/status?_nocache=${Date.now()}`
        ),
      ...queryOpts,
    });
  const { data: b2Data, isLoading: b2Loading } = useQuery<CloudProviderStatus>({
    queryKey: ["b2-status"],
    queryFn: () =>
      wpApi<CloudProviderStatus>(
        `/backup/cloud/b2/status?_nocache=${Date.now()}`
      ),
    ...queryOpts,
  });

  return {
    gdrive: isProviderReady(gdriveData),
    dropbox: isProviderReady(dropboxData),
    s3: isProviderReady(s3Data),
    ftp: isProviderReady(ftpData),
    b2: isProviderReady(b2Data),
    isLoading:
      gdriveLoading || dropboxLoading || s3Loading || ftpLoading || b2Loading,
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CLOUD_DESTINATION_LABELS: Record<CloudProvider, string> = {
  gdrive: "Google Drive",
  dropbox: "Dropbox",
  s3: "Amazon S3",
  ftp: "FTP",
  b2: "Backblaze B2",
};

// ─── Component ────────────────────────────────────────────────────────────────

export const BackupControl: React.FC = () => {
  const queryClient = useQueryClient();
  const { createBackup, isCreating, createError } = useBackups();
  // Encryption status — drives the "Encrypted" badge near the Save button.
  // useSettings() is shared across the app (cached by TanStack Query); reading
  // it here adds no extra network round-trip.
  const { settings: appSettings } = useSettings();
  const encryptionActive = Boolean(appSettings?.hasEncryptionPassword);
  const [scope, setScope] = useState<"full" | "db" | "files">("full");
  const [destination, setDestination] = useState<BackupDestination>("local");
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  // ── Nested-install detection dialog state ──────────────────────────────
  // When the user clicks "Save Backup Now" we first check for unexcluded
  // nested WordPress installs.  If any are found, we pause and show this
  // dialog before proceeding.  On "Exclude it" we POST the paths, then
  // proceed.  On "Include everything" we proceed without exclusion.
  // On "Cancel" we abort entirely.
  const [nestedDialog, setNestedDialog] = useState<NestedInstallDialogState>({
    isOpen: false,
    unexcluded: [],
    currentExclusions: [],
    isSaving: false,
  });
  // WCAG 2.4.3 — capture trigger-element focus so we can restore on dialog close.
  const nestedDialogTriggerRef = useRef<HTMLElement | null>(null);
  const nestedDialogRef = useRef<HTMLDivElement>(null);

  // Engine job tracking — set after mutation returns 202 with job_id.
  // While set, the polling hook is active and the progress UI is shown.
  const [engineJobId, setEngineJobId] = useState<string | null>(null);

  // AbortController ref — aborts the in-flight backup fetch when Cancel is clicked.
  const abortControllerRef = useRef<AbortController | null>(null);
  // Guard so cancel's error path does not emit a duplicate toast after an abort.
  const cancelledRef = useRef<boolean>(false);
  // v2.9.30.112 fix: track job IDs that have already reached a terminal state
  // (complete/failed/cancelled) so the rehydration effect below does NOT re-adopt
  // them if useActiveBackupJobs still returns them from stale cache. Without this
  // guard the loop is: complete → setEngineJobId(null) → stale activeJobs cache
  // re-adopts the same job → engine status returns "complete" again → loop → #185.
  const terminatedJobIds = useRef<Set<string>>(new Set());

  const providers = useConnectedProviders();

  // Poll engine status every 2s while a job is active.
  const { data: engineStatusResponse } = useBackupEngineStatus(engineJobId);
  const engineStatus = engineStatusResponse?.data ?? null;

  // v2.9.30.100 — Rehydrate progress on mount/tab-switch. The engine job_id lives
  // only in this tab's memory, so after a reload we re-discover a still-running
  // MANUAL backup via /backup/engine/active and re-adopt its job_id. Adopting it
  // re-enables useBackupEngineStatus (which keys off engineJobId) so the existing
  // progress UI reappears and keeps advancing. We only rediscover while we are NOT
  // already tracking a job, and only adopt the manual job (automations render their
  // own progress inside BackupAutomationsPanel via automationJobIds).
  const { data: activeJobsResponse } = useActiveBackupJobs(!engineJobId);
  useEffect(() => {
    if (engineJobId) return; // Already tracking — nothing to rediscover.
    const jobs = activeJobsResponse?.data?.jobs ?? [];
    const manualJob = jobs.find(
      (j) =>
        j.trigger === "manual" &&
        j.status === "running" &&
        // v2.9.30.112: skip jobs that already reached a terminal state in this
        // session — the activeJobs stale cache may still list them as "running"
        // for up to gcTime (5 min), which would cause a re-adoption loop.
        !terminatedJobIds.current.has(j.job_id)
    );
    if (manualJob?.job_id) {
      setEngineJobId(manualJob.job_id);
    }
  }, [activeJobsResponse, engineJobId]);

  // React to engine terminal states: complete / failed / cancelled.
  // Depend only on `status` (a string scalar) — not on `errors` (array ref that
  // changes on every poll tick), to avoid unnecessary re-runs every 2 seconds.
  useEffect(() => {
    if (!engineStatus) return;
    if (engineStatus.status === "complete") {
      // Record the terminated job_id BEFORE clearing so the rehydration effect
      // above cannot re-adopt it from stale useActiveBackupJobs cache.
      // Use engineStatus.job_id (fresh from the API response) not the engineJobId
      // state variable (which could be stale in this closure).
      if (engineStatus.job_id)
        terminatedJobIds.current.add(engineStatus.job_id);
      setEngineJobId(null);
      queryClient.invalidateQueries({ queryKey: ["backups"] });
      toast.success("Backup completed successfully.");
    } else if (engineStatus.status === "failed") {
      const errMsg =
        engineStatus.errors.length > 0
          ? engineStatus.errors[engineStatus.errors.length - 1].message
          : "Unknown error";
      if (engineStatus.job_id)
        terminatedJobIds.current.add(engineStatus.job_id);
      setEngineJobId(null);
      toast.error(`Backup failed: ${errMsg}`);
    } else if (engineStatus.status === "cancelled") {
      if (engineStatus.job_id)
        terminatedJobIds.current.add(engineStatus.job_id);
      setEngineJobId(null);
      toast.info("Backup was cancelled.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineStatus?.status, queryClient]);

  // Build the list of connected cloud destinations to show in the picker.
  const connectedCloudProviders = (
    Object.keys(CLOUD_DESTINATION_LABELS) as CloudProvider[]
  ).filter((p) => providers[p]);
  const hasMultipleDestinations = connectedCloudProviders.length > 0;

  // ── Focusable selector (matches HardeningConfirmDialog pattern) ──────────
  const FOCUSABLE_SELECTOR =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  // Focus trap + Escape for the nested-install dialog
  useEffect(() => {
    if (!nestedDialog.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Cancel: close dialog, restore focus, do NOT start backup
        nestedDialogTriggerRef.current?.focus();
        setNestedDialog((prev) => ({ ...prev, isOpen: false }));
        return;
      }
      if (e.key !== "Tab" || !nestedDialogRef.current) return;
      const focusable = Array.from(
        nestedDialogRef.current.querySelectorAll<HTMLElement>(
          FOCUSABLE_SELECTOR
        )
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    // Move initial focus to first focusable element inside the dialog
    const firstFocusable =
      nestedDialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    firstFocusable?.focus();

    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nestedDialog.isOpen]);

  // ── Core backup-fire helper (shared by all dialog paths) ─────────────────
  const fireCreate = useCallback(() => {
    cancelledRef.current = false;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const vars: CreateBackupVariables = { scope, signal: controller.signal };
    if (destination !== "local") {
      vars.destination = destination;
    }
    createBackup(vars, {
      onSuccess: (data) => {
        const jobId = (data as { job_id?: string }).job_id;
        if (jobId) {
          setEngineJobId(jobId);
        }
      },
    });
  }, [createBackup, scope, destination]);

  // ── "Save Backup Now" click — detect unexcluded nested installs first ────
  const handleCreate = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      // Capture the trigger element for WCAG 2.4.3 focus restore
      nestedDialogTriggerRef.current = e.currentTarget as HTMLElement;

      let excludeData: BackupExcludePathsResponse | null = null;
      try {
        excludeData = await wpApi<BackupExcludePathsResponse>(
          "/backup/local/exclude-paths"
        );
      } catch (err) {
        // Detection failure — fall back to immediate backup (do not block user)
        console.warn(
          "[BackupControl] exclude-paths detection failed, proceeding without check:",
          err
        );
        fireCreate();
        return;
      }

      const nested: string[] = excludeData?.data?.nested_installs ?? [];
      const excluded: string[] = excludeData?.data?.exclude_paths ?? [];
      const unexcluded = nested.filter((d) => !excluded.includes(d));

      if (unexcluded.length === 0) {
        // Nothing to warn about — proceed immediately
        fireCreate();
        return;
      }

      // Show dialog: pause until the user decides
      setNestedDialog({
        isOpen: true,
        unexcluded,
        currentExclusions: excluded,
        isSaving: false,
      });
    },
    [fireCreate]
  );

  // ── Dialog action: "Exclude it" — save exclusions then start backup ──────
  const handleExcludeAndCreate = useCallback(async () => {
    setNestedDialog((prev) => ({ ...prev, isSaving: true }));
    const next = [
      ...nestedDialog.currentExclusions,
      ...nestedDialog.unexcluded.filter(
        (p) => !nestedDialog.currentExclusions.includes(p)
      ),
    ];
    try {
      await wpApi("/backup/local/exclude-paths", {
        method: "POST",
        body: JSON.stringify({ paths: next }),
      });
      // Invalidate the exclude-paths cache so BackupAutomationsPanel stays
      // in sync if the user opens it later in the same session.
      queryClient.invalidateQueries({ queryKey: ["backup-exclude-paths"] });
      toast.success("Nested install excluded. Starting backup…");
    } catch (err) {
      toast.error("Could not save exclusions — starting backup anyway.");
      console.warn("[BackupControl] exclude-paths save failed:", err);
    } finally {
      nestedDialogTriggerRef.current?.focus();
      setNestedDialog((prev) => ({
        ...prev,
        isOpen: false,
        isSaving: false,
      }));
      fireCreate();
    }
  }, [nestedDialog, queryClient, fireCreate]);

  // ── Dialog action: "Include everything" — proceed as-is ──────────────────
  const handleIncludeEverything = useCallback(() => {
    nestedDialogTriggerRef.current?.focus();
    setNestedDialog((prev) => ({ ...prev, isOpen: false }));
    fireCreate();
  }, [fireCreate]);

  // ── Dialog action: "Cancel" — abort, do nothing ───────────────────────────
  const handleNestedDialogCancel = useCallback(() => {
    nestedDialogTriggerRef.current?.focus();
    setNestedDialog((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleCancel = useCallback(async () => {
    setIsCancelling(true);
    cancelledRef.current = true;

    // Abort the in-flight fetch (belt-and-suspenders alongside the server-side flag).
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    try {
      if (engineJobId) {
        // Phase 5: engine-based cancel — sends job_id so the engine can clean up
        // partial ZIPs and abort cloud sessions for this specific job.
        await wpApi<{ success: boolean }>("/backup/engine/cancel", {
          method: "POST",
          body: JSON.stringify({ job_id: engineJobId }),
        });
      } else {
        // Legacy: synchronous backup cancel flag (backward compat).
        await wpApi<{ success: boolean }>("/backup/cancel", { method: "POST" });
      }
      toast.success("Cancel signal sent.");
    } catch (_err) {
      toast.error(
        "Could not send cancel signal. The backup may still complete."
      );
    } finally {
      setIsCancelling(false);
    }
  }, [engineJobId]);

  // ── Backup type card definitions ─────────────────────────────────────────
  const backupTypes: {
    id: "full" | "db" | "files";
    label: string;
    badge?: string;
    description: string;
    icon: React.ElementType;
    activeColor: string;
    activeBg: string;
    iconActiveBg: string;
    iconActiveText: string;
    borderActive: string;
    ringActive: string;
  }[] = [
    {
      id: "full",
      label: "Everything",
      badge: "Recommended",
      // P1-01/R-01 fix (ARS Round C): database restore IS available for this
      // backup type — restore_backup_set() imports the embedded dump when one
      // is found, taking a safety copy of the current database first.
      description:
        "The complete copy of your site — posts, images, plugins, themes, and all settings. Restoring this backup restores your files and, when the archive includes a database dump, your database too — a safety copy of your current database is saved first.",
      icon: HardDrive,
      activeColor: "emerald",
      activeBg: "bg-emerald-50/10",
      iconActiveBg: "bg-emerald-100",
      iconActiveText: "text-emerald-700",
      borderActive: "border-emerald-500",
      ringActive: "ring-emerald-500",
    },
    {
      id: "db",
      label: "Content Only",
      badge: "Faster",
      description:
        "Backs up your posts, pages, and settings — but not your images or design. Good for a quick save before editing content.",
      icon: Database,
      activeColor: "blue",
      activeBg: "bg-blue-50/10",
      iconActiveBg: "bg-blue-100",
      iconActiveText: "text-blue-700",
      borderActive: "border-blue-500",
      ringActive: "ring-blue-500",
    },
    {
      id: "files",
      label: "Design Files Only",
      badge: undefined,
      description:
        "Backs up your theme, images, and plugins — but not your posts or settings. Use this only if your content is already backed up separately.",
      icon: FileText,
      activeColor: "amber",
      activeBg: "bg-amber-50/10",
      iconActiveBg: "bg-amber-100",
      iconActiveText: "text-amber-700",
      borderActive: "border-amber-500",
      ringActive: "ring-amber-500",
    },
  ];

  return (
    <Card className="relative space-y-6 overflow-hidden p-6">
      {/* ── Heading ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="dark:text-foreground flex items-center gap-2 text-xl font-semibold text-gray-900">
          <HardDrive className="h-6 w-6 text-emerald-500" aria-hidden="true" />
          Save a Backup
        </h2>
      </div>

      {/* ── Creating / Engine progress state ───────────────────────── */}
      {engineJobId ? (
        /* ── Phase 5: progressive progress bar (engine-based backup) ── */
        <div
          className="animate-in fade-in flex flex-col items-center justify-center space-y-5 py-10 duration-500"
          aria-live="polite"
          aria-busy="true"
        >
          <h3 className="dark:text-foreground text-lg font-medium text-gray-900">
            {isCancelling
              ? "Stopping backup..."
              : (engineStatus?.progress?.phase_label ?? "Starting backup...")}
          </h3>

          {/* Progress bar — frozen while cancelling */}
          <div className="w-full max-w-md">
            <div
              className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700"
              role="progressbar"
              aria-valuenow={engineStatus?.progress?.percent ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Backup progress"
            >
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${isCancelling ? "bg-amber-400" : "bg-emerald-500"}`}
                style={{ width: `${engineStatus?.progress?.percent ?? 0}%` }}
              />
            </div>
          </div>

          {/* Percent + ETA — hidden while cancelling to avoid confusing updates */}
          {!isCancelling && (
            <p className="text-muted-foreground text-center text-sm">
              {engineStatus?.progress?.percent ?? 0}% complete
              {engineStatus?.progress?.eta_seconds != null &&
                engineStatus.progress.eta_seconds > 0 && (
                  <>
                    {" — about "}
                    {engineStatus.progress.eta_seconds < 60
                      ? `${engineStatus.progress.eta_seconds}s remaining`
                      : `${Math.ceil(engineStatus.progress.eta_seconds / 60)} min remaining`}
                  </>
                )}
            </p>
          )}

          {/* Non-blocking notice — page can stay open but doesn't need to */}
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50/10 px-4 py-2 text-amber-600">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm font-medium">
              Backup runs on the server — you can navigate away safely.
            </span>
          </div>

          {/* Slow backup diagnostic tip — only shows after 10+ minutes with <5% progress */}
          {engineStatus?.progress?.percent != null &&
            engineStatus.progress.percent < 5 &&
            engineStatus?.tick_count != null &&
            engineStatus.tick_count > 10 && (
              <div className="text-muted-foreground bg-muted/50 border-border rounded-lg border px-4 py-3 text-xs">
                <p className="mb-1 font-semibold">Backup seems slow?</p>
                <p>
                  Your hosting may be throttling background tasks. For best
                  performance, ask your hosting provider to set up a server-side
                  cron job for{" "}
                  <code className="bg-muted rounded px-1 text-xs">
                    wp-cron.php
                  </code>{" "}
                  running every 5 minutes. This ensures backups run reliably
                  even on low-traffic sites.
                </p>
              </div>
            )}

          {/* Cancel */}
          <Button
            variant="danger"
            size="sm"
            onClick={handleCancel}
            disabled={isCancelling}
            aria-label="Cancel the running backup"
            aria-busy={isCancelling}
            className="min-h-[44px]"
          >
            {isCancelling ? (
              <>
                <Loader2
                  className="mr-2 h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
                Cancelling...
              </>
            ) : (
              <>
                <XCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                Cancel Backup
              </>
            )}
          </Button>
        </div>
      ) : isCreating ? (
        /* ── Fallback: indeterminate spinner for legacy synchronous response ── */
        <div
          className="animate-in fade-in flex flex-col items-center justify-center space-y-4 py-12 duration-500"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="relative">
            <div className="absolute inset-0 animate-pulse rounded-full bg-emerald-500/20 blur-xl" />
            <Loader2
              className="relative z-10 h-16 w-16 animate-spin text-emerald-600"
              aria-hidden="true"
            />
          </div>
          <h3 className="dark:text-foreground text-lg font-medium text-gray-900">
            Generating Archive...
          </h3>
          <p className="text-muted-foreground max-w-md text-center text-sm">
            Compressing files and database. This process runs on the server and
            may take several minutes depending on your site size.
          </p>
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50/10 px-4 py-2 text-amber-600">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm font-medium">
              Please do not close this tab.
            </span>
          </div>
          {/* ── Cancel button ──────────────────────────────────── */}
          <Button
            variant="danger"
            size="sm"
            onClick={handleCancel}
            disabled={isCancelling}
            aria-label="Cancel the running backup"
            aria-busy={isCancelling}
            className="mt-2 min-h-[44px]"
          >
            {isCancelling ? (
              <>
                <Loader2
                  className="mr-2 h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
                Cancelling...
              </>
            ) : (
              <>
                <XCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                Cancel Backup
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-muted-foreground">
            Create an immediate backup of your WordPress installation. Choose
            what to include below.
          </p>

          {/* ── Error banner ────────────────────────────────────── */}
          {createError && !cancelledRef.current && (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <strong>Error:</strong> {(createError as Error).message}
            </div>
          )}

          {/* ── Backup type selector ─────────────────────────────── */}
          <div
            className="grid grid-cols-1 gap-4 md:grid-cols-3"
            role="radiogroup"
            aria-label="Backup type"
          >
            {backupTypes.map((type) => {
              const isSelected = scope === type.id;
              const Icon = type.icon;
              return (
                <div
                  key={type.id}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onClick={() => setScope(type.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setScope(type.id);
                    }
                  }}
                  className={`cursor-pointer rounded-xl border p-4 transition-all select-none focus:ring-2 focus:ring-blue-500/50 focus:outline-none ${
                    isSelected
                      ? `${type.borderActive} ${type.activeBg} ring-1 ${type.ringActive}`
                      : "border-border dark:border-border hover:border-border"
                  } `}
                >
                  <div className="mb-2 flex items-center gap-3">
                    <div
                      className={`rounded-lg p-2 ${isSelected ? `${type.iconActiveBg} ${type.iconActiveText}` : "bg-secondary text-gray-600"}`}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <span className="dark:text-foreground text-sm font-medium text-gray-900">
                      {type.label}
                    </span>
                    {type.badge && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          type.badge === "Recommended"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}
                      >
                        {type.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {type.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* ── Destination picker ───────────────────────────────── */}
          {hasMultipleDestinations && (
            <div className="space-y-2">
              <label
                htmlFor="backup-destination"
                className="dark:text-foreground block text-sm font-medium text-gray-900"
              >
                Save to:
              </label>
              <div
                className="flex flex-wrap gap-2"
                role="radiogroup"
                aria-label="Backup destination"
              >
                {/* Local option — always present */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={destination === "local"}
                  onClick={() => setDestination("local")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setDestination("local");
                    }
                  }}
                  className={`inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all focus:ring-2 focus:ring-blue-500/50 focus:outline-none ${
                    destination === "local"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500 dark:bg-emerald-900/20 dark:text-emerald-400"
                      : "bg-card border-border dark:text-foreground text-gray-700 hover:border-emerald-400"
                  } `}
                >
                  <Server className="h-3.5 w-3.5" aria-hidden="true" />
                  Local Server
                </button>

                {/* Connected cloud providers */}
                {connectedCloudProviders.map((provider) => (
                  <button
                    key={provider}
                    type="button"
                    role="radio"
                    aria-checked={destination === provider}
                    onClick={() => setDestination(provider)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setDestination(provider);
                      }
                    }}
                    className={`inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all focus:ring-2 focus:ring-blue-500/50 focus:outline-none ${
                      destination === provider
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500 dark:bg-emerald-900/20 dark:text-emerald-400"
                        : "bg-card border-border dark:text-foreground text-gray-700 hover:border-emerald-400"
                    } `}
                  >
                    <Cloud className="h-3.5 w-3.5" aria-hidden="true" />
                    {CLOUD_DESTINATION_LABELS[provider]}
                  </button>
                ))}
              </div>
              <p className="text-muted-foreground text-xs">
                {destination === "local"
                  ? "Backup will be stored on this server only."
                  : `Backup will be created locally, then automatically uploaded to ${CLOUD_DESTINATION_LABELS[destination as CloudProvider]}.`}
              </p>
            </div>
          )}

          {/* ── Create button + encryption status ────────────────── */}
          <div className="flex flex-col items-center gap-2 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={handleCreate}
              disabled={isCreating || nestedDialog.isOpen}
              aria-label="Save backup now"
              aria-busy={isCreating}
              className="min-h-[44px] w-full min-w-[160px] md:w-auto"
            >
              Save Backup Now
            </Button>
            {/* Encryption-active badge — drawn from useSettings(). Hidden when
                encryption is disabled so the UI stays uncluttered for the
                default (non-encrypted) flow. */}
            {encryptionActive && (
              <div
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 dark:border-emerald-800 dark:bg-emerald-900/20"
                role="status"
                aria-label="Encryption is active — this backup will be encrypted at rest"
              >
                <Lock
                  size={12}
                  className="shrink-0 text-emerald-600 dark:text-emerald-400"
                  aria-hidden="true"
                />
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  Encrypted
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Nested WordPress install detection dialog ──────────────────── */}
      {/* Rendered inside <Card> so it positions relative to the backup panel.
          The fixed-inset backdrop still covers the full viewport. */}
      {nestedDialog.isOpen && (
        <div
          className="bg-swiss-navy/50 animate-in fade-in fixed inset-0 z-[99997] flex items-center justify-center p-4 backdrop-blur-sm duration-200"
          aria-hidden="false"
        >
          <div
            ref={nestedDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="nested-install-dialog-title"
            aria-describedby="nested-install-dialog-desc"
            className="bg-card shadow-premium border-border animate-in zoom-in-95 flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border duration-300"
          >
            {/* Header */}
            <div className="border-border flex items-start justify-between gap-4 border-b p-6">
              <div className="flex items-center gap-3">
                <div className="shrink-0 rounded-xl bg-amber-100 p-2.5">
                  <FolderX
                    size={20}
                    className="text-amber-700"
                    aria-hidden="true"
                  />
                </div>
                <h2
                  id="nested-install-dialog-title"
                  className="text-swiss-navy text-lg leading-snug font-bold"
                >
                  Separate WordPress install detected
                </h2>
              </div>
              <button
                type="button"
                onClick={handleNestedDialogCancel}
                aria-label="Cancel and do not create backup"
                className="hover:text-swiss-navy hover:bg-secondary focus:ring-swiss-navy/50 shrink-0 rounded-xl border border-transparent p-2 text-neutral-400 transition-all focus:ring-2 focus:outline-none"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 p-6">
              <p
                id="nested-install-dialog-desc"
                className="text-sm leading-relaxed text-neutral-700"
              >
                We found a separate WordPress install inside your site that is
                not yet excluded from backups. Including it can make your backup
                very large (on some sites it doubled the backup size).
              </p>

              <ul
                className="space-y-2"
                aria-label="Detected nested WordPress installs"
              >
                {nestedDialog.unexcluded.map((dir) => (
                  <li
                    key={dir}
                    className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
                  >
                    <FolderX
                      size={14}
                      className="shrink-0 text-amber-600"
                      aria-hidden="true"
                    />
                    <code className="font-mono text-xs break-all text-amber-900">
                      {dir}
                    </code>
                  </li>
                ))}
              </ul>

              <p className="text-xs leading-relaxed text-neutral-500">
                Excluding it keeps your backups lean. You can always re-include
                it later from the backup exclusions panel.
              </p>
            </div>

            {/* Footer — three actions */}
            <div className="border-border bg-background flex flex-col items-stretch justify-end gap-2 border-t p-5 sm:flex-row sm:items-center">
              {/* Cancel — do nothing */}
              <button
                type="button"
                onClick={handleNestedDialogCancel}
                disabled={nestedDialog.isSaving}
                className="hover:bg-secondary focus:ring-swiss-navy/50 order-last inline-flex items-center justify-center rounded-full bg-transparent px-5 py-2.5 text-sm font-semibold text-neutral-600 transition-all hover:text-neutral-900 focus:ring-2 focus:outline-none sm:order-first"
              >
                Cancel
              </button>

              {/* Include everything — proceed without exclusion */}
              <button
                type="button"
                onClick={handleIncludeEverything}
                disabled={nestedDialog.isSaving}
                className="border-border bg-secondary hover:bg-muted focus:ring-swiss-navy/50 inline-flex items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold text-neutral-700 transition-all focus:ring-2 focus:outline-none"
              >
                Include everything
              </button>

              {/* Exclude it — primary action */}
              <button
                type="button"
                onClick={handleExcludeAndCreate}
                disabled={nestedDialog.isSaving}
                aria-busy={nestedDialog.isSaving}
                className="bg-swiss-navy focus:ring-swiss-navy/50 inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                {nestedDialog.isSaving ? (
                  <>
                    <Loader2
                      size={14}
                      className="animate-spin"
                      aria-hidden="true"
                    />
                    Saving…
                  </>
                ) : (
                  <>
                    <FolderX size={14} aria-hidden="true" />
                    Exclude it
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
