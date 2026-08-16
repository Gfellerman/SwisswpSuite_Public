=== SwissSuite AI ===
Contributors: swisswpsecure, gfellerman
Tags: security, malware scanner, firewall, backup, login security
Requires at least: 6.2
Tested up to: 7.0
Requires PHP: 7.4
Stable tag: 2.9.33.21
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
* One-click restore of your site files from any unencrypted local backup (backup-archive encryption is a Pro feature — see the FAQ)
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

Open SwissSuite → Backup and click Back Up Now to create a full backup of your files and database. Restore the files from any unencrypted backup with one click — backup-archive encryption is a Pro feature, and an encrypted (.zip.enc) backup cannot currently be restored through this UI; decrypt it first, or restore from an unencrypted backup. Database restore is not available in this version; a restore never modifies your database. If a restored backup includes a plugin whose files no longer exist on this site, SwissSuite removes only that specific plugin from your active-plugins list — so the site does not crash on its next page load — and tells you exactly which plugin(s) it was, in plain English, right after the restore completes. Scheduled automated backups, backup-archive encryption, and cloud destinations (Google Drive, Amazon S3, Backblaze B2, Dropbox, FTP/SFTP) are part of SwissSuite AI Pro.

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

This plugin's code can connect to the external services listed below. The free edition's local features (malware scan, backup, restore, quarantine, on-page SEO audit, sitemap) run entirely on your own server and use none of them.

Under normal operation, this free edition makes zero calls to SwissWPSecure servers: every code path in this package that could reach api.swisswpsecure.com checks the plugin edition first and returns before any network request is made. Those code paths exist because SwissSuite AI (free) and SwissSuite AI Pro are built from one shared source tree; they activate only in the separately downloaded, licensed Pro edition. They are documented in full below for transparency, even though none of them run in this free edition.

= WordPress.org APIs =
Host: api.wordpress.org
Used for: (1) WordPress core file checksum verification, to detect modified or infected core files; (2) standard plugin update checks, performed by WordPress itself for every plugin hosted on WordPress.org; (3) a daily check of your installed plugins against the WordPress.org plugin directory, to warn you if one has been closed or removed (often a sign of an unpatched vulnerability or a compromised plugin).
Data sent: Your WordPress version and site locale (for checksum requests), and your installed plugin slugs (for the update checks and the abandoned-plugin check). No personal data, file contents, or site content is sent.
When contacted: (1) runs during any security scan that includes core-file integrity checking, and automatically once per day via a background check. (2) runs whenever WordPress checks for plugin updates — standard WordPress behavior, not specific to this plugin. (3) runs automatically once per day, and immediately if you click "Refresh" on the Abandoned Plugins panel; can be turned off at Settings -> Scan Capabilities -> "Abandoned Plugin Detection".
Privacy Policy: https://wordpress.org/about/privacy/

= SwissWPSecure Licensing & Billing API =
Host: api.swisswpsecure.com
Used for: License activation and deactivation, subscription and billing management (opening the Stripe billing portal, cancelling or resuming auto-renewal, plan upgrades, refund requests), the periodic license-validity check, transferring a license's domain lock during a site migration, and, where an administrator has actively used an AI feature on a paid plan, sending the corresponding content for AI processing. All of this belongs to SwissSuite AI Pro, the separate paid edition — none of it is available in, or reachable from, this free edition. Every call site checks that the Pro edition is running before contacting this host; in this free edition that check always fails first, so the request is never sent, no license or account ever exists, and nothing is transmitted.
Data sent (Pro edition only — never sent by this free edition): license key and site domain, for activation, deactivation, the billing/subscription actions above, the periodic validity check, and migration domain transfer; an admin-chosen return URL, for the billing portal; and, only for AI features an administrator explicitly runs, the specific content submitted for processing (for example page titles and descriptions, post text, or a security-log summary that can include visitor IP addresses and attempted usernames).
When contacted: Only in SwissSuite AI Pro. Either when an administrator takes the corresponding action (activating or deactivating a license, opening billing management, requesting a refund, running an AI feature) or automatically via the periodic Pro license-validity check. Never contacted by this free edition under any circumstance.
Terms of Service: https://swisswpsecure.com/terms
Privacy Policy: https://swisswpsecure.com/privacy

= ipwho.is (IP geolocation) =
Host: ipwho.is
Used for: Determining a visitor's country for Geo-Lockdown, a SwissSuite AI Pro-only feature (country-level allow/deny rules). Not available in, or reachable from, this free edition — the geo-blocking code that makes this call is physically absent from the free package; this free edition's own privacy-policy generator describes the call for transparency (matching what the Pro edition does when the feature is enabled), but never makes it.
Data sent (Pro edition only, and only when Geo-Lockdown is enabled — never sent by this free edition): the visiting IP address, for the country lookup only.
When contacted: Only in SwissSuite AI Pro, only when Geo-Lockdown is enabled, and only for a visitor's IP address not already resolved by a Cloudflare header (if present). Never contacted by this free edition under any circumstance.
Privacy Policy: https://ipwho.is/

For full details on what data is transmitted and your rights, see our Privacy Policy linked above.

== Source Code ==

SwissSuite AI is free software licensed under GPLv2 or later. The complete, uncompiled, human-readable source code — including the React and TypeScript sources behind the admin interface and the build scripts used to generate the distributed minified JavaScript and CSS — is published at:

https://github.com/Gfellerman/SwisswpSuite_Public/tree/main/plugin-src

Build instructions for regenerating the compiled assets from source are in that directory's BUILDING.md.

== Upgrade Notice ==

= 2.9.33.21 =
Recommended for all users. Fixes a free-edition bug where completed security scans never appeared in Scan History, stops an internal diagnostic message from being shown in the System Logs viewer, and prevents the abandoned-plugin check from flagging this plugin's own installation.

== Changelog ==

= 2.9.33.21 =
* Fixed 2 items the owner's own re-run of the real Plugin Check caught that the previous polish pass missed: a self-inflicted line-placement error in a SQL-comment fix, and 26 additional false-positive naming warnings in uninstall.php (same root cause as the .20 fix, different file).

= 2.9.33.20 =
* Ran the real WordPress.org Plugin Check tool for the first time since the last rejected build: 0 errors, 368 informational warnings, none blocking. Polished 20 of those warnings for a cleaner report (SQL-escaping comment hygiene, third-party cache-plugin hook integration, and a plugin-prefix naming cleanup) — no behavior change.

= 2.9.33.19 =
* Fixed: a spurious error was being logged every time the Backup tab loaded; it no longer is.
* Fixed: the plugin's own plugin-health check could incorrectly flag the plugin's own installation as untrustworthy; it no longer checks itself.
* Fixed: security scan results now correctly appear in Scan History for the free edition.
* Fixed: the System Logs viewer under Settings > Maintenance no longer shows internal development notes; only user-relevant diagnostic messages are shown.

= 2.9.33.18 =
* Security: Free edition — removed remaining Pro-referencing interface text outside the Settings comparison panel. A full-population string census of the compiled free edition's JS bundle (every string literal, not a keyword search) found 18 out-of-zone Pro-descriptive strings and 6 ambiguous ones still compiled in — locked-action tooltips, AI-analysis error messages, a scan-description tail describing the Pro-only deep scan's capabilities, and historical scan-type labels. Every locked-action element a genuine free-edition user actually sees keeps rendering with neutral wording (e.g. "Not available in this edition") — nothing that was visible before has disappeared; only the Pro-branded text was replaced or, where the element itself never renders in this edition at all (upgrade CTAs, Pro-only panels), physically excluded from the build the same way 2FA/geo-blocking/encryption already are.
* This build also includes the plugin-side fix already committed separately: an incorrect trial notice was removed.

= 2.9.33.17 =
* Security: closed the last 2 known instances of the "compiled into the free edition's JS bundle despite a runtime-only gate" pattern — the Pro-only "Layer 2 Scan" and "Full AI Scan" scan-card labels/descriptions were shared object-literal values in a module also used by this edition's free scan cards; the Pro-only copy is now in a separate module that is physically excluded from this edition's build, same mechanism already used for 2FA/geo-blocking/encryption in earlier releases.

= 2.9.33.16 =
* Changed: Scan UI consolidation — the "Security Audit" and "Malware Scan" cards are now one merged scan card (both the signature scan and the security-posture check are kept). The Deep Malware Scan (Pro) is re-presented as a deep scan with automatic AI verification of results. Two unreachable UI code paths were removed.
* Fixed: the Dashboard's SEO score tile and the SEO tab's Health Audit now show the same "SEO score" number for the same site state — both are computed by one shared formula instead of two different ones.
* Changed: softened the backup-restore readme wording so it no longer promises restoring an encrypted backup this edition cannot decrypt (backup-archive encryption is a Pro feature).

= 2.9.33.15 =
* Security: fixed a regression from 2.9.33.14's frontend physical-exclusion sweep — the Geo-Lockdown card's fetch/save logic (and the literal "Geo-Lockdown countries saved." string) were still compiled into this free edition's JS bundle even though nothing in the free UI could reach them; moved into the same build-time-excluded component boundary as its UI.
* Security: fixed a second instance of the same pattern — the "Set up Two-Factor Authentication (2FA)" nudge link was gated at runtime only, so its text still shipped in this free edition's JS bundle; now physically excluded.
* Changed: External Services documentation now discloses ipwho.is (the Pro-only Geo-Lockdown country lookup), for the same transparency reason the SwissWPSecure API is already documented.

= 2.9.33.14 =
* Security: fixed AI file analysis (Pro) being able to read and transmit unredacted wp-config.php content, including WordPress's own authentication keys/salts.
* Security: fixed a second instance of the malware scanner flagging the plugin's own files as a threat on a Pro install.
* Fixed: several AI-only code paths were present (but unreachable) inside otherwise free-shipping backend files and frontend bundles; all AI-related code is now physically excluded from this free edition, matching WordPress.org's plugin directory guidelines.
* Changed: this plugin now uses WordPress's own bundled React instead of shipping its own copy, per WordPress.org guidelines.
* Fixed: Free/Pro edition-conflict handling now only ever deactivates itself, never the other installed edition.
* Changed: External Services documentation expanded for full transparency.

= 2.9.33.9 =
* Hardening: added direct-file-access protection to every remaining plugin PHP file (defence in depth).

= 2.9.33.8 =
* Fixed: added direct-file-access protection to two files that lacked it (WordPress.org Plugin Check requirement).

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
