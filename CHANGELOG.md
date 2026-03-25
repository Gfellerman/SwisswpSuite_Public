# SwissWPSuite — Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/) with a 4-segment scheme: `MAJOR.MINOR.SPRINT.HOTFIX`.

---

## [2.9.18.0] - 2026-03-25

### Security
- Firewall: New command injection protection — detects and blocks OS shell command attempts in form submissions and API requests (Pro).
- Firewall: New XXE (XML External Entity) injection protection — prevents attackers from exploiting XML parsers to read server files (Pro).
- Firewall: New encoding detection layer — catches attack payloads hidden behind Base64 encoding (Pro).
- Firewall: XML-RPC brute force amplification blocking — prevents batched login attacks via XML-RPC (Pro).
- Firewall: Improved path traversal protection — blocks advanced encoded directory traversal attempts used to access files outside the web root (all tiers).
- Firewall: Protection against WordPress Interactivity API XSS attacks introduced in WordPress 6.5+ (Pro).
- Firewall: Simulation mode improved — test mode no longer accidentally triggers IP bans.
- Firewall: Fixed a bypass vulnerability that could allow attackers to disable firewall checks on specific requests.
- Site identity verification upgraded to use stronger hashing — existing sites are upgraded automatically.

### Added
- Security scanner now flags outdated WordPress versions with severity-based alerts.
- Security scanner now checks your PHP version for XML-related security risks.
- Security scanner now detects known-vulnerable plugins installed on your site and recommends action.

### Fixed
- Improved reliability of firewall checks on JSON API requests.
- Fixed edge cases where certain attack patterns with extra whitespace could bypass detection.

---

## [2.9.17.0] - 2026-03-24

### Security
- AI features hardened — request validation and rate limiting prevent abuse of AI-powered tools.
- HTTPS enforcement strengthened with HSTS preload support.
- Improved protection against server-side request forgery (SSRF) including IPv6 address validation.
- License feature verification upgraded to prevent tier escalation.
- Sensitive credentials are now fully masked in all server logs.
- Payment webhook reliability improved with automatic retry for failed events.
- Graceful server restarts — in-progress AI requests complete before shutdown to prevent token loss.

### Added
- Payment warning banner — amber notification appears when a payment issue is detected, with a direct link to update your payment method.
- Improved payment event tracking for better reliability.

### Fixed
- Trial period can no longer be extended by re-activating a license.
- Token usage correctly blocked when payment is overdue.
- Improved plan tier consistency across all features.

---

## [2.9.16.0] - 2026-03-24

### Fixed
- License activation is now more reliable when multiple requests happen simultaneously.
- Yearly plans that converted from a trial no longer incorrectly expire.
- Site identity verification now persists correctly across daily license checks.
- Token renewal now correctly matches the right subscription when multiple plans exist.
- Cancel subscription button now works correctly from the plugin settings page.

### Added
- Deactivating the plugin now releases the domain lock, allowing you to move your license to a new site.
- Automatic downgrade to free tier when a payment fails — with clear notification to update your payment method.
- Multiple module token stacking — users with Security + SEO get combined token allocations.
- Improved trial abuse detection.

### Security
- License activation hardened against race conditions.
- Plan tier validation prevents unauthorized feature access.

---

## [2.9.15.0] - 2026-03-21

### Changed
- **Migration engine rewrite:** Improved domain replacement engine eliminates data corruption during site migration.
- Scheme-aware 4-entry replacement map handles http/https variants automatically.
- Dynamic memory threshold replaces the old 1MB hard limit for serialized data processing.

### Fixed
- Large database imports now work reliably on shared hosting with strict size limits.
- Improved domain replacement accuracy for Mode B migrations.
- Permalinks and cache are automatically refreshed after migration completes.

### Security
- Major security hardening: 13 vulnerability fixes identified by professional penetration testing.
- 6 stability fixes for edge cases during plugin startup.
- 3 new hardening options: block user enumeration (Free), disable public WP-Cron (Pro), Content Security Policy (Pro).
- Expanded security headers: Permissions-Policy (8 directives), COOP, CORP, CSP-Report-Only.
- REST API whitelist tightened.
- Smart email alerts — only actionable threats (malware, brute force, integrity, license, backup failure) trigger notifications.

### Added
- 11 total hardening options (5 essential free + 6 advanced pro).
- Confirmation dialogs for dangerous hardening toggles.
- Runtime conflict monitor for security plugin compatibility.
- UX redesign: plain English descriptions, 3-tier layout, risk-colored badges.

---

## [2.9.12.0] - 2026-03-18

### Added
- **Mode B migration:** Standalone receiver for migrating to empty or broken destinations.
- HMAC dual-key authentication for receiver security.
- WP Core auto-install for bare servers (downloads from wordpress.org).
- Chunked SQL download with signed URLs.
- Improved database compatibility for MariaDB 10.6 hosts.
- Added database diagnostic tool for Mode B migration troubleshooting.

### Fixed
- Fixed firewall incorrectly blocking the plugin's own internal requests.
- Hardening toggle now shows a clear warning if server file changes cannot be applied.

---

## [2.9.7.70] - 2026-03-14

### Fixed
- Mode A migration confirmed working end-to-end.
- Serialization-safe search-replace verified.

---

## [2.9.6.2] - 2026-02-28

### Fixed
- TEST AI CONNECTION: "License Invalid" false failure resolved.

---

## [2.9.6.0] - 2026-02-28

### Added
- Improved security scanner with enhanced detection capabilities.
- Multiple detection accuracy fixes across all scanner modules.
- Free tier quota gate enforcement.

### Changed
- Upgraded AI models for faster and more accurate results across all AI features.

---

## [2.9.5.2] - 2026-02-27

### Added
- Expanded internal security testing capabilities.
- Improved vulnerability detection coverage.

---

## [2.9.4.1] - 2026-02-26

### Changed
- Restructured licensing tiers for clearer feature access.
- 55 quality improvements across all features.

---

## [2.9.3.0] - 2026-02-24

### Fixed
- Improved compatibility when switching between license tiers.
- Token balance now resets correctly on plan downgrade.
- AI Analyze button correctly restricted to Pro users.

---

## [2.9.2.8] - 2026-02-24

### Added
- Quarantine bulk action.
- AI Analysis modal.

---

## [2.9.2.7] - 2026-02-23

### Fixed
- Fixed dialog windows appearing behind other elements.
- Improved text readability in Bulk AI Report.
- Deep scan reliability improvements (timeout handling, error reporting).
- Fixed scanner getting stuck on large sites.

---

## [2.9.1.7] - 2026-02-21

### Added
- Tiered WAF (basic=free, advanced=Security/Full Suite).
- WAF tier messaging in Defense Hub.
- 2FA and hardening action buttons.

---

## [2.9.1.3] - 2026-02-20

### Added
- Comprehensive AI action buttons.
- Firewall Advisor rebuild.

### Fixed
- Log Advisor WAF button bans IP + refresh fix.
- Live security feature bug fixes (8 issues).

---

## [2.9.0.9] - 2026-02-19

### Security
- Security audit fixes and infrastructure hardening.

---

## [2.9.0.8] - 2026-02-18

### Added
- Additional security endpoints and infrastructure hardening.

---

## [2.9.0.1] - 2026-02-17

### Added
- First unified release build.

---

## [2.8.9.9] - 2026-02-17

### Added
- Initial release of SwissWPSuite.
