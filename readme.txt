=== SwissSuite AI ===
Contributors: swisswpsecure, gfellerman
Tags: security, malware scanner, firewall, backup, login security
Requires at least: 6.2
Tested up to: 7.0
Requires PHP: 7.4
Stable tag: 2.9.33.7
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

WordPress security & backup core — malware scanner, firewall, local backup & file restore, login protection, and on-page SEO. Zero bloat.

== Description ==

SwissSuite AI (free edition) is the security and backup core for WordPress. It gives you a local malware scanner, a web application firewall with IP management, one-click hardening, full local backup and one-click file restore, malware quarantine, login protection, an on-page SEO audit, and an XML sitemap — all running on your own server, with no account and no AI calls.

Everything in the free plugin runs locally. It does not phone home on install, it sends no telemetry, and it performs no AI processing. When you are ready for more, SwissSuite AI Pro adds cloud backup, two-factor authentication, geo-blocking, migration, sync, and AI-powered malware, SEO, and content tools.

= Security (free) =
* Malware scanner — 38+ local signature patterns, on-demand and daily; runs entirely on your server, no file contents leave your site
* Web Application Firewall — blocks SQL injection, XSS, and path-traversal attempts, with a threat log
* IP management — manually ban, unban, and allowlist IP addresses
* One-click hardening — 12 hardening options (XML-RPC, file editing, user enumeration, REST API, application passwords, and more)
* Login protection — brute-force login lockout plus comment and contact-form honeypot spam blocking
* Malware quarantine — isolate suspicious files locally before you remove them
* Security dashboard, threat log, and daily email security report

= Backup & restore (free) =
* Full WordPress backup — files plus database — with a pure-PHP zip engine (no shell exec required)
* One-click restore of your site files from any local backup
* Adaptive backup engine that adjusts to slow shared hosting instead of failing mid-job

= SEO (free) =
* On-page SEO audit and score — runs locally, no AI
* XML sitemap generator with custom post type support

= SwissSuite AI Pro =

Upgrade at https://swisswpsecure.com/products/ to unlock these features, which run only in the Pro edition:

* Two-Factor Authentication (TOTP) for every user role
* Geo-blocking with country-level allow and deny rules
* Advanced firewall rule sets with automated IP reputation scoring and rate limiting
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

= Who is this for =

* **Site owners** who want a malware scanner, firewall, and local backup without juggling several plugins
* **Freelancers and agencies** standardizing basic security and backups across client sites
* **WooCommerce stores** that need firewall protection compatible with the Store API plus reliable local backups
* **Anyone** who wants to start free and add AI scanning, cloud backup, or two-factor authentication later

= Privacy & Data =

The free plugin does not phone home on install. No telemetry, no tracking, no analytics, no account, and no license key. All scanning, backup, and SEO analysis runs locally on your server, and the plugin makes no AI calls. The only external service it contacts is WordPress.org — for plugin update checks, core-file checksum verification during a scan, and a daily check for closed or abandoned plugins. Full details are disclosed under External Services below.

== Installation ==

1. In WordPress Admin, go to Plugins → Add New → Upload Plugin.
2. Upload the SwissSuite AI zip and click Install Now.
3. Activate the plugin.
4. Open the SwissSuite menu in the WordPress sidebar.
5. Run your first malware scan from Security → Scan. No account or license key is required — the free features work immediately.
6. Pro — AI content tools, cloud backup, site sync, two-factor auth, and advanced WAF — is a separate licensed download, not unlocked from within this plugin. Get it at https://swisswpsecure.com/products/ .

= Minimum Requirements =

* WordPress 6.2 or higher
* PHP 7.4 or higher

== Frequently Asked Questions ==

= Is SwissSuite AI free? =

Yes. This free edition gives you a local malware scanner, a web application firewall, full local backup and one-click file restore, malware quarantine, login brute-force protection, an on-page SEO audit, and an XML sitemap. No account, no credit card, and no license key are required to use these features. The premium features listed below are part of SwissSuite AI Pro.

= Why is it called SwissSuite AI if the free plugin doesn't use AI? =

SwissSuite AI is the name of the platform. The free plugin is its security core — malware scanning, firewall, backups — and performs no AI processing and sends no data to AI services. The AI features (deep malware analysis, AI SEO, AI content) run exclusively in SwissSuite AI Pro.

= How do I scan my WordPress site for malware? =

Open SwissSuite → Security → Scan. The free malware scan checks your files against 38+ local signature patterns and runs entirely on your server — no file contents leave your site. A deeper scan that checks file hashes against a remote malware database and adds AI review is available in SwissSuite AI Pro.

= How do I back up my WordPress site? =

Open SwissSuite → Backup and click Back Up Now to create a full backup of your files and database. Restore the files from any backup with one click. Database restore is not available in this version; a restore never modifies your database. If a restored backup includes a plugin whose files no longer exist on this site, SwissSuite removes only that specific plugin from your active-plugins list — so the site does not crash on its next page load — and tells you exactly which plugin(s) it was, in plain English, right after the restore completes. Scheduled automated backups and cloud destinations (Google Drive, Amazon S3, Backblaze B2, Dropbox, FTP/SFTP) are part of SwissSuite AI Pro.

= Can I use SwissSuite alongside a dedicated security plugin like Wordfence? =

Yes. SwissSuite's free firewall and scanner run independently and can coexist with other security plugins; if you would rather use a single tool, SwissSuite covers malware scanning, a firewall, login protection, and local backups in one install.

= Is SwissSuite compatible with WooCommerce? =

Yes. The firewall has an explicit allowlist for WooCommerce REST routes (wc/v3, wc/store/v1, wc/store/v2, wc-analytics/v1, wc-admin/v1, wc-auth/v1) so cart, checkout, and the Store API keep working with protection enabled. The backup engine also handles WooCommerce-specific tables (orders, customers, sessions).

= Do I need a license key or an account? =

No. Every feature in this free plugin works immediately with no account and no license key. A license key is only needed to unlock SwissSuite AI Pro features, and a Pro license is locked to one domain. Learn more at https://swisswpsecure.com/products/ .

== Screenshots ==

1. Security dashboard — threat count and scan status at a glance.
2. Malware scan results — file list with local signature-based threat classifications.
3. Backup — local backup list with one-click file restore.
4. On-page SEO audit — page score and improvement recommendations (runs locally).
5. Threat log — blocked firewall requests with rule and timestamp.

== External Services ==

This plugin connects to only the external service listed below, and only for the purposes described. The free plugin has no license or account system of any kind, does no AI processing, and makes no AI calls — its local features (malware scan, backup, restore, quarantine, on-page SEO audit, sitemap) run entirely on your own server.

The free plugin sends no data to SwissWPSecure servers. No account, no license key, no phoning home.

= WordPress.org APIs =
Host: api.wordpress.org
Used for: (1) WordPress core file checksum verification, to detect modified or infected core files; (2) standard plugin update checks, performed by WordPress itself for every plugin hosted on WordPress.org; (3) a daily check of your installed plugins against the WordPress.org plugin directory, to warn you if one has been closed or removed (often a sign of an unpatched vulnerability or a compromised plugin).
Data sent: Your WordPress version and site locale (for checksum requests), and your installed plugin slugs (for the update checks and the abandoned-plugin check). No personal data, file contents, or site content is sent.
When contacted: (1) runs during any security scan that includes core-file integrity checking, and automatically once per day via a background check. (2) runs whenever WordPress checks for plugin updates — standard WordPress behavior, not specific to this plugin. (3) runs automatically once per day, and immediately if you click "Refresh" on the Abandoned Plugins panel; can be turned off at Settings -> Scan Capabilities -> "Abandoned Plugin Detection".
Privacy Policy: https://wordpress.org/about/privacy/

For full details on what data is transmitted and your rights, see our Privacy Policy linked above.

== Source Code ==

SwissSuite AI is free software licensed under GPLv2 or later. The complete, uncompiled, human-readable source code — including the React and TypeScript sources behind the admin interface and the build scripts used to generate the distributed minified JavaScript and CSS — is published at:

https://github.com/Gfellerman/SwisswpSuite_Public/tree/main/plugin-src

Build instructions for regenerating the compiled assets from source are in that directory's BUILDING.md.

== Upgrade Notice ==

= 2.9.30.93 =
Critical fix: archive scan was restarting from scratch on every recovery tick instead of resuming from where it stopped. Sites with 50K+ files on overloaded shared hosting would burn all 5 scan attempts and circuit-break. Mandatory update for users experiencing repeated scan failures on large sites.

= 2.9.30.92 =
Critical fix: backup was re-archiving its own previous backup zips on every run, causing exponential size growth. Mandatory update for all users.

== Changelog ==

= 2.9.33.7 =
* Fixed: multi-part encrypted backups now encrypt every part (previously parts after the first could remain unencrypted) and are stored with the documented .zip.enc name; restore attempts on encrypted backups now show a clear message.
* Fixed: the malware/audit scanners no longer flag the sibling SwissSuite edition's own files during an upgrade.
* Fixed: SEO meta now renders on the WooCommerce Shop page; SEO descriptions no longer receive unrelated filler text; titles no longer truncate mid-phrase; pages without real content get grounded, factual descriptions.

= 2.9.33.6 =
* Changed: scan summary text reworded for clarity. No functional changes.

= 2.9.33.5 =
* Changed: two remaining scan-related texts reworded for clarity and accuracy (scan recommendations, AI log-analysis plan notice). No functional changes.

= 2.9.33.4 =
* Fixed: malware/audit scanners no longer flag their own signature definitions; every finding now carries a plain-English explanation.
* Fixed: backup encryption on hosts with partial libsodium support (graceful OpenSSL fallback); encryption failures now surface in System Logs.
* Fixed: restoring a backup that references a since-removed plugin now prunes only that plugin from the active list and tells you exactly which one, preventing a crash on the next page load.
* Fixed: bulk content/security actions now report exactly which items succeeded, failed, or were skipped — no more silent partial failures.
* Fixed: scan-report email links, license feature checklist accuracy, SEO analysis of block-theme pages, stale AI token panel after deactivation, header status text visibility, and screen-reader labels on settings switches.
* Changed: AI content rewriting now preserves technical specifications, part/fitment numbers, embedded images and tables in product descriptions.
* Changed: clearer edition boundaries — features not included in an edition are absent rather than present-but-blocked.

= 2.9.33.3 =
* Internal: no functional changes — version bump only, published to the VPS Pro-updater
  endpoint to validate the in-plugin auto-update flow end-to-end (live-QA infrastructure test).

= 2.9.33.2 =
* Fixed: The Smart Firewall and Login Safeguard on/off switches were invisible in some license tiers — showing only a read-only status label instead of a working control, and for Login Safeguard the max-attempts setting was inaccessible too. Both switches, and the max-attempts setting, now work as intended everywhere they should.

= 2.9.33.1 =
* Fixed: The Security Hub's Quarantine tab could enter an infinite refresh loop, continuously re-requesting the quarantine, safelist, and banned-IP lists in the background. This wasted server resources and could trigger a host's own bot-protection to block the site owner's access.

= 2.9.33.0 =
* Changed: The free edition no longer contains features it cannot run. Tools that require a paid plan are now simply absent from the free plugin instead of being present and refusing with an "upgrade required" message. This affects AI connection testing, geo-blocking, cloud backup destinations, AI file/log/firewall analysis, and AI SEO generation.
* Changed: Several SEO tools that run entirely on your own server are now free: llms.txt generation, and the stop, reset, status and cancel controls for SEO batch jobs.
* Fixed: SEO scores were under-reported. The "acceptable" quality tier for meta descriptions could never be reached, because its lower and upper bounds were the same value, so pages that should have scored partial credit scored none.
* Removed: The bring-your-own AI endpoint panel no longer appears in the free edition. It had no AI features to connect to, so it only offered a setting that did nothing.
* Removed: A deprecated, unreferenced internal class was dropped from the package.

= 2.9.32.3 =
* Changed: The malware scanner is now completely unlimited on the free version. The previous one-scan-per-day limit and its upgrade prompt have been removed — the scan runs entirely on your own server at no cost.
* Fixed: Restoring a backup could silently delete your own SQL files if they were named like the plugin's own database exports (for example database-20260731.sql). Restore now verifies a file is genuinely a SwissSuite export before removing it.
* Fixed: Scheduled tasks could stop running after an update on sites that had once enabled the old "Disable Visitor-Triggered Scheduling" option, because a leftover .htaccess rule kept blocking wp-cron.php. Updating now clears that rule automatically.
* Fixed: Applying the "disable WP_DEBUG" fix now asks for confirmation before rewriting wp-config.php.
* Security: Fixed a flaw that allowed a crafted request header to disguise a visitor's IP address on sites behind a trusted proxy or CDN, which could be used to evade IP bans, brute-force protection and country blocking.

= 2.9.32.2 =
* Changed: Clarified that restore is files-only in this version. Restoring a backup replaces your site files; it does not import or modify your database, even though a full backup includes a complete database export. Creating a backup is unaffected.

= 2.9.32.1 =
* Added: Request a refund directly from the License screen. You'll receive a confirmation email with a secure link — nothing is charged or changed until you confirm. Refunds remain a one-time goodwill gesture issued at our discretion under our Terms of Service; your statutory rights are unaffected. (Pro edition.)
* Fixed: Pro auto-updates now work — the update-checker library was missing from earlier Pro builds, so Pro installs never saw new versions. Pro editions now receive updates from swisswpsecure.com. (Free continues to update via WordPress.org.)
* Fixed: Cancelling auto-renewal now works correctly for the all-in-one SwissSuite plan (it previously showed "no active subscription" on suite licenses).
* Fixed: When a purchase is refunded, the subscription is now ended automatically, so you are never charged again at the next renewal.
* Fixed: AI image SEO (alt text and titles) now works on staging and firewalled sites by reading images locally instead of relying on a public URL.
* Fixed: Large-site security audits are less likely to time out.
* Fixed: Internal billing-integrity improvements to the one-time refund safeguard. (Backend; no action needed.)

= 2.9.31.8 =
* Added: Purchased token packs now appear on the License screen as "Purchased: Y" alongside your monthly allowance, so you can see both pools at a glance (shown only when you own a pack).
* Fixed: Reworked how purchased token packs are stored and spent so pack tokens are never wiped by a monthly reset or a routine balance recalculation. Your monthly allowance is always spent first; purchased pack tokens are drawn only after it runs out, and they never expire. (Backend/Pro; no action needed.)

= 2.9.31.7 =
* Changed: AI image alt-text analysis (the vision feature) now runs on a European AI provider (Mistral, based in France), keeping that processing within the EU. The same graceful "temporarily unavailable" handling applies, and text-based AI features are unchanged. (Pro edition only.)

For the full version history (every release from v2.9.0 to current), see CHANGELOG.md in the plugin folder or visit https://github.com/Gfellerman/SwisswpSuite_Public/blob/main/CHANGELOG.md
