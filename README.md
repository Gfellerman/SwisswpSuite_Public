# SwissSuite AI - WordPress Security & Backup Plugin

**Version:** 2.9.33.58
**Requires WordPress:** 6.3+
**Tested up to:** 7.1
**Requires PHP:** 7.4+
**License:** GPL-2.0-or-later
**License URI:** https://www.gnu.org/licenses/gpl-2.0.html

SwissSuite AI is a local WordPress security and backup core: malware scanning, a firewall, hardening, backup and restore, quarantine, login protection, and on-page SEO. No account required, no AI.

## Features

- **Malware scanner** — local signature-based scanning, on-demand and daily, entirely on your own server; no file contents ever leave your site
- **Malware quarantine** — isolate suspicious files locally before removing them
- **Web Application Firewall** — starts in observe (simulation) mode on install so it never blocks legitimate traffic by surprise; enable active blocking any time in Security > Firewall. Covers SQL injection, XSS, and path-traversal attempts, with IP ban/unban/allowlist and a threat log
- **Hardening** — 12 one-click hardening toggles (XML-RPC, file editing, user enumeration, REST API restrictions, and more), plus a Security Level preset
- **Login protection** — brute-force lockout and honeypot spam blocking
- **Backup & restore** — full site backup (files + database) and one-click restore of your site files and database, including AES-256-encrypted archives, run on demand. A safety copy of your current database is taken before the restore touches anything. Optional WP-CLI commands for hosts with real cron access
- **SEO** — on-page audit and score, plus XML sitemap and optional llms.txt generation, all computed locally
- **Dashboard** — security dashboard, threat log, and a daily email security report

A separately distributed paid package with additional features is available at https://swisswpsecure.com/products/; this repository, and everything below, describes only the plugin published on WordPress.org.

## Installation

1. In WordPress Admin, go to **Plugins > Add New**, search for **SwissSuite AI**, and click **Install Now**.
2. Activate the plugin.
3. No account or key of any kind is required — run your first scan from **Security > Scan**.

## Requirements

- WordPress 6.3 or higher
- PHP 7.4 or higher
- HTTPS recommended for all security features

## Building from source

The complete, uncompiled source for the admin UI (React/TypeScript) is published in this repository at [`plugin-src/`](plugin-src/), with build instructions in [`plugin-src/BUILDING.md`](plugin-src/BUILDING.md). The plugin's PHP is not published separately here because it ships unminified inside the plugin itself — download it from WordPress.org, or read it in any installed copy.

## Get the plugin

SwissSuite AI is intended for listing on the WordPress.org Plugin Directory; there is no separate download link for it. To report an issue with this repository or its published source, use [GitHub Issues](https://github.com/Gfellerman/SwisswpSuite_Public/issues).

## External Services

This plugin's code connects to exactly one external service:

| Service | When | Data Sent |
|---------|------|-----------|
| WordPress.org | Plugin update checks (standard WordPress behavior); a daily core-file checksum verification; a daily check for closed/abandoned plugins | Your WordPress version and site locale (checksum requests), and your installed plugin slugs (update checks, abandoned-plugin check) |

That is the only host this plugin's code can reach. It does not phone home to any server operated by its developer, does not require an account or a key of any kind, and does not send site content or visitor data anywhere. See [PRIVACY_POLICY.md](PRIVACY_POLICY.md) and `readme.txt`'s `== External Services ==` section for full details.

## Third-party licenses

The admin UI compiles several MIT/ISC-licensed open-source libraries into its bundle. See [THIRD-PARTY-LICENSES.md](THIRD-PARTY-LICENSES.md) for the full list and notices.

## Support

- Website: [https://www.swisswpsecure.com](https://www.swisswpsecure.com)
- Support: [https://www.swisswpsecure.com](https://www.swisswpsecure.com)
- Email: info@swisswpsecure.com

## License

This plugin is free software; you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation; either version 2 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the [GNU General Public License](LICENSE) for more details.

Copyright 2026 Swisswpsecure Team.
