/**
 * BackupAutomationsPanel — Phase 4: Backup Automations Manager UI
 *
 * Authored by: Frontend Specialist
 * Version: 2.9.7.27
 *
 * Displays, creates, edits, enables/disables, and triggers backup automations.
 * Designed for non-technical WordPress site owners — every label uses plain English
 * with helper text explaining scope, schedule, and destination choices.
 *
 * API contract:
 *   GET    /backup/automations              → BackupAutomationsResponse
 *   POST   /backup/automations              → BackupAutomationResponse (201)
 *   GET    /backup/automations/:id          → BackupAutomationResponse
 *   PATCH  /backup/automations/:id          → BackupAutomationResponse
 *   DELETE /backup/automations/:id          → { success, message }
 *   POST   /backup/automations/:id/run      → { success, message }
 */

import React, {
  useState,
  useId,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarClock,
  Plus,
  Play,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  HardDrive,
  Database,
  FolderOpen,
  Cloud,
  Info,
  X,
  AlertTriangle,
  Inbox,
  Lock,
  FolderMinus,
  ShieldAlert,
} from "lucide-react";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { Badge } from "../../ui/Badge";
import { wpApi } from "../../../services/api";
import {
  useBackupEngineStatus,
  useActiveBackupJobs,
} from "../../../hooks/useBackups";
import type {
  BackupAutomation,
  BackupAutomationsResponse,
  BackupAutomationResponse,
  BackupExcludePathsResponse,
} from "../../../types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_AUTOMATIONS = 10;

const SCHEDULE_OPTIONS: {
  value: BackupAutomation["schedule"];
  label: string;
  icon: React.ElementType;
  description: string;
}[] = [
  {
    value: "hourly",
    label: "Hourly",
    icon: Clock,
    description:
      "Every hour (use only for critical sites — generates many files)",
  },
  {
    value: "twicedaily",
    label: "Twice daily",
    icon: CalendarClock,
    description: "Every 12 hours",
  },
  {
    value: "daily",
    label: "Daily",
    icon: CalendarClock,
    description: "Once per day — recommended for most sites",
  },
  {
    value: "weekly",
    label: "Weekly",
    icon: CalendarClock,
    description: "Once per week (for low-traffic sites)",
  },
];

const SCOPE_OPTIONS: {
  value: BackupAutomation["scope"];
  label: string;
  icon: React.ElementType;
  description: string;
}[] = [
  {
    value: "full",
    label: "Full backup",
    icon: HardDrive,
    description:
      "Everything: your files AND database. Best for complete site recovery. (Largest file size)",
  },
  {
    value: "db",
    label: "Database only",
    icon: Database,
    description:
      "Just your WordPress database: posts, settings, users. Fast and small. (No media files)",
  },
  {
    value: "files",
    label: "Files only",
    icon: FolderOpen,
    description:
      "Just your WordPress files: themes, plugins, uploads. No database included.",
  },
];

const DESTINATION_LABELS: Record<BackupAutomation["destination"], string> = {
  local: "Local server",
  gdrive: "Google Drive",
  dropbox: "Dropbox",
  s3: "Amazon S3",
  ftp: "FTP",
  b2: "Backblaze B2",
};

const DESTINATION_DESCRIPTIONS: Record<
  BackupAutomation["destination"],
  string
> = {
  local: "Keep the backup on this server only. Fast but no offsite protection.",
  gdrive: "Send backup to your Google Drive account.",
  dropbox: "Send backup to your Dropbox account.",
  s3: "Send backup to your Amazon S3 bucket.",
  ftp: "Send backup to your FTP/SFTP server.",
  b2: "Send backup to your Backblaze B2 bucket.",
};

const SCHEDULE_DISPLAY: Record<BackupAutomation["schedule"], string> = {
  hourly: "Every hour",
  twicedaily: "Every 12 hours",
  daily: "Every day",
  weekly: "Every week",
};

/**
 * E6 (2026-08-20) — day-of-week options for the weekly start-day picker.
 * Value convention (0=Sunday..6=Saturday) matches PHP DateTime's 'w' format
 * used server-side in compute_start_time_anchor() — do not renumber.
 */
const WEEKDAY_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const inputClass =
  "w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background dark:bg-card text-gray-900 dark:text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";

const labelClass =
  "block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return "Never";
  // FIX-UTC: PHP stores timestamps via gmdate() (UTC) without a timezone suffix.
  // new Date('2026-05-21 02:14:33') is parsed as LOCAL time by JS engines, causing
  // "22h ago" instead of "24h ago" for UTC+2 users. Appending ' UTC' forces correct
  // UTC interpretation. ISO 8601 strings that already contain 'T' or 'Z' are left untouched.
  const normalized =
    isoString.includes("T") || isoString.includes("Z")
      ? isoString
      : isoString + " UTC";
  const date = new Date(normalized);
  if (isNaN(date.getTime())) return "Never";
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

type CountdownUrgency =
  "normal" | "urgent" | "overdue" | "disabled" | "running";

interface CountdownParts {
  label: string;
  urgency: CountdownUrgency;
}

/**
 * Compute a human-readable countdown label and urgency level from a next_run
 * value. Pure function — safe to call on every render tick.
 *
 * @param nextRun  MySQL datetime string from the API, or "Disabled".
 * @param isRunning  Whether this automation's last_run_status is "running".
 * @param enabled  Whether the automation is enabled.
 */
function buildCountdownParts(
  nextRun: string,
  isRunning: boolean,
  enabled: boolean
): CountdownParts {
  // Running takes priority regardless of the next_run timestamp.
  if (isRunning) {
    return { label: "Running now", urgency: "running" };
  }

  // Explicit "Disabled" sentinel from PHP or automation is off.
  if (!enabled || nextRun === "Disabled" || !nextRun) {
    return { label: "Disabled", urgency: "disabled" };
  }

  // PHP now returns ISO 8601 UTC (e.g. "2026-04-08T16:34:02Z").
  // Also handle legacy MySQL format ("2026-04-08 16:34:02") by appending Z.
  const raw = nextRun.includes("T") ? nextRun : nextRun.replace(" ", "T") + "Z";
  const date = new Date(raw);
  if (isNaN(date.getTime())) {
    return { label: nextRun, urgency: "normal" };
  }

  const diffMs = date.getTime() - Date.now();

  if (diffMs <= 0) {
    return { label: "Overdue", urgency: "overdue" };
  }

  const totalMin = Math.floor(diffMs / 60_000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;

  // Always show hours + minutes for precision.
  if (hours >= 1) {
    const label =
      mins > 0 ? `Next run in ${hours}h ${mins}m` : `Next run in ${hours}h`;
    const urgency: CountdownUrgency = hours < 1 ? "urgent" : "normal";
    return { label, urgency };
  }
  const urgency: CountdownUrgency = totalMin < 10 ? "urgent" : "normal";
  return { label: `Next run in ${totalMin}m`, urgency };
}

/**
 * Format a byte count into a compact human-readable string (e.g. "1.4 GB").
 * Used by the indeterminate engine-progress byte counter. Local to this panel —
 * not exported to avoid coupling other components to this module.
 */
function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

/**
 * Returns a counter that increments every `intervalMs` milliseconds (default
 * 60 000 = 1 minute). Consuming components re-render each tick so countdown
 * labels stay fresh without a page reload.
 */
function useCountdownTick(intervalMs = 60_000): number {
  const [tick, setTick] = React.useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return tick;
}

// ---------------------------------------------------------------------------
// NextRunBadge — live countdown pill for an automation card
// ---------------------------------------------------------------------------

interface NextRunBadgeProps {
  nextRun: string;
  lastRunStatus: BackupAutomation["last_run_status"];
  enabled: boolean;
}

const NextRunBadge: React.FC<NextRunBadgeProps> = ({
  nextRun,
  lastRunStatus,
  enabled,
}) => {
  // Subscribe to the 60-second tick so this component re-renders automatically.
  useCountdownTick();

  const isRunning = lastRunStatus === "running";
  const { label, urgency } = buildCountdownParts(nextRun, isRunning, enabled);

  const colorClass: Record<CountdownUrgency, string> = {
    running:
      "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700",
    urgent:
      "text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700",
    overdue:
      "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700",
    disabled:
      "text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700",
    normal:
      "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${colorClass[urgency]}`}
      aria-live="polite"
      aria-label={label}
    >
      <Clock size={10} aria-hidden="true" />
      {label}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Status badge sub-component
// ---------------------------------------------------------------------------

interface StatusBadgeProps {
  status: BackupAutomation["last_run_status"];
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  if (status === "success") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
        <CheckCircle2 size={11} aria-hidden="true" />
        Success
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
        <XCircle size={11} aria-hidden="true" />
        Failed
      </span>
    );
  }
  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
        <Loader2 size={11} className="animate-spin" aria-hidden="true" />
        Running
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
      Never run
    </span>
  );
};

// ---------------------------------------------------------------------------
// Connected providers hook — mirrors CloudStoragePanel query pattern
// ---------------------------------------------------------------------------

interface ConnectedProviders {
  gdrive: boolean;
  dropbox: boolean;
  s3: boolean;
  ftp: boolean;
  b2: boolean;
  isLoading: boolean;
}

function useConnectedProviders(enabled: boolean): ConnectedProviders {
  const { data: gdriveData, isLoading: gdriveLoading } = useQuery<{
    connected: boolean;
  }>({
    queryKey: ["gdrive-status"],
    queryFn: () =>
      wpApi<{ connected: boolean }>(
        `/backup/cloud/gdrive/status?_nocache=${Date.now()}`
      ),
    enabled,
    staleTime: 60_000,
    retry: 1,
  });
  const { data: dropboxData, isLoading: dropboxLoading } = useQuery<{
    connected: boolean;
  }>({
    queryKey: ["dropbox-status"],
    queryFn: () =>
      wpApi<{ connected: boolean }>(
        `/backup/cloud/dropbox/status?_nocache=${Date.now()}`
      ),
    enabled,
    staleTime: 60_000,
    retry: 1,
  });
  const { data: s3Data, isLoading: s3Loading } = useQuery<{
    configured: boolean;
  }>({
    queryKey: ["cloud-status"],
    queryFn: async () => {
      const res = await wpApi<{ success: boolean; configured: boolean }>(
        "/backup/cloud/list"
      );
      return { configured: res?.configured ?? false };
    },
    enabled,
    staleTime: 60_000,
    retry: 1,
  });
  const { data: ftpData, isLoading: ftpLoading } = useQuery<{
    connected: boolean;
  }>({
    queryKey: ["ftp-status"],
    queryFn: () =>
      wpApi<{ connected: boolean }>(
        `/backup/cloud/ftp/status?_nocache=${Date.now()}`
      ),
    enabled,
    staleTime: 60_000,
    retry: 1,
  });
  const { data: b2Data, isLoading: b2Loading } = useQuery<{
    connected: boolean;
  }>({
    queryKey: ["b2-status"],
    queryFn: () =>
      wpApi<{ connected: boolean }>(
        `/backup/cloud/b2/status?_nocache=${Date.now()}`
      ),
    enabled,
    staleTime: 60_000,
    retry: 1,
  });

  return {
    gdrive: gdriveData?.connected ?? false,
    dropbox: dropboxData?.connected ?? false,
    s3: s3Data?.configured ?? false,
    ftp: ftpData?.connected ?? false,
    b2: b2Data?.connected ?? false,
    isLoading:
      gdriveLoading || dropboxLoading || s3Loading || ftpLoading || b2Loading,
  };
}

// ---------------------------------------------------------------------------
// Automation form shape
// ---------------------------------------------------------------------------

interface AutomationFormData {
  name: string;
  schedule: BackupAutomation["schedule"];
  scope: BackupAutomation["scope"];
  destination: BackupAutomation["destination"];
  retention: number;
  /**
   * E6 (2026-08-20) — optional site-local time (HH:MM, 24h) the automation
   * should first fire at. Empty string means "not set" (legacy anchor
   * behavior). Kept as a plain string (not `string | null`) so the <input
   * type="time"> element can bind directly without a null-guard on every
   * render.
   */
  start_time: string;
  /**
   * E6 — day of week (0=Sunday..6=Saturday) the automation should first fire
   * on. Only meaningful (and only shown in the UI) when schedule === 'weekly'
   * AND start_time is set. `null` means "not set".
   */
  start_day: number | null;
}

const DEFAULT_FORM: AutomationFormData = {
  name: "",
  schedule: "daily",
  scope: "full",
  destination: "local",
  retention: 7,
  start_time: "",
  start_day: null,
};

/**
 * Pure decision logic extracted from the AutomationModal mount-effect so it
 * is unit-testable without rendering the component (BUG A FIX, 2026-08-05).
 * Builds the list of destinations currently usable, given which providers
 * are connected.
 */
export function computeAvailableDestinations(connectedProviders: {
  gdrive: boolean;
  dropbox: boolean;
  s3: boolean;
  ftp: boolean;
  b2: boolean;
}): BackupAutomation["destination"][] {
  return [
    "local",
    ...(connectedProviders.gdrive ? (["gdrive"] as const) : []),
    ...(connectedProviders.dropbox ? (["dropbox"] as const) : []),
    ...(connectedProviders.s3 ? (["s3"] as const) : []),
    ...(connectedProviders.ftp ? (["ftp"] as const) : []),
    ...(connectedProviders.b2 ? (["b2"] as const) : []),
  ];
}

/**
 * Decides whether the modal should silently-in-memory reset the selected
 * destination back to "local", given the CURRENT provider-status loading
 * state. THE P0 ASSERTION: this must return `shouldReset: false` while
 * `isLoading` is true, no matter what `availableDestinations` looks like —
 * pre-fix, the reset effect judged availability using the loading-default
 * ("all providers false") state because it never waited for isLoading to
 * clear, silently downgrading any cloud automation opened before its
 * connected-providers queries resolved.
 */
export function evaluateDestinationReset(
  currentDestination: BackupAutomation["destination"],
  availableDestinations: BackupAutomation["destination"][],
  isLoading: boolean
): { shouldReset: boolean } {
  if (isLoading) {
    return { shouldReset: false };
  }
  return { shouldReset: !availableDestinations.includes(currentDestination) };
}

/**
 * E2 fix (2026-08-20, FIX_PLAN_VALIDATION_BACKUP_SCHEDULER audit): the Edit
 * modal's form always holds every field (it has to — the form needs a value
 * to render each control), so submitting it unmodified previously sent the
 * FULL AutomationFormData on every save, including 'schedule', even for a
 * pure rename or retention change. That is a "stale-looking" resubmit in the
 * sense the audit was checking for: since E4 now makes an explicitly-present
 * 'schedule' key force a full cron clear+reschedule (by design — see
 * automations.php::update()), a full-form PATCH would make EVERY edit
 * (rename-only, retention-only) also force a cron re-register, which is
 * unnecessary churn and log noise for changes that never touched the
 * schedule.
 *
 * This pure diff keeps the fix targeted: only fields whose value actually
 * differs from the automation being edited are included in the PATCH body.
 * Enable/disable already goes through its own single-field payload
 * (toggleMutation, below) and was NOT part of this bug — audited and
 * confirmed unaffected.
 *
 * NOT used for create() — a new automation has no "original" to diff
 * against and the backend's create() path requires the full field set.
 */
export function diffAutomationFormData(
  data: AutomationFormData,
  original: BackupAutomation
): Partial<AutomationFormData> {
  const diff: Partial<AutomationFormData> = {};
  if (data.name !== original.name) diff.name = data.name;
  if (data.schedule !== original.schedule) diff.schedule = data.schedule;
  if (data.scope !== original.scope) diff.scope = data.scope;
  if (data.destination !== original.destination)
    diff.destination = data.destination;
  if (data.retention !== original.retention) diff.retention = data.retention;
  // start_time: normalize "" (unset) vs null/undefined so an automation that
  // has never had a start_time set doesn't get diffed against an empty string.
  const originalStartTime = original.start_time ?? "";
  if (data.start_time !== originalStartTime) diff.start_time = data.start_time;
  const originalStartDay = original.start_day ?? null;
  if (data.start_day !== originalStartDay) diff.start_day = data.start_day;
  return diff;
}

// ---------------------------------------------------------------------------
// AutomationModal — create / edit
// ---------------------------------------------------------------------------

interface AutomationModalProps {
  mode: "create" | "edit";
  automation: BackupAutomation | null;
  connectedProviders: ConnectedProviders;
  onClose: () => void;
  onSave: (data: AutomationFormData) => void;
  isSaving: boolean;
}

const AutomationModal: React.FC<AutomationModalProps> = ({
  mode,
  automation,
  connectedProviders,
  onClose,
  onSave,
  isSaving,
}) => {
  const titleId = useId();
  const saveBlockedReasonId = useId();
  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<AutomationFormData>(() => {
    if (automation) {
      return {
        name: automation.name,
        schedule: automation.schedule,
        scope: automation.scope,
        destination: automation.destination,
        retention: automation.retention,
        start_time: automation.start_time ?? "",
        start_day: automation.start_day ?? null,
      };
    }
    return { ...DEFAULT_FORM };
  });

  // Focus trap: keep focus inside the modal
  useEffect(() => {
    firstFocusRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const modal = modalRef.current;
      if (!modal) return;
      const focusable = modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const availableDestinations: BackupAutomation["destination"][] =
    computeAvailableDestinations(connectedProviders);

  // BUG A FIX (2026-08-05): the original effect ran once on mount with an
  // empty dependency array — BEFORE the gdrive/dropbox/s3/ftp/b2 "connected"
  // queries had resolved. Every hook defaults its "connected" flag to
  // `false` while its query is loading (`data?.connected ?? false`), so on
  // mount `availableDestinations` was ALWAYS just `["local"]`, and any
  // automation whose real destination was a cloud provider had its
  // in-memory form.destination silently overwritten to "local" before the
  // user ever saw the modal. If they then hit Save (e.g. only to rename the
  // automation or change retention), that silent overwrite was persisted by
  // the PATCH — permanently downgrading a cloud automation to local with no
  // warning. This is the confirmed mechanism behind live evidence: an
  // automation named "...on Google Drive" whose stored `destination` was
  // "local".
  //
  // Fix: (1) wait for connectedProviders.isLoading to clear before judging
  // availability, so a fast click into Edit right after page load can no
  // longer race the status queries; (2) never silently discard — surface a
  // visible, persistent warning in the modal AND a toast, and only reset
  // the in-memory field, never assume the user still wants to save. A
  // provider that is genuinely disconnected (expired token, revoked access)
  // still can't be selected, but the user is now told why, instead of the
  // automation silently downgrading in the background.
  const [destinationUnavailableWarning, setDestinationUnavailableWarning] =
    useState<string | null>(null);
  const warnedRef = useRef(false);
  useEffect(() => {
    if (warnedRef.current) return; // only ever downgrade once per modal session
    const { shouldReset } = evaluateDestinationReset(
      form.destination,
      availableDestinations,
      connectedProviders.isLoading
    );
    if (shouldReset) {
      warnedRef.current = true;
      const label = DESTINATION_LABELS[form.destination];
      setDestinationUnavailableWarning(
        `${label} is not connected anymore, so this automation has been switched to Local storage. Reconnect ${label} in Cloud Storage settings and re-select it below if you want offsite backups to resume, before saving.`
      );
      toast.warning(
        `${label} is disconnected — this automation was reset to Local storage. Review before saving.`
      );
      setForm((f) => ({ ...f, destination: "local" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    connectedProviders.isLoading,
    connectedProviders.gdrive,
    connectedProviders.dropbox,
    connectedProviders.s3,
    connectedProviders.ftp,
    connectedProviders.b2,
  ]);

  // SAVE-WHILE-LOADING GUARD (2026-08-08, §3.4 third bullet): while
  // connectedProviders.isLoading is true, the reset-effect above
  // intentionally does NOT judge availability yet (that is the Bug A fix
  // above) — but that means there is a window, right after opening Edit on
  // an existing cloud automation, where form.destination still holds the
  // automation's real stored cloud value and we genuinely do not yet know
  // whether that provider is still connected. The backend's
  // validate_fields() only checks that the destination is one of the known
  // ALLOWED_DESTINATIONS enum values — it has no connectivity check (see
  // plugin/includes/class-swisswpsuite-backup-automations.php:683-699) — so
  // nothing stops a Save fired in that window from persisting a cloud
  // destination for a since-disconnected provider. Local has no
  // connectivity concern, so it is exempt. Backend-side connectivity
  // validation is a separate, out-of-scope follow-up (residual).
  const isSaveBlockedByProviderLoad =
    connectedProviders.isLoading && form.destination !== "local";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Please give this automation a name.");
      return;
    }
    if (form.retention < 1 || form.retention > 30) {
      toast.error("Keep between 1 and 30 copies.");
      return;
    }
    if (isSaveBlockedByProviderLoad) {
      toast.error(
        "Still confirming cloud connection status — please wait a moment before saving."
      );
      return;
    }
    onSave(form);
  };

  return (
    <div
      className="fixed inset-0 z-[99990] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      aria-modal="true"
      role="dialog"
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="bg-card dark:bg-secondary border-border max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border shadow-2xl"
      >
        {/* Modal header */}
        <div className="border-border flex items-center justify-between border-b p-6">
          <h2
            id={titleId}
            className="dark:text-foreground text-lg font-bold text-gray-900"
          >
            {mode === "create" ? "Create Backup Automation" : "Edit Automation"}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground dark:hover:text-foreground hover:bg-secondary rounded-lg p-1.5 transition-colors hover:text-gray-900"
            aria-label="Close modal"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {/* Name */}
          <div>
            <label htmlFor="automation-name" className={labelClass}>
              Automation name
            </label>
            <input
              ref={firstFocusRef}
              id="automation-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Daily Full Backup to Google Drive"
              className={inputClass}
              maxLength={60}
              required
            />
            <p className="text-muted-foreground mt-1 text-xs">
              Give this automation a name so you can identify it at a glance.
            </p>
            {form.name.length > 40 && (
              <p className="text-muted-foreground mt-0.5 text-right text-xs">
                {form.name.length}/60 characters
              </p>
            )}
          </div>

          {/* Scope — what to back up */}
          <fieldset>
            <legend className={labelClass}>What to back up</legend>
            <div className="mt-1 space-y-2">
              {SCOPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = form.scope === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-border hover:bg-secondary/50 hover:border-blue-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="scope"
                      value={opt.value}
                      checked={isSelected}
                      onChange={() =>
                        setForm((f) => ({ ...f, scope: opt.value }))
                      }
                      className="sr-only"
                    />
                    <Icon
                      size={18}
                      className={`mt-0.5 flex-shrink-0 ${isSelected ? "text-blue-500" : "text-muted-foreground"}`}
                      aria-hidden="true"
                    />
                    <span>
                      <span
                        className={`block text-sm font-semibold ${isSelected ? "text-blue-700 dark:text-blue-300" : "dark:text-foreground text-gray-900"}`}
                      >
                        {opt.label}
                      </span>
                      <span className="text-muted-foreground mt-0.5 block text-xs">
                        {opt.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* Schedule — how often */}
          <div>
            <label htmlFor="automation-schedule" className={labelClass}>
              How often
            </label>
            <select
              id="automation-schedule"
              value={form.schedule}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  schedule: e.target.value as BackupAutomation["schedule"],
                }))
              }
              className={inputClass}
            >
              {SCHEDULE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} — {opt.description}
                </option>
              ))}
            </select>
            {form.schedule === "hourly" && (
              <p className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle
                  size={12}
                  className="mt-0.5 flex-shrink-0"
                  aria-hidden="true"
                />
                Hourly backups generate a lot of files. Make sure your retention
                limit is low enough to avoid filling up disk space.
              </p>
            )}
          </div>

          {/* Start time — E6 (2026-08-20). Optional: leaving this blank keeps the
              existing behavior (first run ~1 interval from now / from last run). */}
          <div>
            <label htmlFor="automation-start-time" className={labelClass}>
              Start time (optional)
            </label>
            <div className="flex items-center gap-3">
              <input
                id="automation-start-time"
                type="time"
                value={form.start_time}
                onChange={(e) =>
                  setForm((f) => ({ ...f, start_time: e.target.value }))
                }
                className={`${inputClass} w-36`}
              />
              {form.schedule === "weekly" && form.start_time && (
                <select
                  id="automation-start-day"
                  aria-label="Day of the week"
                  value={form.start_day ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      start_day:
                        e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                  className={`${inputClass} flex-1`}
                >
                  <option value="">Any day</option>
                  {WEEKDAY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}
              {form.start_time && (
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, start_time: "", start_day: null }))
                  }
                  className="text-muted-foreground dark:hover:text-foreground flex-shrink-0 rounded px-2 py-1.5 text-xs font-semibold transition-colors hover:text-gray-900"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {form.start_time
                ? `First run at ${form.start_time} (your site's local time). Leave this blank to let SwissSuite AI pick a start time automatically.`
                : "Leave blank to let SwissSuite AI pick a start time automatically, or set one so backups always begin around the same time of day."}
            </p>
          </div>

          {/* Destination — where to send it */}
          <fieldset>
            <legend className={labelClass}>Where to send it</legend>
            {destinationUnavailableWarning && (
              <p
                role="alert"
                className="mb-2 flex items-start gap-1.5 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
              >
                <AlertTriangle
                  size={14}
                  className="mt-0.5 flex-shrink-0"
                  aria-hidden="true"
                />
                {destinationUnavailableWarning}
              </p>
            )}
            {connectedProviders.isLoading ? (
              <div className="text-muted-foreground flex items-center gap-2 p-3 text-sm">
                <Loader2
                  size={14}
                  className="animate-spin"
                  aria-hidden="true"
                />
                Loading connected providers…
              </div>
            ) : (
              <div className="mt-1 space-y-2">
                {availableDestinations.map((dest) => {
                  const isSelected = form.destination === dest;
                  return (
                    <label
                      key={dest}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all ${
                        isSelected
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-border hover:bg-secondary/50 hover:border-blue-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="destination"
                        value={dest}
                        checked={isSelected}
                        onChange={() =>
                          setForm((f) => ({ ...f, destination: dest }))
                        }
                        className="sr-only"
                      />
                      <Cloud
                        size={16}
                        className={`mt-0.5 flex-shrink-0 ${isSelected ? "text-blue-500" : "text-muted-foreground"}`}
                        aria-hidden="true"
                      />
                      <span>
                        <span
                          className={`block text-sm font-semibold ${isSelected ? "text-blue-700 dark:text-blue-300" : "dark:text-foreground text-gray-900"}`}
                        >
                          {DESTINATION_LABELS[dest]}
                        </span>
                        <span className="text-muted-foreground mt-0.5 block text-xs">
                          {DESTINATION_DESCRIPTIONS[dest]}
                        </span>
                      </span>
                    </label>
                  );
                })}
                {availableDestinations.length === 1 && (
                  <p className="text-muted-foreground mt-2 flex items-start gap-1.5 text-xs">
                    <Info
                      size={12}
                      className="mt-0.5 flex-shrink-0"
                      aria-hidden="true"
                    />
                    Only Local is available. Connect a cloud provider in the
                    Cloud Storage section below to send backups offsite.
                  </p>
                )}
              </div>
            )}
          </fieldset>

          {/* Retention — how many copies to keep */}
          <div>
            <label htmlFor="automation-retention" className={labelClass}>
              Keep how many copies
            </label>
            <div className="flex items-center gap-3">
              <input
                id="automation-retention"
                type="number"
                min={1}
                max={30}
                value={form.retention}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    retention: parseInt(e.target.value, 10) || 1,
                  }))
                }
                className={`${inputClass} w-28`}
              />
              <span className="text-muted-foreground text-sm">backups</span>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Older backups are deleted automatically when this limit is
              reached. We recommend at least 5.
            </p>
            {form.destination !== "local" && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle
                  size={12}
                  className="mt-0.5 flex-shrink-0"
                  aria-hidden="true"
                />
                This limit also applies to your cloud storage — older backups
                are deleted from your cloud provider automatically, the same as
                Local. If a specific file ever can't be removed automatically
                (e.g. it predates this version), it will be flagged for you
                above the backup list instead of being kept silently.
              </p>
            )}
          </div>

          {/* Form actions */}
          <div className="border-border border-t pt-2">
            {isSaveBlockedByProviderLoad && (
              <p
                id={saveBlockedReasonId}
                className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs"
                aria-live="polite"
              >
                <Loader2
                  size={12}
                  className="flex-shrink-0 animate-spin"
                  aria-hidden="true"
                />
                Confirming cloud connection status — Save is disabled until this
                finishes, so a disconnected provider can&rsquo;t be saved by
                mistake.
              </p>
            )}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={isSaving}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={isSaving}
                disabled={isSaveBlockedByProviderLoad}
                aria-describedby={
                  isSaveBlockedByProviderLoad ? saveBlockedReasonId : undefined
                }
                className="flex-1"
              >
                {mode === "create" ? "Create Automation" : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// AutomationCard — single row in the list
// ---------------------------------------------------------------------------

interface AutomationCardProps {
  automation: BackupAutomation;
  onEdit: () => void;
  onToggle: () => void;
  onRunNow: () => void;
  onDelete: () => void;
  isToggling: boolean;
  isRunning: boolean;
  isPolling: boolean;
  isDeleting: boolean;
  deleteConfirmId: string | null;
  onDeleteConfirmOpen: () => void;
  onDeleteConfirmClose: () => void;
  onDeleteConfirmExecute: () => void;
  /** Engine job_id for this automation — present when triggered via Run Now and the engine returned a job_id. */
  runningJobId?: string | null;
  /**
   * v2.9.30.102 fix: called when the engine confirms the job is gone (deleted,
   * errored, or completed) so the parent can clear automationJobIds for this
   * automation — preventing hasActiveEngineJob from staying true indefinitely
   * after a cancel/zombie-guard deletion clears the engine state row.
   */
  onJobGone?: () => void;
}

const AutomationCard: React.FC<AutomationCardProps> = ({
  automation,
  onEdit,
  onToggle,
  onRunNow,
  onDelete,
  isToggling,
  isRunning,
  isPolling,
  isDeleting,
  deleteConfirmId,
  onDeleteConfirmOpen,
  onDeleteConfirmClose,
  onDeleteConfirmExecute,
  runningJobId = null,
  onJobGone,
}) => {
  const queryClient = useQueryClient();
  const isDeleteConfirming = deleteConfirmId === automation.id;
  // v2.9.30.95: local cancel-in-progress state for button feedback
  const [isCancelling, setIsCancelling] = React.useState(false);

  // Poll engine status for this automation when a job_id is available.
  // isSuccess/isError tell us whether the query has resolved at least once,
  // so we can distinguish "not yet fetched" (null is valid) from "fetched and gone".
  const {
    data: engineStatusResponse,
    isSuccess: engineQuerySuccess,
    isError: engineQueryError,
  } = useBackupEngineStatus(runningJobId);
  const engineProgress = engineStatusResponse?.data?.progress ?? null;
  const engineStatus = engineStatusResponse?.data?.status ?? null;
  const enginePhaseLabel = engineProgress?.phase_label ?? null;
  const engineBytesDone = engineProgress?.bytes_done ?? null;

  // True when an engine job has been adopted for this automation and is still in
  // flight. This is the authoritative "is this backup running" signal — it reflects
  // the live engine state even when automation.last_run_status is stale. A cron-fired
  // scheduled backup (or a duplicate sibling job) can leave the list status reading
  // 'success'/'failed' while a job is still running on the server; gating UI on this
  // adopted-job signal (not the stale list field) is what makes the Cancel button
  // appear for scheduled scans, not just manual "Run Now" ones.
  //
  // v2.9.30.102 fix: engineStatus === null is treated as active ONLY while the query
  // has not yet resolved (engineQuerySuccess === false && engineQueryError === false).
  // Once the query has resolved (success OR error) and status is still null it means
  // the engine row is gone — treat as inactive to break the infinite render loop that
  // fired when cancel/zombie-guard deleted the engine state row but runningJobId was
  // still set in automationJobIds.
  const engineQuerySettled = engineQuerySuccess || engineQueryError;
  const hasActiveEngineJob =
    !!runningJobId &&
    (engineStatus === "running" ||
      engineStatus === "pending" ||
      (engineStatus === null && !engineQuerySettled)); // null only active while not yet fetched

  // v2.9.30.102 fix: signal parent to clear automationJobIds when the engine confirms
  // the job is gone. Uses a ref to ensure the callback fires at most once per job_id
  // transition to gone, preventing repeated onJobGone() calls on every re-render.
  const jobGoneSignalledRef = useRef<string | null>(null);
  useEffect(() => {
    if (!runningJobId || !onJobGone) return;
    // Job is considered "gone" when: query has settled AND status is not running/pending.
    const jobGone =
      engineQuerySettled &&
      engineStatus !== "running" &&
      engineStatus !== "pending";
    if (jobGone && jobGoneSignalledRef.current !== runningJobId) {
      jobGoneSignalledRef.current = runningJobId;
      onJobGone();
    }
    // Reset the sentinel when runningJobId changes (new job adopted).
    if (!jobGone && jobGoneSignalledRef.current === runningJobId) {
      jobGoneSignalledRef.current = null;
    }
  }, [runningJobId, engineQuerySettled, engineStatus, onJobGone]);

  // v2.9.30.97 (Unit 2) — BROWSER TICK DRIVER. On hosts with no Action Scheduler,
  // no self-reachable loopback HTTP, and WP-Cron disabled, an open Backups panel is
  // the only thing that can advance a job. While this card has a running job_id, POST
  // to /backup/engine/admin-tick on an interval to drive ONE bounded tick per request.
  //
  // Auth is the admin nonce (X-WP-Nonce via wpApi) — the worker secret is NEVER sent
  // to the browser. The engine's per-job lock makes concurrent ticks (AS / loopback /
  // traffic / health-check) a safe no-op, so this driver coexists with the others.
  //
  // In-flight guard (tickInFlightRef): at most ONE outstanding tick request, so a slow
  // tick on a big site never stacks up multiple overlapping POSTs.
  const tickInFlightRef = useRef(false);
  useEffect(() => {
    // Only drive while we have a job_id and the job is actively running/pending.
    if (!hasActiveEngineJob) {
      return;
    }

    let cancelled = false;
    const TICK_INTERVAL_MS = 8000;

    const driveOneTick = async () => {
      if (cancelled || tickInFlightRef.current) {
        return;
      }
      tickInFlightRef.current = true;
      try {
        // job_id only — the server resolves the engine state by job_id (LIKE
        // fallback). No nonce and no worker secret are exposed to the DOM.
        await wpApi(`/backup/engine/admin-tick`, {
          method: "POST",
          body: JSON.stringify({ job_id: runningJobId }),
        });
      } catch {
        // Swallow — the status poll surfaces real failures; a transient tick error
        // (e.g. 409 concurrent-lock, nonce refresh) self-heals on the next interval.
      } finally {
        tickInFlightRef.current = false;
      }
    };

    // Kick one immediately, then on an interval.
    void driveOneTick();
    const id = setInterval(() => {
      void driveOneTick();
    }, TICK_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [hasActiveEngineJob, runningJobId]);

  return (
    <div className="border-border bg-card dark:bg-secondary hover:border-border/60 overflow-hidden rounded-2xl border transition-all">
      {/* Card header */}
      <div className="border-border/50 flex items-center gap-3 border-b px-4 py-3">
        {/* Enable/disable toggle */}
        <button
          role="switch"
          aria-checked={automation.enabled}
          aria-label={`${automation.enabled ? "Disable" : "Enable"} "${automation.name}"`}
          disabled={isToggling}
          onClick={onToggle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggle();
            }
          }}
          className={`relative h-5 w-10 flex-shrink-0 cursor-pointer rounded-full p-0.5 ring-1 transition-all duration-300 ring-inset focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:outline-none ${
            automation.enabled
              ? "bg-green-500 ring-green-600"
              : "bg-red-500 ring-red-600"
          } ${isToggling ? "cursor-not-allowed opacity-50" : ""}`}
          aria-busy={isToggling}
        >
          <div
            className="h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-300"
            style={{
              transform: automation.enabled
                ? "translateX(20px)"
                : "translateX(0)",
            }}
            aria-hidden="true"
          />
        </button>

        <div className="min-w-0 flex-1">
          <p className="dark:text-foreground truncate text-sm font-semibold text-gray-900">
            {automation.name}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {SCHEDULE_DISPLAY[automation.schedule]} &rarr;{" "}
            {DESTINATION_LABELS[automation.destination]}
          </p>
        </div>

        {/* Run Now */}
        <Button
          variant="success"
          size="sm"
          onClick={onRunNow}
          loading={isRunning}
          disabled={isRunning || !automation.enabled}
          aria-label={`Run "${automation.name}" now`}
          title={
            !automation.enabled
              ? "Enable this automation first to run it manually"
              : undefined
          }
          className={`flex-shrink-0 ${!automation.enabled ? "cursor-not-allowed opacity-50" : ""}`}
        >
          {!isRunning && <Play size={12} aria-hidden="true" className="mr-1" />}
          Run Now
        </Button>

        {/* Cancel — visible whenever a backup is running for this automation, whether
            it was cron-fired (scheduled) or started via Run Now.
            v2.9.30.95: uses cancel-by-automation_id endpoint; no browser job_id required.
            v2.9.30.102: also render when an engine job is adopted/in-flight
            (hasActiveEngineJob) so SCHEDULED scans get a Cancel button even when the
            automation list's last_run_status is a stale 'success'/'failed' left by a
            sibling job (the TOCTOU duplicate-job case). Cancel deregisters the Sentinel
            job so the watchdog does NOT resurrect the backup. */}
        {(automation.last_run_status === "running" || hasActiveEngineJob) && (
          <button
            disabled={isCancelling}
            onClick={async () => {
              setIsCancelling(true);
              try {
                // Cancel by automation_id — works for scheduled cron backups too.
                // The server cancels the engine state + marks the Sentinel job
                // circuit_open=true so the watchdog never resurrects it.
                await wpApi(`/backup/automations/${automation.id}/cancel`, {
                  method: "POST",
                });
                toast.success("Backup cancelled.");
                queryClient.invalidateQueries({
                  queryKey: ["backup-automations"],
                });
              } catch {
                toast.error("Could not cancel backup.");
              } finally {
                setIsCancelling(false);
              }
            }}
            className="flex-shrink-0 rounded px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-900/20"
            aria-busy={isCancelling}
            aria-label={`Cancel running backup for "${automation.name}"`}
          >
            {isCancelling ? "Cancelling…" : "Cancel"}
          </button>
        )}
      </div>

      {/* Card body */}
      <div className="px-4 py-3">
        <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 text-xs">
          <span>
            <span className="dark:text-foreground/80 font-medium text-gray-700">
              Schedule:
            </span>{" "}
            {SCHEDULE_DISPLAY[automation.schedule]}
          </span>
          <span>
            <span className="dark:text-foreground/80 font-medium text-gray-700">
              Type:
            </span>{" "}
            {SCOPE_OPTIONS.find((s) => s.value === automation.scope)?.label ??
              automation.scope}
          </span>
          <span>
            <span className="dark:text-foreground/80 font-medium text-gray-700">
              Keep:
            </span>{" "}
            {automation.retention}{" "}
            {automation.retention === 1 ? "copy" : "copies"}
          </span>
          <span>
            <span className="dark:text-foreground/80 font-medium text-gray-700">
              Destination:
            </span>{" "}
            {DESTINATION_LABELS[automation.destination]}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <NextRunBadge
            nextRun={automation.next_run}
            lastRunStatus={automation.last_run_status}
            enabled={automation.enabled}
          />
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <span className="dark:text-foreground/80 font-medium text-gray-700">
              Last run:
            </span>{" "}
            <StatusBadge status={automation.last_run_status} />
            {/* FIX-LAST-SUCCESS: Show last_successful_at (completion time) when available.
                Fall back to last_run_at only when it reflects a success (pre-upgrade rows). */}
            {(automation.last_successful_at ||
              (automation.last_run_status === "success" &&
                automation.last_run_at)) && (
              <span>
                {formatRelativeTime(
                  automation.last_successful_at ?? automation.last_run_at
                )}
              </span>
            )}
            {!automation.last_successful_at &&
              automation.last_run_status !== "success" &&
              automation.last_run_at && (
                <span className="text-muted-foreground/60">
                  (attempted {formatRelativeTime(automation.last_run_at)})
                </span>
              )}
            {isPolling && (
              <span
                className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400"
                aria-live="polite"
                aria-label="Backup in progress, checking status"
              >
                <Loader2
                  size={10}
                  className="flex-shrink-0 animate-spin"
                  aria-hidden="true"
                />
                Checking…
              </span>
            )}
          </span>
        </div>

        {/* Mini engine progress bar — shown when a job_id is available for this automation */}
        {runningJobId && engineProgress && (
          <div className="mt-3 space-y-1.5" aria-live="polite">
            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span>{enginePhaseLabel || "Running…"}</span>
              <span>{engineProgress.percent}%</span>
            </div>
            <div
              className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700"
              role="progressbar"
              aria-valuenow={engineProgress.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Backup progress for ${automation.name}`}
            >
              <div
                className="h-1.5 rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${engineProgress.percent}%` }}
              />
            </div>
            {/* v2.9.30.97 (Unit 2) — Indeterminate byte counter. During size-rollover
                archiving the percent can plateau (we don't know total compressed size
                up front), so the bytes processed is the reliable "still working"
                signal. Shown whenever we have a non-trivial byte count. */}
            {engineBytesDone != null && engineBytesDone > 0 && (
              <p className="text-muted-foreground text-xs">
                {formatBytes(engineBytesDone)} processed
              </p>
            )}
            {engineProgress.eta_seconds != null &&
              engineProgress.eta_seconds > 0 && (
                <p className="text-muted-foreground text-xs">
                  {engineProgress.eta_seconds < 60
                    ? `About ${engineProgress.eta_seconds}s remaining`
                    : `About ${Math.ceil(engineProgress.eta_seconds / 60)} min remaining`}
                </p>
              )}
          </div>
        )}

        {/* Last run error message */}
        {automation.last_run_status === "failed" &&
          automation.last_run_message &&
          (automation.last_run_message
            .toLowerCase()
            .includes("circuit breaker") ? (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-900/20">
              <AlertTriangle
                size={13}
                className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
              <div>
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                  Backup paused after 3 consecutive failures.
                </p>
                <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
                  Click &ldquo;Run Now&rdquo; to reset and try again.
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {automation.last_run_message}
            </p>
          ))}
      </div>

      {/* Card footer — edit / delete */}
      <div className="border-border/50 bg-secondary/30 dark:bg-card/20 flex items-center justify-end gap-2 border-t px-4 py-2">
        {!isDeleteConfirming ? (
          <>
            <button
              onClick={onEdit}
              className="dark:text-foreground/70 hover:bg-secondary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
              aria-label={`Edit "${automation.name}"`}
            >
              <Pencil size={12} aria-hidden="true" />
              Edit
            </button>
            <button
              onClick={onDeleteConfirmOpen}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 focus:ring-2 focus:ring-red-500 focus:outline-none dark:hover:bg-red-900/20"
              aria-label={`Delete "${automation.name}"`}
            >
              <Trash2 size={12} aria-hidden="true" />
              Delete
            </button>
          </>
        ) : (
          /* Inline delete confirmation — no browser confirm() */
          <div
            className="flex items-center gap-3"
            role="group"
            aria-label="Confirm deletion"
          >
            <span className="dark:text-foreground/80 flex items-center gap-1.5 text-xs text-gray-700">
              <AlertTriangle
                size={12}
                className="text-amber-500"
                aria-hidden="true"
              />
              Are you sure? Your automation will stop. The files saved until now
              stay on your target drive — delete them manually if needed.
            </span>
            <button
              onClick={onDeleteConfirmClose}
              className="dark:text-foreground/70 hover:bg-secondary rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              Cancel
            </button>
            <button
              onClick={onDeleteConfirmExecute}
              disabled={isDeleting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:outline-none disabled:opacity-50"
              aria-busy={isDeleting}
            >
              {isDeleting && (
                <Loader2
                  size={11}
                  className="animate-spin"
                  aria-hidden="true"
                />
              )}
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main panel component
// ---------------------------------------------------------------------------

export const BackupAutomationsPanel: React.FC = () => {
  const license = window.swisswpsuiteData?.license;
  const hasCloudFeature =
    (Array.isArray(license?.features) &&
      (license.features.includes("backup_cloud") ||
        license.features.includes("backup_pro"))) ||
    (Array.isArray(license?.capabilities) &&
      (license.capabilities.includes("backup_cloud") ||
        license.capabilities.includes("backup_pro")));

  const queryClient = useQueryClient();

  // Modal state: null=closed, 'create'=new, string=editing automation.id
  const [modalState, setModalState] = useState<"create" | string | null>(null);
  // Delete confirmation: tracks which card is showing the inline confirm UI
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  // Track which automation is being run (button spinner)
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());
  // Track which automations are actively polling for status after Run Now
  const [pollingIds, setPollingIds] = useState<Set<string>>(new Set());
  // Map of automation_id → engine job_id for active engine-based runs
  const [automationJobIds, setAutomationJobIds] = useState<Map<string, string>>(
    new Map()
  );
  // v2.9.30.104 (WS2) — Backup path exclusions panel state
  const [showExclusionPanel, setShowExclusionPanel] = useState(false);
  const [excludePathInput, setExcludePathInput] = useState("");
  const [isSavingExclusions, setIsSavingExclusions] = useState(false);

  // Fetch current exclude-paths + nested install detection (lazy — only when panel is open)
  const { data: excludePathsData, refetch: refetchExcludePaths } =
    useQuery<BackupExcludePathsResponse>({
      queryKey: ["backup-exclude-paths"],
      queryFn: () =>
        wpApi<BackupExcludePathsResponse>("/backup/local/exclude-paths"),
      enabled: showExclusionPanel,
      staleTime: 30_000,
      retry: 1,
    });

  const excludePaths: string[] = excludePathsData?.data?.exclude_paths ?? [];
  const nestedInstalls: string[] =
    excludePathsData?.data?.nested_installs ?? [];

  // One-click toggle: add/remove a path from the exclusions list and immediately save.
  const handleToggleExcludePath = useCallback(
    async (path: string) => {
      const current = excludePathsData?.data?.exclude_paths ?? [];
      const next = current.includes(path)
        ? current.filter((p) => p !== path)
        : [...current, path];
      setIsSavingExclusions(true);
      try {
        await wpApi("/backup/local/exclude-paths", {
          method: "POST",
          body: JSON.stringify({ paths: next }),
        });
        await refetchExcludePaths();
        toast.success("Exclusion list updated.");
      } catch {
        toast.error("Could not update exclusion list.");
      } finally {
        setIsSavingExclusions(false);
      }
    },
    [excludePathsData, refetchExcludePaths]
  );

  // Add a free-text path from the input field.
  const handleAddCustomExcludePath = useCallback(async () => {
    const trimmed = excludePathInput.trim().replace(/^\/+|\/+$/g, "");
    if (!trimmed) return;
    const current = excludePathsData?.data?.exclude_paths ?? [];
    if (current.includes(trimmed)) {
      setExcludePathInput("");
      return;
    }
    setIsSavingExclusions(true);
    try {
      await wpApi("/backup/local/exclude-paths", {
        method: "POST",
        body: JSON.stringify({ paths: [...current, trimmed] }),
      });
      await refetchExcludePaths();
      setExcludePathInput("");
      toast.success(`"${trimmed}" added to exclusions.`);
    } catch {
      toast.error("Could not add path.");
    } finally {
      setIsSavingExclusions(false);
    }
  }, [excludePathInput, excludePathsData, refetchExcludePaths]);

  // WP-Cron notice — dismissed state persisted in localStorage
  const [showCronNotice, setShowCronNotice] = useState<boolean>(
    () => localStorage.getItem("swisswpsuite_cron_notice_dismissed") !== "1"
  );
  // Cron-blocked warning — shown when disable_wp_cron_public hardening is active.
  // Reappears on every page reload (localStorage key cleared on refresh by design).
  const [showCronBlockedWarning, setShowCronBlockedWarning] = useState<boolean>(
    () =>
      localStorage.getItem("swisswpsuite_cron_blocked_warning_dismissed") !==
      "1"
  );
  // Refs for polling interval and per-automation timeout handles
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const pollingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  // Load automations list
  const {
    data: automationsData,
    isLoading,
    isError,
    refetch,
  } = useQuery<BackupAutomationsResponse>({
    queryKey: ["backup-automations"],
    queryFn: () =>
      wpApi<BackupAutomationsResponse>(
        `/backup/automations?_nocache=${Date.now()}`
      ),
    enabled: hasCloudFeature,
    staleTime: 30_000,
    retry: 1,
  });

  // v2.9.30.102 fix: memoize `automations` so its reference is stable across renders
  // when the underlying data has not changed. Without this, the `?? []` fallback and
  // TanStack Query's internal re-renders produce a new array reference every render,
  // causing every effect that lists `automations` in its deps to re-run on every render.
  const automations = useMemo(
    () => automationsData?.automations ?? [],
    [automationsData]
  );
  const stuckJobCount = automationsData?.stuck_job_count ?? 0;

  // v2.9.30.101 — Rehydrate automation progress after refresh/tab-switch.
  //
  // The engine job_id for an automation "Run Now" lived only in this tab's
  // automationJobIds map, so after a reload the row stopped showing its progress
  // bar even while the backup was still running on the server. We now rediscover
  // running engine jobs via GET /backup/engine/active (each carries automation_id
  // as of v2.9.30.101) and re-adopt any whose automation_id matches a known
  // automation that we are not already tracking. Adopting it both:
  //   (a) sets automationJobIds[id] → the AutomationCard's existing 2s
  //       useBackupEngineStatus poll + mini progress bar reappear, and
  //   (b) adds the id to pollingIds → the list refreshes to reflect 'running'.
  // This renders the progress in exactly ONE place (the automation row), so it
  // never double-renders against the manual "Save a Backup" card (which only
  // adopts trigger==='manual' jobs).
  const { data: activeJobsResponse } = useActiveBackupJobs(hasCloudFeature);
  useEffect(() => {
    const jobs = activeJobsResponse?.data?.jobs ?? [];
    if (jobs.length === 0 || automations.length === 0) return;

    const knownIds = new Set(automations.map((a) => a.id));

    // v2.9.30.102 fix: collect adopted IDs before calling setState so we can call
    // setPollingIds OUTSIDE the setAutomationJobIds functional updater.
    // Calling setState inside another setState's functional updater is a React
    // anti-pattern that can trigger React #185 (Maximum update depth exceeded)
    // because the inner setState schedules a cascading update mid-batch.
    const toAdopt: Array<{ autoId: string; jobId: string }> = [];
    for (const job of jobs) {
      const autoId = job.automation_id;
      if (
        job.trigger === "automation" &&
        job.status === "running" &&
        autoId &&
        knownIds.has(autoId) &&
        job.job_id &&
        // v2.9.30.112: skip re-adoption if the job for this automation was
        // just cleared via handleJobGone — the activeJobs cache may still be
        // stale and show the completed job as "running", causing a loop.
        !recentlyGoneAutoIds.current.has(autoId)
      ) {
        toAdopt.push({ autoId, jobId: job.job_id });
      }
    }

    if (toAdopt.length === 0) return;

    setAutomationJobIds((prev) => {
      const next = new Map(prev);
      let changed = false;
      for (const { autoId, jobId } of toAdopt) {
        if (!next.has(autoId)) {
          next.set(autoId, jobId);
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    // Re-arm the list refresh poll for the newly adopted automations.
    // Called AFTER setAutomationJobIds, never nested inside its updater.
    setPollingIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const { autoId } of toAdopt) {
        if (!next.has(autoId)) {
          next.add(autoId);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [activeJobsResponse, automations]);

  // CLEAR STUCK JOBS mutation — emergency tool
  const [isClearingStuck, setIsClearingStuck] = useState(false);
  const handleClearStuckJobs = useCallback(async () => {
    setIsClearingStuck(true);
    try {
      const result = await wpApi<{
        success: boolean;
        cleared: number;
        job_ids: string[];
      }>("/backup/clear-stuck-jobs", { method: "POST" });
      if (result.cleared > 0) {
        toast.success(
          `Cleared ${result.cleared} stuck job${result.cleared === 1 ? "" : "s"}.`
        );
      } else {
        toast.info("No stuck jobs found.");
      }
      queryClient.invalidateQueries({ queryKey: ["backup-automations"] });
    } catch (err) {
      toast.error(
        `Could not clear stuck jobs: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setIsClearingStuck(false);
    }
  }, [queryClient]);

  // Connected providers — shared query cache with CloudStoragePanel
  const connectedProviders = useConnectedProviders(hasCloudFeature);

  // Polling effect — when pollingIds is non-empty, poll every 5s for status changes
  useEffect(() => {
    if (pollingIds.size === 0) {
      if (pollingIntervalRef.current !== null) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    pollingIntervalRef.current = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["backup-automations"] });
    }, 5_000);

    return () => {
      if (pollingIntervalRef.current !== null) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [pollingIds.size, queryClient]);

  // Keep a stable ref to pollingIds so the resolve-effect below can read the
  // current set without listing pollingIds as a dependency. Listing pollingIds
  // (a Set) as a dep caused React #185: every setPollingIds call (including
  // handleJobGone) re-ran the effect, which found new resolved IDs, called
  // setPollingIds again, and cascaded. Using a ref breaks the cycle — the effect
  // only re-fires when fresh automations data arrives, which is the correct signal.
  const pollingIdsRef = useRef<Set<string>>(pollingIds);
  useEffect(() => {
    pollingIdsRef.current = pollingIds;
  }, [pollingIds]);

  // When fresh automation data arrives, resolve completed polling IDs.
  // v2.9.30.104 fix (#185 4th trigger): reads pollingIds via pollingIdsRef (stable
  // ref) instead of listing pollingIds as a dependency. Only automations triggers
  // the effect — a new automations object means fresh status data has arrived.
  useEffect(() => {
    const currentPollingIds = pollingIdsRef.current;
    if (currentPollingIds.size === 0 || automations.length === 0) return;

    const resolved: string[] = [];
    for (const id of currentPollingIds) {
      const automation = automations.find((a) => a.id === id);
      if (!automation) {
        resolved.push(id);
        continue;
      }
      if (automation.last_run_status === "success") {
        toast.success(`"${automation.name}" backup completed successfully.`);
        resolved.push(id);
      } else if (automation.last_run_status === "failed") {
        toast.error(
          `"${automation.name}" backup failed.${automation.last_run_message ? ` ${automation.last_run_message}` : ""}`
        );
        resolved.push(id);
      }
    }

    if (resolved.length > 0) {
      // Clear per-automation timeouts for resolved IDs
      for (const id of resolved) {
        const t = pollingTimeoutsRef.current.get(id);
        if (t !== undefined) {
          clearTimeout(t);
          pollingTimeoutsRef.current.delete(id);
        }
      }
      setPollingIds((prev) => {
        const next = new Set(prev);
        for (const id of resolved) next.delete(id);
        return next;
      });
    }
  }, [automations]); // eslint-disable-line react-hooks/exhaustive-deps

  // Find the automation being edited
  const editingAutomation =
    typeof modalState === "string" && modalState !== "create"
      ? (automations.find((a) => a.id === modalState) ?? null)
      : null;

  // CREATE mutation
  const createMutation = useMutation({
    mutationFn: (data: AutomationFormData) =>
      wpApi<BackupAutomationResponse>("/backup/automations", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backup-automations"] });
      setModalState(null);
      toast.success("Automation created successfully.");
    },
    onError: (err: Error) => {
      toast.error(`Could not create automation: ${err.message}`);
    },
  });

  // UPDATE mutation
  // E2 fix (2026-08-20): `data` is a targeted diff (Partial<AutomationFormData>),
  // not the full form — see diffAutomationFormData() above for why.
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<AutomationFormData>;
    }) =>
      wpApi<BackupAutomationResponse>(`/backup/automations/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backup-automations"] });
      setModalState(null);
      toast.success("Automation saved.");
    },
    onError: (err: Error) => {
      toast.error(`Could not save automation: ${err.message}`);
    },
  });

  // TOGGLE mutation — enable/disable
  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      wpApi<BackupAutomationResponse>(`/backup/automations/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: (_, { enabled }) => {
      queryClient.invalidateQueries({ queryKey: ["backup-automations"] });
      toast.success(enabled ? "Automation enabled." : "Automation turned off.");
    },
    onError: (err: Error) => {
      toast.error(`Could not update automation: ${err.message}`);
    },
  });

  // DELETE mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      wpApi<{ success: boolean; message: string }>(
        `/backup/automations/${id}`,
        {
          method: "DELETE",
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backup-automations"] });
      setDeleteConfirmId(null);
      toast.success("Automation deleted.");
    },
    onError: (err: Error) => {
      toast.error(`Could not delete automation: ${err.message}`);
    },
  });

  // RUN NOW — per-automation loading state tracked locally
  const handleRunNow = useCallback(
    async (id: string, name: string) => {
      setRunningIds((prev) => new Set(prev).add(id));
      try {
        const response = await wpApi<{
          success: boolean;
          message: string;
          /** Present when the engine is used — links this automation run to a job. */
          job_id?: string;
          /** U8 (2026-08-20 gate): present on a decline — see run_automation_now(). */
          reason?: string;
        }>(`/backup/automations/${id}/run`, { method: "POST" });
        // U8 (2026-08-20 gate): the backend now returns every decline (license
        // missing, automation disabled/not-found, concurrent-start lock held,
        // etc.) as a non-2xx status, which wpApi() already throws on — this
        // check is defense-in-depth for the shape, not the primary guard.
        // Before this gate, a decline could reach here as success:true-shaped
        // (run_automation_backup() returned null, and the response was built
        // unconditionally around it), so the panel toasted "started", began
        // polling, and either silently timed out after 15 minutes or --
        // worse -- surfaced a FALSE "completed"/"failed" toast within ~5
        // seconds by reading a PREVIOUS run's stale last_run_status. Never
        // trust an HTTP 2xx alone for a "did the job actually start" claim.
        if (!response.success) {
          throw new Error(response.message || "Could not start the backup.");
        }
        toast.success(
          `"${name}" backup started. Status will update automatically.`
        );
        // Phase 5: capture engine job_id if the backend returned one
        if (response.job_id) {
          setAutomationJobIds((prev) => {
            const next = new Map(prev);
            next.set(id, response.job_id!);
            return next;
          });
        }
        // Begin polling for status — adds id to pollingIds set
        setPollingIds((prev) => new Set(prev).add(id));
        // Safety timeout: stop polling after 15 minutes regardless of status
        const timeout = setTimeout(
          () => {
            setPollingIds((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
            setAutomationJobIds((prev) => {
              const next = new Map(prev);
              next.delete(id);
              return next;
            });
            pollingTimeoutsRef.current.delete(id);
          },
          15 * 60 * 1_000
        );
        pollingTimeoutsRef.current.set(id, timeout);
        // Initial refresh after short delay to pick up 'running' status
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["backup-automations"] });
        }, 1_500);
      } catch (err) {
        toast.error(
          `Could not start backup: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      } finally {
        setRunningIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [queryClient]
  );

  const handleSave = useCallback(
    (data: AutomationFormData) => {
      if (modalState === "create") {
        createMutation.mutate(data);
      } else if (typeof modalState === "string") {
        // E2 fix (2026-08-20): send only the fields that actually changed,
        // not the full form — see diffAutomationFormData() docblock. Falls
        // back to the full form only in the (should-be-impossible) case
        // where editingAutomation is null, e.g. the automation vanished from
        // the cache between opening Edit and clicking Save.
        const payload = editingAutomation
          ? diffAutomationFormData(data, editingAutomation)
          : data;
        updateMutation.mutate({ id: modalState, data: payload });
      }
    },
    [modalState, createMutation, updateMutation, editingAutomation]
  );

  // v2.9.30.112 fix: tracks automation IDs whose engine jobs have recently
  // completed/gone so the rehydration effect cannot re-adopt their stale
  // job_ids from the useActiveBackupJobs cache. Without this guard the
  // sequence is: job completes → handleJobGone clears automationJobIds →
  // stale activeJobsResponse cache still shows the job as "running" →
  // rehydration effect re-adopts it → onJobGone fires again → loop → #185.
  // Entries are evicted after 15 s (long enough for the 8 s activeJobs poll
  // to return fresh data without the stale completed job).
  const recentlyGoneAutoIds = useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map());

  // v2.9.30.102 fix: clear automationJobIds (and pollingIds) for an automation
  // whose engine job has gone away (cancelled, zombie-guard deleted, or completed).
  // Called by AutomationCard via onJobGone when the engine status query settles to
  // a non-running state — this is what allows hasActiveEngineJob to become false
  // and the cancel/empty-state transition to settle without looping.
  const handleJobGone = useCallback((automationId: string) => {
    // Mark this automation as recently-gone so the rehydration effect skips it
    // while the useActiveBackupJobs stale cache may still show it as "running".
    const existing = recentlyGoneAutoIds.current.get(automationId);
    if (existing !== undefined) clearTimeout(existing);
    recentlyGoneAutoIds.current.set(
      automationId,
      setTimeout(() => {
        recentlyGoneAutoIds.current.delete(automationId);
      }, 15_000)
    );

    setAutomationJobIds((prev) => {
      if (!prev.has(automationId)) return prev;
      const next = new Map(prev);
      next.delete(automationId);
      return next;
    });
    setPollingIds((prev) => {
      if (!prev.has(automationId)) return prev;
      const next = new Set(prev);
      next.delete(automationId);
      return next;
    });
  }, []);

  // -----------------------------------------------------------------------
  // FREE user gate
  // -----------------------------------------------------------------------

  if (!hasCloudFeature) {
    return (
      <Card className="border-border border-2 border-dashed" noPadding>
        <div className="p-6">
          <div className="mb-3 flex items-center gap-3">
            <div
              className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900/20"
              aria-hidden="true"
            >
              <CalendarClock className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="dark:text-foreground font-semibold text-gray-900">
                Backup Automations
              </h3>
              <Badge variant="neutral" className="mt-0.5">
                Not Included
              </Badge>
            </div>
            <Lock
              className="text-muted-foreground ml-auto h-5 w-5 flex-shrink-0"
              aria-hidden="true"
            />
          </div>
          <p className="text-muted-foreground text-sm">
            Automatically back up your site on a schedule — daily, weekly, or
            hourly. Not included on this plan — see Settings for details.
          </p>
        </div>
      </Card>
    );
  }

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  const isMutating = createMutation.isPending || updateMutation.isPending;
  const isAtLimit = automations.length >= MAX_AUTOMATIONS;

  return (
    <>
      <Card noPadding>
        {/* Panel header */}
        <div className="p-6 pb-4">
          <div className="flex items-start gap-3">
            <div
              className="mt-0.5 flex-shrink-0 rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900/20"
              aria-hidden="true"
            >
              <CalendarClock className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="dark:text-foreground text-lg font-bold text-gray-900">
                  Backup Automations
                </h2>
                {automations.length > 0 && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Plus}
                    onClick={() => setModalState("create")}
                    disabled={isAtLimit}
                    title={
                      isAtLimit
                        ? `Maximum of ${MAX_AUTOMATIONS} automations reached`
                        : undefined
                    }
                    aria-disabled={isAtLimit}
                  >
                    New Automation
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Explanation banner */}
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 p-3.5 dark:border-blue-800 dark:bg-blue-900/15">
            <Info
              size={15}
              className="mt-0.5 flex-shrink-0 text-blue-500"
              aria-hidden="true"
            />
            <p className="text-xs leading-relaxed text-blue-800 dark:text-blue-300">
              Automations run automatically on a schedule — no manual action
              needed. Each automation is independent: you can have a daily full
              backup to Google Drive <em>and</em> a weekly database backup to
              Dropbox running at the same time. Up to {MAX_AUTOMATIONS}{" "}
              automations supported.
            </p>
          </div>

          {/* E14 (owner-ordered, 2026-08-20) — small, persistent (not dismissible)
              reassurance note. Purpose: deflect "why didn't my backup start exactly
              on time" support emails by explaining, in plain language, that WordPress
              cron is triggered by the site's own visitor traffic, so start times can
              drift by a few minutes depending on the host. This is distinct from the
              dismissible WP-Cron notice above (which is a call-to-action about
              guaranteed timing) — this one stays visible so the explanation is there
              whenever someone checks back after a backup ran a little later than
              expected. */}
          <p
            className="text-muted-foreground mt-2 flex items-start gap-1.5 text-xs"
            role="note"
            aria-label="About backup timing"
          >
            <Clock
              size={12}
              className="mt-0.5 flex-shrink-0"
              aria-hidden="true"
            />
            Scheduled backups are triggered by your site&rsquo;s own visitor
            traffic (&ldquo;WordPress cron&rdquo;), so the exact start time can
            vary by a few minutes depending on your host — that&rsquo;s normal
            and not a sign anything is wrong.
          </p>

          {isAtLimit && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle size={12} aria-hidden="true" />
              You have reached the {MAX_AUTOMATIONS}-automation limit. Delete an
              existing one to add a new one.
            </p>
          )}

          {/* WP-Cron notice — shown when at least one automation with a cron schedule exists and not yet dismissed */}
          {showCronNotice && automations.length > 0 && (
            <div
              className="mt-3 flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 p-3.5 dark:border-blue-800 dark:bg-blue-900/15"
              role="note"
              aria-label="WordPress cron notice"
            >
              <Info
                size={15}
                className="mt-0.5 flex-shrink-0 text-blue-500"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs leading-relaxed text-blue-800 dark:text-blue-300">
                  <span className="font-semibold">
                    Scheduled backups rely on WordPress&rsquo;s built-in cron,
                    which only runs when your site receives traffic.
                  </span>{" "}
                  If your site has quiet periods, backups may fire late or be
                  skipped. For guaranteed timing, add a real server cron job:
                </p>
                <code className="mt-1.5 block rounded bg-blue-100 px-2 py-1 font-mono text-xs break-all text-blue-900 select-all dark:bg-blue-900/40 dark:text-blue-200">
                  {`curl -s "https://${window.location.hostname}/wp-cron.php?doing_wp_cron" >/dev/null 2>&1`}
                </code>
              </div>
              <button
                onClick={() => {
                  localStorage.setItem(
                    "swisswpsuite_cron_notice_dismissed",
                    "1"
                  );
                  setShowCronNotice(false);
                }}
                className="flex-shrink-0 rounded p-1 text-blue-500 transition-colors hover:bg-blue-100 hover:text-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:hover:bg-blue-800/40"
                aria-label="Dismiss WordPress cron notice"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Cron-blocked warning — shown when disable_wp_cron_public hardening is active */}
          {showCronBlockedWarning && automationsData?.cron_blocked && (
            <div
              className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3.5 dark:border-amber-700 dark:bg-amber-900/15"
              role="alert"
              aria-label="Scheduled backups blocked warning"
            >
              <AlertTriangle
                size={15}
                className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="mb-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                  Scheduled backups are blocked
                </p>
                <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                  The{" "}
                  <span className="font-semibold">
                    &ldquo;Disable Visitor-Triggered Scheduling&rdquo;
                  </span>{" "}
                  option is enabled in{" "}
                  <span className="font-semibold">
                    Security &rarr; Hardening
                  </span>
                  . This blocks{" "}
                  <code className="rounded bg-amber-100 px-1 font-mono dark:bg-amber-900/40">
                    wp-cron.php
                  </code>
                  , so your automations will never run automatically. Either
                  disable that option or set up a server-side cron job on your
                  hosting panel.
                </p>
                {/* F-309: copy-paste cron command so users can fix it without leaving the tab */}
                <div className="mt-2.5 rounded-lg border border-amber-300/60 bg-amber-100/70 p-2.5 dark:border-amber-700/60 dark:bg-amber-900/30">
                  <p className="mb-1.5 text-[11px] font-medium text-amber-900 dark:text-amber-200">
                    Paste this into your hosting control panel&rsquo;s Cron Jobs
                    section (runs every 5 minutes):
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="min-w-0 flex-1 rounded bg-amber-50 px-2 py-1.5 font-mono text-[11px] break-all text-amber-900 select-all dark:bg-amber-950/60 dark:text-amber-200">
                      {`*/5 * * * * wget -q -O - ${
                        (typeof window !== "undefined" &&
                          (window.swisswpsuiteData?.homeUrl ||
                            `${window.location.protocol}//${window.location.hostname}`)) ||
                        ""
                      }/wp-cron.php?doing_wp_cron >/dev/null 2>&1`}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        const cmd = `*/5 * * * * wget -q -O - ${
                          (typeof window !== "undefined" &&
                            (window.swisswpsuiteData?.homeUrl ||
                              `${window.location.protocol}//${window.location.hostname}`)) ||
                          ""
                        }/wp-cron.php?doing_wp_cron >/dev/null 2>&1`;
                        if (navigator.clipboard?.writeText) {
                          navigator.clipboard
                            .writeText(cmd)
                            .then(() => toast.success("Cron command copied"))
                            .catch(() =>
                              toast.error(
                                "Copy failed — select the text and copy manually"
                              )
                            );
                        } else {
                          toast.error(
                            "Clipboard unavailable — select the text and copy manually"
                          );
                        }
                      }}
                      className="flex-shrink-0 rounded bg-amber-200 px-2.5 py-1.5 text-[11px] font-semibold text-amber-900 transition-colors hover:bg-amber-300 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:bg-amber-800/60 dark:text-amber-100 dark:hover:bg-amber-700"
                      aria-label="Copy cron command to clipboard"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  localStorage.setItem(
                    "swisswpsuite_cron_blocked_warning_dismissed",
                    "1"
                  );
                  setShowCronBlockedWarning(false);
                }}
                className="flex-shrink-0 rounded p-1 text-amber-600 transition-colors hover:bg-amber-100 hover:text-amber-800 focus:ring-2 focus:ring-amber-500 focus:outline-none dark:text-amber-400 dark:hover:bg-amber-800/40 dark:hover:text-amber-200"
                aria-label="Dismiss scheduled backups blocked warning"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Stuck jobs warning — shown when engine state rows are orphaned */}
          {stuckJobCount > 0 && (
            <div
              className="mt-3 flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 p-3.5 dark:border-red-700 dark:bg-red-900/15"
              role="alert"
              aria-label="Stuck backup jobs warning"
            >
              <AlertTriangle
                size={15}
                className="mt-0.5 flex-shrink-0 text-red-600 dark:text-red-400"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="mb-0.5 text-xs font-semibold text-red-800 dark:text-red-300">
                  {stuckJobCount} stuck backup job
                  {stuckJobCount === 1 ? "" : "s"} detected
                </p>
                <p className="text-xs leading-relaxed text-red-800 dark:text-red-300">
                  These jobs have been stuck for over 2 hours and are consuming
                  server resources. Clear them to stop the retry loop.
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={handleClearStuckJobs}
                disabled={isClearingStuck}
                aria-label={`Clear ${stuckJobCount} stuck backup job${stuckJobCount === 1 ? "" : "s"}`}
              >
                {isClearingStuck ? (
                  <>
                    <Loader2
                      size={14}
                      className="mr-1 animate-spin"
                      aria-hidden="true"
                    />
                    Clearing…
                  </>
                ) : (
                  "Clear Stuck Jobs"
                )}
              </Button>
            </div>
          )}
        </div>

        {/* v2.9.30.104 (WS2) — Backup Path Exclusions panel */}
        <div className="px-6 pb-3">
          <button
            type="button"
            onClick={() => setShowExclusionPanel((v) => !v)}
            className="text-muted-foreground hover:text-foreground flex items-center gap-2 rounded text-xs transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:outline-none"
            aria-expanded={showExclusionPanel}
            aria-controls="backup-exclusion-panel"
          >
            <FolderMinus size={14} aria-hidden="true" />
            <span className="font-medium">
              {showExclusionPanel ? "Hide" : "Configure"} backup exclusions
            </span>
            <span className="text-muted-foreground/70 text-[10px]">
              (skip folders like staging sub-sites, large media dirs)
            </span>
          </button>

          {showExclusionPanel && (
            <div
              id="backup-exclusion-panel"
              className="border-border bg-muted/30 dark:bg-muted/10 mt-3 space-y-3 rounded-xl border p-4"
            >
              <div>
                <p className="text-foreground mb-0.5 text-xs font-semibold">
                  Exclude paths from backups
                </p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Paths are relative to your WordPress root. The plugin&rsquo;s
                  own backup/snapshot directories are always excluded regardless
                  of these settings.
                </p>
              </div>

              {/* Auto-detected nested WordPress installs */}
              {nestedInstalls.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                    <ShieldAlert size={12} aria-hidden="true" />
                    Detected nested WordPress installs
                  </div>
                  {nestedInstalls.map((dir) => (
                    <label
                      key={dir}
                      className="group flex cursor-pointer items-center gap-2.5"
                    >
                      <input
                        type="checkbox"
                        checked={excludePaths.includes(dir)}
                        onChange={() => handleToggleExcludePath(dir)}
                        disabled={isSavingExclusions}
                        className="h-3.5 w-3.5 rounded accent-blue-600"
                        aria-label={`Exclude ${dir} from backups`}
                      />
                      <code className="rounded bg-amber-50 px-1.5 py-0.5 font-mono text-xs text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
                        {dir}/
                      </code>
                      <span className="text-muted-foreground group-hover:text-foreground text-xs transition-colors">
                        {excludePaths.includes(dir)
                          ? "excluded"
                          : "will be included"}
                      </span>
                    </label>
                  ))}
                  <p className="pl-6 text-[11px] text-amber-700/80 dark:text-amber-400/80">
                    These sub-directories contain a WordPress install. Checking
                    them (recommended) prevents doubling your backup size.
                  </p>
                </div>
              )}

              {/* Current user-defined exclusion list */}
              {excludePaths.filter((p) => !nestedInstalls.includes(p)).length >
                0 && (
                <div className="space-y-1">
                  <p className="text-muted-foreground text-[11px] font-medium">
                    Custom exclusions
                  </p>
                  {excludePaths
                    .filter((p) => !nestedInstalls.includes(p))
                    .map((path) => (
                      <div key={path} className="group flex items-center gap-2">
                        <code className="bg-muted text-foreground min-w-0 flex-1 truncate rounded px-2 py-0.5 font-mono text-xs">
                          {path}
                        </code>
                        <button
                          type="button"
                          onClick={() => handleToggleExcludePath(path)}
                          disabled={isSavingExclusions}
                          className="text-muted-foreground flex-shrink-0 rounded p-0.5 transition-colors hover:text-red-500 focus:ring-2 focus:ring-red-500 focus:outline-none"
                          aria-label={`Remove ${path} from exclusions`}
                        >
                          <X size={12} aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                </div>
              )}

              {/* Add custom path input */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={excludePathInput}
                  onChange={(e) => setExcludePathInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleAddCustomExcludePath();
                    }
                  }}
                  placeholder="e.g. test or wp-content/uploads/large-dir"
                  className="bg-background border-border placeholder:text-muted-foreground/60 min-w-0 flex-1 rounded border px-2.5 py-1.5 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  aria-label="Add path to exclusion list"
                  disabled={isSavingExclusions}
                />
                <button
                  type="button"
                  onClick={() => void handleAddCustomExcludePath()}
                  disabled={isSavingExclusions || !excludePathInput.trim()}
                  className="flex-shrink-0 rounded bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Add exclusion path"
                >
                  {isSavingExclusions ? (
                    <Loader2
                      size={12}
                      className="animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    "Add"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 pb-6">
          {/* Loading state */}
          {isLoading && (
            <div
              className="text-muted-foreground flex items-center justify-center gap-2 py-12"
              role="status"
              aria-live="polite"
            >
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              <span className="text-sm">Loading automations…</span>
            </div>
          )}

          {/* Error state */}
          {isError && !isLoading && (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <XCircle size={28} className="text-red-400" aria-hidden="true" />
              <p className="text-muted-foreground text-sm">
                Could not load automations.
              </p>
              <Button variant="secondary" size="sm" onClick={() => refetch()}>
                Try Again
              </Button>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !isError && automations.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <div
                className="bg-secondary flex h-14 w-14 items-center justify-center rounded-2xl"
                aria-hidden="true"
              >
                <Inbox size={28} className="text-muted-foreground" />
              </div>
              <div>
                <p className="dark:text-foreground font-semibold text-gray-900">
                  No automations set up yet
                </p>
                <p className="text-muted-foreground mx-auto mt-1 max-w-xs text-sm">
                  Your site is not being backed up automatically. Create your
                  first automation to protect your data.
                </p>
              </div>
              <Button
                variant="primary"
                icon={Plus}
                onClick={() => setModalState("create")}
              >
                Create your first automation
              </Button>
            </div>
          )}

          {/* Automations list */}
          {!isLoading && !isError && automations.length > 0 && (
            <div
              className="space-y-3"
              role="list"
              aria-label="Backup automations"
              aria-live="polite"
            >
              {automations.map((automation) => (
                <div key={automation.id} role="listitem">
                  <AutomationCard
                    automation={automation}
                    onEdit={() => setModalState(automation.id)}
                    onToggle={() =>
                      toggleMutation.mutate({
                        id: automation.id,
                        enabled: !automation.enabled,
                      })
                    }
                    onRunNow={() =>
                      handleRunNow(automation.id, automation.name)
                    }
                    onDelete={() => deleteMutation.mutate(automation.id)}
                    isToggling={
                      toggleMutation.isPending &&
                      (toggleMutation.variables as { id: string })?.id ===
                        automation.id
                    }
                    isRunning={runningIds.has(automation.id)}
                    isPolling={pollingIds.has(automation.id)}
                    isDeleting={
                      deleteMutation.isPending &&
                      deleteMutation.variables === automation.id
                    }
                    deleteConfirmId={deleteConfirmId}
                    onDeleteConfirmOpen={() =>
                      setDeleteConfirmId(automation.id)
                    }
                    onDeleteConfirmClose={() => setDeleteConfirmId(null)}
                    onDeleteConfirmExecute={() =>
                      deleteMutation.mutate(automation.id)
                    }
                    runningJobId={automationJobIds.get(automation.id) ?? null}
                    onJobGone={() => handleJobGone(automation.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Create / Edit modal — rendered at root level, not inside card */}
      {modalState !== null && (
        <AutomationModal
          mode={modalState === "create" ? "create" : "edit"}
          automation={editingAutomation}
          connectedProviders={connectedProviders}
          onClose={() => setModalState(null)}
          onSave={handleSave}
          isSaving={isMutating}
        />
      )}
    </>
  );
};

export default BackupAutomationsPanel;
