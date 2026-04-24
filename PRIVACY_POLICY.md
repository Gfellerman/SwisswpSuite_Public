# SwissWPSuite AI — Privacy Policy

> **Last Updated:** 2026-04-24
> **Effective Date:** 2026-04-24

---

## 1. Who We Are

Swisswpsecure ("we", "us", "SwissWPSuite") operates the SwissWPSuite AI WordPress plugin and the associated cloud service at swisswpsecure.com.

**Registered office:** Le Moulin 3, 1312 Eclepens, Switzerland
**Data Protection Officer:** support@swisswpsecure.com
**Supervisory Authority:** Federal Data Protection and Information Commissioner (FDPIC), Feldeggweg 1, 3003 Bern, Switzerland

## 2. Scope

This Privacy Policy covers:

- **swisswpsecure.com** — Our website and cloud service API.
- **SwissWPSuite AI Plugin** — Data processing that involves our servers (license validation, AI features, security scanning).

This Privacy Policy does **not** cover data that the Plugin processes entirely on your WordPress server without contacting our Service (e.g., local WAF, local backups, login protection). For those local features, you — the site owner — are the data controller, and your own privacy policy applies.

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
| Token usage logs (action type, token amount, timestamp) | Billing audit trail, usage tracking | Contract + Legal obligation (Swiss OR Art. 958f) | Permanent (audit trail) |

### 3.3 Security Scanning Data

| Data | Purpose | Legal Basis | Retention |
|------|---------|-------------|-----------|
| Sentinel Layer 1 scan findings (structural metadata, no PII) | AI-powered security analysis (Layer 2) | Contract | Cached 24 hours, then deleted |
| Site environment snapshot (PHP version, plugin list, configuration flags) | Security risk assessment | Contract | Cached 24 hours, then deleted |

### 3.4 Payment Data

| Data | Purpose | Legal Basis | Retention |
|------|---------|-------------|-----------|
| Payment card details | Payment processing | Contract | NOT stored by us. Processed by Stripe, Inc. |
| Invoice data (name, email, address, amount) | Tax compliance, accounting | Legal obligation (Swiss OR Art. 958f) | 10 years (legal requirement) |
| Stripe customer ID | Link payment records to account | Contract | Duration of account + 30 days |

### 3.5 Data Processed by the Plugin on Your Server

The following data is processed by the Plugin on **your** WordPress server. We do not receive this data unless you use a feature that transmits it (noted below):

| Data | Feature | Transmitted to Our Service? |
|------|---------|---------------------------|
| Visitor IP addresses | WAF, login protection, geo-blocking, IP banning | **No** (processed locally) |
| Visitor country (from IP) | Geo-blocking | IP sent to ipwho.is for lookup (see Section 6) |
| Security logs (IP, request URI, threat type) | Security logging | **No** (stored locally) |
| 2FA TOTP secrets | Two-factor authentication | **No** (encrypted, stored locally in user meta) |
| Backup archives (database, themes, media) | Cloud backup upload | Sent to **your** cloud provider (Google Drive, Dropbox, S3, B2, or FTP server) |
| Full database (migration/sync) | Site migration, staging sync | Sent directly to **your** destination site |
| Geo-bypass cookie (`swisswpsuite_geo_bypass`) | Geo-blocking bypass | **No** (set on visitor's browser, 1 hour, httponly, secure) |
| Admin UI preferences | Theme, sidebar state, consent flags | **No** (localStorage, admin browsers only) |

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
| Abuse prevention | Art. 6(1)(f) — Legitimate interest | Art. 6(3) |

## 6. Third-Party Services (Sub-Processors)

We use the following third-party services to deliver the Service:

| Service | Purpose | Data Shared | Location | DPA Status |
|---------|---------|-------------|----------|------------|
| **Groq LLC** | AI language model processing (SEO generation, security Layer 2 analysis, content enhancement) | Content submitted to AI features | USA | Available upon request |
| **Stripe, Inc.** | Payment processing | Payment card data, email, amount | USA | Stripe DPA available |
| **ipwho.is** | IP geolocation (geo-blocking feature) | Visitor IP addresses | USA | No DPA — public API, IP only |
| **Patchstack** | Plugin/theme vulnerability database lookup (part of Sentinel Layer 1 scans) | Plugin/theme slug strings; your server's outbound IP as source | EU | Public API, no account required for read access |
| **WPScan (Automattic)** | WordPress vulnerability database lookup (optional, requires your WPScan API key) | Plugin/theme slug strings; your WPScan API key; your server's outbound IP as source | USA | User-provided API key; Automattic DPA applies |

**Cloud backup providers** (Google Drive, Dropbox, AWS S3, Backblaze B2, FTP servers) are configured by you and operate under your own agreements with those providers. We facilitate the connection but do not receive or store your backup data.

**Patchstack and WPScan** are queried on your behalf from your own WordPress server (not from our VPS). They receive plugin/theme slug strings (e.g. "woocommerce", "jetpack") plus your server's outbound IP as a standard HTTP source — no visitor PII, no post content, no credentials beyond the WPScan API key you configure. We never proxy or log these queries.

### International Transfers

When data is transferred from Switzerland or the EU/EEA to the United States, we rely on:

- The EU-US Data Privacy Framework (DPF) where the recipient is DPF-certified, OR
- The Swiss-US Data Privacy Framework where applicable, OR
- Standard Contractual Clauses (SCCs) as adopted by the European Commission and recognized by the Swiss FDPIC.

## 7. Data Retention

| Data Category | Retention Period | Deletion Method |
|---------------|-----------------|-----------------|
| Account data (email, license key, domain) | Account duration + 30 days after deletion | Automated purge |
| AI content submitted for processing | Not retained (processed and discarded) | N/A |
| Sentinel scan cache | 24 hours | Automated purge |
| Token usage logs | Permanent (legal audit obligation) | Available upon request after legal retention expires |
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

### Under CCPA/CPRA (California):

- **Right to Know** — Request what personal information we collect, use, and disclose.
- **Right to Delete** — Request deletion of your personal information.
- **Right to Opt-Out** — We do not "sell" or "share" personal information as defined by CCPA.

### How to Exercise Your Rights

Contact our Data Protection Officer at support@swisswpsecure.com. We will respond within 30 days (GDPR) or 45 days (CCPA). We may request identity verification before processing your request.

### Limitation

We cannot delete data that we are legally required to retain (e.g., invoices under Swiss commercial law). In such cases, we will delete all data not subject to a retention obligation and inform you of the specific limitation.

## 9. Cookies and Client-Side Storage

### Cookies Set by the Plugin

| Cookie | Purpose | Duration | Set On | Classification |
|--------|---------|----------|--------|---------------|
| `swisswpsuite_geo_bypass` | Allows a geo-blocked visitor to bypass country restriction with a valid token | 1 hour | Visitor browsers (when geo-blocking bypass is used) | Strictly necessary |

### Browser Storage (Admin Only)

The Plugin uses localStorage and sessionStorage in the WordPress admin panel for UI state (theme preference, sidebar position, consent acknowledgments, scan lock). These are strictly necessary for the Plugin's admin interface and are not used for tracking.

### No Tracking

We do not use cookies, pixels, or any other technology to track visitors across sites. We do not use Google Analytics, Facebook Pixel, or any third-party analytics on your WordPress site.

## 10. Security Measures

We implement appropriate technical and organizational measures to protect your data:

- **Encryption in transit:** All communication with our Service uses TLS 1.2+.
- **Encryption at rest:** Sensitive credentials (API keys, OAuth tokens) are encrypted using WordPress cryptographic salts.
- **Access control:** VPS access restricted to authorized personnel. Database credentials stored in environment variables.
- **Data minimization:** We collect only what is necessary for service delivery.
- **Breach response:** We maintain an incident response plan. In the event of a data breach, we will notify the FDPIC and affected users in accordance with GDPR Art. 33-34 and Swiss nDSG Art. 24.

## 11. Children's Privacy

The Service is not directed at children under 16. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact support@swisswpsecure.com.

## 12. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. Material changes will be communicated by email at least 30 days before taking effect. The "Last Updated" date at the top reflects the most recent revision.

## 13. Contact

Swisswpsecure
Le Moulin 3, 1312 Eclepens, Switzerland

Data Protection Officer: support@swisswpsecure.com
General inquiries: support@swisswpsecure.com
Website: https://swisswpsecure.com

---

*This document was last reviewed on 2026-04-24.*
