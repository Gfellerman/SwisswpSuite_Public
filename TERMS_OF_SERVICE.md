# SwissSuite AI — Terms of Service

> **Last Updated:** 2026-07-21
> **Effective Date:** 2026-07-21

---

## 1. Introduction

These Terms of Service ("Terms") govern your use of the SwissSuite AI WordPress plugin ("Plugin"), the associated services provided through swisswpsecure.com ("Service"), and any related APIs, documentation, and support (collectively, the "Platform"). By activating a license key, creating an account, or using any paid feature, you agree to these Terms.

The Plugin is developed and operated by **SwissWPSecure Sàrl**, a limited liability company (*société à responsabilité limitée*) incorporated under the laws of Switzerland, with its registered office at **Le Moulin 3, 1312 Éclépens, Canton of Vaud, Switzerland** ("we", "us", "our", "SwissWPSecure").

## 2. Definitions

- **"Plugin"** — The SwissSuite AI WordPress plugin, distributed under the GNU General Public License v2.0 or later (GPL-2.0+).
- **"Service"** — The cloud-based services accessible via api.swisswpsecure.com, including license validation, AI content generation, security scanning, and token management.
- **"Account"** — Your registration with SwissWPSecure, identified by your email address and license key.
- **"Token"** — A unit of AI processing capacity purchased or allocated under your subscription plan.
- **"Site"** — The WordPress installation where you have activated the Plugin.
- **"Content"** — Any text, data, files, or other material you submit to the Service for processing.

## 3. Service Description

### 3.0 Editions and Distribution

The Plugin is distributed as **two editions built from a single source tree**:

- **SwissSuite AI (Free edition)** — distributed through the WordPress.org plugin directory (slug `swisssuite-ai`). It contains only the free features described in Section 3.1 and does not require a license key, an account, or a connection to our Service. It is governed solely by the GPL-2.0+ license.
- **SwissSuite AI Pro (Paid edition)** — distributed **only** as a download from swisswpsecure.com to customers who have purchased a plan (slug `swisssuite-ai-pro`). It is a full superset that includes the free features plus the paid features described in Section 3.2. Pro receives updates directly from swisswpsecure.com (not WordPress.org). Access to Pro downloads, updates, and the Service requires a valid, active license key and acceptance of these Terms. The premium features are not present in the Free edition; they are delivered exclusively by installing the Pro edition.

The Pro edition's source code remains available under the GPL-2.0+ license to licensed customers; the license key controls access to downloads, updates, and the Service, not your rights under the GPL to the code you have received.

### 3.1 Plugin (Free Tier — SwissSuite AI, WordPress.org)

The Free edition includes features that operate entirely on your server without requiring a license or external service connection:

- Basic Web Application Firewall (WAF)
- Login brute-force protection (rate-limit lockout) and spam honeypot protection
- Local database + files backup and restore
- Malware signature scanning (Layer 1, local)
- Malware quarantine (local remediation)
- On-page SEO audit / score (no AI)
- XML sitemap generation
- WPScan / Patchstack vulnerability lookup using your own third-party key

Free features do not require acceptance of these Terms. They are governed solely by the GPL-2.0+ license.

### 3.2 Service (Paid Tiers — SwissSuite AI Pro, swisswpsecure.com)

Paid features are delivered by the Pro edition, require a valid license key, and (for AI/serviceware features) connect to our Service:

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
- Under the EU AI Act (Regulation 2024/1689), you as the deployer may have obligations to disclose AI-generated content to your visitors. That disclosure is your responsibility.

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

| Plan | Monthly | Yearly | Monthly Tokens (monthly plan) | Monthly Tokens (yearly plan) |
|------|---------|--------|-------------------------------|------------------------------|
| SwissSuite AI | CHF 29.99 | CHF 249.99 | 7,500,000 | 5,200,000 |
| Security & Firewall | CHF 9.99 | CHF 99.99 | 2,500,000 | 2,080,000 |
| Content SEO | CHF 4.99 | CHF 49.99 | 1,250,000 | 1,040,000 |
| Content Enhancer | CHF 9.99 | CHF 99.99 | 2,500,000 | 2,080,000 |
| Cloud Backup & Sync | CHF 9.99 | CHF 99.99 | 2,500,000 | 2,080,000 |

**How token allowances are calculated:** your monthly token allowance is proportional to the price you pay per month. Yearly plans are discounted — you pay less per month than on the monthly plan — and their monthly token allowance is lower by the same proportion. Example: the SwissSuite AI yearly plan costs CHF 249.99/year (≈CHF 20.83/month vs CHF 29.99 monthly), so its monthly allowance is 5,200,000 tokens instead of 7,500,000.

Prices are stated in Swiss francs (CHF) and are exclusive of value-added tax (VAT) or equivalent consumption taxes unless stated otherwise. Where such tax applies to your purchase (for example, for consumers in the EU/EEA or the UK), it is calculated from your place of residence and the **total amount payable including tax is displayed before you confirm your order.**

### 5.2 Token Economy

- Tokens are the unit of AI processing capacity. Each AI action consumes tokens based on the complexity and length of the request.
- On each monthly renewal, your subscription token balance is **reset to your plan's monthly allowance**. Unused subscription tokens do **not** carry over to the next billing period.
- Token top-up packs (Section 5.3) live in a separate, non-expiring balance that is not touched by the monthly reset.
- When your token balance reaches zero, AI features will return an HTTP 402 error until tokens are replenished.
- Token balances are tracked on our servers. The server balance is the authoritative record.

### 5.3 Token Top-Up Packs

You may purchase additional tokens at any time:

- Token Pack: CHF 9.99 for 10,000,000 tokens

Top-up tokens are kept in a **separate top-up balance**, independent of your subscription allowance. Top-up tokens **do not expire** and are **not affected by the monthly reset** described in Section 5.2. They can be spent on any AI feature. Your subscription allowance is consumed first; top-up tokens are used when the subscription allowance is exhausted.

### 5.4 Pricing Changes

We may change pricing with 30 days' advance notice by email. Price changes apply to the next billing cycle, not to current prepaid periods.

## 6. Payment Terms

### 6.1 Payment Processing

Payments are processed by Stripe, Inc. We do not store your credit card details. By providing payment information, you also agree to Stripe's Terms of Service (https://stripe.com/legal).

We do not offer a free trial period; billing begins on the date of purchase (monthly or yearly).

### 6.2 Auto-Renewal

**Subscriptions renew automatically** at the end of each billing period (monthly or yearly) at the then-current price unless cancelled before the renewal date. You will receive a confirmation email for each renewal charge.

### 6.3 Cancellation

You may cancel your subscription at any time by:

- Contacting us at support@swisswpsecure.com
- Using the cancellation link in your billing portal

Cancellation takes effect at the end of the current billing period. You retain access to paid features until that date. We do not provide prorated refunds for partial billing periods.

### 6.4 Right of Withdrawal (Consumers)

If you are a consumer, you have a 14-day right of withdrawal under Directive 2011/83/EU (EU/EEA) or the Consumer Contracts Regulations 2013 (UK). Because the Plugin and Service are digital content and services supplied immediately, at checkout we ask you, by **two separate, un-pre-ticked acknowledgements**, to (i) expressly request that supply begin immediately and (ii) acknowledge that you thereby lose your right of withdrawal once supply has begun. We confirm these acknowledgements to you on a durable medium (order-confirmation email). If you give both acknowledgements and we begin supply, your withdrawal right ends at that point. If you do not give them, or if we have not yet begun supply, you may withdraw within 14 days of purchase for a full refund by contacting support@swisswpsecure.com. To the extent your purchase is treated as a service contract and you withdraw after requesting immediate performance, you may owe a proportionate amount for the service already provided. Your remedies for defective or non-conforming digital content or services (Section 6.5.1) are unaffected and cannot be waived.

### 6.5 Refunds

**6.5.1 Your statutory rights come first.** Nothing in this Section 6.5 limits or replaces any right you have that cannot be excluded under applicable law. In particular, this Section does not affect: (a) your right of withdrawal under Section 6.4 where it has not yet been lost, including a full refund where you have **not** yet activated your license key; and (b) your mandatory remedies if the Plugin or Service is defective or does not conform to the contract, including, for consumers in the EU/EEA, the remedies under Directive (EU) 2019/770 (bringing the digital content into conformity, a proportionate price reduction, or termination with a refund). Any refund owed under (a) or (b) is provided as a matter of right and is **not** limited by, and does **not** count against, the goodwill policy in Sections 6.5.2 to 6.5.4.

**6.5.2 Goodwill refunds (beyond your statutory rights).** Separately from, and in addition to, Section 6.5.1, we may offer a voluntary "goodwill" refund even where no statutory refund is owed. Goodwill refunds are granted **at our sole discretion, following our own review, on a case-by-case basis**. As a guideline, we will generally consider a goodwill refund within 14 days of purchase where the Service has not been substantially used. A goodwill refund is a discretionary gesture and creates no entitlement to any further refund.

**6.5.3 One goodwill refund per customer.** Our goodwill refund policy is limited to **one refund per customer**. Once a goodwill refund under 6.5.2 has been made on your account, or a payment dispute or chargeback has been resolved in your favour, any future purchase associated with your account is **final and non-refundable as a matter of goodwill**. This limit does **not** affect your statutory rights under 6.5.1: if a later purchase is defective or non-conforming, or a valid withdrawal right applies before activation, you remain entitled to the corresponding statutory remedy regardless of any earlier refund.

**6.5.4 New licenses after a refund.** Having received a refund never prevents you from purchasing or activating a new license, and never prevents you from using the free edition of the Plugin, which requires no license. A new paid license purchased after a prior refund is provided on the same terms as any other license, **except that it is non-refundable as a matter of goodwill** (your statutory rights under 6.5.1 still apply in full). Where this applies, we will tell you clearly, **before you pay**, at checkout and in your order confirmation, that the purchase is final.

**6.5.5 Cancellation is always available.** The limits in this Section 6.5 apply only to **refunds** (money back). They never affect your ability to **cancel**. You may cancel your subscription at any time under Section 6.3, whatever your refund history, and cancellation is always at least as easy as subscribing. Cancelling stops future billing; it does not, by itself, entitle you to a refund of amounts already paid.

**6.5.6 Consumers outside the EU/EEA.** If you are not a consumer in the EU/EEA, the statutory rights referenced in 6.5.1 may not apply, and refunds are governed solely by 6.5.2 to 6.5.4. Swiss consumers are not granted a statutory cooling-off right for contracts concluded online (Article 40a of the Swiss Code of Obligations excludes e-commerce); for Swiss consumers the goodwill policy in 6.5.2 to 6.5.4 is the applicable refund policy, without prejudice to remedies for defective or non-conforming digital content.

### 6.6 Jurisdiction-Specific Consumer Rights

This Section supplements Section 6.5 and applies in addition to it. Where your local law grants you rights beyond Section 6.5 or this Section, that law prevails (see Section 6.5.1).

**6.6.1 Consumers in the EU/EEA and the United Kingdom.** You have a statutory right to withdraw from your purchase within 14 days without giving a reason (Directive 2011/83/EU for the EU/EEA; the Consumer Contracts Regulations 2013 for the UK). Because the Plugin and Service are digital content supplied immediately, at checkout you will be asked to (i) expressly request immediate supply and (ii) acknowledge that you thereby lose this 14-day withdrawal right once supply begins. If you give both acknowledgements and we begin supply, your withdrawal right ends at that point. If you do not give them, or if we have not yet begun supply, you may withdraw within 14 days for a full refund. Your remedies for defective or non-conforming digital content (Directive (EU) 2019/770; the Consumer Rights Act 2015 in the UK) are unaffected and cannot be waived.

**6.6.2 Consumers in the United States.** Your subscription renews automatically as described in Section 6.2. Before you pay, we disclose the renewal frequency and price and obtain your affirmative consent to enrol. You may cancel at any time through your billing portal or by contacting us, with no cancellation fee, effective as described in Section 6.3. These practices are intended to comply with applicable federal and state automatic-renewal and negative-option requirements, including the California Automatic Renewal Law.

**6.6.3 Other jurisdictions.** If the law of your country of residence grants you mandatory consumer rights that cannot be excluded by contract — such as the consumer guarantees under the Australian Consumer Law, or a statutory cancellation or "regret" right for online purchases — those rights apply to you in full and override anything in Section 6.5 or this Section that would give you less. Nothing in these Terms limits any right that cannot lawfully be excluded.

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

Our processing of personal data is governed by our Privacy Policy ([PRIVACY_POLICY_URL]) and, where applicable, our Data Processing Agreement ([DPA_URL]).

By using the Service, you acknowledge that:

- Your site domain and license key are transmitted to our servers for license validation.
- Content submitted to AI features is transmitted to our servers and forwarded to our AI sub-processor.
- For your own **account, billing, and license data** (your email, name, address, license key, payment records), **we are the data controller**, and our processing is described in our Privacy Policy.
- For **personal data of your site's visitors** that is transmitted to our Service only when you use a Service feature (for example, content you submit to AI features that may incidentally contain personal data, or security-scan metadata), **we act as your data processor** under our Data Processing Agreement, and **you are the controller**.

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

**Subject to the final paragraph of this Section:**

- Our total aggregate liability for any claims arising from or related to these Terms or the Service shall not exceed the total fees you paid to us in the 12 months preceding the event giving rise to the claim.
- We shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or business opportunities.
- We shall not be liable for data loss resulting from backup, migration, or sync operations. You are responsible for maintaining independent backups.
- We shall not be liable for damages arising from AI-generated content that you publish without review.

These limitations apply regardless of the legal theory (contract, tort, strict liability, or otherwise).

**Nothing in these Terms excludes or limits our liability where it cannot lawfully be excluded or limited.** In particular, and without limiting the foregoing: (a) under Swiss law (Article 100 of the Swiss Code of Obligations), we do **not** exclude or limit our liability for damage caused by our unlawful intent (*Absicht*) or gross negligence (*grobe Fahrlässigkeit*), including that of our auxiliaries; (b) we do not exclude or limit liability for death or personal injury caused by negligence, or for fraud or fraudulent misrepresentation; and (c) if you are a consumer, nothing in these Terms limits any mandatory statutory right or remedy that cannot be excluded by contract, including the remedies for defective or non-conforming digital content or services under Directive (EU) 2019/770, the Consumer Rights Act 2015 (United Kingdom), the Australian Consumer Law, or equivalent law applicable to you. The limitations in this Section apply only to the extent permitted by the law applicable to you, and the cap and exclusions above do not apply to any liability described in this paragraph.

## 12. Indemnification

If you are acting as a **consumer**, this Section applies to you only to the extent permitted by the mandatory consumer law applicable to you, and only in respect of third-party claims arising from your own unlawful content or unlawful use of the Service. If you use the Service for **business or professional purposes**, you agree to indemnify and hold harmless SwissWPSecure Sàrl, its officers, directors, and employees from any claims, losses, or damages (including reasonable legal fees) arising from:

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

### 13.5 Suspension, Termination and Refusal of Service for Abuse

**(a) Grounds.** We may suspend or terminate your access to paid features and the Service, and/or decline to sell, activate, or provide any future paid license to you or to any account, domain, email address, or payment instrument associated with you, if we reasonably determine that you have: (i) breached these Terms, including the Acceptable Use provisions in Section 7; (ii) engaged in fraud, misrepresentation, or unauthorized use; (iii) abused our refund or goodwill policy, including seeking refunds in bad faith or after the one-refund limit in Section 6.5.3; (iv) initiated chargebacks or payment disputes for charges you legitimately owe; or (v) used the Service for unlawful purposes.

**(b) Effect.** Where we act under this Section, we may deactivate your paid license, disable paid features and the Service, withhold further discretionary (goodwill) refunds, and refuse future paid purchases or activations from you or your associated account, domain, or payment instrument. If we terminate a paid subscription period you have already paid for, and we are not doing so because of your own material breach, we will refund the unused portion of that period, less any amounts you owe us (including chargeback and dispute fees).

**(c) What is not affected.** This Section does not, and cannot, limit: (i) your right to continue using the free edition of the Plugin, which is licensed to you under the GPL-2.0+ and cannot be revoked; or (ii) your mandatory statutory rights, including any valid right of withdrawal, any remedy for defective or non-conforming digital content, and any single legitimate refund or payment dispute. **We will not suspend, terminate, penalise, or refuse service to you solely because you have lawfully exercised such a right.**

**(d) Proportionality and notice.** We will apply this Section in good faith and proportionately and, where practicable and lawful, will give you notice and an opportunity to remedy a breach before terminating. Notice is not required in cases of fraud, unlawful use, or where immediate action is necessary to protect the Service or other users.

## 14. Changes to Terms

We may update these Terms from time to time. We will notify you of material changes by email at least 30 days before the changes take effect. Your continued use of the Service after the effective date constitutes acceptance.

If you do not agree to the updated Terms, you may cancel your subscription before the changes take effect.

## 15. Governing Law and Jurisdiction

These Terms are governed by and construed in accordance with the laws of Switzerland, without regard to conflict-of-law principles.

Any disputes arising from or related to these Terms shall be submitted to the exclusive jurisdiction of the courts of the Canton of Vaud, Switzerland.

If you are a consumer in the EU/EEA, this clause does not deprive you of the protection of mandatory consumer protection provisions in your country of residence.

If you are a consumer domiciled in the EU/EEA, the United Kingdom, or another State bound by the Lugano Convention, nothing in this Section deprives you of the protection of the mandatory consumer-jurisdiction rules that apply to you. In particular, **we may bring proceedings against you only in the courts of your country of domicile, and you may bring proceedings against us either in the courts of the Canton of Vaud or in the courts of your own domicile.** Where the mandatory law of your country of residence grants you protection that this Section would reduce, that law prevails.

## 16. Dispute Resolution

Before initiating legal proceedings, you agree to contact us at support@swisswpsecure.com to attempt to resolve the dispute informally. We will endeavor to respond within 14 business days.

## 17. Severability

If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions remain in full force and effect.

## 18. Entire Agreement

These Terms, together with our Privacy Policy and Data Processing Agreement, constitute the entire agreement between you and SwissWPSecure regarding the Service.

## 19. Contact

SwissWPSecure Sàrl
Le Moulin 3, 1312 Éclépens
Switzerland

Email: support@swisswpsecure.com
Data Protection: support@swisswpsecure.com
Website: https://swisswpsecure.com

---

*This document was last reviewed on 2026-07-21.*
