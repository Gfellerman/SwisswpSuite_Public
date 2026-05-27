=== SwissWPSuite AI — WordPress Security, Backup & AI SEO Plugin ===
Contributors: swisswpsecure
Tags: security, backup, malware scanner, firewall, two-factor authentication
Requires at least: 5.6
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 2.9.30.91
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

All-in-one WordPress security plugin. Malware scanner, firewall, 2FA, site backup, migration, and AI SEO — one plugin, zero bloat.

== Description ==

SwissWPSuite AI is an all-in-one WordPress security plugin that bundles a malware scanner, web application firewall, two-factor authentication, scheduled site backup, site migration, and AI-powered SEO tools into a single install. One plugin. One settings screen. No add-ons to chase.

Most sites end up with five plugins doing what one plugin should do — a security plugin, a backup plugin, a migration plugin, an SEO plugin, and a cache plugin. Every extra plugin is another auto-update, another DB table, another performance hit, another attack surface. SwissWPSuite replaces the security, backup, migration, and SEO layer with one tightly integrated codebase.

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
* Mode A: plugin-to-plugin migration when both sites have SwissWPSuite installed
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

= Why SwissWPSuite? =

**vs Wordfence:** Wordfence is security-only. You still need a separate backup plugin (UpdraftPlus, BlogVault), a separate migration plugin (Duplicator, All-in-One WP Migration), and a separate SEO plugin (Yoast, RankMath). That's four plugins, four update channels, four monthly costs. SwissWPSuite covers all four layers in one install.

**vs UpdraftPlus:** UpdraftPlus is backup-only. It does not scan for malware, does not provide a firewall, does not handle 2FA, and has no SEO tools. SwissWPSuite includes a full backup engine plus everything UpdraftPlus does not.

**vs Yoast / RankMath:** Yoast and RankMath are SEO-only. They cannot detect a hacked site, cannot back up your content before an algorithm penalty, and cannot block a brute-force attack on your admin login. SwissWPSuite includes AI-powered SEO plus the security layer that protects your rankings.

= Perfect for =

* **Freelancers** managing 5-50 client sites who do not want to install and configure five plugins per site
* **Agencies** that need a single security and backup standard across an entire portfolio
* **WooCommerce stores** that need PCI-friendly security plus reliable nightly backups
* **High-traffic blogs** that cannot afford downtime from a hack or a botched plugin update
* **Site owners** who would rather pay for one plugin than five

= Privacy & Data =

SwissWPSuite does not phone home on install. No background telemetry. External services are contacted only when you explicitly enable them (cloud backup, AI analysis, vulnerability lookup). Every external service is disclosed below.

== Installation ==

1. In WordPress Admin, go to Plugins → Add New → Upload Plugin.
2. Upload the SwissWPSuite AI zip and click Install Now.
3. Activate the plugin.
4. Open the SwissWPSuite menu in the WordPress sidebar.
5. Click "Get Free License" on the License tab — enter your email and the plugin auto-provisions a free license locked to your domain.
6. Run your first malware scan from the Security Hub → Scan tab.

= Minimum Requirements =

* WordPress 5.6 or higher
* PHP 7.4 or higher
* HTTPS recommended for two-factor authentication

== Frequently Asked Questions ==

= Is SwissWPSuite AI free? =

Yes. The free tier includes daily malware scans, the web application firewall, 5 hardening options, two-factor authentication, and the on-page SEO audit. You do not need a credit card to get started. Paid tiers unlock advanced features like cloud backup, site migration, AI content rewriting, and the deep AI security audit.

= How do I block countries in WordPress? =

Open SwissWPSuite → Security Hub → Geo-Blocking. Pick "Block list" mode and select the countries you want to deny. The list is enforced at the firewall layer before WordPress loads, so blocked countries cannot brute-force your login page or hit your REST API. You can also use "Allow list" mode to restrict access to a single country (useful for staging sites).

= What is the best WordPress 2FA plugin? =

If you already use SwissWPSuite for security, the built-in TOTP two-factor authentication is the simplest answer — no extra plugin to install, no compatibility risk between the WAF and the 2FA layer. It works with Google Authenticator, Authy, 1Password, Bitwarden, and any other TOTP app. Enable it from Security Hub → Two-Factor Authentication and scan the QR code with your authenticator.

= How do I scan my WordPress site for malware? =

Open SwissWPSuite → Security Hub → Scan tab. You have three scan types: Quick Scan (local signature check, fast, free), AI Security Audit (configuration and integrity audit, daily auto-scan, free), and Deep Malware Scan with AI (file hashes checked against MalwareBazaar plus AI analysis, Pro tier). The first scan typically takes 30-90 seconds depending on site size.

= Does this replace Wordfence? =

Yes. SwissWPSuite includes everything Wordfence does — malware scanner, firewall, login protection, two-factor authentication, country blocking — and adds backup, migration, and SEO that Wordfence does not have. If you are running Wordfence and a separate backup plugin and a separate SEO plugin, SwissWPSuite is a one-for-three swap.

= How do I back up my WordPress site automatically? =

Open Settings → Backup → Schedule. Pick a frequency (hourly, daily, weekly) and a retention count. Optionally connect a cloud destination (Google Drive, S3, B2, or Dropbox) under Settings → Backup → Cloud. The backup cron runs unattended; you can check the last completion time on the Dashboard.

= Can I migrate my WordPress site without manual SQL edits? =

Yes. SwissWPSuite handles serialized string replacement automatically — no need to run wp-cli search-replace or hand-edit the SQL dump. Use Mode A if the destination site already has SwissWPSuite installed. Use Mode B if the destination is empty or broken: the plugin generates a standalone receiver script you upload to the destination, then push the migration.

= What AI features are included in the free version? =

The AI Security Audit runs daily on the free tier at zero token cost (Layer 1 is signature-based, not AI). The on-page SEO audit and XML sitemap generator are free. AI-powered features that consume tokens — deep malware analysis, bulk SEO meta generation, content rewriting, image alt text — are gated to paid tiers. Free accounts include 50,000 tokens per month for occasional AI use.

= Is SwissWPSuite compatible with WooCommerce? =

Yes. The firewall has an explicit allowlist for WooCommerce REST routes (wc/v3, wc/store/v1, wc/store/v2, wc-analytics/v1, wc-admin/v1, wc-auth/v1) so cart, checkout, and the Store API work normally even with hardening enabled. The backup engine handles WooCommerce-specific tables (orders, customers, sessions) and the sync layer pushes products between staging and production.

= How many sites can I use one license on? =

Each license key is locked to one domain. For multi-site management, contact support — agency tiers are available with discounted per-site pricing. The free license is also domain-locked, so you can run a free install on every site you manage at no cost.

== Screenshots ==

1. Security Hub dashboard — threat count, scan status, and hardening score at a glance.
2. Malware scan results — file list with threat classifications and inline AI analysis.
3. WAF rules and IP blocking — live firewall log with blocked request details.
4. Hardening options — 11 one-click security toggles, most enabled.
5. Two-factor authentication — TOTP setup screen for WordPress admin accounts.
6. Backup Fortress — backup list with Google Drive and S3 cloud status indicators.
7. Sync Teleport — diff comparison table between staging and production.
8. Migration Station — step-by-step migration wizard progress screen.
9. AI SEO tools — bulk meta optimisation table with AI-generated suggestions.
10. Mobile-responsive admin — plugin UI on a tablet viewport at 768px.

== External Services ==

This plugin connects to the following external services. No data is transmitted unless you initiate an action that requires it.

= SwissWPSuite Command Center (swisswpsecure.com) =
Used for: License key validation, AI request proxying, token balance sync.
Data sent: Your site domain, license key, and AI scan request payloads.
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

= 2.9.30.91 =
Major backup engine reliability update. The engine now self-tunes to your hosting environment: detects host tier on first run, adapts files-per-tick and tick budget after each job, and handles overloaded shared servers automatically. Recommended for all users.

= 2.9.30.90 =
Restores scheduled backup cron after a regression that silently stopped automated backups, and corrects the "last backup" time display for UTC+ timezones. Recommended for all users with backup automation enabled.

== Changelog ==

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
* Fixed: Plugin display name consistently updated to SwissWPSuite AI throughout all plugin files and public documentation.
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
