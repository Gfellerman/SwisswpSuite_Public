/**
 * SwissSuite AI - The Ultimate All-in-One WordPress Plugin
 *
 * @package   SwissWPSuite_AI
 * @author    Swisswpsecure Team <info@swisswpsecure.com>
 * @license   GPL-2.0+
 * @link      https://www.swisswpsecure.com
 * @copyright 2026 Swisswpsecure Team
 */

export type ViewState =
  | "dashboard"
  | "seo"
  | "security"
  | "backups"
  | "settings"
  | "content-enhancer"
  | "sync"
  | "license";

export type ContentType =
  "product" | "post" | "page" | "image" | "template" | "all";

export interface ContentItem {
  id: number;
  name: string;
  description: string;
  shortDescription?: string;
  modified?: string;
  type: ContentType;
  permalink?: string;
  metaTitle?: string;
  metaDescription?: string;
  llmSummary?: string;
  lastError?: string;
  fallbackDescription?: string;

  // Rewrite Proposals
  proposedTitle?: string;
  proposedDescription?: string;
  proposedShortDescription?: string;

  // Type specific
  price?: string | number;
  imageUrl?: string;
  altText?: string;
  hasHistory?: boolean;
  tags?: string[];
}

// Alias for backward compatibility
export type Product = ContentItem;

/**
 * Response from POST /content/bulk-apply (bulk_apply_content_rewrite()).
 * CE-CAT5-002/CE-CAT13-003 FIX (LiveQA L2, 2026-08-04): ids that have no persisted
 * AI proposal at apply-time (or fail id validation) used to vanish from the response
 * entirely — counted in neither `applied` nor `failed` — which let the frontend
 * report "Applied N items successfully" while silently dropping up to ~50% of a
 * batch. `skipped_no_proposal` accounts for those ids explicitly.
 * Invariant: applied + failed.length + skipped_no_proposal.length ===
 * Math.min(total_received, 100) (the PHP-side 100-item cap truncates before the
 * per-id loop runs, so anything beyond the cap is never represented in any bucket —
 * that is the pre-existing, unrelated `bulkTruncated` case).
 */
export interface ContentBulkApplyResponse {
  success: boolean;
  applied: number;
  failed: number[];
  skipped_no_proposal: Array<{
    id: number;
    reason: "no_proposal" | "invalid_id";
  }>;
  total_received: number;
}

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
   * RB-305: Items that CAN be improved with AI (excludes thin content).
   * Present only in new backend shape — fall back to `missing` when absent.
   */
  actionable?: number;
  /**
   * RB-305: Count of items excluded because they have too little content for AI to improve.
   * Show as an informational note below the card, not as a problem.
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
  faq_bonus: number;
  details: {
    product: SeoScanDetailEntry;
    post: SeoScanDetailEntry;
    page: SeoScanDetailEntry;
    image: SeoScanDetailEntry;
    [key: string]: SeoScanDetailEntry;
  };
  non_compliant_items: SeoNonCompliantItem[];
}

export interface Order {
  id: number;
  customer: string;
  status: "pending" | "processing" | "completed" | "cancelled";
  total: number;
  date: string;
  customerNote?: string;
}

export interface SecurityLog {
  id: number;
  ip_address: string;
  event: string;
  created_at: string;
  severity: "low" | "medium" | "high";
  blocked: boolean | number; // DB returns 0/1 (number)
}

/** Response from POST /security/findings/fix — covers all three remediation paths. */
export interface RemediateResponse {
  success: boolean;
  fixed: boolean;
  finding_id?: string; // recorded internally; not always returned in response
  auto_fixed?: boolean;
  message: string;
  error?: string;
  manual_fix?: {
    how: string[];
    step_count?: number;
  };
}

export interface SecurityStatus {
  firewall_enabled: boolean;
  spam_enabled: boolean;
  block_sqli: boolean;
  block_xss: boolean;
  simulation_mode: boolean;
  login_enabled: boolean;
  last_scan: string;
  /** Source of the last scan: 'manual', 'scheduled', or 'full_ai' — returned by GET /security/status */
  last_scan_source?: string;
  threats_blocked: number;
}

export interface BackupArchive {
  name: string;
  date: string;
  timestamp: number;
  size: string;
  type: "full" | "files" | "db";
  url: string;
  is_auto: boolean;
  destination?: "local" | "gdrive" | "dropbox" | "s3" | "ftp" | "b2";
  // F-NEW-001 FIX: Allow null (backend may return null for non-automation backups).
  automation_id?: string | null; // Present when backup belongs to an automation
}

export interface SeoMeta {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
}

export interface SeoIssue {
  id: string;
  type: "missing_title" | "missing_meta" | "low_word_count" | "other";
  severity: "warning" | "error";
  message: string;
  url: string;
  fixable?: boolean;
}

export interface SeoAuditResult {
  score: number; // 0-100
  issues: SeoIssue[];
  recommendations: string[];
  lastAudit: string;
}

export interface SeoGenerationResult {
  title: string;
  description: string;
  llmSummary: string;
}

/**
 * Option A: one purchased feature's subscription state, as cached from the VPS
 * /license/check response (swisswpsuite_feature_subscriptions option).
 */
export interface FeatureSubscription {
  active: boolean;
  status: string; // 'ACTIVE' | 'PAST_DUE' | 'EXPIRED' | 'CANCELLED' | 'GRACE_PERIOD'
  expires_at: string | null;
  tier: string | null;
  // Feature A: true = auto-renewal is off; access ends at expires_at (no renewal charge).
  cancel_at_period_end?: boolean;
  // Feature D: whole days until expiry (null when the row has no expiry).
  days_remaining?: number;
  // Phase 5: per-feature isolated token balances (v2.9.30.136+).
  // Present only after the per-feature token schema (migration v24) is live.
  token_balance?: number;
  token_limit?: number;
  // Stripe-managed gating (2026-07-05): true when THIS feature's subscription
  // has a real Stripe subscription behind it and can safely go through the
  // proration-based upgrade flow. false = manually-granted (comped/
  // InvoiceNinja/support-issued) — the VPS would return NO_STRIPE_SUB for an
  // upgrade on these. Optional: undefined on older cached responses predating
  // this field, treated as stripe-managed for back-compat.
  stripe_managed?: boolean;
}

export interface LicenseStatus {
  active: boolean;
  status?: string;
  tier: string;
  tier_name: string;
  masked_key: string;
  capabilities: string[];
  expires?: string | null;
  warning?: string | null;
  stripe_customer_id?: string | null;
  // Stripe-managed gating (2026-07-05): true when the license itself is billed
  // through Stripe (has a real customer/subscription behind it). false = fully
  // manual license (comped/InvoiceNinja/support-issued) with no Stripe account
  // to open a billing portal for. Optional: undefined on older cached
  // responses predating this field — falls back to `!!stripe_customer_id`.
  is_stripe_managed?: boolean;
  // Option A: per-feature subscription map keyed by feature (backup/seo/security/content).
  // null = old-model license (VPS returned no per-feature rows).
  subscriptions?: Record<string, FeatureSubscription> | null;
  // Freemium Dual-Build (Phase 3, 2026-07-17; populated Phase 4): explicit
  // backend signal that a paid key is active on a Free-edition install.
  // Populated by class-swisswpsuite-license.php::get_status() whenever a
  // Free build has an active paid feature_subscription OR a paid legacy
  // plan — reaches the frontend via admin.php bootstrap
  // (window.swisswpsuiteData.license), GET /settings, and POST
  // /license/refresh (all three call get_status()). LicenseManager.tsx's
  // isProKeyInFreeBuild ORs this in alongside its original client-side
  // derivation (isFreeEdition && isActive && paid tier_name) for back-compat
  // with any not-yet-refreshed cached response. Every ProUpsellPlaceholder
  // call site should prefer this over re-deriving tier logic — see
  // lib/edition.ts's hasEditionMismatch() and
  // docs/architecture/FREEMIUM_DUAL_BUILD_ARCHITECTURE.md §5.
  edition_mismatch?: boolean;
  // v32 (2026-07-22): purchased token-pack pool (licenses.pack_balance on the VPS).
  // Never reset by the monthly allowance SET, never overwritten by the wallet rollup —
  // spent only AFTER the monthly allowance is exhausted (allowance-first). The License
  // page shows it as "Purchased: Y" (only when > 0). 0/undefined = no pack owned.
  pack_balance?: number;
}

/**
 * Response from POST /swisswpsuite/v1/license/refresh (force_license_refresh).
 * Back-compat top-level fields (token_balance/plan/status) are always present.
 * `license`/`tokens` are ADDITIVE (frontend on-mount freshness fix, LicenseManager.tsx):
 * the same shapes GET /settings returns, letting the License tab update the
 * headline balance, per-feature subscription bars, and status in place —
 * without a full page reload. Optional so older/partial responses degrade
 * gracefully to the pre-existing top-level-only behavior.
 */
export interface LicenseRefreshResponse {
  success: boolean;
  token_balance?: number;
  plan?: string;
  status?: string;
  license?: LicenseStatus;
  tokens?: TokenStatus;
}

/**
 * Response from GET /swisswpsuite/v1/migration/post-check.
 * F-301: Post-migration verification snapshot returned by
 * SwissWPSuite_Api_Migration::get_post_migration_check().
 * Consumed by MigrationStation.tsx to render the "Destination site
 * looks healthy" block after a successful import.
 */
export interface MigrationPostCheckResponse {
  siteurl: string;
  active_theme: string;
  active_plugin_count: number;
  admin_user_count: number;
  db_ok: boolean;
}

export interface TokenStatus {
  balance: number;
  usage: number;
  // LicenseManager token_limit FIX: Added to support real percentage computation.
  token_limit?: number;
  // v32 (2026-07-22): purchased token-pack pool, injected into
  // window.swisswpsuiteData.tokens by admin.php. Shown as "Purchased: Y" (only when
  // > 0). Separate from `balance` (the monthly allowance) — packs are spent last.
  pack_balance?: number;
}

/**
 * One masked license row within a token portfolio. Mirrors the per-license
 * objects in the VPS POST /license/portfolio response (keys masked to last-4).
 */
export interface PortfolioLicense {
  key_masked: string;
  plan: string;
  balance: number;
  limit: number;
  status: string;
  expires_at?: string | null;
}

/**
 * Response from GET /swisswpsuite/v1/license/portfolio.
 * Read-only aggregate of the total spendable token balance across ALL of the
 * user's licenses (grouped by user_id on the VPS). Display-only — never used to
 * deduct or reset balances. `success:false` (with `message`) means the section
 * should be hidden gracefully.
 */
export interface TokenPortfolio {
  success: boolean;
  message?: string;
  total_balance: number;
  total_limit: number;
  license_count: number;
  licenses: PortfolioLicense[];
}

// E3 (2026-08-13): `TrialStatus` was REMOVED here — it was already a dead duplicate of
// vite-env.d.ts's own (now also removed) `TrialStatus`, with zero importers anywhere in
// plugin/src/ or plugin/tests/ even before the trial-tier decommission (H1_DEAD_CODE_AUDIT
// _2026-08-11.md §G.10). Part of the same decommission — see that report §G for the map.

// Global Window declaration removed to avoid conflict with vite-env.d.ts
// Use src/vite-env.d.ts as the source of truth for Window augmentation.

// ─────────────────────────────────────────────────────────────────────────────
// Sentinel Security Agent — Layer 1 + Layer 2 types
// ─────────────────────────────────────────────────────────────────────────────

export interface SentinelThreatModel {
  most_likely_attacker:
    "opportunistic_bot" | "script_kiddie" | "targeted_attacker" | "apt";
  primary_motivation: string;
  time_to_compromise_without_plugin: "hours" | "days" | "weeks" | "months";
  time_to_compromise_with_plugin:
    "hours" | "days" | "weeks" | "months" | "unlikely";
}

export interface SentinelAttackChain {
  id: string;
  name: string;
  severity: "critical" | "high" | "medium" | "low";
  attacker_type: string;
  steps: string[];
  impact: string;
  exploitability: "trivial" | "moderate" | "difficult" | "theoretical";
  /** Whether a PoC is publicly available for the CVEs in this chain. */
  public_poc_available?: boolean;
  /** CVE identifiers involved in this attack chain. */
  cves_involved?: string[];
  swisswpsuite_break_point: string | null;
  remediation: string[];
  upgrade_required: "Free" | "Pro" | null;
}

export interface SentinelLayer1Finding {
  id: string;
  module: string;
  category: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  /** May be null when the AI report omits optional prose fields. */
  details: string | null;
  /** Raw evidence string (file path, header value, etc.). Null when not applicable. */
  evidence: string | null;
  /** Human-readable fix instruction. Null when AI did not provide one. */
  remediation: string | null;
  /**
   * Backend-supplied fix type for one-click remediation.
   * Empty string or absent = informational finding (no Fix it button).
   * "manual" = show inline step-by-step guide.
   * "navigate_hardening" = switch to Hardening tab.
   * All others are sent to POST /security/findings/fix.
   */
  fix_type?: string;
  /** Finding lifecycle status returned by PHP. Typically "open" or "fixed". */
  status?: string;
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

export interface SentinelLayer2Report {
  layer: 2;
  security_grade: "A" | "B" | "C" | "D" | "F";
  grade_rationale: string;
  executive_summary: string;
  threat_model: SentinelThreatModel;
  attack_chains: SentinelAttackChain[];
  individual_findings: SentinelLayer1Finding[];
  remediation_plan: Array<{
    priority: number;
    action: string;
    feature?: string;
    upgrade_required?: string;
  }>;
  positive_findings: string[];
  scan_metadata: {
    sentinel_version: string;
    analysis_date: string;
    model_used: string;
    findings_count: number;
    critical_count: number;
    high_count?: number;
    medium_count?: number;
    low_count?: number;
    chains_count: number;
    open_chains?: number;
    blocked_chains?: number;
    /** Number of CVE findings downgraded by VPS-side version validation. */
    false_positives_filtered?: number;
    /** Number of CVE findings downgraded by PHP-side version validation. */
    false_positives_filtered_php?: number;
  };
  timestamp?: number;
}

export interface SentinelLayer1Report {
  layer: 1;
  findings: SentinelLayer1Finding[];
  timestamp?: number;
}

/**
 * @deprecated since v2.9.28.0 — use {@link AiAuditResult} or {@link FullAiScanResult} for new scan UI.
 * SentinelReport remains in use by the existing SecurityHub scan history; do NOT remove.
 */
export type SentinelReport = SentinelLayer1Report | SentinelLayer2Report;

// ─────────────────────────────────────────────────────────────────────────────
// Sync Hub types
// ─────────────────────────────────────────────────────────────────────────────

export type SentinelJobStatus =
  "pending" | "running" | "stalled" | "abandoned" | "error" | "unknown";

export type SyncItemType = "post" | "page" | "product" | "template";

export interface SyncItem {
  id: number;
  type: SyncItemType | string;
  name: string;
  modified: string;
  slug?: string;
}

export interface SyncConnection {
  id: string;
  name: string;
  url: string;
  key?: string; // Deprecated — Wave 1 security fix masked this; use connection_id for outbound requests
  created_at?: string;
}

export interface SyncSchedule {
  id: string;
  connection_id: string;
  frequency: string;
  scope: string[];
  last_run: string | null;
  /** Finding #8: Tracks actual sync result — 'success', 'partial', or 'failed'. */
  last_run_status?: "success" | "partial" | "failed";
  status: "active" | "inactive";
  sentinel_status?: SentinelJobStatus;
  /**
   * U7 (gate report 2026-08-20): whether wp_schedule_event() was verifiably confirmed
   * via a post-write wp_next_scheduled() re-read. Only present on the save_schedule()
   * response's `job` field (F1 template) — absent on schedules returned by
   * GET /sync/schedules, since re-verifying every stored schedule's live cron state on
   * every list read is out of this fix's scope.
   */
  scheduled?: boolean;
}

export interface SyncCapsulePayload {
  ID: number;
  post_title: string;
  post_content: string;
  post_excerpt: string;
  post_status: string;
  post_name: string;
  post_modified: string;
  post_modified_gmt: string;
  post_parent: number;
  menu_order: number;
  post_type: string;
  meta_input: Record<string, string[]>;
  tax_input: Record<string, string[]>;
  featured_media_url?: string;
  [key: string]: unknown;
}

export interface SyncCapsule {
  capsule_version: string;
  object_type: string;
  content_hash: string;
  payload: SyncCapsulePayload;
  source_connection_id?: string;
}

export interface SyncInspectResult {
  success: boolean;
  local: SyncCapsule;
  remote: SyncCapsule;
}

/**
 * Response shape of POST /sync/compare (class-swisswpsuite-api-sync.php::proxy_diff()).
 *
 * Sync repair sprint (2026-08-17, audit MEDIUM #3): `meta` is the single source of truth
 * for which content types Sync actually covers (post/page/product — CPTs are structurally
 * out of scope). The frontend disclosure copy in SyncManager.tsx is driven by
 * `meta.supported_types_note` so it can never silently drift from what the backend
 * actually queries (class-swisswpsuite-api-content.php::get_content_items()).
 */
export interface SyncDiffResponse {
  success: boolean;
  results?: Record<number, string>;
  message?: string;
  meta?: {
    supported_content_types: string[];
    supported_types_note: string;
  };
}

export interface ScanHistoryRecord {
  id: number;
  scan_id: string;
  scanned_at: string;
  /**
   * v2.9.29.0 — Added 'malware_deep' for the new Deep Malware Scan pipeline.
   * Older record types ('full_ai', 'full') remain in the union so historical
   * records continue to render correctly after the 3-Scan Redesign rollout.
   */
  scan_type:
    "layer1" | "layer1_only" | "full" | "ai_audit" | "full_ai" | "malware_deep";
  security_grade: "A" | "B" | "C" | "D" | "F" | null;
  findings_count: number;
  critical_count: number;
  /** CRIT-3 FIX: Added missing severity breakdown counts from layer1 findings. */
  high_count?: number;
  medium_count?: number;
  low_count?: number;
  /** F-3: classify_tier() can return 'none' when no license is active. */
  tier: "free" | "pro" | "none";
  status?: string;
}

/** Full scan record with findings data, returned by GET /scan-history/{id}. */
export interface ScanHistoryDetail {
  record: ScanHistoryRecord;
  layer1_findings: SentinelLayer1Finding[];
  layer2_report: SentinelLayer2Report | null;
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
  layer2_report: SentinelLayer2Report | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SecurityHub component state types
// ─────────────────────────────────────────────────────────────────────────────

/** Background AI alert surfaced from the security status endpoint. */
export interface SecurityAlert {
  verdict: string;
  summary: string;
  threatLevel: string;
  /** Top attacking IPs by frequency — injected server-side for stable dismiss fingerprinting. */
  topIps?: string[];
}

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

/** AI analysis result for a single file. */
export interface AiFileAnalysis {
  file: string;
  verdict: string;
  confidence: string;
  explanation: string;
  /** True when the backend AI verdict was "safe" and the file was automatically added to the whitelist. */
  auto_whitelisted?: boolean;
}

/** AI log analysis result from the analyze-logs endpoint. */
export interface LogAnalysis {
  verdict: string;
  summary: string;
  threatLevel: string;
  actions: string[];
}

/** IP ban suggestion from the WAF advisor. */
export interface FirewallSuggestedBan {
  ip: string;
  reason: string;
  confidence: string;
}

/** AI firewall analysis result from the analyze-firewall endpoint. */
export interface FirewallAnalysis {
  analysis?: string;
  suggestedBans?: FirewallSuggestedBan[];
}

/** Critical issue item inside a Sentinel deep audit report. */
export interface SentinelAuditCriticalIssue {
  id: string;
  title: string;
  description: string;
  impact: string;
  remediation: string;
  [key: string]: unknown;
}

/** Sentinel deep audit analysis block. */
export interface SentinelAuditAnalysis {
  /** String severity label returned by PHP (Low / Medium / High / Critical). */
  risk_score: string;
  summary: string;
  /** Real security vulnerabilities only — drives risk_score. */
  security_issues?: SentinelAuditCriticalIssue[];
  /** Pro feature recommendations and maintenance items — do NOT affect risk_score. */
  improvement_suggestions?: SentinelAuditCriticalIssue[];
  /** Combined union of security_issues + improvement_suggestions for backward compat. */
  critical_issues?: SentinelAuditCriticalIssue[];
  recommendations?: string[];
}

/** Full Sentinel deep audit result stored locally and returned from /sentinel/status. */
export interface SentinelAuditResult {
  analysis?: SentinelAuditAnalysis;
  snapshot?: Record<string, unknown>;
  timestamp: number;
}

/**
 * Scan-status info for the Sentinel audit feature.
 *
 * NOTE (2026-07-31, WP.org Guideline 5 remediation): the scanner has no
 * scan-count limit for any tier — `limit`/`remaining`/`limit_type`/
 * `reset_info` are reported as unlimited across the board. `"unlimited"`
 * was added to `limit_type` for this; `"daily" | "monthly" | "lifetime"`
 * are kept only because no consumer switches on this value (verified: only
 * `is_pro` and `used` are read, in useLicenseStore.ts / SecurityHub.tsx) —
 * removing them is not required.
 */
export interface SentinelCredits {
  is_pro: boolean;
  remaining: number;
  limit: number;
  limit_type: "daily" | "monthly" | "lifetime" | "unlimited";
}

/** Per-member result inside the squad diagnostic response. */
export interface SquadMemberResult {
  status: "healthy" | "warning" | "error" | "idle";
  name?: string;
  issues?: string[];
  details?: {
    active_plugin_count: number;
    conflicts_found: number;
  };
}

/** Full squad diagnostic response from /security/squad/diagnostic. */
export interface SquadDiagnosticResult {
  squad: {
    sentinel: SquadMemberResult;
    architect: SquadMemberResult;
    linux_engineer: SquadMemberResult;
    compatibility: SquadMemberResult;
  };
}

// ── Migration Identity Verification (v2.9.6.19) ──

export interface DbFingerprint {
  db_name: string;
  table_prefix: string;
  siteurl: string;
  home: string;
  table_count: number;
  published_pages: number;
  published_posts: number;
  user_count: number;
  is_block_theme: boolean;
  active_theme: string;
  template_count: number;
  template_part_count: number;
}

export interface DbIdentity {
  source: DbFingerprint | null;
  destination: DbFingerprint;
}

export interface ImportVerification {
  status: "verified" | "discrepancies_found";
  source_fingerprint: DbFingerprint;
  current_fingerprint: DbFingerprint;
  discrepancies: string[];
}

// ── Theme File Transfer (v2.9.6.22) ──

/** Per-extension entry in the file manifest summary. */
export interface ThemeFileManifestEntry {
  count: number;
  size: number;
}

export interface ThemeTransferMeta {
  download_url: string;
  token: string;
  filename: string;
  /** Total size of the zip archive in bytes. */
  filesize: number;
  /** SHA-256 hex digest of the zip archive. */
  checksum: string;
  /** Stylesheet slug (active theme). */
  active_theme: string;
  /** Template slug (parent theme slug). Null when active_theme is not a child theme. */
  parent_theme: string | null;
  is_child_theme: boolean;
  is_block_theme: boolean;
  /** Total number of files in the theme (all directories combined). */
  file_count: number;
  /**
   * Summary of included files grouped by lowercase file extension.
   * Keys are bare extensions without a dot (e.g. "php", "css", "js", "png").
   * Files without an extension use the key "other".
   * Always complete — every file contributes to this summary; no cap is applied.
   * Sorted by count descending.
   */
  file_manifest: Record<string, ThemeFileManifestEntry>;
  /**
   * Zip entry paths of included files (e.g. "themes/twentytwentyfour/style.css").
   * Capped at 500 entries. When truncated, `file_list_truncated` is true
   * and `file_list_total` (== file_count) gives the real count.
   */
  file_list: string[];
  /** True when file_count > 500 and file_list does not contain all entries. */
  file_list_truncated: boolean;
  /** Always equal to file_count. Provided as a convenience for UIs that read file_list. */
  file_list_total: number;
}

/**
 * Metadata for media (uploads) file transfer — passport['media_files'] section.
 * Parallel to ThemeTransferMeta. Added in v2.9.7.71.
 */
export interface MediaTransferMeta {
  download_url: string;
  token: string;
  filename: string;
  /** Total size of the media zip archive in bytes. */
  filesize: number;
  /** SHA-256 hex digest of the media zip archive. */
  checksum: string;
  /** Total number of media files in the zip. */
  file_count: number;
  /** Summary of included files grouped by lowercase file extension. */
  file_manifest: Record<string, ThemeFileManifestEntry>;
  /** Zip entry paths of included files, capped at 500. */
  file_list: string[];
  file_list_truncated: boolean;
  file_list_total: number;
  /** Total uncompressed size of all source media files in bytes. */
  source_size: number;
}

/**
 * Metadata for plugin files transfer — passport['plugin_files'] section.
 * Parallel to MediaTransferMeta. Added in v2.9.14.x (Fix 3: plugin file transfer).
 */
export interface PluginTransferMeta {
  download_url: string;
  token: string;
  filename: string;
  /** Total size of the plugin zip archive in bytes. */
  filesize: number;
  /** SHA-256 hex digest of the plugin zip archive. */
  checksum: string;
  /** Total number of plugin files in the zip. */
  file_count: number;
  /** Summary of included files grouped by lowercase file extension. */
  file_manifest: Record<string, ThemeFileManifestEntry>;
  /** Zip entry paths of included files, capped at 500. */
  file_list: string[];
  file_list_truncated: boolean;
  file_list_total: number;
  /** Total uncompressed size of all source plugin files in bytes. */
  source_size: number;
}

// === Migration Mode B Types (v2.9.11.0) ===

/**
 * Which migration mode the user has selected on the export side.
 * 'direct'   — Mode A: plugin-to-plugin, requires SwissSuite on both sites.
 * 'receiver' — Mode B: standalone receiver PHP script for empty/new destinations.
 */
export type MigrationMode = "direct" | "receiver";

/** Response from POST /migration/generate-receiver */
export interface ReceiverGenerationResult {
  success: boolean;
  /** base64-encoded standalone PHP receiver file */
  receiver_script: string;
  /** Randomized filename, e.g. "swisswp-receive-a1b2c3d4e5f6g7h8.php" */
  filename: string;
  /** Unix timestamp when the receiver link expires (2h from generation) */
  expires_at: number;
  /** Unique export session ID used for HMAC key derivation and download counter */
  export_id: string;
  /**
   * PHP endpoint does not yet return these fields — marked optional
   * so the interface is forward-compatible when the endpoint adds them.
   */
  source_domain?: string;
  estimated_archive_size?: number;
}

/** Local client state for the Mode B export flow */
export interface ModeBExportState {
  phase: "idle" | "generating" | "ready" | "expired";
  receiver_filename: string | null;
  expires_at: number | null;
  passport_generated: boolean;
  export_includes: {
    sql: boolean;
    theme: boolean;
    media: boolean;
    /** v2.9.14.x: Plugin file transfer included in export. */
    plugins: boolean;
  };
}

/** Descriptor for a migration mode card in the mode-selection UI */
export interface MigrationModeInfo {
  id: MigrationMode;
  label: string;
  description: string;
  available: boolean;
}

/**
 * Response shape from GET /migration/preflight (SENTINEL-VIS-1, v2.9.7.61).
 * Returns a snapshot of server readiness before a migration import begins.
 * All metrics are read-only — no heavy I/O except check_uploads_size (cached 10 min).
 */
export interface MigrationPreflightResult {
  /** Free disk space as a percentage of total disk (0–100). */
  disk_free_pct: number;
  /** Current database size in megabytes. */
  db_size_mb: number;
  /** Available PHP memory in megabytes (limit − current usage). */
  memory_available_mb: number;
  /** PHP max_execution_time in seconds (0 = unlimited). */
  time_limit: number;
  /** true when SERVER_SOFTWARE contains "litespeed". */
  is_litespeed: boolean;
  /** 1-minute system load average (0 when unavailable). */
  load_avg: number;
  /** Recommended Sentinel mode: 'safe' | 'standard' | 'turbo'. */
  recommended_mode: string;
  /** true when the loopback HTTP check to /health passes. */
  loopback_ok: boolean;
  /** true when the ZipArchive PHP extension is available. */
  zip_ok: boolean;
  /** true when WP-Cron is not explicitly disabled. */
  cron_ok: boolean;
  /** Size of the uploads directory in megabytes (-1 if timed out). */
  uploads_size_mb: number;
  /** false when a hard blocker is detected (disk < 10%, RAM < 50 MB, etc.). */
  go_nogo: boolean;
  /** Human-readable explanation when go_nogo is false. */
  reason?: string;
}

/**
 * Sentinel error classification returned by the server when a migration
 * chunk fails. Included in error responses from fetch-chunk and process-chunk
 * as `sentinel_analysis`. Drives the intelligent retry system.
 */
export interface SentinelMigrationAnalysis {
  /** Error category: timeout, oom, overload, sql_error, network, waf, auth, not_found, unknown */
  error_type: string;
  /** recoverable = retry may help, degraded = partial success, fatal = stop */
  severity: "recoverable" | "degraded" | "fatal";
  /** Human-readable explanation of what went wrong and what Sentinel is doing about it. */
  diagnosis: string;
  /** Whether the frontend should retry. false = show error and stop. */
  should_retry: boolean;
  /** Seconds to wait before the next retry attempt. */
  wait_seconds: number;
  /** New chunk size in KB after adaptation, or null if unchanged. */
  adapted_chunk_kb: number | null;
  /** New mode after adaptation, or null if unchanged. */
  adapted_mode: string | null;
}

/**
 * Response shape from GET /backup/import-status (E4, v2.9.6.31).
 * All file-backed — reads import_state.json, import_meta.json, sentinel_jobs.json.
 * Safe to call mid-import even when wp_options is wiped.
 */
export interface ImportStatus {
  /** true when sentinel job_status === 'running' */
  is_running: boolean;
  file_exists: boolean;
  file_size: number;
  /** SQL statements executed so far in this import */
  total_queries_done: number;
  /** Expected total from passport total_queries field (0 for legacy passports pre-v2.9.6.27) */
  expected_total_queries: number;
  /**
   * Sentinel dynamic estimate of true total queries (v2.9.6.35).
   * Derived from observed query/byte ratio; self-corrects as import progresses.
   * Falls back to expected_total_queries for legacy responses or early in import (<10% through).
   * Note: receiver returns float ratio values during active progress — treat as number, not integer.
   */
  estimated_total_queries: number;
  /** 0–100 progress based on byte offset. Ground-truth signal; never exceeds 100. */
  byte_progress_pct: number;
  /** Percentage complete (0–99 while running, based on estimated_total_queries). */
  query_progress_pct: number;
  stall_count: number;
  /** Raw Sentinel job status string from receiver. */
  job_status:
    "pending" | "running" | "stalled" | "abandoned" | "error" | "unknown";
  job_started_at: number;
  /** Seconds since last Sentinel heartbeat. -1 if no job found. */
  last_heartbeat_ago: number;
  elapsed_seconds: number;
  /** Estimated seconds remaining. -1 if unknown (no expected_total or no elapsed time). */
  eta_seconds: number;
  /** true if safety_snapshot.json exists on disk (E3, written at offset==0) */
  has_safety_snapshot: boolean;
}

// ---------------------------------------------------------------------------
// Backup Automations (v2.9.7.27)
// ---------------------------------------------------------------------------

export interface BackupAutomation {
  id: string;
  name: string;
  schedule: "hourly" | "twicedaily" | "daily" | "weekly";
  scope: "full" | "db" | "files";
  destination: "local" | "gdrive" | "dropbox" | "s3" | "ftp" | "b2";
  retention: number;
  enabled: boolean;
  created_at: string;
  last_run_status: "success" | "failed" | "running" | null;
  last_run_at: string | null;
  last_run_message: string | null;
  /** UTC datetime of the last SUCCESSFUL completion (set only on status='success'). */
  last_successful_at?: string | null;
  next_run: string;
  /**
   * E6 (2026-08-20) — optional site-local time (HH:MM, 24h) this automation's
   * first occurrence should anchor to. `null`/absent means "not set" (legacy
   * last_run_at + stagger anchor behavior, unchanged).
   */
  start_time?: string | null;
  /**
   * E6 — day of week (0=Sunday..6=Saturday) the automation should anchor to.
   * Only meaningful when `schedule === 'weekly'` and `start_time` is set.
   */
  start_day?: number | null;
}

export interface BackupAutomationsResponse {
  success: boolean;
  automations: BackupAutomation[];
  /** True when DISABLE_WP_CRON is active — scheduled backups will not fire. */
  cron_blocked?: boolean;
  /** Number of engine state rows stuck in running/pending for >2 hours. */
  stuck_job_count?: number;
}

export interface BackupAutomationResponse {
  success: boolean;
  automation: BackupAutomation;
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

/** Response from GET /system-logs */
export interface SystemLogsResponse {
  logs: string[];
  warnings?: SystemLogsWarning[];
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
  /** True when option requires a Pro license to change. */
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
   * shape/semantic as the sibling mutation-response field,
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

/** Per-file result from the bulk AI analyze flow */
export interface BulkAnalysisResult {
  file: string;
  verdict?: string;
  confidence?: string;
  explanation?: string;
  auto_whitelisted?: boolean;
  /** Present when analysis failed for this file */
  error?: string;
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
  /**
   * v2.9.30.101 — Automation that owns this engine job, or null for a manual
   * backup. Lets the automations panel rehydrate the correct row's progress bar
   * after a refresh/tab-switch and lets the scheduler reattach-lookup correlate
   * a running job with its automation.
   */
  automation_id: string | null;
  started_at: number;
}

export interface ActiveBackupJobsResponse {
  success: boolean;
  data: {
    jobs: ActiveBackupJob[];
  };
}

/**
 * Response from GET /backup/local/analyze (FIX B, v2.9.30.103).
 * Returns a bounded site-size estimate. Never throws HTTP 500.
 */
export interface SiteAnalyzeData {
  /** Number of files counted (exact when is_estimate=false). */
  file_count: number;
  /** Total bytes counted (exact when is_estimate=false). */
  size_bytes: number;
  /**
   * Linear extrapolation of size_bytes when is_estimate=true.
   * Absent when is_estimate=false.
   */
  size_bytes_estimate?: number;
  /** True when the walk was capped by time (9s) or iteration limit (50k). */
  is_estimate: boolean;
  /** Wall-clock time the walk took in milliseconds. */
  elapsed_ms: number;
  /**
   * v2.9.30.104 (WS2): Relative-to-ABSPATH directories that contain a
   * wp-config.php or wp-load.php (nested WordPress installs). Empty array
   * when none detected. Populated by detect_nested_wp_installs() on the server.
   */
  nested_installs?: string[];
}

export interface SiteAnalyzeResponse {
  success: boolean;
  data: SiteAnalyzeData;
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
  location: "local" | "cloud";
  provider: string;
  cloud_id: string | null;
  human_size: string;
}

/**
 * A Backup Set groups all component ZIPs produced by a single backup operation.
 * One set = one logical backup, potentially split across multiple files and/or
 * stored in a combination of local + cloud locations.
 */
export interface BackupSet {
  id: string;
  nonce: string;
  automation_id: string | null;
  trigger: "manual" | "scheduled" | "sentinel";
  scope: "full" | "db" | "files";
  destination: string;
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

// Groq Batch Queue job status — shape returned by GET /batch/status?job_id=N
// (class-swisswpsuite-batch-queue.php DB schema; used by SeoManager slow-batch polling)
//
// Status lifecycle: pending → submitted → processing → completed → applied
// Terminal states the frontend must treat as "stop polling":
//   "completed" — Groq batch done, results available
//   "applied"   — results saved to postmeta (PHP normalizes this to "completed" in the response)
//   "failed"    — non-recoverable error
//   "expired"   — job >24h old with no result, or purged from DB (localStorage relic)
//
// NOTE: PHP always guarantees id, status, total_requests, completed_requests in the response.
export interface BatchQueueJob {
  id: number | null;
  batch_id?: string | null;
  status:
    | "pending"
    | "submitted"
    | "processing"
    | "completed"
    | "applied"
    | "failed"
    | "expired";
  type?: string | null;
  total_requests: number;
  completed_requests: number;
  error_message?: string | null;
  created_at?: string | null;
  submitted_at?: string | null;
  completed_at?: string | null;
}

// F-224/F-225: Response from POST /seo/queue-bulk — persisted to localStorage for resume-on-reload.
// groq_batch_id is null when Groq is unavailable (fallback to sync processing); frontend must
// handle null and not attempt to display or use it.
export interface SeoBulkQueueResponse {
  success: boolean;
  message: string;
  job_id: number;
  groq_batch_id: string | null;
  items_queued: number;
  estimated_savings: string;
}

// F-214: SEO background processing queue status — shape returned by GET /seo/background-status
//
// Shape asymmetry (W2): the PHP endpoint returns two different shapes:
//   • Queue exists     → { active, total, completed, failed, pending, percent,
//                          estimated_minutes, started_at, last_error, last_item_error }
//   • Queue missing    → { active: false }  (no other keys)
//
// Consumers must always check `active` first. Every other field is ONLY present
// when `active: true`. Accessing them when `active: false` yields `undefined`.
export interface SeoBackgroundStatus {
  active: boolean;
  /** Only present when `active: true`. */
  total?: number;
  /** Only present when `active: true`. */
  completed?: number;
  /** Only present when `active: true`. */
  failed?: number;
  /** Only present when `active: true`. */
  pending?: number;
  /** Only present when `active: true`. */
  percent?: number;
  /** Only present when `active: true`. */
  estimated_minutes?: number;
  /** Only present when `active: true`. */
  started_at?: number;
  /** Only present when `active: true`. */
  last_error?: string | null;
  /** Only present when `active: true`. */
  last_item_error?: string | null;
  /** Only present when `active: true`. */
  permanently_failed?: number;
  /** Only present when API returns HTTP 503 (lock held or skip window active). */
  retry_after?: number;
  /** Only present when API returns HTTP 503 (Groq is rate-limited). */
  rate_limited?: boolean;
  /** True when DISABLE_WP_CRON is defined — SEO queue processes inline instead of via WP-Cron. Present in all response shapes. */
  cron_blocked?: boolean;
}

// F-215: SEO batch status — shape returned by GET /seo/batch-status (wp_option swisswpsuite_seo_batch_status)
export interface SeoBatchStatus {
  status: "idle" | "running" | "completed" | "failed" | "stalled";
  total?: number;
  processed?: number;
  enhanced?: number;
  failed?: number;
  last_updated?: number;
  stop_signal?: boolean;
  filters?: Record<string, unknown>;
  last_run_at?: number;
  message?: string;
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
 * Result from POST /security/scan/ai-audit
 * Represents a single AI-powered security audit.
 */
export interface AiAuditResult {
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
     * Present on M1 file-integrity findings forwarded through the AI audit pipeline.
     * Used by isMissingFileFinding() to filter out files that don't exist on disk. */
    integrity_category?: string;
  }>;
  /** ISO 8601 timestamp of when the scan ran. */
  scanned_at: string;
  /**
   * F-3: PHP SwissWPSuite_Scan_Orchestrator::classify_tier() can return 'none'
   * when no license is active (not just 'free' or 'pro'). The TS union must
   * match the PHP contract or scan result rendering can fail type narrowing.
   */
  tier: "free" | "pro" | "none";
  /**
   * Persistent "Mark Safe" — number of findings the user has previously dismissed
   * that were stripped server-side before this response. Drives the
   * "N items hidden — manage safelist" disclosure in the AI Audit result panel.
   * Optional/additive — older PHP releases without the safelist filter omit it.
   */
  hidden_safelist_count?: number;
}

/**
 * v2.9.30.x — One entry in the persistent "Mark Safe" safelist.
 *
 * Returned by GET /security/ignore alongside path-based `ignored`. The shape
 * is intentionally minimal: the wp_options key
 * `swisswpsuite_sentinel_ignored_findings` stores ids only — the title is
 * resolved client-side from the most recent scan result so the user can see
 * what they previously dismissed without an extra round-trip to the AI.
 */
export interface SentinelSafelistEntry {
  /** Stable id: `m1-001`, `auto-XXXXXXXXXXXX`, or legacy `l1-N`. */
  finding_id: string;
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
     * v2.9.29.0 — Per-finding detection sources. Set only by the deep-mode
     * pipeline. One of: 'vps_hash' | 'local' | 'wpscan' | 'patchstack' | 'ai'.
     * Multiple sources may flag the same file (e.g. local + ai).
     */
    sources?: string[];
    /**
     * LiveQA Fix Sprint 2026-08-04 (§1.4 root cause 4) — plain-English "why
     * this matched, and whether that alone means danger" explanation, present
     * on every quick-mode (Free tier) local-pattern finding. Not gated behind
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
  /** Status of the WPScan API lookup phase. */
  wpscan_status?: "ok" | "unavailable";
  /** Status of the Patchstack API lookup phase. */
  patchstack_status?: "ok" | "unavailable";
  /** Status of the L2 AI analysis phase — degrades gracefully on token/AI outage. */
  ai_status?: "ok" | "degraded_no_ai" | "degraded_no_tokens";
  /** Status of the VPS hash database lookup phase.
   * 'degraded'      — VPS signature DB had an error; verdicts fell back to local scanning.
   * 'rate_limited'  — Free-plan rate limit hit; remaining batches fell back to local scanning. */
  vps_lookup_status?: "ok" | "unavailable" | "degraded" | "rate_limited";
  /**
   * v2.9.30.x — Letter grade returned by the L2 AI analysis phase. Mirrors
   * the value also persisted to `swisswpsuite_last_scan_report` for history.
   * '?' indicates the pipeline could not produce a grade (degraded/no-tokens).
   */
  ai_grade?: "A" | "B" | "C" | "D" | "F" | "?";
}

/**
 * Result from POST /security/scan/full-ai (Pro only).
 * Extends AiAuditResult with CVE matching and attack chain analysis.
 */
export interface FullAiScanResult extends AiAuditResult {
  cve_matches: number;
  attack_chains: number;
  layer2_used: boolean;
}

/**
 * v2.9.28.21 — Async Full AI Scan job envelope.
 * v2.9.28.25 — Expanded status union for the two-phase state machine.
 *
 * POST /security/scan/full-ai/start returns { success, job_id, status: 'pending' }.
 * GET  /security/scan/full-ai/status?job_id=... advances the scan one phase
 * per call and returns the current status + result (once complete).
 *
 * Lifecycle (each step is one /status poll):
 *   pending      -> l1_running   (after 3 s grace period, Phase 1 begins)
 *   l1_running   -> l2_pending   (Phase 1 finished, Phase 2 queued)
 *   l2_pending   -> l2_running   (Phase 2 begins)
 *   l2_running   -> complete     (Phase 2 finished, result populated)
 *   any phase    -> failed       (unrecoverable error; see `message`)
 *   any phase    -> not_found    (transient expired or never existed)
 *
 * The frontend treats every status other than `complete | failed | not_found`
 * as "still working" and keeps polling. See pollFullAiJobToCompletion().
 */
export interface FullAiScanJob {
  success: boolean;
  job_id: string;
  status:
    | "pending"
    | "l1_running"
    | "l2_pending"
    | "l2_running"
    | "complete"
    | "failed"
    | "not_found";
  /** Populated when status === 'complete'. Null otherwise. */
  result: FullAiScanResult | null;
  /** Populated when status === 'failed' (orchestrator error message). */
  message: string | null;
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
 *   enumerate    -> hashing      (file list collected)
 *   hashing      -> vps_lookup   (sha256 fingerprints computed)
 *   vps_lookup   -> local_scan   (VPS hash DB consulted, unknowns isolated)
 *   local_scan   -> wpscan       (regex scan run on VPS-unknown files)
 *   wpscan       -> patchstack   (WPScan CVE lookup complete)
 *   patchstack   -> ai_analysis  (Patchstack patch lookup complete)
 *   ai_analysis  -> complete     (AI analysis complete; result populated)
 *   any phase    -> failed       (unrecoverable error)
 *   any phase    -> error        (pipeline reported error)
 *   any phase    -> not_found    (transient expired or never existed)
 *
 * The frontend treats every status other than `complete | failed | error |
 * not_found` as "still working" and keeps polling. Result is populated only
 * when status === 'complete'. Per-source `*_status` flags inside the result
 * tell the UI when a phase soft-degraded (e.g. WPScan rate-limit).
 */
export interface DeepMalwareScanJob {
  success: boolean;
  job_id: string;
  status: "pending" | "running" | "complete" | "error" | "failed" | "not_found";
  /** Current phase identifier — usable as a progress label dictionary key. */
  phase:
    | "pending"
    | "enumerate"
    | "hashing"
    | "vps_lookup"
    | "local_scan"
    | "wpscan"
    | "patchstack"
    | "ai_analysis"
    | "complete";
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
    tier: "none" | "free" | "pro";
    /** Grade letter (A–F) of the most recent scan, or empty string when not available. */
    grade: string;
  } | null;
  /** Unix timestamp of the next scheduled scan, or null when no schedule is active. */
  next_scheduled_ts: number | null;
}

// ── Update Guard (Sprint 2 — Virtual Patching Phase 1) ──────────────────────

export interface UpdateGuardLastVerdict {
  slug: string;
  type: "post_apply_verify" | "staged_scan";
  findings_count: number;
  timestamp: string; // ISO 8601
  plugin_dir?: string;
  confidence_score?: number; // 0.0–1.0 float from update scanner; multiply × 100 for display
}

export interface UpdateGuardStatus {
  enabled: boolean;
  mode: "observe" | "review_first" | "block_on_match";
  last_verdict: UpdateGuardLastVerdict | Record<string, never>;
  snapshot_count: number;
  review_queue_count: number;
  url_allowlist: string[]; // T4-B: Trusted update source URLs
}

export interface UpdateSnapshot {
  path: string;
  slug: string;
  /** Full plugin basename, e.g. "folder/file.php". Absent on pre-fix snapshots — fall back to slug. */
  plugin_file?: string;
  version: string;
  timestamp: number; // Unix timestamp
  size_bytes: number;
}

// ── Update Guard Phase 2 (v2.9.28.17) ──────────────────────────────────────

export interface UpdateGuardReview {
  slug: string;
  plugin_file?: string; // Optional: stored in queue but not guaranteed by all queue writers; not consumed by ReviewPanel
  version: string;
  held_at: string; // ISO 8601
  findings_count: number;
}

export interface UpdateGuardSettings {
  mode: "observe" | "review_first" | "block_on_match";
  url_allowlist: string[];
  enabled: boolean;
}
