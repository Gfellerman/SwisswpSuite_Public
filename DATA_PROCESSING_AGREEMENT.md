# SwissSuite AI — Data Processing Agreement

> **Last Updated:** 2026-07-21
> **Effective Date:** 2026-07-21

---

## Preamble

This Data Processing Agreement ("DPA") forms part of the Terms of Service between:

- **Controller:** The entity that has entered into a subscription agreement with SwissWPSecure ("you", "Controller")
- **Processor:** **SwissWPSecure Sàrl**, Le Moulin 3, 1312 Éclépens, Switzerland ("we", "SwissWPSecure", "Processor")

This DPA governs the processing of personal data by SwissWPSecure on behalf of the Controller in connection with the SwissSuite AI plugin and associated cloud services.

This DPA is entered into pursuant to:
- Article 28 of the General Data Protection Regulation (EU) 2016/679 ("GDPR")
- Article 9 of the Swiss Federal Act on Data Protection ("nDSG")
- California Consumer Privacy Act / California Privacy Rights Act ("CCPA/CPRA"), where applicable

---

## 1. Definitions

Terms not defined herein have the meaning given to them in the GDPR or the main Terms of Service.

- **"Personal Data"** — Any information relating to an identified or identifiable natural person, as defined in GDPR Art. 4(1) and nDSG Art. 5(a).
- **"Processing"** — Any operation performed on Personal Data, as defined in GDPR Art. 4(2).
- **"Sub-Processor"** — A third party engaged by the Processor to process Personal Data on behalf of the Controller.
- **"Data Breach"** — A breach of security leading to accidental or unlawful destruction, loss, alteration, unauthorized disclosure of, or access to Personal Data.

---

## 2. Scope and Purpose of Processing

### 2.1 Subject Matter

The Processor provides the SwissSuite AI WordPress plugin and associated cloud services, which require the processing of certain data transmitted by the Controller's WordPress installation to the Processor's servers.

### 2.2 Duration

Processing continues for the duration of the Controller's subscription, plus a maximum of 30 days for data deletion after termination.

### 2.3 Nature and Purpose of Processing

This DPA covers only Personal Data that the Processor processes **on the Controller's behalf**. For the Controller's own account, billing, license, and invoice data, SwissWPSecure Sàrl acts as an **independent controller** under its Privacy Policy, and that data is outside the scope of this DPA.

| Processing Activity | Purpose | Data Involved |
|---------------------|---------|---------------|
| AI content generation | Generate SEO metadata, FAQs, content rewrites | Content submitted by the Controller (titles, descriptions, post bodies) that may incidentally contain personal data |
| Sentinel security scanning (Layer 2) | AI-powered security analysis | Scan metadata (site configuration, plugin list, finding summaries — no visitor PII) |

*License validation, token accounting, payment, and invoicing are performed by SwissWPSecure Sàrl as controller — see Privacy Policy.*

### 2.4 Categories of Data Subjects

- Site administrators (license holders)
- Indirectly: visitors to the Controller's site (IP addresses processed locally by the Plugin; not transmitted to Processor except scan metadata summaries)

### 2.5 Types of Personal Data

- Email address (account identification)
- Name and postal address (invoicing, where provided)
- Site domain (license validation)
- Content submitted to AI features (may incidentally contain personal data such as names mentioned in blog posts)
- Token usage records (license key, action type, amount)

---

## 3. Obligations of the Processor

### 3.1 Processing Instructions

The Processor shall process Personal Data only on documented instructions from the Controller, unless required to do so by applicable law. The Controller's instructions are documented in the Terms of Service and this DPA.

If the Processor believes an instruction infringes applicable data protection law, it shall inform the Controller without delay.

### 3.2 Confidentiality

The Processor ensures that persons authorized to process Personal Data are bound by contractual or statutory obligations of confidentiality.

### 3.3 Security Measures (GDPR Art. 32)

The Processor implements appropriate technical and organizational measures, including:

- **Encryption in transit:** TLS 1.2+ for all API communications
- **Encryption at rest:** Database encryption, encrypted credential storage
- **Access control:** Role-based access, SSH key-only server access, no shared credentials
- **Data minimization:** Only data necessary for the stated purpose is processed
- **Pseudonymization:** Where feasible (e.g., scan cache identified by fingerprint, not domain)
- **Resilience:** Server monitoring, automated restart, database backups
- **Regular testing:** Periodic security audits and penetration testing

### 3.4 Sub-Processor Management

#### 3.4.1 General Authorization

The Controller grants the Processor general written authorization to engage Sub-Processors, subject to the requirements in this Section 3.4.

#### 3.4.2 Current Sub-Processors

| Sub-Processor | Purpose | Location | Safeguards |
|---------------|---------|----------|------------|
| **Groq LLC** | AI language-model inference | USA | Transfers safeguarded by the EU Standard Contractual Clauses (Commission Decision 2021/914 — Module 2 for controller-to-processor and Module 3 for onward sub-processor transfers), with the amendments recognised by the Swiss FDPIC for transfers subject to the FADP, and the UK ICO International Data Transfer Addendum (Version B.1.0) for UK transfers. Groq does not use inputs or outputs to train AI models and applies zero data retention by default (batch files and short-term troubleshooting logs excepted). A copy of the safeguards is available on request. |
| **Stripe, Inc.** | Payment processing (PCI DSS compliant) | USA | EU-US DPF certified |

#### 3.4.3 Notification of Changes

The Processor shall inform the Controller of any intended changes to Sub-Processors at least **30 days** before the change takes effect. Notification will be sent by email to the address associated with the Controller's account.

The Controller may object to the change within 14 days of notification. If the Controller objects and the parties cannot resolve the objection, the Controller may terminate the subscription.

#### 3.4.4 Sub-Processor Obligations

The Processor shall impose the same data protection obligations as set out in this DPA on any Sub-Processor, via a written contract. The Processor remains fully liable for the acts and omissions of its Sub-Processors.

### 3.5 Assistance with Data Subject Rights

The Processor shall assist the Controller in fulfilling data subject requests (access, rectification, erasure, restriction, portability, objection) by:

- Providing account data upon authenticated request from the Controller
- Deleting or anonymizing data upon the Controller's written instruction
- Responding to Controller inquiries within 10 business days

### 3.6 Assistance with Data Protection Obligations

The Processor shall assist the Controller with:

- Data protection impact assessments (GDPR Art. 35)
- Prior consultation with supervisory authorities (GDPR Art. 36)
- Compliance with security obligations (GDPR Art. 32)

### 3.7 Data Breach Notification

In the event of a Data Breach, the Processor shall:

1. Notify the Controller **without undue delay and no later than 48 hours** after becoming aware of the breach.
2. Provide the following information:
   - Nature of the breach (categories and approximate number of data subjects and records affected)
   - Contact details of the Processor's DPO
   - Description of likely consequences
   - Description of measures taken or proposed to mitigate
3. Cooperate with the Controller's investigation and notification obligations.

The 48-hour notification timeline is stricter than the GDPR's 72-hour requirement for the Controller to notify the supervisory authority, giving the Controller adequate time to assess and report.

### 3.8 Deletion and Return of Data

Upon termination of the subscription:

- The Processor shall delete all Personal Data within 30 days, unless retention is required by law.
- Upon request, the Processor shall provide the Controller with a copy of their data in a structured, commonly used format (JSON or CSV) before deletion.
- Data subject to legal retention obligations (invoices: 10 years under Swiss OR Art. 958f) shall be retained for the minimum required period and then deleted.
- The Processor shall certify deletion in writing upon the Controller's request.

### 3.9 Audit Rights

The Controller has the right to audit the Processor's compliance with this DPA:

- **Audit method:** The Controller may request a written compliance report, or commission an independent third-party audit.
- **Frequency:** Once per calendar year, unless a Data Breach has occurred (in which case additional audits are permitted).
- **Cost:** Audits are conducted at the Controller's expense.
- **Notice:** The Controller shall provide at least 30 days' written notice.
- **Scope:** Limited to data processing activities covered by this DPA.
- **Confidentiality:** Audit findings are confidential and may not be disclosed to third parties without the Processor's consent, **except as required to comply with a competent supervisory authority or applicable law.**

---

## 4. Obligations of the Controller

The Controller shall:

- Ensure a lawful basis exists for all Personal Data transmitted to the Processor.
- Provide clear and documented processing instructions.
- Maintain an appropriate privacy policy informing data subjects about processing activities.
- Notify the Processor promptly of any data subject requests that require the Processor's assistance.
- Ensure that Personal Data transmitted to the Processor is accurate and up-to-date.

---

## 5. International Transfers

### 5.1 Transfer Mechanisms

When Personal Data is transferred from Switzerland or the EU/EEA to a country without an adequacy decision, the transfer is governed by:

- Standard Contractual Clauses (SCCs) as adopted by the European Commission (Decision 2021/914), Module 2 (Controller to Processor), OR
- The EU-US Data Privacy Framework (DPF) or Swiss-US Data Privacy Framework, where the recipient is certified, OR
- Other appropriate safeguards as recognized under GDPR Art. 46 or nDSG Art. 16-17.

For transfers subject to the Swiss FADP, the Standard Contractual Clauses are applied with the amendments recognised by the Swiss Federal Data Protection and Information Commissioner (references to the GDPR read as references to the FADP, the competent authority is the FDPIC, and the term "member state" does not preclude data subjects in Switzerland from enforcing their rights in Switzerland).

### 5.2 Supplementary Measures

Where required by a Transfer Impact Assessment, the Processor implements supplementary measures including:

- End-to-end encryption of data in transit
- Pseudonymization of identifiers where feasible
- Access controls limiting personnel who can access Personal Data

---

## 6. CCPA/CPRA Addendum (US Customers)

Where the California Consumer Privacy Act or California Privacy Rights Act applies:

- The Processor acts as a **Service Provider** as defined in CCPA Section 1798.140(ag).
- The Processor shall not sell, share, or use Personal Data for any purpose other than performing the services specified in this DPA.
- The Processor shall not combine Personal Data received from the Controller with data from other sources, except as permitted by the CCPA.
- The Processor shall comply with the Controller's instructions regarding consumer rights requests (know, delete, correct, opt-out).
- The Processor certifies that it understands the restrictions in this Section and will comply with them.

---

## 7. Liability

Liability under this DPA is subject to the limitations set forth in the Terms of Service. Each party is liable for damages caused by its breach of this DPA in accordance with applicable data protection law.

---

## 8. Term and Termination

This DPA enters into force upon the Controller's acceptance of the Terms of Service and remains in effect for the duration of the processing. The obligations in Sections 3.7 (Breach Notification), 3.8 (Deletion), and 3.9 (Audit) survive termination.

---

## 9. Governing Law

This DPA is governed by Swiss law. Disputes shall be submitted to the courts of the Canton of Vaud, Switzerland, without prejudice to the data subject's right to lodge a complaint with a supervisory authority.

---

## 10. Contact

**Processor:**
SwissWPSecure Sàrl
Le Moulin 3, 1312 Éclépens, Switzerland
Data Protection Contact: support@swisswpsecure.com

**Current Sub-Processor list:** see Section 3.4.2 of this document, which is the authoritative
list. Changes are notified to the Controller by email at least 30 days in advance under
Section 3.4.3.

---

*This document was last reviewed on 2026-07-21.*
