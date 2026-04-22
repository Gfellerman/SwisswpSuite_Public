# SwissWPSuite — Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/) with a 4-segment scheme: `MAJOR.MINOR.SPRINT.HOTFIX`.

---

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

- **Quick malware scan PHP crash.** Replaced non-existent `SWISSWPSUITE_AI_NAME` constant with `'swisswpsuite-ai'` string literal in orchestrator — every Quick scan was returning a PHP undefined-constant error while UI falsely showed "clean".
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

- **Security Audit card description.** Description now clearly states the scan runs via SwissWPSuite's own Groq AI quota — no user API key required. Free and Pro users both get the scan; the distinction from the Pro-only "Full AI Scan" is now explicit.
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

- **Plugin safety wrapper (Change E).** Top-level bootstrap in `swisswpsuite-ai.php` and the activator's `activate()` body are now wrapped in `try/catch(\Throwable)`. Fatal errors are appended to `wp-content/swisswpsuite-error.log` (flat file, not wp_options or Diagnostics — those may be unavailable at the failure point) and surfaced as a `manage_options`-gated admin notice. Activation no longer white-screens on third-party plugin conflicts, missing PHP extensions, or partially loaded classes.
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
- **uploads/.htaccess cleanup** -- deactivator now removes SwissWPSuite markers from uploads/.htaccess

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
- **Schema markup false positives eliminated** -- SEO audit now recognizes that SwissWPSuite Frontend already injects Article/WebPage/FAQ schema via wp_head (was checking post_content only)

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
- **Closed/Abandoned Plugins false positives** — `swisswpsuite-ai` (commercial plugin, intentionally not on WordPress.org) and plugins with the `hostinger-` prefix (hosting-provider bundled tools) are now permanently excluded from the abandoned plugins check
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
- "Disable Visitor-Triggered Scheduling" hardening toggle now explicitly warns that SwissWPSuite's backup automations will stop, and shows server cron setup instructions (cPanel → Cron Jobs, every 5 minutes) before the user confirms — prevents silent backup failures after enabling this option

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
- Sentinel AI no longer suggests using SwissWPSuite Database Cleanup for orphaned plugin tables (the two features solve different problems — clarified in remediation text and AI prompts)
- AI security audit no longer tells Free-tier users to enable 2FA or Geo-Blocking via SwissWPSuite without disclosing these are Pro-only features
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
- Cloud Backup: Google Drive one-click connection — users no longer need to create their own Google OAuth app. Connect with a single click via SwissWPSuite servers.
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
- Initial release of SwissWPSuite.
