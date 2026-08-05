import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  Download,
  CheckCircle,
  AlertTriangle,
  FileJson,
  ArrowRight,
  Database,
  RefreshCw,
  Loader2,
  Server,
  Clock,
  Shield,
  FileCode2,
  Lock,
} from "lucide-react";
import PostMigrationChecklist from "../PostMigrationChecklist";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { toast } from "sonner";
import type {
  DbIdentity,
  ImportVerification,
  MediaTransferMeta,
  MigrationMode,
  MigrationPreflightResult,
  ModeBExportState,
  PluginTransferMeta,
  ReceiverGenerationResult,
  ThemeTransferMeta,
  ImportStatus,
} from "../../types";
import { useSettings } from "../../hooks/useSettings";

interface MigrationStationProps {
  onCancel: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// ThemeManifestCard — detailed file breakdown for the green "theme included" card
// ─────────────────────────────────────────────────────────────────────────────

/** Format a byte count to a human-readable string (KB / MB). */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Extension → category mapping for the manifest grouping. */
const EXT_CATEGORIES: Record<string, string> = {
  php: "Code",
  js: "Code",
  ts: "Code",
  jsx: "Code",
  tsx: "Code",
  css: "Styles",
  scss: "Styles",
  less: "Styles",
  html: "Templates",
  twig: "Templates",
  png: "Assets",
  jpg: "Assets",
  jpeg: "Assets",
  gif: "Assets",
  svg: "Assets",
  webp: "Assets",
  ico: "Assets",
  woff: "Assets",
  woff2: "Assets",
  ttf: "Assets",
  eot: "Assets",
  otf: "Assets",
  json: "Data",
  xml: "Data",
  txt: "Data",
  md: "Data",
  pot: "Data",
  po: "Data",
  mo: "Data",
};

interface ManifestGroup {
  label: string;
  count: number;
  size: number;
  extensions: string[];
}

/** Collapse a flat file_manifest Record into the 6 display categories. */
function groupManifest(
  manifest: Record<string, { count: number; size: number }>
): ManifestGroup[] {
  const groups: Record<string, ManifestGroup> = {};
  for (const [ext, entry] of Object.entries(manifest)) {
    const label = EXT_CATEGORIES[ext.toLowerCase()] ?? "Other";
    if (!groups[label]) {
      groups[label] = { label, count: 0, size: 0, extensions: [] };
    }
    groups[label].count += entry.count;
    groups[label].size += entry.size;
    groups[label].extensions.push(ext);
  }
  // Canonical display order
  const ORDER = ["Code", "Styles", "Templates", "Assets", "Data", "Other"];
  return ORDER.map((l) => groups[l]).filter(Boolean);
}

interface ThemeManifestCardProps {
  themeMeta: ThemeTransferMeta;
  showFileList: boolean;
  onToggleFileList: () => void;
}

const ThemeManifestCard: React.FC<ThemeManifestCardProps> = ({
  themeMeta,
  showFileList,
  onToggleFileList,
}) => {
  const {
    active_theme,
    parent_theme,
    is_child_theme,
    filesize,
    file_count,
    file_manifest,
    file_list,
    file_list_truncated,
    file_list_total,
  } = themeMeta;

  const groups = file_manifest ? groupManifest(file_manifest) : [];
  const totalFiles = file_list_total ?? file_count;
  const displayedFileCount = file_list?.length ?? 0;

  return (
    <div className="overflow-hidden rounded-lg border border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-950/30">
      {/* Header */}
      <div className="space-y-1 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          <CheckCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          Block Theme — Files Included
        </div>
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          Theme files are bundled in this passport and will be transferred
          automatically during migration.
        </p>
        <p className="text-muted-foreground text-xs">
          Theme: <strong>{active_theme}</strong>
          {is_child_theme && parent_theme && <> (child of {parent_theme})</>}
        </p>
      </div>

      {/* Totals bar */}
      <div className="flex items-center gap-4 px-4 pb-3">
        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          {totalFiles.toLocaleString()} files
        </span>
        <span className="text-muted-foreground text-xs">·</span>
        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          {formatBytes(filesize)}
        </span>
      </div>

      {/* Manifest breakdown table — only rendered when file_manifest is present */}
      {groups.length > 0 && (
        <div className="border-t border-emerald-200 px-4 py-3 dark:border-emerald-800">
          <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
            File breakdown
          </p>
          <div className="grid grid-cols-3 gap-x-3 gap-y-1">
            {/* Column headers */}
            <span className="text-muted-foreground text-xs font-medium">
              Category
            </span>
            <span className="text-muted-foreground text-right text-xs font-medium">
              Files
            </span>
            <span className="text-muted-foreground text-right text-xs font-medium">
              Size
            </span>
            {/* Rows */}
            {groups.map((group) => (
              <React.Fragment key={group.label}>
                <span
                  className="text-foreground text-xs"
                  title={group.extensions.join(", ")}
                >
                  {group.label}
                </span>
                <span className="text-foreground text-right text-xs tabular-nums">
                  {group.count.toLocaleString()}
                </span>
                <span className="text-muted-foreground text-right text-xs tabular-nums">
                  {formatBytes(group.size)}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Collapsible file list — only rendered when file_list is present */}
      {file_list && file_list.length > 0 && (
        <div className="border-t border-emerald-200 dark:border-emerald-800">
          <button
            type="button"
            onClick={onToggleFileList}
            aria-expanded={showFileList}
            aria-controls="theme-file-list"
            className="flex w-full items-center justify-between px-4 py-2 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100/50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none dark:text-emerald-300 dark:hover:bg-emerald-900/30"
          >
            <span>
              {showFileList ? "Hide file list" : "Show file list"}
              {file_list_truncated && (
                <span className="text-muted-foreground ml-2 font-normal">
                  (showing {displayedFileCount.toLocaleString()} of{" "}
                  {(file_list_total ?? file_count).toLocaleString()})
                </span>
              )}
            </span>
            <svg
              className={`h-3 w-3 transition-transform duration-200 ${showFileList ? "rotate-180" : "rotate-0"}`}
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M2 4l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {showFileList && (
            <div
              id="theme-file-list"
              role="region"
              aria-label="Theme file list"
              aria-live="polite"
              className="px-4 pb-3"
            >
              {file_list_truncated && (
                <p className="mb-2 text-xs text-amber-600 dark:text-amber-400">
                  Showing {displayedFileCount.toLocaleString()} of{" "}
                  {(file_list_total ?? file_count).toLocaleString()} files —
                  list capped at 500.
                </p>
              )}
              <div className="max-h-48 overflow-y-auto rounded border border-emerald-200 bg-white/60 dark:border-emerald-800 dark:bg-black/20">
                <ul className="divide-y divide-emerald-100 dark:divide-emerald-900">
                  {file_list.map((path, idx) => (
                    <li
                      key={idx}
                      className="text-muted-foreground hover:text-foreground truncate px-2 py-0.5 font-mono text-xs transition-colors"
                      title={path}
                    >
                      {path}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const MigrationStation: React.FC<MigrationStationProps> = ({
  onCancel,
}) => {
  const [mode, setMode] = useState<"import" | "export">("export");
  const [step, setStep] = useState<
    "upload" | "validate" | "backup" | "migrate" | "complete"
  >("upload");

  // ── Mode A/B Selection (v2.9.11.0) ──────────────────────────────────────────
  const [migrationMode, setMigrationMode] = useState<MigrationMode>("direct");
  const [modeBState, setModeBState] = useState<ModeBExportState>({
    phase: "idle",
    receiver_filename: null,
    expires_at: null,
    passport_generated: false,
    export_includes: { sql: true, theme: true, media: true, plugins: true },
  });
  const [modeBResult, setModeBResult] =
    useState<ReceiverGenerationResult | null>(null);
  // Countdown string shown under the expiry timer ("1h 47m remaining" / "Expired")
  const [modeBCountdown, setModeBCountdown] = useState<string>("");
  const modeBTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Export State
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportProgress, setExportProgress] = useState("");
  const [generatedPassport, setGeneratedPassport] = useState<any>(null);
  const [exportSqlUrl, setExportSqlUrl] = useState<string | null>(null);
  const [includeTheme, setIncludeTheme] = useState(false);
  const [includeMedia, setIncludeMedia] = useState(true); // v2.9.7.71: default ON

  // v2.9.7.48: Unified user accounts toggle — controls both export exclusion and import preservation.
  // Default OFF = exclude users from export and preserve destination users on import.
  const [includeUsersInExport, setIncludeUsersInExport] = useState(false);

  // Import State
  const [file, setFile] = useState<File | null>(null);
  const [passport, setPassport] = useState<any>(null);
  const [validationReport, setValidationReport] = useState<any>(null);

  // Migration State
  const [phase, setPhase] = useState<"idle" | "fetching" | "processing">(
    "idle"
  );
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [showChecklistModal, setShowChecklistModal] = useState(false);

  // Diagnostics State
  const [showGuidedFix, setShowGuidedFix] = useState(false);
  const [aiFixAdvice, setAiFixAdvice] = useState<any>(null);

  // F0a: Import confirmation modal state
  const [showImportConfirmModal, setShowImportConfirmModal] = useState(false);

  // F0b: Multisite block state (set during startValidation)
  const [multisiteError, setMultisiteError] = useState<string | null>(null);

  // F0c: Post-migration verification state
  const [postMigrationCheck, setPostMigrationCheck] = useState<{
    loading: boolean;
    siteurl: string | null;
    active_theme: string | null;
    active_plugin_count: number | null;
    license_active: boolean | null;
  }>({
    loading: false,
    siteurl: null,
    active_theme: null,
    active_plugin_count: null,
    license_active: null,
  });

  // Environment Dirty State
  const [showDirtyEnvModal, setShowDirtyEnvModal] = useState(false);
  const [envStatus, setEnvStatus] = useState<any>(null);
  const [cleaningEnv, setCleaningEnv] = useState(false);

  // Identity Verification State
  const [dbIdentity, setDbIdentity] = useState<DbIdentity | null>(null);

  // SENTINEL-VIS-1: Pre-flight readiness results (fetched after validation, shown before import)
  const [preflight, setPreflight] = useState<MigrationPreflightResult | null>(
    null
  );
  const [preflightLoading, setPreflightLoading] = useState(false);

  // v2.9.7.58: Source speed probe result from validation step
  const [speedProbe, setSpeedProbe] = useState<{
    throughput_kbps: number;
    probe_ms: number;
    mode_cap: string;
    tuned_chunk_kb: number;
    tuning_log: string;
  } | null>(null);
  const [importVerification, setImportVerification] =
    useState<ImportVerification | null>(null);

  // Theme File Manifest UI State
  const [showFileList, setShowFileList] = useState(false);

  // Import ETA / Progress State (E4, v2.9.6.31)
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
  const importStatusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  // Server Profile State
  const { settings, updateSettings } = useSettings();
  const [savingProfile, setSavingProfile] = useState(false);

  const { apiUrl, nonce } = window.swisswpsuiteData || {};

  // Mock Data for UI Dev outside WP
  const isMock = !apiUrl;

  // Poll import status every 10 s while migration is in progress (E4, v2.9.6.31)
  useEffect(() => {
    if (step === "migrate" && !isMock) {
      const poll = async () => {
        try {
          const res = await fetch(`${apiUrl}/backup/import-status`, {
            headers: { "X-WP-Nonce": nonce },
          });
          if (res.ok) {
            const data: ImportStatus = await res.json();
            setImportStatus(data);
          }
        } catch {
          // silent — polling is best-effort
        }
      };
      poll(); // immediate first poll
      importStatusIntervalRef.current = setInterval(poll, 10000);
    } else {
      if (importStatusIntervalRef.current) {
        clearInterval(importStatusIntervalRef.current);
        importStatusIntervalRef.current = null;
      }
      setImportStatus(null);
    }
    return () => {
      if (importStatusIntervalRef.current) {
        clearInterval(importStatusIntervalRef.current);
        importStatusIntervalRef.current = null;
      }
    };
  }, [step, apiUrl, nonce]);

  // ── Mode B: countdown timer — updates every second while receiver is active ──
  useEffect(() => {
    if (modeBState.phase === "ready" && modeBState.expires_at !== null) {
      const tick = () => {
        const now = Math.floor(Date.now() / 1000);
        const remaining = (modeBState.expires_at as number) - now;
        if (remaining <= 0) {
          setModeBCountdown("Expired");
          setModeBState((prev) => ({ ...prev, phase: "expired" }));
          if (modeBTimerRef.current) {
            clearInterval(modeBTimerRef.current);
            modeBTimerRef.current = null;
          }
          return;
        }
        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        if (hours > 0) {
          setModeBCountdown(`${hours}h ${minutes}m remaining`);
        } else {
          const seconds = remaining % 60;
          setModeBCountdown(`${minutes}m ${seconds}s remaining`);
        }
      };
      tick(); // immediate tick
      modeBTimerRef.current = setInterval(tick, 1000);
    } else {
      if (modeBTimerRef.current) {
        clearInterval(modeBTimerRef.current);
        modeBTimerRef.current = null;
      }
    }
    return () => {
      if (modeBTimerRef.current) {
        clearInterval(modeBTimerRef.current);
        modeBTimerRef.current = null;
      }
    };
  }, [modeBState.phase, modeBState.expires_at]);

  const formatEta = (etaSeconds: number): string => {
    if (etaSeconds <= 0) return "";
    if (etaSeconds < 60) return `~${etaSeconds}s remaining`;
    const mins = Math.round(etaSeconds / 60);
    return `~${mins} min${mins !== 1 ? "s" : ""} remaining`;
  };

  const handleGeneratePassport = async () => {
    setIsGenerating(true);
    setExportProgress("");
    setExportSqlUrl(null);
    setStatusMsg("Preparing migration export...");

    if (isMock) {
      setTimeout(() => {
        setGeneratedPassport({
          url: "#",
          token: "mock-token-123",
          expires: "24 hours",
        });
        setIsGenerating(false);
      }, 1500);
      return;
    }

    try {
      // Step 1: Prepare export (calculate DB size)
      setExportProgress("Calculating database size...");
      const prepareRes = await fetch(`${apiUrl}/backup/export/prepare`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-WP-Nonce": nonce },
        body: JSON.stringify({}),
      });
      if (!prepareRes.ok) {
        throw new Error(`Preparation failed (HTTP ${prepareRes.status})`);
      }
      const prepareData = await prepareRes.json();
      if (!prepareData.success) {
        throw new Error(
          prepareData.message || "Preparation returned unsuccessful"
        );
      }

      // Step 2: Start export session (creates SQL file & sets swisswpsuite_export_filename)
      setExportProgress("Starting export session...");
      const startRes = await fetch(`${apiUrl}/backup/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-WP-Nonce": nonce },
        body: JSON.stringify({
          replace: false,
          include_theme: includeTheme,
          // v2.9.7.71: Media (uploads) file transfer
          include_media: includeMedia,
          // v2.9.25.1: Plugin file transfer — package plugins for Mode A transfer
          include_plugins: true,
          // v2.9.7.48: exclude_users is the INVERSE of includeUsersInExport.
          // exclude_users=true means the export OMITS wp_users + wp_usermeta tables.
          exclude_users: !includeUsersInExport,
        }),
      });
      const startData = await startRes.json();
      if (!startRes.ok) {
        throw new Error(
          startData.message || `Export start failed (HTTP ${startRes.status})`
        );
      }

      // Check export method: mysqldump (background) vs php_chunked (client-side)
      if (
        startData.method === "php_chunked" ||
        startData.data?.method === "php_chunked"
      ) {
        // PHP Chunked Mode: export table by table from client
        setExportProgress("Fetching table list...");
        const tablesRes = await fetch(
          `${apiUrl}/backup/tables?exclude_ephemeral=true&exclude_users=${!includeUsersInExport}`,
          {
            headers: { "X-WP-Nonce": nonce },
          }
        );
        const tablesData = await tablesRes.json();
        if (!tablesData.tables) throw new Error("Could not fetch tables.");

        const tables: { name: string; rows: number }[] = tablesData.tables;
        const totalBytes = tablesData.total_bytes || 0;
        const totalMB = tablesData.total_mb || 0;

        for (const table of tables) {
          const chunkLimit = 1000;
          let offset = 0;
          let hasMore = true;

          while (hasMore) {
            const chunkRes = await fetch(`${apiUrl}/backup/export/chunk`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-WP-Nonce": nonce,
              },
              body: JSON.stringify({
                table: table.name,
                offset,
                limit: chunkLimit,
                search: "",
                replace: "",
                total_bytes: totalBytes,
              }),
            });

            if (!chunkRes.ok) {
              const err = await chunkRes.json().catch(() => ({}));
              throw new Error(err.message || "Chunk export failed");
            }

            const chunkData = await chunkRes.json();
            const count = chunkData.count;

            if (
              chunkData.progress_percent !== undefined &&
              chunkData.current_mb !== undefined &&
              !isNaN(chunkData.progress_percent) &&
              !isNaN(chunkData.current_mb) &&
              totalBytes > 0
            ) {
              const percent = Math.min(
                99,
                Math.max(0, chunkData.progress_percent)
              );
              const currentMB = Number(chunkData.current_mb).toFixed(2);
              const totalMBFmt = totalMB.toFixed(2);
              setExportProgress(
                `Exporting: ${percent}% [${currentMB} MB / ${totalMBFmt} MB]`
              );
            } else {
              setExportProgress(
                `Exporting ${table.name} (${offset}/${table.rows})...`
              );
            }

            offset += count;
            if (count < chunkLimit) hasMore = false;
            await new Promise((r) => setTimeout(r, 50));
          }
        }

        // Finalize chunked export
        setExportProgress("Finalizing export & generating passport...");
        const finRes = await fetch(`${apiUrl}/backup/export/finalize`, {
          method: "POST",
          headers: { "X-WP-Nonce": nonce },
        });
        const finData = await finRes.json();

        let gotPassport = false;
        if (finData.result?.url) setExportSqlUrl(finData.result.url);
        if (finData.result?.passport?.url) {
          setGeneratedPassport({
            url: finData.result.passport.url,
            filename: finData.result.passport.filename,
            content: finData.result.passport.content ?? null,
          });
          setStatusMsg("Export complete — passport generated successfully.");
          toast.success("Migration passport generated!");
          gotPassport = true;
        }

        // If finalize didn't return passport, try dedicated endpoint
        if (!gotPassport) {
          setExportProgress("Generating passport...");
          const passportRes = await fetch(
            `${apiUrl}/backup/migration/generate-passport`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-WP-Nonce": nonce,
              },
              body: JSON.stringify({}),
            }
          );
          const passportData = await passportRes.json();
          if (passportData.success) {
            setGeneratedPassport(passportData.passport);
            setStatusMsg("Passport generated successfully.");
            toast.success("Migration passport generated!");
          } else {
            throw new Error(
              passportData.message || "Passport generation failed"
            );
          }
        }
      } else {
        // mysqldump Mode: poll for background completion
        setExportProgress("Database export running (mysqldump)...");
        let exportDone = false;
        let gotPassport = false;
        let pollIterations = 0;
        const MAX_POLL_ITERATIONS = 300; // 300 × 2s = 10 minutes max
        while (!exportDone) {
          if (pollIterations >= MAX_POLL_ITERATIONS) {
            throw new Error(
              "Export timed out after 10 minutes. The mysqldump process may have stalled. Check System Logs for details."
            );
          }
          pollIterations++;
          await new Promise((r) => setTimeout(r, 2000));
          const statusRes = await fetch(`${apiUrl}/backup/export/status`, {
            headers: { "X-WP-Nonce": nonce },
          });
          const statusData = await statusRes.json();

          if (statusData.status === "complete") {
            exportDone = true;
            if (statusData.url) setExportSqlUrl(statusData.url);
            if (statusData.passport?.url) {
              setGeneratedPassport({
                url: statusData.passport.url,
                filename: statusData.passport.filename,
                content: statusData.passport.content ?? null,
              });
              setStatusMsg(
                "Export complete — passport generated successfully."
              );
              toast.success("Migration passport generated!");
              gotPassport = true;
            }
          } else if (statusData.status === "failed") {
            throw new Error(statusData.message || "mysqldump export failed");
          } else if (statusData.status === "processing") {
            if (
              statusData.progress_percent !== undefined &&
              !isNaN(statusData.progress_percent)
            ) {
              setExportProgress(
                `Exporting: ${Math.min(99, statusData.progress_percent)}%`
              );
            }
          }
        }

        // If poll didn't return passport, try dedicated endpoint
        if (!gotPassport) {
          setExportProgress("Generating passport...");
          const passportRes = await fetch(
            `${apiUrl}/backup/migration/generate-passport`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-WP-Nonce": nonce,
              },
              body: JSON.stringify({}),
            }
          );
          const passportData = await passportRes.json();
          if (passportData.success) {
            setGeneratedPassport(passportData.passport);
            setStatusMsg("Passport generated successfully.");
            toast.success("Migration passport generated!");
          } else {
            throw new Error(
              passportData.message || "Passport generation failed"
            );
          }
        }
      }

      setExportProgress("");
    } catch (error: any) {
      setStatusMsg("Error: " + error.message);
      setExportProgress("");
      toast.error("Export Failed: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile) {
      if (!uploadedFile.name.endsWith(".json")) {
        toast.error("Please upload a .json passport file");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          if (!json.token && !json.download_url) {
            toast.error(
              "This JSON file does not appear to be a valid migration passport"
            );
            return;
          }
          setFile(uploadedFile);
          setPassport(json);

          // MIG-1 + MIG-10: Inherit the exporter's user-inclusion choice from the passport.
          // This prevents silent data loss: if the source was exported WITH user accounts
          // (include_users=true), the import must also import them — otherwise the toggle
          // defaults to false and preserve_users=true silently skips all user tables.
          //
          // POLARITY: include_users=true  → includeUsersInExport=true  → preserve_users=false (DO import users)
          //           include_users=false → includeUsersInExport=false → preserve_users=true  (SKIP user tables)
          //
          // The user can still override via the toggle after the passport is loaded.
          if (typeof json.include_users === "boolean") {
            setIncludeUsersInExport(json.include_users);
          }

          setStep("validate");
        } catch (err) {
          toast.error("Invalid passport file — could not parse JSON");
        }
      };
      reader.readAsText(uploadedFile);
    }
  };

  const startValidation = async () => {
    setPhase("processing");
    setStatusMsg("Validating source connection...");

    if (isMock) {
      setTimeout(() => {
        setValidationReport({
          source: "https://example.com",
          size: "250MB",
          db_size: "15MB",
          compatibility: "100%",
          warnings: [],
        });
        setPhase("idle");
        setStep("backup");
      }, 1500);
      return;
    }

    if (!passport) return;

    // F0b: Check source multisite BEFORE hitting the server — the passport
    // carries system.is_multisite = 'Yes'|'No' from get_system_report().
    // The key is 'system' (not 'system_report') per backup.php line 2087.
    // Catch both the string form ('Yes') and a boolean true from newer passports.
    const sourceIsMultisite =
      passport.system?.is_multisite === "Yes" ||
      passport.system?.is_multisite === true ||
      passport.system_report?.is_multisite === "Yes" ||
      passport.system_report?.is_multisite === true ||
      passport.is_multisite === true;
    if (sourceIsMultisite) {
      const msg =
        "Multisite (WordPress Network) migrations are not supported. Please use WP-CLI or a multisite-specific migration tool.";
      setMultisiteError(msg);
      toast.error(msg);
      setPhase("idle");
      return;
    }
    // Clear any previous multisite error if the passport is clean
    setMultisiteError(null);

    try {
      const res = await fetch(`${apiUrl}/backup/import/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-WP-Nonce": nonce },
        body: JSON.stringify({ passport }),
      });
      const data = await res.json();

      // WP_Error path returns { success: false, message: "..." }
      if (data.success === false) {
        toast.error(data.message || "Validation failed");
        setPhase("idle");
        return;
      }

      // validate_passport returns { can_migrate, warnings[], errors[] }
      if (data.can_migrate === false) {
        const errorMsg = data.errors?.length
          ? data.errors.join("; ")
          : "Migration blocked by server validation";
        toast.error(errorMsg);
        setPhase("idle");
        return;
      }

      setValidationReport({
        source: passport.source_url || "Unknown Source",
        size: passport.filesize
          ? `${Math.round(passport.filesize / 1024 / 1024)}MB`
          : "Unknown",
        compatibility: data.can_migrate ? "Compatible" : "Check warnings",
        warnings: data.warnings || [],
        // MIG-10: Surface include_users from the passport so the user can see what
        // the exporter chose before deciding whether to override the toggle.
        include_users:
          typeof passport.include_users === "boolean"
            ? passport.include_users
            : null,
      });
      if (data.db_identity) setDbIdentity(data.db_identity);
      // v2.9.7.58: Capture speed probe result so we can display it in the UI
      if (data.speed_probe) setSpeedProbe(data.speed_probe);
      setPhase("idle");
      setStep("backup");
      // SENTINEL-VIS-1: Kick off pre-flight check in the background so results
      // are ready by the time the user scrolls to the "Start Import" button.
      runPreflightCheck();
    } catch (e: any) {
      console.error("Validation error:", e);
      toast.error("Validation failed: " + (e.message || "Unknown error"));
      setPhase("idle");
    }
  };

  // Helper functions
  const calculatePercent = (current: number, total: number) => {
    if (!total || total <= 0 || isNaN(total)) return 0;
    if (!current || current < 0 || isNaN(current)) return 0;
    const percent = Math.round((current / total) * 100);
    return Math.min(100, Math.max(0, percent));
  };

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev.slice(-4), msg]);
    setStatusMsg(msg);
  };

  const safeParseJSON = async (response: Response) => {
    const text = await response.text();
    const jsonStart = text.search(/[\[{]/);
    const jsonEndBrace = text.lastIndexOf("}");
    const jsonEndBracket = text.lastIndexOf("]");
    const jsonEnd = Math.max(jsonEndBrace, jsonEndBracket);

    if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
      console.error(
        "[SwissSuite] No valid JSON found in response:",
        text.substring(0, 500)
      );
      throw new Error("Server returned invalid response.");
    }

    const jsonString = text.substring(jsonStart, jsonEnd + 1);
    // MIG-11: Warn if PHP output (warnings/notices) was stripped before the JSON start.
    // Helps debug host misconfigurations where PHP warnings leak into the response body.
    if (jsonStart > 0) {
      console.warn(
        "[SwissSuite] PHP output detected before JSON response (stripped):",
        text.substring(0, jsonStart).trim().substring(0, 300)
      );
    }
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      throw new Error("Failed to parse server response.");
    }
  };

  const diagnoseError = async () => {
    try {
      const res = await fetch(`${apiUrl}/diagnostics/analyze`, {
        method: "POST",
        headers: { "X-WP-Nonce": nonce },
      });
      const data = await res.json();
      if (data.success && data.analysis) {
        return data.analysis;
      }
    } catch (e) {
      console.error("Self-healing probe failed", e);
    }
    return null;
  };

  const handleCleanEnv = async () => {
    setCleaningEnv(true);
    try {
      await fetch(`${apiUrl}/maintenance`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-WP-Nonce": nonce },
        body: JSON.stringify({ action: "reset_migration" }),
      });
      toast.success("Environment Cleaned! You can now start the migration.");
      setShowDirtyEnvModal(false);
      startMigration(true);
    } catch (e) {
      toast.error("Failed to clean environment. Please check System Logs.");
    } finally {
      setCleaningEnv(false);
    }
  };

  // SENTINEL-VIS-1: Fetch pre-flight readiness snapshot from /migration/preflight.
  // Called after passport validation succeeds so the user sees real server metrics
  // before committing to the import.
  const runPreflightCheck = async () => {
    if (isMock) {
      setPreflight({
        disk_free_pct: 62,
        db_size_mb: 18,
        memory_available_mb: 210,
        time_limit: 30,
        is_litespeed: true,
        load_avg: 1.2,
        recommended_mode: "standard",
        loopback_ok: true,
        zip_ok: true,
        cron_ok: true,
        uploads_size_mb: 340,
        go_nogo: true,
      });
      return;
    }
    setPreflightLoading(true);
    try {
      const res = await fetch(`${apiUrl}/migration/preflight`, {
        headers: { "X-WP-Nonce": nonce },
      });
      if (res.ok) {
        const data: MigrationPreflightResult = await res.json();
        setPreflight(data);
        if (!data.go_nogo) {
          toast.error(
            `Pre-flight check: ${data.reason ?? "Server may not be ready for import"}`
          );
        }
      }
    } catch {
      // Non-fatal — pre-flight is informational; import can still proceed
    } finally {
      setPreflightLoading(false);
    }
  };

  const handleServerProfileChange = async (
    profile: "auto" | "standard" | "vps"
  ) => {
    if (settings?.serverProfile === profile) return;
    setSavingProfile(true);
    try {
      await updateSettings({ serverProfile: profile });
      toast.success(
        `Server profile: ${profile === "auto" ? "Auto-Detect" : profile === "standard" ? "Standard Hosting" : "VPS / Dedicated"}`
      );
    } catch (e: any) {
      toast.error("Failed to save: " + (e.message || "Unknown error"));
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Mode B: Generate Receiver Script ─────────────────────────────────────────
  // ── Shared: Run the full export pipeline (prepare → start → chunks → finalize) ──
  // Used by both Mode A (handleGeneratePassport) and Mode B (handleGenerateReceiver).
  // The export must exist on disk before passport or receiver generation can proceed.
  const runExportPipeline = async (opts: {
    includeTheme: boolean;
    includeMedia: boolean;
    includePlugins?: boolean;
    excludeUsers: boolean;
    onProgress: (msg: string) => void;
  }): Promise<void> => {
    // Step 1: Prepare export (calculate DB size)
    opts.onProgress("Calculating database size...");
    const prepareRes = await fetch(`${apiUrl}/backup/export/prepare`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-WP-Nonce": nonce },
      body: JSON.stringify({}),
    });
    if (!prepareRes.ok) {
      throw new Error(`Preparation failed (HTTP ${prepareRes.status})`);
    }
    const prepareData = await prepareRes.json();
    if (!prepareData.success) {
      throw new Error(
        prepareData.message || "Preparation returned unsuccessful"
      );
    }

    // Step 2: Start export session
    opts.onProgress("Starting export session...");
    const startRes = await fetch(`${apiUrl}/backup/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-WP-Nonce": nonce },
      body: JSON.stringify({
        replace: false,
        include_theme: opts.includeTheme,
        include_media: opts.includeMedia,
        include_plugins: opts.includePlugins !== false, // Default true.
        exclude_users: opts.excludeUsers,
      }),
    });
    const startData = await startRes.json();
    if (!startRes.ok) {
      throw new Error(
        startData.message || `Export start failed (HTTP ${startRes.status})`
      );
    }

    // Step 3: Export table-by-table (php_chunked) or poll (mysqldump)
    if (
      startData.method === "php_chunked" ||
      startData.data?.method === "php_chunked"
    ) {
      opts.onProgress("Fetching table list...");
      const tablesRes = await fetch(
        `${apiUrl}/backup/tables?exclude_ephemeral=true&exclude_users=${opts.excludeUsers}`,
        { headers: { "X-WP-Nonce": nonce } }
      );
      const tablesData = await tablesRes.json();
      if (!tablesData.tables) throw new Error("Could not fetch tables.");

      const tables: { name: string; rows: number }[] = tablesData.tables;
      const totalBytes = tablesData.total_bytes || 0;
      const totalMB = tablesData.total_mb || 0;

      for (const table of tables) {
        const chunkLimit = 1000;
        let offset = 0;
        let hasMore = true;
        while (hasMore) {
          const chunkRes = await fetch(`${apiUrl}/backup/export/chunk`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-WP-Nonce": nonce,
            },
            body: JSON.stringify({
              table: table.name,
              offset,
              limit: chunkLimit,
              search: "",
              replace: "",
              total_bytes: totalBytes,
            }),
          });
          if (!chunkRes.ok) {
            const err = await chunkRes.json().catch(() => ({}));
            throw new Error(err.message || "Chunk export failed");
          }
          const chunkData = await chunkRes.json();
          const count = chunkData.count;

          if (
            chunkData.progress_percent !== undefined &&
            chunkData.current_mb !== undefined &&
            !isNaN(chunkData.progress_percent) &&
            totalBytes > 0
          ) {
            const percent = Math.min(
              99,
              Math.max(0, chunkData.progress_percent)
            );
            const currentMB = Number(chunkData.current_mb).toFixed(2);
            const totalMBFmt = totalMB.toFixed(2);
            opts.onProgress(
              `Exporting: ${percent}% [${currentMB} MB / ${totalMBFmt} MB]`
            );
          } else {
            opts.onProgress(
              `Exporting ${table.name} (${offset}/${table.rows})...`
            );
          }

          offset += count;
          if (count < chunkLimit) hasMore = false;
          await new Promise((r) => setTimeout(r, 50));
        }
      }

      // Finalize chunked export
      opts.onProgress("Finalizing export...");
      const finRes = await fetch(`${apiUrl}/backup/export/finalize`, {
        method: "POST",
        headers: { "X-WP-Nonce": nonce },
      });
      const finData = await finRes.json();
      if (finData.result?.url) setExportSqlUrl(finData.result.url);
    } else {
      // mysqldump mode: poll for completion
      opts.onProgress("Database export running (mysqldump)...");
      let exportDone = false;
      let pollIterations = 0;
      const MAX_POLL_ITERATIONS = 300;
      while (!exportDone) {
        if (pollIterations >= MAX_POLL_ITERATIONS) {
          throw new Error("Export timed out after 10 minutes.");
        }
        pollIterations++;
        await new Promise((r) => setTimeout(r, 2000));
        const statusRes = await fetch(`${apiUrl}/backup/export/status`, {
          headers: { "X-WP-Nonce": nonce },
        });
        const statusData = await statusRes.json();
        if (statusData.status === "complete") {
          exportDone = true;
          if (statusData.url) setExportSqlUrl(statusData.url);
        } else if (statusData.status === "failed") {
          throw new Error(statusData.message || "mysqldump export failed");
        } else {
          opts.onProgress(
            `Database export running (mysqldump)... ${statusData.progress || ""}`
          );
        }
      }
    }
  };

  const handleGenerateReceiver = async () => {
    setModeBState((prev) => ({ ...prev, phase: "generating" }));

    if (isMock) {
      // Mock path for UI development outside WP Admin
      setTimeout(() => {
        const mockResult: ReceiverGenerationResult = {
          success: true,
          receiver_script: btoa("<?php echo 'mock receiver'; ?>"),
          filename: "swisswp-receive-a1b2c3d4e5f6g7h8.php",
          expires_at: Math.floor(Date.now() / 1000) + 7200,
          export_id: "mock-export-id",
          source_domain: window.location.hostname,
          estimated_archive_size: 0,
        };
        setModeBResult(mockResult);
        setModeBState((prev) => ({
          ...prev,
          phase: "ready",
          receiver_filename: mockResult.filename,
          expires_at: mockResult.expires_at,
          passport_generated: true,
        }));
        toast.success("Receiver script generated (mock mode)");
      }, 1500);
      return;
    }

    try {
      // Step 1: Run the full export pipeline first — the receiver needs an export on disk.
      await runExportPipeline({
        includeTheme: modeBState.export_includes.theme,
        includeMedia: modeBState.export_includes.media,
        includePlugins: true, // Always package plugins for Mode B (receiver deactivates them post-import).
        excludeUsers: !includeUsersInExport,
        onProgress: (msg) => setExportProgress(msg),
      });

      // Step 2: Now generate the receiver script (passport + HMAC keys + template).
      setExportProgress("Generating receiver script...");
      const res = await fetch(`${apiUrl}/migration/generate-receiver`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-WP-Nonce": nonce },
        body: JSON.stringify({
          include_theme: modeBState.export_includes.theme,
          include_media: modeBState.export_includes.media,
          include_plugins: true,
          old_domain: window.location.origin,
        }),
      });

      const data: ReceiverGenerationResult = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          (data as unknown as { message?: string }).message ||
            `Generation failed (HTTP ${res.status})`
        );
      }

      setModeBResult(data);
      setModeBState((prev) => ({
        ...prev,
        phase: "ready",
        receiver_filename: data.filename,
        expires_at: data.expires_at,
        passport_generated: true,
      }));
      setExportProgress("");
      toast.success("Receiver script generated — download it below.");
    } catch (e: any) {
      setModeBState((prev) => ({ ...prev, phase: "idle" }));
      setExportProgress("");
      toast.error(
        "Receiver generation failed: " + (e.message || "Unknown error")
      );
    }
  };

  // ── Mode B: Trigger browser download of the receiver PHP file ────────────────
  const handleDownloadReceiver = () => {
    if (!modeBResult) return;
    try {
      const decoded = atob(modeBResult.receiver_script);
      const blob = new Blob([decoded], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = modeBResult.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(
        "Download failed — try right-clicking and saving: " + e.message
      );
    }
  };

  const startMigration = async (bypassCheck = false) => {
    // Silent pre-flight reset — clear any leftover temp files or stale locks
    // before every migration start. No toast, no spinner — fire and wait.
    if (!isMock) {
      try {
        await fetch(`${apiUrl}/maintenance`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-WP-Nonce": nonce },
          body: JSON.stringify({ action: "reset_migration" }),
        });
      } catch {
        // Non-fatal — proceed even if the reset call fails
      }
    }

    if (!bypassCheck) {
      try {
        const statusRes = await fetch(`${apiUrl}/backup/environment-status`, {
          headers: { "X-WP-Nonce": nonce },
        });
        const status = await statusRes.json();
        if (status.dirty) {
          setEnvStatus(status);
          setShowDirtyEnvModal(true);
          return;
        }
      } catch (e) {
        console.error("Environment check failed", e);
      }
    }

    setStep("migrate");
    setPhase("fetching");
    setProgress(0);
    addLog("Initializing migration sequence...");

    try {
      // PHASE 1: DOWNLOAD
      addLog("Phase 1: Fetching Backup from Source...");
      let offset = 0;
      let total =
        passport.filesize && passport.filesize > 0 ? passport.filesize : 0;
      const hasTotalSize = total > 0;
      let done = false;
      let retries = 0;
      const MAX_RETRIES = 5;
      // A1: Gate AI diagnosis to first failure only — avoids hammering VPS on every retry.
      let diagnosisAttempted = false;
      // A3: Signal fetch-chunk to halve its tuned_chunk_size_kb after a failure.
      let fetchDownshiftRequested = false;
      // A2b: Track consecutive 429 responses. After 10, send force=true to bypass
      // the load check — prevents permanent migration blocking on shared hosting
      // where sys_getloadavg() reflects co-tenant load, not just this site.
      let consecutive429s = 0;

      // 4.5 Token rotation (Sprint 4): mutable passport copy — token may be updated
      // by X-SwissWP-Next-Token response header after each chunk.
      // We keep BOTH original + rotated token by sending the current value;
      // the server accepts either (backward compatible with old sources).
      let currentPassport = { ...passport };

      while (!done) {
        try {
          const forceBypass = consecutive429s >= 10;
          const res = await fetch(`${apiUrl}/backup/import/fetch-chunk`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-WP-Nonce": nonce,
            },
            body: JSON.stringify({
              url: currentPassport.download_url,
              token: currentPassport.token,
              offset: offset,
              downshift: fetchDownshiftRequested ? true : undefined,
              force: forceBypass ? true : undefined,
            }),
          });

          // A2: Handle HTTP 429 backpressure — server is under high load.
          // This does NOT count as a retry; we simply wait and continue.
          if (res.status === 429) {
            consecutive429s++;
            const body = await res.json().catch(() => ({}));
            const retryAfter = body.retry_after || 5;
            addLog(
              `[LOAD] Server busy (load ${body.load_avg || "?"}). Waiting ${retryAfter}s... (${consecutive429s}/10)`
            );
            await new Promise((r) => setTimeout(r, retryAfter * 1000));
            continue;
          }
          // Reset 429 counter on any non-429 response
          consecutive429s = 0;

          if (res.ok) {
            // 4.5 Token rotation: read next token from response header if present.
            // Old source versions that don't rotate tokens simply won't send this header.
            // We keep original token valid (server accepts both), so cross-version works.
            const nextToken = res.headers?.get?.("X-SwissWP-Next-Token");
            if (nextToken) {
              currentPassport = { ...currentPassport, token: nextToken };
            }

            const data = await safeParseJSON(res);

            if (data.result) {
              offset = data.result.total_size;
              done = data.result.done || (hasTotalSize && offset >= total);
            } else {
              offset = data.total_size;
              done = data.done || (hasTotalSize && offset >= total);
            }

            retries = 0;
            fetchDownshiftRequested = false;
            const percent = hasTotalSize ? calculatePercent(offset, total) : 0;
            setProgress(Math.min(99, percent));
            addLog(
              hasTotalSize
                ? `Downloaded ${Math.round(offset / 1024 / 1024)}MB / ${Math.round(total / 1024 / 1024)}MB`
                : `Downloaded ${Math.round(offset / 1024 / 1024)}MB...`
            );

            if (!done) await new Promise((r) => setTimeout(r, 500));
            continue;
          }

          // Parse error response — may contain Sentinel analysis
          const errData = await res.json().catch(() => ({}));
          const sentinelAnalysis = errData.sentinel_analysis;

          // Sentinel-driven retry: use the server's error classification
          if (sentinelAnalysis) {
            if (!sentinelAnalysis.should_retry) {
              // Fatal error — Sentinel says stop retrying
              addLog(
                `[SENTINEL] ${sentinelAnalysis.error_type.toUpperCase()}: ${sentinelAnalysis.diagnosis}`
              );
              throw new Error(sentinelAnalysis.diagnosis);
            }

            if (retries < MAX_RETRIES) {
              retries++;
              const waitSec = sentinelAnalysis.wait_seconds || 3;
              const adaptInfo = sentinelAnalysis.adapted_chunk_kb
                ? ` Chunk: ${sentinelAnalysis.adapted_chunk_kb}KB`
                : "";
              const modeInfo = sentinelAnalysis.adapted_mode
                ? ` Mode: ${sentinelAnalysis.adapted_mode}`
                : "";
              addLog(
                `[SENTINEL] ${sentinelAnalysis.error_type}: ${sentinelAnalysis.diagnosis}${adaptInfo}${modeInfo} — Retry ${retries}/${MAX_RETRIES} in ${waitSec}s`
              );
              await new Promise((r) => setTimeout(r, waitSec * 1000));
              continue;
            }
          }

          // Fallback for non-Sentinel errors or exhausted retries
          const isServerError = res.status >= 500;
          if (isServerError && retries < MAX_RETRIES) {
            // A1: Only call diagnoseError on the FIRST 500/508 failure (legacy AI diagnosis).
            if (
              (res.status === 500 || res.status === 508) &&
              !diagnosisAttempted
            ) {
              diagnosisAttempted = true;
              addLog(
                `[WARNING] Server Error ${res.status}. Querying AI Analyst...`
              );
              const diagnosis = await diagnoseError();
              if (diagnosis) {
                addLog(
                  `[AI DIAGNOSIS] ${diagnosis.summary} (${diagnosis.recommendation})`
                );
                if (diagnosis.fix_action && diagnosis.fix_action !== "none") {
                  setAiFixAdvice(diagnosis);
                }
              }
            }
            throw new Error("Server Error " + res.status);
          } else {
            throw new Error(
              errData.message || `Download failed (HTTP ${res.status})`
            );
          }
        } catch (e: any) {
          if (retries < MAX_RETRIES && e.message.includes("Server Error")) {
            retries++;
            // Signal PHP to halve tuned_chunk_size_kb on the next fetch-chunk call.
            fetchDownshiftRequested = true;
            const delay = 5000 * Math.pow(1.5, retries - 1);
            addLog(
              `Download chunk failed (${e.message}). Sentinel will adapt settings. Retrying in ${Math.round(delay / 1000)}s (Attempt ${retries}/${MAX_RETRIES})...`
            );
            await new Promise((r) => setTimeout(r, delay));
            continue;
          } else {
            if (aiFixAdvice) {
              setShowGuidedFix(true);
              throw new Error("Automated recovery failed. See AI suggestions.");
            } else {
              throw e;
            }
          }
        }
      }

      addLog("Download Complete. Verifying Integrity...");
      await new Promise((r) => setTimeout(r, 1000));

      // FIX 3: Hoist domain/path extraction before any file phase so Phase 5
      // (DB import, now last) can access these variables.
      // Send full origins (scheme + host) so the PHP backend can build a
      // scheme-aware replacement map (https://old.com, http://old.com, //old.com, old.com).
      // The backend is backward-compatible with bare hostnames for older passports.
      const sourceUrlObj = new URL(passport.source_url);
      const destUrlObj = new URL(window.swisswpsuiteData.homeUrl);
      const oldDomain = sourceUrlObj.origin; // e.g. "https://test.swisswpsecure.com"
      const currentDomain = destUrlObj.origin; // e.g. "https://swisswpsecure.com"

      let oldPath = "";
      let newPath = "";
      if (
        passport.path_mapping &&
        passport.path_mapping.path_replacement_required
      ) {
        oldPath = passport.path_mapping.source_physical_path || "";
        newPath = passport.path_mapping.target_physical_path || "";
        addLog(`Path mapping detected: ${oldPath} → ${newPath}`);
      }

      // PHASE 2: PROCESS (DB IMPORT)
      // DB import runs immediately after download — original v2.9.6.39 order.
      setPhase("processing");
      addLog("Phase 2: Importing Database & Updating URLs...");
      setProgress(0);

      offset = 0;
      done = false;
      let queriesTotal = 0;

      const importFileSize = await fetch(
        `${apiUrl}/backup/environment-status`,
        {
          headers: { "X-WP-Nonce": nonce },
        }
      )
        .then((r) => r.json())
        .then((d) => d.import_file_size || total)
        .catch(() => total);

      let importRetries = 0;
      const MAX_IMPORT_RETRIES = 5;
      // Sentinel-driven: store the last error context so we can send it on retry
      // for intelligent adaptation instead of blind downshift.
      let lastErrorContext: { http_status: number; message: string } | null =
        null;

      while (!done) {
        try {
          const res = await fetch(`${apiUrl}/backup/import/process-chunk`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-WP-Nonce": nonce,
            },
            body: JSON.stringify({
              offset: offset,
              old_domain: oldDomain,
              new_domain: currentDomain,
              old_path: oldPath,
              new_path: newPath,
              // preserve_users=true means SKIP importing source users (keep destination users).
              // includeUsersInExport=true means we WANT to import source users, so we invert:
              preserve_users: !includeUsersInExport,
              // Sentinel adaptive retry: send the error context from the last failure so
              // the server can classify the error and apply targeted adaptations.
              error_context: lastErrorContext || undefined,
            }),
          });

          const data = await safeParseJSON(res);

          if (!res.ok) {
            // Check for Sentinel analysis in the error response
            if (data.sentinel_analysis) {
              const sa = data.sentinel_analysis;
              if (!sa.should_retry) {
                addLog(`[SENTINEL] FATAL: ${sa.error_type} - ${sa.diagnosis}`);
                throw new Error(sa.diagnosis);
              }
              // Store error context for the retry request
              lastErrorContext = {
                http_status: res.status,
                message: data.message || "Import failed",
              };
              throw new Error(
                `sentinel:${sa.error_type}:${sa.wait_seconds}:${data.message || "Import failed"}`
              );
            }
            throw new Error(data.message || "Import failed");
          }

          importRetries = 0;
          lastErrorContext = null;
          offset = data.offset;
          queriesTotal += data.queries || 0;
          done = data.done;
          if (data.done && data.verification) {
            setImportVerification(data.verification);
          }

          // SENTINEL-VIS-2: Surface mode downshift notice when server reduced import speed.
          if (data.downshift_notice) {
            addLog(`[SENTINEL] ${data.downshift_notice}`);
            toast.warning(data.downshift_notice, { duration: 8000 });
          }

          // MIG-7: When the server paused file reads to digest a large buffered query set,
          // the file offset does not advance and the progress bar would appear frozen.
          // Show a specific log message so users know the import is still working.
          if (data.buffer_paused) {
            addLog(
              "Processing buffered queries... (progress will resume shortly)"
            );
          } else {
            const expectedQueries = passport.total_queries || 0;
            if (expectedQueries > 0) {
              const qPct = Math.min(
                99,
                Math.round((queriesTotal / expectedQueries) * 100)
              );
              addLog(
                `Importing... ${queriesTotal.toLocaleString()} / ${expectedQueries.toLocaleString()} queries (${qPct}%)`
              );
            } else {
              addLog(
                `Importing... ${queriesTotal.toLocaleString()} queries processed.`
              );
            }
          }
          const percent = calculatePercent(offset, importFileSize);
          setProgress(Math.min(99, percent));

          if (!done) await new Promise((r) => setTimeout(r, 50));
        } catch (e: any) {
          if (importRetries < MAX_IMPORT_RETRIES) {
            importRetries++;
            // Sentinel-driven retry: parse error type and wait time from the error message
            // Format: "sentinel:{type}:{wait_seconds}:{original_message}"
            const sentinelMatch = e.message.match(
              /^sentinel:(\w+):(\d+):(.+)$/
            );
            if (sentinelMatch) {
              const [, errorType, waitStr, originalMsg] = sentinelMatch;
              const waitSec = parseInt(waitStr, 10) || 3;
              addLog(
                `[SENTINEL] ${errorType}: ${originalMsg} — Retry ${importRetries}/${MAX_IMPORT_RETRIES} in ${waitSec}s (settings adapted)`
              );
              await new Promise((r) => setTimeout(r, waitSec * 1000));
            } else {
              // Legacy retry path (non-Sentinel errors)
              const delay = 2000 * importRetries;
              lastErrorContext = {
                http_status: 500,
                message: e.message,
              };
              addLog(
                `[RETRY] Import chunk failed (${e.message}). Retrying in ${delay / 1000}s (${importRetries}/${MAX_IMPORT_RETRIES})...`
              );
              await new Promise((r) => setTimeout(r, delay));
            }
            continue;
          }
          throw e;
        }
      }

      if (queriesTotal <= 0) {
        addLog(
          "WARNING: Import finished but 0 queries were executed. Your database was NOT changed. The backup file may be empty or corrupted."
        );
        toast.error(
          "Import completed with 0 changes. The backup file may be empty or corrupted."
        );
        setStep("upload");
        return;
      }

      addLog(
        `Database imported: ${queriesTotal.toLocaleString()} queries executed. Transferring files...`
      );

      // PHASE 3: THEME FILE TRANSFER
      if (passport.theme_files) {
        const themeMeta: ThemeTransferMeta = passport.theme_files;
        addLog("Phase 3: Downloading Theme Files...");
        setPhase("fetching");
        setProgress(0);
        setStatusMsg("Downloading theme files...");

        let themeOffset = 0;
        const themeTotal = themeMeta.filesize;
        let themeDone = false;
        let themeRetries = 0;
        // 4.5 Token rotation for theme chunks
        let currentThemeMeta = { ...themeMeta };

        // Fix 3: helper to call emergency theme restore so the site stays functional
        // if theme transfer fails after DB has already been imported.
        const callEmergencyThemeRestore = async (): Promise<void> => {
          try {
            addLog(
              "Attempting emergency theme restore to keep destination site functional..."
            );
            const recoveryRes = await fetch(
              `${apiUrl}/migration/emergency-theme-restore`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-WP-Nonce": nonce,
                },
                body: JSON.stringify({ confirm: true }),
              }
            );
            const recoveryData = await recoveryRes.json().catch(() => ({}));
            if (recoveryRes.ok && recoveryData.success) {
              addLog(
                `Emergency restore succeeded (${recoveryData.strategy ?? "unknown"}): ${recoveryData.message ?? "theme activated"}`
              );
              toast.warning(
                "Theme transfer failed but the site was recovered automatically. " +
                  (recoveryData.strategy === "snapshot"
                    ? "Your destination theme has been re-activated."
                    : "A fallback WordPress theme has been activated. Please re-install your theme.")
              );
            } else {
              addLog(
                `Emergency restore failed: ${recoveryData.message ?? "unknown error"}. Please activate a theme manually via WP Admin → Appearance → Themes.`
              );
              toast.error(
                "Theme transfer failed and automatic recovery was unsuccessful. " +
                  "Go to WP Admin → Appearance → Themes to activate a theme manually."
              );
            }
          } catch {
            addLog(
              "Emergency restore request failed. Please activate a theme manually via WP Admin → Appearance → Themes."
            );
          }
        };

        while (!themeDone) {
          try {
            const res = await fetch(
              `${apiUrl}/backup/import/fetch-theme-chunk`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-WP-Nonce": nonce,
                },
                body: JSON.stringify({
                  url: currentThemeMeta.download_url,
                  token: currentThemeMeta.token,
                  offset: themeOffset,
                }),
              }
            );

            // 4.5 Token rotation: update theme token if server rotated it
            const nextThemeToken = res.headers?.get?.("X-SwissWP-Next-Token");
            if (nextThemeToken) {
              currentThemeMeta = { ...currentThemeMeta, token: nextThemeToken };
            }

            const data = await safeParseJSON(res);
            if (!res.ok)
              throw new Error(data.message || "Theme download failed");

            const result = data.result || data;
            themeOffset = result.total_size;
            themeDone = result.done;
            themeRetries = 0;

            const themePercent = calculatePercent(themeOffset, themeTotal);
            setProgress(Math.min(99, themePercent));
            setStatusMsg(
              `Downloading theme: ${Math.round(themeOffset / 1024)}KB / ${Math.round(themeTotal / 1024)}KB`
            );
            addLog(
              `Theme: ${Math.round(themeOffset / 1024)}KB / ${Math.round(themeTotal / 1024)}KB`
            );

            if (!themeDone) await new Promise((r) => setTimeout(r, 500));
          } catch (e: any) {
            themeRetries++;
            if (themeRetries >= 5) {
              // Fix 2: attempt emergency restore before throwing so the site stays functional.
              await callEmergencyThemeRestore();
              throw new Error(
                "Theme download failed after 5 retries: " + e.message
              );
            }
            // Wait 5 s between theme-chunk retries. This is deliberately longer than
            // the 2 s used for DB import retries: if the "No route found" error occurs
            // because WP-Cron hasn't yet flushed rewrite rules after the DB import,
            // a 5 s delay gives WP-Cron's deferred flush event a chance to fire first.
            addLog(`Theme download retry ${themeRetries}/5...`);
            await new Promise((r) => setTimeout(r, 5000));
          }
        }

        // Extract theme to wp-content/themes/
        addLog("Extracting theme to wp-content/themes/...");
        setStatusMsg("Extracting theme files...");
        setProgress(0);

        const extractRes = await fetch(
          `${apiUrl}/backup/import/extract-theme`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-WP-Nonce": nonce,
            },
            body: JSON.stringify({ theme_meta: themeMeta }),
          }
        );
        const extractData = await safeParseJSON(extractRes);
        if (!extractRes.ok || extractData.success === false) {
          throw new Error(extractData.message || "Theme extraction failed");
        }

        addLog(`Theme "${themeMeta.active_theme}" installed successfully.`);
        setProgress(100);
      }

      // PHASE 4: PLUGIN FILE TRANSFER
      if (passport.plugin_files) {
        const pluginMeta: PluginTransferMeta = passport.plugin_files;
        addLog("Phase 4: Downloading Plugin Files...");
        setPhase("fetching");
        setProgress(0);
        setStatusMsg("Downloading plugin files...");

        let pluginOffset = 0;
        const pluginTotal = pluginMeta.filesize;
        let pluginDone = false;
        let pluginRetries = 0;
        // 4.5 Token rotation for plugin chunks
        let currentPluginMeta = { ...pluginMeta };

        while (!pluginDone) {
          try {
            const res = await fetch(
              `${apiUrl}/backup/import/fetch-plugins-chunk`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-WP-Nonce": nonce,
                },
                body: JSON.stringify({
                  url: currentPluginMeta.download_url,
                  token: currentPluginMeta.token,
                  offset: pluginOffset,
                }),
              }
            );

            // 4.5 Token rotation: update plugin token if server rotated it
            const nextPluginToken = res.headers?.get?.("X-SwissWP-Next-Token");
            if (nextPluginToken) {
              currentPluginMeta = {
                ...currentPluginMeta,
                token: nextPluginToken,
              };
            }

            const data = await safeParseJSON(res);
            if (!res.ok)
              throw new Error(data.message || "Plugin download failed");

            const result = data.result || data;
            pluginOffset = result.total_size;
            pluginDone = result.done;
            pluginRetries = 0;

            const pluginPercent = calculatePercent(pluginOffset, pluginTotal);
            setProgress(Math.min(99, pluginPercent));
            setStatusMsg(
              `Downloading plugins: ${Math.round(pluginOffset / 1024)}KB / ${Math.round(pluginTotal / 1024)}KB`
            );
            addLog(
              `Plugins: ${Math.round(pluginOffset / 1024)}KB / ${Math.round(pluginTotal / 1024)}KB`
            );

            if (!pluginDone) await new Promise((r) => setTimeout(r, 500));
          } catch (e: any) {
            pluginRetries++;
            if (pluginRetries >= 5)
              throw new Error(
                "Plugin download failed after 5 retries: " + e.message
              );
            addLog(`Plugin download retry ${pluginRetries}/5...`);
            await new Promise((r) => setTimeout(r, 2000));
          }
        }

        // Extract plugins to wp-content/plugins/
        addLog("Extracting plugin files to wp-content/plugins/...");
        setStatusMsg("Extracting plugin files...");
        setProgress(0);

        const extractPluginsRes = await fetch(
          `${apiUrl}/backup/import/extract-plugins`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-WP-Nonce": nonce,
            },
            body: JSON.stringify({ plugin_meta: pluginMeta }),
          }
        );
        const extractPluginsData = await safeParseJSON(extractPluginsRes);
        if (!extractPluginsRes.ok || extractPluginsData.success === false) {
          throw new Error(
            extractPluginsData.message || "Plugin extraction failed"
          );
        }

        addLog(
          `Plugins transferred: ${pluginMeta.file_count.toLocaleString()} files.`
        );
        setProgress(100);
      }

      // PHASE 5: MEDIA FILE TRANSFER (v2.9.7.71, Sentinel integration v2.9.8.2)
      if (passport.media_files) {
        const mediaMeta: MediaTransferMeta = passport.media_files;
        addLog("Phase 5: Downloading Media Files...");
        setPhase("fetching");
        setProgress(0);
        setStatusMsg("Downloading media files...");

        let mediaOffset = 0;
        const mediaTotal = mediaMeta.filesize;
        let mediaDone = false;
        let mediaRetries = 0;
        const MEDIA_MAX_RETRIES = 5;
        // Signal fetch-media-chunk to halve tuned_chunk_size_kb after a failure.
        let mediaDownshiftRequested = false;
        // Track consecutive 429 responses. After 10, send force=true to bypass
        // the load check — prevents permanent blocking on shared hosting.
        let mediaConsecutive429s = 0;
        // 4.5 Token rotation for media chunks
        let currentMediaMeta = { ...mediaMeta };

        while (!mediaDone) {
          try {
            const mediaForceBypass = mediaConsecutive429s >= 10;
            const res = await fetch(
              `${apiUrl}/backup/import/fetch-media-chunk`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-WP-Nonce": nonce,
                },
                body: JSON.stringify({
                  url: currentMediaMeta.download_url,
                  token: currentMediaMeta.token,
                  offset: mediaOffset,
                  downshift: mediaDownshiftRequested ? true : undefined,
                  force: mediaForceBypass ? true : undefined,
                }),
              }
            );

            // Handle HTTP 429 backpressure — server under high load.
            // Does NOT count as a retry; wait and continue.
            if (res.status === 429) {
              mediaConsecutive429s++;
              const body = await res.json().catch(() => ({}));
              const retryAfter = body.retry_after || 5;
              addLog(
                `[LOAD] Media: server busy (load ${body.load_avg || "?"}). Waiting ${retryAfter}s... (${mediaConsecutive429s}/10)`
              );
              await new Promise((r) => setTimeout(r, retryAfter * 1000));
              continue;
            }
            // Reset 429 counter on any non-429 response
            mediaConsecutive429s = 0;

            if (res.ok) {
              // 4.5 Token rotation: update media token if server rotated it
              const nextMediaToken = res.headers?.get?.("X-SwissWP-Next-Token");
              if (nextMediaToken) {
                currentMediaMeta = {
                  ...currentMediaMeta,
                  token: nextMediaToken,
                };
              }

              const data = await safeParseJSON(res);
              const result = data.result || data;
              mediaOffset = result.total_size;
              mediaDone = result.done;
              mediaRetries = 0;
              mediaDownshiftRequested = false;

              const mediaPercent = calculatePercent(mediaOffset, mediaTotal);
              setProgress(Math.min(99, mediaPercent));
              const offsetMB = (mediaOffset / (1024 * 1024)).toFixed(1);
              const totalMB = (mediaTotal / (1024 * 1024)).toFixed(1);
              setStatusMsg(`Downloading media: ${offsetMB}MB / ${totalMB}MB`);
              addLog(`Media: ${offsetMB}MB / ${totalMB}MB`);

              if (!mediaDone) await new Promise((r) => setTimeout(r, 500));
              continue;
            }

            // Parse error response — may contain Sentinel analysis
            const errData = await res.json().catch(() => ({}));
            const sentinelAnalysis = errData.sentinel_analysis;

            // Sentinel-driven retry: use the server's error classification
            if (sentinelAnalysis) {
              if (!sentinelAnalysis.should_retry) {
                // Fatal error — Sentinel says stop retrying
                addLog(
                  `[SENTINEL] ${sentinelAnalysis.error_type.toUpperCase()}: ${sentinelAnalysis.diagnosis}`
                );
                throw new Error(sentinelAnalysis.diagnosis);
              }

              if (mediaRetries < MEDIA_MAX_RETRIES) {
                mediaRetries++;
                const waitSec = sentinelAnalysis.wait_seconds || 3;
                const adaptInfo = sentinelAnalysis.adapted_chunk_kb
                  ? ` Chunk: ${sentinelAnalysis.adapted_chunk_kb}KB`
                  : "";
                const modeInfo = sentinelAnalysis.adapted_mode
                  ? ` Mode: ${sentinelAnalysis.adapted_mode}`
                  : "";
                addLog(
                  `[SENTINEL] Media ${sentinelAnalysis.error_type}: ${sentinelAnalysis.diagnosis}${adaptInfo}${modeInfo} — Retry ${mediaRetries}/${MEDIA_MAX_RETRIES} in ${waitSec}s`
                );
                await new Promise((r) => setTimeout(r, waitSec * 1000));
                continue;
              }
            }

            // Fallback for non-Sentinel errors or exhausted retries
            throw new Error(
              errData.message || `Media download failed (HTTP ${res.status})`
            );
          } catch (e: any) {
            if (
              mediaRetries < MEDIA_MAX_RETRIES &&
              !e.message.includes("after 5 retries")
            ) {
              mediaRetries++;
              // Signal PHP to halve tuned_chunk_size_kb on the next call.
              mediaDownshiftRequested = true;
              const delay = 5000 * Math.pow(1.5, mediaRetries - 1);
              addLog(
                `Media download error (${e.message}). Sentinel will adapt settings. Retrying in ${Math.round(delay / 1000)}s (${mediaRetries}/${MEDIA_MAX_RETRIES})...`
              );
              await new Promise((r) => setTimeout(r, delay));
              continue;
            } else {
              throw new Error(
                `Media download failed after ${MEDIA_MAX_RETRIES} retries: ${e.message}`
              );
            }
          }
        }

        // Extract media to wp-content/uploads/
        addLog("Extracting media files to wp-content/uploads/...");
        setStatusMsg("Extracting media files...");
        setProgress(0);

        const extractMediaRes = await fetch(
          `${apiUrl}/backup/import/extract-media`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-WP-Nonce": nonce,
            },
            body: JSON.stringify({ media_meta: mediaMeta }),
          }
        );
        const extractMediaData = await safeParseJSON(extractMediaRes);
        if (!extractMediaRes.ok || extractMediaData.success === false) {
          throw new Error(
            extractMediaData.message || "Media extraction failed"
          );
        }

        addLog(
          `Media library transferred: ${mediaMeta.file_count.toLocaleString()} files.`
        );
        setProgress(100);
      }

      addLog(
        "Migration Successfully Completed! All files and database transferred."
      );
      setStep("complete");

      // F0c: Fetch post-migration verification data so the user can confirm the
      // site looks correct before diving into the finalization checklist.
      // Fire-and-forget — failures are silently ignored (non-blocking).
      if (!isMock) {
        setPostMigrationCheck({
          loading: true,
          siteurl: null,
          active_theme: null,
          active_plugin_count: null,
          license_active: null,
        });
        (async () => {
          try {
            const [settingsRes, licenseRes] = await Promise.allSettled([
              fetch(`${apiUrl}/migration/post-check`, {
                headers: { "X-WP-Nonce": nonce },
              }),
              // Re-use the existing license check endpoint
              fetch(`${apiUrl}/license/status`, {
                headers: { "X-WP-Nonce": nonce },
              }),
            ]);

            let siteurl: string | null = null;
            let activeTheme: string | null = null;
            let activePluginCount: number | null = null;

            if (settingsRes.status === "fulfilled" && settingsRes.value.ok) {
              const d = await settingsRes.value.json().catch(() => null);
              if (d) {
                siteurl = d.siteurl ?? d.url ?? null;
                activeTheme = d.active_theme ?? null;
                activePluginCount =
                  typeof d.active_plugin_count === "number"
                    ? d.active_plugin_count
                    : null;
              }
            }

            let licenseActive: boolean | null = null;
            if (licenseRes.status === "fulfilled" && licenseRes.value.ok) {
              const ld = await licenseRes.value.json().catch(() => null);
              if (ld) {
                licenseActive = ld.active === true || ld.status === "active";
              }
            }

            setPostMigrationCheck({
              loading: false,
              siteurl,
              active_theme: activeTheme,
              active_plugin_count: activePluginCount,
              license_active: licenseActive,
            });
          } catch {
            // Non-fatal — verification is informational only
            setPostMigrationCheck((prev) => ({ ...prev, loading: false }));
          }
        })();
      }

      setTimeout(() => {
        setShowChecklistModal(true);
      }, 500);
    } catch (e: any) {
      console.error(e);
      if (!showGuidedFix) {
        addLog("CRITICAL ERROR: " + e.message);
        toast.error("Migration Failed: " + e.message);
        setStep("upload");
      }
    }
  };

  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-6">
      {/* Which site are you on? */}
      <div className="space-y-2">
        <p className="dark:text-foreground text-sm font-medium text-gray-900">
          Which site are you using right now?
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button
            onClick={() => setMode("export")}
            className={`flex-1 rounded-xl border-2 p-4 text-left transition-all duration-200 focus:ring-2 focus:ring-blue-500/50 focus:outline-none ${
              mode === "export"
                ? "border-blue-500 bg-blue-50/30 dark:bg-blue-950/20"
                : "border-border hover:border-blue-200 dark:hover:border-blue-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-blue-500" />
              <span className="dark:text-foreground text-sm font-semibold text-gray-900">
                {"I'm on the OLD site"}
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              I want to pack everything up and send it to the new server
            </p>
          </button>
          <button
            onClick={() => setMode("import")}
            className={`flex-1 rounded-xl border-2 p-4 text-left transition-all duration-200 focus:ring-2 focus:ring-blue-500/50 focus:outline-none ${
              mode === "import"
                ? "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20"
                : "border-border hover:border-emerald-200 dark:hover:border-emerald-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-emerald-500" />
              <span className="dark:text-foreground text-sm font-semibold text-gray-900">
                {"I'm on the NEW site"}
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              I already have the migration file from the old site and I want to
              bring everything in
            </p>
          </button>
        </div>
      </div>

      {/* Advanced Settings — collapsed by default (Server Profile + Reset) */}
      <details
        open={showAdvanced}
        onToggle={(e) => setShowAdvanced((e.target as HTMLDetailsElement).open)}
        className="border-border rounded-xl border"
      >
        <summary className="text-muted-foreground dark:hover:text-foreground flex cursor-pointer items-center gap-2 px-5 py-3 text-sm font-medium select-none hover:text-gray-900">
          <Server className="h-4 w-4" />
          Advanced Settings
          <span className="text-xs font-normal">
            — Server profile, environment reset, and diagnostic tools
          </span>
        </summary>
        <div className="border-border space-y-4 border-t px-5 pt-4 pb-5">
          {/* Server Profile */}
          <div>
            <p className="dark:text-foreground mb-2 text-sm font-medium text-gray-900">
              Server Profile
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => handleServerProfileChange("auto")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleServerProfileChange("auto");
                  }
                }}
                aria-pressed={
                  settings?.serverProfile === "auto" || !settings?.serverProfile
                }
                className={`relative rounded-xl border-2 p-4 text-left transition-all duration-200 focus:ring-2 focus:ring-blue-500/50 focus:outline-none ${
                  settings?.serverProfile === "auto" || !settings?.serverProfile
                    ? "border-blue-500 bg-blue-50/30 dark:bg-blue-950/20"
                    : "border-border bg-transparent hover:border-blue-200 dark:hover:border-blue-800"
                }`}
              >
                {(settings?.serverProfile === "auto" ||
                  !settings?.serverProfile) && (
                  <CheckCircle className="absolute top-3 right-3 h-4 w-4 text-blue-500" />
                )}
                <div className="pr-6 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Automatic{" "}
                  <span className="text-xs font-normal text-blue-600 dark:text-blue-400">
                    (Recommended)
                  </span>
                </div>
                <div className="text-muted-foreground mt-1 text-xs">
                  Let the plugin figure out the best settings for your server.
                  Works for 95% of sites.
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleServerProfileChange("standard")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleServerProfileChange("standard");
                  }
                }}
                aria-pressed={settings?.serverProfile === "standard"}
                className={`relative rounded-xl border-2 p-4 text-left transition-all duration-200 focus:ring-2 focus:ring-blue-500/50 focus:outline-none ${
                  settings?.serverProfile === "standard"
                    ? "border-blue-500 bg-blue-50/30 dark:bg-blue-950/20"
                    : "border-border bg-transparent hover:border-blue-200 dark:hover:border-blue-800"
                }`}
              >
                {settings?.serverProfile === "standard" && (
                  <CheckCircle className="absolute top-3 right-3 h-4 w-4 text-blue-500" />
                )}
                <div className="pr-6 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Shared Hosting
                </div>
                <div className="text-muted-foreground mt-1 text-xs">
                  For Hostinger, Bluehost, SiteGround, or similar. Choose only
                  if Automatic isn't working.
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleServerProfileChange("vps")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleServerProfileChange("vps");
                  }
                }}
                aria-pressed={settings?.serverProfile === "vps"}
                className={`relative rounded-xl border-2 p-4 text-left transition-all duration-200 focus:ring-2 focus:ring-blue-500/50 focus:outline-none ${
                  settings?.serverProfile === "vps"
                    ? "border-blue-500 bg-blue-50/30 dark:bg-blue-950/20"
                    : "border-border bg-transparent hover:border-blue-200 dark:hover:border-blue-800"
                }`}
              >
                {settings?.serverProfile === "vps" && (
                  <CheckCircle className="absolute top-3 right-3 h-4 w-4 text-blue-500" />
                )}
                <div className="pr-6 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  VPS or Dedicated Server
                </div>
                <div className="text-muted-foreground mt-1 text-xs">
                  For sites on a private server. Faster, but requires specific
                  server permissions.
                </div>
              </button>
            </div>
            {savingProfile && (
              <p className="mt-2 flex items-center gap-1 text-xs text-blue-500">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving…
              </p>
            )}
          </div>

          {/* Stuck? Clear migration data */}
          <div className="flex items-center justify-between rounded-xl border border-red-200/50 bg-red-50/10 p-4 dark:border-red-800/30 dark:bg-red-950/10">
            <div>
              <p className="text-sm font-medium text-red-900 dark:text-red-300">
                {"Stuck? Clear migration data"}
              </p>
              <p className="mt-0.5 text-xs text-red-700 dark:text-red-400">
                {step === "migrate"
                  ? "An import is actively running. Only use this if the process is completely stuck with no activity."
                  : "If a migration started but never finished, this clears the leftover files so you can start fresh. Do not use this while a migration is actively running."}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                const isMigrating = step === "migrate";
                const doReset = async () => {
                  try {
                    const res = await fetch(`${apiUrl}/maintenance`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "X-WP-Nonce": nonce,
                      },
                      body: JSON.stringify({ action: "reset_migration" }),
                    });
                    const data = await res.json();
                    toast.success(data.message || "Migration data cleared.");
                  } catch {
                    toast.error("Reset failed. Check System Logs.");
                  }
                };
                toast.warning(
                  isMigrating
                    ? "WARNING: An import is actively running. Resetting will leave your database in a partially migrated state. Only proceed if the import is completely stuck."
                    : "This will clear all migration temp files and locks so you can start fresh.",
                  {
                    duration: isMigrating ? 30000 : 15000,
                    action: {
                      label: isMigrating
                        ? "Destroy Import"
                        : "Yes, clear & start over",
                      onClick: doReset,
                    },
                  }
                );
              }}
              className="shrink-0 border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              Clear &amp; Start Over
            </Button>
          </div>
        </div>
      </details>

      {mode === "export" && (
        <div className="space-y-4">
          {/* ── 4.2 Mode Selection Cards ──────────────────────────────────────── */}
          <div className="space-y-2">
            <p className="dark:text-foreground text-sm font-medium text-gray-900">
              Where does your new site stand?
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              {/* Card 1 — Mode A: Plugin already on new site */}
              <button
                type="button"
                onClick={() => setMigrationMode("direct")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setMigrationMode("direct");
                  }
                }}
                aria-pressed={migrationMode === "direct"}
                className={`flex-1 rounded-xl border-2 p-4 text-left transition-all duration-200 focus:ring-2 focus:ring-blue-500/50 focus:outline-none ${
                  migrationMode === "direct"
                    ? "border-blue-500 bg-blue-50/30 dark:bg-blue-950/20"
                    : "border-border hover:border-blue-200 dark:hover:border-blue-800"
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  {migrationMode === "direct" && (
                    <CheckCircle className="h-4 w-4 flex-shrink-0 text-blue-500" />
                  )}
                  {migrationMode !== "direct" && (
                    <Database className="h-4 w-4 flex-shrink-0 text-blue-400" />
                  )}
                  <span className="dark:text-foreground text-sm font-semibold text-gray-900">
                    Plugin installed on new site
                  </span>
                  <span className="ml-auto rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    Recommended
                  </span>
                </div>
                <p className="text-muted-foreground text-xs">
                  SwissSuite AI is active on both sites. Fastest option — direct
                  plugin-to-plugin transfer.
                </p>
              </button>

              {/* Card 2 — Mode B: New / empty site (receiver script) */}
              <button
                type="button"
                onClick={() => setMigrationMode("receiver")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setMigrationMode("receiver");
                  }
                }}
                aria-pressed={migrationMode === "receiver"}
                className={`flex-1 rounded-xl border-2 p-4 text-left transition-all duration-200 focus:ring-2 focus:ring-purple-500/50 focus:outline-none ${
                  migrationMode === "receiver"
                    ? "border-purple-500 bg-purple-50/30 dark:bg-purple-950/20"
                    : "border-border hover:border-purple-200 dark:hover:border-purple-800"
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  {migrationMode === "receiver" && (
                    <CheckCircle className="h-4 w-4 flex-shrink-0 text-purple-500" />
                  )}
                  {migrationMode !== "receiver" && (
                    <FileCode2 className="h-4 w-4 flex-shrink-0 text-purple-400" />
                  )}
                  <span className="dark:text-foreground text-sm font-semibold text-gray-900">
                    New or empty site
                  </span>
                </div>
                <p className="text-muted-foreground text-xs">
                  We&apos;ll create a small helper file you upload to the new
                  server. Works even if the destination has nothing installed.
                </p>
              </button>
            </div>
          </div>

          {/* ── 4.3 Mode B Export Flow ──────────────────────────────────────────── */}
          {migrationMode === "receiver" && (
            <Card>
              <div className="border-border border-b p-6">
                <h3 className="flex items-center gap-2 text-2xl leading-none font-semibold tracking-tight">
                  <FileCode2 className="h-5 w-5 text-purple-500" />
                  Receiver Script Transfer
                </h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  Generate a self-contained PHP script to upload to your new
                  server. No plugin required on the destination.
                </p>
              </div>

              <div className="space-y-6 p-6">
                {/* Step 1: Configure export */}
                {modeBState.phase === "idle" && (
                  <div className="space-y-5">
                    <div>
                      <p className="dark:text-foreground mb-3 text-sm font-semibold text-gray-900">
                        Step 1: Choose what to include
                      </p>
                      <div className="space-y-3">
                        <label className="flex cursor-pointer items-start gap-2 text-sm select-none">
                          <input
                            type="checkbox"
                            checked={modeBState.export_includes.sql}
                            onChange={(e) =>
                              setModeBState((prev) => ({
                                ...prev,
                                export_includes: {
                                  ...prev.export_includes,
                                  sql: e.target.checked,
                                },
                              }))
                            }
                            className="border-border mt-0.5 h-4 w-4 rounded accent-purple-600"
                            aria-label="Include database"
                          />
                          <div>
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              Database
                            </span>
                            <span className="text-muted-foreground mt-0.5 block text-xs">
                              All posts, pages, settings, and user accounts.
                              Required for a complete migration.
                            </span>
                          </div>
                        </label>

                        <label className="flex cursor-pointer items-start gap-2 text-sm select-none">
                          <input
                            type="checkbox"
                            checked={modeBState.export_includes.theme}
                            onChange={(e) =>
                              setModeBState((prev) => ({
                                ...prev,
                                export_includes: {
                                  ...prev.export_includes,
                                  theme: e.target.checked,
                                },
                              }))
                            }
                            className="border-border mt-0.5 h-4 w-4 rounded accent-purple-600"
                            aria-label="Include theme files"
                          />
                          <div>
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              Theme files
                            </span>
                            <span className="text-muted-foreground mt-0.5 block text-xs">
                              Your active theme&apos;s PHP, CSS, and asset
                              files.
                            </span>
                          </div>
                        </label>

                        <label className="flex cursor-pointer items-start gap-2 text-sm select-none">
                          <input
                            type="checkbox"
                            checked={modeBState.export_includes.media}
                            onChange={(e) =>
                              setModeBState((prev) => ({
                                ...prev,
                                export_includes: {
                                  ...prev.export_includes,
                                  media: e.target.checked,
                                },
                              }))
                            }
                            className="border-border mt-0.5 h-4 w-4 rounded accent-purple-600"
                            aria-label="Include media files"
                          />
                          <div>
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              Media files
                            </span>
                            <span className="text-muted-foreground mt-0.5 block text-xs">
                              Images, videos, and documents from
                              wp-content/uploads/. Max 2GB.
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Step 2: Generate button */}
                    <div>
                      <p className="dark:text-foreground mb-3 text-sm font-semibold text-gray-900">
                        Step 2: Generate receiver script
                      </p>
                      <Button
                        onClick={handleGenerateReceiver}
                        variant="primary"
                        className="h-14 w-full text-base"
                      >
                        <FileCode2 className="mr-2 h-5 w-5" />
                        Generate Receiver Script
                      </Button>
                    </div>
                  </div>
                )}

                {/* Generating state */}
                {modeBState.phase === "generating" && (
                  <div className="flex flex-col items-center justify-center gap-4 py-10">
                    <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
                    <p className="dark:text-foreground text-sm font-medium text-gray-900">
                      Preparing your migration package&hellip;
                    </p>
                    <p className="text-muted-foreground max-w-xs text-center text-xs">
                      Building the database export, embedding security keys, and
                      packaging the receiver script. This takes 1–3 minutes.
                    </p>
                  </div>
                )}

                {/* Step 3: Ready — download + instructions */}
                {(modeBState.phase === "ready" ||
                  modeBState.phase === "expired") &&
                  modeBResult && (
                    <div className="animate-in fade-in zoom-in space-y-5 duration-300">
                      {/* Expiry timer */}
                      <div
                        className={`flex items-center gap-3 rounded-lg border p-3 text-sm font-medium ${
                          modeBState.phase === "expired"
                            ? "border-red-300 bg-red-50/50 text-red-700 dark:border-red-700 dark:bg-red-950/30 dark:text-red-300"
                            : "border-amber-300 bg-amber-50/50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                        }`}
                        aria-live="polite"
                        aria-atomic="true"
                      >
                        <Clock className="h-4 w-4 flex-shrink-0" />
                        {modeBState.phase === "expired" ? (
                          <span className="font-bold">
                            Link expired — generate a new receiver script.
                          </span>
                        ) : (
                          <span>{modeBCountdown}</span>
                        )}
                      </div>

                      {/* Download card */}
                      {modeBState.phase !== "expired" && (
                        <div className="space-y-4 rounded-xl border-2 border-purple-200 bg-purple-50/20 p-5 dark:border-purple-800 dark:bg-purple-950/10">
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/40">
                              <FileCode2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                              <p className="dark:text-foreground text-sm font-semibold text-gray-900">
                                Receiver script ready
                              </p>
                              <code className="mt-0.5 block rounded bg-purple-100/60 px-2 py-0.5 font-mono text-xs text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                {modeBResult.filename}
                              </code>
                            </div>
                          </div>

                          <Button
                            onClick={handleDownloadReceiver}
                            variant="primary"
                            className="w-full"
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download Receiver Script
                          </Button>
                        </div>
                      )}

                      {/* Security warning */}
                      <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50/50 p-4 dark:border-red-800 dark:bg-red-950/20">
                        <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
                        <p className="text-xs text-red-700 dark:text-red-300">
                          <strong>Never share this file with anyone.</strong> It
                          contains temporary access to your site&apos;s data and
                          expires in 2 hours. Delete it from your computer once
                          the migration is complete.
                        </p>
                      </div>

                      {/* Instructions panel */}
                      {modeBState.phase !== "expired" && (
                        <div className="space-y-3">
                          <p className="dark:text-foreground flex items-center gap-2 text-sm font-semibold text-gray-900">
                            <Shield className="h-4 w-4 text-purple-500" />
                            How to use the receiver script
                          </p>
                          <ol className="space-y-2.5">
                            {[
                              "Download the receiver file above.",
                              "Log into your new hosting control panel (cPanel, hPanel, Plesk, or similar).",
                              "Open File Manager and navigate to your website's root directory.",
                              "Upload the downloaded file to the root directory.",
                              `Open https://your-new-domain.com/${modeBResult.filename} in your browser.`,
                              'Enter your database credentials and click "Begin Import".',
                              "The file will automatically delete itself once the import completes.",
                            ].map((step, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300"
                              >
                                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                                  {i + 1}
                                </span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {/* Regenerate button */}
                      <Button
                        variant="outline"
                        onClick={() => {
                          setModeBState({
                            phase: "idle",
                            receiver_filename: null,
                            expires_at: null,
                            passport_generated: false,
                            export_includes: {
                              sql: true,
                              theme: true,
                              media: true,
                              plugins: true,
                            },
                          });
                          setModeBResult(null);
                          setModeBCountdown("");
                        }}
                        className="w-full"
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Generate New Receiver Script
                      </Button>
                    </div>
                  )}
              </div>
            </Card>
          )}

          {/* ── Mode A: existing export flow (unchanged) ──────────────────────── */}
          {migrationMode === "direct" && (
            <Card>
              <div className="border-border border-b p-6">
                <h3 className="flex items-center gap-2 text-2xl leading-none font-semibold tracking-tight">
                  <Database className="h-5 w-5 text-blue-500" />
                  Pack Up This Site
                </h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  Create a Migration File to transfer this site to a new server.
                </p>
              </div>

              <div className="space-y-6 p-6">
                <div className="rounded-lg border border-blue-100 bg-blue-50/20 p-4">
                  <h4 className="mb-2 font-semibold text-blue-800 dark:text-blue-300">
                    How to Move Your Site
                  </h4>
                  <ul className="list-disc space-y-2 pl-5 text-sm text-blue-700 dark:text-blue-400">
                    <li>
                      <strong>Step 1:</strong> Click below to create a Migration
                      File from this site (takes 2–10 minutes depending on your
                      site size).
                    </li>
                    <li>
                      <strong>Step 2:</strong> Download the Migration File to
                      your computer.
                    </li>
                    <li>
                      <strong>Step 3:</strong> Log in to your{" "}
                      <strong>new site's</strong> WordPress admin. Open
                      SwissSuite AI, go to <strong>Move to New Host</strong>,
                      and select <strong>{'"I\'m on the NEW site"'}</strong>.
                    </li>
                    <li>
                      <strong>Step 4:</strong> Upload the Migration File you
                      downloaded in Step 2.
                    </li>
                  </ul>
                </div>

                {!generatedPassport ? (
                  <div className="space-y-4">
                    <label className="flex cursor-pointer items-start gap-2 text-sm select-none">
                      <input
                        type="checkbox"
                        checked={includeTheme}
                        onChange={(e) => setIncludeTheme(e.target.checked)}
                        className="border-border mt-0.5 h-4 w-4 rounded accent-blue-600"
                        aria-label="Also transfer my site's design (theme files)"
                      />
                      <div>
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {"Also transfer my site's design (theme files)"}
                        </span>
                        <span className="text-muted-foreground mt-0.5 block text-xs">
                          Check this if your new host doesn't already have your
                          theme installed. Adds time to the process.
                        </span>
                      </div>
                    </label>

                    {/* v2.9.7.71: Include media files toggle — export side */}
                    <label className="flex cursor-pointer items-start gap-2 text-sm select-none">
                      <input
                        type="checkbox"
                        checked={includeMedia}
                        onChange={(e) => setIncludeMedia(e.target.checked)}
                        className="border-border mt-0.5 h-4 w-4 rounded accent-blue-600"
                        aria-label="Include media files (images, documents, videos)"
                      />
                      <div>
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          Include media files (images, documents, videos)
                        </span>
                        <span className="text-muted-foreground mt-0.5 block text-xs">
                          Transfers your wp-content/uploads/ directory.
                          Recommended unless the media already exists on the
                          destination. Max 2GB.
                        </span>
                      </div>
                    </label>

                    {/* v2.9.7.48: Include user accounts toggle — export side */}
                    <label className="flex cursor-pointer items-start gap-2 text-sm select-none">
                      <input
                        type="checkbox"
                        checked={includeUsersInExport}
                        onChange={(e) => {
                          const include = e.target.checked;
                          setIncludeUsersInExport(include);
                        }}
                        className="border-border mt-0.5 h-4 w-4 rounded accent-blue-600"
                        aria-label="Include user accounts in migration export"
                      />
                      <div>
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          Include user accounts
                        </span>
                        <span className="text-muted-foreground mt-0.5 block text-xs">
                          Include{" "}
                          <code className="bg-background rounded px-1 text-xs">
                            wp_users
                          </code>{" "}
                          and{" "}
                          <code className="bg-background rounded px-1 text-xs">
                            wp_usermeta
                          </code>{" "}
                          tables in the export. Off by default — user accounts
                          are excluded and destination site users are preserved.
                        </span>
                      </div>
                    </label>

                    {includeUsersInExport && (
                      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          User accounts will be included in the migration file.
                          Destination accounts with matching IDs may be
                          overwritten. 2FA secrets are site-specific and must be
                          reconfigured after migration.
                        </p>
                      </div>
                    )}

                    <Button
                      onClick={handleGeneratePassport}
                      disabled={isGenerating}
                      className="h-16 w-full text-lg"
                      variant="primary"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-6 w-6 animate-spin" />{" "}
                          {exportProgress || "Exporting..."}
                        </>
                      ) : (
                        <>
                          <FileJson className="mr-2 h-6 w-6" /> Create Migration
                          File
                        </>
                      )}
                    </Button>
                    {isGenerating && exportProgress && (
                      <div className="text-muted-foreground bg-secondary animate-pulse rounded-lg p-2 text-center text-xs">
                        {exportProgress} — Please do not close this tab.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="animate-in fade-in zoom-in space-y-4 duration-300">
                    <div className="rounded-xl border-2 border-green-500/20 bg-green-50/10 p-6 text-center">
                      <CheckCircle className="mx-auto mb-3 h-12 w-12 text-green-500" />
                      <h3 className="text-xl font-bold text-green-700 dark:text-green-400">
                        Migration File Ready!
                      </h3>
                      <p className="mt-2 mb-6 text-neutral-700 dark:text-neutral-300">
                        Download this file and upload it on your new site to
                        complete the move.
                      </p>

                      <div className="mx-auto max-w-sm space-y-3">
                        <button
                          onClick={() => {
                            // Blob download bypasses the .htaccess Deny-from-all guard
                            // on swisswpsuite-exports-temp/ (BUG-4, v2.9.6.28).
                            const src =
                              generatedPassport.content ??
                              generatedPassport.url;
                            if (generatedPassport.content) {
                              const blob = new Blob(
                                [generatedPassport.content],
                                {
                                  type: "application/json",
                                }
                              );
                              const blobUrl = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = blobUrl;
                              a.download =
                                generatedPassport.filename || "passport.json";
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(blobUrl);
                            } else {
                              // Fallback for legacy responses without inline content
                              window.open(src, "_blank");
                            }
                          }}
                          className="bg-swiss-navy text-foreground shadow-premium border-border/10 inline-flex w-full items-center justify-center rounded-full border px-8 py-4 text-xs font-extrabold tracking-[0.15em] uppercase transition-all duration-500 hover:shadow-[0_15px_30px_rgba(13,20,26,0.3)] active:scale-95"
                        >
                          <Download className="mr-2 h-5 w-5" /> Download
                          Migration File
                        </button>
                        {exportSqlUrl && (
                          <a
                            href={exportSqlUrl}
                            download
                            className="inline-flex w-full items-center justify-center rounded-full border border-blue-500/20 bg-blue-600 px-8 py-4 text-xs font-extrabold tracking-[0.15em] text-white uppercase transition-all duration-500 hover:bg-blue-700 active:scale-95"
                          >
                            <Download className="mr-2 h-5 w-5" /> Download SQL
                            Backup
                          </a>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => {
                        setGeneratedPassport(null);
                        setExportSqlUrl(null);
                      }}
                      className="w-full"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" /> Generate New
                      Passport
                    </Button>
                  </div>
                )}
                {statusMsg && !isGenerating && (
                  <div className="text-center text-sm text-neutral-700 dark:text-neutral-400">
                    {statusMsg}
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {mode === "import" && (
        <div className="space-y-6">
          {/* Stepper */}
          <div className="mb-8 flex justify-between">
            {["Upload File", "Validate", "Safety Backup", "Migrate"].map(
              (s, i) => {
                const steps = [
                  "upload",
                  "validate",
                  "backup",
                  "migrate",
                  "complete",
                ];
                const currentIdx = steps.indexOf(step);
                const active = i <= currentIdx;
                return (
                  <div
                    key={s}
                    className={`flex items-center ${active ? "text-blue-600" : "text-neutral-700"}`}
                  >
                    <div
                      className={`mr-2 flex h-8 w-8 items-center justify-center rounded-full border-2 ${active ? "border-blue-600 bg-blue-50/20" : "border-border"}`}
                    >
                      {i + 1}
                    </div>
                    <span className="hidden font-medium sm:inline!">{s}</span>
                  </div>
                );
              }
            )}
          </div>

          {step === "upload" && (
            <Card>
              <div className="border-border border-b p-6">
                <h3 className="text-2xl leading-none font-semibold tracking-tight">
                  Upload Migration File
                </h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  Upload the Migration File (passport.json) you downloaded from
                  the old site.
                </p>
              </div>
              <div className="p-6">
                <div className="border-border dark:border-border hover:bg-background dark:hover:bg-secondary/50 rounded-xl border-2 border-dashed p-12 text-center transition-colors">
                  <Upload className="mx-auto mb-4 h-12 w-12 text-neutral-700" />
                  <p className="mb-2 text-lg font-medium">
                    Drag and drop your Migration File here
                  </p>
                  <p className="mb-6 text-sm text-neutral-700">
                    or click to browse
                  </p>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="passport-upload"
                  />
                  <label
                    htmlFor="passport-upload"
                    className="bg-swiss-navy text-foreground dark:text-foreground shadow-premium border-border/10 inline-flex cursor-pointer items-center justify-center rounded-full border px-6 py-3 text-xs font-extrabold tracking-[0.15em] uppercase transition-all duration-500 hover:shadow-[0_15px_30px_rgba(13,20,26,0.3)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Select File
                  </label>
                </div>
              </div>
            </Card>
          )}

          {step === "validate" && passport && (
            <Card>
              <div className="border-border border-b p-6">
                <h3 className="text-2xl leading-none font-semibold tracking-tight">
                  Validating Connection
                </h3>
              </div>
              <div className="space-y-4 p-6">
                <div className="bg-secondary dark:bg-secondary rounded-lg p-4">
                  <div className="mb-2 flex justify-between">
                    <span className="text-neutral-700">Source URL:</span>
                    <span className="font-mono">
                      {passport.source_url || "Unknown"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-700">Generated:</span>
                    <span>{passport.date || "Unknown"}</span>
                  </div>
                </div>
                <Button
                  onClick={startValidation}
                  variant="primary"
                  className="w-full"
                >
                  Verify Connection & Compatibility
                </Button>
              </div>
            </Card>
          )}

          {step === "backup" && (
            <Card>
              <div className="border-border border-b p-6">
                <h3 className="text-2xl leading-none font-semibold tracking-tight">
                  Safety Backup
                </h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  Review migration details and create a local backup before
                  overwriting data.
                </p>
              </div>
              <div className="space-y-4 p-6">
                {dbIdentity && dbIdentity.source && (
                  <div className="border-border bg-secondary/50 space-y-3 rounded-lg border p-4">
                    <h4 className="flex items-center gap-2 text-sm font-semibold">
                      <Database className="h-4 w-4 text-blue-500" />
                      Database Identity Check
                      {dbIdentity.source.table_prefix ===
                      dbIdentity.destination.table_prefix ? (
                        <span className="ml-auto text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          Prefix Match
                        </span>
                      ) : (
                        <span className="ml-auto text-xs font-medium text-red-600 dark:text-red-400">
                          Prefix Mismatch
                        </span>
                      )}
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <p className="text-muted-foreground font-medium">
                          Source
                        </p>
                        <p>
                          Prefix:{" "}
                          <code className="bg-background rounded px-1">
                            {dbIdentity.source.table_prefix}
                          </code>
                        </p>
                        <p>Tables: {dbIdentity.source.table_count}</p>
                        <p>Pages: {dbIdentity.source.published_pages}</p>
                        <p>Posts: {dbIdentity.source.published_posts}</p>
                        <p>Users: {dbIdentity.source.user_count}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground font-medium">
                          Destination
                        </p>
                        <p>
                          Prefix:{" "}
                          <code className="bg-background rounded px-1">
                            {dbIdentity.destination.table_prefix}
                          </code>
                        </p>
                        <p>Tables: {dbIdentity.destination.table_count}</p>
                        <p>Pages: {dbIdentity.destination.published_pages}</p>
                        <p>Posts: {dbIdentity.destination.published_posts}</p>
                        <p>Users: {dbIdentity.destination.user_count}</p>
                      </div>
                    </div>
                  </div>
                )}

                {dbIdentity?.source?.is_block_theme &&
                  (passport?.theme_files ? (
                    <ThemeManifestCard
                      themeMeta={passport.theme_files as ThemeTransferMeta}
                      showFileList={showFileList}
                      onToggleFileList={() => setShowFileList((v) => !v)}
                    />
                  ) : (
                    <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50/50 p-4 dark:border-amber-700 dark:bg-amber-950/30">
                      <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="h-4 w-4" />
                        Block Theme (FSE) Detected — Files Not Included
                      </div>
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        The source site uses a block theme. Homepage templates
                        and theme parts are stored as PHP files on disk and are
                        NOT included in this migration. After import, copy the
                        theme directory manually or rebuild templates via the
                        Site Editor.
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Source templates: {dbIdentity.source.template_count} |
                        Template parts: {dbIdentity.source.template_part_count}
                      </p>
                    </div>
                  ))}

                {/* v2.9.7.58: Source Speed Probe — shows measured throughput and tuned chunk size */}
                {speedProbe && (
                  <div className="border-border bg-secondary/50 space-y-2 rounded-lg border p-4">
                    <h4 className="flex items-center gap-2 text-sm font-semibold">
                      <svg
                        className="h-4 w-4 text-blue-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                      Source Speed Probe
                      <span
                        className={`ml-auto text-xs font-medium ${
                          speedProbe.mode_cap === "turbo"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : speedProbe.mode_cap === "standard"
                              ? "text-blue-600 dark:text-blue-400"
                              : speedProbe.mode_cap === "safe"
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-muted-foreground"
                        }`}
                      >
                        {speedProbe.mode_cap === "turbo"
                          ? "Fast Source"
                          : speedProbe.mode_cap === "standard"
                            ? "Standard Source"
                            : speedProbe.mode_cap === "safe"
                              ? "Slow Source — Reduced Chunks"
                              : "Probe Unavailable"}
                      </span>
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <p className="text-muted-foreground font-medium">
                          Measured
                        </p>
                        <p>
                          Speed:{" "}
                          <span className="font-semibold">
                            {speedProbe.throughput_kbps > 0
                              ? `${speedProbe.throughput_kbps} KB/s`
                              : "Not measured"}
                          </span>
                        </p>
                        <p>Latency: {speedProbe.probe_ms}ms</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground font-medium">
                          Configured
                        </p>
                        <p>
                          Chunk size:{" "}
                          <span className="font-semibold">
                            {speedProbe.tuned_chunk_kb >= 1024
                              ? `${speedProbe.tuned_chunk_kb / 1024}MB`
                              : `${speedProbe.tuned_chunk_kb}KB`}
                          </span>
                        </p>
                        <p>Mode: {speedProbe.mode_cap || "unknown"}</p>
                      </div>
                    </div>
                    {speedProbe.tuning_log && (
                      <p className="text-muted-foreground border-border border-t pt-2 text-xs italic">
                        {speedProbe.tuning_log}
                      </p>
                    )}
                  </div>
                )}

                {validationReport?.warnings?.length > 0 && (
                  <div className="space-y-1 rounded-lg border border-amber-200 bg-amber-50/30 p-4 dark:border-amber-800 dark:bg-amber-950/20">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                      Warnings:
                    </p>
                    {validationReport.warnings.map((w: string, i: number) => (
                      <p
                        key={i}
                        className="text-xs text-amber-600 dark:text-amber-400"
                      >
                        &#8226; {w}
                      </p>
                    ))}
                  </div>
                )}

                {/* v2.9.7.71: Security warning — what is NOT transferred */}
                <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                      What is NOT included in this migration:
                    </p>
                  </div>
                  <ul className="ml-6 space-y-1.5 text-xs text-amber-700 dark:text-amber-400">
                    <li>
                      <strong>Plugins</strong> — Plugin files and database
                      settings are transferred automatically. Plugins will be
                      deactivated on arrival — reactivate from wp-admin.
                    </li>
                    <li>
                      <strong>2FA / Two-Factor Authentication</strong> —
                      Security secrets are site-specific and cannot be safely
                      transferred. Users must re-enroll after migration.
                    </li>
                    <li>
                      <strong>API keys and encryption keys</strong> — These are
                      tied to this server&apos;s configuration and cannot be
                      transferred between servers.
                    </li>
                    <li>
                      <strong>mu-plugins, .htaccess, wp-config.php</strong> —
                      Server-specific files that must be configured on the
                      destination server.
                    </li>
                  </ul>
                  <p className="text-muted-foreground mt-1 ml-6 text-xs">
                    These items use site-specific encryption keys and server
                    configurations that cannot be safely transferred between
                    servers.
                  </p>
                </div>

                {/* MIG-10: Show what the exporter chose for user accounts so the importer
                    knows what to expect before deciding whether to override the toggle. */}
                {validationReport?.include_users !== null &&
                  validationReport?.include_users !== undefined && (
                    <div className="border-border bg-secondary/20 flex items-center gap-2 rounded-lg border px-4 py-2 text-xs">
                      <span className="text-muted-foreground font-medium">
                        Passport exported with user accounts:
                      </span>
                      <span
                        className={
                          validationReport.include_users
                            ? "font-semibold text-green-700 dark:text-green-400"
                            : "text-muted-foreground font-semibold"
                        }
                      >
                        {validationReport.include_users ? "Yes" : "No"}
                      </span>
                      {validationReport.include_users && (
                        <span className="text-muted-foreground">
                          — toggle is pre-set to match
                        </span>
                      )}
                    </div>
                  )}

                {/* v2.9.7.48: Unified user accounts toggle — controls both export and import */}
                <div className="border-border bg-secondary/30 space-y-3 rounded-lg border p-4">
                  <label className="flex cursor-pointer items-start gap-3 select-none">
                    <input
                      type="checkbox"
                      checked={includeUsersInExport}
                      onChange={(e) => {
                        const include = e.target.checked;
                        setIncludeUsersInExport(include);
                      }}
                      className="border-border mt-0.5 h-4 w-4 flex-shrink-0 rounded accent-blue-600"
                      aria-label="Include user accounts in migration"
                    />
                    <div>
                      <span className="text-sm font-semibold">
                        Include user accounts in migration
                      </span>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        When on: exports{" "}
                        <code className="bg-background rounded px-1">
                          wp_users
                        </code>{" "}
                        +{" "}
                        <code className="bg-background rounded px-1">
                          wp_usermeta
                        </code>{" "}
                        from the source and imports them to the destination.
                        When off (default): user accounts are excluded from the
                        export file and existing users on this site are
                        preserved.
                      </p>
                    </div>
                  </label>

                  {/* Warning when user accounts will be imported */}
                  {includeUsersInExport && (
                    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        User accounts will be imported. Destination accounts
                        with matching user IDs may be overwritten. Two-factor
                        authentication (2FA) must be reconfigured after
                        migration &#8212; 2FA secrets are site-specific and will
                        not work on the destination site.
                      </p>
                    </div>
                  )}
                </div>

                {/* SENTINEL-VIS-1: Pre-flight readiness panel */}
                <div className="border-border bg-secondary/30 space-y-3 rounded-lg border p-4">
                  <h4 className="flex items-center gap-2 text-sm font-semibold">
                    <Server
                      className="h-4 w-4 text-blue-500"
                      aria-hidden="true"
                    />
                    Pre-flight Check
                    {preflightLoading && (
                      <Loader2
                        className="text-muted-foreground ml-auto h-3 w-3 animate-spin"
                        aria-label="Running pre-flight check"
                      />
                    )}
                    {preflight && !preflightLoading && (
                      <span
                        className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${
                          preflight.go_nogo
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                        }`}
                      >
                        {preflight.go_nogo ? "Ready" : "Issues Found"}
                      </span>
                    )}
                  </h4>

                  {preflight ? (
                    <>
                      {!preflight.go_nogo && preflight.reason && (
                        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
                          <AlertTriangle
                            className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400"
                            aria-hidden="true"
                          />
                          <p className="text-xs text-red-700 dark:text-red-300">
                            {preflight.reason}
                          </p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                        {(
                          [
                            {
                              label: "Disk free",
                              value: `${preflight.disk_free_pct}%`,
                              ok: preflight.disk_free_pct >= 10,
                            },
                            {
                              label: "DB size",
                              value: `${preflight.db_size_mb} MB`,
                              ok: true,
                            },
                            {
                              label: "Available RAM",
                              value: `${preflight.memory_available_mb} MB`,
                              ok: preflight.memory_available_mb >= 50,
                            },
                            {
                              label: "Time limit",
                              value:
                                preflight.time_limit === 0
                                  ? "Unlimited"
                                  : `${preflight.time_limit}s`,
                              ok:
                                preflight.time_limit === 0 ||
                                preflight.time_limit >= 30,
                            },
                            {
                              label: "Server",
                              value: preflight.is_litespeed
                                ? "LiteSpeed"
                                : "Standard",
                              ok: true,
                            },
                            {
                              label: "CPU load",
                              value: preflight.load_avg.toFixed(2),
                              ok: preflight.load_avg <= 5,
                            },
                            {
                              label: "Loopback",
                              value: preflight.loopback_ok ? "OK" : "Blocked",
                              ok: preflight.loopback_ok,
                            },
                            {
                              label: "ZipArchive",
                              value: preflight.zip_ok ? "Available" : "Missing",
                              ok: preflight.zip_ok,
                            },
                            {
                              label: "WP-Cron",
                              value: preflight.cron_ok ? "Enabled" : "Disabled",
                              ok: preflight.cron_ok,
                            },
                            {
                              label: "Uploads size",
                              value:
                                preflight.uploads_size_mb === -1
                                  ? "Unknown"
                                  : `${preflight.uploads_size_mb} MB`,
                              ok: true,
                            },
                          ] as Array<{
                            label: string;
                            value: string;
                            ok: boolean;
                          }>
                        ).map(({ label, value, ok }) => (
                          <div
                            key={label}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="text-muted-foreground">
                              {label}
                            </span>
                            <span
                              className={`font-medium tabular-nums ${
                                ok
                                  ? "text-foreground"
                                  : "text-amber-700 dark:text-amber-400"
                              }`}
                            >
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>
                      <p className="text-muted-foreground border-border border-t pt-2 text-xs">
                        Recommended mode:{" "}
                        <span className="text-foreground font-semibold capitalize">
                          {preflight.recommended_mode}
                        </span>
                      </p>
                    </>
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      {preflightLoading
                        ? "Checking server readiness\u2026"
                        : "Pre-flight check not yet run."}
                    </p>
                  )}
                </div>

                {/* F0b: Surface multisite error inline when detected during validation */}
                {multisiteError && (
                  <div
                    role="alert"
                    aria-live="polite"
                    className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50/50 p-4 dark:border-red-700 dark:bg-red-950/30"
                  >
                    <AlertTriangle
                      className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400"
                      aria-hidden="true"
                    />
                    <p className="text-sm font-medium text-red-700 dark:text-red-300">
                      {multisiteError}
                    </p>
                  </div>
                )}

                <Button
                  onClick={() => {
                    if (preflight !== null && !preflight.go_nogo) return;
                    // F0a: Show confirmation modal before destructive import
                    setShowImportConfirmModal(true);
                  }}
                  variant="primary"
                  className="w-full"
                  disabled={preflight !== null && !preflight.go_nogo}
                  aria-disabled={preflight !== null && !preflight.go_nogo}
                >
                  {preflight !== null && !preflight.go_nogo
                    ? "Import Blocked — Fix Issues Above"
                    : "Skip Backup (Dev) & Continue"}
                </Button>
              </div>
            </Card>
          )}

          {step === "migrate" && (
            <Card>
              <div className="p-6 text-center">
                <h3 className="mb-4 text-2xl font-semibold">
                  Migration in Progress
                </h3>
                <div className="mb-4 h-4 w-full rounded-full bg-gray-200">
                  <div
                    className="h-4 rounded-full bg-blue-600 transition-all duration-500"
                    style={{
                      // Prefer query_progress_pct (E4) when available — byte offset runs
                      // ahead of query count on large INSERTs (1 query = many KB).
                      // Cap at 100% — import can process more queries than the passport
                      // total_queries estimate due to differing count methods.
                      width: `${Math.min(100, importStatus?.query_progress_pct > 0 ? importStatus.query_progress_pct : progress)}%`,
                    }}
                  ></div>
                </div>
                {importStatus &&
                  (importStatus.expected_total_queries > 0 ||
                    importStatus.query_progress_pct > 0) && (
                    <div
                      className="mb-3 flex items-center justify-between px-1 text-xs text-neutral-600 dark:text-neutral-300"
                      aria-live="polite"
                      aria-label="Import progress"
                    >
                      <span>
                        {importStatus.total_queries_done.toLocaleString()} /{" "}
                        {(
                          importStatus.estimated_total_queries ||
                          importStatus.expected_total_queries
                        ).toLocaleString()}{" "}
                        queries est. ({importStatus.query_progress_pct}%)
                        {importStatus.byte_progress_pct >= 100 &&
                          importStatus.is_running && (
                            <span className="ml-2 text-amber-600 dark:text-amber-400">
                              — Finalizing…
                            </span>
                          )}
                      </span>
                      {importStatus.eta_seconds > 0 && (
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          {formatEta(importStatus.eta_seconds)}
                        </span>
                      )}
                    </div>
                  )}
                <p className="text-muted-foreground text-sm">{statusMsg}</p>
                <div className="bg-secondary dark:bg-secondary mt-4 max-h-40 overflow-y-auto rounded p-2 text-left font-mono text-xs">
                  {logs.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {step === "complete" && (
            <Card>
              <div className="p-6 text-center">
                <CheckCircle className="mx-auto mb-4 h-16 w-16 text-emerald-500" />
                <h3 className="mb-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  Database Import Complete
                </h3>
                <p className="text-muted-foreground mb-4">
                  Database import complete. Complete the finalization steps
                  below to activate your migrated site.
                </p>
                {importVerification && (
                  <div
                    className={`mt-4 mb-4 rounded-lg border p-4 text-left ${
                      importVerification.status === "verified"
                        ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-950/30"
                        : "border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/30"
                    }`}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      {importVerification.status === "verified" ? (
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                      <span className="text-sm font-semibold">
                        {importVerification.status === "verified"
                          ? "Database Verified — All counts match source"
                          : "Verification Warning — Discrepancies detected"}
                      </span>
                    </div>
                    {importVerification.discrepancies?.length > 0 && (
                      <ul className="mb-2 list-disc space-y-0.5 pl-5 text-xs text-amber-600 dark:text-amber-400">
                        {importVerification.discrepancies.map(
                          (d: string, i: number) => (
                            <li key={i}>{d}</li>
                          )
                        )}
                      </ul>
                    )}
                    <div className="text-muted-foreground grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="font-medium">Source</p>
                        <p>
                          Pages:{" "}
                          {
                            importVerification.source_fingerprint
                              ?.published_pages
                          }{" "}
                          | Posts:{" "}
                          {
                            importVerification.source_fingerprint
                              ?.published_posts
                          }{" "}
                          | Users:{" "}
                          {importVerification.source_fingerprint?.user_count}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">After Import</p>
                        <p>
                          Pages:{" "}
                          {
                            importVerification.current_fingerprint
                              ?.published_pages
                          }{" "}
                          | Posts:{" "}
                          {
                            importVerification.current_fingerprint
                              ?.published_posts
                          }{" "}
                          | Users:{" "}
                          {importVerification.current_fingerprint?.user_count}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="bg-secondary dark:bg-secondary mt-4 max-h-32 overflow-y-auto rounded p-2 text-left font-mono text-xs">
                  {logs.slice(-5).map((log, i) => (
                    <div key={i}>{log}</div>
                  ))}
                </div>

                {/* F0c: Post-migration verification checklist */}
                <div
                  className="border-border bg-secondary/30 mt-6 space-y-3 rounded-lg border p-4 text-left"
                  aria-label="Post-migration verification"
                >
                  <h4 className="flex items-center gap-2 text-sm font-semibold">
                    <Shield
                      className="h-4 w-4 text-blue-500"
                      aria-hidden="true"
                    />
                    Site Verification
                    {postMigrationCheck.loading && (
                      <Loader2
                        className="text-muted-foreground ml-auto h-3 w-3 animate-spin"
                        aria-label="Fetching verification data"
                      />
                    )}
                  </h4>

                  {postMigrationCheck.loading ? (
                    <p className="text-muted-foreground text-xs">
                      Checking site state&hellip;
                    </p>
                  ) : (
                    <ul className="space-y-2" aria-label="Verification results">
                      {/* Site URL */}
                      <li className="flex items-start gap-2 text-xs">
                        {postMigrationCheck.siteurl ? (
                          <CheckCircle
                            className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500"
                            aria-hidden="true"
                          />
                        ) : (
                          <AlertTriangle
                            className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500"
                            aria-hidden="true"
                          />
                        )}
                        <span>
                          <span className="text-foreground font-medium">
                            Site URL:{" "}
                          </span>
                          {postMigrationCheck.siteurl ? (
                            <span className="font-mono text-emerald-700 dark:text-emerald-400">
                              {postMigrationCheck.siteurl}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              Could not retrieve
                            </span>
                          )}
                        </span>
                      </li>

                      {/* Active theme */}
                      <li className="flex items-start gap-2 text-xs">
                        {postMigrationCheck.active_theme ? (
                          <CheckCircle
                            className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500"
                            aria-hidden="true"
                          />
                        ) : (
                          <AlertTriangle
                            className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500"
                            aria-hidden="true"
                          />
                        )}
                        <span>
                          <span className="text-foreground font-medium">
                            Active Theme:{" "}
                          </span>
                          {postMigrationCheck.active_theme ?? (
                            <span className="text-muted-foreground">
                              Could not retrieve
                            </span>
                          )}
                        </span>
                      </li>

                      {/* Active plugin count */}
                      <li className="flex items-start gap-2 text-xs">
                        {postMigrationCheck.active_plugin_count !== null ? (
                          <CheckCircle
                            className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500"
                            aria-hidden="true"
                          />
                        ) : (
                          <AlertTriangle
                            className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500"
                            aria-hidden="true"
                          />
                        )}
                        <span>
                          <span className="text-foreground font-medium">
                            Active Plugins:{" "}
                          </span>
                          {postMigrationCheck.active_plugin_count !== null ? (
                            <span>
                              {postMigrationCheck.active_plugin_count} active
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              Could not retrieve
                            </span>
                          )}
                        </span>
                      </li>

                      {/* License status */}
                      <li className="flex items-start gap-2 text-xs">
                        {postMigrationCheck.license_active === true ? (
                          <CheckCircle
                            className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500"
                            aria-hidden="true"
                          />
                        ) : (
                          <AlertTriangle
                            className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500"
                            aria-hidden="true"
                          />
                        )}
                        <span>
                          <span className="text-foreground font-medium">
                            License:{" "}
                          </span>
                          {postMigrationCheck.license_active === true ? (
                            <span className="font-medium text-emerald-700 dark:text-emerald-400">
                              Active
                            </span>
                          ) : postMigrationCheck.license_active === false ? (
                            <span className="text-amber-700 dark:text-amber-400">
                              Not active — reactivate after migration
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              Could not retrieve
                            </span>
                          )}
                        </span>
                      </li>
                    </ul>
                  )}

                  {!postMigrationCheck.loading &&
                    postMigrationCheck.siteurl === null &&
                    postMigrationCheck.active_theme === null && (
                      <p className="text-muted-foreground border-border border-t pt-2 text-xs">
                        Verification data unavailable — confirm manually via
                        your site&apos;s WordPress admin.
                      </p>
                    )}
                </div>

                <Button
                  onClick={() => setShowChecklistModal(true)}
                  variant="primary"
                  className="mt-6 w-full"
                >
                  <ArrowRight className="mr-2 h-5 w-5" /> Open Finalization
                  Checklist
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      <PostMigrationChecklist
        isOpen={showChecklistModal}
        onClose={() => setShowChecklistModal(false)}
        migrationMode={migrationMode}
      />

      {/* ── F0a: Import Confirmation Modal ──────────────────────────────────────── */}
      {showImportConfirmModal && (
        <div
          className="bg-swiss-navy/50 animate-in fade-in fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm duration-300"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-confirm-title"
            aria-describedby="import-confirm-desc"
            className="bg-card shadow-premium border-border animate-in zoom-in-95 w-full max-w-md space-y-5 rounded-2xl border p-6 duration-300"
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 rounded-full bg-red-100 p-2 dark:bg-red-900/30">
                <AlertTriangle
                  className="h-5 w-5 text-red-600 dark:text-red-400"
                  aria-hidden="true"
                />
              </div>
              <div>
                <h3
                  id="import-confirm-title"
                  className="text-lg font-bold text-slate-900 dark:text-slate-100"
                >
                  Confirm Database Import
                </h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <p
              id="import-confirm-desc"
              className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300"
            >
              This will replace the entire database on this site with data from{" "}
              <strong className="font-semibold text-slate-900 dark:text-slate-100">
                {passport?.source_url || "the source site"}
              </strong>
              . This action cannot be undone. We recommend creating a backup
              first.
            </p>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowImportConfirmModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <button
                type="button"
                onClick={() => {
                  setShowImportConfirmModal(false);
                  startMigration(true);
                }}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-red-700/20 bg-red-600 px-6 py-3 text-xs font-black tracking-[0.15em] text-white uppercase shadow-lg shadow-red-600/30 transition-all duration-500 hover:bg-red-700 active:scale-95"
              >
                <AlertTriangle size={14} aria-hidden="true" />I Understand,
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dirty Environment Modal — Task D */}
      {showDirtyEnvModal && (
        <div className="bg-swiss-navy/20 animate-in fade-in fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md duration-300">
          <div className="bg-card shadow-premium border-border w-full max-w-md space-y-4 rounded-2xl border p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/30">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Dirty Environment Detected
              </h3>
            </div>
            <p className="text-muted-foreground text-sm">
              A previous migration left behind temporary files or locks. Clean
              the environment before starting a new migration.
            </p>
            {envStatus && (
              <div className="bg-secondary/50 space-y-1 rounded-lg p-3 font-mono text-xs">
                {envStatus.process_locked && (
                  <div className="text-red-600 dark:text-red-400">
                    Process lock: active
                  </div>
                )}
                {envStatus.download_locked && (
                  <div className="text-red-600 dark:text-red-400">
                    Download lock: active
                  </div>
                )}
                {envStatus.has_temp_files && (
                  <div className="text-amber-600 dark:text-amber-400">
                    Temp files: present
                  </div>
                )}
                {envStatus.import_file_size > 0 && (
                  <div className="text-amber-600 dark:text-amber-400">
                    Import file:{" "}
                    {(envStatus.import_file_size / 1024 / 1024).toFixed(1)} MB
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowDirtyEnvModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCleanEnv}
                loading={cleaningEnv}
                className="flex-1"
              >
                Clean & Continue
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MigrationStation;
