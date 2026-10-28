# SwissSuite Security Backup and SEO — User Manual

**Applies to plugin version:** 2.9.33.58
**Audience:** WordPress site owners. No coding required.

SwissSuite Security Backup and SEO is a local WordPress security and backup plugin: malware scanning, a firewall, one-click hardening, backup and restore, login protection, and on-page SEO. It runs entirely inside your WordPress admin — there is nothing to install on your server, no account, and no license key. See `readme.txt` for the complete, authoritative feature list; this manual walks through how to use each of those features.

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
- [9. Disaster Recovery — Restoring a Site That Is Completely Down](#9-disaster-recovery--restoring-a-site-that-is-completely-down)

---

## 1. Getting Started

### 1.1 What SwissSuite Does

SwissSuite Security Backup and SEO is a WordPress plugin for **security** and **backups**, with a local on-page **SEO** audit and output. Everything runs on your own server: the malware scanner, the firewall, hardening, backups, and the SEO tools all run locally, and no file contents or site content are ever sent anywhere. There is **no license key, no account, and no sign-up** — every feature works the moment you activate the plugin.

### 1.2 Installation

Install SwissSuite from the official WordPress.org plugin directory:

1. In your WordPress dashboard, go to **Plugins → Add New**.
2. Search for **SwissSuite Security Backup and SEO**.
3. Click **Install Now**, then **Activate**.

After activation, a new menu item called **SwissSuite** appears in your WordPress sidebar. The plugin does not change the theme/plugin file editor; you can turn it off at **Security → Hardening**.

**System requirements:**

- WordPress 6.3 or newer
- PHP 7.4 or newer

### 1.3 First-Time Setup

The first time you open SwissSuite, the **Dashboard** shows a **Critical Next Steps** card. It guides you through the most important things to do:

1. **Run your first scan** — Go to **Security → Scan** and click **Start Deep Scan**. Results appear once the scan finishes.
2. **Create your first backup** — Go to **Backups** and click **Save Backup Now**. Wait until the new backup appears in the list.
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

- **Smart Firewall** card — toggle to enable/disable the WAF; a "Detection Only Mode" checkbox to log threats without blocking; a list of what it checks (SQL-injection and basic script-injection patterns in the page address and its query arguments, path traversal in the page address — form submissions, uploads, request bodies and headers are not inspected).
- **Login Safeguard** card — a switch for login-lockout protection and the **Max Login Attempts** setting (see Section 3.3).

After you run a scan from the Scan tab, a **scan summary card** appears on this Dashboard tab showing the security grade (A / B / C / D / F, derived from the severity of what the scan found) and a link back to the detailed results.

### 3.2 Scan tab

The Scan tab has one card, **Deep Scan**.

**What it does.** On demand, scans up to 5,000 PHP files (2 MB each) in your active plugins, active theme (and its parent theme, if any), and the uploads folder — skipping 32 trusted paths plus `/vendor/` — then runs local signature analysis against SwissSuite's malware pattern library. No file contents leave your site. The scan runs in two phases: **file discovery**, then **scanning file contents**.

**Button:** **Start Deep Scan**. While running, the button shows the current phase ("Discovering files…", "Scanning file contents…"). You can leave the page — the scan continues in the background — and stop a running scan with **Cancel**.

**Daily quick audit.** Once the daily scan report e-mail is switched on (Scheduled Scan Report card, below), a quick audit runs automatically once a day and its results are emailed to you.

**Result panel** shows:

- A **security grade** badge (A green, B emerald, C amber, D/F red), derived from the severity of the findings.
- Each finding's severity, title, description, and evidence (usually a file path).

#### Scheduled Scan Report email

A card on the Scan tab labeled **Scheduled Scan Report**. It shows:

- A **toggle** to enable or disable the daily email.
- An **email address** field (defaults to your admin email).
- **Preview Email** button (in the status bar above the card) — shows the grade and top findings of the last stored scan, which a report e-mail is built from. A scheduled report runs a new scan first, so its results can differ.
- **Send Test Email** button — sends a sample report with placeholder data to the configured address, so you can check that the e-mail arrives.

When enabled, a daily background check runs the day's scan and emails the results. If the email fails to send (for example, your host's `wp_mail()` is misconfigured), a persistent admin notice appears at the top of every WP-Admin page until the next successful send.

#### Scan results — what you see

Each finding row in the results panel shows:

- A **severity badge** — `critical` (red), `high` (orange), `medium` (yellow), `low` (gray), `info` (blue).
- A short **title** and a one-line description.
- The **evidence** — usually a file path, a header value, or a version string.

Actions on findings:

- **Mark safe** — adds this file to your ignore list so future scans skip it while its content stays the same.
- **Quarantine** — tick one or more file findings, then click **Quarantine** in the bar above the list; each file is moved to the protected quarantine directory, except the files Section 3.4 lists as refused.

### 3.3 Logs tab

This tab shows the **security event log**.

The log table shows recent events with columns: **Timestamp**, **Severity**, **Origin**, **Details**, **Action**.

The firewall and login controls are on the Dashboard tab (Section 3.1):
- **Smart Firewall** — master switch. When off, no incoming requests are filtered.
- **Detection Only Mode** — when on, the firewall **logs** what it would block but **does not** actually block. It starts in this mode on install; keep it on for a day or so and check the log before you switch it off, so you can see that nothing legitimate would be blocked.
- **Login Safeguard** — counts failed login attempts per IP.
- **Max Login Attempts** — 1, 3, 5 (default) or 10. After this many failed attempts, logins from that IP are refused for 15 minutes after its last failed attempt.

#### Spam Protection

Comment spam protection is on by default: a comment sent from this site's comment form with the hidden honeypot field filled in is refused. The Security screens have no switch for it.

### 3.4 Quarantine tab

This tab manages files the plugin has isolated, plus your IP allowlist and blocklist.

#### Quarantined Files

When you tick one or more scan findings and click **Quarantine** in the bar above the list (the button shows how many you ticked), the plugin **moves** each file (it does not delete it) to a protected directory in your uploads folder, normally `wp-content/uploads/swisswpsuite-quarantine/`, and renames it with a `.quarantined` extension. Files named `index.php`, `wp-config.php` or `.htaccess`, files in `wp-admin/` or `wp-includes/`, this plugin's own files and the main file of any installed plugin are refused, and a message lists them. When the plugin creates that directory, it also writes an `.htaccess` file into it that denies web access. Servers that read `.htaccess` files (such as Apache) apply it; nginx does not read them, so on an nginx server ask your host to block web access to that directory.

Each quarantined file appears in a table with:
- **ID**
- **File Path** — the original path, with the date it was quarantined below it
- **Reason** — "Flagged by a scan"
- **Restore** button — moves it back to its original location.
- **Purge** button — permanently deletes it.

#### Ignored Paths (Mark Safe)

A list of file paths and finding IDs you have manually marked as safe. The scanner skips these on future scans.

Two types of entries:
- **Path-based** — e.g., `wp-content/themes/my-theme/template-custom.php`. The plugin also stores the SHA-256 of the file at the time you marked it. If the file changes later, the entry is auto-evicted and the file is rescanned (this stops attackers from swapping your safelisted file with malware).
- **ID-based** — used for non-file findings, where there is no path to safelist.

Each row has a **Remove** button.

#### Blocked IPs

A table of the IP addresses you blocked by hand. Each row shows:
- **IP address**
- **Release** button — removes the block immediately.

Automatic blocks (firewall bans and login lockouts) are not listed here.

**Block IP form** at the top of the table: an IP input (IPv4 or IPv6) and a **Block IP** button.

#### Allowed IPs (allowlist)

A permanent safelist of IPs that are **never** auto-banned by the brute-force protection.

- **Your current IP** is shown with an **Allow this IP** button, so you can allow yourself in one click.
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
- **Hide Your Username List** — hides your usernames from the site's data feed, the user sitemap and embeds. Usernames can still be found through author pages unless **Hide Author Profile Pages** is also on.
- **Restrict AI Crawlers to Homepage** — adds a `robots.txt` entry asking AI crawlers (ChatGPT, Claude, Perplexity, Google-Extended and others) not to crawl beyond your homepage. robots.txt is advisory: crawlers that ignore it are not blocked.
- **Restrict Google to Homepage Only** (high-risk) — asks Googlebot and Bingbot, through `robots.txt`, to crawl only your homepage. Your inner pages can disappear from their search results. The toggle shows a confirmation dialog before applying.

#### Advanced hardening

- **Add Browser Security Rules** (high-risk) — sends `X-Frame-Options`, `Strict-Transport-Security` (HTTPS sites only), and 6 other browser security headers. Does **not** send `Content-Security-Policy` — that is the separate **Content Source Monitoring** toggle below, and even there it is report-only (blocks nothing). May prevent your site from being embedded in other websites and can affect login popups. Requires confirmation.
- **Limit What Strangers Can See** (high-risk) — blocks anonymous access to most of your site's data feed (REST API); posts, pages, categories, tags, search and the routes common plugins need stay open. Can break checkout, contact forms, and many plugins. Requires confirmation.
- **Hide Author Profile Pages** — hides author profile pages (which reveal admin usernames). Not recommended for multi-author blogs.
- **Block Aggressive Web Crawlers** — blocks a fixed list of crawlers: SEO tools such as Ahrefs and Semrush, and search engines such as Yandex, Baidu, Sogou, Seznam and Petal. Does not affect Google or Bing.
- **Content Source Monitoring** — Report-only Content Security Policy. Doesn't block anything; reports are visible in your browser's developer tools only.

#### Conflict / Confirmation dialogs

When you toggle on a high-risk option, the plugin first runs a **pre-toggle check** that scans your active plugins for known conflicts. For example, turning on **Limit What Strangers Can See** while WooCommerce is active triggers a warning that checkout uses the REST API.

The dialog shows the conflict title, a plain-English description, a list of affected plugins (if any), a suggested resolution, and two buttons: **Cancel** (default) and a customized confirmation button (e.g. "I understand, enable anyway"). The option stays on until you toggle it off.

#### Apply All Recommended Settings

A top-right button, **Apply All Recommended Settings**, enables a **fixed** set of 8 hardening
options in one batch: Block Legacy Remote Access, Disable File Editor, Prevent Malware in Uploads,
Hide WordPress Fingerprints, Hide Author Profile Pages, Block Aggressive Web Crawlers, Hide Your
Username List, and Restrict AI Crawlers to Homepage. It does **not** detect your site profile (there
is no WooCommerce/membership/multi-author check), does **not** offer Basic/Standard/Strict levels,
and does **not** show a preview of what will change — clicking it shows a single yes/no confirmation
dialog before applying. The 4 highest-risk options — Add Browser Security Rules, Limit What
Strangers Can See, Content Source Monitoring, and Restrict Google to Homepage Only — are left
untouched by this button either way; enable them individually if you want them.

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

Click **View** on a row to open that scan's findings on the Scan tab. Findings you have marked safe or fixed since then are not shown.

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

- **Save Backup Now** — runs a backup of the type you chose, using a pure-PHP zip engine (no shell exec). Files over 100 MB are stored uncompressed in their own archive part. A progress bar shows the current phase. The backup engine is **multi-tick** — it splits the work across many HTTP requests so it doesn't time out on shared hosting.
- **Backup type** cards — **Everything**, **Content Only**, or **Design Files Only**; each card says what it includes.
- **Cancel Backup** button — appears while a backup is running.

### 5.2 Backup List

A table of your backups. Each row is either a **Backup Set** (the ZIP files the plugin recorded together as one backup) or a single .zip or .zip.enc file in the backup folder that no set lists, such as a file you copied in by hand. Columns: **Backup**, **What's Included**, **Stored In**, **Created**, **Size**. A set row has **Restore** and **Delete**; expand it to **Download** each of its files. A file row has **Download**, **Restore** and **Delete**.

The plugin keeps the 10 most recent local backups and prunes older ones automatically when a backup finishes; backup files you copied into the backup folder by hand count toward these 10. If the backup folder holds a database dump file (.sql) older than 12 hours, a notice above the table counts the leftover files and offers a **Clean Up** button that deletes them. A backup file that no set lists is never part of this notice; it keeps its own row in the table.

### 5.3 Backup encryption

Configured under **Settings → Security**. When you set a password, new backup archives are written as encrypted `.zip.enc` files (XChaCha20-Poly1305, or AES-256 where the server lacks Sodium). **If you lose this password, those backups cannot be recovered.**

### 5.4 Restoring a backup

Click **Restore** on any row in the Backup List. A confirmation dialog appears that summarizes:
- What will be restored: your site files.
- Estimated time.
- A warning that this will overwrite your current site files. If the backup archive also holds a copy of your database, the dialog says that copy is not imported and your current database is not replaced.

**This restores files only — it never imports the database.** If a backup archive holds a database dump, that dump stays inside the archive; nothing is written to disk from it and no statement runs against your database. When the restore finishes, the on-screen notice and, for a full or files-plus-database archive, the message tell you the archive also held a database copy and that your current database was not replaced; for a database-only archive, the notice says nothing from it was applied. Either way it points you to the fix: extract the `.sql` file from the archive and import it yourself with your hosting provider's database tool (for example phpMyAdmin) — or, for an encrypted archive, decrypt it first (see the note below). Because a restore that held more than it applied should not be read as an unqualified success, its status is reported as "completed with warnings", not a plain "complete", whenever the archive carried a database dump. If the archive is password-protected (`.zip.enc`), the plugin decrypts it first using the password stored under **Settings → Security**; without that password, or with the wrong one, the restore stops with a clear error and nothing is changed.

After you confirm, the plugin:
1. Snapshots your current security settings (so they survive the restore).
2. Restores files (extracts the ZIP over your site).
3. Re-registers all scheduled tasks.
4. Restores your security settings from the snapshot.

The progress bar shows each step. If a step fails, the plugin logs the exact error.

**Bringing the database back yourself.** The `.sql` file inside the archive is the database as it was when the backup was taken. To restore it: unzip the archive (or, if it's a `.zip.enc` file, run `wp swisswpsuite backup decrypt` first — see Section 5.5 — to get a plain `.zip` you can unzip), find the `.sql` file at its root, and import it with your hosting provider's database tool (for example phpMyAdmin, or `mysql -u <user> -p <database> < <file>.sql` if you have terminal access). If you are restoring onto a fresh WordPress install rather than the same site, make sure that install's table prefix (the `$table_prefix` value in `wp-config.php`) matches the prefix the dump's tables use — nothing in this plugin checks that for you during a manual import, so a mismatch will simply leave WordPress unable to find its own tables. **If your only copy of the archive is encrypted and you don't have WP-CLI (terminal/SSH) access to run the decrypt command,** there is currently no way to reach the `.sql` file inside it — restore the files with the button as above, and keep the encrypted archive until you do have terminal access to decrypt it.

**Leftover files from a restore done with an older version of this plugin.** An earlier version of this
plugin could import a database directly, and as part of that it saved a copy of your database — up to 3
such copies, named `pre-restore-safety-*.sql` — before making any change, so the previous database could
be recovered if something went wrong. If you restored a backup with that earlier version, these files may
still be sitting in your uploads folder, in plain (unencrypted) text, at
`wp-content/uploads/swisswpsuite-exports-temp/pre-restore-safety/`. This build does not create new copies
like this (restore no longer imports a database), and it does not delete the old ones automatically,
because one of them may be the only copy you have of a database from before a past restore. If you want
to remove them: with WP-CLI or SSH access, delete the `pre-restore-safety-*.sql` files inside that
folder; without terminal access, use your hosting file manager to open the same folder and delete them by
hand. Uninstalling the plugin also removes them, along with everything else under
`swisswpsuite-exports-temp`.

### 5.5 WP-CLI

For hosts with terminal access, optional WP-CLI commands are available: `wp swisswpsuite backup run|due|status|restore|decrypt` runs or resumes a backup, fires this plugin's own due recurring tasks, lists backup job status, restores an archive from the command line, or turns a password-protected archive into a plain zip. `restore` and `decrypt` are documented in full in Section 9. This is entirely optional — nothing changes if you never use it.

---

## 6. Settings

The Settings page has five tabs: **General**, **Security**, **SEO**, **Maintenance**, **Diagnostics**. All settings save automatically — there is no "Save Settings" button anywhere in the plugin. Toggles save on change; text fields save on blur.

### 6.1 General

- **Automatic Updates** — keep the plugin updated automatically (controlled entirely by WordPress core's own per-plugin toggle; this plugin does not add, override, or otherwise interfere with that setting).
- **Email Delivery (SMTP)** — supply the credentials of your own SMTP server so that every e-mail WordPress sends from this site (this plugin's reports and alerts, password resets, other plugins' mail) is handed to that server instead of PHP `mail()`. Off until configured; the recipient address for the daily Scan Report is configured separately on the Scan tab (Section 3.2).

### 6.2 Security

- **Backup Encryption** — set or change the password that encrypts backup archives (XChaCha20-Poly1305, or AES-256 where the server lacks Sodium). When a password is set, backup archives are written as `.zip.enc`. **If you lose this password, those backups cannot be recovered.**
- **Scan Coverage** —
  - **WordPress Core Integrity Check** toggle — when on, a daily check compares your WordPress core files with the official wordpress.org checksums and reports files that were changed or are missing; added files are not checked. Off until you agree: the plugin asks once on its own screen, and you can switch it on or off here at any time.
  - **Abandoned Plugin Detection** toggle — a daily check of your installed plugins against the WordPress.org directory, warning if one was closed or removed (often a sign of an unpatched or compromised plugin). Off until you agree: the plugin asks once on its own screen, and you can switch it on or off here at any time.

### 6.3 SEO

A single card, **SEO Settings**, controlling how your site appears when shared on social media:

- **Basic SEO Meta Tags** toggle — turns on the on-page output described in Section 4.2.
- **Default Social Image** — a Media Library picker for the fallback Open Graph image used when a post has no featured image. Recommended size 1200×630px. Selection and removal save automatically the moment you choose or remove an image.

### 6.4 Maintenance

A stack of cards focused on housekeeping. If `DISABLE_WP_CRON` is not set in `wp-config.php`, the tab suggests setting it together with a server cron job, and an admin notice appears when this plugin's scheduled tasks are overdue.

- **Maintenance Tools** — one-click actions, each with a confirmation prompt: **Clear Transients**, **Delete Post Revisions**, **Delete Spam Comments**, **Optimize Database Tables**.
- **Database Cleanup** — one-click actions for orphaned data: **Clean Orphaned Post Meta**, **Clean Orphaned Comment Meta**, **Empty Trash**, **Delete Auto-Drafts**, **Clean Orphaned Term Relationships**, and **Drop Orphaned Tables** (drops database tables left behind by uninstalled plugins; core tables and tables belonging to active plugins are never touched — a preview run is shown first, and a second explicit confirmation is required before anything is dropped. **Back up your database first.**).
- **Cache Management** — a **Clear Site Cache** button. If LiteSpeed Cache, WP Rocket, or Autoptimize is active, the plugin asks it to purge its page cache (a local plugin call, no network request); this also runs automatically after a restore.

### 6.5 Diagnostics

- **Self-Check** — one click runs a set of local checks (PHP version and extensions, disk headroom, backup-folder writability, scheduler health, hardening state, caching/proxy detection, known plugin conflicts, backup engine health) and shows plain-English results. The same results also appear in WordPress's own Site Health screen.
- **Export diagnostics** — downloads one file that you can attach to a support request. The plugin removes the keys, server paths, IP addresses, e-mail addresses and usernames it recognises; check the file before you share it. Nothing is ever sent automatically.
- **Send test email** — an explicit one-click action to confirm mail delivery is working.
- **System Logs** — on the **Maintenance** tab: a scrollable, color-coded view of recent debug log entries, refreshing every 15 seconds. If you contact support, copy and paste the relevant entries.

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
| "Backup seems slow?" tip | Shown under a running backup that is still below 5% after more than 10 engine steps. It suggests asking your host for a server-side cron job. |
| Persistent admin notice (yellow) at top of WP-Admin | Last daily report email failed to send. Clears on next success. |

---

## 8. Troubleshooting

### "Failed to send daily report email"

Cause: PHP's `wp_mail()` is failing on your host. Fix:
1. Go to **Settings → General → Email Delivery (SMTP)** and configure custom SMTP (host, port, username, password, from address).
2. Click **Send Test Email** in the same card and check the result for the exact SMTP error.
3. Common fix: most hosts require an authenticated SMTP relay.

### Backup "Stuck" / running forever

Cause: a previous backup tick crashed and the engine state is still marked `running`. Fix:
1. Go to **Backups**; if a backup still shows as running, click **Cancel Backup**.
2. Try the backup again.

### "No issues found" but I think I am hacked

The daily quick audit and the Deep Scan are both local signature/heuristic checks. If the result is clean and you still suspect a compromise, restore from a clean backup taken before the suspected event.

### Restore failed / site looks broken

A restore only ever writes your site's files — it never imports a database, so a failed restore cannot
leave your database half-written. The plugin always takes a snapshot of your security settings before
touching any files. If a restore fails partway through:
1. Refresh the SwissSuite admin page — the post-restore recovery routine auto-runs.
2. If still broken, go to **Backups** and restore an earlier backup.

### WP-Cron disabled — features stop firing

If you (or your host) set `DISABLE_WP_CRON` in `wp-config.php`, scheduled backups and the daily scan/report stop firing. The plugin shows a warning banner at the top of affected pages. Fix:
1. Either remove `DISABLE_WP_CRON` from `wp-config.php`, or
2. Add a real server cron job: `*/5 * * * * curl -s https://yoursite.com/wp-cron.php?doing_wp_cron`, or use the optional WP-CLI command described in Section 5.5.

### Other strange behavior

Open **Settings → Maintenance → System Logs**. Recent entries are shown live (refreshing every 15 seconds), color-coded by severity. Each entry includes timestamp, severity, module, message, memory usage, and load average. If you contact support, copy and paste the relevant entries.

---

## 9. Disaster Recovery — Restoring a Site That Is Completely Down

Section 5.4 covers restoring a backup on a site that is already up and running in wp-admin. This
section covers the harder case: the site itself is gone — the server was wiped, the host was cancelled,
or you are rebuilding on a brand-new install — and there is no wp-admin to click into yet.

### The sequence

1. **Reinstall WordPress on the same domain.** A restore replaces this site's content with the
   backup's; it does not create a new site at a new address.
2. **Give the new install the SAME database table prefix the backup was taken from.** This is the
   `$table_prefix` value near the top of `wp-config.php` — WordPress's own installer lets you set it
   before the first page load; most hosts default to `wp_`, but a different value works as long as it
   matches. This matters for step 7 below: bringing the database back is a manual import (this plugin
   restores files only — see Section 5.4), and nothing checks the prefix for you during that import, so
   getting it right now saves you from WordPress being unable to find its own tables afterward.
3. **Install SwissSuite Security Backup and SEO.** Restoring your site's files needs no license key. Bringing the database
   back is a separate manual step (7, below) using your hosting provider's own database tool — that
   needs no license either, since it isn't part of this plugin.
4. **If the archive is encrypted (`.zip.enc`), set the identical encryption password** under
   **Settings → Security** before you attempt the restore. The password is never stored in the backup
   itself — get it wrong (or lose it) and the archive cannot be opened. There is no recovery for a lost
   encryption password (Section 5.3).
5. **Copy the backup's files into place.** Create `wp-content/uploads/swisswpsuite-backups/` if it
   doesn't already exist, and place every part of the set there — a full backup is usually more than one
   file (`backup-full-<id>.zip`, `backup-full-<id>.001.zip`, and so on, or the same names ending
   `.zip.enc` if encrypted). If the backup lives in the cloud (Google Drive, S3, Dropbox, B2), download
   every part by hand first — this manual step is the same regardless of which provider holds the copy.
6. **Go to Backups.** Every file you copied in is listed there, inside a backup set or in a row of its own. Click **Restore** on each of those sets and rows, exactly as in Section
   5.4. This restores your site's files onto the new install; the database inside the archive is not
   touched by this step.
7. **Bring the database back yourself**, exactly as described at the end of Section 5.4: extract the
   `.sql` file from the archive (decrypting it first with `wp swisswpsuite backup decrypt` if it is a
   `.zip.enc` file — see below) and import it with your hosting provider's database tool. The site is
   not fully restored until this step is done.

### If wp-admin will not load at all — WP-CLI

If the new install's wp-admin is broken, or you have real terminal/SSH access and would rather not wait
on a browser tab, the same file restore can be driven from the command line once WordPress and the
plugin are both installed (steps 1-4 above still apply — WP-CLI restores files the same way the button
does; it never imports the database either, so step 7's manual database import still applies just the
same after a WP-CLI restore):

```
wp swisswpsuite backup restore <file> [--files-only] [--yes] [--part] [--dry-run]
```

- `<file>` is either a full path to the archive, or just its filename if you already copied it into
  `wp-content/uploads/swisswpsuite-backups/` (step 5 above).
- The command refuses to run without `--yes` unless the site is verifiably empty — a restore is
  destructive (it overwrites your site's files), so this is not a formality.
- Add `--dry-run` first to see what would happen — the scope and the file size — without changing
  anything.
- If the command is interrupted (a dropped SSH session, a killed process), simply run it again —
  restoring files is safe to repeat.
- **A backup written as several archives is restored one archive per command.** A full backup of a
  large site is written as a set of archives — one per category, and further parts when an archive
  grows past the size limit. Point `restore` at one of them and it stops before touching anything,
  names the set, and lists every archive in a fixed order. Run the command once per archive in that
  order, adding `--part` each time to confirm that the run restores a single part. With `--part` the
  command reports which part of which set it restored and names the whole set again; it never reports
  a finished restore for a single part, and it keeps no record of which parts you have already done —
  the site's files are fully restored only once you have run every one. An archive that belongs to no
  set, or a set made of a single archive, restores in one command; passing `--part` to such a command
  stops it instead, because the archive is not part of anything.
- **The set is recognised two ways, and either one is enough.** The plugin keeps a record of each
  backup and the archives it produced, and every archive of one backup also carries that backup's own
  id in its filename. If the record has been cleaned up — after a retention pass, for instance — the
  command still recognises the other archives sitting beside the one you pointed it at, and still
  stops rather than restoring part of a site. The message says which of the two it is working from,
  and says so plainly if the record names an archive that is no longer on disk.
- **A part that exists under two names is listed once.** Decrypting an archive leaves the plain copy
  beside the encrypted original and both are the same part of the same backup, so the list names it
  once and a closing line tells you which other name it stands in for — or, when that other name is
  not in the folder at all, what the record calls it — so you never run two commands for one part.
- The command exits with status `0` only when the restore finished with nothing left to flag — the
  archive it restored held no database dump. It exits non-zero — and prints the same notice you'd see
  in the browser — whenever the archive also held a database copy (see Section 5.4 and step 7 above):
  that copy was not imported, so the result is reported as "completed with warnings", never a plain
  success. If you're scripting or automating a recovery, check the exit code — do not assume the
  database came back just because the command returned.
- **Working files an interrupted restore left behind are cleared automatically after about a day.**
  If a restore is killed partway through (a lost connection, a server restart), a temporary decrypted
  copy of the archive can be left in the plugin's protected working folder. The plugin's daily cleanup
  now removes that leftover copy once it is old enough that it can no longer belong to a restore that
  is still genuinely in progress — protecting a restore that is taking a long time from having its own
  working files pulled out from under it, while still tidying up after one that failed.

**If the archive is encrypted and you don't have wp-admin open to enter the password,** decrypt it from
the command line first:

```
wp swisswpsuite backup decrypt <file.zip.enc> --password=<your-password> [--out=<path>] [--force]
```

This produces a plain `.zip` you can then restore normally (by button or by `wp swisswpsuite backup
restore`). It refuses to overwrite an existing destination file unless you pass `--force`. **This still
needs a WordPress that boots and WP-CLI installed on the server** — it is a WP-CLI subcommand of this
plugin, not a separate standalone decryption tool you can run without a working WordPress install.

### The hand fallback — an unencrypted archive, with no plugin available at all

If the archive is a plain (unencrypted) `.zip` and, for whatever reason, you can't get the plugin
installed either, you can restore it entirely by hand:
1. Unzip the archive with any zip tool.
2. Copy the extracted WordPress files over your install (same table-prefix rule as above still applies
   to the database step).
3. Find the SQL dump at the root of the extracted archive — named `database-<id>.sql` on a recent
   backup, or plainly `database.sql`/`auto-dump.sql` on an older one — and import it with
   `mysql -u <user> -p <database> < database-<id>.sql` (or your host's phpMyAdmin import).
4. Edit `wp-config.php` on the new install to match the database name, user, password, and table prefix
   the dump actually uses.
This fallback exists for the worst case. It is close to what step 7 above already has you do by hand for
the database either way — this build never imports the database automatically — so the only thing you
lose by going fully by hand is the plugin's own file restore (extraction, the security-settings
snapshot, and encrypted-archive handling); use the plugin's own restore path for your files whenever you
can get to it, and only fall back to this for the files step too when you truly can't.

### Honest caveats

- **The browser Restore button runs as one HTTP request**, bounded by your host's own execution-time
  limit — the same kind of limit shared hosting already imposes on any long-running page load. For a
  large site, or a restore that keeps timing out in the browser, `wp swisswpsuite backup restore` (above)
  has no such request ceiling, so it is the more reliable path once you have shell access. If it is
  interrupted it is always safe to run again — it starts over rather than continuing half-finished work.
- **Keep an off-site copy.** A backup that only ever lives on the same server it protects is not a
  disaster-recovery backup — if the server is what fails, the backup fails with it. Download copies of your backups and keep them somewhere other than this server.
- **Getting the table prefix right is on you for the manual database import (step 7).** This build
  never touches your database automatically, so nothing checks the prefix for you the way an automatic
  import would — see step 2 above. Import the `.sql` file onto an install whose `$table_prefix` matches
  the one the dump's own table names use.
- **A lost encryption password cannot be recovered by the plugin or by support** — this is stated at
  Section 5.3 and Settings → Security, and it applies here too: back up the password itself somewhere
  safe, separate from the backups it protects.
