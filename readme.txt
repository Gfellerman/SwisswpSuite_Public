=== SwissSuite AI — WordPress Security, Backup & AI SEO Plugin ===
Contributors: swisswpsecure
Tags: security, backup, malware scanner, firewall, two-factor authentication
Requires at least: 6.2
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 2.9.30.124
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

All-in-one WordPress security plugin. Malware scanner, firewall, 2FA, site backup, migration, and AI SEO — one plugin, zero bloat.

== Description ==

SwissSuite AI is an all-in-one WordPress security plugin that bundles a malware scanner, web application firewall, two-factor authentication, scheduled site backup, site migration, and AI-powered SEO tools into a single install. One plugin. One settings screen. No add-ons to chase.

Most sites end up with five plugins doing what one plugin should do — a security plugin, a backup plugin, a migration plugin, an SEO plugin, and a cache plugin. Every extra plugin is another auto-update, another DB table, another performance hit, another attack surface. SwissSuite replaces the security, backup, migration, and SEO layer with one tightly integrated codebase.

[youtube https://www.youtube.com/watch?v=PLACEHOLDER]
<!-- TODO: Replace PLACEHOLDER with real YouTube video ID after recording -->

= Sentinel Security =
* Malware scanner with 38+ detection patterns plus optional AI deep analysis (Groq-powered)
* Web Application Firewall with SQL injection, XSS, and path traversal blocking
* IP reputation and rate limiting with admin IP safelist
* 11 one-click WordPress hardening options (XML-RPC, file editing, user enumeration, REST API, application passwords, and more)
* Two-Factor Authentication (TOTP) for every user role — works with Google Authenticator, Authy, 1Password
* Geo-blocking with country-level allow and deny rules
* Real-time email alerts and daily security report
* Vulnerability lookups via WPScan and Patchstack (bring your own API key)

= Backup Fortress =
* Full WordPress backup (files + database) with hybrid zip engine — pure PHP, no shell exec
* Scheduled site backup with rolling retention and auto-prune
* Cloud destinations: Google Drive, AWS S3, Backblaze B2, Dropbox
* One-click restore with serialized-string-safe domain replacement
* Optional AES-256 encryption-at-rest for backup archives
* Adaptive health check that adjusts to slow shared hosts instead of killing in-progress jobs

= Sync Teleport =
* Two-way content sync between WordPress sites (staging ↔ production)
* HMAC-signed encrypted transport — no plaintext credentials cross the wire
* Smart diff comparison before any change is written
* Selective push: posts, products, media, FSE templates

= Migration Station =
* Mode A: plugin-to-plugin migration when both sites have SwissSuite installed
* Mode B: standalone receiver script for migrating to an empty or broken destination
* Serialization-safe domain replacement (handles serialized arrays and JSON-in-meta)
* Chunked transfer tuned for shared hosting (Hostinger, SiteGround, IONOS)
* Post-migration verification step that confirms site URL, theme, and plugin count

= AI SEO & Content =
* Bulk meta title and description generation
* AI content rewriting and tone control
* Vision AI for automatic image alt text
* XML sitemap generator with custom post type support
* On-page SEO audit and score
* llms.txt generator so AI crawlers can find your authoritative content

= Why SwissSuite? =

**vs Wordfence:** Wordfence is security-only. You still need a separate backup plugin (UpdraftPlus, BlogVault), a separate migration plugin (Duplicator, All-in-One WP Migration), and a separate SEO plugin (Yoast, RankMath). That's four plugins, four update channels, four monthly costs. SwissSuite covers all four layers in one install.

**vs UpdraftPlus:** UpdraftPlus is backup-only. It does not scan for malware, does not provide a firewall, does not handle 2FA, and has no SEO tools. SwissSuite includes a full backup engine plus everything UpdraftPlus does not.

**vs Yoast / RankMath:** Yoast and RankMath are SEO-only. They cannot detect a hacked site, cannot back up your content before an algorithm penalty, and cannot block a brute-force attack on your admin login. SwissSuite includes AI-powered SEO plus the security layer that protects your rankings.

= Perfect for =

* **Freelancers** managing 5-50 client sites who do not want to install and configure five plugins per site
* **Agencies** that need a single security and backup standard across an entire portfolio
* **WooCommerce stores** that need PCI-friendly security plus reliable nightly backups
* **High-traffic blogs** that cannot afford downtime from a hack or a botched plugin update
* **Site owners** who would rather pay for one plugin than five

= Privacy & Data =

SwissSuite does not phone home on install. No background telemetry. External services are contacted only when you explicitly enable them (cloud backup, AI analysis, vulnerability lookup). Every external service is disclosed below.

== Installation ==

1. In WordPress Admin, go to Plugins → Add New → Upload Plugin.
2. Upload the SwissSuite AI zip and click Install Now.
3. Activate the plugin.
4. Open the SwissSuite menu in the WordPress sidebar.
5. Click "Get Free License" on the License tab — enter your email and the plugin auto-provisions a free license locked to your domain.
6. Run your first malware scan from the Security Hub → Scan tab.

= Minimum Requirements =

* WordPress 5.6 or higher
* PHP 7.4 or higher
* HTTPS recommended for two-factor authentication

== Frequently Asked Questions ==

= Is SwissSuite AI free? =

Yes. The free tier includes daily malware scans, the web application firewall, 5 hardening options, two-factor authentication, and the on-page SEO audit. You do not need a credit card to get started. Paid tiers unlock advanced features like cloud backup, site migration, AI content rewriting, and the deep AI security audit.

= How do I block countries in WordPress? =

Open SwissSuite → Security Hub → Geo-Blocking. Pick "Block list" mode and select the countries you want to deny. The list is enforced at the firewall layer before WordPress loads, so blocked countries cannot brute-force your login page or hit your REST API. You can also use "Allow list" mode to restrict access to a single country (useful for staging sites).

= What is the best WordPress 2FA plugin? =

If you already use SwissSuite for security, the built-in TOTP two-factor authentication is the simplest answer — no extra plugin to install, no compatibility risk between the WAF and the 2FA layer. It works with Google Authenticator, Authy, 1Password, Bitwarden, and any other TOTP app. Enable it from Security Hub → Two-Factor Authentication and scan the QR code with your authenticator.

= How do I scan my WordPress site for malware? =

Open SwissSuite → Security Hub → Scan tab. You have three scan types: Quick Scan (local signature check, fast, free), AI Security Audit (configuration and integrity audit, daily auto-scan, free), and Deep Malware Scan with AI (file hashes checked against MalwareBazaar plus AI analysis, Pro tier). The first scan typically takes 30-90 seconds depending on site size.

= Does this replace Wordfence? =

Yes. SwissSuite includes everything Wordfence does — malware scanner, firewall, login protection, two-factor authentication, country blocking — and adds backup, migration, and SEO that Wordfence does not have. If you are running Wordfence and a separate backup plugin and a separate SEO plugin, SwissSuite is a one-for-three swap.

= How do I back up my WordPress site automatically? =

Open Settings → Backup → Schedule. Pick a frequency (hourly, daily, weekly) and a retention count. Optionally connect a cloud destination (Google Drive, S3, B2, or Dropbox) under Settings → Backup → Cloud. The backup cron runs unattended; you can check the last completion time on the Dashboard.

= Can I migrate my WordPress site without manual SQL edits? =

Yes. SwissSuite handles serialized string replacement automatically — no need to run wp-cli search-replace or hand-edit the SQL dump. Use Mode A if the destination site already has SwissSuite installed. Use Mode B if the destination is empty or broken: the plugin generates a standalone receiver script you upload to the destination, then push the migration.

= What AI features are included in the free version? =

The AI Security Audit runs daily on the free tier at zero token cost (Layer 1 is signature-based, not AI). The on-page SEO audit and XML sitemap generator are free. AI-powered features that consume tokens — deep malware analysis, bulk SEO meta generation, content rewriting, image alt text — are gated to paid tiers. Free accounts include 50,000 tokens per month for occasional AI use.

= Is SwissSuite compatible with WooCommerce? =

Yes. The firewall has an explicit allowlist for WooCommerce REST routes (wc/v3, wc/store/v1, wc/store/v2, wc-analytics/v1, wc-admin/v1, wc-auth/v1) so cart, checkout, and the Store API work normally even with hardening enabled. The backup engine handles WooCommerce-specific tables (orders, customers, sessions) and the sync layer pushes products between staging and production.

= How many sites can I use one license on? =

Each license key is locked to one domain. For multi-site management, contact support — agency tiers are available with discounted per-site pricing. The free license is also domain-locked, so you can run a free install on every site you manage at no cost.

== Screenshots ==

1. Security Hub dashboard — threat count, scan status, and hardening score at a glance.
2. Malware scan results — file list with threat classifications and inline AI analysis.
3. Hardening options — 11 one-click security toggles, most enabled.
4. Backup Fortress — backup list with Google Drive and S3 cloud status indicators.
5. AI SEO tools — bulk meta optimisation table with AI-generated suggestions.

== External Services ==

This plugin connects to the following external services. No data is transmitted unless you initiate an action that requires it.

= SwissSuite Command Center (api.swisswpsecure.com) =
Used for: License key validation, AI request proxying, token balance sync, and Deep Malware Scan hash lookups.
Data sent: Your license key and AI scan request payloads. Your site domain is sent in an X-Domain header on every request to api.swisswpsecure.com for license verification (the server uses it to confirm the key is active for your domain). During the Deep Malware Scan (Pro license required), SHA-256 hashes of PHP files on your site are sent to api.swisswpsecure.com/v1/scan/batch to check them against a malware signature database (sources: URLhaus, MalwareBazaar). File contents are never transmitted, and hashes are not logged per-site.
This service is only contacted after you enter a license key — the plugin does not phone home on a fresh install with no key.
Privacy Policy: https://swisswpsuite.com/privacy-policy
Terms of Service: https://swisswpsuite.com/terms-of-service

= Groq AI API (proxied via swisswpsecure.com) =
Used for: Malware pattern analysis, AI content enhancement, vision AI for automatic alt text generation.
Data sent: File content snippets, URLs, or post content — only when you explicitly trigger an AI-powered action (e.g. "Analyze with AI", bulk SEO meta generation, alt text generation).
No background data collection or tracking.
Groq Privacy Policy: https://groq.com/privacy-policy

= Google Drive / Google OAuth =
Host: googleapis.com, accounts.google.com, oauth2.googleapis.com, www.googleapis.com
Used for: Optional Google Drive backup destination (upload/download/list backup archives) and OAuth 2.0 authorization.
Data sent: Backup archive contents (your site files + database export, only when you click "Upload to Google Drive"), OAuth refresh/access tokens, file metadata (name, size).
When contacted: Only after you connect a Google account under Settings → Backup → Cloud → Google Drive and trigger or schedule a backup upload. Not contacted on a fresh install or if Google Drive is not configured.
Privacy Policy: https://policies.google.com/privacy
Terms of Service: https://policies.google.com/terms

= Backblaze B2 Cloud Storage =
Host: api.backblazeb2.com (and per-bucket upload hosts returned by the B2 API, e.g. *.backblazeb2.com)
Used for: Optional Backblaze B2 backup destination (upload/download/list backup archives).
Data sent: Backup archive contents (your site files + database export, only when uploading), B2 application key ID + application key (sent in the authorization request only), bucket/file metadata.
When contacted: Only after you enter B2 credentials under Settings → Backup → Cloud → Backblaze B2 and trigger or schedule a backup upload. Not contacted on a fresh install or if B2 is not configured.
Privacy Policy: https://www.backblaze.com/company/policies.html
Terms of Service: https://www.backblaze.com/company/policies.html

= Dropbox =
Host: api.dropboxapi.com, content.dropboxapi.com
Used for: Optional Dropbox backup destination (upload/download/list backup archives).
Data sent: Backup archive contents (your site files + database export, only when uploading), Dropbox OAuth access token, file metadata.
When contacted: Only after you connect a Dropbox account under Settings → Backup → Cloud → Dropbox and trigger or schedule a backup upload. Not contacted on a fresh install or if Dropbox is not configured.
Privacy Policy: https://www.dropbox.com/privacy
Terms of Service: https://www.dropbox.com/terms

= WPScan Vulnerability Database API =
Host: wpscan.com (https://wpscan.com/api/v3/)
Used for: Optional vulnerability lookup of installed plugin/theme slugs + versions during deep malware scans.
Data sent: Plugin/theme slugs and version numbers of components installed on your site (no file contents, no PII), and the WPScan API key you provided.
When contacted: Only when you provide a WPScan API key under Settings → Security → Vulnerability Feeds AND a deep scan or vulnerability sweep runs. Not contacted if no API key is configured.
Privacy Policy: https://wpscan.com/privacy/
Terms of Service: https://wpscan.com/terms-of-service

= Patchstack Vulnerability Database API =
Host: api.patchstack.com (https://api.patchstack.com/)
Used for: Optional vulnerability lookup of installed plugin/theme slugs + versions during deep malware scans.
Data sent: Plugin/theme slugs and version numbers of components installed on your site (no file contents, no PII), and the Patchstack API key you provided.
When contacted: Only when you provide a Patchstack API key under Settings → Security → Vulnerability Feeds AND a deep scan or vulnerability sweep runs. Not contacted if no API key is configured.
Privacy Policy: https://patchstack.com/privacy-policy/
Terms of Service: https://patchstack.com/terms-of-service/

= WordPress.org APIs =
Host: api.wordpress.org
Used for: Core file checksum verification (to detect modified or infected WordPress core files) and plugin/theme metadata lookups during vulnerability scans.
Data sent: WordPress version number (for checksum requests), plugin/theme slugs and version numbers (for metadata lookups). No personal data or site content is sent.
When contacted: Only when you run a security scan that includes core file integrity checking. Not contacted on page load or without a user-initiated scan.
Privacy Policy: https://wordpress.org/about/privacy/

For full details on what data is transmitted and your rights, see our Privacy Policy linked above.

== Upgrade Notice ==

= 2.9.30.93 =
Critical fix: archive scan was restarting from scratch on every recovery tick instead of resuming from where it stopped. Sites with 50K+ files on overloaded shared hosting would burn all 5 scan attempts and circuit-break. Mandatory update for users experiencing repeated scan failures on large sites.

= 2.9.30.92 =
Critical fix: backup was re-archiving its own previous backup zips on every run, causing exponential size growth. Mandatory update for all users.

= 2.9.30.91 =
Major backup engine reliability update. The engine now self-tunes to your hosting environment: detects host tier on first run, adapts files-per-tick and tick budget after each job, and handles overloaded shared servers automatically. Recommended for all users.

= 2.9.30.90 =
Restores scheduled backup cron after a regression that silently stopped automated backups, and corrects the "last backup" time display for UTC+ timezones. Recommended for all users with backup automation enabled.

== Changelog ==

= 2.9.30.124 =
* Added: Option A per-feature licensing — each purchased feature (SEO, Backup, Security, Content) now has its own independent expiry date, stored in a new `feature_subscriptions` table on the licensing server.
* Fixed: Activating a second feature license key no longer orphans previously purchased features — the activate handler now consolidates all feature subscriptions under the new active key.
* Fixed: License Manager UI — the "Change License Key" input is now visible by default when a license is active (was collapsed as a low-emphasis text link, making it unfindable).

= 2.9.30.123 =
* Changed: rebranded all visible UI strings from "SwissWPSuite" to "SwissSuite" throughout the admin interface. Functional identifiers (HTTP headers, PHP class names, option keys) are unchanged.

= 2.9.30.122 =
* Changed: the plugin is now distributed as "SwissSuite AI" (slug: swisssuite-ai) to meet WordPress.org plugin directory naming guidelines. This is a name/branding change only — your settings, license, and data are fully preserved on update.
* Changed: minimum required WordPress version raised to 6.2.
* Fixed: WordPress.org Plugin Check compliance — removed developer scripts from the distributed package, shipped readme.txt at the package root, and moved debug/error log files out of the plugin folder into the uploads directory.

= 2.9.30.121 =
* Changed: the deep-malware Layer-2 AI scan now requires the Security or Suite plan (was any paid plan). SEO / Content / Backup plans run the free Layer-1 heuristic scan; malware quarantine and file deletion remain available to all paid plans.
* Changed: the automatic 24-hour Sentinel audit no longer consumes AI tokens on any plan — it runs a local check and emails a report. Token-consuming AI deep analysis is now manual-only, preventing automatic token drain on higher-token plans.
* Fixed: Stripe checkout now resolves the purchased plan durably from price ID metadata instead of defaulting every payment to the yearly plan.

= 2.9.30.118 =
* Fixed: modular plans (SEO / Content / Backup) no longer expose Security-plan features. WAF/firewall, geo-blocking, hardening, login protection, IP management, AI security analysis, and Update Guard now correctly require the Security or Suite plan. Malware scanning and quarantine remain available to all paid plans.
* Security: added capability gates to the login-protection and IP allow/block write endpoints.

= 2.9.30.117 =
* Performance: the admin dashboard is now much faster to navigate between tabs. The plugin no longer waits on blocking server checks during page loads (the license re-check now runs in the background), reuses cached status data between tab switches instead of re-fetching everything, and combined two scan-history requests into one. Security is unchanged — every action (toggling a setting, banning an IP, finishing a scan) still updates the screen immediately.

= 2.9.30.116 =
* Fixed: The Deep Malware Scan no longer intermittently fails with an error on large sites or under heavy server load. The file-hashing and cloud-verdict phases now process in smaller slices across multiple steps, so no single request runs long enough to be cut off by the host's PHP time limit. The scan itself is unchanged — it just completes reliably now.

= 2.9.30.115 =
* Fixed: The license panel no longer briefly shows "no license" / Free during a temporary connectivity blip (e.g. a server restart or a dropped request). It now keeps showing your real license while reconnecting, and only switches to unlicensed when the server explicitly confirms it.

= 2.9.30.114 =
* Security: malware signature scan is now fail-closed — database errors can no longer produce false "clean" verdicts, and degraded scans are clearly flagged in the results panel
* Security: full-hash verdict caching, redirect/TLS transport hardening, Redis-backed rate limiting, HMAC false-positive reports
* Fixed: quarantine and snapshot folders excluded from Deep Malware Scan enumeration

= 2.9.30.113 =
* Fixed: The Dashboard "Last Backup" stat now reflects manual backups, not only scheduled automations. Sites that only ran manual backups previously showed "Never" forever. A persisted last-successful-backup timestamp is now written on every successful backup (manual or automation) and read by the dashboard. Note: it populates on the next successful backup after upgrading — backups taken before this version are not retroactively counted.

= 2.9.30.112 =
* Fixed: The plugin admin page no longer crashes with "Unexpected Application Error" (React #185, Maximum update depth exceeded) when a backup finishes. A stale-cache re-adoption loop on the completion transition has been eliminated for both manual backups and automations.

= 2.9.30.111 =
* Fixed: Deleting a backup in the plugin UI now removes ALL parts of a multi-part archive and its cloud copy. Previously only the single clicked file was deleted, leaving the remaining parts (database, plugins, others) on disk — causing disk accumulation on multi-part backups (e.g. lacasa.market: 4-part archives, 3 parts left behind per delete).
* Fixed: Delete via the legacy flat-file row now resolves to the parent backup set and removes all associated files atomically, matching the behavior of set-row deletes.
* Fixed: When a recorded filename is absent on disk during set deletion, the file is now logged as missing instead of silently skipped, making record/disk mismatches visible to administrators.
* Added: Orphan cleanup tool already visible in the Backups UI (Clean Up button) now correctly identifies and removes leftover backup files from interrupted engine jobs.

= 2.9.30.110 =
* Fixed: Self-drive loopback re-arms after every tick. handle_as_tick() now calls chain_next_tick() so the non-blocking loopback continues firing tick-over-tick. Previously the loopback silently dropped after the first tick, reverting to Action Scheduler cadence (80–105 min gaps on low-traffic sites).
* Fixed: Multi-job fanout — concurrent backups no longer starve. When one job fires its self-drive loopback it now checks all other active engine jobs whose tick-lock is not fresh and fires a separate loopback for each, so concurrent backups advance in parallel rather than waiting for AS/cron.
* Fixed: Large-database backups no longer falsely flagged as stuck. During db_dump the progress marker previously showed 0 (no files scanned/written yet), causing the Sentinel and watchdog to count 3 consecutive stuck cycles and trip the circuit breaker on healthy jobs. The marker now includes filesize of the growing SQL dump file (KiB) so a large DB dump is visible as live forward progress.
* Fixed: Upload retry counter now resets after each successful chunk. retry_count previously accumulated across the entire multi-part upload — 10 transient network errors spread across thousands of chunks could exhaust MAX_RETRIES and fail the upload. The counter now resets to 0 whenever a chunk delivers real forward progress (bytes_uploaded advances).
* Fixed: Orphaned temp directories from abandoned jobs are now cleaned. Running/pending jobs older than 2 hours with no fresh tick-lock have their temp directory swept, preventing multi-GB accumulation on sites with repeated stuck uploads.
* Fixed: Dead Google Drive token cleared on auth error. When the GDrive access and refresh tokens expire or are revoked, the stored credentials are now cleared immediately so the Drive connection indicator resets to disconnected and future backups do not die on the first chunk. Previously the stale token persisted and every subsequent backup failed at chunk 1.
* Other: swisswpsuite_engine_tick_% option key pattern registered in the config manifest.

= 2.9.30.109 =
* Fixed: Sentinel circuit breaker now resets on forward progress. Previously, 3 stuck-detection cycles opened the circuit and permanently abandoned the job — even when the engine was still writing files (it just missed the 10-minute heartbeat window, e.g. during a slow ZipArchive::close()). The circuit breaker now computes the engine's forward-progress marker (files scanned + files written) before counting a stuck cycle; if the marker advanced since the last resurrection, stuck_count resets to 0 and a pace reduction is applied instead of tripping the circuit.
* Fixed: Pace reduction now applied on EVERY Sentinel stall detection, not just progressing jobs. When the watchdog detects a stalled job it writes a reduced ramp_factor (×0.70 AIMD step, floored at 0.40) to the engine state on every stall cycle — whether progress advanced or not. A PHP-killed (zero-progress) tick is now re-kicked at a progressively smaller budget across the three resurrection attempts (1.0 → 0.70 → 0.49), so a tiny-budget tick has the best chance to write at least one file and reach a heartbeat before the circuit breaker trips. The 3-strike breaker remains the final backstop for a genuinely-wedged job.
* Fixed: Exception retry loop now recovers instead of failing for resumable phases. When a transient Throwable (disk I/O spike, LVE memory burst) occurs in archive_scan or archive_chunk — which both have a saved manifest/cursor position — the engine now resets retry_count, applies a pace reduction, and yields to let the next tick try at reduced pace. Hard failure is reserved for phases with no safe resume cursor (init, unknown phase). MAX_RETRIES raised from 3 to 10 to absorb bursts of LVE jitter without hitting the terminal path.
* Fixed: ZipArchive::close() failures during time and safety yields now yield instead of failing. The manifest byte offset is already saved before close() is called; if close() fails (transient disk spike) the engine records the error, applies AIMD pace reduction, and returns for the next tick to retry. Previously these called handle_phase_failure() and terminated the job.
* Fixed: Partial ZIP move failures in phase_complete now retry up to 3 times before hard-failing. When rename()/copy() fails for some parts but not all (cross-device race, momentary I/O contention), the engine stays in the complete phase and retries the failed parts on the next tick rather than reporting an incomplete backup.

= 2.9.30.108 =
* Fixed: Backups on quiet, low-traffic sites no longer stall and fail. The tick engine relied on Action Scheduler, whose queue runner only drains when wp-cron.php is hit by a visitor — on a site with little traffic this opened 80–105 minute gaps between ticks, after which the watchdog wrongly abandoned a job whose resume cursor was still advancing. The engine now self-drives: after enqueueing each Action Scheduler tick it also fires a non-blocking loopback to continue the chain within ~1-3 seconds regardless of traffic. Action Scheduler remains the reliability backstop; the per-job tick lock makes whichever arrives second a no-op.
* Fixed: Progress-aware watchdog. Before declaring a delayed job dead, the watchdog now checks for real forward progress (files scanned + files written to the archive). A job that is still advancing is re-kicked, not reaped. Only a job that fails to advance across 3 consecutive re-kicks is treated as genuinely dead. This stops the watchdog + Sentinel resurrection + circuit-breaker chain from killing healthy-but-slow backups.

= 2.9.30.107 =
* Performance: Replaced node-load-average throttle with an empirical self-correcting AIMD ramp. On CloudLinux/LVE shared hosting (Hostinger) sys_getloadavg() reflects the whole physical node — at load 40–52 the old logic floored the tick budget to 40% even when the tenant's container had >90% headroom, producing ~25 files/tick. The new ramp_factor starts at 1.0 (full budget) and adjusts per-tick: +0.10 on every clean tick, ×0.70 on a detected PHP kill. It converges to the highest rate the container can actually sustain.
* Performance: CloudLinux/LVE per-tenant cgroup detection. If a per-tenant CPU signal is available (LVE cgroup v1 or v2), node loadavg is ignored entirely as a throttle signal — the host's real container headroom drives the ramp instead of noisy-neighbour load.
* Added: budget_factor field in backup status response showing current AIMD ramp multiplier (1.0 = full budget). Lets you see in real time that the engine is now running at full speed.

= 2.9.30.106 =
* Performance: Backup throughput on overloaded shared hosts (LOAD 40–52, 30s PHP exec cap) now processes ~150–200 files per tick instead of ~25. The yield threshold is now proportional to the actual available time budget rather than a fixed value that was always tripped on the first check.
* Performance: Already-compressed media files (JPG, PNG, WebP, MP4, etc.) are now stored without recompression in the ZIP archive. On a media-heavy WooCommerce store this cuts CPU per file substantially — the extra CPU was spent deflating incompressible bytes with ~0 size benefit.
* Performance: Continuous ticking: the in-process cron now immediately chains the next Action Scheduler tick after completing a tick, eliminating the ~30s idle gap between ticks on WooCommerce sites.
* Fixed: Backup progress bar (bytes_done, percent, ETA) now updates in real time during the archive phase. bytes_done was stuck at 0 and eta_seconds was null throughout archive_chunk — now both reflect live progress.
* Fixed: Cancel from the REST endpoint is now job-scoped, matching the engine's own scoped-cancel implementation from v2.9.30.105.
* Added: Per-tick throughput (files/sec) is now included in the status response so monitoring tools and future UI can show live speed.

= 2.9.30.105 =
* Added: Clicking "Save a Backup" now checks for a separate (nested) WordPress install inside your site that is not yet excluded, and offers to exclude it before the backup starts — so a hidden staging copy no longer silently doubles your backup size. Choose Exclude it, Include everything, or Cancel. If detection fails, the backup proceeds normally.
* Fixed: Backup throughput on overloaded shared hosts. A per-tick minimum was unintentionally acting as a maximum under high server load, pinning each tick to ~50 files and turning large backups into a multi-hour crawl. The adaptive byte/time budget now drives real volume per tick while still staying inside the PHP execution window.
* Fixed: Resumed/adopted finished jobs no longer fail with "Unknown phase:". The job phase is now persisted into the final saved state, and the engine cleanly short-circuits already-finished jobs instead of erroring.
* Fixed: The backup watchdog no longer keeps resurrecting jobs that already failed or were cancelled. It now recognises all terminal outcomes (complete, failed, cancelled) and stops re-adopting dead jobs.
* Fixed: Cancelling a backup is now job-specific. The cancel signal is scoped to the individual job instead of a single global flag, so cancelling one backup no longer affects another running at the same time.
* Fixed: Zombie cleanup no longer deletes the working directory of a backup that is actually still running on a slow host; it defers deletion while a tick is in flight and notifies the watchdog so the cancelled job is not resurrected.
* Fixed: Finalizing a backup no longer reports success when one or more ZIP parts failed to move into place. Such a backup is now marked failed (with the missing parts listed) instead of appearing complete with missing data.

= 2.9.30.104 =
* Added: In-process WP-Cron tick driver — a dedicated every-minute cron hook calls the backup engine directly (no loopback HTTP), so backups run to completion on hosts like Hostinger where self-directed HTTP calls fail (IPv6/connection-refused). Coexists with Action Scheduler and the traffic tick driver; self-unschedules automatically when the job completes or is cancelled.
* Added: Configurable backup exclusion paths. A new "Configure backup exclusions" panel lets you exclude any subdirectory from backups, and automatically detects nested WordPress installs (e.g. staging sites) so you can exclude them with one click. Reduces backup size and avoids including test environments you don't want to back up.
* Fixed: Large legitimate backup jobs (100k+ files) are no longer killed by the watchdog zombie guard. The zombie threshold now scales from the base 30 minutes up to 3 hours for large archive/upload jobs with confirmed forward progress, preventing false-positive cancellation on slow shared hosting.
* Fixed: The "Maximum update depth exceeded" React error no longer recurs when the watchdog auto-cancels a zombie job. A fourth triggering path (unstable Set reference in polling IDs dependency array) has been fixed by reading polling state through a stable ref.
* Fixed: Zombie-cancelled jobs now clean up their temp directory (partial manifest and ZIP parts) — previously the orphan-cleanup path invoked on watchdog auto-cancel missed the temp dir deletion added in v2.9.30.103.

= 2.9.30.103 =
* Fixed: Backups on large sites (200k+ files) now complete instead of being auto-cancelled. The file-scan phase previously re-walked the entire tree from scratch on every resume tick, paying a filesystem stat per already-processed file — at 215k files each tick spent its entire time budget re-checking files it had already written, and forward progress collapsed to near zero. The scan now uses a directory-stack cursor that picks up exactly where the previous tick left off, so each file is touched exactly once across the whole job.
* Fixed: The `backup/analyze` preflight endpoint no longer crashes with a PHP fatal error on large sites. It now applies a hard 9-second + 50k-file cap and returns a best-effort size estimate with an `is_estimate` flag instead of trying to walk the entire tree synchronously.
* Fixed: The Backups panel no longer freezes the browser ("Maximum update depth exceeded") when a backup job is auto-cancelled by the watchdog. Three compounding React render-loop causes were fixed: a stable reference for the automations list, sequential (not nested) state updates, and a proper distinction between "engine row not yet fetched" and "engine row was deleted".
* Fixed: Orphaned backup temp directories (partial manifests and ZIPs from cancelled/stuck jobs) are now deleted when a job is cancelled via the watchdog, the REST cancel endpoint, or the emergency clear-stuck-jobs tool — not just on normal completion.

= 2.9.30.102 =
* Fixed: Scheduled (automatic) backups occasionally started a second backup of the same automation at the same time on busy servers, leaving several concurrent jobs running. Two scheduled runs firing at once could both pass the "is one already running?" check before either recorded itself as running. An atomic lock now lets only the first start through, so a single automation can never spawn duplicate backups.
* Fixed: The Cancel button now appears for scheduled/automatic backups while they are running, not only for backups you start manually with "Run Now". Cancelling a scheduled backup also stops the watchdog from restarting it.

= 2.9.30.101 =
* Fixed: Backup progress now reappears in the Backups screen after a refresh or tab-switch for AUTOMATION backups too (not only manual ones). A running automation backup re-adopts its live progress bar in its automation row instead of appearing to show "no backup running".
* Fixed: Triggering "Run Now" on an automation no longer mints duplicate backup jobs. If a backup for that automation is already running, the trigger now re-attaches to the existing job instead of starting a second one — preventing the multiple concurrent jobs that previously multiplied load on busy servers.
* Changed: The backup engine now continuously watches live server load (per-CPU-core) during a running job and shrinks each tick's time budget under heavy load, so backups keep making steady forward progress and complete reliably on overloaded shared hosting instead of stalling. A guaranteed minimum-progress floor ensures every tick still writes files even under extreme load. Existing time and memory safety limits are preserved.

= 2.9.30.100 =
* Fixed: Backups failing to complete on overloaded shared hosting (high server load) — the file-archiving phase checked its time/memory budget only every 100 files, so under heavy load the per-tick budget was exhausted during the first 100 files and the engine stopped at exactly 100 files every tick regardless of how much headroom it actually had. This pinned the adaptive throughput estimator at 100 and prevented it from ever recovering, so large sites never finished. The budget is now checked finely (every 25 files) and a tick writes as many files as fit its real time + memory budget, so healthy ticks archive hundreds-to-thousands of files and backups complete in far fewer ticks. Time and memory safety yields are preserved.
* Added: Backup progress now reappears after switching tabs or reloading — a new admin-only endpoint lets the dashboard rediscover an in-progress backup and resume showing its live progress bar instead of appearing to show "no backup running".

= 2.9.30.99 =
* Fixed: Critical disk leak — failed/abandoned backup jobs left their entire `.engine-temp_<job_id>` working directory (gigabytes of partial archive parts) on disk forever. When the Sentinel watchdog abandoned or circuit-broke a stuck job it only flipped the job status in the database and never deleted the temp folder, so leftovers piled up (37GB observed on a heavily-tested site). The temp directory is now deleted on every terminal outcome, including Sentinel-abandoned jobs, and a daily janitor sweeps any orphaned `.engine-temp_*` directories whose job is finished or whose state no longer exists. Running jobs are protected by an age + status guard so an in-progress backup is never touched.

= 2.9.30.98 =
* Fixed: Scheduled & "Run Now" backups never advancing on Hostinger/LiteSpeed — the engine job is now started synchronously in the triggering request instead of inside the loopback-HTTP worker (which never runs when loopback returns HTTP 0). The browser tick driver now receives the engine job_id and advances the backup directly from the admin page. Without this, the backup state was never created on loopback-blocked hosts and admin-tick returned "Job not found".

= 2.9.30.97 =
* Added: Bounded multi-part backup archives — oversized categories now roll into write-once parts (e.g. backup-others-<id>.001.zip, .002.zip) with a 256MB-per-part budget. Each part is closed permanently, eliminating the O(n²) ZIP central-directory rebuild that stalled large-site backups.
* Added: Per-part SHA-256 integrity index. Every part is hashed (streaming, flat memory) at close and recorded in the backup set.
* Added: Universal "tick-on-traffic" driver — a lightweight shutdown hook advances an in-flight backup on ordinary site traffic, so backups complete even when WP-Cron and Action Scheduler are unavailable and no admin tab is open.
* Added: Browser-side tick driver — while the Backups panel is open, the backup is driven directly from the admin page (admin-nonce authenticated), with an in-flight guard.
* Changed: Restore is now atomic. Every part's SHA-256 is verified against the index BEFORE any extraction; if any part is missing or tampered, the restore is refused with no files changed (the previous best-effort partial restore is removed).
* Fixed: Backup stall on Hostinger/LiteSpeed — replaced loopback wp_remote_post tick chain with Action Scheduler as primary execution path. Loopback HTTP returns HTTP 0 on IPv6 reverse-proxy hosts; AS drains on cron/admin-ajax without requiring a self-reachable endpoint.
* Fixed: Sentinel resurrection spawning duplicate engine jobs — watchdog now re-dispatches a tick for the existing engine state instead of calling execute_automation_backup() (which minted a fresh job each time). Prevents 4+ concurrent jobs accumulating on loopback-blocked hosts.
* Fixed: execute_automation_backup() now guards against minting a new engine job when an active job for the same automation already exists.

= 2.9.30.95 =
* Added: Cancel button for running automation backups — POST /backup/automations/{id}/cancel resolves all live engine states, calls engine->cancel(), deregisters the Sentinel watchdog job (circuit_open=true), and marks the automation run as failed.

= 2.9.30.94 =
* Fixed: Backup engine never completed on large sites — resume cursor used an invalid lexicographic comparison assuming sorted directory iteration (readdir is unsorted), causing every tick to re-scan from the top and append duplicate manifest entries until stall. Replaced with a deterministic positional cursor.
* Fixed: Excluded swisswpsuite-snapshots, swisswpsuite-backups, and swisswpsuite-exports-temp directories from archive scan (incl. nested staging clones) to stop multi-GB self-inclusion bloat.

= 2.9.30.93 =
* Fixed: CRITICAL — archive_scan was restarting from scratch on every recovery tick (status='incomplete') instead of resuming at the last scanned path. Sites with 50K+ files on LOAD 50-77 servers would yield mid-scan 5-7 times, burn all 5 attempt slots, and circuit-break with no backup produced.
* Fixed: New status='resuming' saves last_scanned_path cursor to job state. On recovery, manifest reopens in append mode and fast-skips already-scanned paths using alphabetic string compare (no stat() calls). Attempt counter is NOT burned on a resuming yield — only a true iterator inconsistency promotes to incomplete.
* Fixed: Partial file/byte counts now persist across scan yields so final totals are always cumulative.

= 2.9.30.92 =
* Fixed: CRITICAL — backup archive scan was including the swisswpsuite-backups/ output folder, causing every backup to contain all previous backup zips. A site with 271MB of content would accumulate 3GB+ of backup archives over time. Fixed with realpath-based exclusion set derived from wp_upload_dir() at runtime — immune to symlinked uploads dirs and custom UPLOADS constants.
* Fixed: Diagnostic log now confirms active exclusion paths and reports count of skipped entries at scan end.

= 2.9.30.91 =
* Fixed: Backup engine ZIP 3 stall on overloaded shared hosting — time_remaining() now returns min(wall_clock, CPU) so the engine yields before the PHP execution deadline kills the process mid-loop with no state saved.
* Fixed: Category manifests written during archive_scan so each ZIP reads only its own files (53K-line others manifest vs scanning 96K total). Eliminates skip-scan CPU waste that was the secondary stall cause.
* Fixed: Wall-clock safety yield added every 2000 manifest lines scanned (not just per file added) to catch deadline expiry during high-skip-ratio manifest passes.
* Fixed: Sentinel stale-running watchdog raised from 2h to 4h — large sites (96K files, 8GB) legitimately need 3+ hours on overloaded servers with 5-7 min inter-tick recovery gaps.
* Added: Adaptive Backup Intelligence — SwissWPSuite_Backup_Site_Profile class persists per-site hosting profile (host_tier, tick_budget_seconds, successful_files_per_tick, chain_fail_rate) and updates after every job.
* Added: Host probe on first backup job classifies hosting tier (vps/shared_fast/shared_slow/shared_overloaded) from loopback RTT and server load, sets initial tick budget automatically.
* Added: Adaptive files_per_tick — recalculated at the start of each tick based on previous tick duration, targeting 75% of tick budget with 500–5000 clamp.
* Added: Double-tap chain retry — when chain_next_tick returns HTTP 0, dispatcher waits 3s and retries once, cutting the median 5-7 min health-check gap to 3 seconds in most cases.
* Added: Consecutive chain failure backoff — after 3 consecutive HTTP 0s, engine stops self-pinging and defers to health-check recovery to avoid hammering an overloaded server.
* Added: GET /backup/probe-ping lightweight endpoint for host RTT probing.
* Added: adaptive field in GET /backup/status response surface host tier and current tuning parameters.

= 2.9.30.90 =
* Fixed: Backup cron regression — scheduled malware scan and backup automations silently stopped when the license cache returned a stale value. BackupScheduler hooks now register unconditionally; capability check moved inside run_automation_backup() so security hardening no longer disables our own scheduled tasks.
* Fixed: Backup automations dashboard showed last attempt time instead of last successful completion time. New last_successful_at field is set only when status='success'.
* Fixed: Backup automation "X ago" display showed wrong time for UTC+ users due to MySQL datetime strings being parsed as local time. Appending UTC suffix fixes the timezone offset.

= 2.9.30.89 =
* Fixed: Mode B migration receiver template placeholder (`%%RECEIVER_EXPIRES_AT%%`) had spaces inserted in prior cleanup, silently breaking all generated receiver scripts since v2.9.30.81.
* Fixed: Plugin display name consistently updated to SwissSuite AI throughout all plugin files and public documentation.
* Tooling: Rewrote plugin check script — now produces real WP.org PCP report with 0 errors (was non-functional). PCP score: 0 errors / 62 warnings (warnings are acceptable, not submission blockers).
* Tooling: wp_parse_url(), wp_strip_all_tags(), wp_is_writable(), wp_delete_file() replacements across API files to satisfy WP.org AlternativeFunctions coding standard.

= 2.9.30.88 =
* Security: Hardened .htaccess protection in all swisswpsuite-* data directories to dual Apache 2.2+2.4 syntax (`Require all denied` with fallback) — fixes silent bypass on Apache 2.4 hosts without `mod_access_compat`.
* Security: Added automatic upgrade of weak (Apache 2.2-only) .htaccess files on existing installs at plugin activation.
* Security: Normalized `index.php` directory-listing stubs to canonical form in transport and journal directories.

= 2.9.30.87 =
* Security: Tightened X-Forwarded-For and HTTP_CLIENT_IP validation in WAF — added FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE to block private/loopback IP spoofing.
* Security: Removed HTTP_CLIENT_IP header processing — non-standard header adds IP-injection surface with no operational benefit on Cloudflare+LiteSpeed deployments.
* Security: Trusted-proxy filter output now validated — each entry from `swisswpsuite_trusted_proxies` filter is checked as a valid IP or CIDR before being trusted.
* Security: Scan orchestrator catch blocks no longer expose exception messages in HTTP responses.
* Security: GDrive OAuth token storage now fails hard if Encryption class is unavailable — removes plaintext fallback.
* Fix: Completed exec() removal — removed remaining `@exec()` call in `estimate_site_size_mb()`; pure-PHP fallback now sole code path.
* Fix: Admin diagnostic log sanitizes exception messages — file path segments stripped before writing to swisswpsuite_debug_log.
* WP.org: External Services disclosure in readme.txt now covers all 5 user-configured cloud/vulnerability-feed services.
* VPS: Added rate limiter to /upgrade license route.

= 2.9.30.86 =
* Eliminated all remaining `exec()`/`shell_exec()` calls from the plugin — completes WP.org Phase 4b cleanup. Plugin is now genuinely shell-free.
* Removed obsolete GROUP 6 phpcs suppressions tied to the eliminated calls.

= 2.9.30.85 =
* Fix: Banned IPs no longer wiped on plugin update — added one-shot guard so the stale v2.9.28.07 WAF-unlock migration cannot re-fire.
* Fix: "Release IP" button now succeeds on stale bans — `unban_ip()` is idempotent.
* Fix: Threat log writes restored — explicit `exit;` re-added after the WAF `wp_die()` calls.

= 2.9.30.83 =
* Fix: Eliminate exec()/shell_exec() from backup pipeline — database export and restore now use pure-PHP only (WP.org compliance).
* Docs: Add == External Services == section to readme.txt listing Groq AI API and swisswpsecure.com (WP.org requirement).
* Docs: GPL vendor license audit complete — all 44 composer dependencies are MIT/BSD/LGPL, none ship in plugin zip.

= 2.9.30.79 =
* Fix: PHPUnit test suite fully repaired — 31 errors + 5 failures resolved (135 tests / 359 assertions).
* Fix: recursive_replace() word-boundary regression — mysite.com was incorrectly matching inside mynew-site.com substrings during domain replacement.

= 2.9.30.77 =
* Feat: New in-plugin "Get Free License" flow on the License tab — enter your email, click once, the plugin auto-provisions a free license locked to your domain and emails the key to you.
* Feat: Reinstall recovery — if your domain already has a free license, the existing key is silently recovered.

= 2.9.30.76 =
* Fix: Daily L1 scan now costs zero tokens (L1 uses no AI — 1,500 token deduction was incorrect billing).
* Fix: Free-tier monthly token limit raised from 1,500 → 50,000 on VPS for AI features.

= 2.9.30.73 =
* Fix: Quick scan self-exclusion bug — is_safe_folder() now correctly walks ancestor directories so the plugin's own security classes are no longer flagged as malware.
* Fix: Deep Malware Scan results panel now renders ai_grade badge, wpscan/patchstack/ai status pills, and sources row.

= 2.9.30.72 =
* Feat: M1-H VPS hash lookup integration — Deep Malware Scan now calls VPS `/v1/scan/batch` endpoint to check file SHA256 hashes against MalwareBazaar + URLhaus database (hourly-refreshed).

= 2.9.29.0 =
* Feat: Deep Malware Scan async polling state machine — 8-phase pipeline: enumerate → hashing → vps_lookup → local_scan → wpscan → patchstack → ai_analysis → complete.
* Feat: Source-tag badges on scan result rows (Hash DB / Pattern / WPScan / Patchstack / AI).

= 2.9.28.0 =
* Added: Scan Consolidation — 5 overlapping scan types replaced by 3 clean scans: AI Security Audit (Free+Pro, cron 24h), Malware Scan (Free+Pro, manual), Full Scan with AI (Pro only, cron 24h).
* Added: SwissWPSuite_Scan_Orchestrator — single entry point routing all scan types.

For the full version history (every release from v2.9.0 to current), see CHANGELOG.md in the plugin folder or visit https://github.com/Gfellerman/SwisswpSuite_Public/blob/main/CHANGELOG.md
