# SwissWPSuite AI — User Manual

**Version:** 2.9.15.0
**Last Updated:** March 2026

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard](#2-dashboard)
3. [Security Hub](#3-security-hub)
4. [Backups & Restore](#4-backups--restore)
5. [Site Migration](#5-site-migration)
6. [Content Sync](#6-content-sync)
7. [SEO Manager](#7-seo-manager)
8. [AI Content Enhancer](#8-ai-content-enhancer)
9. [Settings](#9-settings)
10. [Licensing & Tokens](#10-licensing--tokens)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Getting Started

### 1.1 Installation

1. Download the `swisswpsuite-v{VERSION}.zip` file
2. In WordPress Admin, go to **Plugins → Add New → Upload Plugin**
3. Select the ZIP file and click **Install Now**
4. Click **Activate Plugin**

After activation, a new **SwissWPSuite** menu item appears in your WordPress sidebar.

### 1.2 First-Time Setup

When you first open SwissWPSuite, you'll see the **Critical Next Steps** guide on the Dashboard. Follow these steps:

1. **Activate your license** — Enter your license key in Settings → License Manager
2. **Run a security scan** — Navigate to Security Hub and click "Run Sentinel Scan"
3. **Set up backups** — Configure at least a local backup schedule
4. **Enable 2FA** — Protect your admin account with two-factor authentication

### 1.3 Free vs. Pro Features

| Feature | Free | Pro |
|---------|------|-----|
| Basic firewall (WAF) | Always active | Configurable |
| Quick security scan | Available | Available |
| Sentinel Layer 1 scan | Limited quota | Unlimited |
| Sentinel Layer 2 (AI analysis) | Not available | Full access |
| Deep malware scan | Not available | Full access |
| Essential hardening (5 options) | Available | Available |
| Advanced hardening (6 options) | Locked | Full access |
| Geo-blocking | Locked | Full access |
| IP banning | Locked | Full access |
| Quarantine management | Read-only | Full access |
| Local backups | Available | Available |
| Cloud backups (GDrive, S3, etc.) | Not available | Full access |
| Backup automations (scheduling) | Not available | Full access |
| Site migration | Not available | Full access |
| Content sync | Not available | Full access |
| SEO optimization | Not available | Full access |
| AI content rewriting | Not available | Full access |
| Two-factor authentication | Available | Available |

---

## 2. Dashboard

The Dashboard is your command center — it shows a real-time overview of your site's health.

### What You'll See

- **Threats Blocked** — Total number of malicious requests blocked by the firewall this month
- **SEO Health Score** — Your site's overall SEO performance rating (0–100)
- **Last Backup** — When your most recent backup was created
- **Traffic Overview** — A 7-day chart showing visitor activity vs. blocked threats
- **System Info** — Your PHP version, memory limit, and server status

### Actions Available

- **Cache Refresh** — Click the refresh button to clear all cached data (transients). Useful if you notice stale information anywhere in the plugin.

---

## 3. Security Hub

The Security Hub is the heart of SwissWPSuite's protection system. It's organized into six tabs.

### 3.1 Dashboard Tab (Security Overview)

This tab shows six cards summarizing your security posture:

#### Smart Firewall (WAF)
Your Web Application Firewall automatically blocks malicious requests.

- **Free users:** The firewall is always active with basic protection. No configuration needed.
- **Pro users:** You can toggle the firewall on/off, enable/disable SQL injection blocking and XSS blocking individually, and activate **Simulation Mode** (logs threats without blocking — useful for testing).

#### Geo-Lockdown (Pro)
Block or allow access from specific countries.

**How to set up:**
1. Toggle "Geo-Lockdown" ON
2. Choose your mode:
   - **Blocklist** — Block visitors from selected countries (allow everyone else)
   - **Allowlist** — Allow ONLY visitors from selected countries (block everyone else)
3. Search for and select countries in the picker
4. Click **Save**

You can test if a specific IP address would be blocked using the **Test IP** field.

#### Login Safeguard
Protects against brute-force login attacks by limiting failed login attempts.

- **Free users:** Fixed at 3 attempts before temporary lockout
- **Pro users:** Configurable (1–10 attempts)

After the limit is reached, the attacker's IP is temporarily blocked for 30 minutes.

#### File Integrity Monitor
Runs automatically in the background. It compares your WordPress core files against the official checksums from WordPress.org to detect unauthorized modifications.

#### Threats Blocked Counter
Shows how many malicious requests your firewall has blocked this month.

#### System Security Status
Displays your overall security grade (A through F) from the most recent Sentinel scan.

### 3.2 Scan Tab

Three types of scans are available:

#### Quick Core Scan (Free)
- Click **"Run Core Scan"**
- Checks WordPress core files against official checksums
- Reports any modified, missing, or suspicious core files
- Takes 10–30 seconds

#### Deep Malware Scan (Pro)
- Click **"Start Deep Scan"**
- Recursively scans all WordPress files including plugins, themes, and uploads
- Checks for known malware signatures, suspicious filenames, executable files in upload directories, and insecure file permissions
- Takes 1–5 minutes depending on site size
- Shows real-time progress

#### Sentinel Full Scan (Free Limited / Pro Unlimited)
The most comprehensive scan available. It runs in two layers:

**Layer 1 (Deterministic — runs locally):**
- File system audit — malware signatures and core integrity
- Permission audit — checks for world-writable files and dangerous permissions
- Configuration audit — checks for debug mode, exposed log files, backup files
- Environment audit — PHP/WordPress versions, XML-RPC status, user enumeration

**Layer 2 (AI-Powered — Pro only):**
After Layer 1 completes, the results are analyzed by AI to produce:
- **Security Grade** (A through F)
- **Threat Model** — Who might attack you, their likely motivation, and estimated time-to-compromise with and without the plugin
- **Attack Chains** — Realistic step-by-step attack scenarios showing how vulnerabilities could be exploited together
- **Remediation Plan** — Prioritized list of actions to improve your security

**Scan quotas:**
- Free: 1 scan per hour (limited monthly quota)
- Pro: 2 scans per hour (unlimited monthly)

### 3.3 Scan Results

After a scan, results appear in a table with color-coded severity:

| Color | Severity | Meaning |
|-------|----------|---------|
| Red | Critical | Immediate action required — active exploit risk |
| Orange | High | Significant vulnerability — fix soon |
| Amber | Medium | Moderate risk — schedule a fix |
| Blue | Low | Minor issue — fix when convenient |
| Gray | Info | Informational finding — no action needed |

**Actions on each finding:**

- **"Fix Now"** — One-click automatic fix (available for permission issues and similar auto-fixable problems). Fixes the issue immediately.
- **"Manual Fix Guide"** — Opens a step-by-step guide explaining what the issue is, why it's dangerous, and exactly how to fix it manually.
- **"Go to Hardening"** — Redirects you to the Hardening tab where you can enable the relevant protection.

### 3.4 Logs Tab

View a chronological list of security events:
- Firewall blocks (SQL injection attempts, XSS attempts, etc.)
- Failed login attempts
- IP bans and unbans
- Quarantine actions

Each log entry shows the timestamp, IP address, event type, severity, and whether the request was blocked.

**AI Log Analysis (Pro):** Click **"Analyze with AI"** to have the AI review your security logs, identify attack patterns, flag suspicious IP addresses, and suggest actions.

### 3.5 Quarantine Tab

When suspicious files are detected, they can be quarantined (moved to a safe isolated folder).

**What you can do:**
- **View** the list of quarantined files (file name, original location, size, quarantine date)
- **Restore** a file back to its original location (if you determine it's safe)
- **Delete Permanently** a quarantined file (irreversible)
- **Review** a file to see its AI analysis

**Ignored Paths:** If a scan flags a file as suspicious but you know it's safe (a legitimate custom script, for example), you can add it to the Ignored Paths list. It won't appear in future scans.

### 3.6 Hardening Tab

Hardening strengthens your WordPress installation by closing doors that attackers commonly use. Think of it as locking windows and reinforcing walls — each option shuts down a specific way that someone could break in.

SwissWPSuite organizes hardening into three tiers:

1. **Auto-enabled** — One option (Disable File Editor) is turned on automatically when you first install the plugin. You do not need to do anything.
2. **Protect My Site (Essential)** — Five straightforward options that are safe for virtually all websites. Free users have access to all of these.
3. **Advanced Controls (Pro)** — Six powerful options that provide deeper protection but can interfere with certain plugins or site configurations. These require a Pro license.

#### Security Level Presets

If you do not want to choose options one by one, use a preset. Presets are one-click buttons that enable a group of options at once.

| Preset | What It Enables | Best For |
|--------|----------------|----------|
| **Maximum** | All 11 hardening options | Simple sites with no shop, no forms, and full HTTPS |
| **Balanced** | All 5 essential options + safe advanced options | Most websites (recommended) |
| **Compatible** | Only the 5 essential options | Sites with many plugins, shops, or complex setups |

When you open the Hardening tab, a **recommendation card** appears at the top. It scans your installed plugins (WooCommerce, contact form plugins, Jetpack, etc.) and suggests the preset that best fits your site. You can always override the suggestion and pick a different preset or toggle options individually.

#### Protect My Site (Essential) — Free

These five options are safe for nearly every WordPress site.

**1. Block Legacy Remote Access** (`disable_xmlrpc`)

- **What it does:** Closes XML-RPC, an old method that allowed external apps to connect to your site remotely. Attackers abuse it for brute-force login attacks and pingback floods.
- **Who should enable it:** Everyone, unless you use the WordPress mobile app, Jetpack (older versions), or a desktop blogging tool that connects via XML-RPC.
- **Risk level:** Safe for all sites.
- **What might break:** The official WordPress mobile app, Jetpack (older versions that rely on XML-RPC instead of the REST API), and third-party desktop blogging tools like Windows Live Writer.

**2. Disable File Editor** (`disable_file_editor`)

- **What it does:** Removes the built-in code editor from your WordPress dashboard (Appearance > Theme File Editor and Plugins > Plugin File Editor). If an attacker gains admin access, they cannot inject malicious code through the editor.
- **Auto-enabled:** This option is turned on automatically when you first install SwissWPSuite. You can turn it off if needed.
- **Risk level:** Safe for all sites. You can still edit files via FTP, SFTP, or your hosting provider's file manager.
- **What might break:** Nothing. The only thing removed is the in-dashboard code editor, which most site owners should never use anyway.

**3. Prevent Malware in Uploads** (`block_php_uploads`)

- **What it does:** Stops attackers from uploading executable programs disguised as images or documents. It adds a rule to your uploads folder that prevents any program from running inside it.
- **Risk level:** Safe for all sites.
- **What might break:** Nothing under normal use. This only blocks executable code in your media uploads folder, which should only contain images, PDFs, and similar files.
- **Note:** This option only works on Apache and LiteSpeed servers (which covers the vast majority of WordPress hosting). If your server runs Nginx, this rule cannot be applied automatically — ask your hosting provider to add an equivalent Nginx rule.

**4. Hide WordPress Fingerprints** (`hide_wp_version`)

- **What it does:** Hides your WordPress version number from your site's HTML source code, RSS feeds, and scripts. It also blocks public access to `install.php`, `readme.html`, and `license.txt` — files that reveal information about your WordPress setup.
- **Risk level:** Safe for all sites.
- **What might break:** Nothing. Hiding version information is purely defensive — it makes it harder for automated scanners to identify which vulnerabilities your version might have.

**5. Hide Your Username List** (`block_user_enumeration`)

- **What it does:** Prevents automated tools from collecting your site's usernames. Attackers use techniques like querying the REST API user list, scanning author sitemaps, and abusing embed previews to gather usernames for brute-force attacks. This option blocks all three methods.
- **Risk level:** Safe for all sites.
- **What might break:** Nothing for typical sites. If you have a public author directory that visitors browse, the REST API user list will no longer be available to anonymous visitors (logged-in users can still see it).

#### Advanced Controls (Pro)

These six options provide deeper protection but can interfere with certain plugins or site setups. Read the "What might break" section for each one carefully before enabling.

**6. Add Browser Security Rules** (`force_security_headers`) — HIGH RISK

- **What it does:** Sends a set of security headers with every page your site serves. These headers tell visitors' browsers to enforce strict security rules: block your site from being embedded in other websites (X-Frame-Options), prevent HTTPS downgrade for one year (HSTS), restrict cross-origin access (COOP, CORP), and limit browser features like camera and microphone access (Permissions-Policy).
- **Confirmation dialog:** When you toggle this option on, a warning dialog appears explaining the risks and asking you to confirm. You must click "Yes, enable" to proceed.
- **Risk level:** High.
- **What might break:**
  - Sites embedded in other websites via iframes (the X-Frame-Options header blocks this)
  - OAuth login popups for Google, Facebook, or Apple sign-in (the cross-origin headers can block the popup window)
  - HTTP-only subdomains — HSTS forces HTTPS on your entire domain for one year. If any subdomain does not have an SSL certificate, visitors will be locked out of it for up to a year.
- **Who should enable it:** Sites that use HTTPS on all subdomains and do not rely on iframe embedding or OAuth login popups.

**7. Limit What Strangers Can See** (`disable_rest_api_guests`) — HIGH RISK

- **What it does:** Blocks anonymous (not-logged-in) visitors from accessing WordPress data feeds through the REST API. Only logged-in users can query the API.
- **Confirmation dialog:** When you toggle this option on, a warning dialog appears. If the plugin detects installed plugins that are known to require public REST API access, it lists them by name so you can make an informed decision.
- **Risk level:** High.
- **What might break:**
  - WooCommerce checkout (payment processing uses the REST API)
  - Contact form plugins like Ninja Forms, Formidable Forms, and others not in the whitelist
  - BuddyPress and bbPress community features
  - LearnDash course enrollment
  - Headless WordPress setups (where a separate frontend reads content from the API)
  - Any plugin that serves data to visitors who are not logged in
- **Built-in whitelist:** WooCommerce, WPForms, Gravity Forms, Contact Form 7, Elementor, and Jetpack are automatically whitelisted — their REST API routes continue to work even when this option is enabled.
- **Who should enable it:** Simple blogs, portfolio sites, or brochure sites that have no shop, no booking system, and no contact forms.

**8. Hide Author Profile Pages** (`disable_author_archives`)

- **What it does:** Redirects author archive pages (e.g., `yoursite.com/author/admin/`) to your homepage. This prevents attackers from discovering usernames by browsing author pages.
- **Risk level:** Low.
- **What might break:** Multi-author blogs where readers browse articles by writer. If your site has multiple authors and visitors use the author pages to find specific writers' articles, those pages will no longer work.
- **Who should enable it:** Single-author sites, business websites, and any site where author archive pages serve no purpose for visitors.

**9. Block Aggressive Web Crawlers** (`block_bad_bots`)

- **What it does:** Blocks 20 known aggressive web crawlers that consume your server resources without providing value. The blocked list includes bots from Ahrefs, Semrush, Yandex, Baidu, MJ12, DotBot, and others.
- **Risk level:** Low.
- **What might break:**
  - Your own Ahrefs or Semrush site crawl data (if you use these SEO tools to audit your own site, their crawlers will be blocked)
  - Yandex and Baidu search indexing (if you have visitors from Russia or China who find your site through those search engines)
- **Who should enable it:** Most sites. Google and Bing crawlers are NOT affected — your search engine visibility in Western markets is not impacted.

**10. Disable Visitor-Triggered Scheduling** (`disable_wp_cron_public`) — HIGH RISK

- **What it does:** Stops WordPress from running background tasks (like sending emails, running backups, and checking for updates) when a visitor loads a page. It also blocks external access to `wp-cron.php`.
- **Confirmation dialog:** When you toggle this option on, a warning dialog appears explaining that you MUST set up a server-side cron job or all scheduled tasks will stop.
- **Risk level:** High.
- **What might break:** If you do not set up a replacement cron job on your hosting, ALL scheduled tasks stop working. This includes:
  - Email sending (contact form notifications, order confirmations)
  - Backup schedules
  - Subscription renewals and payment processing
  - Plugin and theme auto-updates
  - Any scheduled content publishing
- **Who should enable it:** Only site owners who have access to their hosting control panel's cron job feature (cPanel, Plesk, Hostinger hPanel, etc.).
- **What to do after enabling:** Log in to your hosting control panel and create a cron job that runs every 5 minutes. The command should be: `wget -q -O /dev/null https://yoursite.com/wp-cron.php` (replace `yoursite.com` with your actual domain). Most hosting providers have a "Cron Jobs" section where you can paste this.

**11. Content Source Monitoring** (`enable_csp`)

- **What it does:** Adds a Content-Security-Policy header in **report-only mode**. This means it monitors where your site loads scripts, styles, images, and fonts from, but does not block anything. It is a diagnostic tool, not a protection.
- **Risk level:** Safe for all sites. Because it runs in report-only mode, it will never break anything.
- **What might break:** Nothing. Report-only mode observes and logs but does not interfere.
- **Note:** Reports are only visible in your browser's developer tools (press F12 and look in the Console tab). This option is most useful for developers who want to audit which external services their site connects to.

#### Runtime Conflict Monitor

SwissWPSuite automatically watches for conflicts between your hardening settings and your installed plugins.

**How it works:**

- When you activate a new plugin, SwissWPSuite checks whether it conflicts with any of your currently enabled hardening options.
- If a conflict is detected, a **yellow warning banner** appears at the top of your WordPress admin area. The banner names the specific hardening option you should review and explains why there may be a problem.
- A **daily safety check** runs in the background to catch plugins that were installed via FTP, WP-CLI, or other methods that bypass the normal plugin activation hook.

You do not need to configure the conflict monitor — it runs automatically.

#### Confirmation Dialogs

Three of the advanced options are marked as high risk: **Add Browser Security Rules**, **Limit What Strangers Can See**, and **Disable Visitor-Triggered Scheduling**. When you toggle any of these on, a confirmation dialog appears before the change takes effect.

The dialog explains:
- What the option does in plain language
- Which of your currently installed plugins may be affected (detected automatically)
- What could go wrong if you proceed

You must click "Yes, enable" to confirm. If you click "Cancel," the option stays off and nothing changes.

### 3.7 History Tab

View a timeline of all past Sentinel scans. For each scan, you can see:
- Date and time
- Security grade (A–F)
- Number of threats found
- Whether Layer 2 AI analysis was included

Click **"View"** on any past scan to see its full report. Historical reports are read-only.

### 3.8 IP Management

#### Banning IPs (Pro)
If you notice suspicious activity from a specific IP address:
1. Enter the IP in the "Ban IP" field
2. Click **"Ban"**
3. The IP is permanently blocked from accessing your site

#### Unbanning IPs
If you accidentally ban a legitimate visitor:
1. Find the IP in the "Banned IPs" list
2. Click **"Unban"**

### 3.9 AI File Analysis (Pro)

On any suspicious file found during a scan, click **"Analyze"** for an AI-powered assessment:
- **Risk Level:** Safe, Suspicious, or Malware
- **Explanation:** Why the file was flagged and what it contains
- **Recommended Action:** Delete, quarantine, or ignore

---

## 4. Backups & Restore

### 4.1 Creating a Backup

1. Navigate to **Backups** tab
2. Select your backup scope:
   - **Full** — Database + media files (complete site snapshot)
   - **Database Only** — Posts, settings, configurations
   - **Files Only** — Media uploads
3. Optionally select a cloud destination (Pro)
4. Click **"Create Backup Now"**
5. Wait for the backup to complete (shows a progress indicator)

Backups are saved locally in your WordPress installation. The file will appear in the backup list below.

### 4.2 Managing Backups

Your backup list shows each backup with:
- File name and date
- Size (e.g., "12.4 MB")
- Type badge (Full / DB / Files)
- Whether it was created manually or by automation

**Available actions:**
- **Download** — Save the backup ZIP to your computer
- **Restore** — Restore your site from this backup (see below)
- **Delete** — Remove the backup file permanently

### 4.3 Restoring from a Backup

> **Warning:** Restoring a backup replaces your current site data. A safety snapshot is automatically created before restoration begins.

1. Find the backup you want to restore in the list
2. Click **"Restore"**
3. Confirm in the dialog
4. Wait for the restoration to complete
5. Your browser will reload automatically when done

After restoration, the plugin automatically:
- Re-registers all background tasks
- Restores security settings from the pre-restore snapshot
- Recalculates site identity

### 4.4 Cloud Storage (Pro)

Upload backups to the cloud for off-site protection. Supported providers:

#### Google Drive
1. Go to **Backups → Cloud Storage**
2. Select **Google Drive**
3. Enter your Google Client ID and Client Secret (or use the managed proxy)
4. Click **"Connect"** — you'll be redirected to Google's consent screen
5. Authorize access
6. Once connected, backups can be uploaded to Google Drive automatically

#### Amazon S3
1. Enter your Access Key ID, Secret Access Key, Bucket name, and Region
2. Click **"Save & Test"**
3. Backups will upload to your S3 bucket

#### Dropbox
1. Enter your Dropbox App Key and App Secret
2. Click **"Connect"** — authorize via Dropbox's consent screen

#### FTP/SFTP
1. Enter your Host, Port, Username, Password, and Remote Path
2. Toggle SSL for FTPS
3. Click **"Test Connection"** first, then **"Save"**

#### Backblaze B2
1. Enter your Key ID, Application Key, and Bucket Name
2. Click **"Save & Test"**

### 4.5 Backup Automations (Pro)

Schedule automatic backups that run without intervention.

**Setting up an automation:**
1. Click **"Create Automation"**
2. Configure:
   - **Name** — A descriptive label (e.g., "Daily Full Backup")
   - **Schedule** — Hourly, Twice Daily, Daily, or Weekly
   - **Scope** — Full, Database Only, or Files Only
   - **Destination** — Local, Google Drive, Dropbox, S3, FTP, or Backblaze B2
   - **Retention** — Keep backups for 1–30 days (older backups are automatically deleted)
3. Toggle **"Enabled"** to ON
4. Click **"Save"**

You can create up to **10 automations** per site.

Each automation shows its last run status (Success / Failed / Running), last run time, and next scheduled run.

Click **"Run Now"** on any automation to trigger it immediately outside its schedule.

### 4.6 Safety Snapshots

Before any import or restore operation, the plugin automatically creates a **safety snapshot** containing:
- Your critical WordPress settings (site URL, site name, admin email, etc.)
- All SwissWPSuite plugin settings

This snapshot is used for automatic recovery if anything goes wrong during the import/restore process. You don't need to manage it manually.

---

## 5. Site Migration

Migration transfers your entire WordPress site from one server to another. This is a Pro feature.

### 5.1 What Gets Transferred

| Included | Details |
|----------|---------|
| Database | All posts, pages, comments, settings, users (optional), WooCommerce data |
| Theme files | Your active theme (and parent theme if using a child theme) — optional |
| Media files | All files in `wp-content/uploads/` — optional |
| Page builder data | Elementor, Divi, Beaver Builder layouts — all preserved |
| Categories & Tags | Full taxonomy data |

### 5.2 What Does NOT Get Transferred

| Not Included | Why | What To Do |
|-------------|-----|-----------|
| Plugins | Security: prevents code injection; compatibility unknown on new host | Install and activate plugins on the destination after migration |
| 2FA secrets | Encrypted with server-specific keys; cannot be decrypted on new server | Re-enroll in 2FA on the new site |
| API keys | Tied to server configuration | Re-enter API keys in Settings after migration |
| mu-plugins | Server-specific code | Copy manually via SFTP |
| .htaccess | Server rewrite rules; can break if hosts differ | Let WordPress regenerate it, or copy manually if hosts are identical |
| wp-config.php | Contains database credentials | Server-managed; never transferred |

### 5.3 Step-by-Step Migration

#### On the SOURCE site (where you're migrating FROM):

1. Go to **Backups → Migration**
2. Configure export options:
   - **Include theme files** — Toggle ON to include your active theme
   - **Include media** — Toggle ON to include all uploaded files (images, PDFs, etc.)
   - **Include user accounts** — Toggle ON to include WordPress user accounts
3. Click **"Generate Passport"**
4. Wait for the export to complete
5. Download the **passport JSON file** — this is your migration ticket

#### On the DESTINATION site (where you're migrating TO):

1. Install and activate SwissWPSuite on the new site
2. Activate your Pro license
3. Go to **Backups → Migration**
4. Click **"Upload Passport"** and select the passport file
5. The plugin validates the passport and shows any warnings
6. Review the **Pre-flight Check** results:
   - Disk space available
   - PHP memory available
   - Server load
   - Whether the server is ready for import
7. If the pre-flight passes, click **"Start Migration"**

#### During Migration:

The import proceeds in phases:
1. **Download Phase** — SQL data is downloaded from the source in chunks
2. **Theme Extraction** — Theme files are downloaded and installed (if included)
3. **Media Extraction** — Media files are downloaded and installed (if included)
4. **Database Import** — SQL data is processed and imported into the database

You'll see a real-time progress bar and log output. **Do not close the browser tab** during import.

#### After Migration (Post-Migration Checklist):

A 5-step checklist appears after import completes:

1. **Flush Permalinks** — Go to Settings → Permalinks and click "Save" twice
2. **Clear Cache** — Clear any caching plugin or hosting-level cache
3. **Run Security Scan** — The plugin offers to run an automatic Sentinel audit
4. **Verify Admin Access** — Confirm your user accounts are intact
5. **Install Plugins** — Install and activate all required plugins on the new site

Complete all 5 steps to finalize the migration.

### 5.4 Migration Tips

- **Large sites (> 500 MB):** Migration may take 30–60+ minutes. Be patient.
- **Shared hosting:** The plugin adapts chunk sizes automatically based on your server's speed
- **Same-server migrations:** If both sites are on the same server, the plugin detects this and uses a faster direct file copy method
- **Passport expiry:** The passport token expires after 24 hours. If your import takes longer or you need to retry, generate a new passport.

---

## 6. Content Sync

Content Sync keeps two WordPress sites synchronized. It's designed for staging-to-production workflows, multi-site content distribution, or team collaboration across environments.

### 6.1 Setting Up Sync

**Step 1: Generate a Sync Key on each site**
1. On each site, go to **Settings → Sync**
2. Click **"Generate Sync Key"**
3. Copy the generated key — you'll need it for the next step

**Step 2: Create a Connection**
1. On the SOURCE site, go to **Settings → Sync → Connections**
2. Click **"Add Connection"**
3. Enter:
   - **Name** — A label for this connection (e.g., "Production Site")
   - **URL** — The destination site's full URL
   - **Sync Key** — Paste the DESTINATION site's sync key
4. Click **"Save"**
5. The plugin tests the connection automatically

Repeat on the other site if you want bidirectional sync.

### 6.2 Pushing Content

**Manual Push:**
1. Go to the **Sync** page
2. Select the connection (destination site)
3. Browse your local content (posts, pages, products)
4. Click an item to **inspect** — see a side-by-side comparison with the remote version
5. If satisfied, click **"Push Local Version"** to send it to the destination

**What gets synced per item:**
- Title, content, excerpt, status
- Featured image URL (the image file itself is not transferred)
- Categories, tags, and custom taxonomies
- Post meta (Elementor data, WooCommerce product data, etc.)
- Page builder layouts

### 6.3 Pulling Content

To pull a remote version to your local site:
1. Inspect an item (see both versions)
2. Click **"Pull Remote Version"**
3. The remote version overwrites your local copy

### 6.4 Scheduled Sync (Pro)

Automate sync on a recurring schedule:

1. Go to **Sync → Schedules**
2. Click **"Add Schedule"**
3. Configure:
   - **Connection** — Which site to sync with
   - **Frequency** — Hourly, Daily, or Weekly
   - **Scope** — Which content types to include (Posts, Pages, Products, Templates)
4. Toggle **"Active"**
5. Click **"Save"**

The schedule runs automatically in the background.

### 6.5 What Can Be Synced

| Content Type | Syncable | Notes |
|-------------|----------|-------|
| Posts | Yes | Full content + meta |
| Pages | Yes | Full content + meta |
| WooCommerce Products | Yes | Product data + pricing (stock levels are NOT synced — each site manages inventory independently) |
| FSE Templates | Yes | Block themes: templates and template parts |
| WooCommerce Settings | Yes | Currency, store address, weight/dimension units |
| Blog Name/Description | Yes | Site title and tagline |

### 6.6 What Cannot Be Synced

- **User accounts** — Users must be created manually on each site
- **Media files** — The image URL is synced, but the actual file is not transferred (use Migration for full media transfer)
- **Global Styles** — Blocked to prevent accidentally overwriting an entire site's design system
- **Plugins / Themes** — Cannot be installed via sync
- **Order data** — Contains personal billing information
- **API keys / 2FA secrets** — Security-sensitive data

### 6.7 Conflict Resolution

Sync uses a **last-writer-wins** model:
- **Push** overwrites the remote version with your local version
- **Pull** overwrites your local version with the remote version

There is no automatic merge. When you inspect an item, changed fields are highlighted so you can make an informed decision:
- **Green** = your local version is newer
- **Yellow** = the remote version is newer
- **Gray** = both versions are the same

---

## 7. SEO Manager

The SEO Manager helps optimize your content for search engines using AI.

### 7.1 SEO Audit

1. Go to the **SEO** tab
2. Click **"Run SEO Scan"**
3. View your results:
   - **Overall Score** (0–100)
   - Breakdown by content type (products, posts, pages, images)
   - Number of optimized items vs. items needing improvement
   - Bonus points for FAQ schema

### 7.2 AI Meta Generation (Pro)

For each post, page, or product:
1. Find the item in the SEO list
2. Click **"Optimize"**
3. The AI generates:
   - An optimized **meta title** (SEO-friendly, under 60 characters)
   - An optimized **meta description** (compelling, under 160 characters)
4. **Review the proposal** — you can edit the suggestion before applying
5. Click **"Apply"** to save, or **"Restore"** to revert to the original

### 7.3 Bulk Optimization (Pro)

Optimize many items at once:
1. Filter by content type (Products / Posts / Pages / Images)
2. Select multiple items (or all)
3. Click **"Batch Optimize"**
4. The job runs in the background — you can close the tab
5. Check progress anytime via the status indicator

### 7.4 FAQ Schema (Pro)

Generate structured FAQ data for rich search results:
1. Select a page or post
2. Click **"Generate FAQ"**
3. The AI extracts question-answer pairs from your content
4. Review and edit the generated FAQ
5. Apply to embed FAQ schema markup in the page

### 7.5 Sitemap Generation

The plugin can generate an XML sitemap for your site:
1. Go to **SEO → Sitemap**
2. Click **"Generate Sitemap"**
3. Your sitemap is created at `yoursite.com/sitemap.xml`

### 7.6 LLMs.txt (AI Search Visibility)

Generate a machine-readable summary of your website for AI search engines:
1. Click **"Generate llms.txt"**
2. The AI creates a structured description of your site
3. The file is saved at `yoursite.com/llms.txt`

This helps AI systems (like ChatGPT, Perplexity, etc.) better understand and cite your content.

---

## 8. AI Content Enhancer

Rewrite and improve your existing content using AI.

### 8.1 Selecting Content

1. Go to the **AI Content** tab
2. Choose content type: **Products**, **Posts**, **Pages**, or **Images**
3. Filter by category, status, or search
4. Browse the list of items

### 8.2 Rewriting Content

1. Select an item
2. Choose what to rewrite: **Title**, **Description**, or **Short Description**
3. Select a tone:
   - Professional
   - Casual
   - Technical
   - Friendly
   - (or add custom instructions)
4. Click **"Rewrite"**
5. Review the AI's proposal
6. Edit the proposal if needed
7. Click **"Apply"** to save

### 8.3 Bulk Rewriting

1. Select multiple items
2. Choose field and tone
3. Click **"Bulk Rewrite"**
4. The job processes in the background
5. Review proposals for each item before applying

### 8.4 Undoing Changes

If you're not happy with an AI rewrite:
- Click **"Restore Original"** on any item to revert to the previous version

---

## 9. Settings

### 9.1 General Settings

- **Auto-Update** — Enable or disable automatic plugin updates
- **Email Notifications** — Receive email alerts for security events and backup reports
- **Beta Features** — Opt in to try experimental features before release
- **Server Profile** — Usually "Auto-Detect" is fine. Choose "Standard Hosting" or "VPS" if auto-detect picks the wrong profile.

### 9.2 API Configuration

The AI features connect through SwissWPSuite's secure proxy server. You don't need to manage API keys directly — your license key handles authentication.

- **Test Connection** — Click to verify the AI connection is working
- If the test fails, check your license status and internet connectivity

### 9.3 License Manager

See [Section 10: Licensing & Tokens](#10-licensing--tokens).

### 9.4 Two-Factor Authentication (2FA)

Add an extra layer of security to your WordPress login.

**Setting up 2FA:**
1. Go to **Settings → 2FA**
2. Click **"Set Up 2FA"**
3. Scan the QR code with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, or similar)
4. Enter the 6-digit code from your app to verify
5. **Save your backup codes** — These are emergency codes you can use if you lose access to your authenticator app. Each code can only be used once.

**Disabling 2FA:**
1. Go to **Settings → 2FA**
2. Click **"Disable 2FA"**
3. Enter a valid 2FA code to confirm
4. 2FA is removed from your account

**Regenerating Backup Codes:**
- Click **"Regenerate Backup Codes"** at any time to get a fresh set (this invalidates old codes)

### 9.5 Maintenance

- **System Logs** — View plugin debug logs filtered by level (Info, Warning, Error, Debug)
- **Cache Purge** — Clear all transient data
- **Diagnostics** — View PHP version, memory limits, disk space, database size, cron status, and API connectivity

---

## 10. Licensing & Tokens

### 10.1 Activating Your License

1. Go to **Settings → License Manager**
2. Enter your license key (starts with `sk_live_...`)
3. Click **"Activate"**
4. Your license status updates instantly — no page reload needed

### 10.2 License Tiers

- **Free** — Basic security features, local backups, limited scan quota
- **Pro** — All features unlocked: AI analysis, cloud backups, migration, sync, SEO, content rewriting
- **Enterprise** — Everything in Pro, plus unlimited tokens, custom hardening, and priority support

### 10.3 Token Economy

AI-powered features (Sentinel Layer 2 scans, SEO optimization, content rewriting, file analysis, log analysis) consume **tokens** from your account balance.

- Your current balance is shown in the License Manager
- Tokens are replenished monthly based on your plan
- Token resets are additive (they add to your remaining balance, not replace it)

**Token-consuming actions:**
- Sentinel Layer 2 AI audit: ~50–100 tokens
- SEO meta generation: ~5–10 tokens per item
- Content rewriting: ~10–20 tokens per item
- File analysis: ~10–15 tokens per file
- Log analysis: ~20–30 tokens per analysis

### 10.4 Deactivating Your License

1. Go to **Settings → License Manager**
2. Click **"Deactivate"**
3. Your site reverts to the Free tier
4. All Pro features become locked
5. Existing data (backups, scan history, etc.) is preserved

### 10.5 Trial

If you're on a trial, a yellow banner appears showing your trial status and expiration date. When the trial ends, Pro features lock unless you activate a paid license.

---

## 11. Troubleshooting

### Plugin pages show a blank screen
- Clear your browser cache and reload
- Go to **Settings → Maintenance → Cache Purge** to clear plugin transients
- Check for JavaScript errors in your browser's developer console

### Security scan seems stuck
- Go to **Security → Scan** and click **"Reset Scan"** (if available)
- Wait 5 minutes and try again — the scan may be processing in the background
- Check **Settings → Maintenance → System Logs** for error messages

### Backup fails
- Check **Settings → Maintenance → Diagnostics** for disk space and memory limits
- Ensure your hosting allows PHP to run for at least 120 seconds
- Try a "Database Only" backup first (smaller and faster)

### Migration fails or stalls
- Check the pre-flight results — ensure disk space > 10% free and memory > 50 MB
- If on shared hosting, the plugin automatically adapts chunk sizes. Be patient.
- If the passport has expired (> 24 hours old), generate a new one on the source site
- Check the migration log for specific error messages

### Cloud backup upload fails
- Verify your cloud credentials in **Backups → Cloud Storage**
- Click **"Test Connection"** to verify connectivity
- For Google Drive: Ensure your OAuth tokens haven't expired. Try disconnecting and reconnecting.
- For S3: Verify your bucket name, region, and credentials are correct

### 2FA locked out
- Use one of your **backup codes** to log in
- If you've lost all backup codes, contact your hosting provider to access the WordPress database and disable 2FA manually

### AI features not working
- Verify your license is active (Settings → License Manager)
- Click **"Test Connection"** in API settings
- Check your token balance — AI features require available tokens

### Sync shows "Connection Failed"
- Verify the destination URL is correct and accessible
- Ensure SwissWPSuite is installed and activated on the destination site
- Verify the sync key is correct (regenerate if needed)
- Check that the destination site's REST API is accessible (not blocked by a security plugin)

### Standalone Mode
If you only see the Security tab and nothing else, your site is in **Standalone Mode**. This is set in `wp-config.php` by your administrator. In standalone mode, only Security features are available.

---

## Quick Reference: Keyboard Shortcuts

SwissWPSuite does not currently use keyboard shortcuts. All actions are performed via the web interface.

---

## Support

- **Documentation:** This manual
- **Plugin Updates:** Enable auto-update in Settings → General, or update manually via WordPress Admin → Plugins
- **Contact:** Use the support channels provided with your license

---

*SwissWPSuite AI — Protecting WordPress, Powered by Intelligence.*
