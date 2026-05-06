# SwissWPSuite - The Ultimate All-in-One WordPress Plugin

**Version:** 2.9.28.72
**Requires WordPress:** 5.6+
**Tested up to:** 6.7
**Requires PHP:** 7.4+
**License:** GPL-2.0-or-later
**License URI:** https://www.gnu.org/licenses/gpl-2.0.html

SwissWPSuite is a comprehensive WordPress toolkit powered by Groq AI, combining Security, Backup, SEO, and Site Synchronization into a single, high-performance plugin.

## Features

### Sentinel Security
- **AI Malware Scanning:** Detects malicious patterns using Groq AI (Free: Heuristic Only / Paid: Full AI Analysis).
- **Hardening:** One-click fixes for XML-RPC, File Editing, and more (11 hardening options).
- **Web Application Firewall (WAF):** Basic free / Advanced tiered.
- **Access Control:** Two-Factor Authentication (TOTP) and Geo-Blocking.
- **Environment Aware:** Auto-tunes settings for your host.

### Backup "Fortress"
- **Hybrid Engine:** Uses system `zip` for speed, falls back to PHP for compatibility.
- **Cloud Vault:** Store backups on AWS S3 or Google Drive.
- **Automation:** Set daily, weekly, or monthly schedules with auto-pruning.
- **Restore:** Integrated one-click restoration.

### Sync "Teleport"
- **Site-to-Site Sync:** Push Products, Posts, and Media directly between Staging and Production.
- **Encrypted:** Uses HMAC signatures and HTTPS for secure transport.
- **Smart Diff:** Compare content before syncing to prevent overwrites.

### Migration Station
- **Mode A:** Site-to-site migration via plugin on both ends.
- **Mode B:** Standalone receiver for migrating to empty/broken destinations.
- **Serialization-safe:** Single-pass domain replacement that preserves serialized data integrity.

### AI SEO & Content
- **SEO Auditor:** Bulk meta optimization, keyword analysis, readability scoring.
- **Content Enhancer:** Rewrite and enhance content using Groq AI.
- **Vision AI:** Auto-generate Alt Text for images.
- **llms.txt:** Auto-generates context files for AI crawlers.

## Licensing & Tiers

SwissWPSuite operates on a tiered licensing model. The core plugin is free, with advanced features unlocked by your license key.

| Tier | Key Features |
| :--- | :--- |
| **Free** | Daily Auto-Scan, Basic Threat Blocking, 5 Hardening Options |
| **Security** | Smart WAF, Deep AI Audit, Unlimited Scans, All 11 Hardening Options |
| **Content SEO** | AI Meta Optimization, Vision AI, Full Sentinel Security |
| **Enhancer** | AI Content Rewriter, Tone Customization, Full Sentinel Security |
| **Backup** | Cloud Backups, Site Sync, Migration, Full Sentinel Security |
| **Full Suite** | **All Features Unlocked** |

Paid plans include an AI Token allowance for generative features (Rewriting, Analysis). Track your usage in the "License & Tokens" dashboard.

## Installation

1. Download the latest `swisswpsuite-v{VERSION}.zip` from Releases.
2. In WordPress Admin, go to **Plugins > Add New > Upload Plugin**.
3. Upload the zip file and click **Install Now**.
4. Activate the plugin.
5. Navigate to **SwissWPSuite > License & Tokens** and enter your License Key.

## Requirements

- WordPress 5.6 or higher
- PHP 7.4 or higher
- HTTPS recommended for all security features

## External Services

This plugin connects to the following external services when specific features are activated:

| Service | When | Data Sent |
|---------|------|-----------|
| SwissWPSecure API (`swisswpsecure.com`) | License validation, AI features, Sentinel L2 scanning | License key, site URL, scan data (for AI analysis) |
| Groq AI (via SwissWPSecure proxy) | AI content generation, malware analysis | Content snippets, file hashes |

No data is sent without user-initiated action. See [PRIVACY_POLICY.md](PRIVACY_POLICY.md) for full details.

## Support

- Website: [https://www.swisswpsecure.com](https://www.swisswpsecure.com)
- Support: [https://www.swisswpsecure.com](https://www.swisswpsecure.com)
- Email: info@swisswpsecure.com

## License

This plugin is free software; you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation; either version 2 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the [GNU General Public License](LICENSE) for more details.

Copyright 2026 Swisswpsecure Team.
