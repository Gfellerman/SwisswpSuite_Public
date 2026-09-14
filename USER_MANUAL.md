# SwissSuite AI — User Manual

**Applies to plugin version:** 2.9.33.58
**Audience:** WordPress site owners. No coding required.

SwissSuite AI is a local WordPress security and backup plugin: malware scanning, a firewall, one-click hardening, backup and restore, login protection, and on-page SEO. It runs entirely inside your WordPress admin — there is nothing to install on your server, no account, and no license key. See `readme.txt` for the complete, authoritative feature list; this manual walks through how to use each of those features.

---

## Table of Contents

- [1. Getting Started](#1-getting-started)
  - [1.1 What SwissSuite Does](#11-what-swisssuite-does)
  - [1.2 Installation](#12-installation)
  - [1.3 First-Time Setup](#13-first-time-setup)
  - [1.4 The Sidebar — How You Navigate](#14-the-sidebar--how-you-navigate)
- [2. Dashboard](#2-dashboard)
- [3. Security Hub](#3-security-hub)
  - [3.1 Dashboard tab](#31-dashboard-tab)
  - [3.2 Scan tab](#32-scan-tab)
  - [3.3 Logs tab](#33-logs-tab)
  - [3.4 Quarantine tab](#34-quarantine-tab)
  - [3.5 Hardening tab](#35-hardening-tab)
  - [3.6 Cloud Shield tab](#36-cloud-shield-tab)
  - [3.7 History tab](#37-history-tab)
- [4. SEO](#4-seo)
- [5. Backup](#5-backup)
- [6. Settings](#6-settings)
  - [6.1 General](#61-general)
  - [6.2 Security](#62-security)
  - [6.3 SEO](#63-seo)
  - [6.4 Maintenance](#64-maintenance)
  - [6.5 Diagnostics](#65-diagnostics)
- [7. Status Indicators, Badges, Colors, and Icons](#7-status-indicators-badges-colors-and-icons)
- [8. Troubleshooting](#8-troubleshooting)

---

## 1. Getting Started

### 1.1 What SwissSuite Does

SwissSuite AI is a WordPress plugin for **security** and **backups**, with a local on-page **SEO** audit and output. Everything runs on your own server: the malware scanner, the firewall, hardening, backups, and the SEO tools all run locally, and no file contents or site content are ever sent anywhere. There is **no license key, no account, and no sign-up** — every feature works the moment you activate the plugin.

### 1.2 Installation

Install SwissSuite from the official WordPress.org plugin directory:

1. In your WordPress dashboard, go to **Plugins → Add New**.
2. Search for **SwissSuite AI**.
3. Click **Install Now**, then **Activate**.

After activation, a new menu item called **SwissSuite** appears in your WordPress sidebar. On activation, the plugin disables the theme/plugin file editor by default; re-enable it at **Security → Hardening** if you need it.

**System requirements:**

- WordPress 6.3 or newer
- PHP 7.4 or newer

### 1.3 First-Time Setup

The first time you open SwissSuite, the **Dashboard** shows a **Critical Next Steps** card. It guides you through the most important things to do:

1. **Run your first scan** — Go to **Security → Scan** and click **Start Deep Scan**. Results appear once the scan finishes.
2. **Create your first backup** — Go to **Backup → Backups** and click **Create Backup Now**. Wait until the green "Complete" badge shows.
3. **Review hardening** — Go to **Security → Hardening** and turn on the options that fit your site.

You can dismiss the Critical Next Steps card at any time by clicking the small "x" in its corner. It comes back automatically if any of the items become incomplete (for example, your last backup ages past 30 days).

### 1.4 The Sidebar — How You Navigate

The left sidebar shows five destinations:

| Item | What it opens |
|---|---|
| **Dashboard** | Health overview, alerts, recent activity. |
| **Security** | The Security Hub — scan, firewall, hardening, logs, quarantine, history. |
| **SEO** | The on-page SEO audit, output settings, sitemap, and llms.txt. |
| **Backup** | Your local backups — create, restore, download, delete. |
| **Settings** | General, Security, SEO, Maintenance, Diagnostics. |

The sidebar can be **collapsed** with the small `<` button at the bottom-left. Your preference is remembered in your browser. On mobile, the sidebar is a swipe-out drawer — tap the hamburger icon in the top bar to open it.

---

## 2. Dashboard

The Dashboard is the page you land on when you open SwissSuite. It shows the high-level health of your site.

### The Critical Next Steps Card

A card at the top of the Dashboard listing tasks you should complete to be secure. Items only appear here if they are still incomplete:

- **No backup in the last 30 days** — shows "Create Backup".
- **Critical scan findings unfixed** — shows "Open Security Hub".

Each item is a one-click jump to the right page. You can dismiss the entire card with the small "x" button; it reappears automatically if a new gap is detected.

### The Health Tiles

A row of tiles below the Critical Next Steps card, showing summary information such as:

- **Last Backup** — when the most recent backup completed. Shows "Never" if no backup exists. Color-coded: green (< 7 days), amber (7–30 days), red (> 30 days or never).
- **SEO Health** — a score from 0 to 100 based on the last SEO scan. "—" means no scan has been run yet.
- High-level firewall and scan status indicators that link to the Security Hub.

### Recent Activity

Below the tiles, a small list of the last few events: scans completed, backups created, login attempts blocked. Each row links to the relevant page.

---

## 3. Security Hub

The Security Hub has seven tabs along the top: `dashboard` · `scan` · `logs` · `quarantine` · `hardening` · `cloud-shield` · `history`. The active tab gets an underline.

### 3.1 Dashboard tab

The security summary page (different from the main app Dashboard in Section 2). It shows status cards for the firewall and the hardening posture, each with its own toggle and short description:

- **Smart Firewall** card — toggle to enable/disable the WAF; a "Detection Only Mode" checkbox to log threats without blocking; a list of the active rule packs (SQL injection and cross-site scripting patterns, path traversal).
- **Quick-toggles** for Login Protection and Spam Protection, mirroring the equivalent controls in the Logs tab.

After you run a scan from the Scan tab, a **scan summary card** appears on this Dashboard tab showing the security grade (A / B / C / D / F, derived from the severity of what the scan found) and a link back to the detailed results.

### 3.2 Scan tab

The Scan tab has one card, **Deep Scan**.

**What it does.** On demand, scans up to 5,000 PHP files (2 MB each) in your active plugins, active theme (and its parent theme, if any), and the uploads folder — skipping 32 trusted paths plus `/vendor/` — then runs local signature analysis against SwissSuite's malware pattern library. No file contents leave your site. The scan runs in two phases: **file discovery**, then **scanning file contents**.

**Button:** **Start Deep Scan**. While running, the button shows the current phase ("Discovering files…", "Scanning file contents…"). You can leave the page — the scan continues in the background — and stop a running scan with **Cancel**.

**Daily quick audit.** Once the daily scan report e-mail is switched on (Section 3.2, Daily Scan Report card, or Settings → Diagnostics), a quick audit runs automatically once a day and its results are emailed to you. See the Daily Scan Report card below.

**Result panel** shows:

- A **security grade** badge (A green, B emerald, C amber, D/F red), derived from the severity of the findings.
- Each finding's severity, title, description, and evidence (usually a file path).

#### Daily Scan Report email

A card on the Scan tab labeled **Daily Scan Report**. It shows:

- A **toggle** to enable or disable the daily email.
- An **email address** field (defaults to your admin email).
- **Preview Report** button — opens the rendered HTML in a modal so you can see what the next email will look like.
- **Send Test Email** button — sends the next scheduled report to the configured address right now.

When enabled, a daily background check runs the day's scan and emails the results. If the email fails to send (for example, your host's `wp_mail()` is misconfigured), a persistent admin notice appears at the top of every WP-Admin page until the next successful send.

#### Scan results — what you see

Each finding row in the results panel shows:

- A **severity badge** — `critical` (red), `high` (orange), `medium` (yellow), `low` (gray), `info` (blue).
- A short **title** and a one-line description.
- The **evidence** — usually a file path, a header value, or a version string.

Per-finding action buttons:

- **Mark safe** — adds this file path (or finding id, for non-file findings) to your ignore list so future scans skip it.
- **Quarantine** — moves the file to the protected quarantine directory (file findings only).
- **Delete** — permanently removes the file (file findings only).

A summary banner at the top of the panel shows counts, for example "3 critical, 5 high, 2 medium, 1 low". A green banner says "All clear" when nothing is found.

### 3.3 Logs tab

This tab shows the **security event log** and the master toggles for the firewall.

The log table shows recent events with columns: **Time**, **IP**, **Event**, **Severity**, **Blocked?**. Severity rows are color-banded: red (high), amber (medium), gray (low).

#### Firewall (WAF) toggles

- **Firewall enabled** — master switch. When off, no incoming requests are filtered.
- **Simulation mode** — when on, the firewall **logs** what it would block but **does not** actually block. It starts in this mode on install; use it for a day after enabling active blocking, to verify nothing legitimate is caught.
- **Block SQL injection patterns** — toggle for the SQL-injection rule pack.
- **Block XSS patterns** — toggle for the cross-site-scripting rule pack.

#### Login Protection

- **Login protection enabled** — toggle. Counts failed login attempts per IP.
- **Max retries before lockout** — number input (default 5). After this many failures within 10 minutes, the IP is auto-banned for 30 minutes.

#### Spam Protection

- **Spam protection enabled** — toggle. A hidden honeypot field on the comment form, and comments with more than two links, are marked as spam — on by default.

### 3.4 Quarantine tab

This tab manages files the plugin has isolated, plus your IP allowlist and blocklist.

#### Quarantined Files

When the malware scanner detects a malicious file, it **moves** it (it does not delete it) to a protected directory, `wp-content/uploads/swisswpsuite-quarantine/`. That directory has its own `.htaccess` that blocks all web access.

Each quarantined file appears in a table with:
- **Original path**
- **Quarantined at** (date)
- **Size** (human-readable, e.g. "4.2 MB")
- **Restore** button — moves it back to its original location.
- **Delete forever** button — permanently removes it.

#### Ignored Paths (Mark Safe)

A list of file paths and finding IDs you have manually marked as safe. The scanner skips these on future scans.

Two types of entries:
- **Path-based** — e.g., `wp-content/themes/my-theme/template-custom.php`. The plugin also stores the SHA-256 of the file at the time you marked it. If the file changes later, the entry is auto-evicted and the file is rescanned (this stops attackers from swapping your safelisted file with malware).
- **ID-based** — used for non-file findings, where there is no path to safelist.

Each row has a **Remove** button.

#### Blocked IPs

A table of currently blocked IPs. Each row shows:
- **IP address**
- **Reason** — a short text label describing why the IP is blocked (for example, "Brute-force lockout" or whatever you typed when you blocked it manually)
- **Expires** — for time-limited blocks (such as a 30-minute brute-force lockout), the time the block ends. Permanent blocks have no expiry.
- **Release** button — removes the block immediately.

**Block IP form** at the top of the table: an IP input (IPv4 or IPv6), a reason input, and a **Block** button.

#### Allowed IPs (allowlist)

A permanent safelist of IPs that are **never** auto-banned by the brute-force protection.

- A button shows **your current visitor IP** ("Add my current IP") so you can one-click safelist yourself.
- Add an IP from the input — it accepts IPv4 and IPv6.
- **Remove** button per row.

When you add an IP that is currently blocked, the block is cleared at the same time.

### 3.5 Hardening tab

A grid of **12 hardening options**. Each is a card with the option name, a plain-English explanation, a risk badge (low / high), and a toggle switch.

#### Essential hardening

- **Block Legacy Remote Access** — closes the XML-RPC back door. Only keep off if you use the WordPress mobile app or older Jetpack.
- **Disable File Editor** — removes the in-dashboard code editor.
- **Prevent Malware in Uploads** — blocks the **execution** of `.php` files placed inside `wp-content/uploads/`. This rule applies broadly to the uploads directory. Some plugins (page builders, caching layers, e-commerce extensions) drop legitimate PHP helper files in or near `uploads/` and may behave incorrectly while this rule is active — there is no built-in per-plugin allowlist. If you notice broken functionality after enabling this option, disable it again or move the affected plugin's helpers out of `uploads/`.
- **Hide WordPress Fingerprints** — removes the WordPress version from the generator tag and from asset URLs that carry it. Other plugins' asset version strings and page output are untouched.
- **Hide Your Username List** — blocks the `?author=N` enumeration trick.
- **Restrict AI Crawlers to Homepage** — adds a `robots.txt` entry blocking ChatGPT, Claude, Perplexity, Bing AI, and others from crawling beyond your homepage.
- **Restrict Google to Homepage Only** (high-risk) — adds `Disallow: /` for Googlebot and Bingbot for everything except `/`. WARNING: this removes your site from inner-page search results. The toggle shows a confirmation dialog before applying.

#### Advanced hardening

- **Add Browser Security Rules** (high-risk) — sends `X-Frame-Options`, `Content-Security-Policy`, `Strict-Transport-Security`, and similar headers. May prevent your site from being embedded in other websites and can affect login popups. Requires confirmation.
- **Limit What Strangers Can See** (high-risk) — blocks anonymous REST API access. Can break checkout, contact forms, and many plugins. Requires confirmation.
- **Hide Author Profile Pages** — hides author profile pages (which reveal admin usernames). Not recommended for multi-author blogs.
- **Block Aggressive Web Crawlers** — blocks scraping bots (Ahrefs, Semrush, and similar). Does NOT affect Google or Bing.
- **Content Source Monitoring** — Report-only Content Security Policy. Doesn't block anything; reports are visible in your browser's developer tools only.

#### Conflict / Confirmation dialogs

When you toggle on a high-risk option, the plugin first runs a **pre-toggle check** that scans your active plugins for known conflicts. For example, turning on **Limit What Strangers Can See** while WooCommerce is active triggers a warning that checkout uses the REST API.

The dialog shows the conflict title, a plain-English description, a list of affected plugins (if any), a suggested resolution, and two buttons: **Cancel** (default) and a customized confirmation button (e.g. "I understand, enable anyway"). The option stays on until you toggle it off.

#### Apply Recommended Level

A top-right button, **Apply Recommended Level**, recommends a security level (Basic / Standard / Strict) based on whether WooCommerce (or another e-commerce plugin) is active, whether a subscription/membership plugin is active, and whether multi-author roles exist. Clicking it shows a preview dialog with the options that would be turned on and asks you to confirm; once you confirm, the plugin enables those options in one batch.

### 3.6 Cloud Shield tab

A written configuration guide for sites behind Cloudflare. It does not require a Cloudflare account and the plugin never contacts Cloudflare. When a site is behind Cloudflare, the plugin reads Cloudflare's `CF-Connecting-IP` header — but only for requests arriving from Cloudflare's published IP ranges (a fixed list inside the plugin) — so that the firewall, login protection, and logs see the real visitor address instead of Cloudflare's.

### 3.7 History tab

A timeline of every scan that has run on your site:

| Column | Meaning |
|---|---|
| **Date** | When the scan ran. |
| **Type** | Deep Malware Scan or the daily quick audit (`security_audit`). |
| **Grade** | A / B / C / D / F. |
| **Findings** | Total findings (also broken down by severity in a tooltip). |

Click any row to open a detail panel that re-renders the full scan results from that point in history. The detail panel has a **Mark Safe** action per finding and a **Re-run** button.

---

## 4. SEO

The **local** on-page SEO audit and score, and the XML sitemap, are computed entirely on your server — no AI.

### 4.1 SEO health scan

Click **Run SEO Scan**. The plugin examines every published post, page, product, and image:

- Counts how many have a meta title.
- Counts how many have a meta description.
- Counts how many have alt text (for images).
- Computes a **score** out of 100.

You see per-content-type cards (Posts / Pages / Products / Images) with totals, missing, and optimized counts, and a **Non-compliant items** list — each row links to the post editor and shows the reason.

### 4.2 On-page output

Off by default. When you switch on **Basic SEO Meta Tags** under **Settings → SEO**, the plugin writes a meta description (taken from the post excerpt or opening text), canonical link, Open Graph and Twitter Card tags, and JSON-LD structured data into each public page's head. On the front page, blog page, shop page, and category/tag archives, it also sets the document title; single posts and pages keep the theme's title. It never does this while a dedicated SEO plugin (Yoast SEO, Rank Math, All in One SEO, SEOPress, The SEO Framework) is active — it defers to that plugin and shows a notice.

### 4.3 Sitemap & llms.txt

- **Generate Sitemap** button — creates `sitemap.xml` at the root of your site, with custom post type support.
- **Generate llms.txt** button — creates `/llms.txt`, off by default, listing your key pages with summaries for AI-crawler readability. It skips password-protected and unpublished content.

---

## 5. Backup

### 5.1 Backup Control card

A panel with the following actions:

- **Create Backup Now** — runs a full backup (database + files), using a pure-PHP zip engine (no shell exec). Files over 100MB are skipped. A progress bar shows the current phase. The backup engine is **multi-tick** — it splits the work across many HTTP requests so it doesn't time out on shared hosting.
- **Scope** dropdown — **Full** (DB + files), **Database only**, or **Files only**.
- **Cancel** button — appears while a backup is running. Stops the engine cleanly and rolls back any partial output.

A status banner appears in these cases:
- "Slow backup detected (taking longer than usual)" — if the backup has run longer than usual.
- "Stuck jobs detected" — if previous backup engine state rows are still marked running for more than 2 hours; you can click **Clear stuck jobs** to reset.
- "WP-Cron disabled" — automations will not auto-schedule; manual backups still work.

### 5.2 Backup List

A table of every backup the plugin knows about. Each row is a **Backup Set** (one logical backup, possibly split into multiple ZIP files). Columns:

- **Name** — e.g. "Backup 2026-05-22 14:32".
- **Date** — when it completed.
- **Type** — Full / DB / Files.
- **Size** — human-readable total size.
- **Status badge** — Complete (green) / Failed (red) / Cancelled (gray) / Running (amber).
- Per-row actions: **Download**, **Restore**, **Delete**.

The plugin keeps the 10 most recent local backups and prunes older ones automatically. When the plugin detects ZIP files on disk that no longer correspond to a Backup Set record, a banner appears with a **Clean up orphaned backup files** button.

### 5.3 Backup encryption

Configured under **Settings → Security**. When you set a password, new backup archives are written as encrypted `.zip.enc` files (AES-256). **If you lose this password, those backups cannot be recovered.**

### 5.4 Restoring a backup

Click **Restore** on any row in the Backup List. A confirmation dialog appears that summarizes:
- What will be restored: your site files, and — when the backup archive contains exactly one database dump — your database.
- Estimated time.
- A warning that this will overwrite your current site files (and database, when a dump is restored).

**A full restore imports the archive's database.** Before the first table is touched, the plugin writes a safety dump of your *current* database to a `pre-restore-safety/` folder inside your backup directory (the newest 3 dumps are kept), so a bad restore can be recovered from. If that safety dump's table prefix does not match your site's own table prefix — for example, when restoring onto a reinstalled site with a freshly generated prefix — the restore stops immediately and nothing is changed. If a backup archive contains more than one SQL dump file, the plugin has no safe way to choose between them: the database step is skipped with an on-screen notice, and only your files are restored. If the archive is password-protected (`.zip.enc`), the plugin decrypts it first using the password stored under **Settings → Security**; without that password, or with the wrong one, the restore stops with a clear error and nothing is changed.

After you confirm, the plugin:
1. Snapshots your current security settings (so they survive the restore).
2. Restores files (extracts the ZIP over your site).
3. Imports the database, when exactly one dump is found (see above) — your current database is safety-dumped first.
4. Re-registers all scheduled tasks.
5. Restores your security settings from the snapshot.

The progress bar shows each step. If a step fails, the plugin logs the exact error and keeps the safety dump so nothing is lost.

### 5.5 WP-CLI

For hosts with real cron access, optional WP-CLI commands are available: `wp swisswpsuite backup run|due|status` runs or resumes a backup, fires this plugin's own due recurring tasks, or lists backup job status. This is entirely optional — nothing changes if you never use it.

---

## 6. Settings

The Settings page has five tabs: **General**, **Security**, **SEO**, **Maintenance**, **Diagnostics**. All settings save automatically — there is no "Save Settings" button anywhere in the plugin. Toggles save on change; text fields save on blur.

### 6.1 General

- **Automatic Updates** — keep the plugin updated automatically (controlled entirely by WordPress core's own per-plugin toggle; this plugin does not add, override, or otherwise interfere with that setting).
- **Custom SMTP** — supply the credentials of your own SMTP server so that every e-mail WordPress sends from this site (this plugin's reports and alerts, password resets, other plugins' mail) is handed to that server instead of PHP `mail()`. Off until configured; the recipient address for the daily Scan Report is configured separately on the Scan tab (Section 3.2).

### 6.2 Security

- **Backup Encryption** — choose AES-256 encryption for backup archives, set or change the password. When a password is set, backup archives are written as `.zip.enc`. **If you lose this password, those backups cannot be recovered.**
- **Scan Coverage** —
  - **WordPress Core Integrity Check** toggle — when on, the deep scan verifies your WordPress core files against the official wordpress.org checksums and reports any tampering.
  - **Abandoned Plugin Detection** toggle — a daily check of your installed plugins against the WordPress.org directory, warning if one was closed or removed (often a sign of an unpatched or compromised plugin). Can be turned off here.

### 6.3 SEO

A single card, **SEO Settings**, controlling how your site appears when shared on social media:

- **Basic SEO Meta Tags** toggle — turns on the on-page output described in Section 4.2.
- **Default Social Image** — a Media Library picker for the fallback Open Graph image used when a post has no featured image. Recommended size 1200×630px. Selection and removal save automatically the moment you choose or remove an image.

### 6.4 Maintenance

A stack of cards focused on housekeeping. If your site has `DISABLE_WP_CRON` set in `wp-config.php`, a warning banner reminds you that scheduled tasks (backups, scans) won't fire on their own.

- **Maintenance Tools** — one-click actions, each with a confirmation prompt: **Clear Transients**, **Delete Post Revisions**, **Delete Spam Comments**, **Optimize Database Tables**.
- **Database Cleanup** — one-click actions for orphaned data: **Clean Orphaned Post Meta**, **Clean Orphaned Comment Meta**, **Empty Trash**, **Delete Auto-Drafts**, **Clean Orphaned Term Relationships**, and **Drop Orphaned Tables** (drops database tables left behind by uninstalled plugins; core tables and tables belonging to active plugins are never touched — a preview run is shown first, and a second explicit confirmation is required before anything is dropped. **Back up your database first.**).
- **Cache Management** — a **Clear Site Cache** button. If LiteSpeed Cache, WP Rocket, or Autoptimize is active, the plugin asks it to purge its page cache (a local plugin call, no network request); this also runs automatically after a restore.

### 6.5 Diagnostics

- **Self-Check** — one click runs a set of local checks (PHP version and extensions, disk headroom, backup-folder writability, scheduler health, hardening state, caching/proxy detection, known plugin conflicts, backup engine health) and shows plain-English results. The same results also appear in WordPress's own Site Health screen.
- **Export diagnostics** — downloads one redacted file (secrets and absolute paths removed, no IP addresses, no admin email) that you can attach to a support request. Nothing is ever sent automatically.
- **Send test email** — an explicit one-click action to confirm mail delivery is working.
- **System Logs** — a scrollable, color-coded view of recent debug log entries, refreshing live every 5 seconds (also refreshable on demand). If you contact support, copy and paste the relevant entries.

---

## 7. Status Indicators, Badges, Colors, and Icons

| Indicator | Meaning |
|---|---|
| Green badge / dot | All good. Last action succeeded. |
| Amber / yellow badge | Warning. Not broken, but needs attention. |
| Red badge / dot | Error. Action failed or critical issue present. |
| Gray badge | Not run, not configured, or feature disabled. |
| A / B / C / D / F grade | A = excellent, F = critical. From the deep scan, derived from finding severity. |
| Severity row colors in findings | Red = critical, orange = high, yellow = medium, gray = low, blue = info. |
| `cron_blocked` banner | `DISABLE_WP_CRON` is on. Scheduled tasks may not fire. |
| "Slow backup" banner | Backup engine has been running longer than usual. Often harmless. |
| Persistent admin notice (yellow) at top of WP-Admin | Last daily report email failed to send. Clears on next success. |

---

## 8. Troubleshooting

### "Failed to send daily report email"

Cause: PHP's `wp_mail()` is failing on your host. Fix:
1. Go to **Settings → General → Custom SMTP** and configure custom SMTP (host, port, username, password, from address).
2. Send a test email (Settings → Diagnostics) and check the diagnostics output for the exact SMTP error.
3. Common fix: most hosts require an authenticated SMTP relay.

### Backup "Stuck" / running forever

Cause: a previous backup tick crashed and the engine state is still marked `running`. Fix:
1. Go to **Backup → Backups** → click **Clear stuck jobs**.
2. Try the backup again.

### "All clear" but I think I am hacked

The daily quick audit and the Deep Scan are both local signature/heuristic checks. If the result is clean and you still suspect a compromise, restore from a clean backup taken before the suspected event.

### Restore failed mid-import / site looks broken

The plugin always takes a safety dump of your database, and a snapshot of your security settings, before a restore's database import begins. If a restore fails:
1. Refresh the SwissSuite admin page — the post-restore recovery routine auto-runs.
2. If still broken, go to **Backup → Backups** and restore an earlier backup.

### WP-Cron disabled — features stop firing

If you (or your host) set `DISABLE_WP_CRON` in `wp-config.php`, scheduled backups and the daily scan/report stop firing. The plugin shows a warning banner at the top of affected pages. Fix:
1. Either remove `DISABLE_WP_CRON` from `wp-config.php`, or
2. Add a real server cron job: `*/5 * * * * curl -s https://yoursite.com/wp-cron.php?doing_wp_cron`, or use the optional WP-CLI command described in Section 5.5.

### Other strange behavior

Open **Settings → Diagnostics → System Logs**. Recent entries are shown live (refreshing every 5 seconds), color-coded by severity. Each entry includes timestamp, severity, module, message, memory usage, and load average. If you contact support, copy and paste the relevant entries.
