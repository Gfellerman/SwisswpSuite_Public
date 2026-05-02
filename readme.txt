=== SwissWPSuite ===
Contributors: swisswpsecure
Tags: security, backup, seo, ai, malware scanner, firewall, two-factor authentication, migration, sync
Requires at least: 5.6
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 2.9.28.66
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

The Ultimate All-in-One WordPress Plugin. Security, SEO, Backup, Migration, and AI Content — Powered by Groq AI.

== Description ==

SwissWPSuite is a comprehensive WordPress toolkit that combines Security, Backup, SEO, Migration, and AI Content tools into a single, high-performance plugin.

= Sentinel Security =
* AI-powered malware scanning with 38+ detection patterns
* Web Application Firewall (WAF) with IP reputation and rate limiting
* 11 one-click hardening options (XML-RPC, file editing, user enumeration, and more)
* Two-Factor Authentication (TOTP) for all user roles
* Geo-blocking with country-level access control
* Real-time security monitoring and email alerts

= Backup Fortress =
* Full site backups with hybrid zip engine (system zip + PHP fallback)
* Cloud storage: AWS S3 and Google Drive
* Scheduled backups with auto-pruning
* One-click restore

= Sync Teleport =
* Site-to-site content synchronization
* HMAC-signed encrypted transport
* Smart diff comparison before syncing
* Push products, posts, and media between staging and production

= Migration Station =
* Mode A: Plugin-to-plugin site migration
* Mode B: Standalone receiver for empty/broken destinations
* Serialization-safe domain replacement
* Chunked transfer for shared hosting compatibility

= AI SEO & Content =
* Bulk meta optimization with AI suggestions
* AI content rewriting and enhancement
* Vision AI for automatic alt text generation
* llms.txt generator for AI crawler context

= Licensing =
The core plugin is free with basic security scanning. Premium tiers unlock advanced features:
* **Free** — Daily auto-scan, basic threat blocking, 5 hardening options
* **Security** — Full WAF, deep AI audit, unlimited scans, 11 hardening options
* **Content SEO** — AI meta optimization, Vision AI
* **Enhancer** — AI content rewriter, tone customization
* **Backup** — Cloud backups, site sync, migration
* **Full Suite** — All features unlocked

== Installation ==

1. Download the latest release zip from the Releases page.
2. In WordPress Admin, go to Plugins > Add New > Upload Plugin.
3. Upload the zip file and click Install Now.
4. Activate the plugin.
5. Navigate to SwissWPSuite > License & Tokens and enter your License Key.

= Minimum Requirements =
* WordPress 5.6 or higher
* PHP 7.4 or higher
* HTTPS recommended for security features

== Frequently Asked Questions ==

= Is this plugin free? =
Yes. The core security scanner and 5 hardening options are completely free. Premium features require a license key.

= What AI provider does this use? =
SwissWPSuite uses Groq AI (via our secure proxy at swisswpsecure.com). No API keys from third-party AI providers are required.

= Does this plugin send data externally? =
Only when you initiate an action that requires it (AI analysis, license validation, Sentinel L2 scanning). No background telemetry or tracking. See our Privacy Policy for details.

= Is it compatible with my hosting provider? =
SwissWPSuite is designed and tested for shared hosting environments including Hostinger, SiteGround, and similar LiteSpeed/Apache hosts. It respects memory limits, execution timeouts, and output buffering constraints.

= Can I use this on multiple sites? =
Each license key is locked to one domain. Contact support for multi-site licensing.

== Changelog ==

= 2.9.28.66 =
* Fix: /security/status HTTP 500 resolved — missing global $wpdb in get_security_status().
* Fix: Abandoned plugins label changed from "NOT ON WP.ORG" to "SLUG MISMATCH..." on plugin row cards.
* Fix: File Integrity card now shows "Automatic daily checks enabled" when last scan is "Never" instead of showing stale timestamp.
* Fix: Added swisswpsuite_daily_integrity_check cron hook to run daily core file integrity scans and update the last_scan_time option so the File Integrity card never shows "Never".

= 2.9.28.53 =
* Fix: Snapshot restore now server-authoritative — recover_plugin_file_from_snapshot() reads meta.json (fast path) or disk-scans inner directory (fallback) instead of trusting frontend-supplied plugin_file.
* Fix: Rollback target slug now derived as dirname($plugin_file) server-side, preventing silent no-op restores where rollback operated on a non-existent mangled directory.
* Fix: Empty plugin_file string no longer bypasses API regex validation.
* UI: Legacy badge shown on snapshot rows created before v2.9.28.52 (plugin_file lacks '/').

= 2.9.28.52 =
* Fix: Snapshot slug separator preserved — sanitize_file_name() no longer strips the slash from plugin slugs like "folder/file.php", preventing invalid_plugin_file 400 errors on restore.
* Fix: swisswpsuite-meta.json written per snapshot to persist full plugin_file path across the sanitization boundary.
* Fix: SnapshotList.tsx restore calls now send plugin_file ?? slug ensuring the correct folder/file.php format reaches the API.
* VPS: Nginx proxy_read_timeout raised to 130s on /v1/sentinel/ and /v1/ai/ — eliminates 504 Gateway Timeout on long Groq Compound AI analysis calls.

= 2.9.28.51 =
* Security: Conditional comment SQL bypass closed — $inner blocks now pass through is_dangerous_import_sql() before execute.
* Security: 2FA nonce added to challenge form and POST handler — prevents CSRF-assisted brute-force.
* Security: Atomic token deduction — UPDATE WHERE balance >= amount replaces race-prone read/modify/write.
* Fix: Update Guard enable/disable toggle (ARIA role=switch, optimistic UI, was read-only StatusBadge).
* Fix: Update Guard URL allowlist editor for Pro — textarea saves/loads url_allowlist via settings API.
* Fix: SEO on-page audit post_status changed from 'any' to 'publish' to match dashboard stats.
* Fix: PHP 8.0 nested ternary fatal in core.php — replaced with null-coalescing chains.
* Fix: Hook accepted_args corrected to 0 for zero-parameter SwissWP_Abilities callbacks.
* Added: confidence_score field to UpdateGuardLastVerdict TypeScript interface.
* Added: admin_safelist_ips to config manifest SECURITY_SETTINGS.
* Added: autoload=false for banned_ips, admin_safelist_ips, and 7 SMTP settings options.

= 2.9.28.62 =
* Fix: DISABLE_WP_CRON truthiness bug fixed in api-seo.php:1392, api-backup.php:1755, and api-backup.php:2140 — `constant('DISABLE_WP_CRON') !== false` now correctly handles empty-string define values

= 2.9.28.63 =
* Fix: CRIT-3 — ScanHistoryRecord severity count gap — get_sentinel_scan_history() now computes high_count, medium_count, and low_count from layer1_json findings alongside critical_count
* Fix: ScanHistoryRecord TypeScript interface updated with high_count?, medium_count?, low_count? optional fields

= 2.9.28.60 =
* Fix: P0-1 post_status whitelist validation in sync upsert — blocks ghost-post injection from malicious capsules
* Fix: P0-2 sync-scheduler now includes 'auto-draft' post_status — FSE templates synced correctly
* Fix: P1-6 DISABLE_WP_CRON truthiness bug — inline fallback triggers when constant is empty string
* Fix: P2-1 analyze_firewall_logs() uses esc_html() instead of wp_strip_all_tags() — XSS evidence preserved
* Fix: P2-3 WooCommerce REST allowlist adds wc/store/v2, wc-analytics/v1, wc-admin/v1
* Fix: P2-4 post_apply_verify() now re-validates license after plugin updates
* Fix: P2-5 backup count query aligned with scan_for_links() post_status filter
* Fix: P3-2 symlink-escape case now tracked in $failed[] array

= 2.9.28.58 =
* Fix: Identity hash protocol drift — generate_identity_hash() strips protocol before hashing; is_identity_valid() upgrades stored hash on update

= 2.9.28.50 =
* WP 7.0 migration Phase B — WP AI Client routing tier inside SwissWPSuite_Groq::call_api() (zero call sites changed), Abilities API registration for 4 capabilities (get-server-health, scan-malware, sync-to-remote, enhance-seo-content), free-tier WP AI Client gate, and admin notice for unconfigured Connectors on WP 7.0 sites. Phase B bugs fixed: PHP 7.4 union-type parse error, non-existent license method, Groq response shape mismatch.

= 2.9.28.49 =
* WP 7.0 migration foundation (Phase A) — Adds the SWISSWP_WP7 feature gate and prepares the sync layer to coexist with WordPress 7.0's Real-Time Collaboration sessions. Zero behavior change on WordPress 6.9 and earlier.
* SWISSWP_WP7 constant: Plugin now exposes a global SWISSWP_WP7 boolean (true on WordPress 7.0+) so feature flags can branch deterministically without re-querying the WP version at every call site.
* RTC defer for scheduled syncs: When a WordPress 7.0 Real-Time Collaboration session is open on the same site, scheduled sync jobs now defer 60 seconds (up to 10 retries / ~10 minutes) instead of pushing into a live co-authoring session and risking CRDT divergence. Guarded by post_type_exists('wp_sync_storage'), so WordPress 6.9 sites are unaffected.
* MySQL 8.0 SQL hardening — Sanitised all dynamic SQL identifiers (table and column names) in backup, database-dumper, and logger paths via a strict [a-zA-Z0-9_$] allowlist. Numeric LIMIT/OFFSET arguments now pass through $wpdb->prepare(). The receiver-template's mysqli_real_escape_string() call sites carry inline TODOs and a tracker entry (TD-58) for the eventual prepared-statement refactor — no logic change, behaviour preserved on MySQL 5.7 and 8.0.

= 2.9.28.48 =
* SEO BG-queue bug-cluster fix sprint — 8 socratic-audit findings resolved in one release.
* F-318 (CRITICAL): generate_faq() exception no longer silently discards entire batch progress. Wrapped in try/catch(\Throwable) AND moved the queue save inside the finally block.
* F-319 (CRITICAL): Atomic INSERT IGNORE semaphore lock replaces the prior TOCTOU-race get_option→check→update_option pattern. Stale-lock cleanup runs first because this lock is process-wide.
* F-320 (HIGH): Permanent-failure marker ('permanent_failure: <code>') survives in postmeta — the trailing update_post_meta() that was overwriting it has been moved inside the else branch only.
* F-321 (CRITICAL): Removed the perpetual-503 loop. The API status handler no longer treats permanently_failed as a sticky 503 trigger; skip_until is now armed once-per-new-permanent-failure inside core.php and read by the existing 30-second staleness window.
* F-322 (HIGH): Lock TTL bumped from 120s to 180s (must exceed set_time_limit(120) + Groq HTTP latency). Defined as SWISSWPSUITE_SEO_LOCK_TTL constant in swisswpsuite-config-manifest.php — single source of truth across both core.php and api-seo.php.
* F-323 (HIGH): The "permanently_failed" count is now visible in the SEO progress banner. The field has been in the API response since v2.9.28.45 but the React state shape never declared it.
* F-324 (MEDIUM): Sonner toast deduplication via stable id "seo-rate-limited" — repeated 503 responses now refresh the existing toast instead of stacking dozens of duplicates on screen.

= 2.9.28.47 =
* CRITICAL fix: Wrapped Groq call sites in try-catch(\Throwable). The previous v2.9.28.46 fix incorrectly wrapped wc_get_product() (pure local data access, no HTTP calls). The WpOrg\Requests\TypeError comes from the wp_remote_post() transport layer — both generate_image_seo() and generate_seo_meta() are now protected.

= 2.9.28.46 =
* SEO death-spiral fix — Groq rate-limited/504 failures during background SEO now mark items permanently failed (never retried). Semaphore lock prevents concurrent WP-Cron and REST poll processing. Status endpoint returns HTTP 503 with retry_after when blocked. Frontend respects retry_after and backs off polling.

= 2.9.28.45 =
* CRITICAL: Fixed Groq json_validate_failed retry that was causing ~90% of content rewrite calls to fail terminally — retry now strips response_format so the second attempt succeeds.
* HIGH: SEO 500-item batch silent data loss — backend now returns dropped IDs and the frontend surfaces the count via toast, so >500-item batches no longer disappear without warning.
* HIGH: Restored "Ban IP" column to the Security Event Log table (regression from F-004 organism extraction).
* MEDIUM: Security tab now paints sooner — 4 non-critical REST calls are deferred to after the initial paint.
* MEDIUM: Scan results now sorted by severity (Critical first).
* MEDIUM: "Mark as Safe" allowlist hardened with SHA-256 hash check — files swapped on a whitelisted path are re-flagged automatically.

= 2.9.28.44 =
* Fix: F-303 Update Guard REST routes now register correctly — load order in `class-swisswpsuite-core.php` corrected so `define_api_hooks()` can see `SwissWPSuite_Api_Update_Guard` via `class_exists()`. Eliminates ~15 404s per page load on the Security tab.
* Fix: F-304 WooCommerce cart/checkout — hardening REST allowlist now explicitly covers `/wc-auth/v1/` (cart authentication) and `/wc/store/v1/` (Blocks-based Store API). Logged-out guests can complete checkout with "Limit What Strangers Can See" enabled.
* Fix: F-305 SEO score consistency — `seo_score` dashboard headline is now the simple integer mean of the three breakdown metrics (on-page + technical + content), so the headline is always consistent with what users see in the SEO Health Breakdown panel. Dashboard tile renamed to "Overall SEO Score" with a subtitle; breakdown heading renamed to "SEO Health Breakdown" with a composite description.
* Fix: F-309 backup automation — when "Disable Visitor-Triggered Scheduling" is enabled, the backup banner and the hardening confirmation modal now display the exact server cron command with the site URL prefilled, so users can paste it directly into their hosting control panel.
* Fix: F-301 post-migration verification — new `GET /migration/post-check` and `GET /license/status` endpoints return site URL, active theme, plugin count, admin user count, and license status. Migration Station no longer shows "unknown" for these fields.
* Fix: F-302 dead code — removed orphaned `BasicScanResults` import, legacy `scanning`/`scanResults`/`basicScanExpanded` state, and the orphaned `handleScan` function from `SecurityHub.tsx`.
* Resolved: F-306 Update Guard frontend 404s — automatically resolved by the F-303 load-order fix. 6 frontend call sites (SecurityHub, UpdateGuardCard, SnapshotList, UpdateReviewPanel, UpdateBlockedBanner) now hit real endpoints.

= 2.9.28.43 =
* Refactor: F-005 extraction FINAL — all remaining Security-tier REST routes extracted from the api.php monolith into SwissWPSuite_Api_Security (class-swisswpsuite-api-security.php). api.php is now a lean route coordinator (~337 lines). 10 modular API classes own their domains.
* Refactor: F-004 React organism extractions — ScanHistoricalRecord, BasicScanResults, and SecurityLogsPanel extracted as reusable organisms from SecurityHub.tsx.
* Refactor: F-004 Zustand store foundation — new plugin/src/store/useScanStore.ts establishes the state-management convention for scan results.
* Docs: SEO capabilities reference and Privacy Policy sub-processor disclosure updated.

= 2.9.28.42 =
* Refactor: F-005 extraction — migration, export, import-status, diagnostics, deep-scan reset, and batch-queue-status REST routes extracted from the api.php monolith into SwissWPSuite_Api_Migration (class-swisswpsuite-api-migration.php, 954 lines). api.php reduced from ~4,950 to ~4,300 lines (-650 lines). Zero behavior change.

= 2.9.28.41 =
* Refactor: F-005 extraction — all Settings, License, SMTP, Cache, Maintenance, and Debug REST routes moved from the api.php monolith to SwissWPSuite_Api_Settings (class-swisswpsuite-api-settings.php). Reduces api.php from ~7,102 to ~4,950 lines (-2,152 lines). Zero behavior change on existing routes.
* Fixed: ping_custom_api_url() in Settings API used defined() for a class constant (invalid PHP) — corrected to class_exists() guard with MODEL_FALLBACK access.

= 2.9.28.38 =
* Fixed: Scan-tab banner "Last grade" now auto-refreshes after a manual Full AI Scan completes — the React `scanReportConfig` state is re-fetched from `/security/scan/report-config` on scan completion, so the banner updates without requiring a tab switch or page reload (F-300)

= 2.9.28.37 =
* Fixed: count_active_defenses() now accurately reflects site posture on both L1 and L2 paths (Bug 1) — expanded from 7 to 11 signals, moved out of the L1-only branch
* Fixed: L2 (Groq) prompt now includes a hardening-posture aggregate (Bug 2) so sites with strong defensive breadth and only configuration findings are not graded like unprotected sites with the same findings
* Fixed: Scan-tab banner "Last grade" no longer stale after a manual Full AI Scan (Bug 3) — swisswpsuite_last_scan_report is stamped at Phase 2 completion
* Internal: New get_posture_snapshot() / build_posture_snapshot() helpers centralise posture reading across orchestrator + sentinel-security; manifest-verified key reads only


= 2.9.28.36 =
* Fixed (Bug 1 — Grade Jitter): When the Full AI Scan's Layer 2 (AI) analyzer call fails, the grade stored in history is no longer computed from L1 finding counts alone. Instead, `run_l2_phase()` now looks up the most recent genuine L2-assigned grade from the last 30 days; if it is strictly better than the current L1 fallback, it is inherited (tagged `grade_source='inherited'`). When no prior good grade is available, the fallback grade is capped at 'C' minimum (`grade_source='l1_capped'`) — the error path never writes D or F to history again. Earned A or B grades are preserved; the floor only raises toward C.
* Fixed (Bug 2 — Hardening Posture Bonus): The L1-fallback grade now rewards active defensive controls. After computing the base grade, if the grade is D/C/B the orchestrator counts seven signals — WAF, per-user 2FA, geo-blocking (or Cloudflare at the edge), XML-RPC disabled, file-editor disabled, login limiter, WordPress version hidden. Five or more active defenses raises the grade two steps; three or four raises it one step. A fully hardened site with one HIGH finding no longer scores the same D as a completely unprotected site. The Layer 2 (AI) grade is never modified by posture bonus (L2 already incorporates defensive posture in its reasoning).
* Added: New public method `SwissWPSuite_Sentinel_Security::get_last_good_l2_grade( int $days = 30 )` — read-only, `$wpdb->prepare()`-parameterised lookup for the most recent complete Full AI Scan grade within the given inheritance window. Supports the Bug 1 inheritance decision without schema changes.
* Internal: Additive `grade_source` and `active_defenses` fields in the AI scan result array for diagnostics readability. Not declared on the TypeScript interfaces; present in the JSON payload only.

= 2.9.28.35 =
* Fixed: Bulk "Check with AI" on the Full AI Scan results was sending descriptive finding text (e.g. `"wp-config.php (0644) — group or world readable"`) to `POST /security/analyze-file` as the `file` parameter, which failed server-side `file_exists()` and produced a silent UI failure. Added a `classifyFindingForAi()` categorizer in `ScanResultPanel.tsx` that inspects `fix_type`, `integrity_category`, and evidence patterns to decide whether the finding targets a real on-disk file; a clean path is extracted via `extractPathFromEvidence()` before calling the API.
* Fixed: Non-file findings (configuration/network/header/plugin-inventory) now render a friendly inline neutral message ("This finding is a configuration check — there's no source file to analyze.") when selected for AI analysis, instead of failing silently. Mixed selections run AI on real files and skip the rest with a single summary toast.
* Fixed: `POST /security/analyze-file` now returns HTTP 400 with `code:"invalid_file_path"` when the provided path is not a valid file, instead of HTTP 404. Path-traversal and ABSPATH-containment checks are unchanged.

= 2.9.28.34 =
* Changed: SecurityHub.tsx and vps/ai.js reformatted with Prettier (no logic changes).

= 2.9.28.33 =
* Fixed (F-298): Full AI Scan concurrency mutex fallback was not truly atomic on hosts without a persistent object cache — `add_option()` uses `INSERT ... ON DUPLICATE KEY UPDATE` which allowed two concurrent pollers to both win. Both Phase 1 and Phase 2 fallback blocks now use direct `INSERT IGNORE` via `$wpdb` with `rows_affected === 1` as the single-winner check.
* Fixed (F-299): `/batch/results` billing block could strand a job permanently in `'billing'` if any DB query threw after the CAS claim. The block is now wrapped in its own try/catch that resets status back to `'pending'` before re-throwing, so the client can retry.

= 2.9.28.32 =
* Fixed (F-296): Full AI Scan card briefly showed "Sending to AI for analysis…" after the success toast — phase-hint state now cleared before returning the final result.

= 2.9.28.31 =
* Fixed (F-292): `/batch/results` could double-deduct tokens on concurrent requests because the "pending" check and the token deduction were not atomic. The VPS now claims the billing window atomically (CAS `pending` → `billing`) before deducting; the only request that claims the window performs the deduction, others return results without charging again.
* Fixed (F-293): Full AI Scan routes (`/security/scan/full-ai`, `/security/scan/full-ai/start`, `/security/scan/full-ai/status`) now enforce the `sentinel_pro` capability at the route `permission_callback` in addition to the existing in-body check, making the Pro gate defense-in-depth.

= 2.9.28.30 =
* Fixed (F-291): `get_scan_full_ai_status()` could run Layer 1 twice or persist Layer 2 twice if two `/status` polls both saw the job in a `pending` or `l2_pending` state and raced into the phase body. A dual-path compare-and-set mutex (persistent object cache primary, `add_option` INSERT IGNORE fallback) now guards both phase entry points, so only one poll ever runs the phase work.

= 2.9.28.29 =
* Fixed: FAQ generation calls (generate_faq) were missing the module field in the Groq request body — token usage was attributed to 'unknown' in billing logs. Module now correctly set to 'sentinel_seo'.
* Fixed: Batch expiry cron could double-refund a job if /batch/results was fetched at the exact moment the expiry sweep ran. The expiry UPDATE now includes AND status = 'pending' to prevent processing already-completed jobs.

= 2.9.28.28 =
* Fixed: "Check with AI" returned 404 on all files — orchestrator transform stripped integrity_category, causing isMissingFileFinding() to check the wrong field. Filter now reads integrity_category correctly; only files that exist on disk are sent to /analyze-file.
* Fixed: All 9 Groq methods were missing the module field in their request bodies, so all AI token usage was attributed to 'unknown'. Module field now set on every call for accurate billing attribution.
* Fixed: Groq 502/504 upstream errors failed silently with no retry. A single 0.5s retry is now attempted before surfacing the error.
* Fixed: AI action buttons (Check with AI, Analyze Logs, Analyze Firewall) remained enabled at zero token balance, showing a 402 error after the call was already made. Buttons are now disabled with a tooltip showing the required token count when balance is insufficient.
* Fixed: Long AI calls (15-60s) showed no feedback — UI appeared frozen. A persistent info toast now appears at call start, and the button label shows elapsed seconds after 5s ("Analyzing... 12s").
* Fixed: Batch token deduction happened at result retrieval, allowing users to submit jobs beyond their balance. Tokens are now reserved atomically at batch submission with reconciliation at retrieval and full refund on cancel.
* Added: Redis response caching for deterministic SEO and content AI calls (TTL: 24h SEO, 1h content). Security and migration calls are never cached. Cache hit returns in <100ms at zero token cost.
* Added: token balance returned in API responses for analyze-file, ai-audit, and full-ai endpoints, allowing the frontend to update the balance display without an extra round-trip.

= 2.9.28.27 =
* Fixed: Bulk "Check with AI" showed "AI analysis failed — none of the 10 files could be analyzed" when all selected findings were about missing files (readme.html, missing core files, etc.). These files don't exist on disk so there is no content to analyze. The bulk handler now filters out missing-file findings (categories: known_safe_missing, core_missing, bundled_plugin/theme where status is missing) before running the AI chain. If all selected findings are non-analyzable, a clear error toast is shown. If some are skipped, an info toast reports how many were skipped before running AI on the rest.

= 2.9.28.26 =
* Fixed: Bulk "Check with AI" showed "Analysis request failed — check your connection" for every file in the batch, followed by a false "AI analysis complete" success toast. Root cause: `handleAiAnalyze` always fired an error toast on exception even when called from the sequential bulk chain; the chain reported success regardless of per-file outcomes. In bulk mode, per-file error toasts are now suppressed and the chain tracks succeeded/failed counts. The completion summary now accurately reports "N of M files analyzed" or "none could be analyzed" when all fail.

= 2.9.28.25 =
* Fixed: Full AI Scan never completed on Hostinger after four prior fix attempts (v2.9.28.21 through v2.9.28.24). Every cron-based approach failed because Hostinger blocks WP-Cron loopback requests (both `spawn_cron()` and `SwissWPSuite_Cron_Helper::spawn()`). Every inline-execution approach failed because Hostinger's LiteSpeed edge CDN kills PHP workers at ~60 s and the combined L1+L2 scan takes 45-90 s. The scan is now split into two phases driven by a state machine inside the `/security/scan/full-ai/status` polling endpoint: Phase 1 runs Layer 1 only (~30-45 s, local filesystem/config audit), Phase 2 runs Layer 2 only (~15 s, VPS AI analysis). Each phase finishes well under the edge timeout, and a Phase 2 failure degrades gracefully to an L1-only result instead of failing the entire scan. All cron-scheduling paths (`wp_schedule_single_event`, `SwissWPSuite_Cron_Helper::spawn()`, the `swisswpsuite_fullai_scan_job` hook, and its dispatcher method) have been removed.

= 2.9.28.24 =
* Fixed: Full AI Scan times out after 5 minutes with "Scan is taking longer than expected" on Hostinger/LiteSpeed. v2.9.28.22 moved the 504 Gateway Timeout problem from `/start` to `/status` by running the scan inline inside the polling REST request — which then blocked for 30-90s and got killed by Hostinger's ~60s edge timeout. The `/status` endpoint is now a pure transient reader (no scan logic). The scan runs in a dedicated WP-Cron loopback worker with `set_time_limit(0)` + `ignore_user_abort(true)`, kicked off by `SwissWPSuite_Cron_Helper::spawn()` (the proven non-blocking loopback pattern used by the SEO background queue). No more edge timeouts on the scan path.

= 2.9.28.23 =
* Fixed: `POST /security/analyze-file` rejected valid in-root files (e.g. `readme.html`, `wp-content/themes/.../comments.html`) with a 400 "File path is outside WordPress root" response on Hostinger. The path validator is rewritten: every path is now resolved to an absolute candidate BEFORE `realpath()` is called (PHP resolves relative paths against an undefined cwd inside REST), and the containment check compares canonical symlink-resolved strings on both sides. Missing files now return 404 `file_not_found` instead of 400 `invalid_path` for clearer errors.
* Hardened: `handleAiAnalyze` and the legacy bulk-analyze path in the Security Hub now short-circuit if a parent scan (Full AI / AI Audit / Malware / Deep) is still polling in the background, preventing any unintended re-entrant analyze-file bursts during scan completion.

= 2.9.28.22 =
* Fixed: Full AI Scan stuck on "pending" forever on Hostinger/LiteSpeed. `spawn_cron()` loopback requests are blocked by LiteSpeed, leaving the WP-Cron event scheduled but never executed. The status polling endpoint now detects stale `pending` jobs (3+ seconds old) and runs the scan inline, using an atomic transient claim as a concurrency guard.

= 2.9.28.21 =
* Added: Async Full AI Scan — new `POST /security/scan/full-ai/start` + `GET /security/scan/full-ai/status` endpoints break the scan into a fire-and-poll pattern. Fixes the Hostinger edge 504 timeout that killed Full AI Scan under shared-host load.
* Added: Bulk "Check with AI" safety guardrails — cap of 10 files per click (with in-app confirmation modal when exceeded), live "Analyzing N of M…" counter, single summary toast on completion. Prevents 400+-file floods that burned tokens and spammed the toast area.
* Fixed: `/security/analyze-file` no longer rejects valid in-root relative paths (e.g. `wp-content/themes/.../file.php`) with a misleading 403 "Authentication failed" toast. Path resolution against ABSPATH is now explicit; status code changed to 400 so the real message surfaces.
* Fixed: `wpApi()` no longer overrides genuine 403 JSON messages (e.g. "Pro licence required.") with the generic "Authentication failed. Please refresh the page." fallback. The fallback still applies when the 403 body is empty.

= 2.9.28.20 =
* Fixed: F-1 — Scan handlers (`/security/scan/ai-audit`, `/security/scan/full-ai`) now return HTTP 500 with `{success:false, code:'scan_failed', message}` when the orchestrator reports a generic error (e.g. Sentinel unavailable), instead of wrapping the error in a 200 OK envelope.
* Fixed: F-2 — SecurityHub scan handlers now check `envelope.success` before committing the result to state, preventing a `TypeError: Cannot read properties of undefined (reading 'length')` crash on `result.summary`.
* Fixed: F-3 — `AiAuditResult.tier` and `ScanHistoryRecord.tier` widened to `'free' | 'pro' | 'none'` to match PHP `classify_tier()` output when no license is active.

= 2.9.28.19 =
* Changed: Restored filled button theme across new Sprint 1.5 components — ScanResultPanel batch actions (Mark Safe/Quarantine/Delete/Analyze), UpdateReviewPanel Approve, UpdateBlockedBanner Override, SeoManager action button.
* Added: "Check with AI" bulk action button in scan result panels for Pro users — analyzes N selected findings with AI; Pro-gated with Lock icon for free tier.

= 2.9.28.18 =
* Security: C-1 — Path-traversal guard added to snapshot restore endpoint (mirrors delete handler); token now rejected before issuance if path escapes snapshots dir.
* Security: C-2 — `plugin_file` param validated with regex + explicit `..` check before reaching `deactivate_plugins()`.
* Security: C-3 — VPS allowlist slugs regex-filtered before caching; empty string and path fragments rejected.
* Security: H-2 — `GET /update-guard/reviews` now requires Pro capability (was any-admin, inconsistent with Approve/Reject).
* Fix: H-1 — `calculate_confidence()` made `public static`; `post_apply_verify()` calls it directly instead of duplicating 13-line inline scoring loop.
* Fix: H-3 — `verify_integrity()` now fails closed on unreadable, corrupt, and empty manifest (was fail-open on all three).
* Fix: H-4 — Rollback lock file moved to `.htaccess`-protected `swisswpsuite-snapshots/` subdir (was web-accessible uploads root).

= 2.9.28.17 =
* Feature: Virtual Patching Phase 2 — Update Guard now supports `review_first` and `block_on_match` modes; malicious plugin updates are blocked at `upgrader_source_selection` and auto-rolled back post-apply when confidence exceeds 70%.
* Security: Three HIGH vulnerabilities fixed in rollback engine: slug path traversal guard, symlink escape via glob, and override transient now correctly consumed as one-time bypass.
* Feature: SnapshotList, UpdateReviewPanel, UpdateBlockedBanner React components — full approve/reject queue, two-step restore confirmation, idempotent override button.
* Fix: WCAG 2.1 AA audit: 9 a11y findings fixed across UpdateGuard components (APG radio keyboard pattern, always-mounted live regions, role="alert" key cycling for repeat errors).

= 2.9.28.16 =
* Fix: Update Guard `last_verdict` now serialises as `{}` (empty object) instead of `[]` (empty array) when no verdict recorded, matching the TypeScript contract.
* Fix: `SwissWPSuite_Update_Snapshot::write_security_files()` now checks return values of `@file_put_contents()` for `.htaccess` and `index.php` and logs a warning on failure (prevents silent web exposure of snapshot directory).

= 2.9.28.15 =
* Virtual Patching Phase 1 (observe-only): SwissWPSuite_Update_Guard intercepts WordPress updater hooks — snapshots plugin state before each update, scans the installed files post-apply, logs URL allowlist violations. Never blocks in Phase 1. Free + Pro tiers. UI card in Security Hub (read-only).

= 2.9.28.14 =
* Malware Scan: per-file "Check with AI" / "Analyze" button restored on actionable threat rows (Pro-gated). Was present in v2.9.27.x via ScanResultsTable, removed in Sprint 1 scan consolidation (v2.9.28.0), now rewired to the new ScanResultPanel/MalwareResultView architecture.

= 2.9.28.13 =
* Malware Scan: bulk selection (select-all + per-row checkboxes + Mark Safe / Quarantine / Delete batch bar) now appears for low-risk findings on clean sites too. Previously only the actionable (medium+) threats block rendered the bulk UI, leaving users unable to bulk-ignore the collapsed low-risk list.

= 2.9.28.12 =
* Version bump for release pipeline (pre-commit hook: zip-collision guard resolved).

= 2.9.28.11 =
* AI Security Audit: restored bulk selection UI (select-all checkbox, per-row checkboxes, batch-action bar with Mark Safe / Quarantine / Delete buttons) that was silently dropped in v2.9.28.0 when ScanResultsTable was replaced by ScanResultPanel. Applies to AI Audit, Malware, and Full AI scan result panels.

= 2.9.28.10 =
* AI Security Audit: restored "Fix: ..." remediation text per finding (was dropped in v2.9.28.08 transform refactor).
* AI Security Audit: restored Quarantine and Mark Safe per-finding action buttons.
* Scan: Full AI scan also wires Quarantine and Mark Safe action buttons.

= 2.9.28.09 =
* Quick Scan info banner: removed false "reviewed by our AI" claim. Quick Scan is local checksum + regex comparison only. No AI is involved.

= 2.9.28.08 =
* Quick Scan: `info` and `low` severity findings (bundled plugins, known-safe missing files, theme edits) no longer count toward the headline "threats found" number. A clean site now correctly shows 0 threats even when 44 informational items are listed.
* Quick Scan results now show an AI-review info banner explaining how low-risk baseline deviations are filtered, plus a collapsible "Low-risk findings" section separate from actionable threats.

= 2.9.28.07 =
* CRITICAL FIX: WAF no longer locks admins out of wp-login.php. Activator now uses idempotent add_option() — existing settings are preserved on upgrade.
* Safe default: simulation_mode='yes' on fresh install. Admins must consciously enable live blocking.
* New: Admin IP safelist (max 3 IPs, 30-day TTL). IPs of admins who successfully log in are remembered and always bypass the WAF.
* New: WAF skips pattern scanning on wp-login.php (brute-force protection via authenticate filter still applies).
* Upgrade to v2.9.28.07 automatically clears all existing IP bans and WAF violation counters — one-time emergency unlock for users previously affected.

= 2.9.28.06 =
* Fixed: All primary buttons and mode-toggle selected states now use text-white on bg-swiss-navy — resolves invisible text bug in light mode (text-foreground resolved to near-black on dark navy background).
* Fixed: Button.tsx primary variant globally corrected — every Start Scan, AI Audit, and Full AI Scan button is now readable.

= 2.9.28.05 =
* Fixed: Deep malware scan now completes all batches — orphan cleanup threshold raised to 120s, and scan_running flag is set before start_scan() so the first status poll no longer kills the in-progress scan.
* Fixed: Quick/Deep mode selector buttons restored to plugin design system (bg-swiss-navy selected, bg-secondary unselected) — matches all other toggle buttons in the plugin.
* Fixed: Dashboard icon containers restored to correct token usage (bg-swiss-navy/bg-swiss-red + text-white for active, bg-secondary + text-neutral-700 for inactive).

= 2.9.28.04 =
* Fixed: Quick/Deep scan mode buttons now show correct contrast in both light and dark mode (text-card-foreground replaces fixed gray that was invisible on dark backgrounds).
* Fixed: Deep malware scan now polls for completion instead of displaying "0 threats" from the initial queued response — results are now accurate.
* Added: "Mark as Safe" button on malware scan findings — whitelist individual files to skip them in future scans.
* Fixed: Security Audit card now explains it uses a different detection method than the malware scanner (configuration/integrity vs. file signatures).

= 2.9.28.02 =
* Fixed: Security Audit scan card description clarified — now states it runs via SwissWPSuite's own AI quota (no user API key required) on Free and Pro plans.
* Fixed: History tab now correctly labels AI Security Audit scans as "AI Audit" (not "Quick Scan") and displays the derived security grade.
* Fixed: Scan result inline panel stays on Scan tab after completion; "View in History →" is now a secondary action, not forced navigation.
* Fixed: 2FA Pro gate in TwoFactorSettings now checks three signals (capabilities, sentinelIsPro, tier) for reliability.

= 2.9.28.01 =
* Fixed: Malware scan crash — SwissWPSuite_Security constructor now receives required plugin_name and version arguments in orchestrator.
* Fixed: TierBadge on ScanCard now shows the scan's required tier (free/pro) instead of the user's active license tier.
* Fixed: Null safety guards on files_scanned and threats_found in ScanCard and ScanResultPanel — no more NaN display.
* Fixed: "View in Security Hub" dead text replaced by functional onViewHistory button navigating to History tab.
* Fixed: Old AI Audit entry point in SecurityHub dashboard replaced by "Security Audit →" tab navigation link.
* Fixed: Historical scan detail view now shows full findings list with grade badge and AI summary inline.
* Fixed: WAF Advisor and AI Log Advisor relocated from Logs tab to Dashboard tab for correct placement.
* Fixed: Daily cron report log module corrected from 'scan_cron' to 'scan_orchestrator' in all Diagnostics::log() calls.

= 2.9.28.0 =
* Fixed: WAF silent failure on plugin reinstall — update_option() now always sets firewall_enabled='yes', simulation_mode='no', block_sqli='yes', block_xss='yes' on activation, overwriting any stale values.
* Fixed: Free users could not toggle WAF on/off — 'firewall' removed from pro_only_options gate, toggle now works on all tiers.
* Added: Scan Consolidation — 5 overlapping scan types replaced by 3 clean scans: AI Security Audit (Free+Pro, cron 24h), Malware Scan (Free+Pro, manual), Full Scan with AI (Pro only, cron 24h).
* Added: SwissWPSuite_Scan_Orchestrator — single entry point routing all scan types with tier classification, 23h throttle guard, and daily cron report.
* Added: SwissWPSuite_Scan_Report_Mailer — tier-aware email report (Free: AI Audit only; Pro: AI Audit + Full Scan; Update Guard section when Phase 2 ships).
* Added: New cron hook swisswpsuite_daily_scan_report (daily) replaces fragmented sentinel_scan + scheduled_scan pair.
* Added: Scan report email configuration (recipient override, enabled toggle, test-send with rate limit) via new REST endpoints.
* Added: SecurityHub Scan tab redesigned with ScanCronStatusBanner, ScanCard, ScanResultPanel, ScanReportPreviewModal, ScanReportSettingsPanel — all WCAG 2.1 AA compliant.
* Deprecated: /security/sentinel/audit, /security/sentinel/full-scan, /security/deep-scan/start endpoints (2-version window, aliases to new routes, X-SwissWPSuite-Deprecation header).

= 2.9.27.94 =
* Fixed: Daily security report failure log now distinguishes pre_wp_mail interception (another plugin short-circuiting wp_mail before PHPMailer runs) from PHPMailer exceptions. Log shows actionable root cause instead of generic "no WP_Error captured".
* Fixed: Send-now endpoint returns HTTP 400 with rootCause php_mail_disabled when SMTP host is empty and PHP mail() is in disable_functions — surfaces the problem immediately instead of silent wp_mail() false.
* Added: php_mail_disabled to SmtpTestRootCause TypeScript union.

= 2.9.27.93 =
* Fixed: SMTP host configured without username no longer breaks all site mail — configure_phpmailer_smtp() now skips SMTP and falls back to PHP mail() when username is empty, logging a clear diagnostic instead of failing silently.
* Fixed: Send-now endpoint returns HTTP 400 with rootCause no_smtp_credentials when SMTP host is set but username is missing — surfaces actionable error instead of silent wp_mail() failure.
* Fixed: SmtpSettings.tsx shows amber callout with instructions when send-now reports no_smtp_credentials.
* Fixed: WP_Error detail from wp_mail_failed now included in daily security report failure log — replaces useless "wp_mail returned false" with actual SMTP error reason.

= 2.9.27.92 =
* Fixed: Sentinel L2 (deep AI) scan JSON truncation / HTTP 502 — MAX_L2_FINDINGS reduced from 25 to 15. Prioritisation by severity preserved, so the 15 most security-relevant findings are always sent to the AI. Eliminates mid-response truncation observed in production on sites with 40+ L1 findings.
* Fixed: Backup health-check now uses an adaptive stale threshold — EWMA of this site's actual tick durations × 2.5 (clamped to 300-900s). On fast hosts it collapses to the old 300s floor; on slow shared hosts it grows so the watchdog stops pre-empting in-progress ticks and causing parallel job spawns.
* Fixed: Google Drive retention delete_file() now checks refresh-token return value — was the last GDrive call site that silently proceeded with a dead access token on refresh failure.
* Added: Persistent SMTP health snapshot in the SMTP settings panel. Shows "Last email send: succeeded/FAILED (when, context, reason)" without requiring a diagnostic test — updated on every daily-report send and every test email.
* Added: swisswpsuite_backup_avg_tick_ms and swisswpsuite_smtp_health option keys (operational state, autoload=false, excluded from backup exports).

= 2.9.27.91 =
* Fixed: Backup health-check false positives — STALE_THRESHOLD raised from 120s to 300s so legitimate slow backups on shared hosting no longer get killed and restarted in parallel
* Fixed: Google Drive cloud backup now surfaces a real "re-authenticate" error when the OAuth refresh token is stale/revoked — previously returned an empty list silently
* Fixed: Silent SMTP failures on the daily security report are now surfaced as a dismissible admin notice on the next admin page load, instead of being buried in the diagnostics log
* Added: swisswpsuite_smtp_failure_notice operational-state option (excluded from backup/migration, self-clears on next successful send)

= 2.9.27.90 =
* Added: XOR obfuscation fallback for hosts without Sodium/OpenSSL — SMTP password always saveable on any PHP 7.4+ server
* Added: Port connectivity pre-check (fsockopen, 5s timeout) before SMTP test — detects hosting firewall blocks with actionable port suggestions
* Added: Competing SMTP plugin detection (WP Mail SMTP, FluentSMTP, PostSMTP, Easy WP SMTP) with admin notice
* Added: PHP mail() availability indicator — warns when neither SMTP nor PHP mail() is usable
* Added: SMTP error message mapper — translates raw PHPMailer errors into actionable user instructions
* Added: AUTH_KEY rotation guard in configure_phpmailer_smtp — decryption failure logs clearly instead of silently using empty password
* Added: wp-cron status panel + "Send Daily Report Now" button in SMTP settings
* Added: Cache-Control no-cache/no-store headers on all SMTP REST responses
* Added: GET /smtp/environment endpoint for host environment probing

= 2.9.27.89 =
* Fix: SMTP test now captures wp_mail_failed at priority 1, probes PHPMailer effective state, and returns root-cause classification (password_decrypt_failed, not_smtp_mode, no_password, etc.) with saved-vs-actual config diff
* Fix: SMTP password field now has explicit "Change" button + onBlur restores mask if field left empty — prevents confusion when re-entering a saved password

= 2.9.27.88 =
* Fix: API error handler now surfaces real server error (HTTP status + response body snippet) instead of opaque "An unknown API error occurred" — PHP fatals, Cloudflare/nginx errors, and non-JSON responses are now visible to the user

= 2.9.27.87 =
* Fix: SwissWPSuite_Encryption class now loaded at boot — was never require_once'd so SMTP password save and cloud OAuth token encryption silently failed
* Side-effect fix: Google Drive and Dropbox OAuth tokens will now be encrypted at rest on next save (plaintext-migration fallback handles existing tokens)

= 2.9.27.86 =
* Fix: SMTP test now returns HTTP 400 (not silent success) when no SMTP host is saved — closes the PHP mail() silent-fallback path on Hostinger
* Fix: SMTP settings panel now shows "unsaved changes" banner and disables Test button until settings are saved, preventing the "green checkmark but no email" UX trap
* Fix: From Email field label and help text clarified — no separate SMTP account needed; blank = auto-use SMTP username

= 2.9.27.85 =
* Fix: SMTP From address fallback to username when From field is empty (prevents Hostinger silent discard)
* Fix: SMTP test endpoint returns 400 with descriptive error when both From and username are invalid

See [CHANGELOG.md](CHANGELOG.md) for the full version history.

= 2.9.27.84 =
* Added: Plugin safety wrapper — fatal boot errors are now caught, logged to wp-content/swisswpsuite-error.log, and surfaced as an admin notice instead of causing a white-screen. Activation Bunker connectivity check deferred to admin_init so a network blip cannot abort activation.
* Added: Built-in SMTP settings panel under Settings > General. 13 host presets (Hostinger, SiteGround, Bluehost, GoDaddy, DreamHost, IONOS, OVH, Namecheap, Gmail, Outlook, Brevo, SendGrid, Custom), password encrypted at rest via SwissWPSuite_Encryption, Send Test Email button.

= 2.9.27.83 =
* Fixed: Pro users were hitting a 120-requests-per-hour rate cap on core + deep security scan endpoints, identical to Free tier. Pro users now exempt, matching the existing full_scan and sentinel_audit exemption pattern.

= 2.9.27.82 =
* Build: Excluded `vendor/` (PHPUnit + Mockery + dev-only test infrastructure) from the production zip — no runtime Composer dependencies; drops release zip from ~2.9MB back to ~1.1MB
* Build: Added comment in build_plugin.sh documenting why vendor/ is omitted and how to re-introduce prod deps if ever needed (composer install --no-dev)

= 2.9.27.81 =
* Fixed: CRIT-1 — Background SEO queue now correctly routes image attachments to vision model (generate_image_seo) instead of text model
* Fixed: CRIT-2/3 — Image and text SEO workers now throw on empty Groq responses instead of silently marking items complete
* Fixed: CRIT-4 — Background queue only pushes post_id to completed[] when writes were actually made (updates > 0)
* Fixed: CRIT-5 — Batch ingestion regex now matches attachment custom_ids; FAQ $m[2] undefined index fixed to $m[1]; STATUS_APPLIED gated on $saved > 0
* Fixed: HIGH-5 — _swisswpsuite_seo_processed_at now written AFTER successful work, not before; failed items no longer permanently blacklisted
* Fixed: HIGH-1 — Sync SEO endpoint returns 502 instead of 200 when Groq response is empty
* Fixed: HIGH-3 — Background status polling now surfaces last_error and last_item_error fields
* Added: SwissWPSuite_Groq::assert_result_has_content() shared guard used across all 6 Groq consumer call sites
* Fixed: Upgrade migration now reclaims orphan _swisswpsuite_seo_processed_at markers from silent-success path

= 2.9.27.80 =
* Fixed: "Generate SEO for All" no longer returns empty when items exist — filter now checks BOTH missing titles and missing descriptions
* Fixed: SEO Health Report dialog now scrolls correctly inside viewport (sticky header + sticky Close footer, scrollable body, 90vh max)
* Added: Per-category one-click fix buttons in SEO Health Report — "Generate Alt Text for All", "Generate SEO for All Pages/Posts/Products"
* Fixed: SEO Health badge count no longer inflated by unfixable thin-content pages; informational note shown separately
* Fixed: SEO score ceiling formula now realistically credits all fixable items; no longer pessimistically penalizes missing metadata
* Fixed: Bulk post enhance retry loop — 5xx and network errors now retry with exponential backoff; Firefox NetworkError case-insensitive match
* Changed: Content Enhancer scoped back to WooCommerce products only — posts/pages/images no longer duplicated between SEO and AI Content pages
* Fixed: SEO Health category buttons now correctly use the chosen content type (no stale activeTab closure) and bypass the two-click confirm

= 2.9.27.79 =
* Added: SEO bulk batch persists to localStorage; auto-resumes polling after tab close (F-224/F-225)
* Added: Settings save concurrent-edit protection via settings_version hash + HTTP 409 (SET-031)
* Fixed: Groq shared parse-failure guard — empty body / invalid JSON return WP_Error (F-230)
* Fixed: job_status TypeScript union corrected (pending/error added, completed removed) (F-239)
* Fixed: SEO bulk "Queue Running" banner auto-clears on completion/failure/expiry
* Fixed: Sentinel sync status drift — PHP emits 'unknown' to match TS union
* Fixed: 8 additional LOW findings (CE-001/002/003/006, SET-012/013/016/017, F-253, F-231, F-238)

= 2.9.27.78 =
* Added: SEO test suite — 45 test methods, 5 test classes (F-209)
* Added: SeoBackgroundStatus + SeoBatchStatus TypeScript interfaces (F-214/F-215)

= 2.9.27.77 =
* Added: Customer management UI on VPS admin dashboard (F-163)
* Added: VPS structured logging and session auth middleware
* Fix: GDrive auth error fast-fail in backup engine (F-261)
* Fix: CreateBackupResponse type corrected (F-264/F-265)
* Fix: Bulk apply response + per-promise catch (CE-004/CE-005/F-184)
* Fix: Category fetch abort controller cleanup (F-181)
* Fix: Empty permalink guard in llms.txt (F-220)
* Fix: 5 SEO options cleaned on deactivation (F-213)
* Fix: FAQ fetch error handling in SeoManager (F-219)
* Fix: Encryption confirm + API key validation (SET-008/SET-022/SET-027)
* Fix: 11 missing activator defaults (SET-006)
* Fix: Responsive CSS on VPS admin dashboard (F-175)
* Security: Groq DPA documented in privacy policy (F-166)
* Docs: Docker iptables safe-by-design (F-169)

= 2.9.27.74 =
* Fix: SEO Enhance ~40% failure rate resolved — response_format now sent for all API paths, enabling JSON enforcement on Groq (F-204)
* Fix: 3 newer hardening options (restrict_llm_crawlers, restrict_google_indexing) added to security level presets and apply_all_recommended (F-089)
* Audit: 6 findings confirmed already fixed in prior versions (F-104, F-179, F-206, F-207, F-208)
* Audit: 12 findings reclassified as FALSE_POSITIVE after code verification (F-177, F-205, F-243-F-249, F-251, F-254, F-255)

= 2.9.27.73 =
* Fix: Sentinel backup cancel_engine_state_for_job() regex corrected (auto→automation) — prevents zombie engine resurrection loops (F-282)
* Fix: Backup cancel flag path unified across archiver and all 5 cloud providers — cancel button now works in archiver path (F-283)
* Fix: PII post-type blocklist unified into single canonical source — EDD/LifterLMS/GiveWP + WooCommerce HPOS now all protected (F-284)
* Fix: HTTPS enforcement extracted to shared method in API sync — 11 duplicate preg_replace calls consolidated (F-285)
* Fix: backup_current_job option key added to config manifest (F-286)
* Security: axios upgraded in VPS to patch GHSA-fvcv-3m26-pcqx and GHSA-3p68-rc4w-qgx5 (F-278)
* Security: Rate limiting added to /batch/results, /batch/status, /batch/cancel VPS endpoints (F-279)
* Security: Additional npm dependency vulnerabilities resolved — 0 audit findings (F-287)

= 2.9.27.72 =
* Fix: BatchQueueJob.status enum corrected — "running" → "processing", added "applied" to match PHP STATUS_* constants
* Fix: SeoManager slow-batch progress banner removed phantom job.failed_requests field (no DB column); failed count display removed

= 2.9.27.71 =
* Fix: CC-001 — Sentinel job ID mismatch (backup_auto_ vs backup_automation_); watchdog now correctly identifies and circuit-breaks stalled automation jobs
* Fix: SYNC-SEC-1 — Sync push nonce moved from Redis-evictable transient to DB-backed option (autoload=false) with daily cleanup cron
* Fix: SYNC-BE-4 — Raw REMOTE_ADDR replaced with CF-aware SwissWPSuite_Security::get_client_ip() for sync IP logging
* Fix: SYNC-BE-5 — FSE template theme slug normalized to local active theme on upsert to prevent theme mismatch
* Fix: NEW-1 — FSE template meta now synced with same blocklist as capsule upsert; prevents dangerous meta injection
* Fix: BKP-HIGH-1 — Mode A SQL blocklist now includes CALL, SET SESSION, SET LOCAL, SET PASSWORD, SET ROLE (parity with Mode B receiver)
* Fix: BKP-HIGH-2 — stream type comparison is now case-insensitive (strtolower normalization)
* Fix: SEO-HIGH-3 — Slow batch queue never polled job_id for completion; useEffect polling with 60s interval + toast on completion added
* Fix: SEO-HIGH-6 — SeoBatchStatus TypeScript interface was missing from types.ts; added with full shape
* Fix: LicenseManager — Token usage bar was hardcoded to 85%; now computed from balance/token_limit
* Fix: admin.php — Bare SwissWPSuite_Token_Manager instantiation wrapped in class_exists + try/catch guard
* Fix: F-NEW-001 — automation_id typed as string instead of string|null; BackupAutomation interface updated
* Fix: F-NEW-002/F-NEW-003 — Unchecked file_put_contents return values in backup engine and quarantine htaccess
* Fix: NEW-4.3 — Migration profile now persisted to wp_options at import start for cross-chunk durability
* Fix: A-01 — QR code SVG missing aria-label in TwoFactorSettings
* Fix: C-03 — GeneralSettings alertEmail not initialized from adminEmail default

= 2.9.27.69 =
* Fix: Single-apply attachment guard now accepts field:'description' (frontend path) in addition to 'altText'
* Fix: Alt text sanitization uses sanitize_text_field() instead of wp_kses_post() — correct for plain-text meta
* Fix: Upgrade migration idempotency guard uses version_compare so .68-migrated sites also receive URL-variant normalization
* Fix: URL variant normalization in migrate_sync_origin_stamps() matches www/non-www and http/https URL variants

= 2.9.27.68 =
* Fix: SYNC-D001 upgrade migration — rewrites URL-format _swisswpsuite_sync_origin postmeta to conn_* UUID format; collision guard now works for pre-v2.9.27.67 synced posts
* Fix: Attachment rewrite now has per-field AI instructions (title/description/caption); image description rewrites correctly target _wp_attachment_image_alt alt text meta

= 2.9.27.67 =
* Fix: SYNC-C001 — upsert_capsule() triple-write destroyed WPML meta; fixed meta_input handling + wpml_media_processed blocklist
* Fix: SYNC-D001 — sync source_connection_id stamped as URL instead of conn_* UUID; collision check now resolves
* Fix: SEO background queue poll stale closure never fired completion; fixed with useRef mirrors
* Fix: rewriteTitles toggle had no effect on background queue batches; now plumbed end-to-end
* Fix: CE-01 — ContentEnhancer broken on non-WooCommerce sites; type-aware rewriting for post/page/attachment
* Fix: bulk_apply_content_rewrite IDOR risk; added post-type guard
* Fix: restore_content_item always returned success=true; now returns actual restored count

= 2.9.27.66 =
* Docs: Post-ship documentation update — all capability references, agent memories, and PROJECT_MEMORIES.md updated for v2.9.27.65 audit sprint
* Chore: 16 treated audit reports archived; live test result (8/8 confirmed) recorded; Bug #21 Vite code-split false-negative corrected

= 2.9.27.65 =
* Security: HMAC sync key stripped from GET /sync/connections; API keys masked with has*Key booleans; loginMaxRetries bounded [1,20]; realpath symlink guard on download
* Fixed: SQL import parser comment-state persistence; GDrive 404/410 session re-init; Mode B receiver two-pass hash (no more always-403); preserve_users covers DELETE/UPDATE/REPLACE; phase_prune uses automation_id metadata; alertEmail delete_option on clear; stall detection uses byte-offset
* Fixed: ContentEnhancer all 4 tabs active + Images type=image + restore parity; SyncManager focus trap WCAG 2.1; GeneralSettings per-field autoSave
* Fixed: HPOS order types added to sync PII blocklist; list_local_backups no silent deletes on GET
* Added: VPS module attribution in token_logs (ai.js + migration v14)

= 2.9.27.64 =
* Security: License keys masked in VPS logs — 4 log sites in license_new_v2.js now print `SWS-XXXX…YYYY` instead of full keys (F-138)
* Security: Admin recovery endpoint (/v1/admin/recover) now persists new API key to settings table and activates it in-memory (F-139)
* Security: Added charge.refunded Stripe webhook handler — refunded customers now have licenses automatically revoked (F-142)
* Security: Atomic CAS domain lock in sentinel.js — prevents race condition where two concurrent first-scans could both claim domain lock (F-154)
* Fixed: Raised plugin AI timeout from 60s to 125s to match VPS Groq ceiling (120s) — prevents "paid but no response" timeouts on long completions (F-141)
* Added: Payment failure email sent to customer with update-payment link on invoice.payment_failed (F-143)
* Added: PAST_DUE license status accepted by sentinel.js /analyze — scans now work during Stripe retry window, matching ai.js behavior (F-153)
* Added: Daily data retention cron (F-144) — deletes token_logs older than 90 days and stripe_events older than 365 days (GDPR Art. 5(1)(e))

= 2.9.27.63 =
* Security: ZIP bomb protection added to receiver — rejects zip entries >50MB or total extraction >300MB
* Security: `fix-missing-titles` endpoint now uses capability gate instead of pro permission
* Fixed: SEO cleanup stuck items now uses NOT EXISTS subqueries — only removes markers for items with no success AND no failure markers
* Fixed: SEO bg_queue writes `_swisswpsuite_seo_processed_at` marker after each post to prevent duplicate processing
* Fixed: noindex posts excluded from XML sitemap via meta_query
* Fixed: wp_page_for_login excluded from SEO optimization targets
* Fixed: Bulk Apply now returns failed item IDs and surfaces warning toast in ContentEnhancer
* Fixed: Transport throws RuntimeException on file write failure; caller returns HTTP 500 (no more silent data loss)
* Fixed: Backup signing secret logs WARNING on placeholder salts to prevent silent HMAC failures
* Fixed: Self-destruct checks .htaccess write return value and logs on failure
* Fixed: Encryption password corruption detection added to settings diagnostics
* Fixed: Sync `download_url()` failure now logged via Diagnostics
* Fixed: `delete_connection()` cleans up orphaned `_swisswpsuite_sync_origin` postmeta
* Removed: Dead `Settings.tsx` component (523 lines, zero importers — routing uses SettingsPage.tsx)
* Docs: SYNC_ARCHITECTURE.md updated — 3-way comparison strategy replaces outdated "Newest Wins" description

= 2.9.27.62 =
* Security: Blocked SSRF redirect-chain bypass in custom API ping (redirection=>0)
* Security: Prevented license key exfiltration via Groq constructor when BYO key absent
* Fixed: PHP 8.0+ TypeError crash in bulk hasHistory query on DB failure (null coalescing)
* Fixed: Custom API test incorrectly accepted HTTP 204 and non-chat endpoints as "success"
* Fixed: Sync origin collision guard now handles deleted connections correctly
* Fixed: response_format re-enabled for BYO custom API users (Bunker users unaffected)
* Fixed: LLM.txt generation now function_exists-guarded for headless/minimal WP installs
* Fixed: Content Enhancer "Fun & Witty" tone value enum mismatch with REST API

= 2.9.27.61 =
* Fixed: Mobile tab bar overflow — Security Hub, SEO, and Settings tabs now accessible on 375px viewports
* Fixed: Backup list Restore/Delete action buttons now visible via sticky positioning on mobile
* Fixed: SEO content area 254px horizontal overflow resolved with min-w-0 constraint

= 2.9.27.60 =
* Fixed: POST /content/{id} now requires Pro-tier content_rewrite capability (F-111)
* Fixed: update_content_item post_type restricted to product/post/page/attachment allowlist (F-112)
* Fixed: /seo/onpage-audit corrected to seo_meta capability check (F-129)
* Fixed: save_meta_history uses add_post_meta unique=true to preserve original value (F-110)
* Fixed: Empty AI rewrite result returns 422 with error message instead of silent success (F-114)
* Fixed: All wp_update_post calls in SEO worker check return value for WP_Error (F-122)
* Fixed: SEO batch staleness detection (20-min threshold) + daily cleanup cron (F-126)
* Fixed: wp_cache_delete added to sync scheduler save/delete to prevent stale reads (F-108)
* Fixed: Attachment LIKE query uses directory-boundary prefix + exact-match fallback (F-102)
* Fixed: PII post type blocklist extended with edd_payment, give_payment, llms_order (F-105)
* Fixed: 3 SEO cron hooks registered in config manifest (F-120/F-121/F-133)
* Fixed: All (window as any).swisswpsuiteData casts removed, backed by vite-env.d.ts (F-117)
* Fixed: Dashboard .license?.plan corrected to .license?.tier (F-131)
* Fixed: LicenseManager explicit TokenStatus construction (F-132)
* Fixed: ContentEnhancer parses 422 error body for specific AI error toast (F-130)
* Fixed: "Missing SEO" badge renamed to "Needs Attention" (F-127)
* Added: Per-license-key rate limiters on VPS AI and Sentinel routes (F-092/F-093/F-094)

= 2.9.27.59 =
* Fixed: chain_next_tick() now uses sslverify=>false for loopback — Hostinger self-signed cert caused silent HTTP 0 failures stalling the engine tick chain (P1-A)
* Fixed: chain_next_tick() deferred to WordPress shutdown action at priority 999 — LiteSpeed LSAPI was killing the loopback before response completion (P1-B)
* Fixed: Diagnostics::log() DB write moved to after wp_remote_post() in chain_next_tick() — eliminates blocking write on the critical pre-loopback path (P1-C)
* Fixed: spawn_worker() in Sentinel restored sslverify=>false — HIGH-3 FIX incorrectly removed it; loopback SSL verify is not a MITM protection; shared secret is the real gate (P1-D)
* Fixed: Concurrent automation stagger in chain_next_tick() — 0.5-1.5s random delay when another engine job is active, prevents exhausting Hostinger 10-worker PHP pool (P1-E)
* Fixed: Upgrade migration purges stale log noise entries and fixes autoload=true on swisswpsuite_debug_log for existing installs (P2-A)
* Fixed: Diagnostics update_option now passes autoload=false — 500-entry serialized arrays must not load on every WP page load (P2-B)
* Fixed: Consecutive-duplicate deduplication in Diagnostics::log() prevents chatty calls from filling the 500-entry buffer (P2-C)

= 2.9.27.57 =
* Fixed: Backup retention off-by-one — prune phase now uses keep_count-1 to account for the set record created after pruning, so retention=2 keeps exactly 2 backups instead of 3.
* Fixed: is_auto detection in local backup list now uses nonce lookup in backup sets registry — engine filenames never start with 'auto-', so all automation backups were previously misidentified as manual.
* Fixed: Three per-page-load log entries removed (Dependencies loaded, backup_cloud capability gate, BackupScheduler constructor hook count) — freed up the 500-entry diagnostics buffer that was filling within minutes.
* Security: 2FA rate limiting migrated from transients to persistent options — prevents brute-force bypass on Redis/Memcached backends (F-087).
* Security: Quarantine directory protection writes now validated — logs error if .htaccess or index.php cannot be written (F-082).
* Security: Geoblocking user agent sanitized before storage — closes stored XSS vector (F-083).
* Fixed: Geoblocking log options use autoload=false — reduces per-request memory load (F-084).
* Fixed: Quarantine base64_decode uses strict mode with corruption guard (F-086).
* Fixed: Quarantine timestamps use wp_date() for consistent timezone display (F-085).
* Fixed: Hardening default preset now includes block_user_enumeration (F-089).

= 2.9.27.56 =
* Fixed: Sentinel stuck_count no longer carries over to the next automation run cycle after a job completes (circuit breaker false-positive after one genuine stuck event).
* Fixed: Backup engine prune phase no longer chains an extra HTTP loopback tick to reach phase_complete — completion is now inline, eliminating HTTP 0 stalls under server load.
* Fixed: Automation cron stagger (introduced in 2.9.27.55) now applies to existing automations via a one-time upgrade migration on plugin update.

= 2.9.27.55 =
* Fixed: Backup automations with the same frequency (e.g. two hourly automations) are now staggered by 3 minutes each to prevent concurrent loopback collisions on Hostinger/LiteSpeed.

= 2.9.27.54 =
* Added: Maintenance tab now surfaces backend warnings from /system-logs (e.g. DISABLE_WP_CRON notice) as visible banners with severity-based colors.

= 2.9.27.53 =
* Fixed: Debug log API returned only 100 entries despite 500-entry buffer in diagnostics.
* Fixed: Backup automation created_at timestamps used local time instead of UTC.
* Security: REST API route existence oracle eliminated (401 changed to 404 for unauthenticated requests).
* Security: Removed apply_filters hook from REST guest allowlist (no legitimate callers).
* Security: /backup/ping endpoint hidden from REST API OPTIONS schema.
* Added: Diagnostics warning when DISABLE_WP_CRON is not defined.

= 2.9.27.52 =
* Fixed: Sentinel job ID mismatch made BUG-4 safety net a no-op (engine/sentinel IDs never matched).
* Fixed: Manual backup heartbeat sent to wrong sentinel job key; manual backups never cleaned up sentinel entries.
* Fixed: check_loopback() called non-existent /health endpoint (404); now uses /backup/ping.
* Fixed: Watchdog timezone mismatch (current_time mysql vs time()) causing false 2h offset on UTC+2 sites.
* Fixed: Keyset pagination infinite loop on UUID/VARCHAR primary keys.
* Fixed: BackupEngineStatus TypeScript interface missing 3 fields.
* Removed ANCHOR-DEBUG log spam from backup automations.
* Debug log buffer increased from 100 to 500 entries.

= 2.9.27.51 =
* Fixed: Dashboard "Last Backup" widget showed inflated time (e.g. "3 hours ago" for a 35-minute-old backup) due to timezone mismatch between filemtime() UTC and current_time('timestamp') which adds WP site offset.

= 2.9.27.50 =
* Fixed: Backup pruning race condition -- concurrent engine instances now use a mutex to prevent one run overwriting another's prune result, leaving excess backup sets.
* Fixed: GDrive cloud backup list was always showing "not configured" even when GDrive uploads were working. Cloud list now correctly shows GDrive backups.

= 2.9.27.49 =
* Fixed: Sentinel watchdog no longer overwrites "success" automation status -- checks engine completion state before marking job abandoned.
* Fixed: Concurrent spawn_worker loopbacks staggered by 500ms to prevent LiteSpeed dropping second simultaneous connection.

= 2.9.27.48 =
* Fixed: Concurrent backup temp dir collision -- each engine now gets an isolated temp dir per job_id; prevents second concurrent job from fataling when first job cleans up shared temp directory.
* Fixed: Engine failure no longer leaves automation permanently stuck in "running" -- cleanup_on_failure() now updates automation status to "failed".

= 2.9.27.47 =
* Fixed: Critical backup regression from v2.9.27.39 -- /backup/engine/tick was missing from REST API guest whitelist, causing HTTP 0 loopback failures and breaking all backup automations. Added engine/tick and sentinel/worker to geo-blocking exempt list.

= 2.9.27.46 =
* Fixed: Lowered stuck-job detection threshold from 2h to 30min — button now appears much sooner

= 2.9.27.45 =
* Fixed: Sentinel now cancels engine state rows when abandoning jobs (prevents zombie resurrection loop)
* Fixed: TickDispatcher skips engine state rows older than 2 hours (zombie guard)
* Fixed: HTTP 0 response no longer logged as warning for non-blocking requests
* Added: POST /backup/clear-stuck-jobs endpoint for emergency cleanup
* Added: "Clear Stuck Jobs" button in Backup Automations panel (shown when stuck jobs detected)

= 2.9.27.44 =
* Fixed: Backup schedule anchor preserved across plugin updates (array indexing bug)
* Fixed: UI edits no longer reset backup schedule time
* Fixed: Deleting automation clears its cron event
* Fixed: Free users no longer get phantom backup cron events
* Fixed: Post-import recovery re-registers backup automation cron hooks
* Fixed: Diagnostic warning when backup cron scheduling fails

= 2.9.27.31 =
* Changed: License tab rewritten — all 12 jargon labels replaced with plain English
* Changed: Security Hub — scan jargon, hardening subtitle, history badges all clarified
* Changed: WPScan & Patchstack API fields now explain what they do and how they integrate with scans
* Changed: All security features now have plain-English descriptions for non-technical users
* Changed: SEO page removes specific AI brand names, uses generic "AI assistants"
* Changed: AI Content Writer page adds token usage notice, how-it-works guide, and tooltips
* Changed: Dashboard action buttons now describe exactly what they do

= 2.9.27.30 =
* Fixed: 3 surviving jargon labels — "NEURAL CORE INTEGRITY", "Precision threat monitoring", "Content Forge" replaced with plain English

= 2.9.27.29 =
* Changed: Full UX clarity pass — replaced military/sci-fi jargon with plain English across all pages
* Changed: Dashboard shows honest empty state instead of fake fallback statistics
* Changed: Scan buttons renamed: Quick Scan, Full Scan, Full Scan + AI Analysis
* Changed: SEO Manager complete label rewrite (128 lines) with token usage warnings
* Changed: Sidebar navigation: Dashboard, Security, SEO, AI Content, Settings
* Fixed: Polling-driven SEO queue for Cloudflare/LiteSpeed WP-Cron blocking
* Fixed: Bulk content list limit raised to 10,000 for queue building

= 2.9.27.27 =
* Fixed: Deep scan, SEO background processing, and automated backups now fire reliably on low-traffic sites via shared WP-Cron spawn helper
* Fixed: License sync button no longer reloads the page; token balance updates in-place
* Fixed: Dashboard Neural Traffic Monitor now shows real pageview data from the native visitor tracker
* Fixed: AI Intelligence Advisor no longer recommends 2FA when it is already active
* Fixed: SEO Health Audit modal now keyboard-accessible with ARIA dialog attributes and Escape key close

= 2.9.27.25 =
* Fixed: SEO badge row now shows separate POSTS and PAGES non-compliant counts (pages were previously invisible)
* Fixed: SEO health transient invalidated on scan and batch completion (dashboard no longer shows stale 100%)
* Fixed: POSTS badge now counts only posts; PAGES badge counts only pages (no longer lumped together)

= 2.9.27.24 =
* Fixed: Sentinel L1 PHP version remediation now shows correct advice when PHP 8.2+ is already installed
* Fixed: Sentinel L1 Server Software header remediation now gives LiteSpeed-specific instructions on LiteSpeed servers

= 2.9.27.23 =
* Fixed: SEO score no longer shows false 100% when items are missing (missing_total cap added)
* Fixed: META COVERAGE on_page score now uses same weighted formula as headline SEO score
* Fixed: Posts with 120-149 char descriptions now appear in the SEO action list
* Fixed: "All assets fully optimized" message no longer shows when items are missing from details

= 2.9.27.22 =
* Fixed: 36 unregistered option keys added to config manifest (backup export + import recovery protection)
* Fixed: Security scan result options no longer pollute WordPress autoload cache
* Fixed: SQL WPCS violations in trainer, logger, and WAF stats queries (table names use prepare()/esc_sql())
* Fixed: Stale version headers in SECURITY_HUB.md and SECURITY_CAPABILITIES_REFERENCE.md

= 2.9.27.21 =
* Fixed: AI audit now reads actual hardening state — only flags options that are genuinely disabled, never assumes defaults
* Fixed: CSP and geo-blocking forbidden from appearing as Critical findings — classified as improvement suggestions only
* Fixed: Remediation text uses human-readable UI labels instead of internal option key names
* Fixed: L2 CVE scan — CVEs without confirmed fixed_in version downgraded to medium/unverified; Grade F requires confirmed CVE
* Fixed: Environment findings (WP Version, PHP Version, Server Header, Cloudflare) grouped under Environment, not External Files
* Fixed: File-action buttons (Quarantine/Delete) hidden for non-file findings (environment and configuration groups)
* Fixed: Mark Safe now works for non-file findings (environment/configuration) via finding ID ignore list

= 2.9.27.20 =
* Fixed: AI daily audit no longer flags SEO features (AI crawler restriction, Google indexing) as security vulnerabilities
* Fixed: Hardening options classified into tiers — only real security controls flagged as vulnerabilities; Pro upsells separated
* Fixed: Writable wp-content/uploads no longer reported as critical vulnerability (normal WordPress behavior)
* Fixed: Orphaned DB table detection improved — WooCommerce (wc_*), SwissWPSuite, Action Scheduler tables no longer false-positives
* Fixed: Deep scan severity now tiered — webshells=critical, exec-with-input=high, obfuscation-only=medium
* Fixed: Post-AI deterministic risk capping — AI cannot inflate to High/Critical when only upsell recommendations exist
* Fixed: Daily cron fires once (removed legacy System A double-binding)
* Fixed: Free-tier daily email now shows real L1 scan findings instead of "Unknown Risk / Upgrade to Pro"
* Fixed: "Mark Safe" now persists on page refresh (scan record filtered by ignored paths)
* Fixed: Delete button distinct from Quarantine button (red/trash icon vs amber/archive icon)

= 2.9.27.19 =
* Fixed: SEO dashboard "Run Full Scan" button now visible in WordPress admin (white-on-white issue resolved)
* Fixed: SEO Health score no longer includes backlinks dimension — score now reflects only on-page factors
* Fixed: On-page audit meta titles check now reads the correct meta key (_swisswpsuite_meta_title)
* Fixed: Page-builder pages (Elementor, Divi, Beaver) no longer flagged for short content
* Added: Fix Missing Titles endpoint — plugin can now auto-generate missing meta titles via AI worker queue

= 2.9.27.18 =
* Fixed: Basic scan now respects user-dismissed paths — "Mark as Safe" dismissals in the basic scan view now persist across scheduled scans
* Fixed: Visitor tracker DB schema version option excluded from backup exports to prevent state corruption during foreign-site restores

= 2.9.27.17 =
* Fixed: Cloud backup size showing as 0 B in the backup list — backup data was uploading correctly to Google Drive/S3, but the recorded file size was always zero due to a keying bug when resolving sizes after local ZIPs are deleted post-upload

= 2.9.27.16 =
* Added: "Fix Non-Compliant" targeted SEO re-optimization button — re-runs AI only on posts/products with meta descriptions below the 120-character quality gate, instead of re-processing all content
* Added: SEO_MIN_DESC_LENGTH and MIN_CONTENT_LENGTH_FOR_REOPT constants replacing hardcoded magic numbers across scan, stats, and fix endpoints
* Changed: Non-Compliant Asset Manifest section now shows an actionable "Fix Non-Compliant (N)" button alongside the intelligence suggestion

= 2.9.27.15 =
* Fixed: "Mark as Safe" now works for uninstalled bundled plugins — previously failed silently for non-existent files (realpath validation blocked all missing-file paths)
* Fixed: Core integrity scan now respects the user's ignore list — marked-safe paths no longer reappear on subsequent scans
* Fixed: "Mark as Safe" button now appears for root-level files like readme.html and license.txt
* Fixed: Quarantine button hidden for finding categories where the file does not exist (bundled_plugin, known_safe_missing, core_missing)
* Added: "Mark All Safe" one-click button in benign integrity group headers to dismiss all findings at once

= 2.9.27.14 =
* Added: Native pageview tracker — daily visit stats with bot filtering (50+ patterns), no cookies, GDPR-compliant, feeds real traffic data to the Dashboard chart
* Added: On-Page SEO Diagnostic — Pro audit scanning 6 factors (meta descriptions, titles, alt text, schema, headings, content length) with gap analysis and quick-win prioritization
* Changed: Dashboard SEO breakdown panel now shows live factor scores with a "Run Audit" drill-down button (Pro only)

= 2.9.27.13 =
* Fixed: Sentinel L2 AI scan now enforces 4 hard rules against hallucination — no invented patch versions, CVE confidence gate, plugin list enforcement, and WordPress version ceiling
* Fixed: Post-AI deterministic filter strips attack chains that reference WordPress versions higher than what is installed (e.g., "update to 6.9.5" when 6.9.4 is installed and is the latest)
* Fixed: AI prompt now explicitly states installed WP version and instructs the model not to recommend updates to non-existent versions
* Bumped Sentinel version to 2.2

= 2.9.27.12 =
* Changed: Pro license tier now has unlimited Layer 2 AI scans — no hourly cap, no monthly quota
* Changed: Pro scan quota check short-circuits locally without a VPS round-trip (faster scan start)
* Free tier limits unchanged

= 2.9.27.11 =
* Fixed: Core file integrity scan grouping now applies to the Basic Scan button (v2.9.27.10 incorrectly fixed only the Full Sentinel Scan path)
* Fixed: Akismet MISS entries and commonly-removed files (readme.html, hello.php) are now grouped separately in Basic Scan results with accurate context
* Fixed: Basic Scan issue count only reflects genuine core file threats, not uninstalled bundled plugins

= 2.9.27.10 =
* Improved: Core file integrity scan now categorizes findings by risk level — "Modified Core Files" (real threat), "Bundled Theme Files", "Uninstalled Bundled Plugins" (Akismet, Hello Dolly — not a threat), and "Commonly Removed Files" (readme.html, xmlrpc.php — often deleted for hardening)
* Improved: Remediation text is now context-aware per category instead of a generic "reinstall WordPress" message
* Improved: Real issue count in the scan summary only counts actual threats (modified core files), not uninstalled plugins or deliberately removed files

= 2.9.27.9 =
* Fixed: Closed/Abandoned Plugins check no longer false-positives on swisswpsuite-ai (commercial plugin, never on WP.org) or hosting-provider bundled plugins (hostinger- prefix excluded)
* Fixed: Distinguishes between plugins "removed from WP.org" vs "never submitted" — different severity and message
* Fixed: Basic scan results are now fully visible in the Security Hub Sentinel tab
* Fixed: Pro/AI scan now finds all issues that the basic scan finds, plus additional AI-powered insights

= 2.9.27.8 =
* Added: "Restrict AI Crawlers to Homepage" hardening option (Free) — prevents GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Bytespider and 5 other AI crawlers from indexing beyond the homepage via robots.txt
* Added: "Restrict Google to Homepage Only" hardening option (Free, high-risk) — limits Googlebot and Bingbot to homepage only; requires confirmation due to SEO impact
* Added: Physical robots.txt file detection — warns when a static robots.txt file would override the plugin's rules

= 2.9.27.7 =
* Fixed: "Disable Visitor-Triggered Scheduling" hardening toggle now explicitly warns that SwissWPSuite backup automations will stop, and provides server cron setup instructions before confirming

= 2.9.27.6 =
* Fixed: SEO archive pages (blog listing, categories, tags) now output full OG tags, Twitter cards, meta description, and canonical
* Fixed: Blog listing page title was showing latest post title instead of page name
* Fixed: og:image/twitter:image now fall back to configurable Default Social Image when no featured image set
* Fixed: Blog posts now output article:published_time, article:modified_time, article:author OG tags
* Fixed: Homepage JSON-LD schema corrected from Article to WebSite + WebPage type
* Added: Settings > SEO tab with Default Social Image picker (1200x630px fallback for social sharing)

= 2.9.27.5 =
* Added: "Drop Orphaned Tables" action in Settings > Maintenance — safely drops abandoned plugin tables with 5-layer protection (core table guard, active plugin match, protected prefix list)
* Fixed: Sentinel AI no longer suggests SwissWPSuite Database Cleanup for orphaned plugin tables (they require manual phpMyAdmin intervention — different feature)
* Fixed: AI audit no longer recommends 2FA or Geo-Blocking to Free-tier users without Pro upgrade disclosure
* Fixed: AI audit now covers all 11 hardening options (was missing User Enumeration, WP Cron Public, CSP)
* Fixed: Pro-only hardening options now show upgrade prompt in AI remediation steps
* Fixed: WAF and Login Protection recommendations now include Pro tier disclosure

= 2.9.27.4 =
* Added: Database Cleanup section in Settings > Maintenance — clean orphaned postmeta, orphaned commentmeta, trashed posts, auto-drafts (7-day safety window), and orphaned term relationships
* Fixed: Auto-draft cleanup now preserves drafts created within the last 7 days — prevents clearing active editor sessions
* Fixed: Term relationship cleanup now recalculates taxonomy counts after deletion

= 2.9.27.3 =
* Fixed: Google Drive cloud backups now correctly capture the file ID from upload response — prune and delete now work reliably
* Fixed: Backblaze B2 cloud backups now correctly delete files by composite file-ID/file-name key
* Fixed: Backup worker spawn timeout increased from 1s to 5s — prevents missed scheduled backups on slow VPS starts
* Added: WP-Cron visitor-dependency notice in Backup Automations panel — explains why scheduled backups may be delayed
* Added: Circuit breaker status notice — amber warning when automations are paused due to repeated failures
* Added: Cloud storage cross-border data transfer disclosures (GDPR/nDSG compliance)
* Added: Dismissible PII notice on cloud storage connection panel

= 2.9.27.2 =
* Fixed: Security alert no longer reappears after dismissal when attacker rotates IPs within same /24 subnet
* Fixed: Alert dismiss now persisted to localStorage (24h TTL), survives page reloads

= 2.9.27.1 =
* Fixed: Security scan Attack Chain crash when AI returns unexpected exploitability values (defensive fallback added)
* Fixed: Scan findings display crash for unknown severity values in sort and badge rendering
* Fixed: License activation DOMAIN_LOCKED error handler for clearer user messaging

= 2.9.27.0 =
* Added: Patchstack Community API as a parallel CVE source alongside WPScan — dual-source vulnerability detection with confidence scoring
* Added: WordPress.org core integrity checksum caching (24h) — reduces API calls, adds toggle control
* Added: Abandoned/closed plugin detection — daily check flags plugins removed from WordPress.org repository
* Added: MalwareBazaar bulk import — PHP-tagged malware hashes added to local threat database nightly (replaces per-scan live lookup)
* Security: VPS threat database now tracks signature source (URLhaus vs MalwareBazaar) for attribution

= 2.9.26.10 =
* Fixed: Auto-clear stale migration state on new migration start
* Fixed: Deferred rewrite rules flush after DB import to resolve 404s
* Fixed: Emergency theme restore on retry exhaustion during migration
* Fixed: Deferred cron cleanup on deactivation

= 2.9.26.9 =
* Fixed: Backup tab blank on sites with LiteSpeed Cache — duplicate script injection caused React Router crash

= 2.9.26.8 =
* Fixed: SEO Enhance — auto-retry on Groq JSON validation failures
* Fixed: SEO Enhance ~50% failure — simplified prompt for JSON mode compatibility
* Fixed: JSON parse failures from control characters in AI responses
* Fixed: Content rewrite API rejection (incompatible JSON mode parameter)
* Added: Diagnostic logging for SEO Enhance JSON parse failures
* Added: Error code distinction in SEO content generation API responses

= 2.9.26.2 =
* Fixed: Crash after AI scan when response omits scan_metadata fields
* Fixed: Null safety for all AI-sourced report fields in SecurityHub

= 2.9.26.1 =
* Fixed: "Fix Permissions" button now shows manual guide when chmod fails on shared hosting
* Fixed: Diagnostic logging for permission fix failures
* Fixed: Undefined finding_code in L1 scan fix requests

= 2.9.26.0 =
* Security: WAF now blocks PHP file execution in upload directories (Pro tier)
* Security: Plugin vulnerability scanner expanded from 5 to 20 hardcoded CVEs
* Added: WPScan API v3 integration for real-time vulnerability scanning
* Added: WPScan API Key field in Settings > Security (optional)
* Changed: M4-D2 scanner uses hybrid strategy — WPScan API first, hardcoded fallback

= 2.9.24.2 =
* Security: PBKDF2 iterations upgraded from 10K to 310K (OWASP 2023 compliance) with backward-compatible version header
* Security: WAF Basic tier now decodes HTML entities before pattern matching (prevents entity-encoded XSS/SQLi bypass)
* Security: WAF now scans uploaded filenames and MIME types for malicious patterns
* Security: XML-RPC multicall check decodes HTML numeric entities before matching
* Fixed: Undefined $new_path in URL search-replace endpoint (path replacement was silently broken)
* Fixed: SEO rate-limit retry now has 5-attempt cap with exponential backoff (prevents infinite re-processing)
* Fixed: Sitemap pagination — replaced get_posts(-1) with paginated WP_Query to prevent OOM on large sites
* Fixed: Dual SEO prompts consolidated into single source of truth (eliminates prompt drift)
* Fixed: Duplicate cron closures on daily sentinel scan merged into one
* Accessibility: All text-[10px] replaced with WCAG AA compliant text-xs (12px) across 11 UI files
* Code quality: Dead TypeScript union member removed, scan_type narrowed to match backend

= 2.9.24.1 =
* Fixed: ROOT CAUSE — added COMMIT before every partial return in SQL parser (caused 8/12 missing tables)
* Fixed: Reconnect handler re-applies full import preamble (FK_CHECKS, UNIQUE_CHECKS, AUTOCOMMIT)
* Fixed: Oversized single-row INSERT skip, time budget reduction, buffer carry-over guard
* Fixed: Return value checks on save_state, SR COMMIT, SR UPDATE, SET session queries, periodic COMMIT
* Fixed: Block comment preceded SQL no longer silently dropped
* Fixed: Added utf8mb4_0900_ai_ci collation replacement for MySQL 8.0+ source databases

= 2.9.24.0 =
* Fixed: 28-fix migration engine overhaul — SQL parser, search-replace, and receiver template hardened
* Fixed: SQL parser now tracks comment states, preventing false statement splits
* Fixed: Recursive download replaced with iterative loop (prevents stack overflow)
* Fixed: Performance preamble (FK_CHECKS, UNIQUE_CHECKS, AUTOCOMMIT) for 10-1000x faster imports
* Fixed: JSON-escaped URL replacement for Elementor and Gutenberg data
* Fixed: Plugins token rotation, per-type download counters, DEFINER clause stripping
* Security: wp-config.php permissions 0440, HMAC verification on all downloads, SET PASSWORD blocked
* Security: State + SQL temp files cleaned on self-destruct, shutdown function safety net
* Added: Source table prefix auto-detection, multisite prefix support, table prefix meta_key remap

= 2.9.23.0 =
* Security: Geo-bypass token now HMAC-derived (IP + time-window bound)
* Security: Sync push scans post_content for webshell patterns (14 signatures)
* Security: Expanded sync meta redaction blocklist (+6 credential patterns)
* Security: SQL import pre-scan blocks DELIMITER statements and extended scan window
* Fixed: Geo API rate-limited (30/min) with fail-closed circuit breaker
* Fixed: Concurrency lock fails closed when lock file unreadable
* Fixed: Backup tick uses CPU time budget instead of wall-clock
* Fixed: Backup tick lock deterministic stale recovery
* Fixed: VPS license cron advisory lock prevents concurrent runs
* Fixed: VPS logger outputs structured JSON in production
* Added: VPS admin key recovery endpoint

= 2.9.22.1 =
* Security: Converted all SQL string interpolation to $wpdb->prepare() or esc_sql()
* Security: Replaced die() calls in backup stream handler with proper exit + resource cleanup
* Fixed: SentinelLayer1Finding TypeScript type drift (2 missing fields)

= 2.9.22.0 =
* Backup: Backup Set metadata layer — groups multi-file backups into logical sets
* Backup: Set-based retention replaces file-level retention for automated backups
* Backup: Grouped backup list with expand/collapse, scope badges, cloud badges
* Backup: Set-based restore (DB-first ordering) and delete (local + cloud)
* Backup: Legacy backup migration — existing files converted to sets on first load
* Backup: Cancel flag path fix — cancel now works reliably with the chunked engine
* Backup: Stale tick lock recovery (5-min TTL) prevents stuck backups
* Backup: Orphan scanner detects engine files without set records
* Backup: Sentinel heartbeat injection for automated backup watchdog

= 2.9.21.2 =
* Security: AI scanner now sees active defenses (WAF, 2FA, login protection) — no more inflated severity
* Security: L1 malware content signatures anchored with word boundaries — fewer false positives
* Security: L2 AI verifies L1 findings before building attack chains — stops false positive cascade
* Security: Grade calculation accounts for active protections — protected sites get accurate grades

= 2.9.21.1 =
* Fixed: Sentinel no longer flags Webpack hashes as malware (c99/r57 false positives)
* Fixed: Scan error toasts now show actual error (rate limit, auth) instead of "check your connection"

= 2.9.21.0 =
* Major: Complete backup engine rewrite — chunked multi-tick architecture for shared hosting
* Resumable cloud uploads (Google Drive, S3, Dropbox, B2) across multiple ticks
* Progressive progress bar with phase labels, percentage, and ETA
* ZIP splitting for large sites (plugins, themes, uploads categories)
* Self-chaining dispatcher with 5-minute health check recovery
* Cancel works immediately — checked between every tick
* LiteSpeed noabort rules auto-added for reliable background processing

= 2.9.20.8 =
* Security: Sentinel L2 AI scanner now validates CVE findings against installed plugin versions — eliminates false positives
* Security: Fixed version range operator bug in CVE comparison logic (strict vs inclusive bounds)

= 2.9.20.7 =
* Improved: 2FA now shows site domain in authenticator app instead of email — distinguishes multiple sites
* Improved: "Set up 2FA" link added to Security Hub Login Safeguard card
* Improved: Settings page supports direct tab linking via URL parameter

= 2.9.20.6 =
* Fixed: 2FA QR code now uses proven qrcode.react library — reliably scannable by all authenticator apps

= 2.9.20.5 =
* Fixed: 2FA QR code spec tables corrected — all versions had wrong data codeword counts and block structures

= 2.9.20.4 =
* Fixed: 2FA QR codes now scannable — added missing alignment patterns, fixed data interleaving, corrected character count
* Fixed: 2FA QR code display enlarged from 160px to 200px for easier scanning
* Improved: Cloud storage provider reliability (B2, Dropbox, FTP, GDrive, S3)
* Improved: New tick-based backup engine with better scheduling
* Improved: Refreshed Cloud Storage, License Manager, and Backup UI panels

= 2.9.20.2 =
* Fixed: Cloudflare 524 timeout no longer kills backup process (ignore_user_abort)
* Fixed: Sentinel heartbeat timeout increased to 10 min for large archives
* Fixed: Archiver now excludes LiteSpeed cache, upgrade files, debug.log — smaller backups

= 2.9.20.1 =
* Fixed: Sentinel now syncs failure status to automation records — no more permanent "running" zombies
* Fixed: Stale-running watchdog auto-resets automations stuck over 2 hours
* Fixed: Cancel button now available for automation backups
* Fixed: Manual and automation backup retention enforced on list load

= 2.9.20.0 =
* Cloud Backup: cURL timeouts on all upload methods across all 5 cloud providers — prevents hangs
* Cloud Backup: Improved retry logic for S3, B2, Dropbox, and FTP with exponential backoff
* Cloud Backup: Real error messages from cloud providers shown in automation status
* Cloud Backup: Sentinel heartbeats during uploads — no more false stuck-job kills
* Cloud Backup: Circuit breaker stops endless restart loops (3 strikes)
* Cloud Backup: Cancel button works during cloud upload with server-side cleanup
* Cloud Backup: Orphan file detection and one-click cleanup
* Cloud Backup: Backup list shows storage location (Local, Google Drive, S3, etc.)

= 2.9.19.0 =
* Cloud Backup: One-click Google Drive connection — no Google OAuth app setup needed
* Cloud Backup: Dropbox one-click connection ready (pending Dropbox production approval)
* Cloud Backup: VPS OAuth proxy auto-detection for fresh installs
* Cloud Backup: Fixed self-hosted OAuth redirects to correct admin page
* Cloud Backup: Self-hosted flow now explicitly stores connection mode

= 2.9.18.0 =
* Firewall: New command injection, XXE injection, and encoding bypass protection (Pro)
* Firewall: XML-RPC brute force amplification blocking (Pro)
* Firewall: Improved path traversal protection with advanced encoding detection (all tiers)
* Firewall: Fixed a bypass vulnerability and improved simulation mode reliability
* Stronger site identity verification with automatic migration for existing sites
* Security scanner: WordPress version alerts, PHP security checks, vulnerable plugin detection
* Improved reliability of firewall checks on JSON API requests

= 2.9.17.0 =
* AI features hardened with request validation and rate limiting
* HTTPS enforcement strengthened with HSTS preload
* Improved SSRF protection including IPv6 addresses
* Payment warning banner when payment issues detected
* Sensitive credentials fully masked in all logs
* Improved payment event reliability

= 2.9.16.0 =
* License lifecycle hardening — atomic domain locking, subscription-scoped billing, payment failure handling
* Cancel subscription button now works from the plugin settings
* Domain lock is released when deactivating the plugin, allowing reactivation on a new site
* Token stacking for multi-module subscriptions — each module adds its own token allocation
* Trial abuse prevention improved with email-based deduplication
* Expiry logic fixed for yearly plans that converted from trial

= 2.9.15.0 =
* Migration engine rewrite — improved reliability and data integrity during site transfers
* Better compatibility with shared hosting environments (large database support)
* Major security hardening: 13 vulnerabilities fixed from professional penetration testing
* 6 stability fixes for edge cases during plugin startup
* 11 hardening options (5 free + 6 pro) with plain English descriptions
* Smart email alerts — only actionable threats trigger notifications
* Confirmation dialogs for high-risk hardening options

= 2.9.12.0 =
* Mode B migration: migrate to empty or broken destinations without needing the plugin pre-installed
* Secure authentication for migration receiver
* Automatic WordPress core installation on bare servers
* Reliable large database transfers via chunked downloads

= 2.9.7.70 =
* Mode A migration confirmed working
* Serialization-safe search-replace

== Upgrade Notice ==

= 2.9.15.0 =
Major migration engine rewrite + security hardening. Recommended update for all users.

== Privacy ==

SwissWPSuite connects to external services only when explicitly triggered by user action:
* **SwissWPSecure API** (swisswpsecure.com) — License validation, AI proxy, Sentinel L2 scanning
* **Groq AI** (via SwissWPSecure proxy) — AI content generation, malware analysis

No background telemetry, no tracking, no data collection without user action.

See the full Privacy Policy at: https://www.swisswpsecure.com/privacy-policy
