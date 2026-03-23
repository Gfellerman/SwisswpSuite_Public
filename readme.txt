=== SwissWPSuite ===
Contributors: swisswpsecure
Tags: security, backup, seo, ai, malware scanner, firewall, two-factor authentication, migration, sync
Requires at least: 5.6
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 2.9.15.0
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

See the full Privacy Policy at: https://swisswpsuite.ai/privacy-policy
