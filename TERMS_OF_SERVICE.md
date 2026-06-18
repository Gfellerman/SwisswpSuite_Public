# SwissSuite AI — Terms of Service

> **Last Updated:** 2026-03-23
> **Effective Date:** 2026-03-23

---

## 1. Introduction

These Terms of Service ("Terms") govern your use of the SwissSuite AI WordPress plugin ("Plugin"), the associated services provided through swisswpsecure.com ("Service"), and any related APIs, documentation, and support (collectively, the "Platform"). By activating a license key, creating an account, or using any paid feature, you agree to these Terms.

The Plugin is developed and operated by Swisswpsecure, a company incorporated under the laws of Switzerland, with its registered office at Le Moulin 3, 1312 Eclepens, Switzerland ("we", "us", "our", "SwissSuite").

## 2. Definitions

- **"Plugin"** — The SwissSuite AI WordPress plugin, distributed under the GNU General Public License v2.0 or later (GPL-2.0+).
- **"Service"** — The cloud-based services accessible via api.swisswpsecure.com, including license validation, AI content generation, security scanning, and token management.
- **"Account"** — Your registration with SwissSuite, identified by your email address and license key.
- **"Token"** — A unit of AI processing capacity purchased or allocated under your subscription plan.
- **"Site"** — The WordPress installation where you have activated the Plugin.
- **"Content"** — Any text, data, files, or other material you submit to the Service for processing.

## 3. Service Description

### 3.1 Plugin (Free Tier)

The Plugin includes free features that operate entirely on your server without requiring a license or external service connection:

- Basic Web Application Firewall (WAF)
- Login brute-force protection (3 attempts, 15-minute lockout)
- Local database backup
- Malware signature scanning (Layer 1)
- XML sitemap generation
- SEO meta tag management
- Spam honeypot protection

Free features do not require acceptance of these Terms. They are governed solely by the GPL-2.0+ license.

### 3.2 Service (Paid Tiers)

Paid features require a valid license key and connect to our Service:

- Advanced WAF (63+ detection patterns)
- AI-powered content generation (SEO meta, FAQ, content rewrite)
- Sentinel AI security scanning (Layer 2)
- Two-Factor Authentication (2FA/TOTP)
- Geo-blocking with country detection
- Advanced hardening (security headers, REST API restriction, bot blocking)
- Cloud backup to Google Drive, Dropbox, AWS S3, Backblaze B2, FTP/FTPS
- Site-to-site migration
- Staging sync
- Malware quarantine management
- IP banning

### 3.3 AI Features

AI features use third-party large language models via our Service. When you use AI features:

- Your Content (titles, descriptions, post bodies) is transmitted to our servers and forwarded to our AI sub-processor (currently Groq LLC) for processing.
- AI-generated output is provided "as-is." We do not guarantee the accuracy, completeness, originality, or legal compliance of AI-generated content.
- **You are solely responsible** for reviewing, editing, and approving all AI-generated content before publishing.
- Under the EU AI Act (Regulation 2024/1689), you may have obligations to disclose AI-generated content to your site visitors. We provide tools to facilitate this disclosure but compliance is your responsibility.

## 4. Account and License

### 4.1 Registration

To access paid features, you must provide a valid email address and activate a license key. You are responsible for maintaining the confidentiality of your license key.

### 4.2 Domain Lock

Each license key is bound to the first domain where it is activated ("Domain Lock"). To use the same license on a different domain, you must deactivate and reactivate the license. Only one active domain per license key is permitted at any time.

### 4.3 License Validation

The Plugin periodically validates your license by contacting our Service (daily heartbeat). If our Service is unreachable for more than 72 consecutive hours, paid features will be temporarily disabled until connectivity is restored.

## 5. Subscription Plans and Pricing

### 5.1 Plans

We offer the following subscription tiers (prices as of the effective date):

| Plan | Monthly | Yearly | Monthly Tokens |
|------|---------|--------|----------------|
| SwisswpSuite | $29.99 | $249.99 | 7,500,000 |
| Security & Firewall | $9.99 | $99.99 | 2,500,000 |
| Content SEO | $4.99 | $49.99 | 1,250,000 |
| Content Forge | $9.99 | $99.99 | 2,500,000 |
| Cloud Backup & Sync | $9.99 | $99.99 | 2,500,000 |

### 5.2 Token Economy

- Tokens are the unit of AI processing capacity. Each AI action consumes tokens based on the complexity and length of the request.
- **Subscription token allowance resets each billing cycle.** At every monthly renewal (or yearly anniversary, billed monthly), your subscription balance is reset to the plan's monthly token allowance. Unused subscription tokens do **not** carry over from one cycle to the next.
- **Top-Up tokens are additive and do not expire.** Top-up packs (Section 5.3) add to your balance on top of the subscription allowance, and any unused top-up tokens persist across billing cycles.
- When your token balance reaches zero, AI features will return an HTTP 402 error until tokens are replenished.
- Token balances are tracked on our servers. The server balance is the authoritative record.

### 5.3 Token Top-Up Packs

You may purchase additional tokens at any time:

- Small Pack: $9.99 for 2,500,000 tokens
- Large Pack: $24.99 for 10,000,000 tokens

Top-up tokens do not expire and stack on top of your subscription balance.

### 5.4 Pricing Changes

We may change pricing with 30 days' advance notice by email. Price changes apply to the next billing cycle, not to current prepaid periods.

## 6. Payment Terms

### 6.1 Payment Processing

Payments are processed by Stripe, Inc. We do not store your credit card details. By providing payment information, you also agree to Stripe's Terms of Service (https://stripe.com/legal).

### 6.2 Auto-Renewal

**Subscriptions renew automatically** at the end of each billing period (monthly or yearly) at the then-current price unless cancelled before the renewal date. You will receive a confirmation email for each renewal charge.

### 6.3 Cancellation

You may cancel your subscription at any time by:

- Contacting us at support@swisswpsecure.com
- Using the cancellation link in your billing portal

Cancellation takes effect at the end of the current billing period. You retain access to paid features until that date. We do not provide prorated refunds for partial billing periods.

### 6.4 Right of Withdrawal (EU/EEA Customers)

If you are a consumer in the EU/EEA, you have a 14-day right of withdrawal from the date of purchase under Directive 2011/83/EU.

**For digital content:** By activating your license key, you expressly consent to the immediate performance of the service and acknowledge that you lose your right of withdrawal once the digital content has been fully provided.

If you have not yet activated your license key, you may request a full refund within 14 days of purchase by contacting support@swisswpsecure.com.

### 6.5 Refunds

Outside of the EU/EEA withdrawal right, refunds are handled on a case-by-case basis at our discretion. We generally offer refunds within 14 days of purchase if the Service has not been substantially used.

## 7. Acceptable Use

You agree not to:

- Use the Service to process, store, or transmit material that violates applicable law.
- Attempt to reverse-engineer, decompile, or extract the source code of the Service (the Plugin's source code is available under GPL-2.0+; the Service backend is proprietary).
- Use the Service to conduct automated attacks, vulnerability scanning, or penetration testing against third-party systems without authorization.
- Share your license key with third parties or use a single license on multiple domains simultaneously.
- Circumvent token limits, rate limiting, or license validation mechanisms.
- Use AI features to generate content that is defamatory, fraudulent, or designed to deceive.
- Use the migration feature to transfer sites you do not own or have authorization to manage.

## 8. Intellectual Property

### 8.1 Plugin Code

The Plugin is distributed under the GNU General Public License v2.0 or later. You may use, modify, and redistribute the Plugin code in accordance with the GPL. The full license text is included in the Plugin files.

### 8.2 Service

The Service backend (API server, database schema, AI proxy logic, administrative tools) is proprietary. Your subscription grants you a non-exclusive, non-transferable right to access the Service during your subscription period.

### 8.3 Your Content

You retain all rights to Content you submit to the Service. By using AI features, you grant us a limited, temporary license to process your Content solely for the purpose of providing the requested AI output. We do not use your Content for model training, marketing, or any purpose other than fulfilling your request.

### 8.4 AI-Generated Output

AI-generated content is provided to you without copyright claim by us. However, AI-generated content may not be eligible for copyright protection in all jurisdictions (see US Copyright Office guidance on AI-generated works). You are responsible for understanding the intellectual property implications of publishing AI-generated content in your jurisdiction.

## 9. Data Protection

Our processing of personal data is governed by our Privacy Policy (PRIVACY_POLICY.md) and, where applicable, our Data Processing Agreement.

By using the Service, you acknowledge that:

- Your site domain and license key are transmitted to our servers for license validation.
- Content submitted to AI features is transmitted to our servers and forwarded to our AI sub-processor.
- You are the data controller for any personal data collected by the Plugin on your site.
- We are the data processor for data transmitted to our Service.

For full details, see our Privacy Policy.

## 10. Warranty Disclaimer

### 10.1 Free Tier

THE PLUGIN IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NONINFRINGEMENT. This is consistent with the GPL-2.0+ license.

### 10.2 Paid Tier

While we make reasonable efforts to maintain Service availability and accuracy, WE DO NOT WARRANT THAT:

- The Service will be uninterrupted or error-free.
- AI-generated content will be accurate, complete, or suitable for your purpose.
- Security scanning will detect all vulnerabilities or malware.
- Backup and migration operations will be free from data loss.
- The Plugin will be compatible with all WordPress installations, plugins, or hosting environments.

## 11. Limitation of Liability

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:

- Our total aggregate liability for any claims arising from or related to these Terms or the Service shall not exceed the total fees you paid to us in the 12 months preceding the event giving rise to the claim.
- We shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or business opportunities.
- We shall not be liable for data loss resulting from backup, migration, or sync operations. You are responsible for maintaining independent backups.
- We shall not be liable for damages arising from AI-generated content that you publish without review.

These limitations apply regardless of the legal theory (contract, tort, strict liability, or otherwise).

**Nothing in these Terms limits liability for:** (a) death or personal injury caused by negligence, (b) fraud or fraudulent misrepresentation, or (c) any liability that cannot be excluded under applicable law.

## 12. Indemnification

You agree to indemnify and hold harmless SwissSuite, its officers, directors, and employees from any claims, losses, or damages (including reasonable legal fees) arising from:

- Your use of the Service in violation of these Terms.
- Your failure to comply with applicable data protection laws.
- Content you generate, publish, or distribute using the Service.
- Your failure to maintain adequate backups of your site.

## 13. Term and Termination

### 13.1 Term

These Terms are effective from the date you first use the Service and continue until terminated.

### 13.2 Termination by You

You may terminate at any time by cancelling your subscription and deactivating your license key.

### 13.3 Termination by Us

We may terminate or suspend your access to the Service if:

- You breach these Terms.
- Your payment method fails and is not resolved within 7 days.
- You use the Service for illegal purposes.
- We cease operating the Service (with 90 days' advance notice).

### 13.4 Effect of Termination

Upon termination:

- Your license key is deactivated and paid features are disabled.
- Free Plugin features continue to function (GPL software cannot be revoked).
- We will delete your account data within 30 days, except where retention is required by law (see Privacy Policy).
- Any remaining token balance is forfeited.

## 14. Changes to Terms

We may update these Terms from time to time. We will notify you of material changes by email at least 30 days before the changes take effect. Your continued use of the Service after the effective date constitutes acceptance.

If you do not agree to the updated Terms, you may cancel your subscription before the changes take effect.

## 15. Governing Law and Jurisdiction

These Terms are governed by and construed in accordance with the laws of Switzerland, without regard to conflict-of-law principles.

Any disputes arising from or related to these Terms shall be submitted to the exclusive jurisdiction of the courts of the Canton of Zurich, Switzerland.

If you are a consumer in the EU/EEA, this clause does not deprive you of the protection of mandatory consumer protection provisions in your country of residence.

## 16. Dispute Resolution

Before initiating legal proceedings, you agree to contact us at support@swisswpsecure.com to attempt to resolve the dispute informally. We will endeavor to respond within 14 business days.

## 17. Severability

If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions remain in full force and effect.

## 18. Entire Agreement

These Terms, together with our Privacy Policy and Data Processing Agreement, constitute the entire agreement between you and SwissSuite regarding the Service.

## 19. Contact

Swisswpsecure
Le Moulin 3
1312 Eclepens, Switzerland

Email: support@swisswpsecure.com
Data Protection: support@swisswpsecure.com
Website: https://swisswpsecure.com

---

*This document was last reviewed on 2026-03-23.*
