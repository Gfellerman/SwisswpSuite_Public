# SwissWPSuite — Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/) with a 4-segment scheme: `MAJOR.MINOR.SPRINT.HOTFIX`.

---

## [2.9.27.46] - 2026-04-07

### Fixed
- Lowered stuck-job detection threshold from 2 hours to 30 minutes — "Clear Stuck Jobs" button now appears ~30 min after a job gets stuck, not 2 hours later

## [2.9.27.45] - 2026-04-07

### Fixed
- **Zombie engine state loop** -- When Sentinel abandons a job (max attempts or circuit breaker), it now also sets the corresponding `swisswpsuite_backup_engine_*` WP option row to `cancelled`. Previously, the engine state stayed `running` and TickDispatcher would fire loopback HTTP every 5 minutes indefinitely, driving server load to 7-9.
- **TickDispatcher zombie guard** -- `discover_active_jobs()` now skips engine state rows whose `last_tick_start` is older than 2 hours. These rows are auto-cancelled to prevent future scans from encountering them.
- **HTTP 0 false-alarm suppression** -- `chain_next_tick()` no longer logs a warning for HTTP response code 0, which is the expected response for non-blocking requests (`blocking => false`).

### Added
- **POST /backup/clear-stuck-jobs** -- Emergency REST endpoint that finds and cancels all stuck engine state rows (running/pending with last activity >2 hours). Returns count of cleared jobs for audit trail.
- **"Clear Stuck Jobs" button** -- Shown in the Backup Automations panel when stuck jobs are detected. Red/danger styling to indicate it's an emergency tool.
- **`stuck_job_count` in automations response** -- GET /backup/automations now includes a count of stuck engine state rows so the frontend can conditionally show the clear button.

---

## [2.9.27.44] - 2026-04-07

### Fixed
- **Backup schedule anchor now actually preserved across plugin updates** -- fixed array indexing bug where `schedule_cron_event()` used string ID on a numerically-indexed array, causing `last_run_at` lookup to always return null and reset to `time()+interval`.
- **UI edits no longer reset backup schedule time** -- `sync_cron_events()` now delegates to `schedule_cron_event()` instead of bypassing anchor logic with `time()+60`.
- **Deleting a backup automation now clears its cron event** -- prevents orphaned WP-Cron events.
- **Free users no longer get phantom backup cron events** -- `ensure_cron_events()` gated behind `backup_cloud` capability.
- **Post-import recovery now re-registers backup automation cron hooks** -- per-automation dynamic hooks restored alongside manifest hooks.
- **Diagnostic warning logged when backup cron scheduling fails** -- visible in plugin UI diagnostics panel.

---

## [2.9.27.43] - 2026-04-07

### Fixed
- **Plugin update no longer resets backup schedule times** -- schedule_cron_event() now computes the next occurrence from last_run_at + interval instead of time(). If a user's daily backup was set to run at 3 AM, it stays at 3 AM after a plugin update. New automations with no history start at now + interval.

---

## [2.9.27.42] - 2026-04-07

### Fixed
- **Countdown timezone mismatch** -- compute_next_run() now returns UTC ISO 8601 (with Z suffix) instead of site-local wp_date(). Frontend parses UTC correctly regardless of browser timezone. Daily backups now show "23h 47m" instead of "1d".
- **Countdown always shows hours+minutes** -- removed the "Xd" rounding; all countdowns show precise hours and minutes (e.g. "25h 30m" instead of "1d").

---

## [2.9.27.41] - 2026-04-07

### Fixed
- **Backup countdown shows "Overdue" for all automations** -- next_run was computed once at creation and never refreshed. get_all() now recomputes next_run from live wp_next_scheduled() on every API read so the UI always shows accurate countdown.

---

## [2.9.27.40] - 2026-04-07

### Added
- **Backup countdown timer** -- each automation card shows live "Next run in Xh Ym" countdown that auto-updates every 60 seconds. States: Running now (amber), Overdue (red), <10 min (orange), normal (blue), Disabled (gray).

---

## [2.9.27.39] - 2026-04-07

### Security
- **Log injection fixed** -- username sanitized with sanitize_user() before writing to security threat log (HIGH-1)
- **Tier gate hardened** -- force_security_headers and disable_rest_api_guests added to pro_only_options internal gate (HIGH-2)
- **uploads/.htaccess migrated to insert_with_markers** -- no more file_put_contents anti-pattern, proper marker management (HIGH-3)
- **CF-Connecting-IP validated** -- FILTER_VALIDATE_IP check added before trusting Cloudflare header (HIGH-4, 2 audits overdue)
- **REST API namespace whitelist tightened** -- replaced broad /v1/ match with 3 surgical public endpoints
- **Core scan locale-aware** -- uses get_locale() instead of hardcoded en_US, eliminates false positives on non-English sites
- **Scanner reports highest severity** -- no longer stops at first pattern match; scans all patterns and reports worst-case

### Fixed
- **Deactivator cleanup** -- restrict_google_indexing and restrict_llm_crawlers settings cleared on deactivation (prevents silent reactivation of Google deindexing)
- **uploads/.htaccess cleanup** -- deactivator now removes SwissWPSuite markers from uploads/.htaccess

### Changed
- **18 security regression baselines** added to REGRESSION_BASELINE.md -- every future audit verifies these
- **Comprehensive auditor CAT-10** now includes mandatory 15-point security invariant checklist -- can never skip deep security review
- **SECURITY_HUB.md updated** -- reflects 13 hardening options (was 11)

---

## [2.9.27.38] - 2026-04-07

### Fixed
- **[CRITICAL] Backup tick chain timeout** -- chain_next_tick() raised from 1s to 5s, matching Hostinger TLS handshake requirements
- **[CRITICAL] Sentinel job stays "pending"** -- register_job() now sets status to "running" after spawn, preventing duplicate worker spawns
- **[CRITICAL] Parallel engine corruption** -- run_automation_backup() now checks for active engine jobs before registering new ones
- **[CRITICAL] Silent file write failure** -- write_jobs() no longer suppresses errors; logs warning on failure, wp_options is authoritative fallback
- **[HIGH] Flock failure without heartbeat** -- execute_automation_backup() now calls heartbeat() on flock contention to prevent false "stuck" detection
- **[HIGH] Rate limiter blocks loopback ticks** -- engine tick rate limiter now exempts loopback requests (nonce-protected)
- **[HIGH] Circuit breaker reset on active jobs** -- register_job() skips re-registration when job is already running
- **[HIGH] Migrated automations never fire** -- migrate_legacy() now calls sync_cron_events() after saving automation records
- **[HIGH] TickDispatcher init gated behind license** -- moved init() outside backup_cloud capability gate so health check always registers
- **[HIGH] Manual backup wrong Sentinel prefix** -- manual jobs now use "backup_manual_" prefix to avoid automation dispatch collision
- **[MEDIUM] Orphaned engine state cleanup** -- load_all_states() now purges stale complete/failed states older than 24 hours
- **[MEDIUM] CronHelper spawn timeout** -- raised from 0.01s to 2s for HTTPS loopback compatibility
- **[LOW] chain_next_tick ignores HTTP 429** -- now logs non-200 responses for chain break debugging
- **[LOW] ZIP SQL duplication on retry** -- archive_db_only_zip() now uses locateName() idempotency check

---

## [2.9.27.37] - 2026-04-07

### Fixed
- **Meta description auto-padding now works for near-miss lengths** -- added short padders (" Read more.", " Learn more.", " Get started.") for descriptions at 139-149 chars. Previous padders (30+ chars) overshot the 165 cap for near-miss cases. Raised cap to 170 to accommodate site name padders.

---

## [2.9.27.36] - 2026-04-07

### Fixed
- **AI SEO generation 38% failure rate** -- root cause: overly complex prompt with contradictory character-counting instructions caused Groq API `json_validate_failed` errors. Prompt stripped back to clean, simple instructions. Post-generation validation (truncation + padding) handles length enforcement instead of prompt-level instructions.

---

## [2.9.27.35] - 2026-04-07

### Fixed
- **AI SEO prompt redesigned for thin content** -- two-tier approach: rich content gets strict 150-160 char enforcement, thin/empty pages get marketing-oriented prompt using site name and page purpose
- **Auto-padding for short descriptions** -- if AI generates 130-149 chars, the system appends a relevant call-to-action phrase to reach 150+ chars automatically
- **CRITICAL reinforcement in prompt** -- explicit "count every character including spaces" instruction plus "Not 140, not 149, not 161" examples to reduce AI miscounts

---

## [2.9.27.34] - 2026-04-07

### Fixed
- **Utility pages excluded from content length check** -- Home, Blog, Shop, Cart, Checkout, My Account, Login no longer flagged for thin content (template-rendered pages have no post_content by design)
- **AI meta description prompt hardened** -- now enforces "MUST be 150-160 characters" instead of "around 155"; descriptions over 160 chars auto-truncated at word boundary
- **SEO quality gate constant aligned** -- SEO_MIN_DESC_LENGTH updated from 120 to 150, matching the scanner threshold

---

## [2.9.27.33] - 2026-04-07

### Added
- **WooCommerce Product schema (JSON-LD)** -- automatic Product structured data with price, availability, SKU, ratings for all WooCommerce products
- **Theme-aware H1 detection** -- SEO scanner now assumes theme renders post title as H1 (standard WP behavior), eliminating false positives; front-page exception preserved
- **Page-builder content length analysis** -- SEO scanner extracts and counts text from Elementor, Divi, and Beaver Builder meta data instead of reporting 0 words

### Fixed
- **Schema markup false positives eliminated** -- SEO audit now recognizes that SwissWPSuite Frontend already injects Article/WebPage/FAQ schema via wp_head (was checking post_content only)

---

## [2.9.27.32] - 2026-04-07

### Fixed
- **Silent data loss in content editor** -- wp_update_post() now checks return value and returns 500 on DB failure (F-067)
- **SEO description threshold mismatch** -- UI and PHP both use 150 chars now (was 120, scoring used 150) (F-030, F-031)
- **SEO N+1 query** -- batch-prefetch page-builder meta in check_content_length instead of per-post queries (F-016)
- **Content writer race condition** -- bulk rewrite button disabled during in-flight individual rewrites (F-069)
- **Dashboard route crash** -- #/dashboard now redirects to #/ instead of showing React Router 404 (F-075)
- **Config manifest gaps** -- 3 missing option keys added (last_import_completed, security_fixed_findings, seo_batch_filters) (F-070)
- **Backup autoload bloat** -- all 16 export update_option() calls now use autoload=false (F-071)

### Changed
- **Hardening constants deduplicated** -- FREE_HARDENING_KEYS extracted to shared constants/hardening.ts (F-074)
- **Doc version headers updated** -- SECURITY_HUB.md and SECURITY_CAPABILITIES_REFERENCE.md brought to current version (F-072, F-073)

### Security
- **Vite dev dependency updated** -- 0 npm vulnerabilities (was 2 HIGH CVEs) (F-068)

### Removed
- 4 dead VPS route files (license.js, ai_new.js, api.js, license_new.js) (F-055)
- 35 stale .bak files from VPS routes directory (F-056)

---

## [2.9.27.31] - 2026-04-06

### Changed
- **License tab fully rewritten** -- 12 jargon items replaced: "ACCESS PROTOCOL" → "License", "NEURAL RESOURCES" → "AI Token Balance", "ACQUIRE RESOURCES" → "Buy More Tokens", etc. Added plan name formatter for readable display.
- **Security Hub jargon cleanup** -- "Deep Code Extraction" → "Deep File Scanner", "ARMOR-PLATING YOUR WORDPRESS CORE" → plain English, "LAYER 1" badges → "Quick Scan", hardening button → "Apply All Recommended Settings"
- **WPScan & Patchstack explanations** -- Both API key fields now have plain-English descriptions explaining what the service does, that scans run automatically, and where to get the free key
- **Security feature descriptions expanded** -- Detection Only mode, login attempt limits, file integrity, blocked IPs, and hardening options all have clear plain-English explanations
- **SEO brand names removed** -- "ChatGPT and Gemini" replaced with "AI assistants" throughout SEO Manager
- **AI Content Writer explanations** -- Added token usage notice, "How it works" guide, tooltips on tone selector and instruction input, button explanations
- **Dashboard action descriptions** -- Quick action buttons now explain exactly what clicking them does

---

## [2.9.27.30] - 2026-04-06

### Fixed
- **3 surviving jargon items** -- "NEURAL CORE INTEGRITY" → "SEO HEALTH" on Dashboard, "Precision threat monitoring..." → plain English on Security Hub, "Content Forge" → "AI Content Writer" on AI Content page

---

## [2.9.27.29] - 2026-04-06

### Changed
- **Full UX clarity pass** -- Replaced all military/sci-fi jargon with plain English across Dashboard, Security Hub, SEO Manager, and sidebar navigation
- **Dashboard honest empty state** -- Removed fake fallback statistics; shows "No data yet" when no scan has run
- **SecurityHub fake stats removed** -- Deleted hardcoded "100% Precision" and "High Availability" decorative bars
- **Scan button naming** -- "Layer 1 Scan" → "Quick Scan", "Deep Malware Scan" → "Full Scan", consistent naming throughout
- **SEO Manager label rewrite** -- 128 lines of jargon replaced: "Intel Asset" → "Content", "Non-Compliant" → "Needs SEO", "Terminate Session" → "Close", and token usage warnings added
- **Sidebar navigation** -- "Command Center" → "Dashboard", "Defense Hub" → "Security", "Content Forge" → "AI Content", "System Config" → "Settings"

### Fixed
- **Polling-driven SEO queue** -- On Cloudflare/LiteSpeed hosts where WP-Cron loopback is blocked, each status poll now processes 1 queue item server-side
- **Bulk content list limit** -- Raised to 10,000 when fields=ids for bulk SEO queue building (UI pagination stays at 200)

---

## [2.9.27.27] - 2026-04-06

### Fixed
- **Deep scan timeout** -- WP-Cron loopback now targets `/wp-cron.php` directly instead of the site root; shared `SwissWPSuite_Cron_Helper` utility ensures scheduled events fire immediately on low-traffic sites behind Cloudflare/LiteSpeed
- **SEO background processing stuck** -- Added cron spawn after scheduling SEO background queue; processing now starts immediately without waiting for the next page visit
- **Automated backups not running** -- Backup scheduler now force-spawns WP-Cron after job registration to prevent stale cron events on low-traffic sites
- **License sync page reload** -- Sync button no longer causes a full page reload; token balance updates in-place via AJAX and the active Settings tab is preserved
- **Neural Traffic Monitor shows no visits** -- Dashboard stats endpoint now reads from the native pageview tracker instead of returning hardcoded zeros
- **AI advisor recommends 2FA when already active** -- Intelligence Advisor prompt now includes 2FA status so the AI does not recommend enabling an already-active feature
- **SEO modal accessibility** -- SEO Health Audit modal now has `role="dialog"`, `aria-modal`, `aria-labelledby`, Escape key close handler, auto-focus on open, and accessible close button label

---

## [2.9.27.25] - 2026-04-04

### Fixed
- **SEO PAGES badge** -- Badge row now shows a dedicated PAGES category with its own non-compliant count; pages were previously invisible in the summary row
- **SEO posts/pages separation** -- POSTS badge now counts only `post_type=post` items; PAGES badge counts only `post_type=page` items; the two were previously lumped together under POSTS
- **SEO health transient staleness** -- On-page audit cache is now invalidated when a scan completes or a batch job finishes, so the Dashboard SEO HEALTH tile reflects the latest scan result immediately

---

## [2.9.27.24] - 2026-04-04

### Fixed
- **Sentinel PHP remediation** -- PHP version check is now context-aware; sites already running PHP 8.2+ receive an "up to date" confirmation instead of a stale "upgrade to 8.2+" tip
- **Sentinel server header remediation** -- Server Software finding now detects LiteSpeed vs Nginx vs Apache and provides server-specific fix instructions instead of generic Apache/Nginx commands

---

## [2.9.27.23] - 2026-04-04

### Fixed
- **SEO score accuracy** -- Score no longer shows false 100% when posts/images are missing; a `missing_total` safety cap ensures score stays at 99 when any category has unresolved items
- **SEO formula consistency** -- META COVERAGE on_page score now uses the same weighted formula as the headline SEO score (optimal×1.0 + acceptable×0.6 + faq_bonus), eliminating score discrepancy
- **SEO action list completeness** -- Posts with 120–149 character descriptions now appear in the optimization action list (threshold aligned to 150-char optimal, matching the missing counter)
- **SEO "All optimized" accuracy** -- "All assets fully optimized" message now correctly checks `details.post.missing` and `details.image.missing` in addition to `non_compliant_items.length`

---

## [2.9.27.22] - 2026-04-04

### Fixed
- **Config manifest completeness** -- 36 previously unregistered option keys now registered in config manifest (backup export protection, import recovery, deep scan runtime state)
- **Autoload optimization** -- Security scan result options (`swisswpsuite_basic_scan_result`, `swisswpsuite_scan_result`) set to `autoload=false` to reduce WordPress autoload cache size
- **SQL WPCS compliance** -- Table name references in trainer, logger, and WAF stats queries now use `$wpdb->prepare()` and `esc_sql()` instead of direct interpolation
- **Documentation headers** -- SECURITY_HUB.md and SECURITY_CAPABILITIES_REFERENCE.md updated to v2.9.27.22

---

## [2.9.27.21] - 2026-04-04

### Fixed
- **AI audit reads actual hardening state** — prompt now instructs AI to check `hardening.{key}` value from snapshot; only flags options genuinely set to `false`; never reports enabled options as vulnerabilities
- **SECURITY_BENEFICIAL options strictly excluded from Critical findings** — CSP (`enable_csp`) and Geo-Blocking forbidden from appearing in `security_issues`/`critical_issues` under any circumstances; appear only in `improvement_suggestions`
- **Remediation text uses UI labels** — human-readable labels ("Disable XML-RPC", "Block PHP in Uploads") replace internal PHP option keys (`disable_xmlrpc`, `block_php_uploads`) in all AI-generated remediation paths
- **L2 CVE false positives eliminated** — CVEs missing `fixed_in` version now downgraded to `medium` severity with `unverified: true` flag; Grade F automatic fail requires a confirmed (non-unverified) CVE finding; LiteSpeed Cache 7.8.1 false positive scenario fixed
- **Environment/Configuration finding groups** — M4 findings (WordPress Version, PHP Version, Server Software Header, Plugin Inventory, Cloud Protection) and M3 findings (license.txt) now grouped under dedicated "Environment" and "Configuration" categories instead of misclassified "External Files"
- **File-action buttons suppressed for non-file findings** — Quarantine and Delete action buttons hidden for findings in Environment and Configuration groups where file operations make no sense
- **Mark Safe for non-file findings** — new `swisswpsuite_sentinel_ignored_findings` wp_option stores finding IDs; M3/M4 scan modules check this list; non-file findings (WP Version, PHP Version, etc.) can now be permanently dismissed

### Added
- `swisswpsuite_sentinel_ignored_findings` wp_option (registered in `swisswpsuite-config-manifest.php`) — stores finding IDs for non-file findings that should be suppressed in future scans

---

## [2.9.27.20] - 2026-04-04

### Fixed
- **AI daily audit prompt rewrite** — SEO features (`restrict_llm_crawlers`, `restrict_google_indexing`) removed from hardening gap list; they are not security controls
- **Hardening option tiers** — 13 options classified as security-critical / security-beneficial / operational / excluded; blanket "each disabled option = vulnerability" rule removed
- **WordPress-normal exclusions** — writable `wp-content/uploads` no longer flagged as vulnerability; orphaned tables downgraded to maintenance-level; wp-cron public access contextualized
- **Post-AI deterministic risk capping** — AI cannot return High/Critical when only improvement suggestions (Pro upsells) exist; adds server-side validation of risk score
- **Orphaned table false positives** — added `termmeta`, `wc_*` (WooCommerce), `swisswpsuite_*` (own plugin), `actionscheduler_*` prefix mappings
- **wp-config.php writability** — context-annotated in AI snapshot (owner-writable is normal for WordPress auto-updates)
- **Deep scan severity tiers** — known webshells (c99shell, FilesMan, r57shell, b374k, WSO) → critical; exec with user input → high; obfuscation-only (hex2bin, str_rot13, chr chains) → medium
- **Cron double-binding** — removed legacy System A `add_action` in `security.php`; daily hook fires exactly once via System B (deterministic L1+L2)
- **Free-tier daily email** — replaces useless "Unknown Risk / Upgrade to Pro" with real L1 deterministic scan findings and computed risk level
- **Mark Safe persistence** — `get_sentinel_scan_record()` now filters `swisswpsuite_security_ignored_paths`; ignored files no longer reappear on page refresh
- **Duplicate Quarantine button** — Delete action now uses red button + Trash2 icon + "Permanently delete — cannot be undone" confirmation; Quarantine remains amber + Archive icon

### Added
- `compute_risk_level()` method in `SwissWPSuite_Sentinel_Security` — deterministic L1 findings → risk level mapping (Critical/High/Medium/Low/Info)

---

## [2.9.27.19] - 2026-04-03

### Fixed
- **SEO "Run Full Scan" button invisible in WordPress admin** — button rendered white-on-white due to WP admin CSS overriding Tailwind styles; resolved with `.swps-cta-dark` CSS class using `!important` on background/color/border-color with `#wpwrap` selector specificity
- **SEO Health score included phantom backlinks dimension** — removed `backlinks` from the `seo_breakdown` stats response and from the `OnPageDiagnostics` component; score now reflects only the 6 on-page factors (schema, heading, meta desc, content length, image alt, meta titles)
- **On-page audit meta titles check used wrong meta key** — `check_meta_titles()` was reading `_swisswpsuite_seo_title` (non-existent) instead of `_swisswpsuite_meta_title` (written by the AI worker); all pages were incorrectly flagged as missing titles
- **Page-builder pages flagged for short content** — Elementor, Divi, and Beaver Builder pages with empty `post_content` (content stored in postmeta) no longer counted as content length failures

### Added
- **Fix Missing Titles endpoint** — `POST /swisswpsuite/v1/seo/fix-missing-titles` (Pro) queries posts without `_swisswpsuite_meta_title` and enqueues them for AI title generation via the background SEO worker; rate-limited, lock-guarded, deduplicates against in-progress queue

---

## [2.9.27.18] - 2026-04-03

### Fixed
- **Basic scan ignores "Mark as Safe" paths (R1)** — `perform_core_scan()` now calls `is_user_ignored()` before appending findings; previously, user-dismissed core file findings (bundled plugins, etc.) reappeared on every scheduled scan because only the deep scan path respected the ignore list
- **Config manifest missing `swisswpsuite_pageviews_table_version` (R2)** — added to `SITE_LOCAL_CONFIG` so the visitor tracker schema version is excluded from backup exports and preserved during foreign-site restores; previously the option leaked into backup SQL and could be overwritten

---

## [2.9.27.17] - 2026-04-03

### Fixed
- **Cloud backup size recorded as 0 B** — fixed incorrect size metadata for cloud-only backups (Google Drive, S3, etc.); the backup data was always uploaded correctly, but the UI showed 0 B due to a positional index mismatch when resolving file sizes after local ZIPs were deleted; size is now stored during upload init and retrieved via a keyed lookup map

---

## [2.9.27.16] - 2026-04-03

### Added
- **"Fix Non-Compliant" targeted SEO re-optimization** — new `POST /swisswpsuite/v1/seo/fix-noncompliant` endpoint (Pro-gated) querying only posts/products with meta descriptions under 120 chars and sufficient content (200+ chars) to generate a longer one; feeds matching IDs into the existing background queue; does not touch compliant items
- **`SEO_MIN_DESC_LENGTH` and `MIN_CONTENT_LENGTH_FOR_REOPT` constants** — extracted from 5 hardcoded values scattered across `run_seo_scan()`, `get_stats()`, and the new fix handler; single source of truth for the quality gate threshold

### Changed
- SEO Manager UI "Intelligence Suggestion" section now shows a real action button **"Fix Non-Compliant (N)"** instead of static text; the button triggers the targeted endpoint, shows a loading state, and refreshes the audit count when done

---

## [2.9.27.15] - 2026-04-03

### Fixed
- **Sentinel scan "Mark as Safe" now works for missing files** — `add_ignored_path` previously used `realpath()` which returns false for non-existent files, causing all "Mark as Safe" calls for uninstalled bundled plugins to silently fail with HTTP 400. Now uses format-based validation for non-existent files and only applies realpath for existing ones.
- **Core integrity scan respects user's ignore list** — `check_wp_core_integrity` was not checking the user's ignore list, so marked-safe paths reappeared on every scan. Now correctly skips ignored paths.
- **"Mark as Safe" button now appears for root-level files** — Files like `readme.html` and `license.txt` (no directory prefix) were incorrectly excluded from the action buttons display.
- **Quarantine button hidden for missing files** — Quarantining a non-existent file is meaningless. Quarantine/delete actions are now hidden for `bundled_plugin`, `known_safe_missing`, and `core_missing` integrity categories.
- **"Mark All Safe" button added to benign integrity groups** — Users can now dismiss all uninstalled bundled plugin files (39+) with a single click instead of one by one.

---

## [2.9.27.14] - 2026-04-03

### Added
- **Native pageview tracker** (`SwissWPSuite_Visitor_Tracker`) — server-side daily visit tracking via `wp` hook; bot-filtered (50+ UA patterns including GPTBot, ClaudeBot, SemrushBot); no cookies, GDPR-compliant; `wp_swisswpsuite_pageviews` table with UPSERT per request; feeds real traffic data to the Dashboard chart
- **On-Page SEO Diagnostic** (`SwissWPSuite_OnPage_Audit`) — Pro-only audit engine scanning 6 factors: meta descriptions, meta titles, image alt text, schema markup, heading hierarchy, content length; weighted scoring (schema=3x, headings+meta=2x); 1-hour transient cache; cache invalidated on post publish; returns gap analysis and prioritized quick-wins
- **REST endpoint** `GET /swisswpsuite/v1/seo/onpage-audit` — Pro-gated, supports `?force=1` to bust cache
- **`OnPageDiagnostics` React component** — replaces static SEO breakdown panel in Dashboard; shows live factor scores with color-coded severity; "Run Audit" button for Pro users triggers on-demand drill-down

### Changed
- Dashboard SEO breakdown section now shows real on-page factor scores instead of static mock data (Pro unlocks drill-down; Free shows coverage metrics only)
- `get_stats()` API now returns real pageview data from the tracker table instead of empty zeros

---

## [2.9.27.13] - 2026-04-03

### Fixed
- **Sentinel L2 AI hallucination guardrails** — added 4 mandatory hard rules to the attack chain generation prompt: (A) never recommend a patch version that doesn't exist, (B) only include CVEs with a known CVE ID and high confidence, (C) only generate findings for plugins explicitly in the installed plugin list, (D) never reference a WordPress version higher than what is installed
- **Post-AI deterministic filter** (`filterHallucinatedChains`) — strips attack chains that mention a WordPress version higher than `site_context.wp_version` before the response reaches the plugin; catches the "update to 6.9.5 when 6.9.4 is current" class of hallucination
- Sentinel protocol version bumped to 2.2

---

## [2.9.27.12] - 2026-04-03

### Changed
- **Pro tier: unlimited Layer 2 AI scans** — removed hourly rate cap (previously 2/hour) and monthly quota (previously 1/month) for Pro and Full Suite license holders; Free tier limits unchanged
- Pro scan quota check now short-circuits locally without a VPS round-trip, making scan start faster for Pro users

---

## [2.9.27.11] - 2026-04-03

### Fixed
- **Basic Scan core file grouping** — v2.9.27.10 applied the risk-based categorization to the Full Sentinel Scan path only; this fix applies it to the correct path: `SwissWPSuite_Security::perform_core_scan()` and the inline renderer in SecurityHub
- Akismet MISS entries now show under "Uninstalled Bundled Plugins" (collapsed, informational) in Basic Scan results
- `readme.html`, `hello.php`, `xmlrpc.php` now show under "Commonly Removed Files" (collapsed, safe to ignore) in Basic Scan results
- Basic Scan summary count now only counts genuine modified core files, not uninstalled plugins or hardening-related deletions
- Backward-compatible: cached scan results without `category` field are reclassified client-side by file path

---

## [2.9.27.10] - 2026-04-03

### Changed
- **Core file integrity scan — risk-based categorization**: findings are now grouped into four categories: *Modified Core Files* (potential tampering — shown expanded with red badge), *Bundled Theme Files* (collapsed, yellow), *Uninstalled Bundled Plugins* (collapsed, blue — e.g. Akismet, Hello Dolly — this is expected when plugins are uninstalled), and *Commonly Removed Files* (collapsed, grey — e.g. `readme.html`, `xmlrpc.php`, `hello.php` — often deleted for security hardening)
- **Context-aware remediation text**: each category now shows specific advice instead of the generic "Reinstall WordPress" message which was incorrect for plugin-related findings
- **Accurate issue count**: the summary badge now only counts real threats (modified core files) — uninstalled plugins and deliberately removed files no longer inflate the count

---

## [2.9.27.9] - 2026-04-03

### Fixed
- **Closed/Abandoned Plugins false positives** — `swisswpsuite-ai` (commercial plugin, intentionally not on WordPress.org) and plugins with the `hostinger-` prefix (hosting-provider bundled tools) are now permanently excluded from the abandoned plugins check
- **"Not found" vs "removed" distinction** — the check now correctly distinguishes between plugins that were removed from WordPress.org (`closed: true` API flag) vs plugins that were never submitted (404 response); different severity and message text for each case
- **Basic scan results visibility** — scan findings are now fully rendered in the Security Hub Sentinel tab
- **Pro/AI scan completeness** — Pro scan now surfaces all findings that the basic scan detects, plus additional AI-powered analysis

---

## [2.9.27.8] - 2026-04-03

### Added
- **Restrict AI Crawlers to Homepage** (Free hardening option) — adds `robots.txt` rules via WordPress filter to prevent GPTBot, ClaudeBot, PerplexityBot, anthropic-ai, Bytespider, CCBot, cohere-ai, FacebookBot, and Google-Extended from crawling beyond the homepage; bot names are hardcoded (no user input)
- **Restrict Google to Homepage Only** (Free hardening option, high-risk) — adds `robots.txt` rules for Googlebot and Bingbot; requires confirmation dialog with explicit SEO impact warning before enabling
- Physical `robots.txt` file detection — both options detect a static `robots.txt` at the webroot and warn the user that the WordPress filter will be bypassed until the file is removed

---

## [2.9.27.7] - 2026-04-02

### Fixed
- "Disable Visitor-Triggered Scheduling" hardening toggle now explicitly warns that SwissWPSuite's backup automations will stop, and shows server cron setup instructions (cPanel → Cron Jobs, every 5 minutes) before the user confirms — prevents silent backup failures after enabling this option

---

## [2.9.27.6] - 2026-04-02

### Fixed
- SEO: Archive pages (blog listing, categories, tags) now output full OG tags, Twitter cards, meta description, and canonical — previously got zero meta tags due to `is_singular()` guard
- SEO: Blog listing page `<title>` was showing the latest post title instead of the page name — fixed
- SEO: `og:image` and `twitter:image` now fall back to a configurable "Default Social Image" when no featured image is set (homepage, blog listing, posts without thumbnails)
- SEO: Blog posts now output `article:published_time`, `article:modified_time`, and `article:author` OG tags for better Google News and social context
- SEO: Homepage JSON-LD schema changed from `Article` to `WebSite` + `WebPage` — `Article` type on a homepage is incorrect and confuses search engines

### Added
- Settings → SEO tab: New "Default Social Image" picker — upload a fallback 1200×630px image used when pages have no featured image set

---

## [2.9.27.5] - 2026-04-02

### Added
- "Drop Orphaned Tables" action in Settings → Maintenance — safely drops abandoned plugin tables with 5-layer protection: core table allowlist, active plugin slug matching, protected prefix guard (WooCommerce, Elementor, Yoast, Wordfence, etc.), regex validation, and `esc_sql()` defense-in-depth

### Fixed
- Sentinel AI no longer suggests using SwissWPSuite Database Cleanup for orphaned plugin tables (the two features solve different problems — clarified in remediation text and AI prompts)
- AI security audit no longer tells Free-tier users to enable 2FA or Geo-Blocking via SwissWPSuite without disclosing these are Pro-only features
- AI audit now covers all 11 hardening options (previously missing User Enumeration, WP Cron Public, Content Security Policy)
- Pro-only hardening options (Security Headers, REST API Guest Block, Author Archives, Bad Bots, WP Cron, CSP) now include Pro upgrade disclosure in AI remediation steps
- WAF and Login Protection AI recommendations now include Pro tier disclosure for Free-tier users

---

## [2.9.27.4] - 2026-04-02

### Added
- Database Cleanup section in Settings → Maintenance with five new one-click actions: remove orphaned postmeta, remove orphaned commentmeta, permanently delete trashed posts, remove abandoned auto-drafts, and clean orphaned term relationships

### Fixed
- Auto-draft cleanup now only targets drafts older than 7 days — prevents accidentally destroying an active block editor session open in another browser tab
- Term relationship cleanup now recalculates `wp_term_taxonomy` counts after deleting orphaned rows, preventing stale category/tag counts

---

## [2.9.27.3] - 2026-04-02

### Fixed
- Google Drive cloud backups now correctly capture the file ID from the upload completion response — prune and delete operations now work reliably on GDrive-backed sets
- Backblaze B2 cloud backups now correctly delete files using the composite `fileId||fileName` key required by the B2 API
- Backup worker spawn timeout increased from 1 second to 5 seconds — prevents missed scheduled backups when the VPS TCP/TLS handshake is slow

### Added
- WP-Cron visitor-dependency notice in the Backup Automations panel — explains why scheduled backups may be delayed on low-traffic sites and links to the Server Cron setup guide
- Circuit breaker status notice in the Backup Automations panel — amber warning badge when automations are paused after repeated consecutive failures
- Cloud storage cross-border data transfer disclosures per provider (AWS S3 US, Google Drive US, Dropbox US, Backblaze B2 US/EU) for GDPR/Swiss nDSG compliance
- Dismissible PII/data-processor notice on the Cloud Storage panel advising users to review their provider's DPA before connecting

---

## [2.9.27.2] - 2026-04-02

### Fixed
- Security alert no longer reappears after dismissal when the attacker rotates IPs within the same /24 subnet — fingerprint now normalizes to subnet level
- Alert dismiss state persisted to localStorage (24h TTL) so it survives page reloads

---

## [2.9.27.1] - 2026-04-01

### Fixed
- Security scan Attack Chain view no longer crashes when the AI returns an unexpected exploitability value — unknown values now degrade gracefully with a neutral label instead of throwing a fatal render error
- Scan findings list no longer crashes on unknown severity values — sort order, border, and badge all have safe fallbacks
- License activation now shows a clear actionable message when a key is locked to another domain

---

## [2.9.27.0] - 2026-04-01

### Added
- Patchstack Community API integrated as a parallel CVE source alongside WPScan — findings now show dual-source confidence scoring (HIGH when both agree, MEDIUM for single source)
- WordPress.org core integrity check now caches the official checksum manifest for 24 hours, reducing external API calls and adding an on/off toggle in Settings
- Abandoned/closed plugin detection — new daily background check flags any installed plugin that has been removed or closed by WordPress.org (a strong indicator of security compromise or unpatched vulnerability)
- MalwareBazaar bulk import — PHP-tagged malware hashes from MalwareBazaar are now imported nightly into the local threat database alongside URLhaus, replacing the previous per-scan live API fallback

### Security
- VPS threat database `malware_signatures` table now includes a `source` column (urlhaus / malwarebazaar) for signature attribution and auditability

---

## [2.9.26.10] - 2026-04-01

### Fixed
- Auto-clear stale migration state on new migration start to prevent false "migration in progress" errors
- Deferred `flush_rewrite_rules` after DB import to resolve "No route found" / 404 errors post-migration
- Emergency theme restore endpoint triggered on retry exhaustion during migration to recover broken themes
- Deferred cron cleanup on plugin deactivation to prevent timing issues

---

## [2.9.26.9] - 2026-04-01

### Fixed
- Backup tab blank on sites with LiteSpeed Cache or other caching plugins — caused by duplicate script injection loading the React app twice, creating two RouterProvider instances and crashing with "You cannot render a Router inside another Router"
- Added double-load guard in app entry point with HMR-aware exception for dev mode

---

## [2.9.26.8] - 2026-03-31

### Fixed
- SEO Enhance — automatic retry on Groq JSON validation failures (stochastic ~5-10% base rate)
- SEO Enhance ~50% failure — simplified prompt to be compatible with Groq JSON mode
- Root cause: strict character constraints ("BETWEEN 30 AND 60", "MUST be", "CRITICAL") conflicted with JSON validation
- JSON parse failures from control characters in AI responses — automatic sanitization added
- Removed incompatible JSON mode parameter that caused API rejection on content rewrite
- Enhanced diagnostic logging for empty AI responses (includes finish_reason and model)

### Added
- Diagnostic logging for SEO Enhance JSON parse failures (model, raw response, extracted JSON)
- Error code distinction in SEO content generation API responses

---

## [2.9.26.2] - 2026-03-31

### Fixed
- Crash after L2 AI scan when AI response omits `scan_metadata` (TypeError: Cannot read properties of undefined reading 'findings_count')
- Added defensive defaults for all AI-sourced fields: scan_metadata, attack_chains, remediation_plan, positive_findings
- ScanHistoryTable null safety for findings_count and critical_count

---

## [2.9.26.1] - 2026-03-31

### Fixed
- "Fix Permissions" button now shows manual Hostinger hPanel guide when chmod fails (was showing a dead-end toast)
- Added diagnostic logging for chmod failures (previously only successes were logged)
- Fixed undefined `finding_code` in L1 scan fix requests (finding.code and finding.file_path were always undefined)

---

## [2.9.26.0] - 2026-03-31

### Security
- WAF now blocks PHP file execution in upload directories (Pro) — prevents webshell execution via `/wp-content/uploads/*.php`
- Plugin vulnerability scanner expanded from 5 to 20 hardcoded CVEs covering ThemeREX, WooCommerce Custom Product Addons Pro, SureTriggers, LiteSpeed Cache, Bricks Builder, and more

### Added
- WPScan API v3 integration for real-time vulnerability scanning with 24h transient caching
- WPScan API Key field in Settings > Security tab (optional — for agencies with existing WPScan accounts)
- Deterministic `version_compare()` validation on all CVE results (never trusts API blindly)

### Changed
- M4-D2 scanner now uses hybrid strategy: WPScan API first, hardcoded fallback when API unavailable

---

## [2.9.24.2] - 2026-03-28

### Security
- PBKDF2 iterations upgraded from 10,000 to 310,000 (OWASP 2023 minimum) with backward-compatible version header migration
- WAF Basic tier now decodes HTML entities before pattern matching — closes entity-encoded XSS/SQLi bypass
- WAF now inspects uploaded filenames and MIME types from $_FILES for malicious patterns
- XML-RPC multicall check decodes HTML numeric entities (&#115;ystem.multicall bypass closed)

### Fixed
- Undefined `$new_path` in `run_url_replace()` — path-based search-replace was silently broken
- SEO rate-limit retry now capped at 5 attempts with exponential backoff (60s → 960s) — prevents infinite ghost loop
- Sitemap generation: replaced `get_posts(-1)` with paginated WP_Query (200/page) — prevents OOM on large sites
- Dual SEO prompts consolidated into `SwissWPSuite_Groq::build_seo_prompt()` single source of truth
- Duplicate cron closures on `swisswpsuite_daily_sentinel_scan` merged into single callback
- WooCommerce price context restored in single-item SEO prompt path

### Changed
- 49 occurrences of `text-[10px]` replaced with WCAG AA compliant `text-xs` (12px) across 11 UI files
- Dead `layer1_only` removed from TypeScript `scan_type` union — narrowed to match backend output
- Removed dead `const VERSION` from encryption class (replaced by `ENCRYPTION_VERSION_1`/`ENCRYPTION_VERSION_2`)

---

## [2.9.24.1] - 2026-03-28

### Fixed
- **ROOT CAUSE:** Added COMMIT before every `return 'partial'` in receiver SQL parser — `SET autocommit=0` without COMMIT caused MySQL ROLLBACK on connection close, silently losing all queries per chunk (caused 8/12 missing tables on InfinityFree).
- Reconnect handler now re-applies full import preamble (FK_CHECKS=0, UNIQUE_CHECKS=0, AUTOCOMMIT=0) after every mid-import reconnection.
- Single-row INSERTs exceeding 80% of max_allowed_packet now skipped with logging instead of killing the connection.
- Time budget reduced from 20s to 12s default, multiplier 0.6 to 0.5 for restrictive hosts (InfinityFree 10s server-enforced kill).
- `receiver_save_state()` return value now checked — returns HTTP 507 on disk-full/unwritable.
- Search-replace COMMIT failure now detected with reconnect + retry (previously lost UPDATEs silently).
- Search-replace UPDATE failures now logged with table name and PK (previously completely silent).
- SET sql_mode/FK_CHECKS/UNIQUE_CHECKS/AUTOCOMMIT failures now logged (previously silent @ suppression).
- Periodic COMMIT (every 500 queries) failure now triggers reconnect + preamble re-application.
- Buffer carry-over guard: >2MB skips file read to parse existing; >5MB emergency skip.
- Block comments preceding SQL (`/* comment */ INSERT...`) now stripped and executed instead of silently dropped.
- Added `utf8mb4_0900_ai_ci` (MySQL 8.0+ default) to collation replacement adapter.

---

## [2.9.24.0] - 2026-03-28

### Fixed
- Mode B receiver: SQL parser now tracks comment states (line comments, block comments) to prevent false statement splits on semicolons inside comments.
- Mode B receiver: recursive file download converted to iterative loop, preventing stack overflow on large ZIP transfers.
- Mode B receiver: search-replace resume path now runs plugin deactivation and theme switch safety nets (previously skipped, causing WordPress fatal errors).
- Mode B receiver: connection-alive check added before post-import safety-net queries to prevent silent failures after long search-replace passes.
- Mode B receiver: HTTP 410 response with JSON body on script expiry (previously returned empty 200).
- Mode A import: foreign key checks and unique checks now disabled during bulk import for up to 1000x InnoDB performance improvement.
- Mode A import: comment state tracking added to SQL parser (mirrors Mode B fix).
- Mode A import: DEFINER clause stripping now handles all 3 MySQL syntaxes (backtick, single-quote, unquoted) and applied to execution query (not just inspection copy).
- Mode A import: plugins token rotation now uses dedicated storage keys (previously fell through to SQL keys, causing multi-chunk plugin downloads to fail).
- Mode A import: download counter is now per-type (sql/theme/media/plugins) so large SQL downloads no longer exhaust the budget for subsequent asset downloads.
- Mode A import: max_allowed_packet value now persisted across chunks (previously fell back to 1MB default on resume).
- JSON-escaped URL search-replace added for Elementor _elementor_data and Gutenberg block attributes (both Mode A and Mode B).
- Source table prefix auto-detection from SQL dump with two-phase confirmation (candidate from CREATE TABLE + verification from second core table).
- Table prefix meta_key remap (wp_capabilities, wp_user_level, wp_user_roles) after prefix change, preventing admin lockout.
- Array keys now included in recursive serialization-safe search-replace (previously only values were replaced).
- wp_commentmeta table added to post-import search-replace pass.
- generate_passport() API endpoint now returns proper WP_Error when no export exists.

### Security
- wp-config.php generated with 0440 permissions (was 0644) — no longer world-readable on shared hosting.
- HMAC signature verification now applied to all download URLs (theme, plugin, media), not just SQL.
- SET PASSWORD and SET ROLE added to SQL import blocklist.
- Table prefix re-validated after credential decryption (defense-in-depth against encryption key compromise).
- DEFINER clauses stripped from CREATE VIEW/TRIGGER/PROCEDURE to prevent privilege escalation errors.
- State file and SQL temp file now cleaned up during self-destruct.
- register_shutdown_function() safety net ensures receiver deletion even if cleanup crashes.
- Wordfence auto_prepend_file stripped from .user.ini during migration (hardcoded source-server paths cause fatal errors).
- Object-cache.php and advanced-cache.php removed post-import (source-site cache drop-ins crash destination).

### Added
- Performance preamble for SQL import: SET foreign_key_checks=0, unique_checks=0, autocommit=0 with periodic COMMIT.
- Idempotency guard prevents double-start race condition on migration.
- State log capped at 200 entries to prevent state file bloat on large imports.
- New domain validation prevents migration without domain replacement.
- CURLOPT_FOLLOWLOCATION enabled for WordPress core downloads (handles CDN redirects).
- mysqli_ping() replaced with $conn->query('DO 1') for PHP 8.4 forward-compatibility.
- max_allowed_packet pre-check before query execution with automatic INSERT splitting.

---

## [2.9.23.0] - 2026-03-27

### Security
- Geo-blocking bypass token now uses HMAC derivation (IP + time-window bound) instead of static token — database read access alone no longer sufficient to bypass geo-blocking.
- Sync push handler now scans `post_content`, `post_content_filtered`, and `meta_input` for embedded PHP webshell patterns (14 literal-match signatures).
- Expanded sync meta redaction blocklist with 6 additional credential patterns (`private_key`, `jwt`, `bearer`, `encryption_key`, `aws_key`, `signing_key`).
- SQL import pre-scan now detects `DELIMITER` statements (stored procedure indicator) and blocks them — WordPress backups never contain these.
- Extended SQL pre-scan window for large buffers — catches dangerous keywords (`GRANT`, `REVOKE`, `CREATE PROCEDURE`, `INTO OUTFILE`) pushed past the 200-character preamble by comment padding.

### Fixed
- Geo-blocking API now rate-limited to 30 lookups/minute with fail-closed circuit breaker (5 consecutive failures activates 10-minute cooldown) — prevents API exhaustion attacks.
- Concurrency lock `is_held()` now fails closed — if the lock file exists but cannot be read, assumes locked instead of unlocked.
- Backup tick time budget now uses CPU time (`getrusage()`) when available instead of wall-clock — prevents premature yield on I/O-throttled shared hosting.
- Backup tick lock acquisition now always checks lock age before attempting acquisition — eliminates TOCTTOU race window between concurrent ticks.
- VPS license expiry cron now uses PostgreSQL advisory lock to prevent concurrent execution.
- VPS logger now outputs structured JSON in production (pino-pretty only in development).

### Added
- VPS admin key recovery endpoint (`POST /v1/admin/recover`) with bcrypt-hashed recovery key and hourly rate limiting — prevents permanent lockout if `.env` is lost.

---

## [2.9.22.1] - 2026-03-27

### Security
- Converted all SQL string interpolation to `$wpdb->prepare()` or `esc_sql()` across REST API endpoints — eliminates copy-paste risk and removes all `phpcs:ignore` suppressions.
- Replaced 8 `die()` calls in backup stream handler with proper `echo` + `exit` pattern and added resource cleanup (`fclose()`) in exception handler to prevent orphaned file locks.
- Fixed `perform_log_analysis()` SQL interpolation in security class.

### Fixed
- Added missing `code` and `file_path` fields to `SentinelLayer1Finding` TypeScript interface — resolves 2 pre-existing `tsc` type errors.

---

## [2.9.22.0] - 2026-03-27

### Added
- Backup Set metadata layer — groups all ZIP files from a single backup into one logical "set" stored in `wp_options`.
- Set-based retention — automated backups now prune by sets (keep N newest sets) instead of individual files.
- Set-based restore endpoint — restores all files in a set in correct order (database first).
- Set-based delete endpoint — removes all local and cloud files plus the set record.
- Grouped backup list UI — sets display as expandable rows with scope badges, cloud badges, duration, and file count.
- Legacy migration — existing backup files are automatically converted to set records on first list load.
- Orphan scanner detects engine-format ZIP files that have no matching set record.
- Cancel UX — progress bar turns amber and shows "Stopping backup..." during cancellation.

### Fixed
- Cancel flag path mismatch — API endpoint was writing to the wrong directory; cancel now works reliably with the chunked engine.
- Stale tick lock recovery — locks older than 5 minutes are automatically released, preventing permanently stuck backups.
- Sentinel heartbeat injection — automated backups now pass the Sentinel instance to the engine for watchdog progress signals.

---

## [2.9.21.2] - 2026-03-27

### Security
- Sentinel: Fixed critical contract bug — active defenses (WAF, Login Safeguard, 2FA, Cloudflare) now visible to AI scanner. Previously the AI always saw empty protections, inflating all severity levels.
- Sentinel L1: Added word boundaries to malware content signatures — prevents false positives in minified JavaScript.
- Sentinel L1: Removed dead hex content signature that could match legitimate code.
- Sentinel L2: AI prompt now verifies L1 findings before building attack chains — stops false positive cascade.
- Sentinel L2: Info-level findings (license.txt, readme.html) excluded from attack chain generation.
- Sentinel L2: Grade calculation now accounts for active protections — all-BLOCKED chains yield minimum grade C.

---

## [2.9.21.1] - 2026-03-27

### Fixed
- Sentinel L1: Malware filename patterns now use word boundaries — prevents false positives when Webpack/Vite content hashes accidentally contain webshell substrings (e.g. `c99` inside `4b0c992fe7d6`).
- Security Hub: Scan error toasts now show the actual error message (e.g. rate limit) instead of misleading "check your connection."

---

## [2.9.21.0] - 2026-03-27

### Major
- Backup: Complete rewrite of backup engine — new chunked multi-tick architecture that works reliably on Hostinger, LiteSpeed, and Cloudflare.
- Backup: Each backup tick completes in under 60 seconds, surviving all hosting timeout limits.
- Backup: Resumable cloud uploads — Google Drive, S3, Dropbox, B2 sessions persist across ticks.
- Backup: Progressive progress bar with phase labels, percentage, and ETA.
- Backup: ZIP splitting for sites over 400MB — split by category (plugins, themes, uploads).
- Backup: Self-chaining tick dispatcher with 5-minute health check recovery.
- Backup: Cancel button works immediately — checked between every tick.
- Backup: 100MB per-file size cap prevents memory exhaustion on large media files.
- Backup: LiteSpeed noabort/noconntimeout rules auto-added for reliable background processing.

---

## [2.9.20.8] - 2026-03-27

### Security
- Sentinel L2: 3-layer defense-in-depth for CVE false-positive elimination — AI prompt version rules, VPS-side deterministic validation, PHP-side `version_compare()` catch.
- Sentinel L2: Fixed min-bound operator bug — `> X.Y.Z` (strict) was incorrectly treated as `>= X.Y.Z` (inclusive) in both PHP and JS version range parsing.
- Sentinel L2: Enriched `site_context` with structured plugin inventory (name, version, slug, active status) for accurate version comparison.

---

## [2.9.20.7] - 2026-03-27

### Improved
- 2FA: Account identifier now uses site domain instead of user email — each site shows distinctly in authenticator apps when managing multiple WordPress sites.
- Security Hub: Added "Set up Two-Factor Authentication" link in the Login Safeguard card — direct navigation to Settings > Security tab.
- Settings: Tab deep-linking support (`?tab=security`) for direct navigation from other pages.

---

## [2.9.20.6] - 2026-03-27

### Fixed
- 2FA: Replaced buggy custom PHP QR code generator with battle-tested `qrcode.react` library — QR codes now render perfectly and are reliably scannable by all authenticator apps.

---

## [2.9.20.5] - 2026-03-27

### Fixed
- 2FA: Corrected all QR code spec lookup tables (data codewords, block structure, capacity) — every version had wrong values, making all generated QR codes undecodable.

---

## [2.9.20.4] - 2026-03-26

### Fixed
- 2FA: QR code generator now produces scannable QR codes — added missing alignment patterns, fixed data codeword interleaving, and corrected character count indicator for higher QR versions.
- 2FA: QR code display increased from 160px to 200px for easier phone scanning.

### Improved
- Cloud Backup: Enhanced cloud storage provider reliability (B2, Dropbox, FTP, GDrive, S3) with improved error handling and timeout management.
- Backup: New tick-based backup engine with improved scheduling and progress tracking.
- Frontend: Refreshed Cloud Storage, License Manager, and Backup UI panels.

---

## [2.9.20.2] - 2026-03-26

### Fixed
- Backup: Added `ignore_user_abort(true)` to manual backup endpoint — Cloudflare 524 timeout no longer kills the PHP process mid-backup.
- Backup: Sentinel heartbeat timeout increased from 5 to 10 minutes — stops false stuck-job detection during large archive creation.
- Backup: Added archiver excludes for LiteSpeed cache, upgrade temp files, and debug.log — reduces backup size significantly on sites with LiteSpeed.

---

## [2.9.20.1] - 2026-03-26

### Fixed
- Cloud Backup: Sentinel watchdog now syncs failure status back to automation records — prevents permanent "running" zombie state.
- Cloud Backup: Stale-running watchdog auto-resets automations stuck in "running" for over 2 hours.
- Cloud Backup: Added Cancel button for automation backups (previously only worked for manual backups).
- Cloud Backup: Added 'cancelled' to automation status allowlist — shows "Cancelled" instead of "Failed" on user cancel.
- Cloud Backup: Manual backup retention enforced (keeps last 10) — old manual backups no longer accumulate forever.
- Cloud Backup: Automation backup retention now enforced on list load — catches failed-upload leftovers that exceeded retention.

---

## [2.9.20.0] - 2026-03-25

### Improved
- Cloud Backup: cURL timeouts added to all upload methods across all 5 cloud providers — prevents indefinite hangs.
- Cloud Backup: Upload retry logic improved for S3, B2, Dropbox, and FTP with exponential backoff.
- Cloud Backup: Real error messages from cloud providers shown in automation status instead of generic failures.
- Cloud Backup: Sentinel watchdog receives heartbeat updates during uploads — no longer kills legitimate long-running transfers.
- Cloud Backup: Circuit breaker stops endless restart loops after 3 consecutive stuck uploads.
- Cloud Backup: Cancel button works during cloud upload phase with server-side session cleanup.
- Cloud Backup: Orphan file detection and one-click cleanup for files left by deleted automations.
- Cloud Backup: Backup list shows storage location (Local, Google Drive, S3, Dropbox, FTP, B2).
- Cloud Backup: Backblaze B2 part size optimized from 100 MB to 25 MB for better memory usage.
- Cloud Backup: Dropbox and FTP upload timeouts extended for slow shared hosting connections.

---

## [2.9.19.0] - 2026-03-25

### Improved
- Cloud Backup: Google Drive one-click connection — users no longer need to create their own Google OAuth app. Connect with a single click via SwissWPSuite servers.
- Cloud Backup: Dropbox one-click connection ready — activates automatically when Dropbox production approval is granted.
- Cloud Backup: Status endpoints now detect VPS OAuth proxy availability for fresh installs.
- Cloud Backup: Fixed self-hosted OAuth callbacks redirecting to wrong admin page.
- Cloud Backup: Fixed variable shadowing in OAuth callback URL cleanup.
- Cloud Backup: Self-hosted OAuth flow now explicitly stores connection mode for reliable status reporting.

---

## [2.9.18.0] - 2026-03-25

### Security
- Firewall: New command injection protection — detects and blocks OS shell command attempts in form submissions and API requests (Pro).
- Firewall: New XXE (XML External Entity) injection protection — prevents attackers from exploiting XML parsers to read server files (Pro).
- Firewall: New encoding detection layer — catches attack payloads hidden behind Base64 encoding (Pro).
- Firewall: XML-RPC brute force amplification blocking — prevents batched login attacks via XML-RPC (Pro).
- Firewall: Improved path traversal protection — blocks advanced encoded directory traversal attempts used to access files outside the web root (all tiers).
- Firewall: Protection against WordPress Interactivity API XSS attacks introduced in WordPress 6.5+ (Pro).
- Firewall: Simulation mode improved — test mode no longer accidentally triggers IP bans.
- Firewall: Fixed a bypass vulnerability that could allow attackers to disable firewall checks on specific requests.
- Site identity verification upgraded to use stronger hashing — existing sites are upgraded automatically.

### Added
- Security scanner now flags outdated WordPress versions with severity-based alerts.
- Security scanner now checks your PHP version for XML-related security risks.
- Security scanner now detects known-vulnerable plugins installed on your site and recommends action.

### Fixed
- Improved reliability of firewall checks on JSON API requests.
- Fixed edge cases where certain attack patterns with extra whitespace could bypass detection.

---

## [2.9.17.0] - 2026-03-24

### Security
- AI features hardened — request validation and rate limiting prevent abuse of AI-powered tools.
- HTTPS enforcement strengthened with HSTS preload support.
- Improved protection against server-side request forgery (SSRF) including IPv6 address validation.
- License feature verification upgraded to prevent tier escalation.
- Sensitive credentials are now fully masked in all server logs.
- Payment webhook reliability improved with automatic retry for failed events.
- Graceful server restarts — in-progress AI requests complete before shutdown to prevent token loss.

### Added
- Payment warning banner — amber notification appears when a payment issue is detected, with a direct link to update your payment method.
- Improved payment event tracking for better reliability.

### Fixed
- Trial period can no longer be extended by re-activating a license.
- Token usage correctly blocked when payment is overdue.
- Improved plan tier consistency across all features.

---

## [2.9.16.0] - 2026-03-24

### Fixed
- License activation is now more reliable when multiple requests happen simultaneously.
- Yearly plans that converted from a trial no longer incorrectly expire.
- Site identity verification now persists correctly across daily license checks.
- Token renewal now correctly matches the right subscription when multiple plans exist.
- Cancel subscription button now works correctly from the plugin settings page.

### Added
- Deactivating the plugin now releases the domain lock, allowing you to move your license to a new site.
- Automatic downgrade to free tier when a payment fails — with clear notification to update your payment method.
- Multiple module token stacking — users with Security + SEO get combined token allocations.
- Improved trial abuse detection.

### Security
- License activation hardened against race conditions.
- Plan tier validation prevents unauthorized feature access.

---

## [2.9.15.0] - 2026-03-21

### Changed
- **Migration engine rewrite:** Improved domain replacement engine eliminates data corruption during site migration.
- Scheme-aware 4-entry replacement map handles http/https variants automatically.
- Dynamic memory threshold replaces the old 1MB hard limit for serialized data processing.

### Fixed
- Large database imports now work reliably on shared hosting with strict size limits.
- Improved domain replacement accuracy for Mode B migrations.
- Permalinks and cache are automatically refreshed after migration completes.

### Security
- Major security hardening: 13 vulnerability fixes identified by professional penetration testing.
- 6 stability fixes for edge cases during plugin startup.
- 3 new hardening options: block user enumeration (Free), disable public WP-Cron (Pro), Content Security Policy (Pro).
- Expanded security headers: Permissions-Policy (8 directives), COOP, CORP, CSP-Report-Only.
- REST API whitelist tightened.
- Smart email alerts — only actionable threats (malware, brute force, integrity, license, backup failure) trigger notifications.

### Added
- 11 total hardening options (5 essential free + 6 advanced pro).
- Confirmation dialogs for dangerous hardening toggles.
- Runtime conflict monitor for security plugin compatibility.
- UX redesign: plain English descriptions, 3-tier layout, risk-colored badges.

---

## [2.9.12.0] - 2026-03-18

### Added
- **Mode B migration:** Standalone receiver for migrating to empty or broken destinations.
- HMAC dual-key authentication for receiver security.
- WP Core auto-install for bare servers (downloads from wordpress.org).
- Chunked SQL download with signed URLs.
- Improved database compatibility for MariaDB 10.6 hosts.
- Added database diagnostic tool for Mode B migration troubleshooting.

### Fixed
- Fixed firewall incorrectly blocking the plugin's own internal requests.
- Hardening toggle now shows a clear warning if server file changes cannot be applied.

---

## [2.9.7.70] - 2026-03-14

### Fixed
- Mode A migration confirmed working end-to-end.
- Serialization-safe search-replace verified.

---

## [2.9.6.2] - 2026-02-28

### Fixed
- TEST AI CONNECTION: "License Invalid" false failure resolved.

---

## [2.9.6.0] - 2026-02-28

### Added
- Improved security scanner with enhanced detection capabilities.
- Multiple detection accuracy fixes across all scanner modules.
- Free tier quota gate enforcement.

### Changed
- Upgraded AI models for faster and more accurate results across all AI features.

---

## [2.9.5.2] - 2026-02-27

### Added
- Expanded internal security testing capabilities.
- Improved vulnerability detection coverage.

---

## [2.9.4.1] - 2026-02-26

### Changed
- Restructured licensing tiers for clearer feature access.
- 55 quality improvements across all features.

---

## [2.9.3.0] - 2026-02-24

### Fixed
- Improved compatibility when switching between license tiers.
- Token balance now resets correctly on plan downgrade.
- AI Analyze button correctly restricted to Pro users.

---

## [2.9.2.8] - 2026-02-24

### Added
- Quarantine bulk action.
- AI Analysis modal.

---

## [2.9.2.7] - 2026-02-23

### Fixed
- Fixed dialog windows appearing behind other elements.
- Improved text readability in Bulk AI Report.
- Deep scan reliability improvements (timeout handling, error reporting).
- Fixed scanner getting stuck on large sites.

---

## [2.9.1.7] - 2026-02-21

### Added
- Tiered WAF (basic=free, advanced=Security/Full Suite).
- WAF tier messaging in Defense Hub.
- 2FA and hardening action buttons.

---

## [2.9.1.3] - 2026-02-20

### Added
- Comprehensive AI action buttons.
- Firewall Advisor rebuild.

### Fixed
- Log Advisor WAF button bans IP + refresh fix.
- Live security feature bug fixes (8 issues).

---

## [2.9.0.9] - 2026-02-19

### Security
- Security audit fixes and infrastructure hardening.

---

## [2.9.0.8] - 2026-02-18

### Added
- Additional security endpoints and infrastructure hardening.

---

## [2.9.0.1] - 2026-02-17

### Added
- First unified release build.

---

## [2.8.9.9] - 2026-02-17

### Added
- Initial release of SwissWPSuite.
