=== SwissWPSuite ===
Contributors: swisswpsecure
Tags: security, backup, seo, ai, malware scanner, firewall, two-factor authentication, migration, sync
Requires at least: 5.6
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 2.9.27.70
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

See [CHANGELOG.md](CHANGELOG.md) for the full version history.

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
