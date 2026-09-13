=== SwissSuite AI ===
Contributors: gfellerman
Tags: security, malware scanner, firewall, backup, login security
Requires at least: 6.3
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 2.9.33.58
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

WordPress security & backup core - malware scanner, firewall, backup & restore, login protection, on-page SEO. Zero bloat.

== Description ==

SwissSuite AI is a local WordPress security & backup core: malware scanning, firewall, hardening, backup/restore, quarantine, login protection, on-page SEO, XML sitemap - no account required, no AI.

On activation the plugin disables the theme/plugin file editor by default; re-enable it at Security -> Hardening.

= Security =
* Malware scanner - 38+ local signatures; Deep Scan (on demand) checks the PHP files of active plugins and theme (up to 5,000 files), skipping 32 trusted paths + /vendor/; a quick audit runs daily once the scan report e-mail is on; no file contents leave your site
* Deep malware scan - local analysis of active plugins/theme (+parent) and uploads, up to 5,000 PHP files/run
* WAF - starts in observe mode; enable active blocking at Security -> Firewall (threat log + auto IP banning)
* IP management - ban, unban, allowlist IPs
* One-click hardening - 12 options (XML-RPC, file editing, user enumeration, REST API, bot blocking, more); "Hide WordPress Fingerprints" strips the WordPress version from the generator tag and asset URLs
* Login protection - brute-force lockout; comment spam blocking (a hidden honeypot field on the comment form, and comments with more than two links are marked as spam; on by default, switchable under Security)
* Malware quarantine - isolate suspicious files before removal
* Security dashboard, threat log, daily email report
* Sites behind Cloudflare: so that the firewall, login protection and logs see the real visitor address, the plugin reads Cloudflare's CF-Connecting-IP header only for requests arriving from Cloudflare's published IP ranges (a fixed list inside the plugin; nothing is ever sent to Cloudflare). The "Cloud Shield" tab is a written configuration guide for that setup; it does not require a Cloudflare account and the plugin never contacts Cloudflare.

= Backup & restore =
* Full backup - files + database, pure-PHP zip engine (no shell exec); files over 100MB skipped
* One-click restore, incl. AES-256-encrypted archives
* Optional AES-256 encryption at rest
* Keeps the 10 most recent local backups and prunes older ones automatically
* Adaptive engine tuned for slow shared hosting
* Optional WP-CLI commands for hosts with real cron access: `wp swisswpsuite backup run|due|status` runs or resumes a backup, fires this plugin's own due recurring tasks, or lists backup job status - useful on hosts where WordPress's own background scheduler is unreliable; entirely optional, nothing changes if you never use it

= SEO =
* On-page SEO audit and score, local, no AI
* On-page output (off by default): when you switch on "Basic SEO Meta Tags" under Settings -> SEO, the plugin writes a meta description (taken from the post excerpt or opening text), canonical link, Open Graph and Twitter Card tags and JSON-LD structured data into each public page's head. On the front page, blog page, shop page and category/tag archives it also sets the document title; single posts and pages keep the theme's title. It never does this while a dedicated SEO plugin (Yoast SEO, Rank Math, All in One SEO, SEOPress, The SEO Framework) is active; it defers to that plugin and shows a notice.
* XML sitemap with custom post type support
* Optional /llms.txt AI-summary file, off by default; skips password-protected/unpublished content

= Maintenance =
* Database maintenance - clear the plugin's own transients, delete revisions/spam/trash/stale drafts, remove orphaned metadata/relationships, optimize tables, and drop tables left behind by uninstalled plugins (every action confirmed; table removal previews first)

= SwissSuite AI Pro =

SwissSuite AI Pro, available at https://swisswpsecure.com/products/, adds more features on top of everything above.

= Privacy & Data =

No phone-home, telemetry, or account is required to use this plugin - nothing to activate, nothing to log into. Scanning, backup, and SEO run locally - no AI calls. Only WordPress.org is contacted by default: update checks, checksum verification, and a daily abandoned-plugin check (see External Services). The optional, off-by-default Dashboard Traffic Counter stores no IPs/cookies and sends nothing off-server. Security alerts and the daily report stay off until enabled. Auto-updates are controlled entirely by WordPress core's own per-plugin toggle - this plugin does not add, override, or otherwise interfere with that setting. Failed-login IPs/usernames are logged locally, retained for 90 days after the 15-minute lockout expires. An optional SMTP relay (off until configured; you supply the server address of your own mail provider, whose password is stored in your database) can route site email. Deleting the plugin removes its settings, tables, quarantined files, backups, and all data under wp-content/uploads/ (swisswpsuite-backups, -quarantine, -snapshots, -exports-temp, -temp, swisssuite-ai) - download first.

Some security actions modify files outside the plugin folder. One-click hardening options write rule blocks into the site-root .htaccess and the uploads folder's .htaccess (removed again on deactivation). The maintenance tool can permanently delete post revisions, trashed content, spam comments, and stale auto-drafts after a single confirmation, and, after a preview run and a second explicit confirmation, drop database tables it identifies as orphaned by uninstalled plugins. If LiteSpeed Cache, WP Rocket or Autoptimize is active, the plugin asks it to leave the plugin's own admin scripts and styles out of minification; the Maintenance screen's cache purge (also run after a restore) asks whichever supported cache plugin is active to purge its page cache - local plugin calls, no network. Settings -> Diagnostics offers Self-Check (local checks, also shown in Site Health), a redacted diagnostics file you download yourself, and a test e-mail; nothing is sent automatically. On WordPress 6.9+ the plugin registers two administrator-only abilities with the WordPress Abilities API (Get Server Health, Scan for Malware).

== Source Code ==

SwissSuite AI is released under the GPLv2 (or later). The complete, uncompiled, human-readable source - including the React/TypeScript admin UI and the build scripts for the distributed JS/CSS - is published at:

https://github.com/Gfellerman/SwisswpSuite_Public/tree/main/plugin-src

Build instructions for regenerating the compiled assets are in that directory's BUILDING.md.

== External Services ==

This plugin's code can connect to the service listed below and to nothing else. Optionally, if you enter the credentials of your own SMTP server under Settings -> General -> Email Delivery (SMTP), every e-mail WordPress sends from this site (this plugin's reports and alerts, password resets, other plugins' mail) is handed to that server instead of PHP mail(), with the sender name and address you configure; that server is one you choose and operate, and the plugin transmits to it only those e-mails and the credentials you entered. Its local features (malware scan, backup, restore, quarantine, on-page SEO audit, sitemap) run entirely on your own server and do not use it. This plugin does not phone home to any server operated by its developer, does not require an account or a key of any kind, and does not send site content or visitor data anywhere.

= WordPress.org APIs =
Host: api.wordpress.org
Used for: (1) core file checksum verification, to detect modified/infected core files; (2) standard plugin update checks, performed by WordPress itself; (3) a daily check of installed plugins against the WordPress.org directory, warning if one was closed or removed (often a sign of an unpatched or compromised plugin).
Data sent: your WordPress version and site locale (checksum requests), and your installed plugin slugs (update checks, abandoned-plugin check). No personal data, file contents, or site content is sent.
When contacted: (1) runs during any security scan that includes core-file integrity checking, and automatically once per day via a background check. (2) runs whenever WordPress checks for plugin updates - standard WordPress behavior, not specific to this plugin. (3) runs automatically once per day, and immediately if you click "Refresh" on the Abandoned Plugins panel; can be turned off at Settings -> Scan Coverage -> "Abandoned Plugin Detection".
Terms of Service: https://wordpress.org/about/license/
Privacy Policy: https://wordpress.org/about/privacy/

For full details on what data is transmitted and your rights, see our Privacy Policy at https://swisswpsecure.com/privacy.

== Changelog ==

= 2.9.33.58 =
* Changed: Requires WordPress 6.3 or newer.
* Fixed: The deep malware scan now scans the files it enumerated (a scan could complete having examined nothing).
* Changed: The deep scan's status response lists the phases it performs (file enumeration, local signature scan).
* Changed: "Hide WordPress Fingerprints" removes only the WordPress version (generator tag, asset URLs); other plugins' assets are untouched.
* Fixed: Settings and Self-Check readouts now read the values the plugin stores; wording matches the 15-minute lockout and 90-day log retention.
* Changed: Scan history records use the type name `security_audit`; existing records are relabelled automatically.
* Changed: Unused option keys and a table name nothing reads were removed; deactivation clears every scheduled event this plugin owns.

