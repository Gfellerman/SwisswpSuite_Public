# SwissSuite AI — Privacy Policy

> **Last Updated:** 2026-10-23
> **Effective Date:** 2026-07-21

---

## Free edition (WordPress.org)

**If you are using the SwissSuite AI plugin published on WordPress.org, this section is the part of this policy that applies to you.** The Free plugin's malware scanning, backup and restore, hardening, firewall, and on-page SEO all run entirely on your own WordPress server. The only thing the Free plugin's code sends anywhere is to **api.wordpress.org**: your WordPress version and site locale (for core-file checksum verification and for a daily check for abandoned/closed plugins), your installed plugin slugs (for that daily check), and your site's address, which WordPress itself adds to the request header. If you configure the optional Email Delivery (SMTP) setting (Settings → General), every e-mail your site sends through WordPress, not only this plugin's, is handed to the SMTP server you specify. The plugin also sends e-mail from your own site to the alert address you set (otherwise the WordPress administrator address): security alerts and warning digests, the daily scan report when you switch it on (to the address set for it on the Security page, otherwise the administrator address), a message about every restore started on your site that fails, is refused by its integrity check, stops before finishing, or may not have applied the whole backup, and a message when a backup fails (the same problem at most once an hour, and at most five backup and security alert e-mails a day). The restore and backup-failure messages are service notices about your site's own backups, so they are sent even when e-mail notifications are switched off. They contain no advertising. These e-mails go through your site's own mail function (or the SMTP server you configured) and are not sent to us. That is everything — the Free plugin makes no AI calls, uses no license server, has no account, and does not use a payment processor. See `readme.txt`'s `== External Services ==` section for the complete, authoritative statement of what the Free plugin transmits.

Everything else in this document — AI processing, licensing and payment data, third-party AI/payment sub-processors, domain-lock and account data — describes **SwissSuite AI Pro**, a separately distributed paid package available at swisswpsecure.com, and the swisswpsecure.com website and its cloud service. None of it applies to the Free plugin, except the parts of sections 3.5 and 9 that name a feature the Free plugin has, the "Encryption at rest" point of section 10, and sections 1, 8 and 13 (who we are, your rights, how to contact us), which also cover support e-mail.

**Support e-mail.** If you write to support@swisswpsecure.com, we use your e-mail address and your message only to answer you. If you attach a file, such as a Self-Check diagnostics export, we use it only to answer you and keep it with your message; it may be processed by the same AI service provider as your message, and it is never passed to the messaging service. Common questions may be answered automatically with the help of an AI service; such replies say so. Anything an automatic reply does not resolve is handled by a person. Your message is stored by our e-mail hosting provider (Hostinger) and may be processed by an AI service provider and, for internal notifications to our staff, by a messaging service (Telegram). Where a provider is outside Switzerland or the EU, the transfer is covered by Standard Contractual Clauses or an adequacy decision. We keep support e-mails for 12 months after our last reply, unless they are needed for a legal claim. Legal basis: our legitimate interest in answering you (GDPR Art. 6(1)(f); nDSG Art. 31(1)).

---

## 1. Who We Are

**SwissWPSecure Sàrl** ("we", "us", "SwissWPSecure") operates the SwissSuite AI WordPress plugin and the associated cloud service at swisswpsecure.com.

**Registered office:** Le Moulin 3, 1312 Éclépens, Switzerland
**Data Protection Contact:** support@swisswpsecure.com
**Swiss Supervisory Authority:** Federal Data Protection and Information Commissioner (FDPIC), Feldeggweg 1, 3003 Bern, Switzerland

## 2. Scope

This Privacy Policy covers:

- **swisswpsecure.com** — Our website and cloud service API.
- **SwissSuite AI Plugin** — Data processing that involves our servers (license validation, AI features, security scanning).

This Privacy Policy does **not** cover data that the Plugin processes entirely on your WordPress server without contacting our Service (e.g., local WAF, local backups, login protection). For those local features, you — the site owner — are the data controller, and your own privacy policy applies.

For your own account, billing, and license data, SwissWPSecure Sàrl is the **data controller** and this Privacy Policy applies. For personal data of your site's visitors that reaches our Service only through a feature you actively use (for example, content submitted to AI features), SwissWPSecure Sàrl acts as your **data processor** under our Data Processing Agreement, and you are the controller.

## 3. Data We Collect

### 3.1 Account and License Data

| Data | Purpose | Legal Basis | Retention |
|------|---------|-------------|-----------|
| Email address | Account identification, billing, support communication | Contract (GDPR Art. 6(1)(b)) | Duration of account + 30 days |
| License key | Service authentication and authorization | Contract | Duration of account + 30 days |
| Site domain | License domain lock, service delivery | Contract | Duration of account + 30 days |
| Plan type and subscription status | Service tier determination | Contract | Duration of account + 30 days |

### 3.2 AI Processing Data

| Data | Purpose | Legal Basis | Retention |
|------|---------|-------------|-----------|
| Content submitted to AI features (titles, descriptions, post bodies) | Generate AI-powered SEO meta, FAQ, content rewrites | Contract | Not retained after processing. Forwarded to AI sub-processor and discarded upon response. |
| Token usage logs (action type, token amount, timestamp) | Billing audit trail, usage tracking | Contract + Legal obligation (Swiss OR Art. 958f) | **10 years (Swiss OR Art. 958f), then deleted** |

### 3.3 Security Scanning Data

| Data | Purpose | Legal Basis | Retention |
|------|---------|-------------|-----------|
| Sentinel Layer 1 scan findings (structural metadata, no PII) | AI-powered security analysis (Layer 2) | Contract | Cached 24 hours, then deleted |
| Site environment snapshot (PHP version, plugin list, configuration flags) | Security risk assessment | Contract | Cached 24 hours, then deleted |
| Summary of up to 50 recent high- and critical-severity firewall log entries (threat type, severity, time; no IP address or username), paid plugin only | Automatic threat assessment, twice a day | Contract | As for content submitted to AI features (section 3.2) |

### 3.4 Payment Data

| Data | Purpose | Legal Basis | Retention |
|------|---------|-------------|-----------|
| Payment card details | Payment processing | Contract | NOT stored by us. Processed by Stripe, Inc. |
| Invoice data (name, email, address, amount) | Tax compliance, accounting | Legal obligation (Swiss OR Art. 958f) | 10 years (legal requirement) |
| Stripe customer ID | Link payment records to account | Contract | Duration of account + 30 days |
| A hashed identifier derived from your payment card, your normalised email address, and your site domain | Preventing repeated abuse of our refund/goodwill policy and fraudulent purchases; enforcing the one-refund limit in our Terms | Legitimate interest (GDPR Art. 6(1)(f)); nDSG Art. 31(1) | Retained for 24 months from your last purchase, then deleted |

### 3.5 Data Processed by the Plugin on Your Server

The following data is processed by the Plugin on **your** WordPress server. We do not receive this data unless you use a feature that transmits it (noted below):

| Data | Feature | Transmitted to Our Service? |
|------|---------|---------------------------|
| Visitor IP addresses | WAF, login protection, geo-blocking, IP banning | **No** (processed locally; in the paid plugin, when a site administrator asks for an AI analysis of the security log, the IP addresses of up to 50 of its most recent entries and the list of manually banned IP addresses are sent to our AI service, or to the AI provider a site administrator chose) |
| Visitor country (from IP) | Geo-blocking | IP sent to ipwho.is for lookup (see the note below this table) |
| Geo-block log (IP address, country, requested address and browser identification string of each blocked visit; at most the 100 most recent, each deleted automatically after 90 days) | Geo-blocking | **No** (stored locally; deleted when the last copy of the plugin is uninstalled) |
| Security logs (IP address, threat type, severity, whether the request was blocked, time; for failed logins, the username that was tried) | Security logging | **No** (stored locally, deleted automatically after 90 days; a separate 15-minute lockout timer is unrelated to this log-row retention period). In the paid plugin, when the site's plan includes the AI security features, a summary of up to 50 recent high- and critical-severity entries (threat type, severity, time; no IP address or username) is sent twice a day to our AI service, or to the AI provider a site administrator chose, for an automatic threat assessment (see section 3.3); and when a site administrator asks for an AI analysis of the log, the entries sent include IP addresses and the usernames that were tried |
| 2FA TOTP secrets | Two-factor authentication | **No** (encrypted, stored locally in user meta) |
| Backup archives (database, themes, media) | Cloud backup upload | Sent to **your** cloud provider (Google Drive, Dropbox, S3, B2, or FTP server) |
| Full database (migration/sync) | Site migration, staging sync | Sent directly to **your** destination site |
| Geo-bypass cookie (`swisswpsuite_geo_bypass`) | Geo-blocking bypass | **No** (set on visitor's browser, 1 hour, HttpOnly, Secure on HTTPS sites) |
| Restore-failure e-mail (site name and address, backup file or set name, attempt id, and an error code and counts where they apply, up to three recent log lines of the same kind with recognised paths and system details removed) | Restore | **No** (sent by your own site's mail function to the alert address you set, otherwise the administrator address, or through the SMTP server you configured) |
| Backup-failure e-mail (site name and address, time, reason, up to three recent log lines of the same kind with recognised paths and system details removed) | Backup | **No** (sent by your own site's mail function to the alert address you set, otherwise the administrator address, or through the SMTP server you configured) |
| Self-Check diagnostics export (check results, WordPress version, names of relevant software such as your caching plugin, and the last 100 log lines with the e-mail addresses, IP addresses, site address, usernames, server paths and keys that the plugin recognises removed; those lines can still contain personal data the plugin did not recognise; outside those lines, no e-mail address, site address, IP address, username or stored key, but the file name carries the site's domain name; check the file before you share it) | Settings → Diagnostics → Self-Check | **No** (created on your request and downloaded to your computer; it reaches us only if you choose to send it to support@swisswpsecure.com) |
| Admin UI preferences | Theme, sidebar state, dismissed notices | **No** (localStorage, admin browsers only) |
| Admin-side JS error diagnostics (message, script source, line/column, stack trace) | Frontend error logging (Settings → Maintenance → System Logs) | **No** (stored locally in the Plugin's own debug log; visible only to site administrators) |

The IP geolocation lookup (ipwho.is) is performed by the Plugin from your own server when you enable geo-blocking; **you are the controller for that lookup and ipwho.is is your service provider, not ours.**

## 4. How We Use Your Data

We use the data collected for the following purposes only:

1. **Service delivery** — Validating your license, processing AI requests, delivering security scan results.
2. **Billing and accounting** — Processing payments, generating invoices, maintaining tax records.
3. **Service improvement** — Aggregated, anonymized usage statistics (e.g., total API calls per day). We do NOT analyze individual user content.
4. **Security** — Detecting and preventing abuse, unauthorized access, and fraud.
5. **Communication** — Sending service-related notifications (billing confirmations, security alerts, Terms updates). We do not send marketing emails without your explicit opt-in.

## 5. Legal Bases for Processing

| Purpose | Legal Basis (GDPR) | Legal Basis (Swiss nDSG) |
|---------|-------------------|-------------------------|
| License validation and service delivery | Art. 6(1)(b) — Contract performance | Art. 6(3) — Proportionate to purpose |
| AI content processing | Art. 6(1)(b) — Contract performance | Art. 6(3) |
| Payment and invoicing | Art. 6(1)(b) — Contract + Art. 6(1)(c) — Legal obligation | Art. 6(3) + OR Art. 958f |
| Token usage audit trail | Art. 6(1)(c) — Legal obligation | OR Art. 958f |
| Fraud and abuse prevention (including refund-abuse) | Art. 6(1)(f) — Legitimate interest in securing the Service and preventing fraud and refund abuse | Art. 31(1) nDSG |

## 6. Third-Party Services (Sub-Processors)

We use the following third-party services to deliver the Service:

| Service | Purpose | Data Shared | Location | DPA Status |
|---------|---------|-------------|----------|------------|
| **Groq LLC** | AI language model processing | Content submitted to AI features | USA | Groq DPA available (request via support@groq.com); transfers under Standard Contractual Clauses (GDPR Art. 46(2)(c)) |
| **Mistral AI SAS** | AI vision/multimodal processing (image alt-text generation) | Images and their post context submitted to the AI image-SEO feature | France (EU) | Mistral DPA available; as an EU-based processor there is no transfer of EU/EEA data to a third country, and Swiss transfers rely on the EU adequacy decision — a more favourable transfer position than our US processors |
| **Stripe, Inc.** | Payment processing | Payment card data, email, amount | USA | Stripe DPA available |

**Cloud backup providers** (Google Drive, Dropbox, AWS S3, Backblaze B2, FTP servers) are configured by you and operate under your own agreements with those providers. We facilitate the connection but do not receive or store your backup data.

### International Transfers

When data is transferred from Switzerland or the EU/EEA to the United States, we rely on:

- The EU-US Data Privacy Framework (DPF) where the recipient is DPF-certified, OR
- The Swiss-US Data Privacy Framework where applicable, OR
- Standard Contractual Clauses (SCCs) as adopted by the European Commission and recognized by the Swiss FDPIC.

A copy of the safeguards (e.g. the Standard Contractual Clauses) is available on request.

## 7. Data Retention

| Data Category | Retention Period | Deletion Method |
|---------------|-----------------|-----------------|
| Account data (email, license key, domain) | Account duration + 30 days after deletion | Automated purge |
| AI content submitted for processing | Not retained (processed and discarded) | N/A |
| Sentinel scan cache | 24 hours | Automated purge |
| Token usage logs | 10 years (Swiss OR Art. 958f) | Automated purge after retention period |
| Invoice records | 10 years (Swiss OR Art. 958f) | Manual purge after retention period |
| Payment data (Stripe) | Per Stripe's retention policy | Managed by Stripe |

## 8. Your Rights

Depending on your jurisdiction, you have the following rights:

### Under GDPR (EU/EEA) and Swiss nDSG:

- **Right of Access** (GDPR Art. 15 / nDSG Art. 25) — Request a copy of your personal data.
- **Right to Rectification** (GDPR Art. 16 / nDSG Art. 32) — Request correction of inaccurate data.
- **Right to Erasure** (GDPR Art. 17 / nDSG Art. 32) — Request deletion of your data, subject to legal retention obligations.
- **Right to Restriction** (GDPR Art. 18) — Request that we limit processing of your data.
- **Right to Data Portability** (GDPR Art. 20) — Request your data in a structured, machine-readable format.
- **Right to Object** (GDPR Art. 21 / nDSG Art. 32) — Object to processing based on legitimate interest.
- **Right to Withdraw Consent** — Where processing is based on consent, you may withdraw it at any time.
- **Right to lodge a complaint.** You have the right to lodge a complaint with a data-protection supervisory authority. If you are in the EU/EEA, this is the authority in your country of residence, place of work, or the place of the alleged infringement. If you are in Switzerland, you may contact the Federal Data Protection and Information Commissioner (FDPIC), Feldeggweg 1, 3003 Bern. If you are in the United Kingdom, you may contact the Information Commissioner's Office (ICO). Exercising this right does not affect any other legal remedy available to you.

### Under CCPA/CPRA (California):

- **Right to Know** — Request what personal information we collect, use, and disclose.
- **Right to Delete** — Request deletion of your personal information.
- **Right to Opt-Out** — We do not "sell" or "share" personal information as defined by CCPA.

**Fraud and refund-abuse prevention.** We may flag an account showing patterns consistent with refund abuse for review. Any decision to warn you, restrict future paid purchases, or refuse service is taken by a member of our staff — **not solely by automated means** — and you may contest it by contacting us. We use the hashed identifier described in Section 3 only to enforce our Terms and prevent fraud, never for advertising.

**Providing your data.** Providing your email address and site domain is necessary to enter into and perform the subscription; without it we cannot provide paid features.

### How to Exercise Your Rights

Contact us at support@swisswpsecure.com. We will respond within **one month** (GDPR, extendable by two further months where necessary) or 45 days (CCPA). We may request identity verification before processing your request.

### Limitation

We cannot delete data that we are legally required to retain (e.g., invoices under Swiss commercial law). In such cases, we will delete all data not subject to a retention obligation and inform you of the specific limitation.

## 9. Cookies and Client-Side Storage

### Cookies Set by the Plugin

| Cookie | Purpose | Duration | Set On | Classification |
|--------|---------|----------|--------|---------------|
| `swisswpsuite_geo_bypass` | Allows a geo-blocked visitor to bypass country restriction with a valid token | 1 hour | Visitor browsers (when geo-blocking bypass is used) | Strictly necessary |

The firewall in the paid plugin also reads the values of cookies that a visitor's browser already sends with a request, only to compare them in memory against known attack patterns; these values are never stored, logged or transmitted. The Free plugin's firewall does not read cookies.

### Browser Storage (Admin Only)

The Plugin uses localStorage and sessionStorage in the WordPress admin panel for UI state (theme preference, sidebar position, dismissed notices, the result of the last restore, the time of the last test e-mail, and, in the paid plugin, the reference of an AI batch job still running). These are strictly necessary for the Plugin's admin interface and are not used for tracking.

### No Tracking

We do not use cookies, pixels, or any other technology to track visitors across sites. We do not use Google Analytics, Facebook Pixel, or any third-party analytics on your WordPress site. An optional local pageview counter (Settings → General → General Preferences → Dashboard Traffic Counter) is off by default; when an administrator turns it on, it records only an aggregate date, page type, and count in your own site's database, with no IP address, cookie, or other visitor-identifying data captured, and this data is never transmitted anywhere.

## 10. Security Measures

We implement appropriate technical and organizational measures to protect your data:

- **Encryption in transit:** All communication with our Service uses TLS 1.2+.
- **Encryption at rest:** Sensitive credentials (API keys, SMTP and cloud-storage passwords) are encrypted using a key the plugin generates and stores in your site's own database, alongside the data it protects. Anyone with direct access to that database (e.g., a hosting-account compromise) could read the encryption key and, with it, the protected credentials; this is a trade-off of self-hosted key storage.
- **Access control:** VPS access restricted to authorized personnel. Database credentials stored in environment variables.
- **Data minimization:** We collect only what is necessary for service delivery.
- **Breach response:** We maintain an incident response plan. In the event of a data breach, we will notify the FDPIC and affected users in accordance with GDPR Art. 33-34 and Swiss nDSG Art. 24.

## 11. Children's Privacy

The Service is not directed at children under 16. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact support@swisswpsecure.com.

## 12. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. Material changes will be communicated by email at least 30 days before taking effect. The "Last Updated" date at the top reflects the most recent revision.

## 13. Contact

SwissWPSecure Sàrl
Le Moulin 3, 1312 Éclépens, Switzerland

Data Protection Contact: support@swisswpsecure.com
General inquiries: support@swisswpsecure.com
Website: https://swisswpsecure.com

---

*This document was last reviewed on 2026-07-21.*
