# SwissWPSuite — Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/) with a 4-segment scheme: `MAJOR.MINOR.SPRINT.HOTFIX`.

---

## [2.9.18.0] - 2026-03-25

### Security
- WAF: Command injection detection — 33 patterns covering shell builtins, interpreter invocations, subshell injection, and download-execute chains (Pro tier).
- WAF: XXE (XML External Entity) injection detection — 12 patterns with both single and double-quote SYSTEM variants (Pro tier).
- WAF: Base64 decode layer — single-pass decoder with 5-gate validation catches Base64-obfuscated attack payloads (Pro tier).
- WAF: XML-RPC `system.multicall` amplification detection — blocks batched brute force attacks (Pro tier).
- WAF: Path traversal hardening — double-decoded URI check plus 5 overlong UTF-8 and double-encoded bypass variants (all tiers).
- WAF: WordPress Interactivity API XSS — blocks `data-wp-bind` and related directive injection (Pro tier).
- WAF: Simulation mode no longer triggers IP bans via the reputation system.
- WAF: Namespace bypass hardened — `is_own_rest_namespace()` now uses `parse_url()` path-only parsing to prevent query string injection bypass.
- Identity hash upgraded from MD5 to SHA-256 with automatic migration for existing installations.

### Added
- Sentinel M4-A2: WordPress version security gate — flags outdated WordPress with severity-based alerts.
- Sentinel M4-A3: PHP XML entity loading check — flags PHP versions below 8.0 where XXE is enabled by default.
- Sentinel M4-D2: Known-vulnerable plugin detection — checks installed plugins against 5 known unpatched CVEs.

### Fixed
- `php://input` stream exhaustion — raw POST body now read once and cached, fixing silent bypass of XXE and multicall checks on JSON requests.
- Function-call whitespace bypass — `system (` (with space before paren) now detected alongside `system(`.

---

## [2.9.17.0] - 2026-03-24

### Security
- AI proxy payload scrubbing — `req.body` no longer forwarded raw to Groq. Allowlist-only parameters with `n:1` hardcoded to prevent cost amplification attacks.
- Per-license AI rate limiter: 30 requests/minute per license key (prevents scripted token drain).
- HTTPS enforcement middleware at application level (defense in depth behind Nginx).
- HSTS preload directive added to Helmet configuration.
- IPv6 SSRF protection in sync endpoint (`fd00::/8`, `fe80::/10`, IPv4-mapped addresses blocked).
- `getFeatures()` switched from substring matching to exact Set-based tier membership (prevents feature escalation via crafted tier names).
- Admin key removed from all request body and query string paths — header-only (`X-Admin-Key`) everywhere.
- All license keys masked in server logs (last 4 chars only — no full keys anywhere).
- Dead letter queue for failed Stripe webhooks — events saved for manual replay.
- Graceful SIGTERM shutdown — finishes in-flight AI requests before stopping (prevents token loss during deployments).

### Added
- Payment warning banner in plugin UI — amber notification when `past_due` status detected ("Payment failed — please update your payment method").
- `webhook_failures` table with unique event_id index for webhook replay capability.
- `warning` field added to TypeScript `LicenseStatus` interface.

### Fixed
- Trial window extension exploit closed — re-activating during a trial no longer resets the 30-minute countdown.
- Token reset blocked for `past_due` licenses — non-paying users no longer receive monthly token grants.
- Trial tiers stripped from modules array at runtime — prevents feature inflation from stale DB records.
- `SWS`, `SWISSWPSUITE`, `content_enhancer` aliases added to `isValidTier()` and `getMonthlyLimit()` for full tier consistency.

---

## [2.9.16.0] - 2026-03-24

### Fixed
- License domain lock now uses atomic CAS (compare-and-swap) to prevent race conditions during activation.
- Yearly plans that converted from trial no longer expire when the trial window closes — paid expiry date takes priority.
- Hard Identity Lock now persists across heartbeats — previously wiped on every daily check.
- Invoice token renewal now matches by subscription ID instead of customer ID, preventing tokens going to the wrong license.
- Cancel subscription button now works (previously called a non-existent endpoint with a masked key).

### Added
- `/release-domain` VPS endpoint — plugin deactivation releases the domain lock, allowing reactivation on a new site.
- `invoice.payment_failed` webhook handler — immediate downgrade to free tier on payment failure.
- Checkout upsert — duplicate Stripe checkouts update the existing license instead of creating orphaned records.
- Module token stacking — users with multiple modules (e.g., Security + SEO) get combined token allocations.
- Tier allowlist validation — user-supplied tier names are validated against known plans.
- Trial abuse detection expanded to check both domain and email.
- Stripe integration skill file for enhanced payment pipeline agent knowledge.

### Changed
- Token reset policy unified: SET (no rollover) across both heartbeat and webhook paths.
- Payment-pipeline agent enhanced with full Stripe subscription state machine knowledge.

### Security
- Atomic domain lock prevents concurrent activation race conditions.
- Tier validation prevents trial benefit escalation via crafted tier names.

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
- Sentinel Security Agent with Groq model strategy overhaul.
- Detection gap fixes: M1-M4 medium severity + H3 high severity findings.
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
