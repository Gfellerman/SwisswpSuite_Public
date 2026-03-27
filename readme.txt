=== SwissWPSuite ===
Contributors: swisswpsecure
Tags: security, backup, seo, ai, malware scanner, firewall, two-factor authentication, migration, sync
Requires at least: 5.6
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 2.9.20.7
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

The Ultimate All-in-One WordPress Plugin. Security, SEO, Backup, Migration, and AI Content — Powered by Groq AI.

== Description ==

SwissWPSuite is a comprehensive WordPress toolkit that combines Security, Backup, SEO, Migration, and AI Content tools into a single, high-performance plugin.

= Sentinel Security =
* AI-powered malware scanning with 38+ detection patterns
* Web Application Firewall (WAF) with IP reputation and rate limiting
* 11 one-click hardening options (XML-RPC, file editing, user enumeration, and more)
* Two-Factor Authentication (TOTP) for all user roles
* Geo-blocking with country-level access control
* Real-time security monitoring and email alerts

= Backup Fortress =
* Full site backups with hybrid zip engine (system zip + PHP fallback)
* Cloud storage: AWS S3 and Google Drive
* Scheduled backups with auto-pruning
* One-click restore

= Sync Teleport =
* Site-to-site content synchronization
* HMAC-signed encrypted transport
* Smart diff comparison before syncing
* Push products, posts, and media between staging and production

= Migration Station =
* Mode A: Plugin-to-plugin site migration
* Mode B: Standalone receiver for empty/broken destinations
* Serialization-safe domain replacement
* Chunked transfer for shared hosting compatibility

= AI SEO & Content =
* Bulk meta optimization with AI suggestions
* AI content rewriting and enhancement
* Vision AI for automatic alt text generation
* llms.txt generator for AI crawler context

= Licensing =
The core plugin is free with basic security scanning. Premium tiers unlock advanced features:
* **Free** — Daily auto-scan, basic threat blocking, 5 hardening options
* **Security** — Full WAF, deep AI audit, unlimited scans, 11 hardening options
* **Content SEO** — AI meta optimization, Vision AI
* **Enhancer** — AI content rewriter, tone customization
* **Backup** — Cloud backups, site sync, migration
* **Full Suite** — All features unlocked

== Installation ==

1. Download the latest release zip from the Releases page.
2. In WordPress Admin, go to Plugins > Add New > Upload Plugin.
3. Upload the zip file and click Install Now.
4. Activate the plugin.
5. Navigate to SwissWPSuite > License & Tokens and enter your License Key.

= Minimum Requirements =
* WordPress 5.6 or higher
* PHP 7.4 or higher
* HTTPS recommended for security features

== Frequently Asked Questions ==

= Is this plugin free? =
Yes. The core security scanner and 5 hardening options are completely free. Premium features require a license key.

= What AI provider does this use? =
SwissWPSuite uses Groq AI (via our secure proxy at swisswpsecure.com). No API keys from third-party AI providers are required.

= Does this plugin send data externally? =
Only when you initiate an action that requires it (AI analysis, license validation, Sentinel L2 scanning). No background telemetry or tracking. See our Privacy Policy for details.

= Is it compatible with my hosting provider? =
SwissWPSuite is designed and tested for shared hosting environments including Hostinger, SiteGround, and similar LiteSpeed/Apache hosts. It respects memory limits, execution timeouts, and output buffering constraints.

= Can I use this on multiple sites? =
Each license key is locked to one domain. Contact support for multi-site licensing.

== Changelog ==

See [CHANGELOG.md](CHANGELOG.md) for the full version history.

= 2.9.20.7 =
* Improved: 2FA now shows site domain in authenticator app instead of email — distinguishes multiple sites
* Improved: "Set up 2FA" link added to Security Hub Login Safeguard card
* Improved: Settings page supports direct tab linking via URL parameter

= 2.9.20.6 =
* Fixed: 2FA QR code now uses proven qrcode.react library — reliably scannable by all authenticator apps

= 2.9.20.5 =
* Fixed: 2FA QR code spec tables corrected — all versions had wrong data codeword counts and block structures

= 2.9.20.4 =
* Fixed: 2FA QR codes now scannable — added missing alignment patterns, fixed data interleaving, corrected character count
* Fixed: 2FA QR code display enlarged from 160px to 200px for easier scanning
* Improved: Cloud storage provider reliability (B2, Dropbox, FTP, GDrive, S3)
* Improved: New tick-based backup engine with better scheduling
* Improved: Refreshed Cloud Storage, License Manager, and Backup UI panels

= 2.9.20.2 =
* Fixed: Cloudflare 524 timeout no longer kills backup process (ignore_user_abort)
* Fixed: Sentinel heartbeat timeout increased to 10 min for large archives
* Fixed: Archiver now excludes LiteSpeed cache, upgrade files, debug.log — smaller backups

= 2.9.20.1 =
* Fixed: Sentinel now syncs failure status to automation records — no more permanent "running" zombies
* Fixed: Stale-running watchdog auto-resets automations stuck over 2 hours
* Fixed: Cancel button now available for automation backups
* Fixed: Manual and automation backup retention enforced on list load

= 2.9.20.0 =
* Cloud Backup: cURL timeouts on all upload methods across all 5 cloud providers — prevents hangs
* Cloud Backup: Improved retry logic for S3, B2, Dropbox, and FTP with exponential backoff
* Cloud Backup: Real error messages from cloud providers shown in automation status
* Cloud Backup: Sentinel heartbeats during uploads — no more false stuck-job kills
* Cloud Backup: Circuit breaker stops endless restart loops (3 strikes)
* Cloud Backup: Cancel button works during cloud upload with server-side cleanup
* Cloud Backup: Orphan file detection and one-click cleanup
* Cloud Backup: Backup list shows storage location (Local, Google Drive, S3, etc.)

= 2.9.19.0 =
* Cloud Backup: One-click Google Drive connection — no Google OAuth app setup needed
* Cloud Backup: Dropbox one-click connection ready (pending Dropbox production approval)
* Cloud Backup: VPS OAuth proxy auto-detection for fresh installs
* Cloud Backup: Fixed self-hosted OAuth redirects to correct admin page
* Cloud Backup: Self-hosted flow now explicitly stores connection mode

= 2.9.18.0 =
* Firewall: New command injection, XXE injection, and encoding bypass protection (Pro)
* Firewall: XML-RPC brute force amplification blocking (Pro)
* Firewall: Improved path traversal protection with advanced encoding detection (all tiers)
* Firewall: Fixed a bypass vulnerability and improved simulation mode reliability
* Stronger site identity verification with automatic migration for existing sites
* Security scanner: WordPress version alerts, PHP security checks, vulnerable plugin detection
* Improved reliability of firewall checks on JSON API requests

= 2.9.17.0 =
* AI features hardened with request validation and rate limiting
* HTTPS enforcement strengthened with HSTS preload
* Improved SSRF protection including IPv6 addresses
* Payment warning banner when payment issues detected
* Sensitive credentials fully masked in all logs
* Improved payment event reliability

= 2.9.16.0 =
* License lifecycle hardening — atomic domain locking, subscription-scoped billing, payment failure handling
* Cancel subscription button now works from the plugin settings
* Domain lock is released when deactivating the plugin, allowing reactivation on a new site
* Token stacking for multi-module subscriptions — each module adds its own token allocation
* Trial abuse prevention improved with email-based deduplication
* Expiry logic fixed for yearly plans that converted from trial

= 2.9.15.0 =
* Migration engine rewrite — improved reliability and data integrity during site transfers
* Better compatibility with shared hosting environments (large database support)
* Major security hardening: 13 vulnerabilities fixed from professional penetration testing
* 6 stability fixes for edge cases during plugin startup
* 11 hardening options (5 free + 6 pro) with plain English descriptions
* Smart email alerts — only actionable threats trigger notifications
* Confirmation dialogs for high-risk hardening options

= 2.9.12.0 =
* Mode B migration: migrate to empty or broken destinations without needing the plugin pre-installed
* Secure authentication for migration receiver
* Automatic WordPress core installation on bare servers
* Reliable large database transfers via chunked downloads

= 2.9.7.70 =
* Mode A migration confirmed working
* Serialization-safe search-replace

== Upgrade Notice ==

= 2.9.15.0 =
Major migration engine rewrite + security hardening. Recommended update for all users.

== Privacy ==

SwissWPSuite connects to external services only when explicitly triggered by user action:
* **SwissWPSecure API** (swisswpsecure.com) — License validation, AI proxy, Sentinel L2 scanning
* **Groq AI** (via SwissWPSecure proxy) — AI content generation, malware analysis

No background telemetry, no tracking, no data collection without user action.

See the full Privacy Policy at: https://www.swisswpsecure.com/privacy-policy
