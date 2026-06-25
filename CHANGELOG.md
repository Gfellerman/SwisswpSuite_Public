# SwissSuite — Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/) with a 4-segment scheme: `MAJOR.MINOR.SPRINT.HOTFIX`.

## [2.9.30.132] - 2026-06-25

### Added
- **Cancel auto-renewal at period end (Feature A)** — each feature subscription on the License screen has a "Cancel renewal" / "Resume" control. Cancelling flips Stripe `cancel_at_period_end=true` on the resolved subscription (primary or per-feature), mirrors the flag onto all `feature_subscriptions` rows sharing that Stripe subscription plus the `licenses` row, and writes a `token_logs` audit entry (action `admin_adj`, amount 0). Access continues until `expires_at`; no renewal charge. New VPS route `POST /v1/license/cancel-subscription` (per-subscription granularity with a `SHARED_SUBSCRIPTION` confirmation guard + `NOT_STRIPE_MANAGED` handling); proxied by the nonce-auth WordPress route `POST /license/cancel-feature` (key resolved server-side). The `customer.subscription.updated` webhook now syncs `cancel_at_period_end` both ways (incl. Stripe-portal resume). Migration v23 adds the `cancel_at_period_end` boolean to `feature_subscriptions` and `licenses`.
- **Per-feature expiry countdown (Feature D)** — the `/check` heartbeat now returns `days_remaining` per feature; the UI shows a "days left" badge (yellow ≤14 days, red ≤3) and reads "Cancels on {date}" instead of "Renews on {date}" once auto-renewal is off.

## [2.9.30.131] - 2026-06-24

### Changed
- **Pooled token headline** — when a user owns more than one license, the main "Tokens Remaining" figure now shows the pooled `/license/portfolio` total across all their licenses, with the per-site spendable balance demoted to a clearly-labeled secondary line. Single-license users are unaffected. (`LicenseManager.tsx`)

### Fixed
- **Per-feature billing isolation (VPS webhooks)** — `handlePaymentFailed` and `handleSubscriptionCancelled` now flip the license-level status to `past_due`/`cancelled` only when ALL active feature subscriptions on that license are failing/cancelled; a single feature's failure marks only its own `feature_subscriptions` row. Falls back to legacy whole-license behavior for licenses with no feature rows (manual/legacy).
- **Per-feature token reset** — `handleInvoicePaid` computes the renewed token limit by summing over DISTINCT `stripe_subscription_id` (so a full-suite license sharing one subscription across four feature rows is not over-counted), SET-no-rollover; `licenses.expires_at` is now extend-only (never shortened by one feature's renewal).
- **Admin dashboard** — surfaces each license's owner name/email (resolved from the `users` row for Stripe-provisioned licenses) and a per-feature subscription breakdown (feature, status, expiry, token limit).

## [2.9.30.130] - 2026-06-24

### Added
- **Total available tokens across licenses** — a new "Total Across Licenses" view on the license screen sums your token balance over every active license on your account (rendered only when you hold more than one license). Backed by a new read-only VPS endpoint `POST /v1/license/portfolio` that groups licenses by account owner and returns masked keys plus an atomic SUM of balances and limits.

### Fixed
- **Revoked-license re-activation hole** — a license whose status was `cancelled`, `refunded`, `banned`, or `deleted` could be silently re-activated by the `/activate` endpoint. Such licenses are now rejected with a structured `LICENSE_CANCELLED` response (HTTP 200 so the plugin surfaces the real reason instead of a generic "server down").
- **Refund processing** — `charge.refunded` webhooks crashed because neither the `license_status` nor the `token_action` database enum contained the value `refunded`, so refunds silently failed and a refunded customer kept an active license. Both enums now include `refunded` (migration v22) and the refund handler correctly revokes the affected license.
- **Admin-created licenses** are now linked to their owner (`user_id`), so they group correctly into the new total-tokens view; existing admin licenses were backfilled.

## [2.9.30.129] - 2026-06-22

### Fixed
- Amazon S3 / S3-compatible cloud backups of files larger than 10 MB (the multipart-upload threshold) failed with HTTP 403 `SignatureDoesNotMatch`. The AWS Signature V4 canonical query string for the multipart-initiate request omitted the required trailing `=` on the valueless `uploads` parameter (signed `uploads` instead of `uploads=`), so the signature never matched. Small single-PUT uploads were unaffected, which is why it went unnoticed. Fix validated end-to-end against MinIO (13 MB multipart upload now succeeds). Same code path is used by all S3-compatible providers (Wasabi, DigitalOcean Spaces).

## [2.9.30.128] - 2026-06-22

### Fixed
- Cloud backup OAuth: connecting Google Drive or Dropbox failed with "Sorry, you are not allowed to access this page" after the user authorized access. The VPS OAuth proxy redirected back to the old admin menu slug (`swisswpsuite-ai`), which no longer exists after the v2.9.30.125 WordPress.org rename to `swisssuite-ai`; WordPress core denied access before the plugin's callback could run. The redirect (VPS-side) now uses the correct slug.

### Changed
- Extended the cloud-OAuth nonce transient lifetime from 30 to 60 minutes (Google Drive + Dropbox) so slower consent flows no longer expire mid-authorization.
- Removed the unused legacy `handle_oauth_callback` admin_init handler and its dead registration (it gated on a `state` value that is never set anywhere in the codebase). Corrected a stale docblock referencing the obsolete OAuth `state` literal. No user-facing behavior change.

## [2.9.30.127] - 2026-06-22

### Fixed
- WordPress.org readme compliance: corrected the readme.txt plugin name line to match the plugin header exactly (`=== SwissSuite AI ===`), clearing the `mismatched_plugin_name` and `trademarked_term` warnings.
- Trimmed the `== Changelog ==` section in readme.txt to the 5 most recent releases to stay under the WP.org 5000-character parser limit. The full release history remains in this CHANGELOG.md.

## [2.9.30.126] - 2026-06-22

### Fixed
- Bump "Tested up to" to WordPress 7.0 in plugin header and readme (clears `outdated_tested_upto_header` Plugin Check error).
- Add `phpcs:ignore` directive on `update-rollback.php:180` — writing to `WP_PLUGIN_DIR` is intentional for the plugin restore feature; suppression includes reviewer-facing justification comment.

## [2.9.30.125] - 2026-06-20

### Fixed
- Activating a second feature license key no longer hides other purchased features in the plugin UI. `get_status()` now merges active `feature_subscriptions` into the `capabilities` list, so SEO, Content Enhancer, Backup, and Security all remain visible regardless of which key is the active master key.

## [2.9.30.124] - 2026-06-20

### Added
- Option A per-feature licensing: each purchased feature (SEO, Backup, Security, Content) now has its own independent expiry date via a new `feature_subscriptions` table on the VPS licensing server.
- License Manager now displays per-feature subscription rows with individual expiry dates and an "↑ Annual" upgrade button for monthly tiers.
- New VPS endpoint `POST /v1/license/feature-upgrade` for pro-rata annual upgrades via Stripe proration.

### Fixed
- Activating a second feature license key no longer orphans previously purchased features. The activate handler consolidates all `feature_subscriptions` from prior licenses under the new active key.
- License Manager UI: "Change License Key" input is now visible by default when a license is active (was collapsed behind a low-emphasis text link).
- PHP `has_capability()` now gates per-feature expiry independently — SEO expiring does not affect Backup access.

## [2.9.30.123] - 2026-06-18

### Changed
- Rebranded all visible UI strings from "SwissWPSuite" to "SwissSuite" throughout the admin interface (admin notices, page titles, labels, i18n strings, React components). Functional identifiers — HTTP headers (`X-SwissWPSuite-*`), PHP class names (`SwissWPSuite_*`), option keys (`swisswpsuite_*`), and the `.htaccess` marker — are unchanged. No functional change.

## [2.9.30.122] - 2026-06-18

### Changed
- **Plugin rename for WordPress.org compliance:** the plugin display name is now **SwissSuite AI** and the slug/text-domain is **swisssuite-ai** (previously "SwissSuite AI" / `swisssuite-ai`). The WordPress.org directory prohibits the restricted term "wp" in plugin names and slugs. This is a branding/identity change only — **all option keys, license data, REST endpoints, cron hooks, and stored settings are unchanged**, so existing installs upgrade in place with zero data loss.
- **Minimum WordPress version raised to 6.2** (from 5.6), enabling native use of the `%i` table-name placeholder and block-theme APIs.

### Fixed
- **WordPress.org Plugin Check errors cleared:**
  - Removed developer/CI shell scripts (`bin/`) from the distributed zip (`application_detected`).
  - Shipped `readme.txt` at the package root (`no_plugin_readme`).
  - The backup migration receiver template is now packaged as a non-PHP asset so it is no longer parsed as plugin code (`missing_direct_file_access_protection` + global-prefix warnings).
  - Forward-compatible WordPress 6.9/7.0 API calls (Abilities API, AI Client, connectors) are invoked via dynamic dispatch behind their existing runtime guards, so the minimum-version sniff passes.
  - Debug and fatal-boot logs now write to the uploads directory (with index.php + .htaccess protection) instead of the plugin folder or `wp-content` root (`PluginDirectoryWrite`).

## [2.9.30.121] - 2026-06-18

### Changed
- **Entitlement gating — deep-malware scan:** the Layer-2 AI malware scan now requires the **Security** or **Suite** plan (previously any paid plan). SEO / Content / Backup plans run the free Layer-1 heuristic scan. Enforced on both the frontend (deep-malware `ScanCard` locked unless `waf` capability) and the backend (`$include_layer2` gated on `check_capability('waf')`). Malware quarantine and file deletion remain available to all paid plans (`sentinel_pro`).
- **Token-drain prevention — automatic Sentinel audit:** the scheduled 24-hour audit (`run_scheduled_audit()` → `perform_deep_audit(false)`) no longer triggers AI token consumption on any plan. It runs a local check and emails a report. Token-consuming AI deep analysis is now manual-only. This prevents a higher-token plan (e.g. 2.5M tokens) from being silently drained by the daily cron.
- **Update Guard / login-protection / IP management / geo / AI-log endpoints** now require the `waf` capability (Security/Suite), aligning the backend gates with the frontend tab gating.

### Fixed
- **Stripe plan resolution:** checkout now resolves the purchased plan durably from the Stripe price ID (`PRICE_ID_TO_PLAN` map → `planForPriceId()`) instead of defaulting every payment to `PAID_YEARLY` when `plan_type` metadata is absent. Confirmed live where a $4.99 SEO purchase had activated the yearly plan.
- **VPS paid-tier check:** `scan_batch.js` and `api_new.js` now use `PlanService.isPaidTier()` instead of the brittle `tier !== "pro"` string comparison.

## [2.9.30.120] - 2026-06-18

### Refactored
- **TD-1 (partial):** Extracted the inline `quarantine` tab JSX (4 sub-tables, ~400 lines) from `SecurityHub.tsx` into a new `QuarantineTab` organism at `plugin/src/components/organisms/Security/QuarantineTab.tsx`. The tab is now a controlled component (props-based) so the parent retains state ownership during the incremental migration. Net: 78 added, 402 deleted = 324-line reduction in `SecurityHub.tsx`. File is now 5,977 lines (was 6,010).
- **TD-1 (partial):** Added three new Zustand stores under `plugin/src/store/` to centralise cross-tab state:
  - `useSecurityStateStore` — banned / allowed IPs, quarantined files, ignored paths / findings, geo settings, hardening options cache.
  - `useLicenseStore` — sentinel credits, identity check, derived `hasSentinelPro` / `hasSecurity` / `currentTier`, PHP-injected `hasAdvancedWaf` + `homeUrl`.
  - `useUiStore` — `activeTab`, confirm dialog, advisor modals, M5 consent, AI elapsed counter.
- **TD-1 (partial):** Added two custom hooks under `plugin/src/hooks/`:
  - `useQuarantine` — `banIp` / `unbanIp` / `allowIp` / `removeAllowedIp` / `restoreQuarantine` / `deleteQuarantine` / `unIgnore` + matching `refresh*` functions. All mutations invalidate the `["security-banned-ips"]` query.
  - `useHardening` — `refreshHardening` / `toggleOption` (with optimistic update) / `applyAll` (gated on confirm dialog).
- **TD-1 (infrastructure):** Fixed the broken root `vitest.config.ts` — `setupFiles` now points at the existing `plugin/tests/setup.ts` and adds a `@` → `plugin/src` alias. The pre-existing `Welcome.test.tsx` was failing to load with "Cannot find module /tests/setup.ts"; the path mismatch had been silently broken since the plugin layout changed.

### Added
- **Vitest unit tests for the new stores** (28 tests, all passing):
  - `plugin/tests/Unit/useSecurityStateStore.test.ts` (11 tests) — IP / quarantine / geo / hardening setters, optimistic toggle, no-op on unknown key.
  - `plugin/tests/Unit/useUiStore.test.ts` (7 tests) — all 7 tab transitions, confirm-dialog lifecycle, AI elapsed counter, modal independence.
  - `plugin/tests/Unit/useLicenseStore.test.ts` (9 tests) — derives `hasSentinelPro` from both credits + PHP `sentinelIsPro` flag, `hasSecurity` from `waf` capability, `currentTier` none/free/pro transition.
  - `useSecurityStateStore` test caught a real bug on first run — `initFromWindow` did not read the `sentinelIsPro` PHP flag, so the initial `hasSentinelPro` was `false` even on a paid site. Fixed before commit.

### Notes
- **TD-1 NOT complete:** `SecurityHub.tsx` is still 5,977 lines (target was ≤500). The new stores + hooks are present and tested, but `SecurityHub.tsx` has not yet been rewired to consume them — that is the next sub-task. File is unchanged in behavior; the new `QuarantineTab` organism is a controlled component so all existing state + handlers continue to flow through SecurityHub unchanged.
- **Manual 100%-deep-test of 6 tabs NOT performed** in this session. Requires a running WordPress with the plugin deployed and a browser connected via Playwright/CDP. Will be performed as a follow-up task after the wiring refactor.
- **Pre-existing PHPUnit failures** (`BackupDomainReplacementTest` × 3 — `Call to undefined method SwissWPSuite_Archiver::upgrade_htaccess_if_weak()`) are unrelated to this change. They predate the TD-1 work and remain in the codebase. The 135 other tests pass.
- **Build verified:** `npx vite build` succeeds (2456 modules transformed, SecurityPage chunk 225 kB).
- **TypeScript clean:** `npx tsc --noEmit` exit 0.
- **Vitest:** 28/28 pass across 4 test files.

### Regression baselines
- RB-545: SECURITY-STATE-STORE-DEFAULTS
- RB-546: SECURITY-STATE-STORE-OPTIMISTIC-TOGGLE
- RB-547: UI-STORE-TAB-TRANSITIONS
- RB-548: LICENSE-STORE-DERIVES-FROM-PHP-FLAG
- RB-549: LICENSE-STORE-CAPABILITY-GATE
- RB-550: VITEST-SETUP-PATH-FIX

## [2.9.30.119] - 2026-06-18

### Fixed
- **Stripe + Licensing sprint — entitlement gates now respect paid-tier, payment-failed, and trial-then-paid states.** Three bugs in the licensing state machine were bundled into a single fix so they could be validated against the same webhook flow:
  - **TD-VPS-STRIPE-001(b):** `/v1/scan/batch` now accepts `past_due` during the Stripe retry window. A subscriber whose card bounces for 1–3 days is no longer instantly 403'd on the scan route while other routes (AI, Sentinel) happily keep serving them. Matches the existing `ai.js` + `sentinel.js` `past_due` acceptance.
  - **TD-VPS-STRIPE-001(c):** `sentinel.js verifyLicense()` now checks the paid `expires_at` **before** `trial_ends_at`, and only falls through to `trial_ends_at` when `expires_at` is null. Previously a paid yearly plan that flowed through a 7-day Stripe trial window was denied Sentinel the moment the trial elapsed — even though the paid plan still had 358 days remaining.
  - **TD-VPS-STRIPE-001(a) baseline** (`scan_batch.js:237`) was already fixed in v2.9.30.118 via `PlanService.isPaidTier()` — no change required, RB-541/542 are the regression guard for (b)/(c).

- **TD-VPS-ALLOWLIST-001:** Dropped the never-implemented VPS `/v1/scan/allowlist` call from the Update Guard. The route returned 404 on every scan, producing noise in the diagnostics log with no functional value. `get_safe_slugs()` now uses the curated hardcoded fallback only (cached 1h via `set_transient` to keep transient-option reads low). The fallback is reviewed on every Update Guard release and only contains high-traffic, actively-maintained plugins — functionally equivalent to a hand-curated VPS endpoint, with no attack surface.

### Documented
- **TD-BACKUP-STALL-001 root cause:** 2026-06-13 sandbox-site backup stall (`bkeng_a81e7173`, last tick 4343s ago) traced to the v2.9.30.101-era `current_load_factor()` floor (0.40) under sustained node load ~45 on a CloudLinux LVE — combined with the v2.9.30.104-era scaled zombie threshold that held off auto-cancel for 72 min because the job's pre-stall `lines_scanned` metadata made it look "progressing". The AIMD ramp fix in v2.9.30.110 (RB-488) supersedes this whole class of stall by converging to a sustainable per-tick rate on overloaded hosts. Self-heal worked correctly; production tenants are protected. Full report at `.claude/audit-reports/backup-stall-investigation-2026-06-13.md`.

### Regression baselines
- RB-541: STRIPE-BATCH-ACCEPT-PAST-DUE
- RB-542: STRIPE-SENTINEL-EXPIRES-FIRST
- RB-543: ALLOWLIST-DROPPED-NO-VPS-CALL
- RB-544: ALLOWLIST-FALLBACK-CACHED

## [2.9.30.118] - 2026-06-18

### Fixed
- **License entitlement gating — modular plans no longer expose Security-plan features.** Separated the two security layers: *Sentinel* (deep malware scan + quarantine/delete) stays available to **any paid plan**, while *Fortress* security (WAF/firewall, geo-blocking, hardening, login protection, IP allow/block, AI security analysis, Update Guard) now requires the **Security or Suite plan**. Previously these gated on `sentinel_pro` (granted to every paid plan), so an SEO/Content/Backup customer saw and could attempt Fortress features. Now enforced consistently on the frontend (`hasSecurity` = the `waf` capability) and the backend (`has_capability('waf')` on the relevant REST routes + service layer). Deep scan and malware quarantine remain available to all paid plans.

### Security
- Added missing `waf` capability gates to the login-protection toggle and the IP allowlist/blocklist write endpoints (previously `manage_options`-only).

## [2.9.30.117] - 2026-06-15

### Changed
- **Admin SPA navigation performance (security-preserving).** Eliminated the per-tab API chatter and blocking VPS calls that made tab-to-tab navigation slow (the host/account was confirmed idle — this was purely the plugin's request pattern). Backend: the license re-check now runs **async** (`wp_schedule_single_event`) instead of a synchronous `wp_remote_post()` inside the request (removes a 0–15s page-load stall and the prior page-load-downgrade risk); the Sentinel free-quota VPS call is cached in a 1h transient; a consolidated `GET /security/sentinel/latest-scan` replaces a 2-hop request; the backup/migration `Pacer` now gates on per-process memory instead of `sys_getloadavg()` (meaningless on shared hosting). Frontend: Dashboard `/stats`, SecurityHub status reads, and SMTP settings move to cached `useQuery` with named TTLs (30–120s); the UpdateGuard poll drops from 30s to 5min; cloud-status stops refetching every visit. Security is **not** weakened — these are display-only reads, enforcement runs server-side, and every admin action invalidates its cache so changes reflect immediately. RB-526–531.

## [2.9.30.116] - 2026-06-13

### Fixed
- **Deep Malware Scan no longer intermittently times out on large sites / under heavy load.** The file-hashing and VPS cloud-verdict phases are now chunked across multiple poll cycles (≈1500 files hashed and 3 hash-batches looked up per step) instead of running all ~5000 files / ~10 batches in a single request. A single phase previously ran ~39s in one request, which the host's ~60s PHP/LiteSpeed kill could cut off under high load, leaving the scan in an error state. Each step is now capped to ~10–18s. The scan flow, results, and the fail-closed degradation handling are unchanged — it just completes reliably. (Internal: new `hashing_phase_tick()` / `vps_lookup_phase_tick()` with persisted offsets.)

## [2.9.30.115] - 2026-06-12

### Fixed
- **License panel is now resilient to transient connectivity blips.** A short server restart or a dropped status request no longer makes the license card flash "no license" / Free. The UI now retains the last-known-good license state while reconnecting (showing a quiet "Checking license status…" indicator) and only switches to an unlicensed state when the server explicitly returns one. No license was ever actually lost — this removes the misleading display.

## [2.9.30.114] - 2026-06-11

### Security
- **Malware signature scan is now fail-closed end-to-end.** The VPS signature-database endpoint no longer returns "clean" verdicts when its database query fails — files now come back as "unknown" and are checked by the local scanner instead. Degraded responses are never cached (server or plugin side).
- **Scan degradation is now visible.** If the signature database is unreachable or the free-plan rate limit is hit during a Deep Malware Scan, the result panel shows an amber "degraded" / "rate limited" status with a plain-English explanation instead of a misleading green "OK".
- **Hash verdict cache hardened.** The per-file verdict cache key now uses the full SHA-256 hash (previously truncated), eliminating a crafted-collision bypass window.
- **Transport hardening for hash lookups.** Redirects disabled and TLS verification made explicit on the signature-lookup call; off-allowlist API host overrides are logged.
- **Server-side hardening.** Free-tier rate limiting moved to Redis (survives restarts); false-positive reports now use an HMAC with a server secret instead of a hardcoded salt.

### Fixed
- Deep Malware Scan no longer re-scans the quarantine and Update Guard snapshot folders, so quarantined malware is not re-reported as an active threat on every scan.
- HTTP 403 from the signature service is now logged at warning level (previously hidden at debug level).

## [2.9.30.113] - 2026-06-05

### Fixed
- **Dashboard "Last Backup" now reflects manual backups, not just automations.** The dashboard stat previously read only the automation run records (`SwissWPSuite_Backup_Automations`), so a site whose backups were all triggered manually showed "Never" forever despite successful backups. The backup engine now persists a single source of truth — `swisswpsuite_last_successful_backup` (UTC `Y-m-d H:i:s`) — on every successful completion (manual OR automation), and the `/stats` endpoint reads that timestamp and takes the most-recent of it and any automation record. Note: the stat populates on the **next** successful backup after upgrading to this version — backups taken before 2.9.30.113 are not retroactively counted because the option did not exist when they ran.

## [2.9.30.112] - 2026-06-04

### Fixed
- **App no longer crashes (React error #185) when a backup finishes.** When a manual or automation backup reached a terminal state (complete/failed/cancelled), the React admin app could enter an infinite re-render loop and crash the whole page with "Maximum update depth exceeded". The cause: clearing the active job id re-enabled the active-jobs query, which returned the just-finished job from its stale cache (up to 5 min), causing the UI to re-adopt the completed job and re-trigger the terminal handler in a loop. The completion handlers now record each terminated job id in a ref and the rehydration effects skip any job already terminated this session, so stale cache can never re-adopt a finished job. Fixes the crash in both `BackupControl` (manual) and `BackupAutomationsPanel` (automation) progress paths.

## [2.9.30.111] - 2026-06-04

### Fixed
- **Deleting a backup now removes ALL parts of a multi-part archive and its cloud copy.** The legacy `/backup/local/delete` endpoint previously deleted exactly one file by filename, leaving the remaining parts (database, plugins, others, split chunks) on disk. The endpoint now resolves the clicked filename to its parent backup set via nonce matching and removes all associated files atomically — matching the behaviour of the set-row delete. Cloud copies (Google Drive, S3, etc.) are also deleted.
- **Silent file leak on missing-file entries eliminated.** When a recorded filename was absent on disk during set deletion (`delete_backup_set`), the file was silently skipped with no log entry and the set record was still removed — creating an orphaned file with no set record. Files absent on disk are now logged at INFO level via `SwissWPSuite_Diagnostics` and tracked in the skipped list, making record/disk mismatches visible to administrators.
- **Legacy flat-file delete row works correctly.** The flat-file row (rendered when `sets.length === 0`) now resolves to the parent set and deletes all parts. If no set record exists (genuine pre-sets legacy file), the original single-file fallback is retained.

### Added
- **Orphan cleanup is user-triggered and already present in the UI.** The existing "Clean Up" banner in the Backups panel uses `SwissWPSuite_Backup_Sets::find_orphans()` to identify loose ZIPs not tracked by any set record and unlinks them with NFS re-check. The backend path was already complete; this release improves the delete logic that feeds it.

## [2.9.30.110] - 2026-06-04

### Fixed
- **Self-drive loopback re-arms after every tick.** `handle_as_tick()` now calls `chain_next_tick()` so the non-blocking loopback continues firing tick-over-tick. Previously the loopback silently dropped after the first tick, reverting to Action Scheduler cadence (80–105 minute gaps on low-traffic sites).
- **Multi-job fanout — concurrent backups no longer starve.** When one job fires its self-drive loopback it now checks all other active engine jobs whose tick-lock is not fresh and fires a separate loopback for each, so concurrent backups advance in parallel rather than waiting for AS/cron.
- **Large-database backups no longer falsely flagged as stuck.** During `db_dump` the progress marker previously showed 0 (no files scanned/written yet), causing the Sentinel and watchdog to count 3 consecutive stuck cycles and trip the circuit breaker on an entirely healthy job. The marker now includes the filesize of the growing SQL dump file (in KiB) so a large DB dump is visible as live forward progress. Uses `clearstatcache()` before `filesize()` to bypass PHP's stat cache.
- **Upload retry counter now resets after each successful chunk.** `retry_count` previously accumulated across the entire multi-part upload — 10 transient network errors spread across thousands of chunks could exhaust `MAX_RETRIES` and fail an otherwise healthy upload. The counter now resets to 0 whenever a chunk delivers real forward progress (`bytes_uploaded` advances).
- **Orphaned temp directories from abandoned jobs are now cleaned.** Running/pending jobs older than 2 hours with no fresh tick-lock have their working temp directory swept on the next health-check cycle, preventing multi-GB accumulation from repeated stuck or killed jobs.
- **Dead Google Drive token cleared on auth error.** When the GDrive access and refresh tokens expire or are revoked, the stored credentials are now cleared immediately so the Drive connection indicator resets to "disconnected" and future backups do not die on the first upload chunk. Previously the stale token persisted and every subsequent cloud backup failed.

## [2.9.30.109] - 2026-06-03

### Fixed
- **Sentinel circuit breaker resets on engine forward progress.** Previously, 3 consecutive "stuck" detections (no heartbeat for 10 minutes) opened the circuit and permanently abandoned the job — even when the engine was still actively writing files (it just missed the heartbeat window, e.g. during a slow `ZipArchive::close()` on a 273k-file site under LOAD 27). The circuit breaker now reads the engine's monotonic forward-progress marker (files scanned + files written to archive) before counting a stuck cycle: if the marker advanced since the last resurrection, `stuck_count` resets to 0 and a pace reduction (AIMD ×0.70) is applied to the engine state instead of tripping the breaker. Only 3 stuck cycles with NO new progress ever opens the circuit.
- **Pace reduction applied on EVERY Sentinel stall detection (not just progressing jobs).** When the Sentinel watchdog detects a stalled job it now writes a reduced `ramp_factor` (one AIMD multiplicative-decrease step, ×0.70, floored at 0.40) to the live engine state option on every stall cycle — whether the job's progress marker advanced or not. This is the key "readjust pace until it succeeds" guarantee: a PHP-killed (zero-progress) tick is now re-kicked at a progressively smaller budget across the three resurrection attempts (1.0 → 0.70 → 0.49), maximizing the chance a tiny-budget tick writes at least one file and reaches a heartbeat before the circuit breaker can trip. Previously pace reduction fired only when progress had already advanced, so a wedged-at-current-budget tick was re-kicked three times at the same pace and then abandoned. The call no-ops safely when no live engine state matches (a genuinely-dead job), and the 3-strike circuit breaker remains the final backstop.
- **Exception retry loop recovers instead of failing for resumable phases.** A transient `Throwable` (disk I/O spike, LVE memory burst, momentary OOM) during `archive_scan` or `archive_chunk` — both of which maintain a saved manifest cursor position — now resets `retry_count`, applies an AIMD pace reduction, saves state, and yields for the next tick to retry at reduced pace. Hard failure is reserved for phases with no safe resume cursor (`init`, unknown phases). `MAX_RETRIES` raised from 3 → 10 to survive bursts of LVE jitter without hitting the terminal path.
- **`ZipArchive::close()` failures during tick yields now yield instead of failing.** The manifest byte offset is saved before `close()` is called. If `close()` fails (transient disk I/O spike), the engine now records the error, applies AIMD pace reduction, and returns so the next tick can re-open the part and retry from the saved offset. Previously these three code paths (time yield, safety yield, manifest-end close) all called `handle_phase_failure()` and terminated the job.
- **Partial ZIP move failures in `phase_complete` retry up to 3 times.** When `rename()`/`copy()` fails for some parts but not all (cross-device race, momentary I/O contention, permission hiccup), the engine stays in the `complete` phase and retries the failed parts on the next tick. Only after 3 consecutive failed retries does it hard-fail. ALL-parts-fail (backups directory unwritable) remains an immediate hard failure.

## [2.9.30.108] - 2026-06-02

### Fixed
- **Backups on quiet, low-traffic sites no longer stall and fail (the real backup fix).** The tick engine's primary driver (Action Scheduler) only drains its queue when `wp-cron.php` is hit by external traffic. On a low-traffic site this opened 80–105 minute gaps between ticks (proven from live production logs: an AS action enqueued at 14:14 did not execute until 15:59). During those gaps the zombie guard + Sentinel resurrection + 3-strike circuit breaker abandoned jobs whose resume cursor was still advancing. The engine now **self-drives**: `chain_next_tick()` fires a non-blocking loopback (`wp_remote_post` to the site's own REST URL — the same WP-core pattern wp-cron uses, no external service) immediately after enqueueing each AS tick, closing the cadence gap to ~1-3s. AS remains the reliability backstop; the per-job tick lock makes whichever request arrives second a no-op. Filterable off via `swisswpsuite_backup_self_drive_loopback` for hosts that genuinely cannot loopback.
- **Progress-aware watchdog re-kick budget.** Before reaping a delayed job, the watchdog in `discover_active_jobs()` now computes a monotonic forward-progress marker (files scanned via `archive_scan.partial_files` + files written via `archive_zips[].files_added`). If the marker has advanced since the last observation, the job is re-kicked via `chain_next_tick()` and its zombie clock reset — never reaped. A stalled-but-recent job is re-kicked up to `WATCHDOG_MAX_REKICKS` (3) times; only after that many consecutive no-progress re-kicks is it declared genuinely dead and cancelled. A fresh per-tick lock (≤300s) short-circuits the whole branch so an in-flight tick is never disturbed. Watchdog state (`watchdog_progress_marker`, `watchdog_rekick_count`) lives as sub-keys inside the existing per-job engine-state option — no new top-level option keys.

## [2.9.30.107] - 2026-06-02

### Performance
- **Empirical AIMD tick-safety ramp replaces node-loadavg throttle.** On CloudLinux/LVE shared hosting (Hostinger), `sys_getloadavg()` reflects the WHOLE physical node. At node load 40–52, the old logic floored the tick wall-budget to 40% of nominal even when the tenant's own container had >90% CPU headroom — resulting in ~25 files/tick on a site capable of thousands. The new `ramp_factor` (persisted in job state) starts at 1.0 on tick 1 (optimistic: full budget) and self-corrects per-tick using AIMD: additive increase (+0.10) on every clean tick, multiplicative decrease (×0.70) when the previous tick was detected as PHP-killed. It converges to the highest rate the container can actually sustain.
- **CloudLinux/LVE per-tenant cgroup detection.** Pure-PHP, read-only probe of `/sys/fs/cgroup/cpuacct/cpuacct.usage` (cgroup v1) and `/proc/self/cgroup` / `/sys/fs/cgroup/cpu.stat` (cgroup v2 + LVE). When a per-tenant signal is detected, the node-loadavg advisory dampening of the additive ramp step is suppressed entirely — the tenant's real container headroom drives the ramp, not noisy-neighbour node load.

### Added
- **`budget_factor` in backup status response.** The `progress` object in `GET /backup/engine/status` now includes a `budget_factor` field (float, 0.40–1.0) showing the current AIMD ramp multiplier. `1.0` means full budget; values below `1.0` indicate the ramp is backed off due to detected PHP kills. Enables real-time visibility that the engine is running at full speed.

## [2.9.30.106] - 2026-06-02

### Performance
- **Proportional yield threshold.** Under high server load (LOAD 40–52, 30s PHP exec cap, `shared_overloaded` tier) the backup archive loop now processes ~150–200 files per tick instead of ~25. The yield guard was using a fixed 10-second threshold designed for a 20–25s budget; on a host with a 3.2s effective budget after load-shrinkage this was always tripped at the very first 25-file check. The threshold is now proportional to the actual available budget (`max(1.5s, budget × 20%)`), letting the tick use ~80% of its time window before yielding.
- **Skip compression for incompressible media types.** JPG, PNG, WebP, MP4, MOV, GIF, ZIP, GZ, WOFF2, and 30+ other already-compressed extensions are now stored (STORE method) instead of deflated. On a media-heavy WooCommerce store this cuts per-file CPU substantially — deflating incompressible bytes was adding ~1s/file overhead with ~0% size reduction. Guarded by `method_exists` for old libzip compatibility.
- **Continuous ticking on WooCommerce sites.** The every-minute in-process cron now immediately enqueues the next Action Scheduler tick after completing work, eliminating the ~30s idle gap between ticks. The every-minute cron remains as a safety net on non-AS sites.

### Fixed
- **bytes_done and ETA stuck at 0/null throughout archive phase.** `update_progress()` was only updating `percent` and `phase_label`. `bytes_done`, `bytes_total`, and `eta_seconds` in the progress payload are now computed and updated on every progress call during `archive_chunk`. Live `files_per_sec` throughput rate is also surfaced in the status response.
- **Cancel endpoint is now job-scoped (Wave 4).** The REST cancel endpoint now calls `engine->cancel($job_id)` to write the per-job scoped flag, matching the engine's own scoped-cancel implementation added in v2.9.30.105. Requires `job_id` in the request body; falls back to the legacy global flag when absent.

### Added
- **Per-tick byte budget.** Ticks now also yield when 300MB of uncompressed data has been added, preventing a tick dominated by large files (video, RAW) from blowing the PHP memory allocation before the ZipArchive close.
- **`files_per_sec` in status response.** The `progress` object in `GET /backup/engine/status` now includes a `files_per_sec` field (files archived per elapsed second) during the archive phase, enabling accurate ETAs and future UI rate display.

## [2.9.30.105] - 2026-06-02

### Added
- **Pre-backup nested-install detection on "Save a Backup".** Clicking the immediate manual backup button now first checks for a separate (nested) WordPress install inside your site (e.g. a `/test/` staging copy) that is not yet excluded. If one is found, a dialog offers **Exclude it** / **Include everything** / **Cancel** before the backup starts — so large sites are no longer silently doubled in size by backing up a second WP install. If detection fails, the backup proceeds normally (it never blocks you).

### Fixed
- **Backup throughput on overloaded hosts.** Under high server load the per-tick file floor (`LOAD_MIN_FILES_FLOOR`) was pinning every tick to ~50 files even when the adaptive engine had computed a much larger safe budget, turning a 273k-file backup into a many-hour crawl. The floor was lowered from 50 to 5 (it is a positive-progress *minimum*, not a ceiling), so the adaptive byte/time budget now drives real volume per tick while the cap and memory guards still keep each tick inside the PHP exec window.
- **"Unknown phase:" stall on resume.** `finalize_state()` omitted the `phase` key from the terminal state it persisted, so a re-adopted finished job loaded with an empty phase string and failed dispatch with "Unknown phase: ". The phase is now persisted, and `tick()` short-circuits cleanly (releasing its lock) for empty-phase or already-terminal states instead of erroring.
- **Sentinel no longer resurrects dead jobs.** The watchdog only recognised `complete` as terminal, so failed/cancelled engine jobs were re-adopted every cycle. A new terminal check (complete/completed/failed/cancelled) is consulted at the resurrection decision and closes tracking for any already-finished job. The success-detection helper used to gate automation status writes was deliberately left unchanged to avoid mislabeling genuinely-failed automations.
- **Cancel is now job-scoped.** The cancel signal previously wrote a single global flag that could stop *any* running backup. It is now written as a per-job flag (keyed to the job's nonce), with the legacy global flag kept for one release as a fallback, so cancelling one backup never affects a concurrent one.
- **Zombie cleanup no longer deletes a live job's working directory.** The watchdog's zombie auto-cancel now checks the engine's fresh per-tick lock before deleting a job's temp directory and defers deletion if a tick is actively running, and it notifies the Sentinel so the cancelled job is not resurrected.
- **No more silent backup data loss on finalize.** `phase_complete()` could report success even when one or more ZIP parts failed to move into the backups directory. It now fails the job (listing the missing parts) when any part is missing, instead of reporting a complete backup with absent ZIP segments.

## [2.9.30.104] - 2026-05-31

### Added
- **In-process WP-Cron tick driver.** A dedicated every-minute WP-Cron hook (`swisswpsuite_backup_engine_inprocess_tick`) calls the backup engine directly — no loopback HTTP — so backups run to completion on hosts like Hostinger/LiteSpeed where self-directed HTTP calls fail (IPv6 loopback block, HTTP 0). The driver coexists with Action Scheduler and the shutdown traffic driver via the existing per-job tick lock; it self-unschedules automatically when the job completes or is cancelled.
- **Configurable backup exclusion paths.** A new "Configure backup exclusions" collapsible panel in the Backups UI lets you mark any relative subdirectory as excluded from backups. The panel automatically detects nested WordPress installs (e.g. a `/test/` staging site) and offers one-click exclusion. User exclusion paths are stored in `swisswpsuite_backup_exclude_paths` and applied in `phase_archive_scan()` before the self-inclusion guards (which cannot be overridden).

### Fixed
- **Zombie threshold now scales for large jobs.** Legitimate archive/upload jobs on large sites (100k+ files) were being auto-cancelled as zombies after the base 30-minute heartbeat timeout. The threshold now scales linearly — every 100k files above 50k adds another 30 minutes — up to a 3-hour ceiling, but only for jobs in `archive_chunk`/`upload_chunk` phases with confirmed forward progress (`files_written > 0`). True zombies (no files written) still hit the base 30-minute threshold.
- **React error #185 fourth trigger fixed.** `pollingIds` (unstable `Set` reference) was listed as a dependency in the "resolve completed polling IDs" `useEffect` in `BackupAutomationsPanel.tsx`. When the watchdog auto-cancelled a zombie and `handleJobGone` called `setPollingIds`, the new Set reference re-triggered the effect, which could call `setPollingIds` again in a cascade. Fixed by reading polling state through a stable `pollingIdsRef` and removing `pollingIds` from the dep array.
- **Temp directory cleaned on zombie auto-cancel.** The watchdog's zombie auto-cancel path (`discover_active_jobs()`) now calls `delete_temp_dir_for_job()` after marking the state cancelled, consistent with the fix applied to the Sentinel cancel path and the 24h stale-state sweep in v2.9.30.103.

## [2.9.30.103] - 2026-05-30

### Fixed
- **O(n) archive scan replaces O(n²) re-walk.** On every resume tick the previous scanner re-walked the entire file tree from position 0 (paying realpath + stat per already-processed file). At 215k files forward progress collapsed from ~40k to ~500 files/tick; the watchdog auto-cancelled the job at tick 11. The scanner now uses a dir-stack cursor (dir_queue + current_dir + intra_offset) that advances exactly once per file across the whole job. Manifest format is byte-identical; all exclusions (swisswpsuite-backups, snapshots, exports-temp) preserved.
- **`/backup/local/analyze` never returns HTTP 500.** Replaced the unbounded synchronous tree walk with a hard 9s + 50k-iteration cap; returns `{file_count, size_bytes, is_estimate, elapsed_ms}` with `is_estimate=true` when capped.
- **React error #185 ("Maximum update depth exceeded") eliminated.** Three compounding causes in `BackupAutomationsPanel.tsx` fixed: `automations` array stabilised with `useMemo`; `setPollingIds` extracted out of the `setAutomationJobIds` functional updater; `engineStatus === null` treated as active only while the query has not yet resolved (not after the engine row is confirmed deleted).
- **Orphaned temp directories cleaned on cancel.** `delete_temp_dir_for_job()` (path-traversal-guarded) now called from Sentinel zombie-cancel, 24h stale-state sweep, and `clear_stuck_jobs` REST endpoint so partial manifests and ZIP parts do not accumulate on disk after stuck or cancelled jobs.

## [2.9.30.102] - 2026-05-30

### Fixed
- **Duplicate concurrent SCHEDULED backup jobs eliminated (TOCTOU race).** On a loaded host (Hostinger LOAD 30–55, throttled WP-Cron), two concurrent WP-Cron firings of `run_automation_backup()` could BOTH pass the v2.9.30.101 REATTACH guard — `SwissWPSuite_Backup_Engine::load_all_states()` showed no running job yet — BEFORE EITHER wrote its `'running'` engine state, minting duplicate engine jobs for one automation (the production "7 jobs in ~2h: a227 + c0543 + 5 cancelled" pattern). The existing `flock()` only serialized the legacy `execute_automation_backup()` worker, not this synchronous cron path. The REATTACH-guard → `engine->start()` critical section is now wrapped in an atomic WP-native start-lock (`add_option('swisswpsuite_bklock_{automation_id}', …)` — a single INSERT against the `option_name` UNIQUE index, so it serializes across PHP processes). Only the first caller proceeds; a concurrent caller logs and bails; a stale lock from a died holder is reclaimed after 120s. The lock is released the instant durable engine state exists (closing the TOCTOU window), so the long synchronous first tick never holds it. No `exec`/external HTTP — fully WordPress.org compliant.
- **Cancel button now appears for scheduled (cron-fired) backups, not only manual "Run Now" ones.** The Cancel gate previously read only the automation list's `last_run_status === "running"`, which is stale for a cron-fired duplicate whose sibling job already completed (status `'success'`/`'failed'`). It now also renders when an engine job is adopted and in-flight for that automation (`hasActiveEngineJob`, the same live-state signal that drives the row's progress bar), so any running scheduled backup is cancellable. Cancel still deregisters the Sentinel job so the watchdog cannot resurrect it.

## [2.9.30.101] - 2026-05-29

### Fixed
- **Automation backup progress now rehydrates after refresh/tab-switch.** The main Backups view previously re-adopted only `trigger === 'manual'` running jobs on mount, so an automation "Run Now" backup lost its progress bar after a reload (the engine job_id lived only in the tab that triggered it). `GET /backup/engine/active` now exposes `automation_id` on each job; the automations panel rediscovers running automation jobs on mount and re-adopts them into the matching automation row's existing mini progress bar. Progress renders in exactly one place — the automation row for automation jobs, the "Save a Backup" card for manual jobs — so there is no double-render.
- **Duplicate engine jobs on "Run Now" eliminated.** A single trigger previously could mint two engine jobs: the synchronous engine start (v2.9.30.98) AND the Sentinel-worker path both called `engine->start()` because the worker's reattach guard ran before the synchronous state was written. The synchronous engine state is now written BEFORE Sentinel is registered, so the worker's existing reattach guard always sees it and re-dispatches a tick instead of minting a second job. The scheduler's own pre-start guard now REATTACHES (returns the existing job's `{job_id, nonce}` and nudges it forward) instead of returning null, so a concurrent trigger binds to the running job rather than silently doing nothing.

### Changed
- **Continuous live load-aware tick adaptation (reliability over speed).** During a running backup the engine now reads the current 1-minute load average (`sys_getloadavg()`), normalises it per CPU core (detected pure-PHP from `/proc/cpuinfo`, filterable via `swisswpsuite_backup_cpu_cores`), and shrinks the per-tick wall-clock budget when per-core load exceeds 1.5, ramping linearly to a 40% floor at per-core load 4.0. Shorter ticks under load let the existing reactive files-per-tick estimator follow naturally (no double-penalty). A positive-progress floor guarantees every tick writes at least 50 files before a load/time yield can fire, so a job always advances and completes rather than stalling. The wall+CPU `min()` time budget, the memory-pressure guard, and all watchdog thresholds are unchanged. Formula: `wall_budget *= clamp(1.0 − (per_core_load − 1.5)/(4.0 − 1.5) × 0.6, 0.40, 1.0)`.

## [2.9.30.100] - 2026-05-29

### Fixed
- **Backups never completing on overloaded shared hosting (the primary backup-failure cause).** The `archive_chunk` phase only evaluated its time/cap/cancel yield conditions at file counts that were exact multiples of 100 (`if ( $files_added_this_tick % 100 === 0 )`). Under heavy server load (LOAD 30–50) the wall-clock tick budget (15–18s) was exhausted *during* the first ~100 `addFile()` calls, so the very first `%100` checkpoint (at exactly 100) always tripped `time_remaining()` and yielded — pinning `files_added_this_tick` at 100 every single tick regardless of the adaptive cap. Because the adaptive estimator is fed `last_files_added_tick`, a value permanently stuck at 100 poisoned the feedback loop: `compute_adaptive_files_per_tick` kept producing `floor(100 × ratio)` clamped to the 500 floor, so the cap decayed (5000 → 3725 → 500 in production logs) and never recovered. On 200k-file sites the backup could not finish before the watchdog cancelled it. The yield conditions are now checked every 25 files, so a healthy tick keeps archiving until time, the adaptive cap, **or** a new memory-pressure guard actually says stop — and `last_files_added_tick` now reflects real throughput so the adaptive cap self-corrects. The wall-clock/CPU time yield and the resumable byte-offset cursor are unchanged.

### Added
- **Backup progress rehydration after tab-switch / reload.** New admin-only `GET /backup/engine/active` REST endpoint enumerates non-terminal engine jobs (running/pending) and returns a lean, path-free summary (`job_id, nonce, status, phase, percent, files_written, total_files, trigger, started_at`). The Backups page now queries it on mount and re-adopts a running manual backup's `job_id`, so the progress bar reappears and keeps advancing instead of showing "no backup running" after a reload. Replaces the dead `/backup/status` mount call that returned 404.

## [2.9.30.99] - 2026-05-29

### Fixed
- **Critical disk leak from failed/abandoned backup jobs.** Every engine job writes a working directory `wp-content/uploads/swisswpsuite-backups/.engine-temp_<job_id>/` that holds the partial archive parts during the run. On success/failure/cancel the engine's own cleanup deleted it — but when the **Sentinel watchdog** abandoned a stuck job (max attempts) or tripped the circuit breaker, it called `cancel_engine_state_for_job()`, which only wrote `status='cancelled'` to wp_options and **never touched the filesystem**, bypassing the engine cleanup entirely. Over days of failing test backups this accumulated **37GB** of orphaned temp directories (no completed backups present — all leftover `.engine-temp_*` dirs). Fixes: (1) `cancel_engine_state_for_job()` now calls `SwissWPSuite_Backup_Engine::delete_temp_dir_for_job()` immediately when the Sentinel abandons/circuit-breaks a job; (2) the 24h stale-state sweep (`cleanup_stale_states()`) now also frees the temp dir before deleting the wp_options row; (3) a new daily orphan janitor (`sweep_orphaned_engine_temp_dirs()`, hooked to `swisswpsuite_daily_cleanup`) scans the backups directory and removes any `.engine-temp_*` dir whose job is in a terminal state or whose engine state no longer exists. Three independent guards (status check, 2-hour age threshold, and a `realpath()` containment/path-traversal check) ensure a running or recently-active job's working directory is never deleted. Pure-PHP recursive removal — no shell calls (WordPress.org compliant).

## [2.9.30.98] - 2026-05-29

### Fixed
- **Backups never advancing on loopback-blocked hosts (Hostinger/LiteSpeed HTTP 0).** The engine job was only ever started inside `execute_automation_backup()` — the Sentinel worker target reached via loopback HTTP. On hosts where loopback returns HTTP 0, the worker never ran, so `engine->start()` was never called, no engine state was written, and `/backup/engine/admin-tick` returned "Job not found" — leaving the browser tick driver with nothing to advance. Fixed: `run_automation_backup()` now starts the engine **synchronously in the triggering request** (writing state before returning), runs the first tick, chains the dispatcher, and returns the engine `job_id` + `nonce`. `run_automation_now()` surfaces the `job_id` in its REST response so the browser tick driver activates immediately. The redundant Sentinel/cron worker spawn is retained; its dedup guard re-dispatches a tick for the existing engine state instead of minting a duplicate job. This also fixes scheduled (cron-fired) automations on the same hosts.

## [2.9.30.97] - 2026-05-29

### Added
- **Bounded multi-part backup archives (size-rollover).** Oversized categories now roll into bounded, write-once parts (`backup-others-<id>.001.zip`, `.002.zip`, …) with a 256MB-per-part uncompressed budget (filterable via `swisswpsuite_backup_part_byte_budget`). Each part is opened, filled until the size or per-tick time/file cap is hit, then `close()`'d permanently and never reopened. This eliminates the O(n²) ZIP central-directory rebuild that previously collapsed throughput on large categories (e.g. ~53K-file `others`) and stalled big-site backups.
- **Per-part SHA-256 integrity index.** Every part is hashed with streaming `hash_file()` (flat memory) at close and recorded in the backup set's part-index (filename, sha256, file count, byte size, order).
- **Universal tick-on-traffic driver.** A cheap `shutdown` hook (single autoloaded option read + time-gate, 20s min interval) advances an in-flight backup on ordinary front-end/admin traffic, parking the gate when idle. Guarantees forward progress even when WP-Cron is disabled, Action Scheduler is absent, and no admin tab is open.
- **Browser-side tick driver.** While the Backups panel is mounted and a job is running, the admin page drives ticks via a new admin-nonce-authenticated route `/backup/engine/admin-tick` (separate from the worker-secret route so the sentinel secret never reaches the DOM), with an in-flight guard so only one tick request is outstanding at a time. Indeterminate progress UI shows phase label + bytes processed.

### Changed
- **Restore is now atomic.** `restore_backup_set()` verifies every part's SHA-256 against the part-index BEFORE extracting anything; if any part is missing, corrupt, or tampered, the restore is refused with no files changed. The previous best-effort "Partially restored" success path is removed. Legacy/cloud sets without a part-index fall back to the historical flow (back-compat).

## [2.9.30.96] - 2026-05-29

### Fixed
- **Backup stall on Hostinger/LiteSpeed (loopback-block)** — replaced the `wp_remote_post()` self-loopback tick chain with Action Scheduler (`as_enqueue_async_action`) as the primary execution path. On hosts where loopback HTTP is blocked (Hostinger IPv6 reverse-proxy), every `chain_next_tick()` call returned HTTP 0, leaving backups to advance only on the 5-minute health-check cron (~850 files/tick × 1 tick/5min = days to finish 17K files). Action Scheduler drains its queue on every cron/admin-ajax hit without requiring a self-reachable HTTP endpoint. Degrades gracefully when AS is absent (falls back to existing loopback + health-check).
- **Sentinel resurrection spawning duplicate engine jobs** — the watchdog `monitor_jobs()` called `spawn_worker()` on every stuck detection, which dispatched to `execute_automation_backup()` and minted a brand-new engine job from scratch. On Hostinger (chain always failing), this produced 4+ concurrent engine jobs for the same automation. Fixed: on resurrection of a `backup_automation_*` job, `resume_engine_tick_for_automation()` looks for an existing running/pending engine state and re-dispatches a tick for it; only falls through to `spawn_worker()` (new job) if no resumable state exists.
- **Duplicate engine jobs on worker endpoint call** — `execute_automation_backup()` (called by the Sentinel worker endpoint on every resurrection) now checks `load_all_states()` for an existing running/pending engine state for the automation before starting a new job. If one exists, it re-dispatches a tick for it and returns early — no new job minted.

## [2.9.30.95] - 2026-05-29

### Added
- **Cancel button for running automation backups** — a running scheduled or cron-fired automation backup can now be cancelled directly from the Automations panel (the Cancel button appears whenever `last_run_status === "running"`, no browser job id required). New endpoint `POST /backup/automations/{id}/cancel` resolves all live engine states for the automation, calls `engine->cancel()` on each, deregisters the Sentinel watchdog job (`circuit_open=true` so the watchdog will not resurrect the cancelled job), and marks the automation run as failed ("Cancelled by user."). Previously the Cancel button was a no-op for scheduled automations because they had no browser-side job id, and even manual cancels could be resurrected by the Sentinel watchdog.

## [2.9.30.94] - 2026-05-29

### Fixed
- **Backup never completing on large sites (positional cursor)** — the archive scan resume cursor used a lexicographic string comparison (`$relative_path <= $resume_cursor`) which assumed `RecursiveDirectoryIterator` returns entries in alphabetical order. Linux `readdir()` returns entries in hash table / inode order — not sorted. Any site where the iterator returned a file alphabetically after the cursor but physically before it would re-process already-written entries, appending duplicates to the manifest. Subsequent ticks would restart from position 0 and burn all 5 attempt slots, triggering the circuit breaker with no backup produced. Fixed: replaced string comparison with a deterministic positional counter (`$current_pos` / `$resume_pos`). The counter increments once per iterator entry regardless of path, and is saved/restored across ticks.
- **Self-inclusion of snapshot, backup output, and exports-temp directories** — the archive scan was not excluding `swisswpsuite-snapshots/`, `swisswpsuite-backups/`, and `swisswpsuite-exports-temp/` path segments from the realpath exclusion logic, allowing nested staging clone directories (which contain these folders under a different parent) to be included in the backup. Fixed: segment-based exclusion checks for all three directory names in the resolved absolute path, covering both the primary locations and any staging clone subdirectories.

## [2.9.30.93] - 2026-05-27

### Fixed
- **archive_scan restart loop on overloaded hosts** — the scan phase was yielding mid-scan at 50K–85K files and restarting from scratch on recovery, burning all 5 attempts and triggering the circuit breaker. Root cause: `status='incomplete'` on yield forced a full restart. Fix: a new `status='resuming'` state saves a `last_scanned_path` cursor in job state and reopens the category manifest in append mode (`'a'`). On resume, the iterator fast-skips paths alphabetically ≤ cursor using a string compare (no `stat()` calls), then continues writing new entries. Does not burn the attempt counter — only a true iterator inconsistency (filesystem error) promotes to `'incomplete'` and counts as an attempt.
- **Partial scan counts preserved across yields** — `partial_files` and `partial_bytes` are saved to state on yield and restored on resume, so the final totals are always cumulative across all ticks regardless of how many times the scan yielded.

## [2.9.30.92] - 2026-05-27

### Fixed
- **Critical: Backup self-inclusion** — the archive scan was including the `swisswpsuite-backups/` output directory itself, causing every new backup to contain all previous backup zips. Sites with multiple completed backups would see exponential size growth (e.g. 271MB site → 3GB backup). Fixed with a two-layer realpath-based exclusion set that is immune to custom `UPLOADS` constants, cPanel path remaps, and symlinked upload directories.
- **Realpath-safe exclusions** — the previous hardcoded `'wp-content/uploads/swisswpsuite-backups'` prefix check failed silently on any hosting where `realpath()` resolves through a symlink to a different absolute path. Exclusions are now built from `wp_upload_dir()['basedir']` at runtime and compared against resolved absolute paths.

## [2.9.30.91] - 2026-05-27

### Fixed
- **Backup ZIP 3 stall on overloaded shared hosting** — `time_remaining()` now returns `min(wall_clock, CPU)` so the engine yields before the PHP execution deadline kills the process with no state saved. Jobs on LOAD 40-58 servers were restarting ZIP 3 from the same position on every recovery tick.
- **Category manifests eliminate skip-scan overhead** — `archive_scan` now writes per-category manifest files; `archive_chunk` reads the category-only manifest (53K lines for `others`) instead of scanning all 96K lines with 43% skip ratio. Eliminates the CPU waste that was the secondary stall cause.
- **Wall-clock safety yield** — secondary yield check fires every 2000 manifest lines scanned (all lines, not just files added) to catch deadline expiry during high-skip-ratio passes.
- **Sentinel stale-running watchdog** raised from 2h to 4h — large sites legitimately need 3+ hours on overloaded shared servers with 5-7 min inter-tick recovery gaps.

### Added
- **Adaptive Backup Intelligence** (`SwissWPSuite_Backup_Site_Profile`) — persistent per-site hosting profile stored in `swisswpsuite_backup_site_profile` wp_option. Tracks `host_tier`, `tick_budget_seconds`, `successful_files_per_tick`, `chain_fail_rate`, and updates after every job outcome.
- **Host probe on first run** — classifies hosting tier (`vps` / `shared_fast` / `shared_slow` / `shared_overloaded`) from loopback RTT and server load average; sets initial tick budget automatically (18-35s range).
- **Adaptive `files_per_tick`** — recalculated at the start of each tick using `prev_files × (budget_ms × 0.75 / prev_tick_ms)`, clamped 500-5000. Self-tunes to actual server speed without user intervention.
- **Double-tap chain retry** — when `chain_next_tick` returns HTTP 0, the dispatcher waits 3s and retries once, cutting the median 5-7 min health-check gap to ~3 seconds in most cases.
- **Consecutive chain failure backoff** — after 3 consecutive HTTP 0s, engine stops self-pinging and defers to health-check recovery to avoid hammering an overloaded server.
- **`GET /backup/probe-ping`** — lightweight loopback latency probe endpoint.
- **`adaptive` field in backup status response** — surfaces `host_tier`, `tick_budget_seconds`, `files_per_tick`, `chain_fail_rate` for UI display.

## [2.9.30.90] - 2026-05-27

### Fixed
- **Backup cron regression** — automated scheduled backups silently stopped when the license capability cache returned a stale/false value during a `wp-cron.php` request. `SwissWPSuite_Backup_Scheduler` is now instantiated unconditionally so WP-Cron hook listeners always register; the `backup_cloud` capability check was moved inside `run_automation_backup()` where a skipped backup writes a visible warning to the Diagnostics log.
- **Dashboard shows attempt time, not completion time** — backup automation cards showed the timestamp of when the backup job was started (`last_run_at` set at `status='running'`), not when it completed. New `last_successful_at` field is written only on `status='success'`; dashboard and UI card now prefer this field. Pre-upgrade rows fall back to `last_run_at` when that row has `status='success'`.
- **"X hours ago" off by timezone offset** — `formatRelativeTime()` in `BackupAutomationsPanel.tsx` parsed MySQL UTC datetime strings (no timezone suffix) as local time. For UTC+2 users, a backup completed 24h ago displayed as "22h ago". Fixed by appending `' UTC'` to bare MySQL datetime strings before parsing; ISO 8601 strings already containing `T`/`Z` are left untouched.

## [2.9.30.89] - 2026-05-26

### Changed
- Plugin display name updated to **SwissSuite AI** throughout — plugin header, readme.txt title, and public README now consistently reflect the AI branding.
- Renamed `.distignore` added at project root for future WP.org SVN deployment.

### Fixed
- Mode B migration receiver template: placeholder `%%RECEIVER_EXPIRES_AT%%` had spaces inserted during prior cleanup (`% % RECEIVER_EXPIRES_AT % %`), silently breaking every generated receiver script since v2.9.30.81. Restored to correct double-percent form.
- `class-swisswpsuite-backup.php` bare `// phpcs:enable` at line 834 re-enabled ALL previously disabled sniffs file-wide (including `WordPress.WP.AlternativeFunctions`), causing 142 false-positive PCP errors. Fixed by re-asserting the disable scope after the bare enable.

### Tooling
- Rewrote `plugin/bin/run-plugin-check.sh` — now bootstraps PCP locally, runs static checks against the built zip without requiring a live WordPress install, and exits with structured status codes. Previous version was non-functional (no `--path`, missing plugin-check package).
- Fixed PHPCS `installed_paths` regression caused by path-with-space truncation in the composer post-install script; added `phpcsstandards/phpcsextra` dev dependency.
- Replaced `parse_url()` with `wp_parse_url()`, `strip_tags()` with `wp_strip_all_tags()`, `is_writable()` with `wp_is_writable()`, `@unlink()` with `wp_delete_file()` across affected files — PCP (WP.org review ruleset) now reports **0 errors**.

## [2.9.30.88] - 2026-05-22

### Security
- Hardened `.htaccess` protection in all `swisswpsuite-*` data directories to dual Apache 2.2+2.4 syntax (`Require all denied` with `<IfModule !mod_authz_core.c>` fallback to legacy `Deny from all`) — fixes silent bypass on Apache 2.4 hosts without `mod_access_compat`. Affects 5 legacy `.htaccess` writers across the archiver, backup, sentinel, transport, and journal modules.
- Added `SwissWPSuite_Archiver::upgrade_htaccess_if_weak()` and an activation-time upgrade loop in `class-swisswpsuite-activator.php` so existing installs receive the dual-syntax `.htaccess` on plugin update without manual intervention.
- Normalized `index.php` directory-listing stubs to canonical `<?php // Silence is golden` form in transport and journal directories.

## [2.9.30.87] - 2026-05-22

### Security
- Tightened X-Forwarded-For validation in `get_client_ip()` — added `FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE` to block loopback/private IP spoofing through trusted proxies (documented active bypass by external scanner).
- Removed HTTP_CLIENT_IP header processing — non-standard header adds IP-injection attack surface with no operational benefit on Cloudflare+LiteSpeed stack.
- Validated `swisswpsuite_trusted_proxies` filter output — each entry from third-party filters is now validated as a proper IP or CIDR before being accepted; wildcard entries (`0.0.0.0/0`) explicitly rejected.
- Scan orchestrator catch blocks no longer propagate raw PHP exception messages in HTTP responses — full exception logged to `swisswpsuite_debug_log` internally, generic error code returned to client.
- GDrive OAuth token storage now returns `WP_Error('encryption_unavailable', ...)` if the Encryption class is unavailable instead of silently falling back to plaintext `wp_options` storage.
- Admin diagnostic log now strips file-path segments from exception messages before writing to `swisswpsuite_debug_log`.
- Test-connection diagnostic log entry reduced to presence-only (`'Present'`) — no longer discloses license key byte-length.

### Fixed
- Completed `exec()` elimination — removed remaining `@exec('du -sm ...')` call in `estimate_site_size_mb()` (`class-swisswpsuite-backup-engine.php`). Pure-PHP `RecursiveIteratorIterator` path (already present as fallback) is now the sole implementation. Plugin is genuinely shell-free across all files.

### Changed
- External Services section in `readme.txt` now discloses all 5 user-configured cloud and vulnerability-feed services: Google Drive/OAuth, Backblaze B2, Dropbox, WPScan API, and Patchstack API. Each entry includes host, data sent, activation condition, and privacy policy URL (WP.org §7 compliance).

### VPS
- Added `activateLimiter` rate-limiting middleware to `POST /v1/license/upgrade` route — the only license route that previously had no rate limiter.

## [2.9.30.86] - 2026-05-21

### Fixed
- **Complete elimination of `exec()`/`shell_exec()` from plugin code** — Phase 4b cleanup across `class-swisswpsuite-archiver.php`, `class-swisswpsuite-backup.php`, `class-swisswpsuite-sentinel-safety.php`, and `class-swisswpsuite-transport.php`. v2.9.30.83 marked TD-WP-ORG-001/002 RESOLVED but only covered the database dumper and restorer; four additional files still contained shell calls used for binary probing (`which`), disk usage (`du`), and shell-based archive operations. All call sites now use pure-PHP equivalents (e.g., `ZipArchive`, `RecursiveDirectoryIterator`, internal byte counting). Plugin is now genuinely shell-free, restoring WP.org submission readiness.

### Changed
- Removed obsolete GROUP 6 phpcs suppressions in `plugin/phpcs.xml` that referenced the now-eliminated shell calls.

## [2.9.30.85] - 2026-05-20

### Fixed
- **Banned IPs no longer wiped on plugin update** — a stale v2.9.28.07 emergency-WAF-unlock migration was clearing `swisswpsuite_banned_ips` on installs where `swisswpsuite_db_version` defaulted to `'0'`. The migration now has a one-shot guard (`swisswpsuite_waf_unlock_v2_9_28_07_done`) so it runs at most once per install, and the banned-IPs clear has been removed entirely — the migration was for a v2.9.28.06 incident now 200+ versions stale and should never destroy user data.
- **Release IP button now works on stale or already-released bans** — `unban_ip()` is now idempotent. Previously, if a row was already removed (parallel tab, expired auto-ban, foreign cleanup), the endpoint returned a 400 which the frontend mis-rendered as "Network error." The unban handler also surfaces the backend error message instead of a generic transport-error string.
- **Threat log writes restored after the v2.9.30.81 PHPCS sweep** — `exit;` was removed after two `wp_die()` calls in the WAF (IP-reputation block and the request-blocker). When a `wp_die_handler` filter returns instead of exits (REST contexts, certain mu-plugin handlers, test harnesses), execution would fall through past the block decision, suppressing the `log_threat()` write inside `block_request()`. Restored the explicit `exit;` so the threat log fills again.

## [2.9.30.84] - 2026-05-20

### Added
- **IP Allowlist** — new permanent user-managed safelist of trusted IP addresses (Security Hub → Quarantine tab → Allowed IPs). IPs in the allowlist are never auto-banned by the brute-force / login-protection module. The current visitor's IP is shown as a one-click helper so admins can easily safelist their own connection. Adding an already-banned IP to the allowlist immediately clears the ban state. New REST routes: `GET/POST/DELETE /swisswpsuite/v1/security/allowed-ips` (Pro-gated for write operations). New option key: `swisswpsuite_allowed_ips` (SITE_LOCAL_CONFIG, autoload=false).

### Fixed
- **Blocked IPs UI now surfaces auto-bans** — the Quarantine tab's "Blocked IPs" section previously showed only IPs added via the manual "Block IP" button. Auto-bans written to `swisswpsuite_banned_ips` by the firewall (5 violations in 10 minutes → 30-minute ban) were invisible. Admins could be locked out of their own site with the UI reporting "No blocked IPs yet". Auto-bans now appear in the same table with an "AUTO" badge; manual entries get a "MANUAL" badge. Both can be released via the same "Release" button.

## [2.9.30.83] - 2026-05-20

### Fixed
- Eliminate `exec()`/`shell_exec()` from backup pipeline — database export (`SwissWPSuite_Database_Dumper`) and restore (`SwissWPSuite_Restorer`) now use pure-PHP only. Removes WP.org hard blocker TD-WP-ORG-001/002 and fixes silent backup failures on shared hosts with `exec()` disabled.

### Changed
- `readme.txt` now has a `== External Services ==` section listing Groq AI API and swisswpsecure.com Command Center with data-sent details, privacy policy links, and opt-in behaviour (WP.org requirement TD-WP-ORG-004).
- GPL vendor license audit complete — all 44 composer dev dependencies are MIT/BSD/LGPL-compatible; `vendor/` confirmed excluded from plugin zip (TD-WP-ORG-003 resolved).

## [2.9.30.82] - 2026-05-20

### Changed
- feat: gate Site Sync and Site Migration modules behind Beta Features toggle — both tabs show a Beta badge; content is unlocked only when Beta Features is enabled in Settings > General

## [2.9.30.81] - 2026-05-20

### Fixed
- fix: restore is_wp_error guard in post_import_recovery cron check

## [2.9.30.80] - 2026-05-19

### Changed
- chore: code quality sprint — PHPStan baseline, PHPCS clean, Playwright graceful skip

## [2.9.30.79] - 2026-05-18

### Fixed
- **PHPUnit test suite fully repaired:** 31 errors + 5 failures → 0 errors + 0 failures (135 tests / 359 assertions).
- **Backup domain replacement word-boundary bug:** `recursive_replace()` now uses a negative lookbehind regex to prevent a search domain (e.g. `mysite.com`) from matching inside longer hostnames that contain it as a substring (e.g. `mynew-site.com`).
- **Composer PHP version compatibility:** Downgraded `doctrine/instantiator` 2.1.0 → 1.5.0; v2.1 uses PHP 8.3 typed class constants which are not supported on PHP 8.1.

### Changed
- Expanded WP stub mock layer in test bootstrap with missing functions (`wp_json_encode`, `wp_parse_url`, `sanitize_file_name`, `wp_unslash`, etc.) and missing `MockWPDB` properties/methods.
- Aligned unit tests with post-monolith-split API class structure (`SwissWPSuite_Api_Content`, `SwissWPSuite_Api_Settings`).

## [2.9.30.78] - 2026-05-12

### Fixed
- **Sentinel false-positive malware alert:** Tightened the hex-escape signature pattern from matching 3 consecutive `\xNN` sequences to requiring 6+. The old pattern flagged legitimate plugin files that use hex encoding for binary data, producing a critical finding that the dedicated malware scanner correctly reported as clean.
- **Sentinel description accuracy:** Updated UI description to accurately reflect that Sentinel includes basic file signature checks alongside posture auditing (previously claimed it did not inspect file contents).

## [2.9.30.77] - 2026-05-12

### Added
- **In-plugin "Get Free License" flow:** New section on the Settings → License tab lets users enter an email and one-click provision a free license without leaving WordPress. The license is locked to the site's domain by the VPS, and the key is emailed to the user for recovery.
- **Free-license email delivery:** VPS now sends the newly generated license key to the user's email on first creation (fire-and-forget via the existing SMTP configuration; never blocks the activation response).
- **Reinstall recovery:** If the domain already has an active free license (reinstall / redesign scenario), the existing key is silently recovered and reactivated instead of creating a duplicate. The plugin shows a "recovered" success message to distinguish from a fresh activation.

### Changed
- VPS `POST /v1/license/activate` Scenario 2 response now includes a `recovered: true|false` flag on the `license` object so the plugin can choose the appropriate user-facing message.

## [2.9.30.76] - 2026-05-11

### Fixed
- **Zero-cost L1 scan:** Removed incorrect 1,500 token deduction from daily L1 security scan (L1 uses no AI — deduction was erroneous billing). Free-tier users' token balance is no longer consumed by daily scans.
- **Remove weekly L1 rate gate:** Weekly rate-limit check on L1 scans removed; L1 is free so daily runs are unrestricted.
- **Remove L1 token pre-check:** Token balance check before L1 scan removed — no balance required for non-AI operations.
- **Error guard in daily report:** Added null-safety guard in `run_daily_report()` to prevent blank grade in scheduled email reports.
- **Free-tier token allocation:** Monthly free-tier token limit raised from 1,500 → 50,000 on VPS, giving free users adequate headroom for AI features (Check-with-AI, content tools).

## [2.9.30.75] - 2026-05-11

### Added
- **Persistent Mark Safe (id-based safelist):** Sentinel Audit findings without a file path (e.g. "WordPress Version Detected", "PHP Version", "Bundled Plugin File Missing") can now be permanently dismissed. Dismissed findings are filtered server-side on every subsequent scan so they never reappear. A disclosure banner above the results list shows how many findings are hidden, with a "Manage" link to review or undo any dismissal.
- **Stable finding IDs:** Sentinel Audit findings now carry stable IDs (module-assigned `m[1-5]-NNN`, AI-synthetic `auto-{sha256-12}`, or legacy `l1-N` for backward compat) instead of positional indices. Safelist entries survive sort-order changes and re-scans correctly.

## [2.9.30.74] - 2026-05-11

### Fixed
- **Deep scan ran Quick scan (orphaned toggle):** `ScanCard.tsx` still rendered a legacy v2.9.28.x Quick/Deep mode toggle. Clicking "Deep" called `onTrigger("deep")`, which `SecurityHub.tsx` silently coerced to `"quick"` (defensive guard from v2.9.29.0 when the old `?mode=deep` endpoint was retired). Removed the entire toggle, `malwareMode` useState, and dead exports from `scanConstants.ts`. The dedicated Deep Malware Scan card with its async `/scan/malware/start` pipeline is the correct entry point.

## [2.9.30.73] - 2026-05-11

### Fixed
- **Quick scan false positives (F-A):** `is_safe_folder()` in `class-swisswpsuite-security-scanner.php` now performs an ancestor directory walk instead of a single `basename()` on whatever path is passed. Plugin's own security classes (e.g. `class-swisswpsuite-sentinel-security.php`) are no longer flagged as the FilesMan webshell.
- **Deep scan result panel (F-B):** `MalwareResultView` in `ScanResultPanel.tsx` now renders `ai_grade` badge (A–F), four status pills (`vps_status`, `wpscan_status`, `patchstack_status`, `ai_status`), and the `sources` row. These fields were returned by the backend since v2.9.29.0 but were never rendered in the live results panel.
- **`ai_grade` in REST envelope (F-C):** The polling status response (`GET /security/scan/malware/status`) now includes `ai_grade` in `result` alongside the existing `files_scanned` / `threats_found` fields. Previously `ai_grade` was only written to `swisswpsuite_last_scan_report` (scan history), causing the live panel to always be missing the grade.

## [2.9.30.72] - 2026-05-08

### Added
- **M1-H VPS Hash Lookup:** Deep Malware Scan now calls VPS `/v1/scan/batch` in Phase 3 — batched SHA256 hash lookups (≤500/call) against the PostgreSQL `malware_signatures` table (MalwareBazaar + URLhaus, hourly-refreshed). This is the first connection between the plugin and the `/v1/scan/batch` endpoint — new integration, not a regression reconnection.
- **Source-badge deduplication:** When M1-H returns `malicious` for a file, M1-C regex is skipped for that file. Hash matches are deterministic (100% confidence); regex is heuristic — deduplication avoids false positives on confirmed known-malware files.
- **Soft-degrade on hash lookup:** VPS unreachable (5s timeout) → all clean verdicts; invalid/expired license (403) → hash lookup skipped silently. Scan completes with remaining phases. No hard failure.

### Changed
- **Malware Scan Free (Free tier):** Now uses bounded signature scan (50–100 recently-modified plugin/theme PHP files, regex only) instead of WordPress.org checksum diff.
- **Sentinel Audit M4-D2:** WPScan + Patchstack live API calls removed from the AI Security Audit's L1 path; these APIs are now exclusively used in Deep Malware Scan Phases 5+6 with full CVE correlation. Sentinel Audit uses the hardcoded CVE fallback list for L1 CVE detection.

### Deprecated
- `POST /security/scan/full-ai` (sync) → use `POST /security/scan/malware/start`
- `POST /security/scan/malware?mode=deep` → use `POST /security/scan/malware/start`

### Security
- Audit report corrected: `VPS_MALWARE_HASH_LOOKUP_DROPPED_v2.9.6.0_AUDIT_2026-05-06.md` executive summary incorrectly called this a "regression." The `/v1/scan/batch` endpoint was never connected to the plugin prior to this sprint — it was added in v2.9.27.0 (Sprint 1.5) and sat orphaned. The M1-H integration is a **new feature**, not a reconnection.

## [2.9.29.0] - 2026-05-08

### Added
- **Deep Malware Scan (Pro):** New async polling state machine — `POST /security/scan/malware/start` + `GET /security/scan/malware/status`. Eight-phase pipeline: `enumerate → hashing → vps_lookup → local_scan → wpscan → patchstack → ai_analysis → complete`. Soft-degrades on VPS/WPScan/Patchstack/AI unavailability.
- **Source-tag badges:** Scan result rows now show detection-source badges (Hash DB / Pattern / WPScan / Patchstack / AI) for deep-scan findings.
- **`MalwareScanResult` extended:** New fields `sources`, `wpscan_status`, `patchstack_status`, `ai_status`, `vps_lookup_status` for multi-source deep scan results.
- **`malware_deep` scan type:** Recognised in scan history table as "Deep Malware".

### Changed
- `POST /security/scan/malware?mode=deep` → HTTP 410 Gone (breaking change — use `/malware/start`).
- `POST /security/scan/full-ai` (synchronous endpoint) → HTTP 410 Gone — use `/malware/start`.
- `POST /security/deep-scan/start` + `GET /security/deep-scan/status` → HTTP 410 Gone (final removal after deprecation cycle).
- Compat aliases `POST /scan/full-ai/start` and `GET /scan/full-ai/status` kept for one release cycle.

## [2.9.28.72] - 2026-05-06

### Security
- **B1+B2:** `run_sentinel_remediation()` now adds quarantined file to `swisswpsuite_security_ignored_paths` and removes it from `swisswpsuite_security_scan_results` — quarantined files no longer reappear on every scan

## [2.9.28.71] - 2026-05-06

### Security
- **B1:** Quarantine now adds path to `swisswpsuite_security_ignored_paths` so it survives page reload
- **B2:** Immediate `scan_results` cleanup on quarantine — findings for the quarantined path are cleared right away
- **B3:** `is_safe_folder()` now skips the quarantine directory — quarantined malware is not rescanned
- **B4:** `ai_verdict` field renamed to `detection_method` — no AI is involved in basic scan

## [2.9.28.70] - 2026-05-06

### Fixed
- **Backup encryption wiring**: `SwissWPSuite_Encryption::encrypt_file()` now wired into the backup pipeline via a new `phase_encrypt()` phase. Archives encrypted with AES-256-CBC (OpenSSL) or xChaCha20-Poly1305 (Sodium) are saved as `.zip.enc` files when an encryption password is configured.
- **Encryption password clear**: Settings API now accepts `clearEncryptionPassword: true` to remove the stored encryption password.
- **Dead code removal**: `get_option('swisswpsuite_backup_last_run', null)` block removed from `get_backup_schedule()` — this option was never written and `last_run_status` was always null.

### Added
- **Encryption Settings card**: New Security-tab card for setting/clearing the backup encryption password with status badge (Active / Not configured / Key corrupted).
- **Encrypted badge in BackupControl**: "Encrypted" emerald badge displayed next to "Save Backup Now" button when encryption password is active.

### Security
- Staging decryption always uses `$sql_temp_dir_early` (deny-all `.htaccess` protected), not ABSPATH.
- Staging filename uses `wp_generate_password(24)` — random, unpredictable.
- Magic byte detection (`WSENC` header) routes `.zip.enc` files through decrypt before extraction.

### Docs
- BACKUP_CAPABILITIES_REFERENCE.md: New Section 6 "Encryption-at-Rest" documenting password storage, job-state safety, and the not-yet-wired restorer caveat. Mode A/B/C terminology cross-reference disambiguation added.

## [2.9.28.69] - 2026-05-04

### Fixed
- **Dashboard "Last Backup" accuracy**: Stats endpoint now reads from the automation store (`SwissWPSuite_Backup_Automations::get_all()`) instead of scanning the filesystem with `glob()`+`filemtime()`. The filesystem reflects ALL `.zip` files (manual backups, migration exports, failed runs) and doesn't distinguish automation state. The automation store's `last_run_at` is the canonical record of when a scheduled backup last ran.

## [2.9.28.68] - 2026-05-04

### Changed
- **Rebrand "Security Audit" → "Sentinel Audit"**: All user-facing labels, email subjects, notification titles, and error messages now consistently use "Sentinel" branding — restoring the original sentinel identity that built the product's reputation

## [2.9.28.67] - 2026-05-04

### Fixed
- **Version bump verification**: Confirmed all 16 key implementations from v2.9.28.50 through v2.9.28.66 are correctly shipped — CRIT-3 severity count gap closed, SecurityStatus.last_scan_source contract synced, DISABLE_WP_CRON truthiness fixed, identity hash read-back verified, threats_blocked dual-source authoritative, RemediateResponse TS interface aligned to PHP response

## [2.9.28.66] - 2026-05-02

### Fixed
- **/security/status HTTP 500**: Missing global `$wpdb` in `get_security_status()` — PHP fatal on fresh install
- **File Integrity "Never" text**: Card now shows "Automatic daily checks enabled" instead of "Never" when no scan has run; daily cron hook `swisswpsuite_daily_integrity_check` added to keep last_scan_time current

## [2.9.28.65] - 2026-05-02

### Fixed
- **Abandoned plugins UI label**: Changed "NOT ON WP.ORG" to "SLUG MISMATCH — Verify if the plugin is still available on WordPress.org if it has been removed" — the 404 is often a slug mismatch, not a removed plugin

### Changed
- **Dashboard/Security Status dual-source fix**: `threats_blocked` in Security Status panel now reads from authoritative `COUNT(*)` query instead of stale option (shipped in v2.9.28.64, documented here for completeness)

## [2.9.28.64] - 2026-05-02

### Fixed
- **Dashboard/Security Status dual-source inconsistency**: `threats_blocked` in Security Status panel now reads from the authoritative `COUNT(*)` query instead of the stale `swisswpsuite_threats_blocked_count` option, matching the Dashboard panel

### Changed
- **Dead code cleanup**: Removed orphaned `swisswpsuite_threats_blocked_count` option write from `block_request()`; removed option from config manifest OPERATIONAL_STATE

---

## [2.9.28.63] - 2026-05-02

### Fixed
- CRIT-3: `get_sentinel_scan_history()` now computes `high_count`, `medium_count`, and `low_count` from layer1_json findings alongside `critical_count`
- TypeScript `ScanHistoryRecord` interface updated with `high_count?`, `medium_count?`, `low_count?` optional fields

## [2.9.28.62] - 2026-05-01

### Fixed
- DISABLE_WP_CRON truthiness: fixed boolean check in `api-seo.php` (line 1392) and `api-backup.php` (lines 1755, 2140) to correctly handle `define('DISABLE_WP_CRON', '')` empty-string pattern common on Hostinger/LiteSpeed hosts

## [2.9.28.61] - 2026-05-01

### Fixed
- Contract sync: added `last_scan_source?: string` to `SecurityStatus` interface (PHP already returns this field at api-security.php:424)
- Contract sync: removed phantom `quarantine_path` field from `QuarantineFile` (PHP never returns this field at quarantine.php:198-203)

## [2.9.28.60] - 2026-05-01

### Fixed
- Contract sync: added `last_scan_source?: string` to `SecurityStatus` interface (PHP already returns this field)
- Contract sync: removed phantom `quarantine_path` field from `QuarantineFile` (PHP never returns this field)

## [2.9.28.59] - 2026-05-01

### Fixed
- P0-1: post_status whitelist validation in sync upsert — blocks ghost-post injection from malicious capsules
- P0-2: sync-scheduler post_status filter now includes 'auto-draft' — FSE templates synced correctly
- P1-6: DISABLE_WP_CRON boolean truthiness fix — inline fallback triggers correctly when constant is empty string
- P2-1: analyze_firewall_logs() now uses esc_html() instead of wp_strip_all_tags() — XSS forensic evidence preserved for AI analysis
- P2-3: WooCommerce REST allowlist now includes wc/store/v2, wc-analytics/v1, wc-admin/v1
- P2-4: post_apply_verify() now re-validates license after plugin updates
- P2-5: backup count query aligned to use same post_status filter as scan_for_links()
- P3-2: symlink-escape case now tracked in $failed[] array in bulk_security_action()

## [2.9.28.58]

### Fixed
- Identity hash protocol drift: `generate_identity_hash()` now strips protocol (`http://`/`https://`) before hashing, so HTTP→HTTPS migrations don't invalidate the stored hash
- `is_identity_valid()` now includes a migration path for hashes stored with protocol prefix — transparently upgrades stored hash on first run after update

## [2.9.28.57] - 2026-04-30

### Fixed
- F-326 (add): `analyze_security_logs` AI prompt sanitizes `ip_address` via `sanitize_text_field()` and `event` via `esc_html()` — prevents prompt injection from raw DB values
- F-329 Bug 4: `verify_sync_integrity` fallback branches now log WARNING when `json_encode` fails for `source_data` or `target_data`
- F-329 (additional): `wp_json_encode` retry_body guard added — returns `WP_Error` on failure instead of silently sending empty body
- F-330 Bug 2: Bulk security `ignore` action now tracks invalid paths in `$failed` array with reasons — no more silent discards
- F-331 Bug 1: `DISABLE_WP_CRON` check uses `constant()` after `defined()` — handles falsy-but-defined values (`''`, `0`) correctly
- F-331 Bug 2: `SeoBackgroundStatus` TypeScript interface now declares `cron_blocked?: boolean` — eliminates type drift between types.ts and API response
- F-333: 6 additional `update_option` calls in `api-seo.php` now use `autoload=false` — prevents SEO batch state from polluting wp_options cache
- F-334: `SeoManager` slow-batch poll catch block now clears `slowBatchJobId` and `groqBatchId` alongside `slowBatchInProgress` — no more stuck banners

---

## [2.9.28.56] - 2026-04-30

### Fixed
- F-326: Security logs endpoint now escapes log messages with `esc_html()` — defense-in-depth against XSS in log viewing
- F-329: Groq API responses now use `JSON_INVALID_UTF8_ERROR | JSON_PARTIAL_OUTPUT_ON_ERROR` flags — prevents silent data corruption for non-English content (Chinese, Arabic, emoji)
- F-330: Bulk security actions now return failed-item list with reasons — actionable error reporting instead of silent partial failures
- F-331: SEO tab now shows inline fallback warning when WP-Cron is disabled (Hostinger/LiteSpeed environments)
- F-332: Scan results React key now uses evidence path (globally unique) instead of scan-local ID — no more duplicate key warnings
- F-333: SEO worker batch `update_option()` calls now use `autoload=false` — no more wp_options cache pollution
- F-334: SEO batch banner now clears automatically on network error — no more stuck banners
- F-335: M2 (Permissions Audit) now respects "Mark as Safe" ignore list — findings from ignored paths filtered correctly (same as M1/M3)

---

## [2.9.28.55] - 2026-04-30

### Fixed
- H-4: SEO batch queue now processes up to 3 items inline when `DISABLE_WP_CRON` is set — prevents queue stall on Hostinger/LiteSpeed/Cloudflare environments where WP-Cron loopback is blocked

---

## [2.9.28.54] - 2026-04-30

### Fixed
- H-1: M2 (Permissions Audit) now respects user's "Mark as Safe" ignore list — permission findings for ignored files no longer reappear on every scan
- H-3: Mark-as-Safe now calls record_fixed_finding() so findings stop reappearing in historical scan records

---

## [2.9.28.53] - 2026-04-29

### Fixed
- Snapshot restore: legacy snapshots (pre-v2.9.28.52, no meta.json) now restore correctly via server-side disk scan fallback; inner plugin directory was never mangled so recovery is reliable for standard WP plugin layouts.
- Snapshot restore: rollback target slug now derived server-side as `dirname($plugin_file)`, preventing a silent no-op where rollback created a non-existent directory while leaving the actual bad plugin in place.
- Snapshot restore: empty-string `plugin_file` parameter no longer bypasses API regex validation (defense-in-depth).

### Added
- "Legacy" amber badge in snapshot list for snapshots created before v2.9.28.52, indicating restore path is recovered via disk scan rather than embedded metadata.

---

## [2.9.28.52] - 2026-04-28

### Fixed
- **Snapshot slug separator** — `sanitize_file_name()` was stripping `/` from plugin slugs like `hostinger-reach/hostinger-reach.php`, producing `hostinger-reachhostinger-reach.php` and causing `invalid_plugin_file` 400 errors on every restore attempt. The separator is now preserved by splitting on `/` before sanitizing only the directory component.
- **Snapshot meta.json persistence** — A `swisswpsuite-meta.json` file is written alongside each new snapshot to persist the full `plugin_file` path, surviving the sanitization boundary and making the field available to the restore call.
- **SnapshotList restore payload** — Both restore steps (step 1 and step 2 confirmation) now send `plugin_file: snap.plugin_file ?? snap.slug`, ensuring the correct `folder/file.php` format reaches the restore API instead of the mangled slug.

### Infrastructure
- **VPS Nginx timeout** — `proxy_read_timeout` raised from default 60 s to 130 s on `/v1/sentinel/` and `/v1/ai/` location blocks, eliminating 504 Gateway Timeout errors on long Groq Compound AI analysis calls (which have a 120 s axios timeout on the Node.js side).

---

## [2.9.28.51] - 2026-04-28

### Security
- **Conditional comment SQL bypass closed** — MySQL conditional comment blocks (`/*!...*/`) extracted during SQL import are now validated through `is_dangerous_import_sql()` before execution, preventing an attacker from wrapping forbidden SQL in a conditional comment to bypass the import filter.
- **2FA brute-force protection via CSRF nonce** — The pre-authentication 2FA challenge form now emits a WordPress nonce (`swisswpsuite_2fa_verify`) and the POST handler verifies it with `wp_verify_nonce()`, blocking CSRF-assisted brute-force attacks on the code input.
- **Atomic token deduction** — `deduct_tokens()` now uses a single atomic SQL `UPDATE … WHERE CAST(option_value AS SIGNED) >= $amount` instead of a read→compute→write sequence, eliminating the race condition where two concurrent AI requests could both observe a sufficient balance and double-spend tokens.

### Fixed
- **Update Guard enable/disable toggle** — The master guard switch was read-only (`StatusBadge` had no click handler). A full ARIA `role="switch"` toggle is now rendered in the card header; clicking it sends `POST /update-guard/settings {enabled, mode}` with an optimistic UI update and automatic revert on failure.
- **Update Guard URL allowlist editor (Pro)** — The `url_allowlist` field was defined in types and handled by the API but had no UI. A Pro-gated textarea now renders the current allowlist (loaded from `GET /update-guard/status`) and saves changes via the settings endpoint.
- **SEO on-page audit scope** — The batch post fetch used `post_status => 'any'`, causing draft, private, and trashed content to appear in per-post SEO scores while the dashboard counter only includes published posts. Changed to `post_status => 'publish'` for consistency.
- **PHP 8.0 nested ternary fatal** — Three ambiguous nested ternaries in `class-swisswpsuite-core.php` (SEO result field extraction) replaced with null-coalescing chains (`?? ??`); PHP 8.0+ treats unparenthesized nested ternaries as a fatal deprecation.
- **Hook `accepted_args` mismatch** — `SwissWP_Abilities` registered two zero-parameter action callbacks with implicit `accepted_args=1`; corrected to explicit `10, 0`.

### Added
- **`confidence_score` in Update Guard verdict** — `UpdateGuardLastVerdict` TypeScript interface now declares `confidence_score?: number` (0.0–1.0 float from the update scanner) so frontends can display a percentage without backend changes.
- **Config manifest: `admin_safelist_ips`** — `swisswpsuite_admin_safelist_ips` added to `SECURITY_SETTINGS` so the IP allowlist is snapshotted before import and restored by `post_import_recovery()`.
- **`autoload=false` on large options** — `swisswpsuite_banned_ips`, `swisswpsuite_admin_safelist_ips`, and all 7 SMTP settings now stored with `autoload='no'`; these options can grow large and should not load on every WordPress page request.

## [2.9.28.50] - 2026-04-27

### Added
- **WP AI Client routing tier (PR 2)** — `SwissWPSuite_Groq::call_api()` now checks for WordPress 7.0's `wp_ai_client_prompt()` before dispatching to the VPS Bunker proxy. When a user-configured AI Connector is present (Claude, GPT-4, Gemini), all text-mode AI calls route through WP AI Client (Tier 1) with automatic fallback to the Bunker proxy on failure. Vision calls and Groq Batch jobs are explicitly excluded (Tier 1 flag `$is_batch_call`). Zero call sites changed — routing is internal to `call_api()`. Synthetic response wraps WP AI Client output in the decoded shape callers already expect (json_mode decodes the JSON string; non-json-mode returns `['content' => ...]`). Gated on `SWISSWP_WP7 && function_exists('wp_ai_client_prompt')` — no behaviour change on WP 6.9.
- **Abilities API registration (PR 3)** — New `SwissWP_Abilities` class registers 4 abilities and 5 categories with the WordPress Abilities API (backported to WP 6.9). Abilities: `swisswpsuite/get-server-health` (synchronous), `swisswpsuite/scan-malware`, `swisswpsuite/sync-to-remote`, `swisswpsuite/enhance-seo-content` (all async — queue the operation and return a job reference). Guarded by `class_exists('WP_Ability')` rather than `SWISSWP_WP7` because the API was backported. All async execute callbacks return `{job_id/scan_id/batch_id, status_url}` immediately.
- **WP Connector admin notice** — Admin notice shown on WP 7.0 sites where no AI Connector is configured, informing users that Pro license works automatically but a personal connector is available.
- **Free-tier WP AI Client gate** — `wp_ai_client_prevent_prompt` filter blocks Tier 1 routing for non-Pro users, preserving the existing rate-limited Bunker proxy path.

## [2.9.28.49] - 2026-04-27

### Added
- **SWISSWP_WP7 feature gate** — New global constant exposes a boolean (`true` on WordPress 7.0+, `false` otherwise) computed once at plugin load from `$GLOBALS['wp_version']`. Phase A of the WordPress 7.0 migration plan; downstream Phase B/C code branches will key off this constant rather than re-querying the WP version at every call site. Zero behaviour change on WordPress 6.9 and earlier.
- **RTC collaboration defer for scheduled syncs** — `SwissWPSuite_Sync_Scheduler::run_job()` now checks `post_type_exists('wp_sync_storage')` (WordPress 7.0's Real-Time Collaboration session post type) before pushing content to a remote target. If a session is open, the job releases its flock, schedules itself 60 seconds later via `wp_schedule_single_event()`, and increments a per-job retry transient (`swisswpsuite_rtc_retry_<job_id>`). After 10 consecutive deferrals (~10 minutes) the job is abandoned with an `error`-level diagnostic so a stuck session never permanently blocks the sync queue. WordPress 6.9 and earlier are unaffected — the post type doesn't exist, so the guard short-circuits.

### Security
- **MySQL 8.0 SQL identifier hardening** — Sanitised all dynamic SQL identifiers (table and column names) in three backup-path classes against a strict `[a-zA-Z0-9_$]` allowlist before interpolation. Numeric `LIMIT`/`OFFSET` arguments now pass through `$wpdb->prepare()`. SQL identifiers cannot be parameterised by `$wpdb->prepare()`; the only safe pattern is sanitise-then-interpolate, and this PR applies it consistently.
  - `class-swisswpsuite-backup.php` — search-and-replace path (line ~7656). The previous raw-concat `LIMIT $offset, $limit` is now `$wpdb->prepare('... LIMIT %d, %d', ...)`.
  - `class-swisswpsuite-database-dumper.php` — `export_to_file()`. New private `safe_identifier()` helper applied to all 9 raw `$table` interpolations across `SHOW CREATE TABLE`, `DROP TABLE`, `SELECT COUNT(*)`, `SHOW KEYS`, `DESCRIBE`, keyset-pagination `SELECT`, `INSERT INTO`, and OFFSET-pagination `SELECT`.
  - `class-swisswpsuite-logger.php` — `get_logs()` and `get_log_count()`. Both raw `$table` interpolations now sanitised.
- **Migration receiver `mysqli_real_escape_string()` tracker entry (TD-58)** — All 10 occurrences in `swisswp-receiver-template.php` carry inline TODO comments and are tracked in `docs/TECHNICAL_DEBT.md` for a future prepared-statement refactor. No behaviour change in this release — `mysqli_real_escape_string()` works correctly under MySQL 8.0; the markers exist to surface the call sites in greps for the eventual rewrite.

---

## [2.9.28.48] - 2026-04-25

### Fixed
- **F-318 (CRITICAL) — Queue state lost when generate_faq() throws** — `generate_faq()` calls `wp_remote_post()` which under server overload can throw `WpOrg\Requests\Transport\Curl` TypeError. Previously the exception escaped the foreach AND the trailing `update_option('swisswpsuite_seo_bg_queue', $queue)` was unreachable, silently discarding ALL batch progress including items whose SEO meta had already been written. The FAQ call is now wrapped in `try/catch(\Throwable)` (FAQ failure logs a warning and continues — the item's core SEO meta is preserved), and the queue save was MOVED inside the `finally` block alongside lock release.
- **F-319 (CRITICAL) — Atomic semaphore lock for SEO background queue** — The prior `get_option → check → update_option` lock acquisition was a TOCTOU race. Two processes (WP-Cron + REST poll) could simultaneously observe "no lock", both then `update_option`, and both believe they hold it. Replaced with the proven `INSERT IGNORE INTO wp_options ... + rows_affected===1` pattern (same as the Full AI L1/L2 mutex from F-298). A stale-clean `DELETE WHERE option_value < threshold` runs first because this lock is process-wide and a crashed holder would otherwise block all future runs forever.
- **F-320 (HIGH) — Permanent-failure marker overwritten by trailing update_post_meta** — In both attachment and text branches, after distinguishing permanent failures (`rate_limited`/`timeout`/`upstream_error` — gets a `'permanent_failure: <code>'` marker) from transient failures, a trailing `update_post_meta()` ran for BOTH branches and clobbered the marker with the raw error message. The trailing call is now inside the `else` branch only. The permanent-failure marker survives, distinguishing "do not retry" from "transient" failures in the UI.
- **F-321 (CRITICAL) — Perpetual 503 loop bricked the queue forever** — `get_background_seo_status` unconditionally returned 503 whenever `permanently_failed` contained any entry. Since `permanently_failed` is append-only, a single rate-limited item at the start of a 700-item batch caused every subsequent poll to return 503 indefinitely, even when many pending items remained. The API-side block has been removed; `skip_until` is now armed once-per-new-permanent-failure inside `core.php`'s `finally` (by snapshotting the count before/after the foreach) and read by the existing 30-second staleness window. The status handler is now strictly read-only after inline processing — never mutates queue state.
- **F-322 (HIGH) — Lock TTL ≤ set_time_limit + DRY violation** — The lock TTL was 120 seconds and `@set_time_limit(120)` was also 120 seconds, meaning the holding process could outrun its own lock and a second holder could acquire while the first was still working. Additionally the magic 120 was duplicated in two files with no shared source of truth. Centralized as `SWISSWPSUITE_SEO_LOCK_TTL = 180` in `swisswpsuite-config-manifest.php` (loaded at `core.php:62` before any consumer). Both consumers read via `defined()`-guarded fallback to 180. 180 seconds gives a 60-second buffer over `set_time_limit(120)` for Groq HTTP latency.
- **F-323 (HIGH) — permanently_failed count never surfaced in the SEO banner** — The field has been present in the `/seo/background-status` response since v2.9.28.45 but `bgQueue` `useState` type omitted it, so the progress banner only showed `failed`. Items going to `permanently_failed` were invisible to the user even though they counted toward the progress percentage. Added `permanently_failed?: number` to the type and the banner segment "X permanently failed · " between `failed` and `estimated_minutes`.
- **F-324 (MEDIUM) — Toast.warning had no stable id; rate-limit toasts piled up** — In a sustained 503 window each poll fired a fresh toast, stacking dozens of duplicate "SEO processing paused" toasts. Added `{ id: "seo-rate-limited" }` to the `toast.warning` call. Sonner replaces an existing toast with the same id rather than stacking, so each retry merely refreshes the on-screen message.

## [2.9.28.47] - 2026-04-25

### Fixed
- **CRITICAL fix — Wrapped Groq call sites in try-catch(\Throwable)** — The previous fix (v2.9.28.46) incorrectly wrapped `wc_get_product()` in try-catch, which is pure local data access and makes no HTTP calls. The actual `WpOrg\Requests\TypeError` ("Argument #3 must be of type array|string, boolean given") propagates from the underlying `WpOrg\Requests\Curl` transport inside `wp_remote_post()`. Both `generate_image_seo()` (line 921) and `generate_seo_meta()` (line 983) are now protected. If the transport throws, the item is moved to `failed` with a TypeError marker and the queue continues processing.

## [2.9.28.46] - 2026-04-25

### Fixed
- **SEO death-spiral fix** — When Groq returns `rate_limited`/504/timeout during background SEO processing, items are now marked permanently failed and never retried. A semaphore lock (`swisswpsuite_seo_bg_lock`) prevents WP-Cron and REST poll from racing. The status endpoint returns HTTP 503 with `retry_after` when the lock is held or skip window is active. `SeoManager` respects `retry_after` and reschedules polling at that interval instead of always 10s.

## [2.9.28.45] - 2026-04-25

### Fixed
- **F-310 (BUG #9, CRITICAL) — Content rewrite completely broken** — `SwissWPSuite_Groq::call_api()` retry on `json_validate_failed` was re-posting the SAME body with the SAME `response_format=json_object`, so retries failed at the same ~5-10% rate as the first call (compounded ~90% terminal failure rate on `rewrite_content`). The retry now strips `response_format` from the body; the in-prompt "Output strictly JSON" instruction keeps Groq emitting JSON without the strict schema validator. Recovers the 5-10% of content-rewrite calls that were failing terminally.
- **F-311 (BUG #6, HIGH) — SEO 500-item batch silent data loss** — `start_seo_batch`, `submit_background_seo`, and `queue_bulk_seo` were rejecting requests with >500 IDs as 400 errors and silently dropping the overflow. All three handlers now process the first 500 and return `{accepted_count, dropped_count, dropped_ids[]}`. `SeoManager` surfaces the dropped count via a warning toast: "X items were not queued — please run Queue All again to process them."
- **F-312 (BUG #4, HIGH) — Ban IP column missing from Security Event Log** — The per-row Ban IP button (regression from F-004 organism extraction) is restored. `SecurityLogsPanel` accepts optional `onBanIp` + `bannedIps` props and renders an "Action" column with a one-click Ban IP button per row. Already-banned IPs show a grayed-out "Banned" badge instead.
- **F-313 (BUG #5, MEDIUM) — Page load 10+ seconds on Security tab** — Mount-time `Promise.all` was firing 10 concurrent REST calls. Two-phase mount: 6 critical fetches (status, logs, sentinel, hardening, banned IPs, latest scan) finalize the loading state and gate the default tab paint; 4 non-critical fetches (deep scan, geo, environment, abandoned plugins) are deferred to 100ms after mount via `setTimeout`. Cuts blank-screen time substantially on Hostinger shared hosting.
- **F-314 (BUG #1, MEDIUM) — Scan list not sorted by severity** — `transform_l1_to_ai_audit_result()` now `usort()`s findings by severity rank (Critical=1, High=2, Medium=3, Low=4, Info=5) before returning. Stable sort preserves detection order for ties.
- **F-315 (BUG #2, MEDIUM) — "Mark as Safe" tamper-detection** — Companion option `swisswpsuite_security_ignored_path_hashes` stores a SHA-256 hash for each whitelisted file at the time of marking. The scanner verifies the stored hash against the file's current hash on each scan; mismatch evicts the entry from the allowlist and re-flags the file. Defends against benign-file → malware swaps on whitelisted paths.

### Closed
- **F-316 (BUG #3, LOW) — Email report wrong address** — Closed as INVALID / NOT_REPRODUCIBLE. Code trace verified that the save endpoint and the mailer read the same option key (`swisswpsuite_scan_report_email`); save flow uses AJAX `onBlur` per project rules. Reported "wrong address" likely originated from `admin_email` fallback when the user's input failed `is_email()` validation.

---

## [2.9.28.44] - 2026-04-24

### Fixed
- **F-303 Update Guard routes 404** — Corrected load order in `class-swisswpsuite-core.php` so `define_api_hooks()` sees `SwissWPSuite_Api_Update_Guard` via `class_exists()` and registers all 9 `/update-guard/*` routes on `rest_api_init`. Eliminates ~15 404s per page load on the Security tab.
- **F-304 WooCommerce cart/checkout with hardening** — Hardening REST allowlist now explicitly covers `/wc-auth/v1/` (cart authentication) and `/wc/store/v1/` (Blocks-based Store API). Logged-out guests can complete checkout with "Limit What Strangers Can See" enabled.
- **F-305 SEO score consistency** — `seo_score` is now the simple integer mean of the three breakdown metrics (on-page + technical + content). The dashboard headline is always consistent with the visible "SEO Health Breakdown". Dashboard tile renamed to "Overall SEO Score" with subtitle "Mean of on-page, technical & content". Breakdown heading renamed to "SEO Health Breakdown" with composite description.
- **F-309 backup automation — missing cron command** — When "Disable Visitor-Triggered Scheduling" is enabled, the backup banner and the hardening confirmation modal now display the exact server cron command with the site URL prefilled, so users can paste it directly into their hosting control panel.
- **F-301 post-migration verification missing endpoints** — New `GET /migration/post-check` and `GET /license/status` endpoints return site URL, active theme, plugin count, admin user count, and license status. Migration Station no longer shows "unknown" for these fields.
- **F-302 BasicScanResults dead code** — Removed orphaned import, legacy `scanning`/`scanResults`/`basicScanExpanded` state, and the orphaned `handleScan` function from `SecurityHub.tsx`.

### Resolved
- **F-306 Update Guard frontend 404s** — Automatically resolved by the F-303 load-order fix. 6 frontend call sites (`SecurityHub`, `UpdateGuardCard`, `SnapshotList`, `UpdateReviewPanel`, `UpdateBlockedBanner`) now hit real endpoints.

### Closed
- **F-307** — Closed as INVALID / NOT_REPRODUCIBLE. The Freemius SDK is not bundled or integrated in this plugin; no "Contact Support" link exists in the UI; the premise (plugin UI showing `plugin_version=2.8.8`) cannot be reproduced against the current code.

---

## [2.9.28.43] - 2026-04-24

### Changed
- **F-005 god-class extraction — FINAL:** All remaining Security-tier REST routes (~1,770 lines) extracted from `class-swisswpsuite-api.php` into new `SwissWPSuite_Api_Security` (`class-swisswpsuite-api-security.php`). The monolith is now a lean route coordinator (~337 lines, down from ~12,000+ at sprint start). 10 modular API classes now own their domains: Backup, Sync, SEO, Content, 2FA, Geo, Hardening, Update-Guard, Settings, Migration, Security.
- **F-004 React organism extractions:** `ScanHistoricalRecord`, `BasicScanResults`, and `SecurityLogsPanel` extracted as reusable organisms from `SecurityHub.tsx` to reduce god-component complexity.
- **F-004 Zustand store foundation:** New `plugin/src/store/useScanStore.ts` establishes the Zustand-based state convention for scan results (aiAuditResult, malwareResult, fullAiResult). Per-field selectors plus dedicated `updateXxx` functional-update helpers keep call-sites clean.

### Internal
- `class-swisswpsuite-api-security.php` registers scan, firewall, hardening-dashboard, 2FA-admin, logs, and quarantine routes.
- `useScanStore` is the first Zustand slice in the codebase — follow its pattern for future store extractions.
- `LogAdvisorModal` extraction blocked at 9+ props (exceeds 8-prop limit); follow-up requires a shared `useLogAdvisor()` hook first.
- Documentation: `docs/capabilities/SEO_CAPABILITIES_REFERENCE.md` refreshed for v2.9.28.43 (F-228); `public/PRIVACY_POLICY.md` sub-processor disclosure tightened to list Patchstack, WPScan, and Groq use-cases explicitly (F-229).

---

## [2.9.28.42] - 2026-04-24

### Changed
- **F-005 god-class extraction:** Migration, export, import-status, diagnostics, deep-scan reset, and batch-queue-status REST routes (17 routes, ~650 lines) extracted from `class-swisswpsuite-api.php` into new `SwissWPSuite_Api_Migration` (`class-swisswpsuite-api-migration.php`, 954 lines). Monolith reduced from ~4,950 to ~4,300 lines. Tombstone comments at all removed sites. Zero behavior change.

### Internal
- `class-swisswpsuite-api-migration.php` loaded unconditionally in the essentials array in `core.php` — `/batch/status` (used by the SEO frontend) and `/diagnostics/analyze` must remain available without the `backup_cloud` capability. Per-handler `check_pro_permission()` enforces `backup_cloud` on export/import/migration routes.
- Standalone guard (`defined('SWISSWPSUITE_SENTINEL_STANDALONE')`) preserved — backup/migration routes are skipped in standalone mode, matching original monolith behavior.
- `deep-scan/reset` extracted from an inline closure into a named method `reset_deep_scan()`.

---

## [2.9.28.41] - 2026-04-24

### Changed
- **F-005 god-class extraction:** All Settings, License, SMTP, Cache, Maintenance, and Debug REST routes (19 routes, ~2,152 lines) extracted from `class-swisswpsuite-api.php` into new `SwissWPSuite_Api_Settings`. Follows the same modular pattern established by `Api_Backup`, `Api_Sync`, `Api_Seo`, `Api_2fa`, `Api_Geo`, and `Api_Hardening`. Monolith reduced from ~7,102 to ~4,950 lines. Tombstone comments left at all removed sites. Zero behavior change on existing routes.

### Fixed
- `ping_custom_api_url()` in `SwissWPSuite_Api_Settings` used `defined('SwissWPSuite_Groq::MODEL_FALLBACK')` which is invalid PHP — `defined()` only resolves global `define()` constants. Corrected to `class_exists('SwissWPSuite_Groq') ? SwissWPSuite_Groq::MODEL_FALLBACK : 'llama-3.3-70b-versatile'`.

### Internal
- `class-swisswpsuite-api-settings.php` loaded unconditionally in the essentials array in `core.php` (settings/license are core-tier, no capability gate).
- SSRF guard in `ping_custom_api_url()` delegates to `SwissWPSuite_Api::validate_external_url()` (public static on monolith) via `class_exists()` + `method_exists()` guards — avoids duplicating 50 lines of IP-range validation.
- Static license cache pattern (M-6) applied in `check_capability()` to avoid re-reading license from DB on repeated calls.

---

## [2.9.28.38] - 2026-04-24

### Fixed
- **Scan-tab banner "Last grade" now auto-refreshes after a manual Full AI Scan completes (F-300):** The React `scanReportConfig` state is fetched once on mount, but the Full AI Scan completion path only called `setFullAiResult(finalResult)` (re-rendering the scan card) without re-fetching `/security/scan/report-config`. The server-side stamp written by v2.9.28.37 Bug 3 was being produced correctly — the banner just never asked for it. `pollFullAiJobToCompletion()` in `plugin/src/components/SecurityHub.tsx` now re-fetches the scan report config on the `status==='complete'` branch and calls `setScanReportConfig(refreshed)` so the banner updates without requiring a tab switch or page reload. Silent catch on network failure matches the existing mount-time pattern — if the refetch fails, the banner keeps its prior state and the scan success path is unaffected.

### Internal
- Pure React state-sync fix — no PHP, VPS, TypeScript types, REST routes, or `wp_options` keys changed. 15 LOC added to one function in `SecurityHub.tsx`. Reuses the already-imported `wpApi` and `ScanReportConfig` type.

---

## [2.9.28.37] - 2026-04-23

### Fixed
- **`count_active_defenses()` now returns an accurate count (Bug 1):** The L1-fallback posture bonus helper checked only 7 defensive signals but reported the result as `active_defenses: 0` on the L2 success path because the method was never called there. Expanded the signal set to 11 (WAF, per-user 2FA, geo-blocking or Cloudflare, XML-RPC disabled, file-editor disabled, login protection, WP version hidden, auto-updates, PHP execution blocked in uploads, user enumeration blocked, bad-bot or LLM crawler limits) and moved the call out of the L1-only branch so the `active_defenses` field in the AI result is always accurate regardless of L1 or L2 path. The bonus application itself still runs only in the L1 fallback — L2 grade is never modified. Bonus thresholds re-scaled (`>=7` for +2, `>=4` for +1) to preserve intent at the new ceiling.
- **L2 (Groq) prompt now factors hardening posture into the overall grade (Bug 2):** A "bulletproof" site with nine active defenses and only eight configuration findings was receiving the same Grade D from Groq as a completely unprotected site. The AI already received per-feature `active_protections` for per-chain blocking, but had no aggregate posture signal to weight the overall grade. `SwissWPSuite_Sentinel_Security::get_site_context()` now injects a concise `hardening_posture` object — `{ active_count, total_count, summary }` — which the VPS prompt (`vps/command-center/routes/v1/sentinel.js::buildSentinelPrompt()`) surfaces as a single HARDENING POSTURE line instructing Groq to weight defensive breadth into the security grade when there are no verified critical RCE findings. Backward compatible: the field is optional, prior VPS versions ignore it without breaking.
- **Banner "Last grade" no longer stale after a manual Full AI Scan (Bug 3):** `GET /security/scan/report-config` returns `last_scan: {ts, tier, grade}` which the top-of-tab banner renders. Previously this value was only written by the scheduled-email cron (`run_daily_report()`) — a manual Full AI Scan updated the scan card but left the banner showing a months-old grade. `get_scan_full_ai_status()` now updates `swisswpsuite_last_scan_report` at the moment the state machine transitions to `'complete'`, stamping `{ts: time(), tier: 'pro', grade, source: 'manual_full_ai'}`. Written with `autoload=false`. Only successful completions update the value — errors, timeouts, and Phase 2 exceptions leave the prior record untouched.

### Internal
- New private helper `SwissWPSuite_Scan_Orchestrator::get_posture_snapshot()` and its public wrapper `build_posture_snapshot()` centralise the posture-reading logic so it is computed once and consumed in two places: the L1 fallback grade bonus and the L2 VPS prompt injection. Avoids duplicating the 11-signal read across files.
- No new `wp_options` keys — all reads use manifest-verified keys (`swisswpsuite_firewall_enabled`, `swisswpsuite_login_protection_enabled`, `swisswpsuite_geo_settings`, `swisswpsuite_hardening_settings`, `swisswpsuite_auto_update`). The only write is the existing `swisswpsuite_last_scan_report` key (OPERATIONAL_STATE, autoload=false), same shape as the cron-path writer.

---

## [2.9.28.36] - 2026-04-23

### Fixed
- **Full AI Scan grade jitter eliminated (Bug 1):** When the Layer 2 (AI) call to the VPS fails — network issues, rate limits, or VPS downtime — the scan previously fell back to a finding-count formula that writes a harsh grade (1 HIGH = D) to history, making the security grade visibly drop from C to D even though the site itself did not change. `plugin/includes/security/class-swisswpsuite-scan-orchestrator.php::run_l2_phase()` now looks up the most recent genuine L2 grade from the last 30 days and, if that prior grade is strictly better than the current L1 fallback, inherits it (tagged `grade_source='inherited'`, with a note in the summary: "grade inherited from previous AI scan on YYYY-MM-DD — AI analysis unavailable."). When no prior good grade exists, the fallback grade is capped at 'C' (`grade_source='l1_capped'`) — the error path never writes D or F again. Earned A/B grades always survive; the floor only raises toward C, never lowers toward D.
- **Hardening posture now factors into the L1-fallback grade (Bug 2):** The L1-only grading formula was purely finding-count driven, so a fully hardened site with one HIGH finding scored the same D as a completely unprotected site with one HIGH finding. After the base L1 grade is computed, if the grade is D/C/B, the orchestrator now counts seven active defensive controls (WAF, per-user 2FA, geo-blocking or Cloudflare at the edge, XML-RPC disabled, file-editor disabled, login limiter, WP version hidden). Five or more active defenses raises the grade two steps (D→B, C→A, B→A); three or four active defenses raises it one step. F-graded sites are intentionally ineligible (a CRITICAL finding means the site is compromised regardless of posture). A-graded sites are already at the ceiling. The Layer 2 (AI) grade is never modified by posture bonus — L2 already accounts for defensive posture in its own reasoning.
- **New public method `SwissWPSuite_Sentinel_Security::get_last_good_l2_grade( int $days = 30 )`:** Queries `wp_swisswpsuite_sentinel_scans` for the most recent row with `status='complete' AND scan_type='full_ai' AND grade IS NOT NULL AND created_at >= NOW() - INTERVAL $days DAY`. Read-only, `$wpdb->prepare()`-parameterised, clamped to a 1–365-day window. Returns `['grade', 'scan_id', 'created_at']` or `null`. Supports the Bug 1 inheritance logic without schema changes.

### Internal
- New additive fields in the AI result array: `grade_source` (`'l2' | 'l1_fallback' | 'inherited' | 'l1_capped'`) and `active_defenses` (0–7). Not declared on the TypeScript `AiAuditResult` / `FullAiScanResult` interfaces; present in the JSON payload for diagnostics log readability and future UI surfacing.
- All hardening-state reads verified against `swisswpsuite-config-manifest.php`: keys `swisswpsuite_firewall_enabled`, `swisswpsuite_login_protection_enabled`, `swisswpsuite_geo_settings`, `swisswpsuite_hardening_settings` (for `disable_xmlrpc`, `disable_file_editor`, `hide_wp_version`). Per-user 2FA check matches the existing project idiom in `SwissWPSuite_Sentinel_Security::get_active_protections()`.

---

## [2.9.28.35] - 2026-04-23

### Fixed
- **Bulk "Check with AI" sent descriptive text as the file path (CRITICAL UX bug):** The Full AI Scan bulk analyze flow in `ScanResultPanel.tsx` was sending `finding.evidence` verbatim as the `file` parameter to `POST /security/analyze-file`. For file findings that works ("wp-content/plugins/foo/bar.php"), but for configuration/network/header/plugin-inventory findings, `evidence` is descriptive text such as `"wp-config.php (0644) — group or world readable"` or `"No CF-Ray or CF-Connecting-IP headers detected"` — which failed server-side `file_exists()` and returned an error, producing a silent UI failure. Added a `classifyFindingForAi()` categorizer that inspects `fix_type`, `integrity_category`, and evidence pattern to decide whether a finding targets a real on-disk file; when it does, a clean file path is extracted via `extractPathFromEvidence()` before the API call.
- **Non-file findings now receive a friendly inline message (UX):** When the user selects configuration/network/header findings and clicks "Check N with AI", each non-file finding now renders an inline neutral info block — `"This finding is a configuration check — there's no source file to analyze. Review the remediation steps above."` — instead of failing silently. Mixed selections run AI on real file findings and skip the rest with a single summary toast (`"Analyzing N files with AI — M configuration findings skipped (see inline notes)"`).
- **`/security/analyze-file` returns 400 (not 404) for invalid path (backend):** In `plugin/includes/api/class-swisswpsuite-api.php::analyze_security_file()`, when the resolved path does not exist, the response now returns HTTP 400 with `{success:false, code:"invalid_file_path", message:"The provided path is not a valid file."}` instead of HTTP 404 + `file_not_found`. This is the correct status for a client-side input problem (the path is malformed or nonexistent), and the frontend categorizer is the primary defense anyway. All existing path-traversal and ABSPATH-containment checks are unchanged.

---

## [2.9.28.34] - 2026-04-23

### Changed
- SecurityHub.tsx and vps/ai.js reformatted with Prettier (no logic changes)

### Internal
- Archived 19 old session/socratic audit reports to `.claude/audit-reports/archive/`

---

## [2.9.28.33] - 2026-04-23

### Fixed
- **F-298 — Full AI Scan mutex fallback was not truly atomic:** The v2.9.28.30 fallback branch used `add_option()` (which internally issues `INSERT ... ON DUPLICATE KEY UPDATE`), allowing two concurrent pollers to both see `get_option() === false` AND both receive `true` from `add_option()` — defeating the CAS guarantee on hosts without a persistent object cache. Both Phase 1 and Phase 2 fallback blocks now perform a direct `INSERT IGNORE INTO {$wpdb->options}` via `$wpdb` and check `$wpdb->rows_affected === 1`. `INSERT IGNORE` on the unique `option_name` key is MySQL-atomic: exactly one concurrent request wins.
- **F-299 — Billing lock not released on exception in `/batch/results`:** After the CAS claim flips `batch_jobs.status` to `'billing'`, any `db.query()` throwing inside the billing block (connection drop, deadlock, constraint) caused the outer `catch` to return 500 while leaving the job permanently stuck in `'billing'`. The billing block is now wrapped in its own try/catch that resets status back to `'pending'` (best-effort) before re-throwing to the outer handler, so the client can retry. The exception is logged with event `batch_billing_exception_released`.

### Internal
- Regression baseline RB-388 grep command rewritten to avoid fragile shell quoting of `$this->`.

---

## [2.9.28.32] - 2026-04-23

### Fixed
- **F-296 — Full AI Scan phase hint lingers on completion:** `pollFullAiJobToCompletion` now clears `fullAiPhaseMessage` to an empty string inside the `envelope.status === 'complete' && envelope.result` branch, immediately before returning. Previously, the ScanCard briefly rendered "Sending to AI for analysis…" in the same paint frame as the success toast.

---

## [2.9.28.31] - 2026-04-23

### Fixed
- **F-292 — Atomic billing claim on `/batch/results`:** The token-deduction block in `vps/command-center/routes/v1/ai.js` ran inside `if (job.status === 'pending')` without an atomic claim. Two concurrent `/batch/results` requests sharing the same stale `pending` read could both deduct tokens. The block now performs a compare-and-set `UPDATE batch_jobs SET status = 'billing' WHERE id = ? AND status = 'pending'` before any deduction; only the request whose update returns `affectedRows > 0` performs the deduction, others fall through to return results without re-charging. The final `UPDATE` is guarded by `status = 'billing'`. Internal `billing` status is mapped to external `processing` in the `/batch/status` response so the TypeScript `BatchStatus` union is unchanged. A `/batch/cancel` arriving during the transient `billing` window is rejected with a `batch_cancel_during_billing` log warning.
- **F-293 — Route-level Pro gate on Full AI Scan:** `/security/scan/full-ai`, `/security/scan/full-ai/start`, and `/security/scan/full-ai/status` now combine `check_permission()` and `check_capability('sentinel_pro')` in their route `permission_callback`. The existing in-body `sentinel_pro` check is retained as defense-in-depth.

---

## [2.9.28.30] - 2026-04-23

### Fixed
- **F-291 — Dual-path mutex on Full AI Scan phase transitions:** `get_scan_full_ai_status()` had no mutex between reading `state['status']` and writing the next status, so two concurrent `/status` polls could both see `pending` and both run Layer 1, or both see `l2_pending` and both persist Layer 2. Both phase entry blocks now acquire a per-job lock via a dual-path CAS — `wp_cache_add` primary (for hosts with a persistent object cache) and `add_option` INSERT IGNORE fallback (for hosts without one). The lock is released in a `finally` block. Losers return the current state without re-entering the phase body.

---

## [2.9.28.29] - 2026-04-23

### Fixed
- **FAQ generation missing module attribution:** `generate_faq()` was the only Groq method missing the `module` field in its request body. All FAQ generation token usage was logged as `module: 'unknown'`. Module now correctly set to `sentinel_seo`.
- **Batch expiry cron double-refund race:** If `/batch/results` was fetched at the exact moment the hourly expiry sweep ran on a job older than 25 hours, both paths could process the same row, causing a double token refund. The expiry `UPDATE` now includes `AND status = 'pending'` to act only on jobs not yet completed or cancelled by the results path.

---

## [2.9.28.28] - 2026-04-23

### Fixed
- **"Check with AI" 404 on all files:** `isMissingFileFinding()` was checking `f.category` ("File System") instead of `f.integrity_category` ("known_safe_missing" etc.) because the orchestrator transform was stripping the field. Added `integrity_category` passthrough to the PHP transform; TypeScript filter now reads the correct field.
- **AI module attribution lost:** All 9 Groq methods were missing the `module` field in request bodies — token usage was recorded as `'unknown'` in all logs. Module field now correctly set on all calls.
- **Groq 502/504 silent failures:** Upstream errors failed immediately with no retry. A single retry after 0.5 s (`usleep(500000)`) is now attempted before surfacing the error to the user.
- **AI buttons active at zero balance:** "Check with AI", "Analyze Logs", and "Analyze Firewall" buttons were enabled even with insufficient token balance, only failing after the API call. Buttons are now disabled with a tooltip showing required token count.
- **Frozen UI on long AI calls:** AI calls taking 15–60 s showed no feedback. A persistent info toast now appears when a call starts, and the button label shows elapsed seconds after 5 s.
- **Batch tokens deducted at retrieval:** Tokens were deducted when fetching batch results, allowing jobs to be submitted beyond the available balance. Tokens are now atomically reserved at submission with reconciliation at retrieval and full refund on cancel.
- **Double-retry cascade:** Combining 502 retry + json_validate_failed retry could produce 3 Groq API calls on 502→400 sequences. Both retry paths now share a `_retried` flag to prevent cascading.

### Added
- **Redis AI response caching:** Deterministic SEO and content AI calls are cached in Redis (TTL: 24 h SEO, 1 h content). Security and migration calls are never cached. Cache hits return in <100 ms at zero token cost.
- **balance_remaining in API responses:** `/security/analyze-file`, AI audit, and full-AI scan endpoints now return `balance_remaining` so the UI can refresh the token balance display without an extra round-trip.
- **Batch token reservation migration:** DB migration `v18` adds `estimated_cost` and `tokens_reserved` columns to `batch_jobs` with full backward compatibility for legacy rows.
- **Stale batch expiry cleanup:** Pending batch jobs older than 25 hours are automatically refunded and marked `expired` by an hourly server-side cron.

---

## [2.9.28.27] - 2026-04-23

### Fixed
- **Bulk "Check with AI" fails for missing-file findings:** When users clicked "Select All" in the Full AI Scan results, the top findings were often about files that don't exist on disk (readme.html, missing core files, bundled plugin files). Sending these to `/analyze-file` correctly returns 404. The bulk handler now pre-filters: findings with category `known_safe_missing`, `core_missing`, or `bundled_plugin`/`theme_modified` with status missing are excluded before the AI chain runs. If ALL selected findings are non-analyzable, a descriptive error toast explains the situation. If only some are skipped, an info toast reports the count.

---

## [2.9.28.26] - 2026-04-23

### Fixed
- **Bulk "Check with AI" toast spam + false success:** Selecting files and clicking "Check N with AI" flooded the UI with "Analysis request failed — check your connection" toasts (one per file), then showed a false "AI analysis complete: N files processed" success toast even when zero files were analyzed. `handleAiAnalyze` now suppresses error toasts when called from bulk context (`options.bulk: true`) and rethrows so the chain can count failures. The summary toast now accurately reports `N of M files analyzed` on partial success or an error toast on total failure.

---

## [2.9.28.25] - 2026-04-23

### Fixed

- **Full AI Scan never completed on Hostinger (fifth attempt — definitive fix):** v2.9.28.21 through v2.9.28.24 all failed. Cron-based approaches (`wp_schedule_single_event` + `spawn_cron` in v21, `SwissWPSuite_Cron_Helper::spawn()` in v24) failed because Hostinger's egress firewall blocks WP-Cron loopback requests, so the scheduled job never fired. Inline-execution approaches (v22 running the scan inside the `/status` poll) failed because Hostinger's LiteSpeed edge CDN kills PHP workers at ~60 s while the combined L1+L2 scan takes 45-90 s, producing a 504 Gateway Timeout that lost the scan. The scan is now split into two phases driven by a state machine inside the `/status` polling endpoint itself: **Phase 1 (~30-45 s)** runs Layer 1 only (local filesystem/permission/config/environment audit with no VPS call), stores the raw findings in the job transient, and returns to the frontend; **Phase 2 (~15 s)** reads the Phase 1 state on the next poll, makes the VPS `sentinel/analyze` call with the pre-computed L1 findings, persists the combined result as a single history row, and returns the final `FullAiScanResult`. Each phase completes well under the edge timeout. If Phase 1 is killed at the edge, the transient state remains `pending` or `l1_running` and the next poll retries cleanly. If Phase 2 fails (VPS down, rate-limited, parse error), the orchestrator degrades gracefully to an L1-only result with a tagged summary — the scan never silently fails. The dead cron paths (`wp_schedule_single_event('swisswpsuite_fullai_scan_job', ...)`, the hook registration in `core.php`, the `dispatch_fullai_scan_job()` dispatcher method, and the `run_fullai_scan_job()` API callback) have been removed. The frontend `pollFullAiJobToCompletion` now surfaces phase-aware progress text ("Running security audit…" during Phase 1, "Sending to AI for analysis…" during Phase 2) on the Full AI scan card. `FullAiScanJob.status` TypeScript union widened to include the new intermediate states `'l1_running' | 'l2_pending' | 'l2_running'`.

---

## [2.9.28.24] - 2026-04-23

### Fixed

- **Full AI Scan 5-minute timeout regression:** v2.9.28.22 worked around Hostinger's blocked WP-Cron loopback by running the scan inline inside the `/security/scan/full-ai/status` poll handler if the job was still `pending` after 3 seconds. That "fix" turned every `/status` poll into a 30–90 second blocking request, which Hostinger's ~60s edge CDN killed with a 504 Gateway Timeout — the frontend never saw the completion and displayed *"Scan is taking longer than expected. Check back in a few minutes."* after the 5-minute polling cap. The inline-execution block in `get_scan_full_ai_status()` is removed entirely — `/status` is now a pure transient reader that always returns in under 100ms. The scan now fires in a dedicated WP-Cron loopback worker kicked off by `SwissWPSuite_Cron_Helper::spawn()` (unconditional, non-blocking, already proven by the SEO background queue on the same host class). The `dispatch_fullai_scan_job()` cron callback gains `set_time_limit(0)` + `ignore_user_abort(true)` so the worker outlives the scan regardless of FPM execution caps — mirroring the battle-tested pattern used by `class-swisswpsuite-backup-worker.php`.

---

## [2.9.28.23] - 2026-04-23

### Fixed

- **analyze-file path validator rejected valid in-root files (live-verified bug):** `POST /security/analyze-file` was returning `400 {"code":"invalid_path","message":"File path is outside WordPress root."}` for every single request in a 433-file DevTools test, including obviously in-root files like `readme.html` and `wp-content/themes/twentytwentythree/parts/comments.html`. The v2.9.28.21 patch normalized relative paths against `wp_normalize_path(ABSPATH)` but then compared the result (after `realpath()` resolved symlinks) against the un-resolved `wp_normalize_path(ABSPATH)`, so on Hostinger — where the WP root is reached via symlink — the two strings disagreed and the containment check failed. The validator is now rewritten end-to-end: every input is first converted to an absolute candidate (`ABSPATH + ltrim($file, '/')`), then `realpath()` is applied on BOTH that candidate AND `ABSPATH` so both sides of the containment check are in canonical symlink-resolved form. Missing files return `404 file_not_found` (instead of `400 invalid_path`) so the error is diagnostically clearer.
- **Defensive guard against unintended analyze-file bursts:** Chrome DevTools browser testing observed ~9 `/security/analyze-file` requests firing ~20 seconds after a Full AI Scan completed, with no user click in between. A full code audit found zero auto-trigger effects or render-time onClick invocations — every call path in the React tree is wired to an explicit click handler. As a defense-in-depth measure, `handleAiAnalyze` and the legacy `handleBulkAction('analyze')` path now short-circuit if a parent scan (Full AI / AI Audit / Malware / Deep) is still loading or polling, blocking any ghost-click or stale-state re-entrant fire during scan completion.

---

## [2.9.28.22] - 2026-04-23

### Fixed

- **Full AI Scan stuck on "pending" on Hostinger/LiteSpeed:** `spawn_cron()` fires a loopback HTTP request that LiteSpeed blocks, so the WP-Cron event was scheduled but never executed. The `/security/scan/full-ai/status` polling handler now detects a job still in `pending` state 3+ seconds after creation and executes the scan inline in the REST worker, using an atomic transient claim (`status: "running"`) as a concurrency guard to prevent double-execution by simultaneous polls. The `spawn_cron()` call in `start_scan_full_ai()` is retained for hosts that allow loopback but is now conditional on `DISABLE_WP_CRON` not being set.

---

## [2.9.28.21] - 2026-04-23

### Added

- **Async Full AI Scan (Bug 1 fix):** New REST endpoints `POST /security/scan/full-ai/start` and `GET /security/scan/full-ai/status?job_id=...` decouple the scan orchestration from the HTTP request. The previous synchronous `/security/scan/full-ai` route blocked the PHP worker while the VPS Layer 2 Sentinel ran, routinely exceeding Hostinger's ~60s edge timeout and returning an opaque 504. The new pattern returns a `job_id` in under a second, runs the scan in a WP-Cron single event (hook `swisswpsuite_fullai_scan_job`, registered in the config manifest), and stores the result in a job-keyed transient (10 min TTL). The frontend polls every 3 seconds until `status: 'complete'` or `status: 'failed'`. The original synchronous route is retained unchanged for backward compatibility.
- **Bulk "Check with AI" safety guardrails (Bug 2C fix):** All three bulk-AI buttons in Scan result panels (audit bulk bar, malware actionable bar, malware low-risk bar) now cap batches at 10 files per click. Selecting more than 10 opens an in-app confirmation modal ("Analyze first 10?") — no native `window.confirm()`. While the chain runs, the button shows a live progress counter ("Analyzing 3 of 10…"). A single summary toast fires on completion instead of per-file notifications.

### Fixed

- **analyze-file path validation (Bug 2A):** `POST /security/analyze-file` no longer returns `403 "File path is outside WordPress root"` for perfectly valid in-root files. Relative paths (e.g. `wp-content/themes/…/file.php`) are now resolved against `ABSPATH` with an explicit absolute candidate instead of bare `realpath()`, which was failing because PHP resolves relative paths against the script's cwd (undefined inside a REST request). Status code changed from `403` to `400` because path validation is bad input, not auth denied — unblocks the frontend error-surfacing path.
- **403 error messaging (Bug 2B):** `wpApi()` no longer maps every HTTP 403 response to "Authentication failed. Please refresh the page." Real 403s carrying a backend message (e.g. "AI analysis requires a Pro license.") now surface their actual message to the user. Empty-body 403s still fall back to the generic auth string.

### Changed

- **Full AI Scan frontend flow:** `SecurityHub.handleTriggerScan('full-ai')` now calls the new start-then-poll pattern instead of the synchronous route. Added `pollFullAiJobToCompletion(jobId)` with a 5-minute cap (100 polls × 3s), surfacing "Scan is taking longer than expected" to the user if the cron never fires.
- **`FullAiScanJob` interface** added to `types.ts` to model the new async envelope: `{ success, job_id, status: 'pending'|'running'|'complete'|'failed'|'not_found', result, message }`.
- **Cron hook manifest:** `swisswpsuite_fullai_scan_job` (single_event) registered in `SwissWPSuite_Config_Manifest::CRON_HOOKS` and wired to `SwissWPSuite_Core::dispatch_fullai_scan_job()` in `define_plugin_hooks()`. Dispatcher lazy-instantiates the API class at fire time (the core does not keep a persistent `$this->api` property).

---

## [2.9.28.20] - 2026-04-23

### Fixed

- **F-1 (HIGH, PHP):** `/security/scan/ai-audit` and `/security/scan/full-ai` handlers no longer swallow orchestrator errors. When `run_ai_audit()` / `run_full_ai_scan()` returns an array with an `error` key (e.g. `'Sentinel not available'`), the handler now returns HTTP 500 with `{success:false, code:'scan_failed', message}` instead of burying the error inside a `{success:true, result:{error:...}}` 200 OK envelope. Existing `rate_limited` (429) and `insufficient_tokens` (402) paths are preserved.
- **F-2 (MEDIUM, TS):** `SecurityHub.handleTriggerScan` now checks `envelope.success` immediately after `wpApi()` resolves and throws a user-friendly `Error` if the server reported failure. Prevents the frontend from storing a partial/undefined result and later crashing with `TypeError: Cannot read properties of undefined (reading 'length')` when rendering `result.summary`.
- **F-3 (MEDIUM, TS contract):** `AiAuditResult.tier` and `ScanHistoryRecord.tier` union widened from `'free' | 'pro'` to `'free' | 'pro' | 'none'` to match PHP `SwissWPSuite_Scan_Orchestrator::classify_tier()` output when no license is active. `FullAiScanResult` inherits the fix via extension.

---

## [2.9.28.19] - 2026-04-22

### Changed

- Restored filled button theme across all new Sprint 1.5 components: batch action buttons (Mark Safe, Quarantine, Delete, Analyze) in ScanResultPanel now use solid `swiss-navy`, `amber-600`, and `red-600` fills matching the canonical SwissSuite button design language
- UpdateReviewPanel Approve button: `bg-swiss-navy text-white` (was `bg-green-50 text-green-700`)
- UpdateBlockedBanner Override button: `bg-amber-600 text-white` (was `bg-white text-amber-700` outline)
- SeoManager action button aligned to secondary/navy theme

### Added

- "Check with AI" batch button in bulk action bar for all Pro scan result panels (AI Audit, Malware, Full Scan + AI) — selects N findings and runs AI file analysis sequentially; Pro-gated with Lock icon for free tier

---

## [2.9.28.18] - 2026-04-22

### Security

- **C-1**: Path-traversal guard added to `restore_update_guard_snapshot` before Step-1 token issuance — mirrors the existing guard in the delete handler; `realpath()` + `DIRECTORY_SEPARATOR` strpos pattern closes prefix-collision bypass
- **C-2**: `plugin_file` parameter validated with explicit `strpos(..)` check + regex before reaching `deactivate_plugins()` — prevents crafted `../sibling-plugin/x.php` from deactivating unrelated plugins
- **C-3**: VPS allowlist slug response filtered with `preg_match('/^[a-z0-9][a-z0-9\-]*$/')` before caching — empty strings and path fragments can no longer bypass scan for unrelated plugins
- **H-2**: `GET /update-guard/reviews` now requires `check_pro_permission` (was `check_permission` any-admin, inconsistent with Approve/Reject gates)

### Fixed

- **H-1**: `calculate_confidence()` promoted to `public static`; `post_apply_verify()` now calls `SwissWPSuite_Update_Scanner::calculate_confidence()` instead of duplicating 13-line inline scoring logic — eliminates drift risk
- **H-3**: `verify_integrity()` now fails closed (returns `false`) on unreadable, corrupt JSON, and empty array manifest — previously all three cases were fail-open, allowing partial-write snapshots to bypass integrity verification
- **H-4**: Rollback process lock file moved from web-accessible `wp-content/uploads/` root to `.htaccess`-protected `wp-content/uploads/swisswpsuite-snapshots/` subdir

---

## [2.9.28.17] - 2026-04-22

### Added

- Virtual Patching Phase 2: `review_first` and `block_on_match` modes in Update Guard
- `SwissWPSuite_Update_Scanner`: staged package scanner with VPS allowlist (3s timeout + 12-slug fallback)
- `SwissWPSuite_Update_Rollback`: 12-step atomic rollback with flock, sha256 manifest verify, opcache_reset
- SnapshotList, UpdateReviewPanel, UpdateBlockedBanner React components for Security Hub
- Two-step confirmation token on manual snapshot restore (CSRF-resistant)
- Override bypass for blocked updates (rate-limited to 3/hour per admin)

### Security

- Fixed slug path traversal in rollback engine (`basename(sanitize_file_name())` guard)
- Fixed symlink escape via `glob(GLOB_ONLYDIR)` in snapshot content directory resolution
- Fixed override transient never consumed — one-time bypass now correctly single-use

### Fixed

- WCAG 2.1 AA: 9 a11y findings fixed (APG radio keyboard, always-mounted live regions, role="alert" key cycling)
- `retry_after` response field in override rate-limit endpoint now uses `HOUR_IN_SECONDS` constant

## [2.9.28.16] - 2026-04-22

### Fixed

- **Update Guard `last_verdict` JSON shape.** `GET /update-guard/status` now returns `last_verdict: {}` (empty object) when no verdict has been recorded yet, matching the TypeScript contract `UpdateGuardLastVerdict | Record<string, never>`. Previously PHP `array()` serialised to JSON `[]` (empty array), which violated the expected object shape and could trip strict type checks in the frontend.
- **Snapshot directory `file_put_contents()` return checks.** `SwissWPSuite_Update_Snapshot::write_security_files()` now checks the return value of both `@file_put_contents()` calls (for `.htaccess` and `index.php`) and logs a warning via `SwissWPSuite_Diagnostics::log()` if the write fails. A silent failure here would leave the snapshot directory web-accessible.

---

## [2.9.28.15] - 2026-04-22

### Added

- **Virtual Patching Phase 1 — observe-only update interceptor.** `SwissWPSuite_Update_Guard` registers 4 WordPress upgrader hooks (`pre_auto_update`, `upgrader_pre_download`, `upgrader_source_selection`, `upgrader_process_complete`). In Phase 1, it never blocks — every hook is fail-open (try/catch on `\Throwable`, always returns unchanged values). Logs URL allowlist violations and post-update malware scan findings. Available to all tiers (Free + Pro).
- **Pre-update snapshots.** `SwissWPSuite_Update_Snapshot` copies plugin directories to `wp-content/uploads/swisswpsuite-snapshots/` before each update. Includes disk pre-flight check (<200MB free or slug dir >250MB → skip snapshot). Snapshots protected by `.htaccess` (Deny from all / Require all denied) + `index.php` stub. Auto-pruned daily by `swisswpsuite_update_guard_prune_snapshots` cron (TTL 14 days, quota 5 per slug).
- **Post-apply malware scan.** New `scan_directory()` method on `SwissWPSuite_Sentinel_Security` runs M1-B (suspicious file names) and M1-C (malware signatures) scoped to the updated plugin directory. Results stored in `swisswpsuite_update_guard_last_verdict` (autoload=false).
- **UpdateGuard REST endpoints.** `GET /update-guard/status` (enabled, mode, last verdict, snapshot count) and `GET /update-guard/snapshots` (list by slug). Admin-permission-gated.
- **Update Guard UI card.** New `UpdateGuardCard` React component in Security Hub (Security tab). Read-only Phase 1 view: phase badge, mode row (REVIEW FIRST + BLOCK ON MATCH disabled with tooltip), snapshot table with disabled Restore, live region for verdict announcements. WCAG 2.1 AA compliant.

---

## [2.9.28.14] - 2026-04-22

### Fixed

- **Malware Scan: "Check with AI" per-file button restored.** Sprint 1 deleted `ScanResultsTable.tsx` and replaced it with `ScanResultPanel.tsx`, which never received the `onAnalyze` prop or the per-row "Analyze" button. The handler (`handleAiAnalyze` → `POST /security/analyze-file`) and the AI analysis result modal were still present in SecurityHub.tsx but disconnected. This release rewires `onAnalyze`, `analyzingFile`, and `hasSentinelPro` props through `ScanResultPanel` → `MalwareResultView` and renders a Pro-gated "Analyze" button (Sparkles icon / Lock icon for Free) on each actionable threat row, restoring behavior that was present since v2.9.27.x.

---

## [2.9.28.13] - 2026-04-22

### Fixed

- **Malware Scan: bulk selection now works on clean sites.** The v2.9.28.11 bulk-action restoration only wired checkboxes + batch action bar to the "Actionable threats" block (medium/high/critical severity). On clean sites with zero actionable threats but many low-risk urlhaus-matched or bundled-plugin deviations, the bulk UI was invisible — forcing users to Ignore items one-by-one. This release adds an independent bulk-selection bar to the collapsed "Low-risk findings" section, with its own `selectedLow` state and wired to the existing `handleScanPanelBulkAction` handler (no backend changes). AI Audit + Full AI panels were already correct.

---

## [2.9.28.12] - 2026-04-22

### Changed

- Version bump for release pipeline (pre-commit zip-collision guard).

## [2.9.28.11] - 2026-04-22

### Fixed

- **AI Security Audit: restored bulk selection UI.** The select-all checkbox, per-row checkboxes, and batch-action bar (Mark N Safe / Quarantine N / Delete N) were silently dropped in v2.9.28.0 when `ScanResultsTable` was replaced by the new `ScanResultPanel`. The corresponding handlers still existed in `SecurityHub.tsx` as orphaned code. This release re-wires the selection UI into the new `ScanResultPanel` component and connects it to the existing `/security/bulk` endpoint via a new `handleScanPanelBulkAction` handler. Applies to AI Audit, Malware, and Full AI scan result panels. No backend changes required.

---

## [2.9.28.10] - 2026-04-22

### Fixed
- AI Security Audit: restored "Fix: ..." remediation text per finding (was silently dropped in v2.9.28.08 when the L1→AiAuditResult transform was refactored to use a separate `detail` field).
- AI Security Audit + Full AI Scan: restored per-finding **Quarantine** and **Mark Safe** action buttons. The new `ScanResultPanel` component was missing `onQuarantine`/`onMarkSafe` props and the findings were missing the `evidence` file path.
- PHP scan orchestrator now forwards `evidence`, `remediation`, and `fix_type` from L1 findings to the frontend (previously these were dropped by the transform).

---

## [2.9.28.09] - 2026-04-22

### Fixed

- **Quick Scan info banner accuracy.** Removed false claim that low-risk deviations are "reviewed by our AI". Quick Scan is local checksum and regex comparison only — no AI is involved. Updated banner text to accurately describe what the scan does.

## [2.9.28.08] - 2026-04-22

### Fixed

- **Quick Scan severity classification.** Quick Scan now assigns a severity per category (`bundled_plugin` + `known_safe_missing` = `info`, `theme_modified` = `low`, `core_missing` + `core_modified` = `high`) rather than hard-coding every finding as `medium`. Only `medium`/`high`/`critical` count toward the headline `threats_found` number — a clean site with 44 WordPress-baseline deviations (Akismet, Hello Dolly, readme files, theme customisations) now correctly reports **0 threats** instead of 44. The full list is still returned so the detail view can show everything.

### Changed

- **Quick Scan results UI.** Added an info banner explaining that expected deviations (bundled plugins, theme edits) are flagged for visibility but not counted as threats. Only modified core files or suspicious patterns are actionable. Added a collapsible "Low-risk findings (not counted as threats)" section below the actionable threats list.

## [2.9.28.07] - 2026-04-22

### Fixed (CRITICAL — WAF lockout incident)

- **Site owner locked out of WP Admin resolved.** A site owner reported that after a plugin upgrade, "half of the pages were blocked with a message saying this site was blocked due to multiple IP attacks" and they had to delete the plugin via cPanel file manager to regain access. Root cause: the activator was unconditionally forcing `swisswpsuite_firewall_simulation_mode = 'no'` on every upgrade/reactivation — flipping the WAF from observe-only to active-blocking without the admin's consent. False-positive pattern matches on normal frontend traffic then triggered the IP-reputation "five strikes" rule, banning the admin's IP for 30 minutes. Because `wp-login.php` is not `is_admin()`, the existing admin bypass did not apply — once the admin's IP was banned, there was no way back in from the browser. The WAF now:
  - Uses `add_option()` (idempotent) for all firewall defaults on activation, never `update_option()`. Existing user settings are now preserved on upgrade.
  - Ships with `simulation_mode = 'yes'` as the fresh-install default. The admin must consciously flip it off after reviewing the threat log. A red admin notice warns while simulation mode is active.
  - Maintains an **admin IP safelist** (max 3 entries, 30-day TTL): when a user with `manage_options` completes WordPress login, their IP is recorded. Safelisted IPs bypass the WAF entirely, including for wp-login.php and unauthenticated requests. The safelist is checked before the IP-reputation ban check.
  - **Skips pattern scanning on `wp-login.php`.** Login credentials can legitimately contain SQL/XSS-looking characters; scanning them caused false-positive bans. Brute-force protection via the `authenticate` filter is retained.
  - On upgrade to v2.9.28.07, a **one-time emergency unlock** runs: clears all permanent IP bans, flushes all WAF violation/ban/login-attempt transients, and (if the admin never consciously saved a simulation-mode preference) restores `simulation_mode = 'yes'`.

## [2.9.28.06] - 2026-04-22

### Fixed

- **All primary scan buttons now readable in light mode.** `text-foreground` resolves to near-black (`oklch(23.5%, 0, 0)`) in light mode — placing it on `bg-swiss-navy` (dark navy) made all button text invisible. Fixed by changing Button.tsx `variant="primary"` to use `text-white` globally, and updating 12 additional instances in SecurityHub.tsx and ScanCard.tsx mode toggles.
- **Quick/Deep mode toggle selected state contrast corrected.** Selected mode button now uses `text-white` instead of `text-foreground` — matching the `text-white` pattern already used on the main Dashboard action tiles.

## [2.9.28.05] - 2026-04-21

### Fixed
- **Deep malware scan now completes all batches.** The orphan-cleanup threshold in the status endpoint was racing with legitimate in-progress scans — the first status poll (3s after queue) could kill the scan if the `scan_running` flag briefly cleared between batches. Threshold raised from 60s → 120s, and the `scan_running` flag is now set **before** `start_scan()` in the deep-scan orchestrator path so the first status poll sees an authoritative "running" state.
- **Quick/Deep mode selector buttons restored to plugin design system.** Selected state now uses `bg-swiss-navy text-foreground` (matches Geo Block / Allow toggle in SecurityHub); unselected uses `bg-secondary text-neutral-700 border-border hover:border-swiss-navy`. Scan card containers restored to `bg-card border border-border` and icon wrappers to `bg-secondary rounded-xl` — replacing the previous hardcoded `bg-white`/`bg-gray-100`.
- **Dashboard icon containers restored to correct token usage.** Active states on colored backgrounds (`bg-swiss-navy`, `bg-swiss-red`) use `text-white`; inactive states use `bg-secondary text-neutral-700`.

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.28.03] - 2026-04-21

### Fixed

- **Quick malware scan PHP crash.** Replaced non-existent `SWISSWPSUITE_AI_NAME` constant with `'swisssuite-ai'` string literal in orchestrator — every Quick scan was returning a PHP undefined-constant error while UI falsely showed "clean".
- **All primary buttons and CTAs rendering transparent.** Added `@theme` block to `plugin/src/index.css` registering `swiss-navy`, `swiss-red`, `swiss-gold` as Tailwind v4 theme tokens — without `@theme`, utility classes (`bg-swiss-navy` etc.) were not generated.
- **"Groq" branding removed from all user-facing strings.** Replaced with "AI" throughout scan card descriptions and SEO batch status text.
- **Email report toggle colors.** Toggle now shows red track (OFF) and green track (ON) for instant visual state clarity.
- **Malware scan mode selector visual feedback.** Selected Quick/Deep mode button now shows solid filled state with checkmark icon.
- **Scan result inline expansion.** "Show all N findings" now expands inline in the Scan card without navigating away; "View in History →" remains as secondary action.
- **Free tier AI Security Audit token gate.** Requires 1,500 tokens and enforces a 7-day cooldown between scans. Returns `402 Insufficient tokens` or `429 Rate limited` if conditions not met.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.28.02] - 2026-04-21

### Fixed

- **Security Audit card description.** Description now clearly states the scan runs via SwissSuite's own Groq AI quota — no user API key required. Free and Pro users both get the scan; the distinction from the Pro-only "Full AI Scan" is now explicit.
- **History tab scan type and grade.** AI Security Audit scans now write `scan_type='ai_audit'` and the correct grade (A–F derived from L1 findings) to the `wp_swisswpsuite_sentinel_scans` table. The History tab maps `ai_audit` → blue "AI Audit" badge, `full_ai` → green "Full + AI" badge, and retains `layer1`/`full` as backward-compatible labels for older records.
- **Scan result navigation.** After a scan completes, results stay inline on the Scan tab. The "View in History" button is now a secondary action that navigates to History AND refreshes the list so the new scan appears at top. No more forced tab navigation.
- **2FA settings visibility.** `TwoFactorSettings.tsx` now checks three signals (`capabilities`, `sentinelIsPro`, `tier`) to determine Pro status — reduces cases where 2FA settings were incorrectly hidden.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.28.01] - 2026-04-21

### Fixed

- **Malware scan crash.** `SwissWPSuite_Security::__construct()` in the orchestrator now receives the required `$plugin_name` and `$version` arguments — zero-argument call caused a fatal constructor error on every malware scan.
- **TierBadge showing wrong tier.** `ScanCard` now derives the badge tier from `SCAN_TIER[scanType]` (the scan's required tier) instead of the user's license tier — Free users no longer see a "Pro" badge on the AI Audit card they can actually run.
- **Null display on malware results.** `files_scanned` and `threats_found` in `ScanCard` and `ScanResultPanel` are now guarded with `?? 0` — NaN/undefined no longer rendered when backend omits these fields.
- **Dead "View in Security Hub" text.** `ScanResultPanel` `onViewHistory` prop now wires to SecurityHub History tab navigation; the non-functional paragraph is replaced by a button.
- **Stale AI Audit entry in Dashboard.** Old "AI Audit" button replaced by "Security Audit →" link that navigates to the Scan tab.
- **Historical scan detail.** Clicking a history entry now shows an inline detail panel with grade badge, AI summary, and full findings list instead of a blank panel.
- **WAF/Log Advisors in wrong tab.** WAF Advisor and AI Log Advisor moved from Logs tab to Dashboard tab with descriptive subtitle.
- **Daily cron log module.** All four `Diagnostics::log()` calls in `run_daily_report()` corrected from module `'scan_cron'` to `'scan_orchestrator'`.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.28.0] - 2026-04-20

### Fixed

- **WAF silent failure on reinstall.** `plugin/includes/class-swisswpsuite-activator.php` now uses `update_option()` (not `add_option()`) for all four WAF defaults — `firewall_enabled='yes'`, `firewall_simulation_mode='no'`, `firewall_block_sqli='yes'`, `firewall_block_xss='yes'`. A prior installation that had disabled the WAF no longer silently stays disabled after reinstall.
- **Free users blocked from WAF toggle.** Removed `'firewall'` from `$pro_only_options` in `class-swisswpsuite-api.php`. Free-tier sites can now enable/disable the WAF without receiving HTTP 403.

### Added

- **Scan Consolidation — 5 scans → 3.** The old overlapping scan types (AI Audit, Free VPS Scan, Quick Scan, Full Sentinel Scan, Deep File Scan) are replaced by three clean scans: **AI Security Audit** (Groq AI, Free+Pro, cron 24h both tiers), **Malware Scan** (local regex + VPS hash DB, Free+Pro, manual only, Deep mode Pro-gated), **Full Scan with AI** (L1+L2, Pro only, cron 24h).
- **`SwissWPSuite_Scan_Orchestrator`** (`plugin/includes/security/class-swisswpsuite-scan-orchestrator.php`). Single PHP entry point for all scan types. Provides `classify_tier()`, `run_ai_audit()`, `run_malware_scan()`, `run_full_ai_scan()`, `run_daily_report()` with 23-hour throttle guard.
- **`SwissWPSuite_Scan_Report_Mailer`** (`plugin/includes/security/class-swisswpsuite-scan-report-mailer.php`). Tier-aware HTML email builder + sender. Free report includes AI Audit section; Pro report includes Full Scan section + Update Guard activity section (rendered when Phase 2 ships). Recipient configurable via new `swisswpsuite_scan_report_email` option.
- **New canonical cron hook `swisswpsuite_daily_scan_report`** (daily). Replaces the fragmented `swisswpsuite_daily_sentinel_scan` + `swisswpsuite_scheduled_scan` pair (both kept as no-op shims for two-version deprecation window).
- **New REST endpoints** — `POST /security/scan/ai-audit`, `POST /security/scan/malware`, `POST /security/scan/full-ai`, `GET/POST /security/scan/report-config`, `GET /security/scan/report-preview`, `POST /security/scan/report-test-send`.
- **SecurityHub Scan tab redesigned.** Five-panel scan layout replaced with `ScanCronStatusBanner` (next scan time, last grade, email preview trigger), three `ScanCard` components (with Pro-lock overlay on Full AI), `ScanResultPanel` (grade badges, findings list, CVE matches), `ScanReportPreviewModal` (sandboxed iframe, WCAG-AA focus trap), `ScanReportSettingsPanel` (save-on-blur email, immediate toggle, rate-limited test-send). All components WCAG 2.1 AA compliant.
- **New TypeScript types** — `AiAuditResult`, `MalwareScanResult`, `FullAiScanResult`, `ScanReportConfig`. `SentinelReport` marked `@deprecated`.

### Deprecated

- REST endpoints `/security/sentinel/audit`, `/security/sentinel/full-scan`, `/security/deep-scan/start` — two-version deprecation window (removes in v2.9.30.0). Responses include `X-SwissWPSuite-Deprecation` header.
- Cron hooks `swisswpsuite_daily_sentinel_scan`, `swisswpsuite_scheduled_scan` — kept as no-op shims until v2.9.30.0.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.94] - 2026-04-20

### Fixed

- **Daily report failure log now identifies `pre_wp_mail` interception.** `send_daily_security_report()` probes a `pre_wp_mail` filter at priority 1 before calling `wp_mail()`. If another plugin short-circuits delivery by returning a non-null value from `pre_wp_mail`, the failure log now explicitly says "another plugin or hook short-circuited mail delivery before PHPMailer ran" instead of the cryptic "no WP_Error captured". This makes it diagnosable without server-level debugging.
- **Send-now endpoint surfaces PHP `mail()` disabled.** When SMTP host is empty and `mail` appears in `disable_functions`, `POST /reports/send-now` now returns HTTP 400 with `rootCause: "php_mail_disabled"` before calling `wp_mail()` — instead of silently failing and logging nothing useful.

### Added

- `"php_mail_disabled"` to `SmtpTestRootCause` TypeScript union.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.93] - 2026-04-20

### Fixed

- **SMTP host without credentials no longer breaks all site mail.** `configure_phpmailer_smtp()` now returns early (falls back to PHP `mail()`) when SMTP host is configured but username is empty. Previously, PHPMailer entered SMTP mode with no auth credentials and tried to connect on whatever port was saved — on shared hosts like Hostinger this always failed, and the connection failure caused *every* `wp_mail()` call on the site to return `false` (breaking password resets, WooCommerce notifications, and our daily security report). The early return is safe: if username is empty, SMTP auth is impossible and the server will reject the connection anyway.
- **Send-now endpoint surfaces `no_smtp_credentials` root cause.** `POST /reports/send-now` now checks for a configured SMTP host with no username and returns HTTP 400 with `rootCause: "no_smtp_credentials"` and an actionable message ("Add your SMTP username and password, or clear the SMTP Host field"). Previously returned a vague "wp_mail() returned false".
- **SMTP settings panel shows amber callout for missing credentials.** `SmtpSettings.tsx` renders a clear "SMTP host is set but no username is entered — server is falling back to PHP mail()" card when the send-now or test endpoint returns `rootCause: "no_smtp_credentials"`.
- **Daily report failure log now includes actual SMTP error.** `send_daily_security_report()` captures `WP_Error` from the `wp_mail_failed` hook at priority 1 and includes the error message in the Diagnostics log. Previous log only said "wp_mail returned false" with no SMTP-level detail.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.92] - 2026-04-20

### Fixed

- **Sentinel L2 deep-scan JSON truncation / HTTP 502 (log-report Issue #1 permanent fix).** `SwissWPSuite_Sentinel_Security::MAX_L2_FINDINGS` reduced from 25 to 15. Production logs across 4 sites showed 25-finding L2 payloads intermittently producing truncated JSON responses from Groq Compound (hard 8192 output-token ceiling), causing the VPS to return HTTP 502 with the scan wasted. A chunked/merged design was evaluated and rejected as architecturally unsound — merging two independent AI reports produces non-deterministic grade/chain/recommendation conflicts that would require either a third AI call or fragile hand-rolled reconciliation. Reducing the cap trades a small amount of analytical depth for deterministic, always-complete responses. The existing severity-based trim (critical→high→medium→low→info) still selects the 15 most security-relevant findings.
- **Backup health-check adaptive stale threshold (log-report Issue #3 permanent fix).** `SwissWPSuite_Backup_Tick_Dispatcher::get_stale_threshold()` is now adaptive: `clamp(avg_tick_seconds * 2.5, 300s, 900s)`, where `avg_tick_seconds` is an exponentially-weighted moving average (alpha=0.2) of this site's actual tick durations. On fast hosts (VPS, local dev) the threshold collapses to the 300s floor — identical to v2.9.27.91 behaviour. On slow shared hosts where chunk exports average 180s per tick, the threshold climbs to ~450s so the health check stops pre-empting in-progress ticks and triggering DB lock contention. Recorded by `record_tick_duration_ms()` from the engine after every completed tick; read only during the 5-minute health-check cron. The previous static 300s threshold was still arbitrary and too low for genuinely slow shared-hosting tiers.
- **Google Drive `delete_file()` silent-refresh-failure gap (log-report Issue #4 permanent fix).** Every other GDrive entry point (`list_files`, `upload_file`, `init_resumable_session`, `upload_single_chunk`, `get_resume_offset`) already checked the refresh-token return value after v2.9.27.91. `delete_file()` was the last remaining call site where a failed refresh would silently proceed with a dead access_token — producing a 401 that we mapped to "delete failed" with no indication that re-authentication was required. Now refresh errors are logged via Diagnostics and the delete returns `false`, so the cron-driven retention caller logs the real reason.

### Added

- **Persistent SMTP health snapshot (log-report Issue #6 permanent fix).** New `swisswpsuite_smtp_health` option holds the outcome of the most recent send attempt (`{ status: 'ok'|'fail', timestamp, context, reason }`). Updated on both the daily-security-report cron path and the manual `POST /smtp/test` endpoint. Surfaced in the SMTP settings panel via `GET /smtp/environment` as a persistent badge — green "Last email send: succeeded, 3 hours ago (daily security report)" or red "Last email send: FAILED, 12 minutes ago (test email) — Wrong username or password". Unlike the existing `swisswpsuite_smtp_failure_notice` (transient, dismissible, cleared on next success), this snapshot is always kept up to date so users can verify SMTP is actually working without running a diagnostic test.
- `swisswpsuite_backup_avg_tick_ms` option key (operational state, autoload=false) — EWMA of engine tick durations in milliseconds, drives the adaptive stale threshold.
- `swisswpsuite_smtp_health` option key (operational state, autoload=false) — persistent SMTP send-outcome snapshot.
- `SmtpHealthSnapshot` TypeScript interface + `smtp_health` field on `SmtpEnvironmentResponse`.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.91] - 2026-04-20

### Fixed

- **Backup health-check false positives (log-report Finding #1, HIGH).** Raised `SwissWPSuite_Backup_Tick_Dispatcher::STALE_THRESHOLD` from 120s to 300s. On shared hosting (Hostinger/LiteSpeed) a single tick processing a multi-GB database chunk or large `wp-content` ZIP can legitimately exceed 120s before the PHP process returns. The old 120s threshold caused the 5-minute health-check cron to fire `chain_next_tick()` while the original process was still running, spawning parallel instances of the same job and triggering DB lock contention and ZIP file conflicts. 300s covers two full LiteSpeed request windows while still being well below `ZOMBIE_THRESHOLD` (1800s).
- **Google Drive cloud backup silently returning empty list (log-report Finding #2, HIGH).** `SwissWPSuite_Cloud_GDrive::list_files()` previously ignored the return value of `refresh_access_token()`. A stale/revoked refresh token returned `WP_Error` silently and the next API call hit Google with a dead access_token — Google responded with 401, our parser fell through, and the UI showed "no backups" with zero indication that re-authentication was required. Now the refresh failure is logged loudly via `SwissWPSuite_Diagnostics` and propagated as a `WP_Error` to the REST handler, which surfaces a real "Re-authenticate Google Drive in Cloud Settings" error instead of masking the problem. Same silent-failure pattern also fixed in `SwissWPSuite_Cloud_Dropbox::list_files()` for parity (Diagnostics log only — no dedicated UI path on the Dropbox side).
- **Silent SMTP failure on daily security report (log-report Finding #3, MEDIUM).** When `wp_mail()` returns `false` during the scheduled daily-security-report send, the failure is now captured in the new `swisswpsuite_smtp_failure_notice` option and rendered as a dismissible admin notice on the next admin page load (gated to `manage_options`). Previously the failure was only logged to the diagnostics panel, which most users never check. The notice auto-clears when the next daily send succeeds or when a user runs a successful SMTP Test. Notices older than 7 days self-purge to prevent permanent nagging after transient hiccups.

### Added

- `swisswpsuite_smtp_failure_notice` option key added to `SwissWPSuite_Config_Manifest::OPERATIONAL_STATE` (ephemeral, site-specific, excluded from backup exports and protected from migration overwrite).

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.90] - 2026-04-20

### Added

- **XOR obfuscation encryption fallback (Scenario 1).** `SwissWPSuite_Encryption` now has a 3-tier cascade: Sodium (`s1:`) → OpenSSL (`o1:`) → XOR stream keyed by `wp_salt('auth')` (`x1:`). SMTP password saves never fail due to missing PHP extensions. Sites without Sodium or OpenSSL get a Diagnostics warning but full functionality. `decrypt_string()` handles all 4 formats including raw plaintext for migration.
- **Port connectivity pre-check (Scenario 3).** Before calling `wp_mail()`, `send_smtp_test_email()` runs `fsockopen()` with a 5-second timeout against the configured host:port. If the port is unreachable, returns HTTP 400 with `rootCause: "port_blocked"` and a suggestion to try port 587/465 instead of waiting for PHPMailer to time out.
- **Competing SMTP plugin detection (Scenario 2).** New `detect_competing_smtp_plugins()` method probes 5 known constants and 9 active-plugin slug patterns (WP Mail SMTP, FluentSMTP, Easy WP SMTP, Post SMTP, SendGrid, WP Offload SES, etc.). Surfaces a named warning in the test response and an amber admin-notice banner in the settings panel.
- **PHP `mail()` availability indicator (Scenario 4).** `GET /smtp/environment` probes `disable_functions`, reports `mail_is_usable`. Frontend renders a red alert banner when no SMTP host is configured and PHP mail is disabled (affects WP Engine, Kinsta, some Cloudways plans).
- **SMTP error message mapper (Scenario 5).** 7-pattern classifier translates raw PHPMailer errors into actionable instructions (wrong password → "Use an App Password for Gmail/Outlook"; STARTTLS → "Switch to SSL on port 465"; relay denied → "Your account may require sender-domain verification").
- **AUTH_KEY rotation guard (Scenario 6).** `configure_phpmailer_smtp()` wraps `decrypt_string()` in `try/catch(\Throwable)`. Decryption failures are logged with the cause and `$password` is set to `''` cleanly so PHPMailer produces a proper auth-failure instead of a crash.
- **wp-cron status panel + "Send Daily Report Now" (Scenario 7).** `GET /smtp/environment` exposes next/last cron timestamps, `DISABLE_WP_CRON` flag, and `alternate_wp_cron`. SMTP settings panel shows a cron health indicator with relative times. New `POST /reports/send-now` endpoint triggers `send_daily_security_report()` immediately, bypassing cron — lets users verify email delivery without waiting 24h.
- **Cache-Control headers on all SMTP REST responses (Scenario 8).** `no-cache, no-store, must-revalidate, private` + `Pragma: no-cache` applied to every SMTP endpoint. Frontend appends `_nocache` timestamp to test/environment/send-now calls.

### Changed

- `send_smtp_test_email()` root-cause classifier extended with `port_blocked` heuristic. All heuristics now also consult the competing-plugin detector and the error-message mapper.
- `swisswpsuite_last_sentinel_scan_ts` and `swisswpsuite_last_sentinel_scan_result` options now updated on every cron run (feeds the cron status panel and the send-now fallback).

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.89] - 2026-04-20

### Fixed

- **SMTP test diagnostic overhaul.** `send_smtp_test_email()` now: (1) registers `wp_mail_failed` capture at priority 1 so competing plugins cannot consume the error first; (2) probes the final PHPMailer effective state via `phpmailer_init` at priority 9999 (fires after all plugins) to detect if a competing SMTP plugin overrode our configuration; (3) applies a 5-heuristic root-cause classifier (`not_smtp_mode`, `password_decrypt_failed`, `no_password`, `wp_mail_failed`, `silent_failure`); (4) returns a structured diagnostics payload with saved-config vs PHPMailer-effective-config side-by-side. The "wp_mail() returned false." dead-end log is replaced with actionable messages like "Could not decrypt the saved SMTP password — WordPress security keys may have been rotated. Click Change and re-enter the password."
- **SMTP password re-entry UX.** Added explicit "Change" button next to the masked password field. Clicking it clears the field and focuses it for immediate typing. Added `onBlur` handler that re-applies the `••••••••` placeholder if the user clicks into the field but types nothing — preventing the field from appearing empty when a password is already saved.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.88] - 2026-04-20

### Fixed

- **"An unknown API error occurred" swallowed real server errors.** The shared `wpApi()` helper in `services/api.ts` called `response.json()` directly — if the server returned a PHP fatal with HTML output, a Cloudflare/nginx error page, or any non-JSON body, the parse threw, `statusText` was empty (HTTP/2), and the catch-all "An unknown API error occurred" string fired. Rewrote the `!response.ok` branch to read body as text first, attempt JSON.parse, then fall back to `Server error (HTTP {status}) — {first 200 chars of body}`. Every feature in the SPA (SMTP, Backup, Sync, SEO, Security, License) now surfaces the real failure reason. Existing JSON error responses (`{ success: false, message: "..." }`) are unchanged.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.87] - 2026-04-20

### Fixed

- **Encryption class never loaded at runtime.** `SwissWPSuite_Encryption` was referenced by `class_exists()` guards across 6+ files (SMTP, cloud backup, admin) but was never added to `load_dependencies()` in `class-swisswpsuite-core.php`. At `rest_api_init` time the class was missing, causing the SMTP save endpoint to return "Encryption module unavailable — cannot save password." Added the `require_once` to the `$essentials` array before any consumer class is loaded.
- **Secondary:** Google Drive and Dropbox OAuth tokens were also silently falling through to unencrypted storage. Now encrypted at rest on next save. `decrypt_string()` has a plaintext-migration branch so existing stored tokens continue to work without re-authentication.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.86] - 2026-04-20

### Fixed

- **SMTP test silent-success via PHP mail() fallback.** `send_smtp_test_email()` now returns HTTP 400 when no SMTP host is saved, with a clear message directing the user to fill and save SMTP fields first. Previously, an unsaved SMTP config caused `wp_mail()` to fall back to PHP `mail()`, which Hostinger blocks — but the endpoint still returned HTTP 200 and a green success toast.
- **SMTP "unsaved changes" UX trap.** `SmtpSettings.tsx` now tracks dirty state (form values vs last-saved server state). An amber banner appears whenever there are unsaved changes, and the Send Test Email button is disabled until the current form state is saved. This closes the loop where users clicked Test before Save and received a misleading success indicator.
- **From Email field copy clarified.** Label, description, and a contextual info notice now explain that the From Email field is a display-only sender address that does not require its own SMTP account. Leaving it blank automatically uses the SMTP username as the From address (with a logged notice). The placeholder dynamically shows the SMTP username as a hint when one is set.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.85] - 2026-04-20

### Fixed

- **SMTP From address fallback.** When the From Email field is empty, `configure_phpmailer_smtp()` now falls back to the SMTP username as the sender address (if it is a valid email). Prevents Hostinger's silent post-250 OK discard that caused test emails and daily security reports to disappear without error.
- **SMTP test preflight validation.** `send_smtp_test_email()` now returns HTTP 400 with a descriptive error message when both From Email and SMTP Username are absent or invalid, instead of returning HTTP 200 with a silent false success.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.84] - 2026-04-20

### Added

- **Plugin safety wrapper (Change E).** Top-level bootstrap in `swisssuite-ai.php` and the activator's `activate()` body are now wrapped in `try/catch(\Throwable)`. Fatal errors are appended to `wp-content/swisswpsuite-error.log` (flat file, not wp_options or Diagnostics — those may be unavailable at the failure point) and surfaced as a `manage_options`-gated admin notice. Activation no longer white-screens on third-party plugin conflicts, missing PHP extensions, or partially loaded classes.
- **Built-in SMTP settings (Change F).** New panel under Settings > General. 13 provider presets (Hostinger, SiteGround, Bluehost, GoDaddy, DreamHost, IONOS, OVH, Namecheap, Gmail, Outlook, Brevo, SendGrid, Custom). Auto-fills host/port/encryption. Password encrypted at rest via `SwissWPSuite_Encryption::encrypt_string()` (Sodium preferred, OpenSSL fallback). Hooks into `phpmailer_init` at priority 20 — completely inert when no host is configured (wp_mail() falls back to default mailer). "Send Test Email" button dispatches a diagnostic to `admin_email` and captures PHPMailer errors via the `wp_mail_failed` action.

### Changed

- **Activator Bunker connectivity ping deferred to admin_init.** Previously an inline `wp_remote_get` inside `activate()` could throw on hosts with blocked outbound traffic (SSL handshake failures, firewall interception, connect timeout). Now set as a one-shot transient and consumed on the next admin page load, where exceptions can no longer abort activation.

### Config

- `swisswpsuite-config-manifest.php`: added `swisswpsuite_smtp_password` to `SITE_LOCAL_SECRETS` (encrypted, excluded from backup exports, protected from migration overwrite). Added `swisswpsuite_smtp_host|port|encryption|username|from_email|from_name` to `SITE_LOCAL_CONFIG`.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.83] - 2026-04-19

### Fixed

- Pro users were hitting a 120-requests-per-hour rate cap on `run_security_scan` (core scan) and `start_deep_scan` (deep scan), identical to the Free tier limit. Both endpoints now exempt Pro users (`sentinel_pro` capability), matching the `full_scan` and `sentinel_audit` exemption pattern already in place elsewhere in the codebase.

## [2.9.27.82] - 2026-04-18

### Changed

- Production zip no longer includes `vendor/` directory. `composer.json` only declares `require-dev` (PHPUnit, Mockery) — the vendor tree is test infrastructure, not runtime code. The plugin uses classmap autoloading from `includes/` and has no runtime Composer dependencies.

### Fixed

- Release zip size regression introduced in v2.9.27.44 (jumped from ~1.1MB to ~2.9MB). Zip is now back in the ~1.1MB range. The `build_plugin.sh` "future proof" vendor copy was unconditionally bundling PHPUnit, Mockery, nikic/php-parser, php-code-coverage, and sebastian/* — ~5.3MB uncompressed of pure dev tooling.

## [2.9.27.81] - 2026-04-17

### Added

- `SwissWPSuite_Groq::assert_result_has_content($result, $required_fields, $context)` — shared static guard used across all 6 Groq consumer call sites; returns null (OK) if any required field is non-empty, WP_Error on all-empty or non-array response
- Background SEO status polling now returns `last_error` and `last_item_error` fields; frontend displays amber warning banner when present
- Upgrade migration deletes orphan `_swisswpsuite_seo_processed_at` markers from the silent-success path in previous versions (chunked, LIMIT 1000)
- PHPUnit test class `SeoWorkerGuardTest` with 8 test cases covering all assert_result_has_content edge cases

### Fixed

- CRIT-1 — Background SEO queue (`process_bg_seo_queue`) now branches on `$post->post_type === 'attachment'` and calls `generate_image_seo` (vision model) for images; text posts continue to use `generate_seo_meta`
- CRIT-2 — `process_image()` in seo-worker.php now throws when Groq response has all-empty alt_text/title
- CRIT-3 — `process_text()` in seo-worker.php now throws when Groq response has all-empty title/description (updates=0 was previously logged-only)
- CRIT-4 — Background queue `completed[]` push is now gated behind `if ($updates > 0)`; failed items pushed to `failed[]` and flagged with `_swisswpsuite_seo_failed` postmeta
- CRIT-5 — Batch ingestion regex extended to `/^seo_(post|product|page|attachment)_(\d+)$/`; FAQ capture group fixed from `$m[2]` to `$m[1]`; `STATUS_APPLIED` only set when `$saved > 0`
- HIGH-1 — `generate_content_item()` sync endpoint returns HTTP 502 (success:false) when Groq returns a parseable but all-empty response
- HIGH-3 — `get_background_seo_status()` wraps inline execution in try/catch; `last_error`/`last_item_error` surfaced in JSON response
- HIGH-5 — `_swisswpsuite_seo_processed_at` now written AFTER successful work completes; previously written before the try block, permanently blacklisting failed items from retry
- W1 — `process_product_images()` now has `assert_result_has_content` guard and tracks `$img_updates`; `_processed_at` only written when `$img_updates > 0`
- Frontend `handleGenerate` and `processSingleItem` now validate that Groq response contains at least one usable field before marking item as optimized

### Security

- No security changes

## [2.9.27.80] - 2026-04-17

### Added
- Per-category one-click fix buttons inside the SEO Health Report ("Generate Alt Text for All (33)", "Generate SEO for All Pages (11)", etc.) that close the dialog, switch to the right tab, and trigger bulk optimization
- SEO scan response now exposes `actionable` and `excluded_thin_content` fields per content type so the UI can distinguish real problems from unfixable thin content

### Changed
- Content Enhancer scoped back to WooCommerce products only — Posts, Pages, and Images tabs removed to eliminate duplication with the SEO page. Shows an empty state with install CTA when WooCommerce is not active
- SEO Health Report dialog restructured with sticky header + scrollable body (max-h-90vh) + sticky Close footer so long content doesn't clip on smaller viewports

### Fixed
- Bug 1 — `/content?filter=unoptimized` now returns items missing EITHER `_swisswpsuite_meta_title` OR `_swisswpsuite_meta_description` (was only checking description)
- Bug 2 — `processSingleItem` retry loop now actually retries on 5xx and network errors with exponential backoff (1s / 3s); 4xx non-429 still exits immediately; 429 keeps 65s wait
- Bug 3B/3C — SEO Health badge count no longer inflates from unfixable thin-content pages; `missing` field now equals actionable items only; thin content shown as separate informational note
- Bug 3E — SEO score ceiling formula now credits all fixable items at full weight; thin content at 0.6; ceiling no longer pessimistically penalizes missing metadata
- Audit CRIT-1 — SEO Health category fix buttons now bypass the two-click confirm toast via `skipConfirm` option; one click actually runs the job
- Audit CRIT-2 — Category fix buttons now pass explicit `typeOverride` argument to `handleFastOptimizeAll` and `handleBackgroundQueue`, avoiding the stale `activeTab` closure race
- Audit WARN-4 — Network error detection is now case-insensitive (`/fetch|network/i`) so Firefox's "NetworkError" message triggers retry behavior in addition to Chrome's "Failed to fetch"

## [2.9.27.79] - 2026-04-17

### Added
- F-224/F-225: SEO bulk batch jobs now persist to localStorage with 24h TTL — polling auto-resumes after tab close
- F-225: PHP stale-job detection normalizes >24h-old pending batches to `expired` status; frontend halts polling cleanly
- SET-031: Optimistic-concurrency protection on settings save via `settings_version` hash — returns HTTP 409 on two-tab conflicts, frontend auto-refetches
- Section 7 of SETTINGS_CAPABILITIES_REFERENCE.md documents the new settings_version + 409 contract

### Changed
- F-230: Groq `call_api()` now uses shared `parse_outer_response()` helper — empty bodies and malformed JSON return `WP_Error` instead of silent null, all 9 callers already guarded
- F-226: Disambiguation PHPDoc added to `run_seo_scan()` and `get_onpage_audit()` clarifying they serve different UI surfaces (2-dimension badge vs 6-factor weighted audit)
- F-231: Migrated last `MODEL_MAIN` caller to `MODEL_PRIMARY`; alias retained for backward compat until v2.9.28.x
- CE-003: `ContentType` union extended with `"template"` for FSE post types

### Fixed
- F-239 (WARNING-1): `job_status` union corrected — removed non-existent `"completed"`, added `"pending"` and `"error"` (actually emitted by Sentinel receiver)
- Pre-commit CRITICAL: `class-swisswpsuite-api-sync.php` now emits `'unknown'` instead of `'idle'` to match the narrowed `SentinelJobStatus` TS union
- Pre-commit WARNING: SEO slow batch banner auto-clears on terminal states (completed/failed/expired) — previously stuck until manual dismiss
- WARNING-3: `compute_settings_version()` excludes 3 background-mutated options (login_max_retries, transfer_strategy, server_profile_override) to prevent spurious 409s
- WARNING-4 / CE-001: Removed dead `isImage` ternary in ContentEnhancer.tsx after identical branches
- CE-002: PHP-side tone allowlist rejects unknown tones with HTTP 400 (defense-in-depth)
- CE-006: Bulk apply truncation now surfaced in toast when PHP 100-item cap fires
- SET-012: Documented why `esc_sql` is correct for SHOW TABLES output (no prepare support for table names)
- SET-013: `perform_maintenance` unknown action now returns HTTP 400 instead of silent no-op
- SET-016: Removed erroneous optional chaining on non-optional `settings` prop in SeoSettings.tsx
- SET-017: Dev-only guards on `console.error` calls in 5s-interval refresh effects
- F-253: Corrected stale HMAC CSRF validity-window comment in receiver template

### Security
- CE-002: Tone parameter server-side allowlist prevents prompt-injection surface widening
- SET-031: `hash_equals()` used for timing-safe settings version comparison

## [2.9.27.78] - 2026-04-17

### Added
- F-209: SEO test suite — 45 test methods across 5 test classes (LlmTxtTest, OnPageAuditTest, SitemapTest, FrontendTitleTest, LlmTxtQueryVarTest)
- F-214/F-215: SeoBackgroundStatus and SeoBatchStatus TypeScript interfaces added to types.ts

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.77] - 2026-04-16

### Added
- F-163: Customer management UI on VPS admin dashboard — list, detail view, CSV export, email composition (4 new routes + 2 new EJS views)
- VPS structured logging via Winston (config/logger.js) replacing raw console.log
- VPS session authentication middleware (middleware/sessionAuth.js)

### Fixed
- F-261: GDrive auth error fast-fail in backup engine — immediate abort instead of silent retry loop
- F-264/F-265: CreateBackupResponse TypeScript type corrected to match PHP shape (useBackups.ts)
- CE-004: Bulk apply response now includes total_received count (class-swisswpsuite-api.php)
- CE-005/F-184: Per-promise .catch() in handleBulkApply; success count reads from API response (ContentEnhancer.tsx)
- F-181: Category fetch abort controller + useEffect cleanup prevents memory leak (ContentEnhancer.tsx)
- F-220: Empty permalink guard in llms.txt generation (class-swisswpsuite-llm-txt.php)
- F-213: 5 SEO operational state options added to deactivator cleanup (class-swisswpsuite-deactivator.php)
- F-219: FAQ fetch error handling with user-facing toast (SeoManager.tsx)
- SET-008/SET-027: encryptionPasswordConfirm required; mismatch returns HTTP 400 (class-swisswpsuite-api.php)
- SET-022: WPScan/Patchstack API key length validation — minimum 20 characters (class-swisswpsuite-api.php)
- SET-006: 11 missing add_option() defaults in plugin activator (class-swisswpsuite-activator.php)
- F-175: Responsive CSS on VPS admin dashboard — mobile-friendly tables and navigation
- apiKey @deprecated JSDoc annotation in useSettings.ts

### Security
- F-166: Groq DPA and SCCs documented in privacy policy (PRIVACY_POLICY.md)

### Documentation
- F-169: Docker iptables documented as safe-by-design in VPS capabilities reference

## [2.9.27.74] - 2026-04-14

### Fixed
- SEO Enhance ~40% HTTP 500 failure rate resolved: `response_format` JSON enforcement now sent for ALL API paths (Bunker + BYO/custom), not just custom — VPS ai.js passes it through to Groq (F-204)
- 3 newer hardening options added to security level presets: `restrict_llm_crawlers` in balanced+maximum+apply_all_recommended; `restrict_google_indexing` in maximum only; both in compatible as false (F-089)
- 6 findings confirmed already fixed in prior versions: N+1 sync-scheduler query (F-104), N+1 hasHistory query (F-179), SSL verify default (F-206), llms.txt do_blocks (F-207), config manifest categorization (F-208)
- 12 findings reclassified as FALSE_POSITIVE after deep code verification: tone enum (F-177), MODEL_FAST intentional (F-205), 10 migration/backup VERIFIED CORRECT findings (F-243-F-249, F-251, F-254, F-255)

## [2.9.27.73] - 2026-04-14

### Fixed
- Sentinel backup `cancel_engine_state_for_job()` regex corrected (`(?:auto|manual)` → `(?:automation|manual)`) — zombie engine HTTP resurrection loop on automation jobs (F-282 CRITICAL)
- Backup cancel flag path unified: archiver.php and all 5 cloud providers now read from `swisswpsuite-backups/` matching the writer — cancel button was silently ignored in archiver path (F-283)
- PII post-type blocklist centralised into `SwissWPSuite_Sync::get_pii_post_types()` — 3 divergent inline arrays consolidated; EDD, LifterLMS, GiveWP, and WooCommerce HPOS types now all protected (F-284)
- HTTPS enforcement extracted to `enforce_https()` private method in API sync — 11 duplicate `preg_replace` call sites replaced (F-285)
- `swisswpsuite_backup_current_job` option key added to config manifest (F-286)

### Security
- axios upgraded in VPS Command Center — patches GHSA-fvcv-3m26-pcqx (header injection) and GHSA-3p68-rc4w-qgx5 (NO_PROXY bypass SSRF) (F-278 CRITICAL)
- Rate limiting added to `/batch/results`, `/batch/status`, `/batch/cancel` VPS AI endpoints (30/10 req/min per license) (F-279)
- Additional npm dependency vulnerabilities resolved — `follow-redirects` and `nodemailer` updated; `npm audit` reports 0 findings (F-287)

## [2.9.27.72] - 2026-04-14

### Fixed
- `BatchQueueJob` TypeScript interface: `status` enum corrected from `"running"` to `"processing"`, added `"applied"` — now exactly matches `SwissWPSuite_Batch_Queue::STATUS_*` PHP constants
- `SeoManager` slow-batch progress banner: removed phantom `job.failed_requests` field read (no such column in `wp_swisswpsuite_batch_queue` table); removed always-zero "N failed" display; removed `failed` field from `slowBatchStatus` state type

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.71] - 2026-04-14

### Fixed
- CC-001: Sentinel watchdog job ID mismatch (`backup_auto_` vs `backup_automation_`) — scheduler and sentinel now use consistent `backup_automation_{id}` prefix; stalled automation jobs correctly detected and circuit-broken
- SYNC-SEC-1: Sync push nonce stored in Redis-evictable transient — replaced with DB-backed `update_option(autoload=false)` + daily cleanup cron using direct `$wpdb->prepare` DELETE
- SYNC-BE-4: Raw `$_SERVER['REMOTE_ADDR']` used for IP logging — replaced with CF-aware `SwissWPSuite_Security::get_client_ip()` fallback chain
- SYNC-BE-5: FSE template theme slug not normalized on upsert — `preg_replace` now rewrites `"theme":"*"` to active theme slug on push
- NEW-1: FSE template meta synced without blocklist — same blocklist as `upsert_capsule()` now applied; prevents `_wp_page_template`, `_edit_lock`, etc. injection
- BKP-HIGH-1: Mode A SQL import blocklist missing 5 dangerous statement types vs Mode B — added `CALL`, `SET SESSION`, `SET LOCAL`, `SET PASSWORD`, `SET ROLE`
- BKP-HIGH-2: Backup stream type comparison was case-sensitive — `strtolower()` normalization prevents silent mismatch
- SEO-HIGH-3: Slow batch queue job_id never polled for completion — `useEffect` with 60s interval polls `/batch/status?job_id=` until complete, shows toast
- SEO-HIGH-6: `SeoBatchStatus` TypeScript interface missing from `types.ts` — added with full shape (`active`, `total`, `completed`, `failed`, `pending`, `percent`, `estimated_minutes`, `started_at`)
- LicenseManager: Token usage bar hardcoded to 85% — now computed from `balance / token_limit` using PHP-supplied `token_limit` in settings response
- admin.php: Bare `new SwissWPSuite_Token_Manager()` instantiation without guard — wrapped in `class_exists` + `try/catch` with diagnostics logging
- F-NEW-001: `automation_id` typed as `string` instead of `string | null` in `BackupAutomation` interface
- F-NEW-002/F-NEW-003: Unchecked `file_put_contents()` return values in backup engine (cancel flag, LiteSpeed `.htaccess`) and quarantine handler
- NEW-4.3: Migration profile lost on `wp_options` DROP — profile now persisted to `wp_options` at import start for cross-chunk durability alongside `import_meta.json`
- A-01: QR code SVG in `TwoFactorSettings` missing `aria-label` — added `aria-label="QR code for authenticator app setup"`
- C-03: `GeneralSettings` `alertEmail` field not initialized from `adminEmail` default on first render
- B-03: Backup settings test assertion used plaintext equality on encrypted value — corrected to base64 check
- SD-01: Sync nonce cleanup used unindexed query — daily cron cleanup now uses `$wpdb->prepare` DELETE with proper column targeting

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.70] - 2026-04-14

### Fixed
- SEO-HIGH-1: AI prompt injection via unsanitized post_title in `build_seo_prompt()` — all 4 inputs now sanitized with `wp_strip_all_tags()` + length caps before Groq prompt construction
- SEO-HIGH-2: SSRF via custom API URL — `wp_http_validate_url()` now validates custom URLs; `redirection:0` blocks redirect-chain SSRF bypass on all Groq API calls
- CQ-01: `'****'` sentinel collision corrupted API key saves — replaced `strpos` guard with exact mask comparison on all 3 key-save sites (Gemini, WPScan, Patchstack)
- S-02: `log_js_error()` wrote untrusted unlimited-length fields to wp_options — `$message`, `$source`, `$type` now truncated at 500/200/50 chars respectively
- MIG-H3: Migration profile lost after `wp_options` DROP — profile now persisted to `import_meta.json`; `process_chunk()` falls back to filesystem when `get_option()` returns null post-DROP
- backup-HIGH-2: `file_put_contents()` return unchecked in backup constructor — both `.htaccess` and `index.php` writes now check return value and log warnings on failure
- SEO-E3: Fast background SEO queue did not invalidate onpage audit cache on completion — `invalidate_cache()` now called in fast BG queue completion branch
- RB-052: N+1 `get_post_meta()` queries in `get_builder_word_count()` — `update_meta_cache()` now primes WP object cache before the post loop
- SEO-MED-1: Unlimited batch size in `queue_bulk_seo()`, `submit_background_seo()`, and `start_seo_batch()` — all three endpoints now cap at 500 posts per batch
- C-07: `SwissWPSuite_Token_Manager` instantiation had no try/catch — both call sites now wrapped with Diagnostics logging on exception
- MIG-M4: Export options null dereference on WP-CLI paths — `empty()/is_array()` guard added with fallback
- MIG-L3: `ensure_cron_events()` return type is void — removed incorrect falsy check; method logs internally
- MIG-L2: Journal class require lacked `file_exists()` guard in `export_table_chunk()` and `resume_job()` — both now null-safe with diagnostic warning if file missing
- MIG-L1: ETA calculation could produce unrealistic values — `min(86400, ...)` sanity cap applied
- F-SYNC-008: FSE template upsert failure was silent — `Diagnostics::log('error', 'SYNC', ...)` now logged on failure
- A2: `OnPageAuditResult.status` TypeScript type declared unused `"scanning"` and `"error"` states — narrowed to `"complete"` only; dead state handling removed from `OnPageDiagnostics.tsx`
- C-01 partial: `encryptionPasswordCorrupted` field was untyped in `SwissSettings` — added as optional boolean
- C1: SEO background poll errors were silently swallowed — replaced with one-time dismissible warning banner and AbortController cleanup
- SEO a11y: 4 SEO modals missing `role="dialog"` + `aria-modal="true"` + `aria-labelledby` + focus management + Escape key handler

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.69] - 2026-04-14

### Fixed
- Single-apply attachment guard (`apply_content_rewrite`): guard now accepts `field:'description'` (the path the frontend sends) in addition to `field:'altText'` — previously all image single-applies were silently blocked
- Alt text sanitization: attachment `description` field now uses `sanitize_text_field()` instead of `wp_kses_post()` — alt text is stored as plain text in `_wp_attachment_image_alt`, not HTML
- Upgrade migration idempotency guard: `migrate_sync_origin_stamps()` now uses `version_compare(get_option(..., '0'), '2.9.27.69', '>=')` so sites that ran the v2.9.27.68 URL→UUID migration also receive the v2.9.27.69 URL-variant normalization pass
- Upgrade migration trigger: `run_upgrade_migrations()` now fires the migration for sites upgrading from any version below `2.9.27.69` (previously `2.9.27.68`), ensuring .68→.69 upgrades run the URL normalization
- URL variant normalization: `migrate_sync_origin_stamps()` now generates 5 URL variants per connection (original, www-stripped, www-added, http, https) so stamps created by sites with www/protocol mismatches are also healed

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.68] - 2026-04-13

### Fixed
- SYNC-D001 upgrade migration: `migrate_sync_origin_stamps()` rewrites URL-format `_swisswpsuite_sync_origin` postmeta to `conn_*` UUID format on first admin load after upgrade; collision detection in `upsert_capsule()` now works correctly for all pre-v2.9.27.67 synced posts
- Attachment rewrite (`rewrite_content_item`): per-field AI instructions for title (filename/SEO title), description (alt text, targeting `_wp_attachment_image_alt`), and caption; previously all fields used the same generic prompt
- Attachment alt text apply/restore: `bulk_apply_content_rewrite` now writes proposed description to `_wp_attachment_image_alt` for attachments; `restore_content_item` correctly restores alt text from history

## [2.9.27.67] - 2026-04-13

### Fixed
- SYNC-C001: `upsert_capsule()` double-write destroyed WPML meta — removed `meta_input` from `wp_insert_post` args, added `wpml_media_processed` to blocklist, guarded meta loop from pre-writing `_swisswpsuite_sync_origin`
- SYNC-D001: Sync `source_connection_id` stamped as URL format instead of `conn_*` UUID — fixed in `proxy_push`, `proxy_pull`, and sync scheduler; collision check now resolves correctly
- SEO: Background queue poll stale closure never fired completion branch — fixed with `useRef` mirrors for `bgQueue` and `fetchItems` state in `SeoManager.tsx`
- SEO: `rewriteTitles` toggle had no effect on background queue or bulk batch — plumbed end-to-end through `submit_background_seo` → queue store → `process_bg_seo_queue`
- CE-01: `ContentEnhancer` broken on non-WooCommerce sites — Products tab hidden when WooCommerce absent; default tab is Posts; `rewrite_content_item` now supports post/page/attachment with type-aware AI prompts
- CE-01: `bulk_apply_content_rewrite` had no post-type guard (IDOR risk) — added `allowed_bulk_types` check
- CE-01: `restore_content_item` always returned `success: true` regardless of outcome — now returns actual restored count

## [2.9.27.66] - 2026-04-11

### Changed
- Post-ship documentation update: all capability reference docs, agent memories, and PROJECT_MEMORIES.md updated to reflect v2.9.27.65 audit sprint results
- 16 treated audit reports archived to `.claude/audit-reports/archive/2026-04-11-sprint/`
- Live test result (8/8 confirmed) recorded in live-system-tester memory; Bug #21 false-negative corrected (SyncManager is code-split into its own Vite chunk)
- `docs/IMPACT_MAP.md` updated with Vite code-split chunk lesson

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.65] - 2026-04-11

### Security
- **Bug #1**: HMAC sync key no longer returned to the browser on `GET /sync/connections` — frontend uses `connection_id`, server resolves key internally
- **Bug #2**: API keys (`apiKey`, `wpscanApiKey`, `patchstackApiKey`) now masked in `GET /settings` response (`sk-...XXXX` format) with `has*Key` boolean indicators; PHP `save_settings()` guards against masked round-trip corruption
- **Bug #13**: `loginMaxRetries` now bounded server-side to `[1, 20]` — previously setting to 0 bypassed lockout entirely
- **Bug #19**: `download_local_backup()` now uses `realpath()` containment check after `file_exists()` to prevent symlink traversal

### Fixed
- **Bug #3+#7**: SQL import parser now correctly tracks `--` and `/* */` comment state; state persisted in `import_state.json` across HTTP request boundaries — prevents `;` inside comments from splitting queries
- **Bug #4**: `automation_id` added to `BackupArchive` TypeScript interface
- **Bug #5**: GDrive resumable upload session re-initiated on HTTP 404/410 (expired session) with restart cap of 2
- **Bug #6**: ContentEnhancer now exposes all post-type tabs (Posts, Pages, Products, Images) — was limited to Products only
- **Bug #8**: Receiver template self-integrity hash now computed on post-substitution output (two-pass substitution); Mode B migrations were returning 403 on every invocation
- **Bug #9**: `preserve_users` flag now correctly blocks `DELETE`, `UPDATE`, and `REPLACE` statements in both importer and receiver template
- **Bug #10**: Stuck-job detection uses byte-consumption tracking instead of query count — prevents reset when small queries execute alongside a giant stalled query
- **Bug #11**: Backup retention enforcement moved from `list_local_backups()` (GET) to `phase_prune()` post-backup — GET endpoints no longer delete files
- **Bug #12**: `alertEmail` field now editable in GeneralSettings UI (was ghost field — written to by diagnostics but with no UI)
- **Bug #14**: `SettingsResponse` TypeScript interface now includes `alertEmail`, `seoDefaultOgImage`, and `has*Key` boolean fields
- **Bug #15**: GeneralSettings save converted to per-field AJAX auto-save — eliminates page reload requirement
- **Bug #16**: `apply_content_rewrite` now allows `attachment` post type with `altText` field targeting `_wp_attachment_image_alt`
- **Bug #17**: Sync PII blocklist extended with WooCommerce HPOS order types (`wc_order`, `wc_order_coupon`, `wc_order_product`, `wc_user_membership`)
- **Bug #18**: Sync diff modal now has full WCAG 2.1 AA focus trap — Tab/Shift+Tab cycle within dialog, focus returns to trigger on close
- **Bug #20**: VPS `token_logs` now records `module` field for AI usage attribution (DB migration `v14_token_logs_module.sql`)
- **Bug #21**: `alertEmail` validation moved before all DB writes in `save_settings()` — prevents partial-save on invalid input; clearing the field now calls `delete_option()`
- **R4**: `restore_content_item` now accepts `attachment` post type — Undo for AI-rewritten image alt-text was returning 400
- **R5**: `phase_prune()` now uses backup set metadata (`automation_id`) to distinguish manual from automated backups instead of filename prefix heuristic
- **R6**: Missing backup file download returns 404 (not 403) — `file_exists()` check moved before `realpath()` containment

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.64] - 2026-04-10

### Security
- **F-138**: License keys masked in VPS logs — 4 sites in `license_new_v2.js` (`checkExpiry`, module-parse error, reset log, cancel log) now print `SWS-XXXX…YYYY` instead of the full key. Prior behavior leaked full keys to journalctl (equivalent to logging passwords).
- **F-139**: Admin recovery endpoint (`POST /v1/admin/recover`) now persists the new API key to the `settings` table and activates it in-memory via `process.env.ADMIN_API_KEY`. On server restart, `ensureRecoveryKey()` loads the key from the settings table if the env var is empty, so recovery survives a restart without manual `.env` editing. Prior behavior: key was generated, returned to caller, and immediately lost.
- **F-142**: Added `charge.refunded` Stripe webhook handler in `webhooks_new.js`. Matches license by invoice → subscription (primary), metadata.license_key (fallback), or customer_id (legacy fallback). Sets license status to `refunded`, logs refund amount to `token_logs`. Idempotent — skips licenses already in refunded/cancelled state. Prior behavior: refunds left licenses active indefinitely.
- **F-154**: Atomic CAS domain lock in `sentinel.js verifyLicense()`. Replaced two-step read-then-update with single `UPDATE ... WHERE license_key = ? AND domain IS NULL RETURNING domain`. On race loss, refetches the winning domain and returns a clean `Domain Mismatch` error. Matches the pattern already used in `license_new_v2.js /activate`.

### Fixed
- **F-141**: Raised plugin AI completions timeout from 60s to 125s in `class-swisswpsuite-groq.php::call_api()`. VPS forwards to Groq with a 120s timeout, so a 60s plugin timeout caused the VPS to deduct tokens while the plugin reported an error for any completion taking 61–120s. The 125s value provides a 5s safety margin above the VPS ceiling.
- **F-153**: `sentinel.js verifyLicense()` now accepts `PAST_DUE` alongside `ACTIVE` and `GRACE_PERIOD`. Scans no longer fail during the Stripe retry window, matching the behavior already present in `ai.js`. A past_due license keeps features active with a warning banner; denying scans contradicted that UX.

### Added
- **F-143**: Payment failure email notification. `handlePaymentFailed` in `webhooks_new.js` now sends a transactional email to the customer (via nodemailer using the same SMTP credentials as the crash alert system) with the plan name, attempt count, and a link to update the payment method (hosted_invoice_url or account page). Email is best-effort — a mail failure is logged but never blocks the webhook.
- **F-144**: Daily data retention cron in `server.js` (`runDataRetentionCleanup`). Deletes `token_logs` older than 90 days and `stripe_events` older than 365 days. Guarded by PostgreSQL advisory lock 100002 (100001 is the expiry cron). Runs once on startup (after 60s delay) then every 24h via `setInterval`. GDPR Art. 5(1)(e) compliance — the privacy policy's "account + 30 days" retention promise now has an enforcement mechanism.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.63] - 2026-04-10

### Security
- ZIP bomb protection added to `receiver_validate_zip()` — rejects zip entries >50MB or total extraction >300MB before extraction begins
- `fix-missing-titles` endpoint migrated from `check_pro_permission` to `check_capability('seo_meta')` for correct tier enforcement

### Fixed
- SEO cleanup: `cleanup_stuck_items()` now uses NOT EXISTS subqueries — only removes stuck markers for items with neither success NOR failure markers (was incorrectly removing items that were queued but not yet processed)
- SEO bg_queue: `process_bg_seo_queue()` writes `_swisswpsuite_seo_processed_at` marker after each post to prevent duplicate processing in overlapping cron runs
- SEO sitemap: noindex posts excluded from XML sitemap via `meta_query` on `_swisswpsuite_seo_noindex`
- SEO optimization: `wp_page_for_login` excluded from SEO optimization targets to prevent conflicts with login-page plugins
- Content Enhancer: Bulk Apply returns failed item IDs and surfaces warning toast when any items fail
- Transport: File write failures now throw `RuntimeException`; caller (`handle_transfer`) catches and returns HTTP 500 instead of silently discarding data
- Backup: `get_signing_secret()` logs WARNING on placeholder salts before returning empty string
- Migration receiver: Self-destruct now checks `.htaccess` write return value and logs failure instead of silently leaving the file accessible
- Settings: Encryption password corruption detection added via `openssl_decrypt` check — surfaces `encryptionPasswordCorrupted` flag
- Sync: `download_url()` failures now logged via `SwissWPSuite_Diagnostics` instead of swallowed silently
- Sync: `delete_connection()` cleans up orphaned `_swisswpsuite_sync_origin` postmeta entries on connection deletion

### Removed
- Dead `Settings.tsx` component (523 lines, zero importers) — routing uses `SettingsPage.tsx`

### Documentation
- `SYNC_ARCHITECTURE.md`: Corrected 3-way comparison strategy description — replaces outdated "Newest Wins" with accurate source/target/hash comparison

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.62] - 2026-04-10

### Security
- Blocked SSRF redirect-chain bypass in `ping_custom_api_url()` — `redirection => 0` prevents following 301/302 redirects to internal hosts after initial URL validation
- Prevented plugin license key exfiltration to external custom API endpoints when BYO key is absent — Groq constructor now sets `$this->license_key = ''` in custom mode with empty BYO key

### Fixed
- PHP 8.0+ `TypeError` crash in `get_content_items()` bulk `hasHistory` query — `$ids_with_history ?? []` guard prevents `array_map(callable, null)` fatal error on DB failure
- Sync origin collision guard now correctly handles deleted connections — stale `_swisswpsuite_sync_origin` from deleted connections no longer permanently blocks future syncs
- `response_format: json_object` re-enabled for BYO/custom API users in `call_api()` — Bunker proxy users unaffected (conditional injection via `$use_custom_api && $json_mode`)
- LLM.txt generation wrapped in `function_exists('do_blocks')` guard for headless/minimal WordPress installs
- Content Enhancer "Fun & Witty" tone option now sends `value="Fun"` to match REST API enum — previously "Fun & Witty" caused HTTP 400 on all tone rewrites
- SEO config key `swisswpsuite_seo_rewrite_titles` moved to correct `SITE_LOCAL_CONFIG` category in config manifest

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.61] - 2026-04-09

### Fixed
- Mobile tab bar overflow: Security Hub, SEO, and Settings tabs are now accessible on 375px viewports
- Backup list Restore/Delete action buttons now visible via sticky positioning on mobile
- SEO content area 254px horizontal overflow resolved with min-w-0 constraint

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.60] - 2026-04-09

### Fixed
- (api) F-111: POST `/content/{id}` now requires Pro-tier `content_rewrite` capability
- (api) F-112: `update_content_item` post_type restricted to product/post/page/attachment allowlist
- (api) F-129: `/seo/onpage-audit` corrected to `seo_meta` capability check
- (api) F-110: `save_meta_history` uses `add_post_meta` unique=true to preserve original value
- (api) F-114: Empty AI rewrite result returns 422 with error message instead of silent success
- (seo) F-122: All `wp_update_post` calls in SEO worker check return value for `WP_Error`
- (seo) F-126: SEO batch staleness detection (20-min threshold) + daily cleanup cron
- (seo) F-127: "Missing SEO" badge renamed to "Needs Attention"
- (sync) F-108: `wp_cache_delete` added to sync scheduler save/delete to prevent stale reads
- (sync) F-102: Attachment LIKE query uses directory-boundary prefix + exact-match fallback
- (sync) F-105: PII post type blocklist extended (edd_payment, give_payment, llms_order, etc.)
- (config) F-120/F-121/F-133: Three SEO cron hooks registered in config manifest
- (ui) F-117: All `(window as any).swisswpsuiteData` casts removed, backed by `vite-env.d.ts`
- (ui) F-130: ContentEnhancer parses 422 error body for specific AI error toast
- (ui) F-131: Dashboard `.license?.plan` corrected to `.license?.tier`
- (ui) F-132: LicenseManager explicit `TokenStatus` construction

### Added
- (vps) F-092: `sentinelAnalyzeLimiter` (5/min per license key) on POST `/analyze`
- (vps) F-093: `aiCompletionsLimiter` (30/min per license key) on POST `/completions`
- (vps) F-094: `batchSubmitLimiter` (5/min per license key) on POST `/batch/submit`

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.59] - 2026-04-08

### Fixed

- (backup) P1-A: Added `sslverify => apply_filters('https_local_ssl_verify', false)` to `chain_next_tick()` args — Hostinger's self-signed loopback certificate was causing silent TLS failures (HTTP 0), stalling the engine tick chain
- (backup) P1-B: `chain_next_tick()` now registered on WordPress `shutdown` action at priority 999 instead of firing inline — LiteSpeed LSAPI was killing the loopback TLS handshake before response completion, causing HTTP 0
- (backup) P1-C: Moved `Diagnostics::log()` call in `chain_next_tick()` to after `wp_remote_post()` returns — eliminates a blocking DB write (get_option + update_option) on the critical pre-loopback path
- (backup) P1-D: Restored `sslverify => false` to `spawn_worker()` in Sentinel (HIGH-3 FIX removed it incorrectly — loopback SSL verify is not a MITM protection; the shared secret is); replaced misleading comment with correct explanation
- (backup) P1-E: Added concurrent-automation stagger in `chain_next_tick()` — if another engine job has a heartbeat <30s old, inserts a 0.5-1.5s random delay before firing the loopback to avoid exhausting Hostinger's 10-worker PHP pool
- (diagnostics) P2-A: Added v2.9.27.59 upgrade migration to purge stale log noise entries (`BackupScheduler constructor:`, `CORE Dependencies loaded.`, `backup_cloud capability gate`) from existing installs and fix the autoload flag via direct SQL
- (diagnostics) P2-B: `update_option('swisswpsuite_debug_log', ...)` now passes `false` as third arg — large serialized 500-entry arrays must not autoload on every WordPress page load
- (diagnostics) P2-C: Added consecutive-duplicate deduplication in `Diagnostics::log()` — skips insertion if the most recent entry carries the same module + message, preventing a chatty call from filling the entire 500-entry buffer

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.58] - 2026-04-08

### Fixed
- (backup) Prune off-by-one: keep_count-1 passed to get_prunable_sets() so exactly N backups are retained
- (backup) is_auto detection fixed: looks up nonce in backup_sets option instead of checking filename prefix
- (backup) Constructor log noise removed from BackupScheduler and Core — debug log now shows real entries
- (core) Bootstrap error_log() fallbacks replaced with Diagnostics::log() guards
- (ui) F-090: "Security Alert: Under Attack" banner no longer shows false "no login protection or IP block is active" warning when Login Safeguard is enabled or the attacking IP is already banned — banner now evaluates real-time frontend state and shows an amber "Login protection is active" notice instead

## [2.9.27.57] - 2026-04-08

### Fixed
- Backup retention off-by-one: `phase_prune()` now uses `keep_count - 1` when querying and pruning backup sets, because the current backup's set record is not created until `phase_complete()` runs after pruning. Previously with retention=2, prune saw 2 sets, kept both, then `phase_complete()` added a 3rd — leaving retention+1 backups on disk.
- `is_auto` detection in local backup list API now uses the backup sets registry (nonce lookup) instead of checking for the `auto-` filename prefix. Engine-produced filenames (`backup-db-{nonce}.zip`, `backup-full-{nonce}.zip`, etc.) never start with `auto-`, so automation backups were always reported as manual. The response now also includes `automation_id` for matched sets.
- Removed three high-frequency log entries that fired on every WordPress page load and filled the 500-entry diagnostics buffer within minutes: "Dependencies loaded." (core.php), "backup_cloud capability gate" (core.php), and "constructor: registered N automation hook(s)" (backup-scheduler.php).

### Security
- 2FA rate limiting migrated from transients to persistent options (autoload=false) — prevents brute-force bypass on Redis/Memcached object cache backends where transients are evictable (F-087)
- Quarantine `.htaccess` and `index.php` writes now check return value and log via Diagnostics on failure — prevents silently unprotected quarantine directories on disk-full or permission errors (F-082)
- Geoblocking stored user agent now sanitized with `sanitize_text_field()` — closes stored XSS vector in log exports and admin panels (F-083)
- Geoblocking log `update_option()` calls hardened with `autoload=false` — reduces per-request memory load (F-084)
- Quarantine `base64_decode()` uses strict mode with validation — skips corrupted entries instead of returning garbage paths (F-086)
- Quarantine date formatting changed to `wp_date()` for timezone-consistent display (F-085)
- Hardening default preset now includes `block_user_enumeration: true` (F-089)

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.56] - 2026-04-08

### Fixed
- Sentinel `stuck_count` no longer carries over to the next automation run cycle. `complete_job()` now resets `stuck_count=0` and `circuit_open=false` before removing the job entry, so any disk-write failure leaves a clean entry rather than one with an accumulated count that could prematurely trip the circuit breaker on the next cycle.
- Backup engine prune phase (`phase_prune()`) now calls `phase_complete()` directly instead of `transition_to('complete')`. The old path set `phase='complete'` in state and relied on `chain_next_tick()` dispatching an HTTP loopback to actually execute `phase_complete()`. Under server load that loopback returned HTTP 0, leaving jobs permanently stuck at "prune done, waiting for done tick." Inline completion eliminates the extra round-trip and the failure mode entirely.
- Automation cron stagger (3 minutes per slot, added in v2.9.27.55) is now retroactively applied to all existing enabled automations via a one-time upgrade migration in `run_upgrade_migrations()`. Previously, the `schedule_cron_event()` early-exit guard ("already scheduled — skip") prevented the stagger code from running on automations created before v2.9.27.55.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.55] - 2026-04-08

### Fixed
- Backup automations sharing the same schedule frequency (e.g. two hourly automations) are now staggered by 3 minutes per slot when their WP-Cron events are registered, preventing concurrent loopback HTTP collisions that caused LiteSpeed/Hostinger to silently drop one worker request (HTTP 0) on every run.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.54] - 2026-04-08

### Added
- **Maintenance tab warnings banner** — The `/system-logs` REST response's `warnings` array is now rendered at the top of the Maintenance tab. Each warning shows as a severity-coloured banner (amber/orange/red). The `DISABLE_WP_CRON` public-access warning introduced in v2.9.27.53 is now visible to admins without any additional action.

### Changed
- `SystemLogsWarning` and `SystemLogsResponse` interfaces added to `plugin/src/types.ts`.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.53] - 2026-04-08

### Fixed
- **[BUG-A] Debug log API capped at 100 entries** — `get_system_logs()` in api.php sliced to 100, overriding the 500-entry buffer in diagnostics.php. Now returns up to 500 entries.
- **[BUG-B] Backup automation `created_at` timezone drift** — `current_time('mysql')` (local time) replaced with `gmdate('Y-m-d H:i:s')` (UTC) in `create()` and `migrate_legacy()` for consistency with `last_run_at`.

### Security
- **[PENTEST-M01] Route existence oracle eliminated** — unauthenticated REST requests to non-whitelisted routes now return HTTP 404 (was 401), preventing attackers from enumerating valid routes.
- **[PENTEST-M03] REST allowlist filter removed** — `apply_filters('swisswpsuite_rest_api_allowed_routes')` allowed any plugin to inject routes into the guest allowlist. No legitimate callers existed; removed entirely.
- **[PENTEST-M02] /backup/ping hidden from OPTIONS schema** — added `show_in_index => false` to prevent endpoint discovery via REST API index.
- **[PENTEST-L05] wp-cron.php public access warning** — diagnostics panel now warns if `DISABLE_WP_CRON` is not defined in wp-config.php.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.52] - 2026-04-08

### Fixed
- **[CRITICAL] Sentinel job ID mismatch** — `is_engine_job_complete()` and `cancel_engine_state_for_job()` were comparing `bkeng_*` engine IDs against `backup_auto_*` sentinel IDs — they never matched, making both functions no-ops. Now matches on `automation_id` field after stripping the sentinel prefix.
- **[HIGH] Manual backup heartbeat sent to wrong sentinel job** — heartbeat used `backup_auto_` prefix for all jobs; manual backups are registered as `backup_manual_`. Fixed to use `$state['trigger']`-aware prefix.
- **[HIGH] Manual backup never cleaned up sentinel entry** — `complete_job()` was guarded by `automation_id !== null`, skipping all manual backups. Now called unconditionally for all backup types.
- **[HIGH] `check_loopback()` called unregistered `/health` endpoint** — always hit 404. Switched to `/backup/ping` which is registered and whitelisted in both security layers.
- **[HIGH] Security layer mismatch** — `/health` was in geo-blocking exempt list but the endpoint never existed. Replaced with `/backup/ping` to match the loopback fix.
- **[HIGH] Watchdog timezone mismatch** — `last_run_at` stored as `current_time('mysql')` (WP local time) but compared against `time()` (UTC) in the watchdog, causing 2h false offset on UTC+2 sites. Changed to `gmdate('Y-m-d H:i:s')` (UTC).
- **[MEDIUM] Removed 4 ANCHOR-DEBUG log statements** from `schedule_cron_event()` that fired on every backup run.
- **[MEDIUM] Removed `@` error suppressor** from temp dir `.htaccess`/`index.php` writes; failures now logged via `SwissWPSuite_Diagnostics`.
- **[MEDIUM] Keyset pagination infinite loop on UUID/VARCHAR PKs** — `%d` coerced non-integer PKs to 0; now detects PK column type and falls back to OFFSET pagination for non-integer keys.
- **[MEDIUM] BackupEngineStatus TypeScript interface** — added missing `total_elapsed`, `created_at`, `updated_at` fields.
- **[LOW] Heartbeat I/O debounce** — `write_jobs()` now only persists to DB/disk every 30 seconds instead of on every engine tick.
- **Debug log buffer** increased from 100 to 500 entries for better diagnostics visibility.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.51] - 2026-04-08

### Fixed
- **Dashboard "Last Backup" showing wrong time** — `human_time_diff()` was comparing `filemtime()` (UTC Unix timestamp) against `current_time('timestamp')` (UTC + site timezone offset). On a UTC+2 site this inflated the displayed age by 2 hours, showing "3 hours ago" for a backup that was 35 minutes old. Changed to `time()` which is always UTC, matching `filemtime()`.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.50] - 2026-04-08

### Fixed
- **Backup pruning race condition** — `phase_prune()` now acquires a per-automation mutex (transient + object-cache) before executing the read-modify-write on the backup sets option. Concurrent engine instances (e.g., two Sentinel recovery runs in the same hour) skip pruning if the lock is held, preventing one run from overwriting the other's prune result and leaving excess backup sets.
- **GDrive cloud list always showing "configured: false"** — `list_cloud_backups()` now checks for GDrive `access_token` or `refresh_token` presence (matching the actual upload credential path) and calls `list_files()` when either exists. Previously it returned empty/unconfigured even when GDrive uploads were succeeding.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.49] - 2026-04-08

### Fixed
- **Sentinel overwrites successful automation status** -- Before marking a job abandoned/failed, the watchdog now checks whether the backup engine already completed the job (engine state `status === 'complete'`). If so, it cleans up the stale Sentinel entry without calling `set_last_run('failed')`. Prevents the circuit breaker from overwriting a correct "success" status 30 minutes after a fast backup completes.
- **Concurrent spawn_worker loopback collision** -- `spawn_worker()` now checks a 5-second transient for the last spawn timestamp. If two automations fire within 1 second of each other, the second spawn is delayed by 500ms, preventing LiteSpeed from dropping one of the two near-simultaneous loopback connections.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.48] - 2026-04-08

### Fixed
- **Concurrent backup temp dir collision** -- `get_temp_dir()` now appends the job_id to the temp path so each engine instance gets an isolated directory. Previously, two simultaneous automations with the same scope (e.g., two hourly db backups) shared the same temp dir — the first to finish would `rmdir()` it, causing the second to fatal with "SQL dump file not found."
- **Engine failure not updating automation status** -- When `cleanup_on_failure()` is called, it now invokes `set_last_run('failed', ...)` on the automation if `automation_id` is set. Previously, a failed engine left the automation permanently stuck in "running" until the watchdog's abandonment timeout.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.47] - 2026-04-08

### Fixed
- **Critical backup regression (v2.9.27.39)** -- Added `/backup/engine/tick` to the REST API guest whitelist in `restrict_rest_api()`. The v2.9.27.39 security hardening tightened the whitelist from the broad `/swisswpsuite/v1/` prefix to surgical entries, but omitted the tick endpoint. Because `wp_remote_post()` loopback calls are unauthenticated at the HTTP layer, they were blocked before reaching the route handler, causing HTTP 0 responses and breaking the entire tick chain for all automations.
- Added `/backup/engine/tick` and `/sentinel/worker` to the geo-blocking exempt list as a defensive measure — server-to-self loopback requests must bypass country checks.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.46] - 2026-04-07

### Fixed
- Lowered stuck-job detection threshold from 2 hours to 30 minutes — "Clear Stuck Jobs" button now appears ~30 min after a job gets stuck, not 2 hours later

## [2.9.27.45] - 2026-04-07

### Fixed
- **Zombie engine state loop** -- When Sentinel abandons a job (max attempts or circuit breaker), it now also sets the corresponding `swisswpsuite_backup_engine_*` WP option row to `cancelled`. Previously, the engine state stayed `running` and TickDispatcher would fire loopback HTTP every 5 minutes indefinitely, driving server load to 7-9.
- **TickDispatcher zombie guard** -- `discover_active_jobs()` now skips engine state rows whose `last_tick_start` is older than 2 hours. These rows are auto-cancelled to prevent future scans from encountering them.
- **HTTP 0 false-alarm suppression** -- `chain_next_tick()` no longer logs a warning for HTTP response code 0, which is the expected response for non-blocking requests (`blocking => false`).

### Added
- **POST /backup/clear-stuck-jobs** -- Emergency REST endpoint that finds and cancels all stuck engine state rows (running/pending with last activity >2 hours). Returns count of cleared jobs for audit trail.
- **"Clear Stuck Jobs" button** -- Shown in the Backup Automations panel when stuck jobs are detected. Red/danger styling to indicate it's an emergency tool.
- **`stuck_job_count` in automations response** -- GET /backup/automations now includes a count of stuck engine state rows so the frontend can conditionally show the clear button.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.44] - 2026-04-07

### Fixed
- **Backup schedule anchor now actually preserved across plugin updates** -- fixed array indexing bug where `schedule_cron_event()` used string ID on a numerically-indexed array, causing `last_run_at` lookup to always return null and reset to `time()+interval`.
- **UI edits no longer reset backup schedule time** -- `sync_cron_events()` now delegates to `schedule_cron_event()` instead of bypassing anchor logic with `time()+60`.
- **Deleting a backup automation now clears its cron event** -- prevents orphaned WP-Cron events.
- **Free users no longer get phantom backup cron events** -- `ensure_cron_events()` gated behind `backup_cloud` capability.
- **Post-import recovery now re-registers backup automation cron hooks** -- per-automation dynamic hooks restored alongside manifest hooks.
- **Diagnostic warning logged when backup cron scheduling fails** -- visible in plugin UI diagnostics panel.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.43] - 2026-04-07

### Fixed
- **Plugin update no longer resets backup schedule times** -- schedule_cron_event() now computes the next occurrence from last_run_at + interval instead of time(). If a user's daily backup was set to run at 3 AM, it stays at 3 AM after a plugin update. New automations with no history start at now + interval.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.42] - 2026-04-07

### Fixed
- **Countdown timezone mismatch** -- compute_next_run() now returns UTC ISO 8601 (with Z suffix) instead of site-local wp_date(). Frontend parses UTC correctly regardless of browser timezone. Daily backups now show "23h 47m" instead of "1d".
- **Countdown always shows hours+minutes** -- removed the "Xd" rounding; all countdowns show precise hours and minutes (e.g. "25h 30m" instead of "1d").

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.41] - 2026-04-07

### Fixed
- **Backup countdown shows "Overdue" for all automations** -- next_run was computed once at creation and never refreshed. get_all() now recomputes next_run from live wp_next_scheduled() on every API read so the UI always shows accurate countdown.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.40] - 2026-04-07

### Added
- **Backup countdown timer** -- each automation card shows live "Next run in Xh Ym" countdown that auto-updates every 60 seconds. States: Running now (amber), Overdue (red), <10 min (orange), normal (blue), Disabled (gray).

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.39] - 2026-04-07

### Security
- **Log injection fixed** -- username sanitized with sanitize_user() before writing to security threat log (HIGH-1)
- **Tier gate hardened** -- force_security_headers and disable_rest_api_guests added to pro_only_options internal gate (HIGH-2)
- **uploads/.htaccess migrated to insert_with_markers** -- no more file_put_contents anti-pattern, proper marker management (HIGH-3)
- **CF-Connecting-IP validated** -- FILTER_VALIDATE_IP check added before trusting Cloudflare header (HIGH-4, 2 audits overdue)
- **REST API namespace whitelist tightened** -- replaced broad /v1/ match with 3 surgical public endpoints
- **Core scan locale-aware** -- uses get_locale() instead of hardcoded en_US, eliminates false positives on non-English sites
- **Scanner reports highest severity** -- no longer stops at first pattern match; scans all patterns and reports worst-case

### Fixed
- **Deactivator cleanup** -- restrict_google_indexing and restrict_llm_crawlers settings cleared on deactivation (prevents silent reactivation of Google deindexing)
- **uploads/.htaccess cleanup** -- deactivator now removes SwissSuite markers from uploads/.htaccess

### Changed
- **18 security regression baselines** added to REGRESSION_BASELINE.md -- every future audit verifies these
- **Comprehensive auditor CAT-10** now includes mandatory 15-point security invariant checklist -- can never skip deep security review
- **SECURITY_HUB.md updated** -- reflects 13 hardening options (was 11)

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.38] - 2026-04-07

### Fixed
- **[CRITICAL] Backup tick chain timeout** -- chain_next_tick() raised from 1s to 5s, matching Hostinger TLS handshake requirements
- **[CRITICAL] Sentinel job stays "pending"** -- register_job() now sets status to "running" after spawn, preventing duplicate worker spawns
- **[CRITICAL] Parallel engine corruption** -- run_automation_backup() now checks for active engine jobs before registering new ones
- **[CRITICAL] Silent file write failure** -- write_jobs() no longer suppresses errors; logs warning on failure, wp_options is authoritative fallback
- **[HIGH] Flock failure without heartbeat** -- execute_automation_backup() now calls heartbeat() on flock contention to prevent false "stuck" detection
- **[HIGH] Rate limiter blocks loopback ticks** -- engine tick rate limiter now exempts loopback requests (nonce-protected)
- **[HIGH] Circuit breaker reset on active jobs** -- register_job() skips re-registration when job is already running
- **[HIGH] Migrated automations never fire** -- migrate_legacy() now calls sync_cron_events() after saving automation records
- **[HIGH] TickDispatcher init gated behind license** -- moved init() outside backup_cloud capability gate so health check always registers
- **[HIGH] Manual backup wrong Sentinel prefix** -- manual jobs now use "backup_manual_" prefix to avoid automation dispatch collision
- **[MEDIUM] Orphaned engine state cleanup** -- load_all_states() now purges stale complete/failed states older than 24 hours
- **[MEDIUM] CronHelper spawn timeout** -- raised from 0.01s to 2s for HTTPS loopback compatibility
- **[LOW] chain_next_tick ignores HTTP 429** -- now logs non-200 responses for chain break debugging
- **[LOW] ZIP SQL duplication on retry** -- archive_db_only_zip() now uses locateName() idempotency check

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.37] - 2026-04-07

### Fixed
- **Meta description auto-padding now works for near-miss lengths** -- added short padders (" Read more.", " Learn more.", " Get started.") for descriptions at 139-149 chars. Previous padders (30+ chars) overshot the 165 cap for near-miss cases. Raised cap to 170 to accommodate site name padders.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.36] - 2026-04-07

### Fixed
- **AI SEO generation 38% failure rate** -- root cause: overly complex prompt with contradictory character-counting instructions caused Groq API `json_validate_failed` errors. Prompt stripped back to clean, simple instructions. Post-generation validation (truncation + padding) handles length enforcement instead of prompt-level instructions.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.35] - 2026-04-07

### Fixed
- **AI SEO prompt redesigned for thin content** -- two-tier approach: rich content gets strict 150-160 char enforcement, thin/empty pages get marketing-oriented prompt using site name and page purpose
- **Auto-padding for short descriptions** -- if AI generates 130-149 chars, the system appends a relevant call-to-action phrase to reach 150+ chars automatically
- **CRITICAL reinforcement in prompt** -- explicit "count every character including spaces" instruction plus "Not 140, not 149, not 161" examples to reduce AI miscounts

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.34] - 2026-04-07

### Fixed
- **Utility pages excluded from content length check** -- Home, Blog, Shop, Cart, Checkout, My Account, Login no longer flagged for thin content (template-rendered pages have no post_content by design)
- **AI meta description prompt hardened** -- now enforces "MUST be 150-160 characters" instead of "around 155"; descriptions over 160 chars auto-truncated at word boundary
- **SEO quality gate constant aligned** -- SEO_MIN_DESC_LENGTH updated from 120 to 150, matching the scanner threshold

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.33] - 2026-04-07

### Added
- **WooCommerce Product schema (JSON-LD)** -- automatic Product structured data with price, availability, SKU, ratings for all WooCommerce products
- **Theme-aware H1 detection** -- SEO scanner now assumes theme renders post title as H1 (standard WP behavior), eliminating false positives; front-page exception preserved
- **Page-builder content length analysis** -- SEO scanner extracts and counts text from Elementor, Divi, and Beaver Builder meta data instead of reporting 0 words

### Fixed
- **Schema markup false positives eliminated** -- SEO audit now recognizes that SwissSuite Frontend already injects Article/WebPage/FAQ schema via wp_head (was checking post_content only)

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.32] - 2026-04-07

### Fixed
- **Silent data loss in content editor** -- wp_update_post() now checks return value and returns 500 on DB failure (F-067)
- **SEO description threshold mismatch** -- UI and PHP both use 150 chars now (was 120, scoring used 150) (F-030, F-031)
- **SEO N+1 query** -- batch-prefetch page-builder meta in check_content_length instead of per-post queries (F-016)
- **Content writer race condition** -- bulk rewrite button disabled during in-flight individual rewrites (F-069)
- **Dashboard route crash** -- #/dashboard now redirects to #/ instead of showing React Router 404 (F-075)
- **Config manifest gaps** -- 3 missing option keys added (last_import_completed, security_fixed_findings, seo_batch_filters) (F-070)
- **Backup autoload bloat** -- all 16 export update_option() calls now use autoload=false (F-071)

### Changed
- **Hardening constants deduplicated** -- FREE_HARDENING_KEYS extracted to shared constants/hardening.ts (F-074)
- **Doc version headers updated** -- SECURITY_HUB.md and SECURITY_CAPABILITIES_REFERENCE.md brought to current version (F-072, F-073)

### Security
- **Vite dev dependency updated** -- 0 npm vulnerabilities (was 2 HIGH CVEs) (F-068)

### Removed
- 4 dead VPS route files (license.js, ai_new.js, api.js, license_new.js) (F-055)
- 35 stale .bak files from VPS routes directory (F-056)

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.31] - 2026-04-06

### Changed
- **License tab fully rewritten** -- 12 jargon items replaced: "ACCESS PROTOCOL" → "License", "NEURAL RESOURCES" → "AI Token Balance", "ACQUIRE RESOURCES" → "Buy More Tokens", etc. Added plan name formatter for readable display.
- **Security Hub jargon cleanup** -- "Deep Code Extraction" → "Deep File Scanner", "ARMOR-PLATING YOUR WORDPRESS CORE" → plain English, "LAYER 1" badges → "Quick Scan", hardening button → "Apply All Recommended Settings"
- **WPScan & Patchstack explanations** -- Both API key fields now have plain-English descriptions explaining what the service does, that scans run automatically, and where to get the free key
- **Security feature descriptions expanded** -- Detection Only mode, login attempt limits, file integrity, blocked IPs, and hardening options all have clear plain-English explanations
- **SEO brand names removed** -- "ChatGPT and Gemini" replaced with "AI assistants" throughout SEO Manager
- **AI Content Writer explanations** -- Added token usage notice, "How it works" guide, tooltips on tone selector and instruction input, button explanations
- **Dashboard action descriptions** -- Quick action buttons now explain exactly what clicking them does

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.30] - 2026-04-06

### Fixed
- **3 surviving jargon items** -- "NEURAL CORE INTEGRITY" → "SEO HEALTH" on Dashboard, "Precision threat monitoring..." → plain English on Security Hub, "Content Forge" → "AI Content Writer" on AI Content page

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.29] - 2026-04-06

### Changed
- **Full UX clarity pass** -- Replaced all military/sci-fi jargon with plain English across Dashboard, Security Hub, SEO Manager, and sidebar navigation
- **Dashboard honest empty state** -- Removed fake fallback statistics; shows "No data yet" when no scan has run
- **SecurityHub fake stats removed** -- Deleted hardcoded "100% Precision" and "High Availability" decorative bars
- **Scan button naming** -- "Layer 1 Scan" → "Quick Scan", "Deep Malware Scan" → "Full Scan", consistent naming throughout
- **SEO Manager label rewrite** -- 128 lines of jargon replaced: "Intel Asset" → "Content", "Non-Compliant" → "Needs SEO", "Terminate Session" → "Close", and token usage warnings added
- **Sidebar navigation** -- "Command Center" → "Dashboard", "Defense Hub" → "Security", "Content Forge" → "AI Content", "System Config" → "Settings"

### Fixed
- **Polling-driven SEO queue** -- On Cloudflare/LiteSpeed hosts where WP-Cron loopback is blocked, each status poll now processes 1 queue item server-side
- **Bulk content list limit** -- Raised to 10,000 when fields=ids for bulk SEO queue building (UI pagination stays at 200)

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.27] - 2026-04-06

### Fixed
- **Deep scan timeout** -- WP-Cron loopback now targets `/wp-cron.php` directly instead of the site root; shared `SwissWPSuite_Cron_Helper` utility ensures scheduled events fire immediately on low-traffic sites behind Cloudflare/LiteSpeed
- **SEO background processing stuck** -- Added cron spawn after scheduling SEO background queue; processing now starts immediately without waiting for the next page visit
- **Automated backups not running** -- Backup scheduler now force-spawns WP-Cron after job registration to prevent stale cron events on low-traffic sites
- **License sync page reload** -- Sync button no longer causes a full page reload; token balance updates in-place via AJAX and the active Settings tab is preserved
- **Neural Traffic Monitor shows no visits** -- Dashboard stats endpoint now reads from the native pageview tracker instead of returning hardcoded zeros
- **AI advisor recommends 2FA when already active** -- Intelligence Advisor prompt now includes 2FA status so the AI does not recommend enabling an already-active feature
- **SEO modal accessibility** -- SEO Health Audit modal now has `role="dialog"`, `aria-modal`, `aria-labelledby`, Escape key close handler, auto-focus on open, and accessible close button label

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.25] - 2026-04-04

### Fixed
- **SEO PAGES badge** -- Badge row now shows a dedicated PAGES category with its own non-compliant count; pages were previously invisible in the summary row
- **SEO posts/pages separation** -- POSTS badge now counts only `post_type=post` items; PAGES badge counts only `post_type=page` items; the two were previously lumped together under POSTS
- **SEO health transient staleness** -- On-page audit cache is now invalidated when a scan completes or a batch job finishes, so the Dashboard SEO HEALTH tile reflects the latest scan result immediately

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.24] - 2026-04-04

### Fixed
- **Sentinel PHP remediation** -- PHP version check is now context-aware; sites already running PHP 8.2+ receive an "up to date" confirmation instead of a stale "upgrade to 8.2+" tip
- **Sentinel server header remediation** -- Server Software finding now detects LiteSpeed vs Nginx vs Apache and provides server-specific fix instructions instead of generic Apache/Nginx commands

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.23] - 2026-04-04

### Fixed
- **SEO score accuracy** -- Score no longer shows false 100% when posts/images are missing; a `missing_total` safety cap ensures score stays at 99 when any category has unresolved items
- **SEO formula consistency** -- META COVERAGE on_page score now uses the same weighted formula as the headline SEO score (optimal×1.0 + acceptable×0.6 + faq_bonus), eliminating score discrepancy
- **SEO action list completeness** -- Posts with 120–149 character descriptions now appear in the optimization action list (threshold aligned to 150-char optimal, matching the missing counter)
- **SEO "All optimized" accuracy** -- "All assets fully optimized" message now correctly checks `details.post.missing` and `details.image.missing` in addition to `non_compliant_items.length`

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.22] - 2026-04-04

### Fixed
- **Config manifest completeness** -- 36 previously unregistered option keys now registered in config manifest (backup export protection, import recovery, deep scan runtime state)
- **Autoload optimization** -- Security scan result options (`swisswpsuite_basic_scan_result`, `swisswpsuite_scan_result`) set to `autoload=false` to reduce WordPress autoload cache size
- **SQL WPCS compliance** -- Table name references in trainer, logger, and WAF stats queries now use `$wpdb->prepare()` and `esc_sql()` instead of direct interpolation
- **Documentation headers** -- SECURITY_HUB.md and SECURITY_CAPABILITIES_REFERENCE.md updated to v2.9.27.22

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.21] - 2026-04-04

### Fixed
- **AI audit reads actual hardening state** — prompt now instructs AI to check `hardening.{key}` value from snapshot; only flags options genuinely set to `false`; never reports enabled options as vulnerabilities
- **SECURITY_BENEFICIAL options strictly excluded from Critical findings** — CSP (`enable_csp`) and Geo-Blocking forbidden from appearing in `security_issues`/`critical_issues` under any circumstances; appear only in `improvement_suggestions`
- **Remediation text uses UI labels** — human-readable labels ("Disable XML-RPC", "Block PHP in Uploads") replace internal PHP option keys (`disable_xmlrpc`, `block_php_uploads`) in all AI-generated remediation paths
- **L2 CVE false positives eliminated** — CVEs missing `fixed_in` version now downgraded to `medium` severity with `unverified: true` flag; Grade F automatic fail requires a confirmed (non-unverified) CVE finding; LiteSpeed Cache 7.8.1 false positive scenario fixed
- **Environment/Configuration finding groups** — M4 findings (WordPress Version, PHP Version, Server Software Header, Plugin Inventory, Cloud Protection) and M3 findings (license.txt) now grouped under dedicated "Environment" and "Configuration" categories instead of misclassified "External Files"
- **File-action buttons suppressed for non-file findings** — Quarantine and Delete action buttons hidden for findings in Environment and Configuration groups where file operations make no sense
- **Mark Safe for non-file findings** — new `swisswpsuite_sentinel_ignored_findings` wp_option stores finding IDs; M3/M4 scan modules check this list; non-file findings (WP Version, PHP Version, etc.) can now be permanently dismissed

### Added
- `swisswpsuite_sentinel_ignored_findings` wp_option (registered in `swisswpsuite-config-manifest.php`) — stores finding IDs for non-file findings that should be suppressed in future scans

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.20] - 2026-04-04

### Fixed
- **AI daily audit prompt rewrite** — SEO features (`restrict_llm_crawlers`, `restrict_google_indexing`) removed from hardening gap list; they are not security controls
- **Hardening option tiers** — 13 options classified as security-critical / security-beneficial / operational / excluded; blanket "each disabled option = vulnerability" rule removed
- **WordPress-normal exclusions** — writable `wp-content/uploads` no longer flagged as vulnerability; orphaned tables downgraded to maintenance-level; wp-cron public access contextualized
- **Post-AI deterministic risk capping** — AI cannot return High/Critical when only improvement suggestions (Pro upsells) exist; adds server-side validation of risk score
- **Orphaned table false positives** — added `termmeta`, `wc_*` (WooCommerce), `swisswpsuite_*` (own plugin), `actionscheduler_*` prefix mappings
- **wp-config.php writability** — context-annotated in AI snapshot (owner-writable is normal for WordPress auto-updates)
- **Deep scan severity tiers** — known webshells (c99shell, FilesMan, r57shell, b374k, WSO) → critical; exec with user input → high; obfuscation-only (hex2bin, str_rot13, chr chains) → medium
- **Cron double-binding** — removed legacy System A `add_action` in `security.php`; daily hook fires exactly once via System B (deterministic L1+L2)
- **Free-tier daily email** — replaces useless "Unknown Risk / Upgrade to Pro" with real L1 deterministic scan findings and computed risk level
- **Mark Safe persistence** — `get_sentinel_scan_record()` now filters `swisswpsuite_security_ignored_paths`; ignored files no longer reappear on page refresh
- **Duplicate Quarantine button** — Delete action now uses red button + Trash2 icon + "Permanently delete — cannot be undone" confirmation; Quarantine remains amber + Archive icon

### Added
- `compute_risk_level()` method in `SwissWPSuite_Sentinel_Security` — deterministic L1 findings → risk level mapping (Critical/High/Medium/Low/Info)

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.19] - 2026-04-03

### Fixed
- **SEO "Run Full Scan" button invisible in WordPress admin** — button rendered white-on-white due to WP admin CSS overriding Tailwind styles; resolved with `.swps-cta-dark` CSS class using `!important` on background/color/border-color with `#wpwrap` selector specificity
- **SEO Health score included phantom backlinks dimension** — removed `backlinks` from the `seo_breakdown` stats response and from the `OnPageDiagnostics` component; score now reflects only the 6 on-page factors (schema, heading, meta desc, content length, image alt, meta titles)
- **On-page audit meta titles check used wrong meta key** — `check_meta_titles()` was reading `_swisswpsuite_seo_title` (non-existent) instead of `_swisswpsuite_meta_title` (written by the AI worker); all pages were incorrectly flagged as missing titles
- **Page-builder pages flagged for short content** — Elementor, Divi, and Beaver Builder pages with empty `post_content` (content stored in postmeta) no longer counted as content length failures

### Added
- **Fix Missing Titles endpoint** — `POST /swisswpsuite/v1/seo/fix-missing-titles` (Pro) queries posts without `_swisswpsuite_meta_title` and enqueues them for AI title generation via the background SEO worker; rate-limited, lock-guarded, deduplicates against in-progress queue

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.18] - 2026-04-03

### Fixed
- **Basic scan ignores "Mark as Safe" paths (R1)** — `perform_core_scan()` now calls `is_user_ignored()` before appending findings; previously, user-dismissed core file findings (bundled plugins, etc.) reappeared on every scheduled scan because only the deep scan path respected the ignore list
- **Config manifest missing `swisswpsuite_pageviews_table_version` (R2)** — added to `SITE_LOCAL_CONFIG` so the visitor tracker schema version is excluded from backup exports and preserved during foreign-site restores; previously the option leaked into backup SQL and could be overwritten

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.17] - 2026-04-03

### Fixed
- **Cloud backup size recorded as 0 B** — fixed incorrect size metadata for cloud-only backups (Google Drive, S3, etc.); the backup data was always uploaded correctly, but the UI showed 0 B due to a positional index mismatch when resolving file sizes after local ZIPs were deleted; size is now stored during upload init and retrieved via a keyed lookup map

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.16] - 2026-04-03

### Added
- **"Fix Non-Compliant" targeted SEO re-optimization** — new `POST /swisswpsuite/v1/seo/fix-noncompliant` endpoint (Pro-gated) querying only posts/products with meta descriptions under 120 chars and sufficient content (200+ chars) to generate a longer one; feeds matching IDs into the existing background queue; does not touch compliant items
- **`SEO_MIN_DESC_LENGTH` and `MIN_CONTENT_LENGTH_FOR_REOPT` constants** — extracted from 5 hardcoded values scattered across `run_seo_scan()`, `get_stats()`, and the new fix handler; single source of truth for the quality gate threshold

### Changed
- SEO Manager UI "Intelligence Suggestion" section now shows a real action button **"Fix Non-Compliant (N)"** instead of static text; the button triggers the targeted endpoint, shows a loading state, and refreshes the audit count when done

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.15] - 2026-04-03

### Fixed
- **Sentinel scan "Mark as Safe" now works for missing files** — `add_ignored_path` previously used `realpath()` which returns false for non-existent files, causing all "Mark as Safe" calls for uninstalled bundled plugins to silently fail with HTTP 400. Now uses format-based validation for non-existent files and only applies realpath for existing ones.
- **Core integrity scan respects user's ignore list** — `check_wp_core_integrity` was not checking the user's ignore list, so marked-safe paths reappeared on every scan. Now correctly skips ignored paths.
- **"Mark as Safe" button now appears for root-level files** — Files like `readme.html` and `license.txt` (no directory prefix) were incorrectly excluded from the action buttons display.
- **Quarantine button hidden for missing files** — Quarantining a non-existent file is meaningless. Quarantine/delete actions are now hidden for `bundled_plugin`, `known_safe_missing`, and `core_missing` integrity categories.
- **"Mark All Safe" button added to benign integrity groups** — Users can now dismiss all uninstalled bundled plugin files (39+) with a single click instead of one by one.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.14] - 2026-04-03

### Added
- **Native pageview tracker** (`SwissWPSuite_Visitor_Tracker`) — server-side daily visit tracking via `wp` hook; bot-filtered (50+ UA patterns including GPTBot, ClaudeBot, SemrushBot); no cookies, GDPR-compliant; `wp_swisswpsuite_pageviews` table with UPSERT per request; feeds real traffic data to the Dashboard chart
- **On-Page SEO Diagnostic** (`SwissWPSuite_OnPage_Audit`) — Pro-only audit engine scanning 6 factors: meta descriptions, meta titles, image alt text, schema markup, heading hierarchy, content length; weighted scoring (schema=3x, headings+meta=2x); 1-hour transient cache; cache invalidated on post publish; returns gap analysis and prioritized quick-wins
- **REST endpoint** `GET /swisswpsuite/v1/seo/onpage-audit` — Pro-gated, supports `?force=1` to bust cache
- **`OnPageDiagnostics` React component** — replaces static SEO breakdown panel in Dashboard; shows live factor scores with color-coded severity; "Run Audit" button for Pro users triggers on-demand drill-down

### Changed
- Dashboard SEO breakdown section now shows real on-page factor scores instead of static mock data (Pro unlocks drill-down; Free shows coverage metrics only)
- `get_stats()` API now returns real pageview data from the tracker table instead of empty zeros

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.13] - 2026-04-03

### Fixed
- **Sentinel L2 AI hallucination guardrails** — added 4 mandatory hard rules to the attack chain generation prompt: (A) never recommend a patch version that doesn't exist, (B) only include CVEs with a known CVE ID and high confidence, (C) only generate findings for plugins explicitly in the installed plugin list, (D) never reference a WordPress version higher than what is installed
- **Post-AI deterministic filter** (`filterHallucinatedChains`) — strips attack chains that mention a WordPress version higher than `site_context.wp_version` before the response reaches the plugin; catches the "update to 6.9.5 when 6.9.4 is current" class of hallucination
- Sentinel protocol version bumped to 2.2

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.12] - 2026-04-03

### Changed
- **Pro tier: unlimited Layer 2 AI scans** — removed hourly rate cap (previously 2/hour) and monthly quota (previously 1/month) for Pro and Full Suite license holders; Free tier limits unchanged
- Pro scan quota check now short-circuits locally without a VPS round-trip, making scan start faster for Pro users

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.11] - 2026-04-03

### Fixed
- **Basic Scan core file grouping** — v2.9.27.10 applied the risk-based categorization to the Full Sentinel Scan path only; this fix applies it to the correct path: `SwissWPSuite_Security::perform_core_scan()` and the inline renderer in SecurityHub
- Akismet MISS entries now show under "Uninstalled Bundled Plugins" (collapsed, informational) in Basic Scan results
- `readme.html`, `hello.php`, `xmlrpc.php` now show under "Commonly Removed Files" (collapsed, safe to ignore) in Basic Scan results
- Basic Scan summary count now only counts genuine modified core files, not uninstalled plugins or hardening-related deletions
- Backward-compatible: cached scan results without `category` field are reclassified client-side by file path

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.10] - 2026-04-03

### Changed
- **Core file integrity scan — risk-based categorization**: findings are now grouped into four categories: *Modified Core Files* (potential tampering — shown expanded with red badge), *Bundled Theme Files* (collapsed, yellow), *Uninstalled Bundled Plugins* (collapsed, blue — e.g. Akismet, Hello Dolly — this is expected when plugins are uninstalled), and *Commonly Removed Files* (collapsed, grey — e.g. `readme.html`, `xmlrpc.php`, `hello.php` — often deleted for security hardening)
- **Context-aware remediation text**: each category now shows specific advice instead of the generic "Reinstall WordPress" message which was incorrect for plugin-related findings
- **Accurate issue count**: the summary badge now only counts real threats (modified core files) — uninstalled plugins and deliberately removed files no longer inflate the count

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.9] - 2026-04-03

### Fixed
- **Closed/Abandoned Plugins false positives** — `swisssuite-ai` (commercial plugin, intentionally not on WordPress.org) and plugins with the `hostinger-` prefix (hosting-provider bundled tools) are now permanently excluded from the abandoned plugins check
- **"Not found" vs "removed" distinction** — the check now correctly distinguishes between plugins that were removed from WordPress.org (`closed: true` API flag) vs plugins that were never submitted (404 response); different severity and message text for each case
- **Basic scan results visibility** — scan findings are now fully rendered in the Security Hub Sentinel tab
- **Pro/AI scan completeness** — Pro scan now surfaces all findings that the basic scan detects, plus additional AI-powered analysis

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.8] - 2026-04-03

### Added
- **Restrict AI Crawlers to Homepage** (Free hardening option) — adds `robots.txt` rules via WordPress filter to prevent GPTBot, ClaudeBot, PerplexityBot, anthropic-ai, Bytespider, CCBot, cohere-ai, FacebookBot, and Google-Extended from crawling beyond the homepage; bot names are hardcoded (no user input)
- **Restrict Google to Homepage Only** (Free hardening option, high-risk) — adds `robots.txt` rules for Googlebot and Bingbot; requires confirmation dialog with explicit SEO impact warning before enabling
- Physical `robots.txt` file detection — both options detect a static `robots.txt` at the webroot and warn the user that the WordPress filter will be bypassed until the file is removed

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.7] - 2026-04-02

### Fixed
- "Disable Visitor-Triggered Scheduling" hardening toggle now explicitly warns that SwissSuite's backup automations will stop, and shows server cron setup instructions (cPanel → Cron Jobs, every 5 minutes) before the user confirms — prevents silent backup failures after enabling this option

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.6] - 2026-04-02

### Fixed
- SEO: Archive pages (blog listing, categories, tags) now output full OG tags, Twitter cards, meta description, and canonical — previously got zero meta tags due to `is_singular()` guard
- SEO: Blog listing page `<title>` was showing the latest post title instead of the page name — fixed
- SEO: `og:image` and `twitter:image` now fall back to a configurable "Default Social Image" when no featured image is set (homepage, blog listing, posts without thumbnails)
- SEO: Blog posts now output `article:published_time`, `article:modified_time`, and `article:author` OG tags for better Google News and social context
- SEO: Homepage JSON-LD schema changed from `Article` to `WebSite` + `WebPage` — `Article` type on a homepage is incorrect and confuses search engines

### Added
- Settings → SEO tab: New "Default Social Image" picker — upload a fallback 1200×630px image used when pages have no featured image set

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.5] - 2026-04-02

### Added
- "Drop Orphaned Tables" action in Settings → Maintenance — safely drops abandoned plugin tables with 5-layer protection: core table allowlist, active plugin slug matching, protected prefix guard (WooCommerce, Elementor, Yoast, Wordfence, etc.), regex validation, and `esc_sql()` defense-in-depth

### Fixed
- Sentinel AI no longer suggests using SwissSuite Database Cleanup for orphaned plugin tables (the two features solve different problems — clarified in remediation text and AI prompts)
- AI security audit no longer tells Free-tier users to enable 2FA or Geo-Blocking via SwissSuite without disclosing these are Pro-only features
- AI audit now covers all 11 hardening options (previously missing User Enumeration, WP Cron Public, Content Security Policy)
- Pro-only hardening options (Security Headers, REST API Guest Block, Author Archives, Bad Bots, WP Cron, CSP) now include Pro upgrade disclosure in AI remediation steps
- WAF and Login Protection AI recommendations now include Pro tier disclosure for Free-tier users

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.4] - 2026-04-02

### Added
- Database Cleanup section in Settings → Maintenance with five new one-click actions: remove orphaned postmeta, remove orphaned commentmeta, permanently delete trashed posts, remove abandoned auto-drafts, and clean orphaned term relationships

### Fixed
- Auto-draft cleanup now only targets drafts older than 7 days — prevents accidentally destroying an active block editor session open in another browser tab
- Term relationship cleanup now recalculates `wp_term_taxonomy` counts after deleting orphaned rows, preventing stale category/tag counts

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.3] - 2026-04-02

### Fixed
- Google Drive cloud backups now correctly capture the file ID from the upload completion response — prune and delete operations now work reliably on GDrive-backed sets
- Backblaze B2 cloud backups now correctly delete files using the composite `fileId||fileName` key required by the B2 API
- Backup worker spawn timeout increased from 1 second to 5 seconds — prevents missed scheduled backups when the VPS TCP/TLS handshake is slow

### Added
- WP-Cron visitor-dependency notice in the Backup Automations panel — explains why scheduled backups may be delayed on low-traffic sites and links to the Server Cron setup guide
- Circuit breaker status notice in the Backup Automations panel — amber warning badge when automations are paused after repeated consecutive failures
- Cloud storage cross-border data transfer disclosures per provider (AWS S3 US, Google Drive US, Dropbox US, Backblaze B2 US/EU) for GDPR/Swiss nDSG compliance
- Dismissible PII/data-processor notice on the Cloud Storage panel advising users to review their provider's DPA before connecting

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.2] - 2026-04-02

### Fixed
- Security alert no longer reappears after dismissal when the attacker rotates IPs within the same /24 subnet — fingerprint now normalizes to subnet level
- Alert dismiss state persisted to localStorage (24h TTL) so it survives page reloads

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.1] - 2026-04-01

### Fixed
- Security scan Attack Chain view no longer crashes when the AI returns an unexpected exploitability value — unknown values now degrade gracefully with a neutral label instead of throwing a fatal render error
- Scan findings list no longer crashes on unknown severity values — sort order, border, and badge all have safe fallbacks
- License activation now shows a clear actionable message when a key is locked to another domain

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.27.0] - 2026-04-01

### Added
- Patchstack Community API integrated as a parallel CVE source alongside WPScan — findings now show dual-source confidence scoring (HIGH when both agree, MEDIUM for single source)
- WordPress.org core integrity check now caches the official checksum manifest for 24 hours, reducing external API calls and adding an on/off toggle in Settings
- Abandoned/closed plugin detection — new daily background check flags any installed plugin that has been removed or closed by WordPress.org (a strong indicator of security compromise or unpatched vulnerability)
- MalwareBazaar bulk import — PHP-tagged malware hashes from MalwareBazaar are now imported nightly into the local threat database alongside URLhaus, replacing the previous per-scan live API fallback

### Security
- VPS threat database `malware_signatures` table now includes a `source` column (urlhaus / malwarebazaar) for signature attribution and auditability

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.26.10] - 2026-04-01

### Fixed
- Auto-clear stale migration state on new migration start to prevent false "migration in progress" errors
- Deferred `flush_rewrite_rules` after DB import to resolve "No route found" / 404 errors post-migration
- Emergency theme restore endpoint triggered on retry exhaustion during migration to recover broken themes
- Deferred cron cleanup on plugin deactivation to prevent timing issues

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.26.9] - 2026-04-01

### Fixed
- Backup tab blank on sites with LiteSpeed Cache or other caching plugins — caused by duplicate script injection loading the React app twice, creating two RouterProvider instances and crashing with "You cannot render a Router inside another Router"
- Added double-load guard in app entry point with HMR-aware exception for dev mode

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.26.8] - 2026-03-31

### Fixed
- SEO Enhance — automatic retry on Groq JSON validation failures (stochastic ~5-10% base rate)
- SEO Enhance ~50% failure — simplified prompt to be compatible with Groq JSON mode
- Root cause: strict character constraints ("BETWEEN 30 AND 60", "MUST be", "CRITICAL") conflicted with JSON validation
- JSON parse failures from control characters in AI responses — automatic sanitization added
- Removed incompatible JSON mode parameter that caused API rejection on content rewrite
- Enhanced diagnostic logging for empty AI responses (includes finish_reason and model)

### Added
- Diagnostic logging for SEO Enhance JSON parse failures (model, raw response, extracted JSON)
- Error code distinction in SEO content generation API responses

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.26.2] - 2026-03-31

### Fixed
- Crash after L2 AI scan when AI response omits `scan_metadata` (TypeError: Cannot read properties of undefined reading 'findings_count')
- Added defensive defaults for all AI-sourced fields: scan_metadata, attack_chains, remediation_plan, positive_findings
- ScanHistoryTable null safety for findings_count and critical_count

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.26.1] - 2026-03-31

### Fixed
- "Fix Permissions" button now shows manual Hostinger hPanel guide when chmod fails (was showing a dead-end toast)
- Added diagnostic logging for chmod failures (previously only successes were logged)
- Fixed undefined `finding_code` in L1 scan fix requests (finding.code and finding.file_path were always undefined)

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.26.0] - 2026-03-31

### Security
- WAF now blocks PHP file execution in upload directories (Pro) — prevents webshell execution via `/wp-content/uploads/*.php`
- Plugin vulnerability scanner expanded from 5 to 20 hardcoded CVEs covering ThemeREX, WooCommerce Custom Product Addons Pro, SureTriggers, LiteSpeed Cache, Bricks Builder, and more

### Added
- WPScan API v3 integration for real-time vulnerability scanning with 24h transient caching
- WPScan API Key field in Settings > Security tab (optional — for agencies with existing WPScan accounts)
- Deterministic `version_compare()` validation on all CVE results (never trusts API blindly)

### Changed
- M4-D2 scanner now uses hybrid strategy: WPScan API first, hardcoded fallback when API unavailable

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.24.2] - 2026-03-28

### Security
- PBKDF2 iterations upgraded from 10,000 to 310,000 (OWASP 2023 minimum) with backward-compatible version header migration
- WAF Basic tier now decodes HTML entities before pattern matching — closes entity-encoded XSS/SQLi bypass
- WAF now inspects uploaded filenames and MIME types from $_FILES for malicious patterns
- XML-RPC multicall check decodes HTML numeric entities (&#115;ystem.multicall bypass closed)

### Fixed
- Undefined `$new_path` in `run_url_replace()` — path-based search-replace was silently broken
- SEO rate-limit retry now capped at 5 attempts with exponential backoff (60s → 960s) — prevents infinite ghost loop
- Sitemap generation: replaced `get_posts(-1)` with paginated WP_Query (200/page) — prevents OOM on large sites
- Dual SEO prompts consolidated into `SwissWPSuite_Groq::build_seo_prompt()` single source of truth
- Duplicate cron closures on `swisswpsuite_daily_sentinel_scan` merged into single callback
- WooCommerce price context restored in single-item SEO prompt path

### Changed
- 49 occurrences of `text-[10px]` replaced with WCAG AA compliant `text-xs` (12px) across 11 UI files
- Dead `layer1_only` removed from TypeScript `scan_type` union — narrowed to match backend output
- Removed dead `const VERSION` from encryption class (replaced by `ENCRYPTION_VERSION_1`/`ENCRYPTION_VERSION_2`)

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.24.1] - 2026-03-28

### Fixed
- **ROOT CAUSE:** Added COMMIT before every `return 'partial'` in receiver SQL parser — `SET autocommit=0` without COMMIT caused MySQL ROLLBACK on connection close, silently losing all queries per chunk (caused 8/12 missing tables on InfinityFree).
- Reconnect handler now re-applies full import preamble (FK_CHECKS=0, UNIQUE_CHECKS=0, AUTOCOMMIT=0) after every mid-import reconnection.
- Single-row INSERTs exceeding 80% of max_allowed_packet now skipped with logging instead of killing the connection.
- Time budget reduced from 20s to 12s default, multiplier 0.6 to 0.5 for restrictive hosts (InfinityFree 10s server-enforced kill).
- `receiver_save_state()` return value now checked — returns HTTP 507 on disk-full/unwritable.
- Search-replace COMMIT failure now detected with reconnect + retry (previously lost UPDATEs silently).
- Search-replace UPDATE failures now logged with table name and PK (previously completely silent).
- SET sql_mode/FK_CHECKS/UNIQUE_CHECKS/AUTOCOMMIT failures now logged (previously silent @ suppression).
- Periodic COMMIT (every 500 queries) failure now triggers reconnect + preamble re-application.
- Buffer carry-over guard: >2MB skips file read to parse existing; >5MB emergency skip.
- Block comments preceding SQL (`/* comment */ INSERT...`) now stripped and executed instead of silently dropped.
- Added `utf8mb4_0900_ai_ci` (MySQL 8.0+ default) to collation replacement adapter.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.24.0] - 2026-03-28

### Fixed
- Mode B receiver: SQL parser now tracks comment states (line comments, block comments) to prevent false statement splits on semicolons inside comments.
- Mode B receiver: recursive file download converted to iterative loop, preventing stack overflow on large ZIP transfers.
- Mode B receiver: search-replace resume path now runs plugin deactivation and theme switch safety nets (previously skipped, causing WordPress fatal errors).
- Mode B receiver: connection-alive check added before post-import safety-net queries to prevent silent failures after long search-replace passes.
- Mode B receiver: HTTP 410 response with JSON body on script expiry (previously returned empty 200).
- Mode A import: foreign key checks and unique checks now disabled during bulk import for up to 1000x InnoDB performance improvement.
- Mode A import: comment state tracking added to SQL parser (mirrors Mode B fix).
- Mode A import: DEFINER clause stripping now handles all 3 MySQL syntaxes (backtick, single-quote, unquoted) and applied to execution query (not just inspection copy).
- Mode A import: plugins token rotation now uses dedicated storage keys (previously fell through to SQL keys, causing multi-chunk plugin downloads to fail).
- Mode A import: download counter is now per-type (sql/theme/media/plugins) so large SQL downloads no longer exhaust the budget for subsequent asset downloads.
- Mode A import: max_allowed_packet value now persisted across chunks (previously fell back to 1MB default on resume).
- JSON-escaped URL search-replace added for Elementor _elementor_data and Gutenberg block attributes (both Mode A and Mode B).
- Source table prefix auto-detection from SQL dump with two-phase confirmation (candidate from CREATE TABLE + verification from second core table).
- Table prefix meta_key remap (wp_capabilities, wp_user_level, wp_user_roles) after prefix change, preventing admin lockout.
- Array keys now included in recursive serialization-safe search-replace (previously only values were replaced).
- wp_commentmeta table added to post-import search-replace pass.
- generate_passport() API endpoint now returns proper WP_Error when no export exists.

### Security
- wp-config.php generated with 0440 permissions (was 0644) — no longer world-readable on shared hosting.
- HMAC signature verification now applied to all download URLs (theme, plugin, media), not just SQL.
- SET PASSWORD and SET ROLE added to SQL import blocklist.
- Table prefix re-validated after credential decryption (defense-in-depth against encryption key compromise).
- DEFINER clauses stripped from CREATE VIEW/TRIGGER/PROCEDURE to prevent privilege escalation errors.
- State file and SQL temp file now cleaned up during self-destruct.
- register_shutdown_function() safety net ensures receiver deletion even if cleanup crashes.
- Wordfence auto_prepend_file stripped from .user.ini during migration (hardcoded source-server paths cause fatal errors).
- Object-cache.php and advanced-cache.php removed post-import (source-site cache drop-ins crash destination).

### Added
- Performance preamble for SQL import: SET foreign_key_checks=0, unique_checks=0, autocommit=0 with periodic COMMIT.
- Idempotency guard prevents double-start race condition on migration.
- State log capped at 200 entries to prevent state file bloat on large imports.
- New domain validation prevents migration without domain replacement.
- CURLOPT_FOLLOWLOCATION enabled for WordPress core downloads (handles CDN redirects).
- mysqli_ping() replaced with $conn->query('DO 1') for PHP 8.4 forward-compatibility.
- max_allowed_packet pre-check before query execution with automatic INSERT splitting.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.23.0] - 2026-03-27

### Security
- Geo-blocking bypass token now uses HMAC derivation (IP + time-window bound) instead of static token — database read access alone no longer sufficient to bypass geo-blocking.
- Sync push handler now scans `post_content`, `post_content_filtered`, and `meta_input` for embedded PHP webshell patterns (14 literal-match signatures).
- Expanded sync meta redaction blocklist with 6 additional credential patterns (`private_key`, `jwt`, `bearer`, `encryption_key`, `aws_key`, `signing_key`).
- SQL import pre-scan now detects `DELIMITER` statements (stored procedure indicator) and blocks them — WordPress backups never contain these.
- Extended SQL pre-scan window for large buffers — catches dangerous keywords (`GRANT`, `REVOKE`, `CREATE PROCEDURE`, `INTO OUTFILE`) pushed past the 200-character preamble by comment padding.

### Fixed
- Geo-blocking API now rate-limited to 30 lookups/minute with fail-closed circuit breaker (5 consecutive failures activates 10-minute cooldown) — prevents API exhaustion attacks.
- Concurrency lock `is_held()` now fails closed — if the lock file exists but cannot be read, assumes locked instead of unlocked.
- Backup tick time budget now uses CPU time (`getrusage()`) when available instead of wall-clock — prevents premature yield on I/O-throttled shared hosting.
- Backup tick lock acquisition now always checks lock age before attempting acquisition — eliminates TOCTTOU race window between concurrent ticks.
- VPS license expiry cron now uses PostgreSQL advisory lock to prevent concurrent execution.
- VPS logger now outputs structured JSON in production (pino-pretty only in development).

### Added
- VPS admin key recovery endpoint (`POST /v1/admin/recover`) with bcrypt-hashed recovery key and hourly rate limiting — prevents permanent lockout if `.env` is lost.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.22.1] - 2026-03-27

### Security
- Converted all SQL string interpolation to `$wpdb->prepare()` or `esc_sql()` across REST API endpoints — eliminates copy-paste risk and removes all `phpcs:ignore` suppressions.
- Replaced 8 `die()` calls in backup stream handler with proper `echo` + `exit` pattern and added resource cleanup (`fclose()`) in exception handler to prevent orphaned file locks.
- Fixed `perform_log_analysis()` SQL interpolation in security class.

### Fixed
- Added missing `code` and `file_path` fields to `SentinelLayer1Finding` TypeScript interface — resolves 2 pre-existing `tsc` type errors.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.22.0] - 2026-03-27

### Added
- Backup Set metadata layer — groups all ZIP files from a single backup into one logical "set" stored in `wp_options`.
- Set-based retention — automated backups now prune by sets (keep N newest sets) instead of individual files.
- Set-based restore endpoint — restores all files in a set in correct order (database first).
- Set-based delete endpoint — removes all local and cloud files plus the set record.
- Grouped backup list UI — sets display as expandable rows with scope badges, cloud badges, duration, and file count.
- Legacy migration — existing backup files are automatically converted to set records on first list load.
- Orphan scanner detects engine-format ZIP files that have no matching set record.
- Cancel UX — progress bar turns amber and shows "Stopping backup..." during cancellation.

### Fixed
- Cancel flag path mismatch — API endpoint was writing to the wrong directory; cancel now works reliably with the chunked engine.
- Stale tick lock recovery — locks older than 5 minutes are automatically released, preventing permanently stuck backups.
- Sentinel heartbeat injection — automated backups now pass the Sentinel instance to the engine for watchdog progress signals.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.21.2] - 2026-03-27

### Security
- Sentinel: Fixed critical contract bug — active defenses (WAF, Login Safeguard, 2FA, Cloudflare) now visible to AI scanner. Previously the AI always saw empty protections, inflating all severity levels.
- Sentinel L1: Added word boundaries to malware content signatures — prevents false positives in minified JavaScript.
- Sentinel L1: Removed dead hex content signature that could match legitimate code.
- Sentinel L2: AI prompt now verifies L1 findings before building attack chains — stops false positive cascade.
- Sentinel L2: Info-level findings (license.txt, readme.html) excluded from attack chain generation.
- Sentinel L2: Grade calculation now accounts for active protections — all-BLOCKED chains yield minimum grade C.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.21.1] - 2026-03-27

### Fixed
- Sentinel L1: Malware filename patterns now use word boundaries — prevents false positives when Webpack/Vite content hashes accidentally contain webshell substrings (e.g. `c99` inside `4b0c992fe7d6`).
- Security Hub: Scan error toasts now show the actual error message (e.g. rate limit) instead of misleading "check your connection."

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.21.0] - 2026-03-27

### Major
- Backup: Complete rewrite of backup engine — new chunked multi-tick architecture that works reliably on Hostinger, LiteSpeed, and Cloudflare.
- Backup: Each backup tick completes in under 60 seconds, surviving all hosting timeout limits.
- Backup: Resumable cloud uploads — Google Drive, S3, Dropbox, B2 sessions persist across ticks.
- Backup: Progressive progress bar with phase labels, percentage, and ETA.
- Backup: ZIP splitting for sites over 400MB — split by category (plugins, themes, uploads).
- Backup: Self-chaining tick dispatcher with 5-minute health check recovery.
- Backup: Cancel button works immediately — checked between every tick.
- Backup: 100MB per-file size cap prevents memory exhaustion on large media files.
- Backup: LiteSpeed noabort/noconntimeout rules auto-added for reliable background processing.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.20.8] - 2026-03-27

### Security
- Sentinel L2: 3-layer defense-in-depth for CVE false-positive elimination — AI prompt version rules, VPS-side deterministic validation, PHP-side `version_compare()` catch.
- Sentinel L2: Fixed min-bound operator bug — `> X.Y.Z` (strict) was incorrectly treated as `>= X.Y.Z` (inclusive) in both PHP and JS version range parsing.
- Sentinel L2: Enriched `site_context` with structured plugin inventory (name, version, slug, active status) for accurate version comparison.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.20.7] - 2026-03-27

### Improved
- 2FA: Account identifier now uses site domain instead of user email — each site shows distinctly in authenticator apps when managing multiple WordPress sites.
- Security Hub: Added "Set up Two-Factor Authentication" link in the Login Safeguard card — direct navigation to Settings > Security tab.
- Settings: Tab deep-linking support (`?tab=security`) for direct navigation from other pages.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.20.6] - 2026-03-27

### Fixed
- 2FA: Replaced buggy custom PHP QR code generator with battle-tested `qrcode.react` library — QR codes now render perfectly and are reliably scannable by all authenticator apps.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.20.5] - 2026-03-27

### Fixed
- 2FA: Corrected all QR code spec lookup tables (data codewords, block structure, capacity) — every version had wrong values, making all generated QR codes undecodable.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.20.4] - 2026-03-26

### Fixed
- 2FA: QR code generator now produces scannable QR codes — added missing alignment patterns, fixed data codeword interleaving, and corrected character count indicator for higher QR versions.
- 2FA: QR code display increased from 160px to 200px for easier phone scanning.

### Improved
- Cloud Backup: Enhanced cloud storage provider reliability (B2, Dropbox, FTP, GDrive, S3) with improved error handling and timeout management.
- Backup: New tick-based backup engine with improved scheduling and progress tracking.
- Frontend: Refreshed Cloud Storage, License Manager, and Backup UI panels.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.20.2] - 2026-03-26

### Fixed
- Backup: Added `ignore_user_abort(true)` to manual backup endpoint — Cloudflare 524 timeout no longer kills the PHP process mid-backup.
- Backup: Sentinel heartbeat timeout increased from 5 to 10 minutes — stops false stuck-job detection during large archive creation.
- Backup: Added archiver excludes for LiteSpeed cache, upgrade temp files, and debug.log — reduces backup size significantly on sites with LiteSpeed.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.20.1] - 2026-03-26

### Fixed
- Cloud Backup: Sentinel watchdog now syncs failure status back to automation records — prevents permanent "running" zombie state.
- Cloud Backup: Stale-running watchdog auto-resets automations stuck in "running" for over 2 hours.
- Cloud Backup: Added Cancel button for automation backups (previously only worked for manual backups).
- Cloud Backup: Added 'cancelled' to automation status allowlist — shows "Cancelled" instead of "Failed" on user cancel.
- Cloud Backup: Manual backup retention enforced (keeps last 10) — old manual backups no longer accumulate forever.
- Cloud Backup: Automation backup retention now enforced on list load — catches failed-upload leftovers that exceeded retention.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.20.0] - 2026-03-25

### Improved
- Cloud Backup: cURL timeouts added to all upload methods across all 5 cloud providers — prevents indefinite hangs.
- Cloud Backup: Upload retry logic improved for S3, B2, Dropbox, and FTP with exponential backoff.
- Cloud Backup: Real error messages from cloud providers shown in automation status instead of generic failures.
- Cloud Backup: Sentinel watchdog receives heartbeat updates during uploads — no longer kills legitimate long-running transfers.
- Cloud Backup: Circuit breaker stops endless restart loops after 3 consecutive stuck uploads.
- Cloud Backup: Cancel button works during cloud upload phase with server-side session cleanup.
- Cloud Backup: Orphan file detection and one-click cleanup for files left by deleted automations.
- Cloud Backup: Backup list shows storage location (Local, Google Drive, S3, Dropbox, FTP, B2).
- Cloud Backup: Backblaze B2 part size optimized from 100 MB to 25 MB for better memory usage.
- Cloud Backup: Dropbox and FTP upload timeouts extended for slow shared hosting connections.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.19.0] - 2026-03-25

### Improved
- Cloud Backup: Google Drive one-click connection — users no longer need to create their own Google OAuth app. Connect with a single click via SwissSuite servers.
- Cloud Backup: Dropbox one-click connection ready — activates automatically when Dropbox production approval is granted.
- Cloud Backup: Status endpoints now detect VPS OAuth proxy availability for fresh installs.
- Cloud Backup: Fixed self-hosted OAuth callbacks redirecting to wrong admin page.
- Cloud Backup: Fixed variable shadowing in OAuth callback URL cleanup.
- Cloud Backup: Self-hosted OAuth flow now explicitly stores connection mode for reliable status reporting.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

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

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

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

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

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

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

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

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

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

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.7.70] - 2026-03-14

### Fixed
- Mode A migration confirmed working end-to-end.
- Serialization-safe search-replace verified.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.6.2] - 2026-02-28

### Fixed
- TEST AI CONNECTION: "License Invalid" false failure resolved.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.6.0] - 2026-02-28

### Added
- Improved security scanner with enhanced detection capabilities.
- Multiple detection accuracy fixes across all scanner modules.
- Free tier quota gate enforcement.

### Changed
- Upgraded AI models for faster and more accurate results across all AI features.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.5.2] - 2026-02-27

### Added
- Expanded internal security testing capabilities.
- Improved vulnerability detection coverage.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.4.1] - 2026-02-26

### Changed
- Restructured licensing tiers for clearer feature access.
- 55 quality improvements across all features.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.3.0] - 2026-02-24

### Fixed
- Improved compatibility when switching between license tiers.
- Token balance now resets correctly on plan downgrade.
- AI Analyze button correctly restricted to Pro users.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.2.8] - 2026-02-24

### Added
- Quarantine bulk action.
- AI Analysis modal.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.2.7] - 2026-02-23

### Fixed
- Fixed dialog windows appearing behind other elements.
- Improved text readability in Bulk AI Report.
- Deep scan reliability improvements (timeout handling, error reporting).
- Fixed scanner getting stuck on large sites.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.1.7] - 2026-02-21

### Added
- Tiered WAF (basic=free, advanced=Security/Full Suite).
- WAF tier messaging in Defense Hub.
- 2FA and hardening action buttons.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.1.3] - 2026-02-20

### Added
- Comprehensive AI action buttons.
- Firewall Advisor rebuild.

### Fixed
- Log Advisor WAF button bans IP + refresh fix.
- Live security feature bug fixes (8 issues).

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.0.9] - 2026-02-19

### Security
- Security audit fixes and infrastructure hardening.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.0.8] - 2026-02-18

### Added
- Additional security endpoints and infrastructure hardening.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.9.0.1] - 2026-02-17

### Added
- First unified release build.

---

## [2.9.28.04] - 2026-04-21

### Added
- **Mark as Safe:** Malware scan findings now have a "Mark Safe" button that adds the file to the ignore list, excluding it from future scans. Managed under Security Hub → Ignore Paths.

### Fixed
- **Button contrast on Scan tab.** Quick/Deep mode selector buttons were rendering with invisible text (black on black background in dark mode). Now uses `text-card-foreground` which adapts to both light and dark themes.
- **Deep malware scan showing 0 threats.** Deep scan is asynchronous — the initial response returns `queued:true` immediately. The frontend now polls the deep-scan status endpoint until completion before showing results.
- **Security Audit vs Malware Scan grade discrepancy explained.** Security Audit checks configuration, hardening, file integrity, and plugin vulnerabilities. Malware Scan matches file contents against signature patterns. They measure different threat vectors — a site can pass the Audit and still have signature matches, and vice versa.

## [2.8.9.9] - 2026-02-17

### Added
- Initial release of SwissSuite.
