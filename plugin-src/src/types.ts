/**
 * SwissSuite AI - WordPress Security, Backup & SEO Plugin
 *
 * @package   SwissSuite_AI
 * @author    Swisswpsecure Team <info@swisswpsecure.com>
 * @license   GPL-2.0+
 * @link      https://swisswpsecure.com
 * @copyright 2026 Swisswpsecure Team
 */

export type ViewState =
  "dashboard" | "seo" | "security" | "backups" | "settings";

export type ContentType =
  "product" | "post" | "page" | "image" | "template" | "all";

/** Individual non-compliant SEO item returned by /seo/scan */
export interface SeoNonCompliantItem {
  id: number;
  title: string;
  type: "post" | "page" | "product" | "image";
  desc_length: number;
  content_length: number;
  reason: "missing" | "short_content" | "below_threshold";
}

/**
 * Per-content-type detail block from /seo/scan.
 * NEW shape (backend v2.9.28+) adds `actionable` and `excluded_thin_content`.
 * OLD shape only has total/missing/optimized — treat new fields as optional for rollout safety.
 */
export interface SeoScanDetailEntry {
  total: number;
  missing: number;
  optimized: number;
  /**
   * RB-305: Items whose page text carries enough detail to work with
   * (excludes thin content). Present only in new backend shape — fall back
   * to `missing` when absent.
   */
  actionable?: number;
  /**
   * RB-305: Count of items excluded because their page text is too thin to
   * describe. Show as an informational note below the card, not as a problem.
   */
  excluded_thin_content?: number;
}

/**
 * G1 (2026-08-11, owner Option A — one canonical SEO score): the three
 * labeled sub-scores of the shared formula (PHP:
 * class-swisswpsuite-seo-score-calculator.php). Identical shape returned by
 * both /stats (Dashboard tile) and /seo/scan (SEO tab Health Audit).
 */
export interface SeoBreakdown {
  on_page: number;
  technical: number;
  content: number;
}

/** Response from /seo/scan endpoint */
export interface SeoScanResult {
  /**
   * G1 — THE canonical SEO score (2026-08-11). Identical value to /stats's
   * seo_score for the same site state — this is the number the Health Audit
   * modal's headline must display, not `score` below.
   */
  seo_score: number;
  /** Labeled sub-scores of `seo_score` — render as sub-scores, never as a competing headline. */
  seo_breakdown: SeoBreakdown;
  /** Ceiling for `seo_score` if every fixable item were fixed. */
  max_achievable_seo_score: number;
  /**
   * Legacy content+image "optimization completion" sub-metric — PRESERVED
   * for `details`/ceiling-UI backward compatibility. No longer the page's
   * headline number as of G1 (2026-08-11) — use `seo_score` for that.
   */
  score: number;
  max_achievable_score: number;
  total_items: number;
  optimized_items: number;
  details: {
    product: SeoScanDetailEntry;
    post: SeoScanDetailEntry;
    page: SeoScanDetailEntry;
    image: SeoScanDetailEntry;
    [key: string]: SeoScanDetailEntry;
  };
  non_compliant_items: SeoNonCompliantItem[];
}

export interface SecurityLog {
  id: number;
  ip_address: string;
  event: string;
  created_at: string;
  severity: "low" | "medium" | "high";
  blocked: boolean | number; // DB returns 0/1 (number)
}

export interface SecurityStatus {
  firewall_enabled: boolean;
  spam_enabled: boolean;
  block_sqli: boolean;
  block_xss: boolean;
  simulation_mode: boolean;
  login_enabled: boolean;
  last_scan: string;
  /** Source of the last scan (e.g. 'manual', 'scheduled') — returned by GET /security/status */
  last_scan_source?: string;
  threats_blocked: number;
  // DASH-2 / SEC-CTRL-1 (v2.9.33.49): WAF self-test result, additive/optional
  // so older PHP responses (pre-self-test backend) still satisfy this shape.
  // Backend contract: PHP executor lane (VALIDATOR_DASH.md §1 Fix B) — read
  // via GET /security/status once shipped, never written by the frontend.
  waf_self_test?: {
    last_run: string | null;
    result: "ok" | "failed" | "unknown" | "off" | "never";
    http_code: number | null;
    blocked_row_seen: boolean | null;
    detail: string;
  };
  /** ISO-ish timestamp of the most recent real (non-self-test) WAF block, or null if none. */
  last_block_at?: string | null;
}

export interface BackupArchive {
  name: string;
  date: string;
  timestamp: number;
  size: string;
  type: "full" | "files" | "db";
  url: string;
}

// Global Window declaration removed to avoid conflict with vite-env.d.ts
// Use src/vite-env.d.ts as the source of truth for Window augmentation.

// ─────────────────────────────────────────────────────────────────────────────
// Sentinel Security Agent — findings types
// ─────────────────────────────────────────────────────────────────────────────

export interface SentinelLayer1Finding {
  id: string;
  module: string;
  category: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  /** May be null when the report omits optional prose fields. */
  details: string | null;
  /** Raw evidence string (file path, header value, etc.). Null when not applicable. */
  evidence: string | null;
  /** Human-readable fix instruction. Null when none was produced. */
  remediation: string | null;
  /**
   * Backend-supplied fix type, used for local UI classification only
   * (ARS Round E, F-08: the dedicated POST /security/findings/fix
   * remediation route and its sole frontend caller were both deleted as
   * dead code — see RoundELaneB_F08_DeadRouteDeletionTest.php).
   * Empty string or absent = informational finding (no Fix it button).
   * "manual" = show inline step-by-step guide.
   * "navigate_hardening" = switch to Hardening tab.
   * Any other value still drives local classification, e.g.
   * ScanResultPanel's classifyFindingForAi() file-fix heuristics.
   */
  fix_type?: string;
  /** CVE identifier, if this finding is CVE-related. Null for non-CVE findings. */
  cve?: string | null;
  /** Affected version range string from CVE data (e.g., "<= 1.9.7"). Null if not CVE-related. */
  affected_versions?: string | null;
  /** The actual version installed on this site. Null if not resolvable. */
  installed_version?: string | null;
  /**
   * Whether the installed version was verified against the affected range.
   * true = confirmed vulnerable (installed version IS in affected range).
   * false = confirmed NOT vulnerable (false positive filtered out).
   * null/undefined = could not verify (version data missing or unparseable).
   */
  version_verified?: boolean | null;
  /** Original severity before false-positive downgrade. Present only when version_verified=false. */
  original_severity?: string;
  /**
   * Short finding code used to build the persistent finding_code key (e.g. "M3-C").
   * Optional — not all findings carry an explicit code; falls back to title when absent.
   * PHP guards this with isset() — see class-swisswpsuite-api.php:6283.
   */
  code?: string;
  /**
   * File path associated with this finding (e.g. "wp-content/uploads/shell.php").
   * Optional — present only for file-level findings (M1/M2 modules).
   * PHP guards this with isset() — see class-swisswpsuite-api.php:6283.
   */
  file_path?: string;
  /**
   * Core integrity finding category. Present only on M1 core file integrity findings.
   * Used by the frontend to group findings by risk level:
   *   known_safe_missing — commonly removed files (readme.html, xmlrpc.php, etc.)
   *   bundled_plugin     — uninstalled bundled plugin files (Akismet, Hello Dolly)
   *   theme_modified     — modified/missing bundled theme files
   *   core_modified      — modified core files (wp-admin/, wp-includes/, root) — CONCERNING
   *   core_missing       — missing core files — CONCERNING
   */
  integrity_category?:
    | "known_safe_missing"
    | "bundled_plugin"
    | "theme_modified"
    | "core_modified"
    | "core_missing";
}

export interface SentinelLayer1Report {
  layer: 1;
  findings: SentinelLayer1Finding[];
  timestamp?: number;
}

/**
 * @deprecated since v2.9.28.0 — use {@link SecurityAuditResult} for new scan UI.
 * SentinelReport remains in use by the existing SecurityHub scan history; do NOT remove.
 */
export type SentinelReport = SentinelLayer1Report;

export interface ScanHistoryRecord {
  id: number;
  scan_id: string;
  scanned_at: string;
  /**
   * 'security_audit' is this package's own signature+posture scan — the
   * only value this package's writer stores (persist_security_audit_
   * history() in class-swisswpsuite-scan-orchestrator.php). A stored row
   * carrying any other value is one this package did not write.
   *
   * The trailing `(string & {})` keeps 'security_audit' as an autocomplete
   * suggestion while still accepting any other string a different writer
   * returns, without widening the type to plain `string`.
   */
  scan_type: "security_audit" | (string & {});
  security_grade: "A" | "B" | "C" | "D" | "F" | null;
  findings_count: number;
  critical_count: number;
  /** CRIT-3 FIX: Added missing severity breakdown counts from layer1 findings. */
  high_count?: number;
  medium_count?: number;
  low_count?: number;
  status?: string;
}

/** Full scan record with findings data, returned by GET /scan-history/{id}. */
export interface ScanHistoryDetail {
  record: ScanHistoryRecord;
  layer1_findings: SentinelLayer1Finding[];
}

/**
 * Response shape for GET /security/sentinel/latest-scan (v2.9.30.117).
 * Merges the list head + detail into a single round-trip.
 * `record: null` means no scans exist yet (first-install state).
 */
export interface LatestScanResponse {
  success: boolean;
  record: ScanHistoryRecord | null;
  layer1_findings: SentinelLayer1Finding[];
}

// ─────────────────────────────────────────────────────────────────────────────
// SecurityHub component state types
// ─────────────────────────────────────────────────────────────────────────────

/** Deep scan file-level threat entry. */
export interface DeepScanResult {
  file: string;
  issue: string;
  [key: string]: string;
}

/** Shape of the deep-scan status response / local state. */
export interface DeepScanStatus {
  status: "idle" | "running" | "complete" | "error";
  message?: string;
  processed_folders?: number;
  total_folders?: number;
  results?: DeepScanResult[];
}

// ---------------------------------------------------------------------------
// Cache Manager (v2.9.7.28 — FREE TIER)
// ---------------------------------------------------------------------------

/** Response from GET /cache/status */
export interface CacheStatusResponse {
  success: boolean;
  plugin: string | null;
  managed_host: string | null;
  object_cache: string;
  opcache_enabled: boolean;
  cooldown_remaining: number;
}

/** Response from POST /cache/purge */
export interface CachePurgeResponse {
  success: boolean;
  plugin: string | null;
  managed_host?: string | null;
  message: string;
  rate_limited: boolean;
}

/** A single system warning returned by GET /system-logs */
export interface SystemLogsWarning {
  code: string;
  message: string;
  severity: "low" | "medium" | "high";
}

// ---------------------------------------------------------------------------
// SecurityHub component types (Phase 5 — HIGH-33)
// ---------------------------------------------------------------------------

/** A single hardening option returned by GET /hardening/status */
export interface HardeningOption {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  /** True when the option cannot be changed on this installation. */
  pro?: boolean;
  /** Impact level string (e.g. "high", "medium", "low") shown in the UI. */
  risk?: string;
  /** UI tier grouping: 'essential' = always visible, 'advanced' = collapsed by default. */
  tier?: "essential" | "advanced";
  /** When true, enabling this option triggers a pre-toggle conflict check before applying. */
  requires_confirmation?: boolean;
  /**
   * ADDENDUM-2 F-U9 (2026-08-20, tri-state correction): present when `enabled`
   * is true (a DB-stored ON) but the paired root-.htaccess marker is absent on
   * a host where .htaccess IS honored (Apache/LiteSpeed) — the option is
   * still enforced at the PHP level (this field is NOT a downgrade of
   * `enabled`, unlike block_php_uploads which has no PHP-level fallback and
   * downgrades `enabled` directly instead). Absent entirely on Nginx/
   * OpenLiteSpeed hosts, where the marker is expected to never exist. Same
   * shape/semantic as the matching mutation-response field,
   * HardeningToggleResponse.htaccess_warning below — this is the read-path
   * (GET /hardening/status) counterpart of that write-path field.
   */
  htaccess_warning?: string;
}

/**
 * Response from POST /hardening/toggle.
 *
 * `htaccess_warning` (U9, 2026-08-20 UI truth fix) is present when the DB
 * flag was written successfully but the paired server-level (.htaccess)
 * rule could not be applied (Nginx/OpenLiteSpeed, read-only file, a host
 * restore that reset the file) — the option is NOT fully protecting the
 * site despite the toggle showing "on". PHP-level protection (where it
 * exists for that option) is still active; only the server-level layer
 * is missing.
 */
export interface HardeningToggleResponse {
  success: boolean;
  message?: string;
  upgrade_required?: boolean;
  htaccess_warning?: string;
}

/**
 * Response from POST /hardening/pre-toggle-check.
 * Returned before enabling a high-risk hardening option to surface
 * plugin conflicts and present a confirmation dialog.
 */
export interface PreToggleCheckResult {
  requires_confirmation: boolean;
  conflicts?: Array<{
    plugin: string;
    severity: string;
    title: string;
    message: string;
    resolution: string;
  }>;
  warning_title?: string;
  warning_body?: string;
  confirm_button_text?: string;
  cancel_button_text?: string;
}

/** A file that has been quarantined, returned by GET /security/quarantine */
export interface QuarantineFile {
  id: string;
  original_path: string;
  /** Not returned by PHP — PHP only returns id, original_path, date, size */
  quarantined_at: string;
  /** Alias for quarantined_at — provided for backward-compat with SecurityHub JSX. */
  date?: string;
  /** Human-readable string (e.g. "4.2 MB") from PHP size_format(). Not bytes. */
  size?: string;
}

// ---------------------------------------------------------------------------
// Backup Engine — chunked multi-tick state machine (v2.9.18+)
// ---------------------------------------------------------------------------

/** Live status snapshot returned by GET /backup/engine/status?job_id=xxx */
export interface BackupEngineStatus {
  job_id: string;
  status: "running" | "pending" | "complete" | "failed" | "cancelled";
  phase: string;
  progress: {
    percent: number;
    phase_label: string;
    bytes_done: number;
    bytes_total: number;
    eta_seconds: number | null;
    /** v2.9.30.106: live archive throughput in files/second (present during archive_chunk only). */
    files_per_sec?: number;
    /** v2.9.30.107: current AIMD ramp factor [0.40–1.0]. 1.0 = full budget; <1.0 = throttled. */
    budget_factor?: number;
  };
  errors: Array<{
    tick: number;
    phase: string;
    message: string;
    action: string;
  }>;
  cancel_requested: boolean;
  /** Number of ticks elapsed so far (used for slow-backup diagnostic). */
  tick_count?: number;
  /** Seconds elapsed since the job started (float). */
  total_elapsed?: number;
  /** Unix timestamp when the job was created. */
  created_at?: number;
  /** Unix timestamp of the last state update. */
  updated_at?: number;
}

/**
 * Lean summary of a non-terminal engine job, returned by GET /backup/engine/active.
 * v2.9.30.100 — lets the SPA rediscover an in-progress backup after a tab-switch or
 * reload (the engine job_id lives only in the originating tab's memory) and rehydrate
 * the progress bar. Mirrors SwissWPSuite_Backup_Engine::get_active_jobs(). No
 * filesystem paths are ever included.
 */
export interface ActiveBackupJob {
  job_id: string;
  nonce: string;
  status: "running" | "pending";
  phase: string;
  percent: number;
  files_written: number;
  total_files: number;
  trigger: string;
  started_at: number;
}

export interface ActiveBackupJobsResponse {
  success: boolean;
  data: {
    jobs: ActiveBackupJob[];
  };
}

// ---------------------------------------------------------------------------
// Backup Exclude Paths (v2.9.30.104, WS2)
// ---------------------------------------------------------------------------

/** GET/POST /backup/local/exclude-paths */
export interface BackupExcludePathsData {
  /** Current user-configured relative-to-ABSPATH exclusion paths. */
  exclude_paths: string[];
  /** Auto-detected nested WordPress installs (relative dir names). */
  nested_installs: string[];
}

export interface BackupExcludePathsResponse {
  success: boolean;
  data: BackupExcludePathsData;
}

// ---------------------------------------------------------------------------
// Abandoned Plugins Detection (v2.9.27+)
// ---------------------------------------------------------------------------

export interface AbandonedPluginItem {
  slug: string;
  name: string;
  checked_at: number;
  /**
   * Why this plugin was flagged.
   * - "closed": Plugin was explicitly closed/removed on WordPress.org (real security risk).
   * - "not_found": Plugin was never submitted to WordPress.org (informational, not a risk).
   * Absent for legacy cached results before v2.9.27.9.
   */
  reason?: "closed" | "not_found";
  /** Date the plugin was closed on WordPress.org. Only present when reason === "closed". */
  closed_date?: string | null;
}

export interface AbandonedPluginsStatus {
  success: boolean;
  enabled: boolean;
  last_check: number;
  plugins: AbandonedPluginItem[];
  in_progress?: boolean;
}

// ---------------------------------------------------------------------------
// Backup Sets — grouped backup metadata (v2.9.22+)
// ---------------------------------------------------------------------------

/** A single component file within a backup set (e.g. one category ZIP). */
export interface BackupSetFile {
  filename: string;
  category: string;
  size: number;
  /** Optional/legacy — every file this package writes is local. */
  location?: "local";
  human_size: string;
}

/**
 * A Backup Set groups all component ZIPs produced by a single backup
 * operation. One set = one logical backup.
 */
export interface BackupSet {
  id: string;
  nonce: string;
  trigger: "manual" | "scheduled";
  scope: "full" | "db" | "files";
  created_at: number;
  status: "complete" | "failed" | "cancelled" | "running";
  files: BackupSetFile[];
  total_size: number;
  tick_count: number;
  elapsed: number;
  human_size: string;
  human_elapsed: string;
  file_count: number;
}

// ---------------------------------------------------------------------------
// On-Page SEO Diagnostic Types (v2.9.28.0)
// ---------------------------------------------------------------------------

export interface OnPageIssue {
  post_id: number;
  title: string;
  url: string;
  /** Plain-English description of what is missing or wrong. */
  gap: string;
  /** Plain-English suggestion for how to fix it. */
  fix_hint: string;
  severity: "high" | "medium" | "low";
}

export interface OnPageFactor {
  score: number;
  label: string;
  issues: OnPageIssue[];
  total_checked: number;
}

export interface OnPageQuickWin {
  action: string;
  impact: string;
  factor: string;
}

export interface OnPageAuditResult {
  status: "complete";
  score: number;
  factors: Record<string, OnPageFactor>;
  quick_wins: OnPageQuickWin[];
  scanned_at: string;
  post_count: number;
  is_sample: boolean;
  progress?: number;
}

/**
 * Change F (v2.9.27.84): Built-in SMTP settings contract.
 *
 * Mirrors PHP GET /smtp/settings response. Password is NEVER returned by the
 * server — clients show SMTP_MASKED_PLACEHOLDER (`••••••••`) when
 * `hasPassword` is true. On POST, clients send either:
 *   - the real password (new value),
 *   - the masked placeholder / undefined (keep existing),
 *   - `clearPassword: true` (explicitly delete).
 */
export interface SmtpSettings {
  host: string;
  port: number;
  encryption: "tls" | "ssl" | "none";
  username: string;
  fromEmail: string;
  fromName: string;
  hasPassword: boolean;
}

export interface SmtpSettingsSavePayload {
  host: string;
  port: number;
  encryption: "tls" | "ssl" | "none";
  username: string;
  fromEmail: string;
  fromName: string;
  password?: string;
  clearPassword?: boolean;
}

export interface SmtpSettingsSaveResponse {
  success: boolean;
  message?: string;
  hasPassword?: boolean;
}

export interface SmtpTestDiagnostics {
  smtp_host: string;
  smtp_port: number;
  smtp_encryption: string;
  smtp_username: string;
  smtp_from: string;
  password_saved: boolean;
  phpmailer_is_smtp: boolean;
  phpmailer_host: string;
  phpmailer_port: number;
  phpmailer_smtp_secure: string;
  phpmailer_smtp_auth: boolean;
  phpmailer_from: string;
  phpmailer_password_length: number;
  wp_error_messages: string[];
  throw_message: string;
  // Only populated when the port pre-check aborts the test (Scenario 3,
  // v2.9.27.90 cross-hosting hardening pass).
  port_probe?: {
    blocked: boolean;
    reason: string;
    errno: number;
    elapsed_ms: number;
  };
}

export type SmtpTestRootCause =
  | "not_smtp_mode"
  | "password_decrypt_failed"
  | "no_password"
  | "wp_mail_failed"
  | "silent_failure"
  | "port_blocked"
  // v2.9.27.91: no-SMTP-configured paths. These describe the test fell
  // through to the server's default mailer (PHP mail()) rather than SMTP.
  | "no_smtp_server_mail_ok"
  | "no_smtp_server_mail_failed"
  | "no_smtp_credentials"
  // v2.9.27.93: server has `mail` in php.ini disable_functions AND no SMTP
  // configured — wp_mail() returns false silently, no WP_Error, no
  // PHPMailer exception. Surfaced by send_daily_report_now() preflight.
  | "php_mail_disabled";

export interface SmtpTestResponse {
  success: boolean;
  message: string;
  rootCause?: SmtpTestRootCause;
  diagnostics?: SmtpTestDiagnostics;
}

/**
 * GET /smtp/environment response (v2.9.27.90 cross-hosting hardening pass).
 *
 * Used by the SmtpSettings panel to render hosting-specific warnings:
 *  - competing_plugins: names of active SMTP plugins that will override ours
 *  - php_mail: whether PHP mail() is available (WP Engine / Kinsta disable it)
 *  - wp_cron: last scan run, next scheduled run, and whether the site
 *    bypasses WP's internal cron (DISABLE_WP_CRON)
 *  - encryption_strength: which crypto primitive protects the stored password
 */
export interface SmtpPhpMailEnvironment {
  mail_function_exists: boolean;
  mail_function_disabled: boolean;
  mail_is_usable: boolean;
  disable_functions: string[];
}

export interface SmtpWpCronStatus {
  next_daily_report_ts: number;
  last_scan_run_ts: number;
  disable_wp_cron: boolean;
  alternate_wp_cron: boolean;
}

/**
 * v2.9.27.92 (log-report Issue #6 permanent fix): Persistent SMTP health
 * snapshot. Populated by every send attempt — both the daily security-report
 * cron path and the manual test-email endpoint. null when no send has ever
 * been recorded (fresh install or newly-configured SMTP).
 *
 * The frontend displays a badge "Last email sent: <relative-time> — <OK/FAIL>
 * (<context>)" in the SMTP settings panel so the site owner can confirm SMTP
 * is actually working without running a diagnostic test.
 */
export interface SmtpHealthSnapshot {
  status: "ok" | "fail";
  timestamp: number; // unix seconds
  context: string; // e.g. "daily_security_report", "test_email"
  reason: string; // short failure reason (empty string on success)
}

export interface SmtpEnvironmentResponse {
  competing_plugins: string[];
  has_smtp_host: boolean;
  php_mail: SmtpPhpMailEnvironment;
  wp_cron: SmtpWpCronStatus;
  encryption_strength: "sodium" | "openssl" | "xor" | "none";
  /** v2.9.27.92: null when no send has ever been recorded. */
  smtp_health: SmtpHealthSnapshot | null;
  server_time_ts: number;
}

export interface SendDailyReportNowResponse {
  success: boolean;
  message: string;
}

// ---------------------------------------------------------------------------
// Scan Consolidation types (v2.9.28.0)
// ---------------------------------------------------------------------------

/**
 * Result from POST /security/scan/security-audit
 * Represents a single local, signature-based security audit.
 */
export interface SecurityAuditResult {
  grade: "A" | "B" | "C" | "D" | "F";
  summary: string;
  findings: Array<{
    id: string;
    severity: "critical" | "high" | "medium" | "low";
    title: string;
    detail: string;
    /** Fix instruction from the L1 scan (e.g. "Enable HTTPS in Settings > Security"). */
    remediation?: string;
    /** ABSPATH-relative file path — present when the finding targets a specific file. Used for Quarantine/Mark Safe actions. */
    evidence?: string;
    /** Automation category: 'chmod_fix' | 'delete' | 'navigate_hardening' | 'manual' | '' */
    fix_type?: string;
    /** Core integrity finding category. Mirrors SentinelLayer1Finding.integrity_category.
     * Present on M1 file-integrity findings forwarded through the security-audit pipeline.
     * Used by isMissingFileFinding() to filter out files that don't exist on disk. */
    integrity_category?: string;
  }>;
  /** ISO 8601 timestamp of when the scan ran. */
  scanned_at: string;
  /**
   * Persistent "Mark Safe" — number of findings the user has previously dismissed
   * that were stripped server-side before this response. Drives the
   * "N items hidden — manage safelist" disclosure in the scan result panel.
   * Optional/additive — older PHP releases without the safelist filter omit it.
   */
  hidden_safelist_count?: number;
}

/**
 * Result from POST /security/scan/malware (body: {mode: 'quick'|'deep'})
 *
 * v2.9.29.0 (3-Scan Redesign): Deep Malware Scan now runs through the async
 * pipeline at /scan/malware/start + /scan/malware/status. The completion
 * payload returned by /malware/status uses this same shape so existing
 * scan-result UI (ScanResultPanel, ScanResultsTable) continues to work.
 *
 * The new optional fields (`sources`, `*_status`) are populated only by the
 * deep-mode pipeline. Quick-mode scans return without them — frontend code
 * MUST treat every new field as optional for backward compat across releases.
 */
export interface MalwareScanResult {
  files_scanned: number;
  threats_found: number;
  threats: Array<{
    file: string;
    type: string;
    severity: string;
    hash?: string | null;
    /**
     * Per-finding detection sources, set by the deep-scan pipeline. More
     * than one source may flag the same file.
     */
    sources?: string[];
    /**
     * LiveQA Fix Sprint 2026-08-04 (§1.4 root cause 4) — plain-English "why
     * this matched, and whether that alone means danger" explanation, present
     * on every quick-mode local-pattern finding. Not gated behind
     * the paid "Analyze with AI" action. Optional for backward compat with
     * any cached/older response shape that predates this field.
     */
    explanation?: string;
  }>;
  mode: "quick" | "deep";
  /** ISO 8601 timestamp of when the scan ran. */
  scanned_at: string;
  /** True when the scan was queued for background processing rather than run inline. */
  queued?: boolean;

  // ── v2.9.29.0 deep-pipeline fields (optional — present on deep mode only) ─

  /**
   * Union of all detection sources that contributed to this scan's findings.
   * Used to render badges on the result table summary.
   */
  sources?: string[];
  /**
   * v2.9.33.58 — Per-phase results for phases beyond this package's own
   * local scan (enumerate, local_scan). Keyed by phase id; each entry's
   * shape is defined by whichever package supplies that phase. A phase id
   * absent from this map did not run in this package.
   */
  phases?: Record<string, { status?: string; grade?: string | null }>;
}

/**
 * v2.9.29.0 — Deep Malware Scan async job envelope (3-Scan Redesign Phase 3).
 *
 * POST /security/scan/malware/start returns { success, job_id, status: 'pending' }.
 * GET  /security/scan/malware/status?job_id=... advances the pipeline one
 * phase per call and returns the current status + phase + progress + result.
 *
 * Phase progression (each step is one /status poll):
 *   pending      -> enumerate    (job created, ready to begin)
 *   enumerate    -> local_scan   (file list collected)
 *   local_scan   -> complete     (signature scan run on the file list)
 *   any phase    -> failed       (unrecoverable error)
 *   any phase    -> error        (pipeline reported error)
 *   any phase    -> not_found    (transient expired or never existed)
 *
 * The frontend treats every status other than `complete | failed | error |
 * not_found` as "still working" and keeps polling. Result is populated only
 * when status === 'complete'. `result.phases` reports, per phase id, whether
 * it soft-degraded.
 */
export interface DeepMalwareScanJob {
  success: boolean;
  job_id: string;
  status: "pending" | "running" | "complete" | "error" | "failed" | "not_found";
  /**
   * Current phase identifier — usable as a progress label dictionary key.
   * This build's scan reports `pending`, `enumerate`, `local_scan` and
   * `complete`.
   */
  phase: string;
  /** Phase-specific progress payload (counts, sub-statuses). Free-form on purpose. */
  progress: Record<string, unknown>;
  /** Populated when status === 'complete'. Null otherwise. */
  result: MalwareScanResult | null;
  /** Populated when status === 'failed' or 'error' (pipeline error message). */
  message: string | null;
}

/**
 * Configuration for scheduled scan email reports.
 * Returned by GET /security/scan/report-config.
 * Saved via POST /security/scan/report-config.
 */
export interface ScanReportConfig {
  scan_report_email: string;
  scan_report_enabled: boolean;
  last_scan: {
    /** Unix timestamp of the most recent completed scan. */
    ts: number;
    /** Grade letter (A–F) of the most recent scan, or empty string when not available. */
    grade: string;
  } | null;
  /** Unix timestamp of the next scheduled scan, or null when no schedule is active. */
  next_scheduled_ts: number | null;
}

// ---------------------------------------------------------------------------
// Self-Check / Diagnostics Export (DIAG-EXPORT-SELFCHECK Phase 1, v2.9.33.53)
//
// Response-shape freeze from VALIDATOR_V53_DIAG_EXPORT.md §7.5 — field names
// copied verbatim so /contract_sync matches the PHP lane building the same
// shape in parallel (class-swisswpsuite-selfcheck.php). Do not add or rename
// fields here without re-syncing against that file.
//
// Six statuses, not four: `not_available` and
// `inconclusive` (could not determine, e.g. a foreign DB cursor mid-write)
// are distinct from `skip` — `skip` must never render as a problem, and
// neither `not_available` nor `inconclusive` may render as a failure.
// ---------------------------------------------------------------------------

export type SelfCheckStatus =
  "ok" | "warn" | "fail" | "skip" | "not_available" | "inconclusive";

/** One check result inside a SelfCheckGroup. */
export interface SelfCheckItem {
  id: string;
  label: string;
  status: SelfCheckStatus;
  /** Plain-English explanation of the result — always safe to render as-is. */
  detail: string;
  /** Optional supporting detail (e.g. a timestamp or count); never a secret. */
  evidence: string | null;
}

/** A family of related checks (e.g. "Backups", "Scheduling", "Firewall"). */
export interface SelfCheckGroup {
  id: string;
  label: string;
  checks: SelfCheckItem[];
}

/**
 * Counts by status. Deliberately 5 fields, not 6 — matches the frozen
 * contract exactly. `inconclusive` checks are still rendered individually
 * inside their group; they do not get a dedicated summary bucket.
 */
export interface SelfCheckSummary {
  ok: number;
  warn: number;
  fail: number;
  skip: number;
  not_available: number;
}

/**
 * Response from GET /selfcheck/last and POST /selfcheck/run when a result
 * exists. `ran_at` is a real Unix timestamp of a completed run — it is
 * never used as a "never run yet" sentinel. The never-run case is a
 * structurally different response shape, `SelfCheckNeverRun` below, always
 * discriminable by the presence/absence of `groups` (see `hasRun()` in
 * SelfCheckPanel.tsx). CORRECTED 2026-09-07 (VALIDATOR_V53_SELFCHECK_FIXES.md
 * H-1): a prior revision of this docblock claimed `0` was the never-run
 * sentinel — the PHP handler actually sends `ran_at: null` inside a
 * differently-shaped body; that claim was never true.
 */
export interface SelfCheckResult {
  ran_at: number;
  summary: SelfCheckSummary;
  groups: SelfCheckGroup[];
}

/**
 * The never-run response shape shared by GET /selfcheck/last (200,
 * `success:true`) and GET /selfcheck/export (200, `success:false`,
 * `code:"never_run"`) — VALIDATOR_V53_SELFCHECK_FIXES.md §2.3/§7. Both
 * routes use the SAME idiom (`ran_at: null` + a human `message`) so the
 * panel has one never-run rendering path, not two.
 */
export interface SelfCheckNeverRun {
  success: boolean; // true from /last, false from /export
  ran_at: null;
  code?: "never_run";
  message: string;
}

/** Response from GET /selfcheck/last and POST /selfcheck/run. */
export type SelfCheckLastResponse = SelfCheckResult | SelfCheckNeverRun;

/**
 * Response from GET /selfcheck/export — a redacted diagnostics snapshot
 * (self-check result + environment + a manifest-driven secret sweep, see
 * VALIDATOR_V53_DIAG_EXPORT.md §4.2). Intentionally typed as an opaque
 * record: `class-swisswpsuite-selfcheck.php` owns exactly what it
 * contains, and the frontend downloads it verbatim rather than
 * interpreting individual fields — inventing a stricter type here would
 * describe a shape nobody has confirmed.
 */
export type SelfCheckExportPayload = Record<string, unknown>;

/** Response from GET /selfcheck/export — success case carries the opaque
 * payload plus `success:true`; the never-run case is the shared shape
 * above (VALIDATOR_V53_SELFCHECK_FIXES.md §7, M-3). */
export type SelfCheckExportResponse =
  (SelfCheckExportPayload & { success: true }) | SelfCheckNeverRun;

/**
 * Response from POST /selfcheck/mail-test — the explicit, one-click "send
 * a real test email" action (VALIDATOR_V53_SELFCHECK_FIXES.md §5-M-1). This
 * is deliberately NOT part of `SelfCheckResult`/`run_all()`: the mail probe
 * is a side-effecting action the user must trigger on purpose, never a
 * passive status row. The returned `check` is rendered transiently in the
 * panel and is never persisted into the cached self-check result.
 */
export interface SelfCheckMailTestResponse {
  success: boolean;
  check: SelfCheckItem;
}
