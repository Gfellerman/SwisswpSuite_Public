=== SwissSuite AI ===
Contributors: gfellerman
Tags: security, malware scanner, firewall, backup, login security
Requires at least: 6.2
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 2.9.33.37
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

WordPress security & backup core - malware scanner, firewall, backup & restore, login protection, on-page SEO. Zero bloat.

== Description ==

SwissSuite AI (free) is a security and backup core for WordPress: local malware scanning, firewall, hardening, full backup/restore, quarantine, login protection, an on-page SEO audit, and an XML sitemap - all on your server, no account or AI calls required.

Everything in the free plugin runs locally, no AI processing. Pro adds cloud backup, two-factor auth, geo-blocking, migration, sync, and AI tools.

On activation the plugin disables the theme/plugin file editor by default; re-enable it at Security -> Hardening.

= Security (free) =
* Malware scanner - 38+ local signature patterns; Quick Scan (on-demand + daily) checks the newest 100 of up to 5,000 tracked files per pass, skipping 32 trusted plugin/theme paths and /vendor/ folders; no file contents leave your site
* Deep malware scan - full-site multi-phase local analysis; AI result grading is a Pro add-on
* Web Application Firewall - starts in observe (simulation) mode on install so it never blocks by surprise; enable active blocking any time at Security -> Firewall, with a threat log and automatic IP banning
* IP management - manually ban, unban, and allowlist IP addresses
* One-click hardening - 12 hardening options (XML-RPC, file editing, user enumeration, REST API, bot blocking, and more)
* Login protection - brute-force lockout plus comment/contact-form honeypot spam blocking
* Malware quarantine - isolate suspicious files before removal
* Security dashboard, threat log, and daily email security report

= Backup & restore (free) =
* Full WordPress backup - files plus database, pure-PHP zip engine (no shell exec); files over 100MB are skipped
* One-click restore from any local backup, including AES-256-encrypted archives
* Optional AES-256 encryption at rest for backup archives
* Keeps your 10 most recent local backups by default (configurable, Backup settings)
* Adaptive backup engine tuned for slow shared hosting

= SEO (free) =
* On-page SEO audit and score, runs locally, no AI
* XML sitemap generator with custom post type support
* Optional /llms.txt AI-summary file, off by default (SEO Settings); skips password-protected and unpublished content

= SwissSuite AI Pro =

Upgrade at https://swisswpsecure.com/products/ to unlock these Pro-only features:

* Two-Factor Authentication (TOTP) for every user role
* Geo-blocking by country (allow/deny rules)
* Advanced firewall rules - expanded attack-pattern library (XXE, command injection)
* Cloud backup - Google Drive, S3, Backblaze B2, Dropbox, FTP/SFTP
* Scheduled backups with rolling retention
* Site migration - plugin-to-plugin and standalone-receiver modes
* Two-way content sync between staging and production
* Update-guard - automatic rollback and pre-update snapshots
* AI deep malware analysis (Groq-powered)
* AI SEO - bulk meta generation plus vision AI for alt text
* AI content - rewriting, tone control, and generation
* Vulnerability lookups via WPScan/Patchstack (BYO API key)

AI and remote-service features above run only in SwissSuite AI Pro.

= Privacy & Data =

The free plugin does not phone home on install. No telemetry, no phone-home tracking, no account, and no license key. An optional, off-by-default local pageview counter (Dashboard Traffic Counter) powers the Dashboard traffic chart; no IP addresses or cookies stored, nothing leaves your server. Security email alerts and the daily security report are off until enabled. All scanning, backup, and SEO analysis runs locally, and the plugin makes no AI calls. The only external service contacted is WordPress.org - for update checks, core-file checksum verification during a scan, and a daily abandoned-plugin check; see External Services below. Failed-login IPs and usernames are logged locally; the lockout itself expires in 15 minutes, but the log row is kept for a separate, configurable retention window (default 90 days) before automatic deletion. SwissSuite AI can route site email through an SMTP server (Settings -> General); off until configured, password stored in your database. Deleting the plugin removes its settings, database tables, quarantined files, backup archives, and all other data it created under wp-content/uploads/ (swisswpsuite-backups, -quarantine, -snapshots, -journals, -transport, -exports-temp) - download anything you need first.

== Source Code ==

SwissSuite AI is free software licensed under GPLv2 or later. The complete, uncompiled, human-readable source code - including the React and TypeScript sources behind the admin interface and the build scripts used to generate the distributed minified JavaScript and CSS - is published at:

https://github.com/Gfellerman/SwisswpSuite_Public/tree/main/plugin-src

Build instructions for regenerating the compiled assets from source are in that directory's BUILDING.md.

== External Services ==

This plugin's code can connect to the external services listed below. The free edition's local features (malware scan, backup, restore, quarantine, on-page SEO audit, sitemap) run entirely on your own server and use none of them.

Under normal operation, this free edition makes zero calls to SwissWPSecure servers: every code path in this package that could reach api.swisswpsecure.com checks the plugin edition first and returns before any network request is made. Those code paths exist because SwissSuite AI (free) and SwissSuite AI Pro are built from one shared source tree; they activate only in the separately downloaded, licensed Pro edition. They are documented in full below for transparency, even though none of them run in this free edition.

= WordPress.org APIs =
Host: api.wordpress.org
Used for: (1) core file checksum verification, to detect modified/infected core files; (2) standard plugin update checks, performed by WordPress itself; (3) a daily check of installed plugins against the WordPress.org directory, warning if one was closed or removed (often a sign of an unpatched or compromised plugin).
Data sent: your WordPress version and site locale (checksum requests), and your installed plugin slugs (update checks, abandoned-plugin check). No personal data, file contents, or site content is sent.
When contacted: (1) runs during any security scan that includes core-file integrity checking, and automatically once per day via a background check. (2) runs whenever WordPress checks for plugin updates - standard WordPress behavior, not specific to this plugin. (3) runs automatically once per day, and immediately if you click "Refresh" on the Abandoned Plugins panel; can be turned off at Settings -> Scan Capabilities -> "Abandoned Plugin Detection".
Privacy Policy: https://wordpress.org/about/privacy/

= SwissWPSecure Licensing & Billing API =
Host: api.swisswpsecure.com
Used for: license activation/deactivation, billing management (Stripe portal, auto-renewal, plan upgrades, refunds), periodic license-validity checks, domain-lock transfer during migration, and (only when an admin runs an AI feature on a paid plan) sending that content for AI processing. All of this belongs to SwissSuite AI Pro - none of it is available in, or reachable from, this free edition. Every call site checks the Pro edition is running before contacting this host; in Free that check always fails first, so nothing is ever sent.
Data sent (Pro only, never by Free): license key and site domain (activation, deactivation, billing actions, validity check, migration transfer); an admin-chosen return URL for the billing portal; and, only when an admin runs an AI feature, the content submitted (e.g. page titles/descriptions, post text, or a security-log summary that can include visitor IPs and usernames).
When contacted: Only in Pro - when an admin takes the corresponding action (license activation/deactivation, billing management, refund request, AI feature) or via the periodic license-validity check. Never contacted by Free.
Terms of Service: https://swisswpsecure.com/terms
Privacy Policy: https://swisswpsecure.com/privacy

= ipwho.is (IP geolocation) =
Host: ipwho.is
Used for: determining a visitor's country for Geo-Lockdown, a Pro-only feature (country-level allow/deny rules). Not available in, or reachable from, this free edition - the code that makes this call is physically absent from the free package.
Data sent (Pro edition only, and only when Geo-Lockdown is enabled - never sent by this free edition): the visiting IP address, for the country lookup only.
When contacted: Only in SwissSuite AI Pro, only when Geo-Lockdown is enabled, and only for a visitor's IP address not already resolved by a Cloudflare header (if present). Never contacted by this free edition under any circumstance.
Privacy Policy: https://ipwho.is/

For full details on what data is transmitted and your rights, see our Privacy Policy linked above.

== Changelog ==

= 2.9.33.37 =
* Live-QA fix round: sitemap/llms.txt toggles now purge the page cache so changes apply immediately; backup engine no longer loses progress under retry races; cancelling a backup can no longer affect the next one; backup downloads work reliably on object-cache hosts; product branding unified as SwissSuite AI.

For the full version history, see CHANGELOG.md in the plugin folder or https://github.com/Gfellerman/SwisswpSuite_Public/blob/main/CHANGELOG.md
