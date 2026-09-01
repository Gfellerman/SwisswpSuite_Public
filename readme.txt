=== SwissSuite AI ===
Contributors: gfellerman
Tags: security, malware scanner, firewall, backup, login security
Requires at least: 6.2
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 2.9.33.44
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

WordPress security & backup core - malware scanner, firewall, backup & restore, login protection, on-page SEO. Zero bloat.

== Description ==

SwissSuite AI (free) is a local WordPress security & backup core: malware scanning, firewall, hardening, backup/restore, quarantine, login protection, on-page SEO, XML sitemap - no account, no AI. Pro adds cloud backup, 2FA, geo-blocking, migration, sync, AI tools.

On activation the plugin disables the theme/plugin file editor by default; re-enable it at Security -> Hardening.

= Security (free) =
* Malware scanner - 38+ local signatures; Quick Scan (daily + on-demand) checks 100 of up to 5,000 tracked files/pass, skipping 32 trusted paths + /vendor/; no file contents leave your site
* Deep malware scan - local analysis of active plugins/theme (+parent) and uploads, up to 5,000 PHP files/run; AI grading is Pro
* WAF - starts in observe mode; enable active blocking at Security -> Firewall (threat log + auto IP banning)
* IP management - ban, unban, allowlist IPs
* One-click hardening - 12 options (XML-RPC, file editing, user enumeration, REST API, bot blocking, more)
* Login protection - brute-force lockout plus honeypot spam blocking
* Malware quarantine - isolate suspicious files before removal
* Security dashboard, threat log, daily email report

= Backup & restore (free) =
* Full backup - files + database, pure-PHP zip engine (no shell exec); files over 100MB skipped
* One-click restore, incl. AES-256-encrypted archives
* Optional AES-256 encryption at rest
* Keeps 10 most recent backups by default (configurable)
* Adaptive engine tuned for slow shared hosting

= SEO (free) =
* On-page SEO audit and score, local, no AI
* XML sitemap with custom post type support
* Optional /llms.txt AI-summary file, off by default; skips password-protected/unpublished content

= SwissSuite AI Pro =

Upgrade at https://swisswpsecure.com/products/ for:

* Two-Factor Authentication (TOTP), every role
* Geo-blocking by country
* Advanced firewall rules (XXE, command injection)
* Cloud backup - GDrive, S3, B2, Dropbox, FTP/SFTP
* Scheduled backups, rolling retention
* Site migration (plugin-to-plugin or standalone receiver)
* Two-way staging/production content sync
* Update-guard - rollback + pre-update snapshots
* AI deep malware analysis (Groq)
* AI SEO - bulk meta + vision alt text
* AI content generation, rewriting, tone control
* WPScan/Patchstack vulnerability lookups (BYO key)

= Privacy & Data =

No phone-home, telemetry, account, or license key. Scanning, backup, and SEO run locally - no AI calls. Only WordPress.org is contacted by default: update checks, checksum verification, and a daily abandoned-plugin check (see External Services). The optional, off-by-default Dashboard Traffic Counter stores no IPs/cookies and sends nothing off-server. Security alerts and the daily report stay off until enabled. Auto-updates honor WordPress core's own per-plugin toggle; the plugin's own off-by-default setting can only add consent, never remove it. Failed-login IPs/usernames are logged locally, retained for a configurable window (default 90 days) after the 15-minute lockout expires. An optional SMTP relay (off until configured; you supply the server address of your own mail provider, whose password is stored in your database) can route site email. Deleting the plugin removes its settings, tables, quarantined files, backups, and all data under wp-content/uploads/ (swisswpsuite-backups, -quarantine, -snapshots, -journals, -transport, -exports-temp, -temp, swisssuite-ai) - download first.

== Source Code ==

SwissSuite AI is free software (GPLv2 or later). The complete, uncompiled, human-readable source - including the React/TypeScript admin UI and the build scripts for the distributed JS/CSS - is published at:

https://github.com/Gfellerman/SwisswpSuite_Public/tree/main/plugin-src

Build instructions for regenerating the compiled assets are in that directory's BUILDING.md.

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

= 2.9.33.44 =
* Author URI and all internal links moved off the "www" subdomain (CDN-edge reachability variance affected automated checkers); apex domain verified responsive to all user agents.

= 2.9.33.43 =
* Plugin URI updated to a directly-responding page (review feedback); every core-include require site now carries a defensive guard, enforced by a permanent build gate.

For the full version history, see CHANGELOG.md in the plugin folder or https://github.com/Gfellerman/SwisswpSuite_Public/blob/main/CHANGELOG.md
