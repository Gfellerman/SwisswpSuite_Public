=== SwissSuite AI ===
Contributors: swisswpsecure
Tags: security, malware scanner, firewall, backup, login security
Requires at least: 6.2
Tested up to: 7.0
Requires PHP: 7.4
Stable tag: 2.9.31.6
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

WordPress security & backup core — malware scanner, firewall, local backup & restore, login protection, and on-page SEO. Zero bloat.

== Description ==

SwissSuite AI (free edition) is the security and backup core for WordPress. It gives you a local malware scanner, a web application firewall, full local backup and one-click restore, malware quarantine, login protection, an on-page SEO audit, and an XML sitemap — all running on your own server, with no account and no AI calls.

Everything in the free plugin runs locally. It does not phone home on install, it sends no telemetry, and it performs no AI processing. When you are ready for more, SwissSuite AI Pro adds cloud backup, hardening, two-factor authentication, geo-blocking, migration, sync, and AI-powered malware, SEO, and content tools.

= Security (free) =
* Malware scanner — 38+ local signature patterns, on-demand and daily; runs entirely on your server, no file contents leave your site
* Web Application Firewall — blocks SQL injection, XSS, and path-traversal attempts, with a threat log
* Login protection — brute-force login lockout plus comment and contact-form honeypot spam blocking
* Malware quarantine — isolate suspicious files locally before you remove them
* Security dashboard, threat log, and daily email security report

= Backup & restore (free) =
* Full WordPress backup — files plus database — with a pure-PHP zip engine (no shell exec required)
* One-click restore with serialization-safe URL and domain replacement (no manual SQL edits)
* Adaptive backup engine that adjusts to slow shared hosting instead of failing mid-job

= SEO (free) =
* On-page SEO audit and score — runs locally, no AI
* XML sitemap generator with custom post type support

= SwissSuite AI Pro =

Upgrade at https://swisswpsecure.com/products/ to unlock these features, which run only in the Pro edition:

* Two-Factor Authentication (TOTP) for every user role
* 11 one-click hardening options (XML-RPC, file editing, user enumeration, REST API, application passwords, and more)
* Geo-blocking with country-level allow and deny rules
* Advanced firewall rule sets with IP reputation and rate limiting
* Cloud backup destinations — Google Drive, Amazon S3, Backblaze B2, Dropbox, and FTP/SFTP
* Scheduled automated backups with rolling retention and AES-256 encryption at rest
* Site migration — plugin-to-plugin and standalone-receiver modes, tuned for shared hosting
* Two-way content sync between staging and production
* Update-guard suite — safe updates with automatic rollback and pre-update snapshots
* AI deep malware analysis (Groq-powered)
* AI SEO — bulk meta title and description generation, plus vision AI for image alt text
* AI content — rewriting, tone control, and generation
* Vulnerability lookups via WPScan and Patchstack (bring your own API key)

The AI and remote-service features above run only in SwissSuite AI Pro. The free plugin does no AI processing and makes no AI calls.

= Perfect for =

* **Site owners** who want a solid malware scanner, firewall, and local backup without juggling several plugins
* **Freelancers and agencies** standardizing basic security and backups across client sites
* **WooCommerce stores** that need firewall protection compatible with the Store API plus reliable local backups
* **Anyone** who wants to start free and add AI scanning, cloud backup, and hardening later

= Privacy & Data =

The free plugin does not phone home on install. No telemetry, no tracking, no analytics. All scanning, backup, and SEO analysis runs locally on your server, and the plugin makes no AI calls. The only external services it may contact are WordPress.org (plugin updates and core-file checksum verification during a scan) and the SwissSuite Command Center (only if you enter a license key, to verify it). Both are disclosed in full under External Services below.

== Installation ==

1. In WordPress Admin, go to Plugins → Add New → Upload Plugin.
2. Upload the SwissSuite AI zip and click Install Now.
3. Activate the plugin.
4. Open the SwissSuite menu in the WordPress sidebar.
5. Run your first malware scan from Security → Scan. No account or license key is required — the free features work immediately.
6. To add Pro features later, enter a license key on the License tab. Get Pro at https://swisswpsecure.com/products/ .

= Minimum Requirements =

* WordPress 6.2 or higher
* PHP 7.4 or higher

== Frequently Asked Questions ==

= Is SwissSuite AI free? =

Yes. This free edition gives you a local malware scanner, a web application firewall, full local backup and one-click restore, malware quarantine, login brute-force protection, an on-page SEO audit, and an XML sitemap. No account, no credit card, and no license key are required to use these features. The premium features listed below are part of SwissSuite AI Pro.

= Why is it called SwissSuite AI if the free plugin doesn't use AI? =

SwissSuite AI is the name of the platform. The free plugin is its security core — malware scanning, firewall, backups — and performs no AI processing and sends no data to AI services. The AI features (deep malware analysis, AI SEO, AI content) run exclusively in SwissSuite AI Pro.

= How do I scan my WordPress site for malware? =

Open SwissSuite → Security → Scan. The free malware scan checks your files against 38+ local signature patterns and runs entirely on your server — no file contents leave your site. A deeper scan that checks file hashes against a remote malware database and adds AI review is available in SwissSuite AI Pro.

= How do I back up my WordPress site? =

Open SwissSuite → Backup and click Back Up Now to create a full backup of your files and database. Restore any backup with one click — SwissSuite handles serialized-string replacement automatically, so your site URLs update cleanly with no manual SQL edits. Scheduled automated backups and cloud destinations (Google Drive, Amazon S3, Backblaze B2, Dropbox, FTP/SFTP) are part of SwissSuite AI Pro.

= Can I use SwissSuite alongside a dedicated security plugin like Wordfence? =

Yes. SwissSuite's free firewall and scanner run independently and can coexist with other security plugins; if you would rather use a single tool, SwissSuite covers malware scanning, a firewall, login protection, and local backups in one install.

= Is SwissSuite compatible with WooCommerce? =

Yes. The firewall has an explicit allowlist for WooCommerce REST routes (wc/v3, wc/store/v1, wc/store/v2, wc-analytics/v1, wc-admin/v1, wc-auth/v1) so cart, checkout, and the Store API keep working with protection enabled. The backup engine also handles WooCommerce-specific tables (orders, customers, sessions).

= Do I need a license key or an account? =

No. Every feature in this free plugin works immediately with no account and no license key. A license key is only needed to unlock SwissSuite AI Pro features, and a Pro license is locked to one domain. Learn more at https://swisswpsecure.com/products/ .

== Screenshots ==

1. Security dashboard — threat count and scan status at a glance.
2. Malware scan results — file list with local signature-based threat classifications.
3. Backup — local backup list with one-click restore.
4. On-page SEO audit — page score and improvement recommendations (runs locally).
5. Threat log — blocked firewall requests with rule and timestamp.

== External Services ==

This plugin connects to only the external services listed below, and only for the purposes described. No data is transmitted unless you take an action that requires it. The free plugin does no AI processing and makes no AI calls; its local features (malware scan, backup, restore, quarantine, on-page SEO audit, sitemap) run on your own server. Its only outbound calls are to the two services below.

= SwissSuite Command Center (api.swisswpsecure.com) =
Used for: License key verification.
Data sent: Your license key, and your site domain (sent in an X-Domain header) so the server can confirm the key is valid and active for your domain. No site content, no file contents, and no visitor data are sent.
When contacted: Only when you enter or verify a license key on the License tab. The free plugin does not contact this service for any of its local features, and does not phone home on a fresh install with no key.
Privacy Policy: https://swisswpsecure.com/privacy-policy
Terms of Service: https://swisswpsecure.com/terms-of-service

= WordPress.org APIs =
Host: api.wordpress.org
Used for: WordPress core file checksum verification during a malware scan (to detect modified or infected core files), and standard plugin update checks.
Data sent: Your WordPress version number (for checksum requests) and the plugin slug and version (for update checks). No personal data or site content is sent.
When contacted: During a security scan that includes core-file integrity checking, and when WordPress checks for plugin updates.
Privacy Policy: https://wordpress.org/about/privacy/

For full details on what data is transmitted and your rights, see our Privacy Policy linked above.

== Source Code ==

SwissSuite AI is free software licensed under GPLv2 or later. The complete, uncompiled, human-readable source code — including the React and TypeScript sources behind the admin interface and the build scripts used to generate the distributed minified JavaScript and CSS — is published at:

https://github.com/Gfellerman/SwisswpSuite_Public

That repository contains the build tooling and instructions for regenerating the compiled assets from source.

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

= 2.9.31.6 =
* Changed: AI content tools (SEO metadata, FAQ, content rewrite, image alt-text) now write in your site's language automatically — non-English sites get output in their own language instead of English. (Pro edition only.)
* Added: an optional "Brand voice" setting on the AI configuration tab lets you describe your tone in one line, applied across all AI-generated content.
* Changed: sharper AI content quality — few-shot examples, lower generation temperature for more consistent results, and SEO titles are now kept within the ~60-character search-result limit.

= 2.9.31.5 =
* Fixed: migrated off two AI models Groq has deprecated. Image-SEO vision analysis now uses a current multimodal model with graceful "temporarily unavailable" handling, and the AI fallback model was updated — so AI features keep working after the old models are retired. (Pro edition only.)
* Changed: the SwissSuite AI proxy now transparently remaps deprecated model IDs, so existing installs continue working without needing an immediate update.

= 2.9.31.4 =
* Fixed: cleared the remaining WordPress.org Plugin Check code errors (switched `parse_url()` to `wp_parse_url()` in the settings API; documented the raw-socket SMTP connectivity probe that has no WordPress-filesystem equivalent).
* Changed: the free edition's "Advanced Controls" hardening section now shows a clear "Pro feature" upgrade panel instead of greyed-out, non-working toggles — the six essential hardening controls remain fully functional in the free edition.

= 2.9.31.3 =
* Fixed: the "Start Security Audit" button in the free edition no longer does nothing when clicked. A stale token check was incorrectly gating the audit behind a paid-token balance, even though the free Security Audit runs a fully local Layer-1 grade and uses no tokens or AI. The button now works on a fresh/free install.
* Changed: corrected the audit description so it no longer claims it "uses AI via the SwissSuite quota" — the free Security Audit is entirely local.

= 2.9.31.2 =
* Improved: the free edition now strictly separates free and Pro features — a Pro-only capability can never activate in the free build, even if a Pro license key is stored locally, so nothing behaves unpredictably.
* Improved: if you already own a Pro feature but are running the free plugin, the upgrade panels now say "You already own this — download and install Pro" and link to your download page, instead of a generic purchase prompt.
* Fixed: removed non-functional AI buttons from the SEO tab in the free edition (bulk AI generation and overnight queueing are Pro features) and eliminated a related console error on every SEO page load.
* Fixed: the License screen now correctly shows the basic firewall as active in the free edition; also clarified a few labels ("Scan Capabilities", "AI Assistant Guide") so they read plainly.

= 2.9.31.1 =
* Fixed: Security Audit now runs a fully local Layer-1 grade in the free edition (previously returned a "scan failed" error because a Pro-only scanner class is absent from the free build). No tokens are used.
* Fixed: SEO Health Check no longer errors on the free edition; error responses are now proper JSON instead of a blank page.
* Fixed: the free edition no longer polls Pro-only endpoints, removing benign 403/404 console noise.
* Changed: the free edition no longer bundles Pro-only admin scripts, and no longer shows a Pro AI-provider notice or a non-functional "Test AI Connection" control.

= 2.9.31.0 =
* New: SwissSuite AI now ships as two editions from one codebase — a free security & backup core (WordPress.org) and SwissSuite AI Pro (download-only) with all AI and premium features. The free plugin does no AI processing and sends no data to AI services.
* New (now free): local backup & restore, malware quarantine, on-page SEO audit/score, and the XML sitemap generator.
* Changed: cloud backup, sync/staging, migration, 2FA, hardening, geo-blocking, advanced firewall, and all AI features are part of SwissSuite AI Pro.
* Compliance: the free plugin contains no premium/AI code; its only outbound calls are license verification and WordPress.org.

= 2.9.30.144 =
* Fixed: The Plugin URI and Author URI in the plugin header were identical; the Plugin URI now points to the plugin's own resource page so the two are distinct (clears the WordPress.org "Plugin and author URIs are the same" upload error).

= 2.9.30.143 =
* Fixed: Corrected two remaining text strings that used the plugin's old text domain, so all translations now resolve under the current `swisssuite-ai` domain (clears the last WordPress.org Plugin Check errors).
* Compliance: The Privacy & Data summary now lists Geo-Blocking alongside the other features that may contact an external service, matching the detailed External Services disclosure.
* Housekeeping: Internal developer documentation is no longer bundled in the distributed plugin zip.

= 2.9.30.141 =
* Fixed: SEO title and meta tags now reliably appear on your live pages. The plugin's SEO output now runs late enough to win over a theme's own hardcoded title, using the highest hook priority.
* Added: Automatic SEO plugin conflict handling. If you run a dedicated SEO plugin (Yoast, Rank Math, All in One SEO, SEOPress, The SEO Framework), SwissSuite AI now steps aside to avoid duplicate tags and shows a notice explaining why. Generic SEO tags injected by host-bundled plugins (e.g. Hostinger AI Assistant) are automatically overridden so your optimized tags take precedence.

= 2.9.30.140 =
* Fixed: The "Manage Billing" link on the License screen was broken for every customer — it now opens a real Stripe billing portal session instead of a dead link.
* Added: The plugin now recognizes whether a license was purchased through Stripe or issued manually (e.g. a support-granted license), and only shows Stripe billing actions when they will actually work — manually-issued licenses see a "contact support" notice instead of a broken button.

= 2.9.30.139 =
* Improved: License actions (change renewal type, cancel/resume auto-renewal) now always show a clear, plain-English result — either a success confirmation or a specific error message — instead of ever failing silently.

= 2.9.30.138 =
* Fixed: Restoring a backup no longer removes your license. Backup restore now preserves and re-applies your license key, status, and site identity, so a restored site keeps its plan and AI tokens instead of dropping to the free tier.
* Fixed: The License screen now updates your token balance, per-feature bars, and license status as soon as it loads — no page refresh needed.
* Changed: "Tokens Used" now counts every AI operation this billing period (including Sentinel deep scans and batch jobs), and is relabeled "Tokens Used (This Period)".

= 2.9.30.137 =
* Fixed: WAF threat logging now self-heals when the security_logs database table is missing (e.g., after a messy reinstall or manual cleanup). Previously the WAF blocked requests correctly (returning 403) but silently failed to record them — the Threats Blocked counter stayed at zero. The table is now recreated automatically on the first blocked request, and any future insert failure is logged to the plugin diagnostics.

= 2.9.30.136 =
* Added: Per-feature token balances — à-la-carte licenses now show each feature's own token balance (Security / SEO / Content) beneath its renewal date, so you can see exactly what's left per feature.
* Fixed: Full-suite (SwissSuite) licenses now show their included features (Backup, Security, SEO, Content) sharing one token pool, instead of an empty Feature Subscriptions section.
* Changed: The "Upgrade to Annual" button is now clearly labeled (was a confusing "↑ Annual").

= 2.9.30.135 =
* Fixed: Removed the cross-domain "Total Across Licenses" pooled token display. A license bound to a different site could appear in this site's token total, which was misleading because tokens are spent per-site. The License screen now shows only this site's balance.

= 2.9.30.134 =
* Changed: Groundwork for per-feature token tracking — AI and security-scan requests now record which feature they belong to (Security, SEO, Content, Backup) so usage and limits can be tracked per feature. How tokens are spent is unchanged until the matching server update is live.
* Added: Clearer messages when a specific feature runs out of tokens, plus a prompt to update the plugin if the server expects a newer version.

= 2.9.30.133 =
* Fixed (critical security): The firewall (WAF) could silently stop protecting your site after the plugin loaded with geo-blocking available. A startup ordering bug caused the security module to abort before the firewall switched on — with no visible error — so attacks were no longer blocked or logged. The firewall, geo-blocking, hardening and other protections now initialise reliably on every request.

= 2.9.30.132 =
* Added: Cancel auto-renewal — each feature subscription on the License screen now has a "Cancel renewal" button. Your access continues until the paid period ends; it just won't renew. A "Resume" button turns auto-renewal back on.
* Added: Shared-subscription safety — if several features are billed on one subscription, cancelling shows exactly which features will be affected and asks you to confirm before stopping them all.
* Added: Expiry badges — feature subscriptions now show a "days left" badge (yellow within 14 days, red within 3) and read "Cancels on {date}" instead of "Renews on {date}" once auto-renewal is off.

= 2.9.30.131 =
* Changed: When you hold more than one license, the main token counter now shows your combined (pooled) balance across all licenses, with the per-site spendable balance shown as a secondary line.
* Fixed (billing): A single feature's failed or cancelled payment no longer downgrades the other features on the same license; each feature now renews and expires independently.
* Fixed (admin): The management dashboard now shows each license's owner name/email and a per-feature breakdown (status, expiry, token limit).

= 2.9.30.130 =
* Added: "Total available tokens" view — the license screen now shows your combined token balance across all licenses on your account (shown when you hold more than one license).
* Fixed: A refunded or cancelled license could be silently re-activated on a new site; revoked licenses are now correctly rejected.
* Fixed: Refund processing failed silently for some purchases; refunds now correctly mark the affected license.

= 2.9.30.129 =
* Fixed: Amazon S3 (and S3-compatible) cloud backups of files larger than 10 MB failed with a "SignatureDoesNotMatch" error. The multipart upload signature is now AWS Signature V4 compliant, restoring large-file S3 backups.

= 2.9.30.128 =
* Fixed: Google Drive / Dropbox cloud backup connection failed with "Sorry, you are not allowed to access this page" after authorizing — the post-consent redirect now targets the current admin menu slug.
* Changed: extended the cloud-OAuth nonce lifetime from 30 to 60 minutes so slower consent flows no longer expire mid-authorization.
* Changed: removed an unused legacy OAuth callback handler (dead code cleanup; no user-facing behavior change).

For the full version history (every release from v2.9.0 to current), see CHANGELOG.md in the plugin folder or visit https://github.com/Gfellerman/SwisswpSuite_Public/blob/main/CHANGELOG.md
