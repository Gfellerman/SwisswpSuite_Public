=== SwissSuite AI ===
Contributors: swisswpsecure
Tags: security, backup, malware scanner, firewall, two-factor authentication
Requires at least: 6.2
Tested up to: 7.0
Requires PHP: 7.4
Stable tag: 2.9.30.129
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

= 2.9.30.129 =
* Fixed: Amazon S3 (and S3-compatible) cloud backups of files larger than 10 MB failed with a "SignatureDoesNotMatch" error. The multipart upload signature is now AWS Signature V4 compliant, restoring large-file S3 backups.

= 2.9.30.128 =
* Fixed: Google Drive / Dropbox cloud backup connection failed with "Sorry, you are not allowed to access this page" after authorizing — the post-consent redirect now targets the current admin menu slug.
* Changed: extended the cloud-OAuth nonce lifetime from 30 to 60 minutes so slower consent flows no longer expire mid-authorization.
* Changed: removed an unused legacy OAuth callback handler (dead code cleanup; no user-facing behavior change).

= 2.9.30.127 =
* Fixed: WordPress.org readme compliance — corrected the readme plugin name to match the plugin header, removed a restricted term from the name line, and trimmed the changelog to the 5 most recent releases (full history remains in CHANGELOG.md).

= 2.9.30.126 =
* Fixed: bump "Tested up to" to WordPress 7.0 in plugin header and readme.
* Fixed: suppress phpcs PluginDirectoryWrite false-positive on update-rollback — writing to WP_PLUGIN_DIR is intentional for the plugin restore feature.

= 2.9.30.125 =
* Fixed: activating a second feature license key no longer hides other active feature subscriptions in the UI. The plugin's capabilities list now merges per-feature subscription data so all purchased features remain visible regardless of which key is currently active.

= 2.9.30.124 =
* Added: Option A per-feature licensing — each purchased feature (SEO, Backup, Security, Content) now has its own independent expiry date, stored in a new `feature_subscriptions` table on the licensing server.
* Fixed: Activating a second feature license key no longer orphans previously purchased features — the activate handler now consolidates all feature subscriptions under the new active key.
* Fixed: License Manager UI — the "Change License Key" input is now visible by default when a license is active (was collapsed as a low-emphasis text link, making it unfindable).

= 2.9.30.123 =
* Changed: rebranded all visible UI strings from "SwissWPSuite" to "SwissSuite" throughout the admin interface. Functional identifiers (HTTP headers, PHP class names, option keys) are unchanged.

For the full version history (every release from v2.9.0 to current), see CHANGELOG.md in the plugin folder or visit https://github.com/Gfellerman/SwisswpSuite_Public/blob/main/CHANGELOG.md
