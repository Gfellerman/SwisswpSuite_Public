=== SwissSuite Security Backup and SEO ===
Contributors: gfellerman
Tags: security, malware scanner, firewall, backup, login security
Requires at least: 6.3
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 2.9.33.69
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

WordPress security & backup core - malware scanner, firewall, backup & restore, login protection, on-page SEO. Zero bloat.

== Description ==

A local WordPress security & backup core: malware scanning, firewall, hardening, backup/restore, login protection, on-page SEO. No account required. Slug swisssuite-ai - no AI features or calls.

= Security =
* Malware scanner (38+ signatures) + Deep Scan (5,000 files, 32 trusted paths skipped); nothing leaves site; quarantine
* WAF - observe mode by default; blocking + auto IP ban at Firewall; IP allow/ban list; dashboard, threat log, email reports; inspects the page address and its query arguments (cookies, form posts, uploads, request bodies and headers are not inspected)
* One-click hardening (12 options incl. XML-RPC, editor lock, bot blocking, fingerprint hiding) - uploads/.htaccess rules you turn on are written as marked blocks and removed on deactivation; rules for the site-root .htaccess are shown for you to copy into that file yourself (the plugin does not edit it); brute-force lockout; comment spam blocking
* Cloudflare: trusts CF-Connecting-IP from Cloudflare's own ranges only; never contacts Cloudflare

= Backup & restore =
* Full backup (files+db, pure-PHP zip, no shell exec; files over 100 MB are stored uncompressed in their own archive part; a database copy over 100 MB also gets its own part); one-click restore incl. encrypted backups (DB copy not auto-imported)
* Keeps 10 most recent local backups, auto-prunes older; adaptive engine; optional WP-CLI backup support
* A restore that fails, is refused by its integrity check, stops before finishing, or may not have applied the whole backup is e-mailed to the Alert Email under Settings -> General -> Notifications (the site administrator's address when none is set), whatever the Email Notifications switch says; the e-mail carries the site name and address, the backup file or set name, an attempt id, an error code and counts where they apply, and up to three recent log lines of the same kind with recognised paths and system details removed
* A failed backup is e-mailed to the same address, whatever the Email Notifications switch says (the same problem at most once an hour, at most five backup and security alert e-mails a day); it carries the site name and address, the time, the reason and up to three recent log lines of the same kind with recognised paths and system details removed. Until the next good backup (or until you dismiss it), a notice on the Dashboard and the plugin screen shows the failure; a reminder appears there when the last backup is old (snooze 7 days)

Backups can fail for reasons outside this plugin's control, for example a full disk, a server time or memory limit, a file that cannot be read, or a hosting restriction. This alert helps you notice a failure early; it cannot guarantee that every backup succeeds. Keep a copy of important backups somewhere other than this server.

= SEO =
* On-page SEO audit/score, local; optional output (off by default): meta/OG/JSON-LD, page title on key pages; defers to major SEO plugins
* XML sitemap, custom post types; optional /llms.txt, off by default

= Maintenance =
* Database maintenance - clear transients, delete stale content, remove orphaned metadata, optimize/drop orphaned tables (confirmed, previews first)

= SwissSuite AI Plus =

A separate plugin with AI-assisted security analysis and content tools, at https://swisswpsecure.com/products/.

= Privacy & Data =

No phone-home/telemetry/account required; runs locally. Only WordPress.org is contacted (see External Services). Auto-updates use WordPress core's own toggle only. A failed backup and a failed or partial restore are e-mailed to your own alert address by your site's own mail function (or the SMTP server you configured); nothing is sent to us. Firewall/failed-login log (IPs) kept locally 90 days. Deleting the plugin removes settings, tables and uploads data - download first. While another copy of this plugin is still installed, that data is kept. Details: see our Privacy Policy.

= Support =

For help with this plugin, write to support@swisswpsecure.com.

== Source Code ==

SwissSuite Security Backup and SEO is released under the GPLv2 (or later). The complete, uncompiled, human-readable source of the React/TypeScript admin UI, with the build scripts for the distributed JS/CSS, is published at:

https://github.com/Gfellerman/SwisswpSuite_Public/tree/main/plugin-src

Build instructions for regenerating the compiled assets are in that directory's BUILDING.md.

= Third-party libraries =

The admin interface compiles these open-source libraries into its JavaScript (name, version, SPDX identifier): lucide-react 1.65.0 (ISC); react-router 7.18.5 (MIT); @tanstack/react-query and @tanstack/query-core 5.105.0 (MIT); zustand 5.0.16 (MIT); tailwind-merge 3.7.0 (MIT); clsx 2.1.1 (MIT); recharts 3.10.1 (MIT) with @reduxjs/toolkit 2.13.0, react-redux 9.3.1, redux 5.0.1, redux-thunk 3.1.0, reselect 5.3.0, immer 11.2.9, es-toolkit 1.53.0, eventemitter3 5.0.4 and decimal.js-light 2.5.1 (all MIT), and d3-array 3.2.4, d3-color 3.1.0, d3-format 3.1.2, d3-interpolate 3.0.1, d3-path 3.1.0, d3-scale 4.0.2, d3-shape 3.2.0, d3-time 3.1.0, d3-time-format 4.1.0 and internmap 2.0.3 (all ISC); plus a short adaptation of use-sync-external-store (MIT). React and ReactDOM are not included: the plugin uses the copies WordPress loads. react-router stays on 7.18.5, the newest 7.x release, because 8.x requires React 19.2.7 or newer and WordPress loads React 18. Each library's notice: https://github.com/Gfellerman/SwisswpSuite_Public/blob/main/THIRD-PARTY-LICENSES.md

== External Services ==

This plugin's code can connect to the service listed below and to nothing else. Optionally, if you enter the credentials of your own SMTP server under Settings -> General -> Email Delivery (SMTP), every e-mail WordPress sends from this site (this plugin's reports and alerts, password resets, other plugins' mail) is handed to that server instead of PHP mail(), with the sender name and address you configure; that server is one you choose, and the plugin transmits to it only those e-mails and the credentials you entered. Its local features (malware scan, backup, restore, quarantine, on-page SEO audit, sitemap) run entirely on your own server and do not use it. This plugin does not phone home to any server operated by its developer, does not require an account or a key of any kind, and sends site content or visitor data only in your site's own e-mail.

= WordPress.org APIs =
Host: api.wordpress.org
Used for: (1) core file checksum verification, to detect modified/infected core files; (2) standard plugin update checks, performed by WordPress itself; (3) a daily check of installed plugins against the WordPress.org directory, warning if one was closed or removed (often a sign of an unpatched or compromised plugin).
Data sent: your WordPress version and site locale (checksum requests and the closed-plugin check), and your installed plugin slugs (update checks, closed-plugin check). No personal data, file contents, or site content is sent. WordPress also sends your site's address in the request header, as it does for its own update checks.
When contacted: (1) once per day in the background, only after you choose Yes when the plugin asks on its own screen, or switch on Settings > Security > Scan Coverage -> "WordPress Core Integrity Check". (2) runs whenever WordPress checks for plugin updates - standard WordPress behavior, not specific to this plugin. (3) once per day in the background, and immediately if you click "Re-check now" on the Closed / Abandoned Plugins panel, only after you choose Yes when the plugin asks on its own screen, or switch on Settings > Security > Scan Coverage -> "Abandoned Plugin Detection"; can be turned off there.
Privacy Policy (it covers api.wordpress.org): https://wordpress.org/about/privacy/

For full details on what data is transmitted and your rights, see our Privacy Policy at https://swisswpsecure.com/privacy.

== Changelog ==

= 2.9.33.69 =
* Added: An e-mail and a notice when a backup fails, with the reason and how to try again.
* Added: A reminder on the Dashboard and the plugin screen when no backup has been made for 7 days or more.
* Fixed: A restore that could not write all its files is now reported as failed, not as successful.
* Fixed: Each backup file is checked right after it is written; a damaged file stops the backup instead of being kept.
* Fixed: When the hosting storage is full, a backup now stops at once and removes its temporary files.
* Fixed: Files left over by an interrupted restore are removed once the restore has clearly stopped.
* Fixed: Plugins that WordPress.org did not answer for are shown as not checked, and a firewall in Detection Only Mode no longer counts as active.
* Changed: The diagnostics export includes the last 100 log lines, with recognised personal data removed.
* Changed: Less background work while no backup is running.

= 2.9.33.68 =
* Changed: lucide-react, TanStack Query, zustand, immer and reselect, built into the admin interface, are updated to their newest releases.
