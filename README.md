# SwissSuite AI - WordPress Security & Backup Plugin

**Version:** 2.9.33.15
**Requires WordPress:** 6.2+
**Tested up to:** 7.0
**Requires PHP:** 7.4+
**License:** GPL-2.0-or-later
**License URI:** https://www.gnu.org/licenses/gpl-2.0.html

SwissSuite AI ships as two separate, independently distributed plugins built from one codebase:

| Edition | Slug | Where to get it | What it is |
| :--- | :--- | :--- | :--- |
| **SwissSuite AI** (Free) | `swisssuite-ai` | WordPress.org | The security & backup core, standalone and fully functional on its own |
| **SwissSuite AI Pro** | `swisssuite-ai-pro` | https://www.swisswpsecure.com/products/ (download-only) | A standalone superset — cloud backup, AI, sync, migration, and more |

Pro is **not an add-on or unlock** for the Free plugin — it is installed in place of it. The premium and AI code is physically absent from the Free package; there is nothing in Free to "unlock" with a key, and Free has no license field at all.

## Features

### SwissSuite AI (Free)

- **Malware scanner** — local signature-based scanning, on-demand and daily, entirely on your own server; no file contents ever leave your site
- **Malware quarantine** — isolate suspicious files locally before removing them
- **Web Application Firewall** — blocks SQL injection, XSS, and path-traversal attempts, with IP ban/unban/allowlist and a threat log
- **Hardening** — all one-click hardening toggles (XML-RPC, file editing, user enumeration, REST API restrictions, and more), plus Security Level presets
- **Login protection** — brute-force lockout and honeypot spam blocking
- **Backup & restore** — full site backup (files + database) and one-click restore of your site files, run on demand. This version's restore never modifies your database.
- **SEO** — on-page audit and score, plus XML sitemap generation, all computed locally
- **Dashboard** — security dashboard, threat log, and a daily email security report

Free does no AI processing, makes no AI calls, and does not phone home on install. See [PRIVACY_POLICY.md](PRIVACY_POLICY.md) and the External Services section below.

### SwissSuite AI Pro (adds, on top of everything in Free)

- **Scheduled, automated backups** with rolling retention, plus cloud destinations — Google Drive, Amazon S3, Backblaze B2, Dropbox, and FTP/SFTP
- **Two-Factor Authentication (TOTP)** for every user role
- **Geo-blocking** with country-level allow/deny rules
- **Advanced firewall** — IP reputation and rate limiting on top of the Free WAF
- **Site sync** — two-way content sync between staging and production
- **Migration** — plugin-to-plugin and standalone-receiver modes, tuned for shared hosting
- **Update-guard suite** — safe updates with automatic rollback and pre-update snapshots
- **AI features** (Groq-powered) — deep malware analysis, AI SEO meta generation, vision AI for image alt text, and AI content rewriting
- **Vulnerability lookups** via WPScan and Patchstack (bring your own API key)

## Installation

1. Choose your edition: Free from WordPress.org, or Pro from https://www.swisswpsecure.com/products/ .
2. In WordPress Admin, go to **Plugins > Add New > Upload Plugin** (or install the Free edition directly from the WordPress.org directory).
3. Upload the zip file and click **Install Now**.
4. Activate the plugin.
5. Free: no account or license key is required — run your first scan from **Security > Scan**. Pro: open **License & Tokens** to activate your license key.

Free and Pro cannot be active at the same time — activating one automatically deactivates the other, since they share the same underlying data.

## Requirements

- WordPress 6.2 or higher
- PHP 7.4 or higher
- HTTPS recommended for all security features

## External Services

This plugin connects to the following external services when specific features are activated:

| Service | Edition | When | Data Sent |
|---------|---------|------|-----------|
| WordPress.org | Free & Pro | Plugin update checks, core-file checksum verification during a scan, daily check for closed/abandoned plugins | Site URL, plugin/theme list |
| SwissWPSecure API (`swisswpsecure.com`) | Pro only | License validation, AI features, Sentinel L2 scanning | License key, site URL, scan data (for AI analysis) |
| Groq AI (via SwissWPSecure proxy) | Pro only | AI content generation, malware analysis | Content snippets, file hashes |
| ipwho.is | Pro only | Geo-Lockdown country lookup, when enabled | Visitor IP address |

No data is sent without user-initiated action. The Free edition makes none of the Pro-only calls above — see [PRIVACY_POLICY.md](PRIVACY_POLICY.md) for full details.

## Support

- Website: [https://www.swisswpsecure.com](https://www.swisswpsecure.com)
- Support: [https://www.swisswpsecure.com](https://www.swisswpsecure.com)
- Email: info@swisswpsecure.com

## License

This plugin is free software; you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation; either version 2 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the [GNU General Public License](LICENSE) for more details.

Copyright 2026 Swisswpsecure Team.
