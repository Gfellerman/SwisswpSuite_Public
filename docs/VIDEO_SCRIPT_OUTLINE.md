# SwissWPSuite AI — Plugin Intro Video Script Outline

**Target length:** 3.5–4 minutes  
**Format:** Screen recording + voiceover (no camera required)  
**Audience:** WordPress site owners who are not developers  
**Goal:** Install SwissWPSuite AI from the WordPress.org directory

---

## Segment 1 — Hook (0:00–0:20)

### Voiceover
"Right now, while you're watching this, bots are scanning your WordPress site for vulnerabilities. Over 90,000 WordPress sites get hacked every day — most of them because the owner didn't know they were at risk until it was too late."

### Screen
- Black screen with white text: **"90,000+ WordPress sites hacked every day"**
- Fade to a browser showing a hacked site (placeholder: a site with a defacement message or a "403 Forbidden" screen)
- Hold for 3 seconds

---

## Segment 2 — The Problem (0:20–0:45)

### Voiceover
"A hacked site means lost revenue, tanked SEO rankings, and your visitors' data at risk. And protecting your site with separate plugins — a security plugin, a backup plugin, a migration plugin, an SEO plugin — means four monthly costs, four update channels, and four things that can break each other. There's a better way."

### Screen
- Split screen: four different plugin settings pages open in four browser tabs (Wordfence, UpdraftPlus, Yoast, Duplicator — or placeholder mockups)
- Transition: all four tabs close at once, leaving a single clean WordPress admin screen

---

## Segment 3 — Solution Reveal (0:45–1:15)

### Voiceover
"SwissWPSuite AI is one plugin that replaces all four. Malware scanner, firewall, two-factor authentication, site backup, site migration, and AI SEO — built and tested together, all from one screen."

### Screen
- Navigate to: **SwissWPSuite → Dashboard**
- Slow pan across the dashboard: Security score tile, Last backup tile, Token balance tile, Quick actions row
- Click through each sidebar tab (Security Hub, Backup, Migration, Sync, SEO) at 2 seconds each — do not stop, just sweep through to show breadth
- Return to Dashboard

**B-roll suggestion:** Record the transition animation as the sidebar tabs highlight

---

## Segment 4a — Security Scan Demo (1:15–1:45, 30 seconds)

### Voiceover
"Let's start with security. One click runs a full malware scan — SwissWPSuite checks every file on your site against a database of known malware hashes, then runs AI analysis on anything suspicious. Results appear in under two minutes on most sites."

### Screen
1. Navigate to: **SwissWPSuite → Security Hub → Scan tab**
2. Click **"Run Deep Malware Scan with AI"**
3. Show the progress bar animating through phases: Enumerating → Hashing → VPS Lookup → AI Analysis
4. Show the completed results panel — file list with threat badges (grade pill, source tags)
5. Click one result row to expand the AI analysis text

**UI interaction:** Click "Analyze with AI" on a finding row and show the AI response appearing

---

## Segment 4b — Backup Demo (1:45–2:05, 20 seconds)

### Voiceover
"Backup is one click. SwissWPSuite compresses your entire site — files and database — and optionally uploads it straight to Google Drive, S3, Backblaze, or Dropbox. Scheduled backups run automatically while you sleep."

### Screen
1. Navigate to: **SwissWPSuite → Settings → Backup tab**
2. Click **"Backup Now"** — show the progress indicator
3. Show the completed backup entry in the list: filename, size, timestamp
4. Pan right to the Google Drive "Connected" badge in the Cloud column

---

## Segment 4c — Migration Demo (2:05–2:25, 20 seconds)

### Voiceover
"Need to move a site to a new host, or push staging to production? SwissWPSuite handles the whole migration — including database serialized strings — without a single line of command-line work."

### Screen
1. Navigate to: **SwissWPSuite → Migration Station → New Migration**
2. Show step 1: source site URL entry
3. Advance to step 3: transfer in progress, progress bar at ~50%, file counter ticking up
4. Show the "Migration complete — verify your new site" confirmation screen

---

## Segment 4d — AI SEO Demo (2:25–2:45, 20 seconds)

### Voiceover
"The AI SEO tools let you generate meta titles and descriptions for your entire post library in one shot. Select the posts, click Generate, and the AI writes SEO-optimised copy for each one based on the content it finds on your site."

### Screen
1. Navigate to: **SwissWPSuite → SEO Manager → Bulk Optimise**
2. Show 10–15 posts loaded in the table
3. Click **"Generate AI Suggestions"**
4. Show the AI Suggestion column filling in with green cells — each cell showing a generated meta description
5. Hover over one cell to show the full suggestion text

---

## Segment 4e — Hardening + 2FA Demo (2:45–3:15, 30 seconds)

### Voiceover
"Security hardening takes about 30 seconds. You get 11 one-click options — disable XML-RPC, block file editing from the dashboard, prevent user enumeration, enforce HTTPS, and more. And for your admin account, two-factor authentication works with Google Authenticator, Authy, 1Password — any TOTP app."

### Screen
1. Navigate to: **SwissWPSuite → Security Hub → Hardening tab**
2. Toggle ON three hardening options in quick succession — show each toggle animating to green
3. Show the Hardening Score counter incrementing (e.g. 7/11 → 8/11 → 9/11)
4. Navigate to: **SwissWPSuite → Security Hub → Two-Factor Authentication**
5. Click **"Set up 2FA"** — show the QR code modal
6. (Optional: show scanning the QR code with a phone — use a test/fake QR code)

---

## Segment 5 — Social Proof + Call to Action (3:15–3:45, 30 seconds)

### Voiceover
"SwissWPSuite AI is free to get started — the free tier includes the malware scanner, the firewall, 2FA, and the SEO audit with no time limit and no credit card. Premium plans unlock cloud backup, site migration, AI content rewriting, and the deep AI security audit."

### Screen
- Navigate to: **SwissWPSuite → License & Tokens tab**
- Show the "Get Free License" button — click it and show the email-entry modal
- Cut to: the WordPress.org plugin directory page for SwissWPSuite AI (or the swisswpsecure.com home page)

### Text overlay
- "Search 'SwissWPSuite' on WordPress.org"
- "Or visit swisswpsecure.com"

---

## Segment 6 — End Card (3:45–4:00)

### Screen
- Solid Swiss Navy background (#0A1628)
- **SwissWPSuite AI** wordmark centred, white, large
- Tagline below: "Security. Backup. Migration. AI SEO. One Plugin."
- Two text lines:
  - `wordpress.org/plugins/swisswpsuite-ai`
  - `swisswpsecure.com`
- Swiss cross + shield icon, bottom-right corner

### Voiceover
"SwissWPSuite AI. One plugin. Everything your WordPress site needs."

---

## Production Notes

### Recording setup
- **Browser:** Chrome at 1440 px wide
- **WordPress admin theme:** default (Ectoplasm or default Light theme)
- **Resolution:** record at 1920 × 1080, export at 1080p
- **Demo site:** use a clean local install (Local by Flywheel or wp-env) with sample posts, a running scan result, 2–3 backups in the list
- **Plugin state:** activate all features you plan to demo; have scan results pre-loaded so you are not waiting on-camera

### Voiceover
- Pacing: ~130 words per minute (conversational, not rushed)
- Tone: calm and direct — not excited, not salesy
- Record in a single take with a pop filter; edit out long pauses only

### Editing
- Add chapter markers at each segment boundary
- Lower thirds at each feature segment: "Malware Scanner" / "Backup" / "Migration" / "AI SEO" / "2FA"
- No background music during feature demos (distraction); optional ambient bed during intro/outro only
- Export: H.264, 1080p, target < 500 MB file size for YouTube upload

### YouTube metadata (fill in before upload)
- **Title:** `SwissWPSuite AI — WordPress Security, Backup & AI SEO Plugin (Full Demo)`
- **Description:** Start with a keyword-rich paragraph (malware scanner, WordPress firewall, site backup, two-factor authentication, site migration, AI SEO), then link to each chapter timestamp
- **Tags:** wordpress security plugin, wordpress backup plugin, malware scanner, two factor authentication wordpress, wordpress migration plugin, wordpress seo plugin, wordfence alternative, updraftplus alternative
- **Thumbnail:** A frame from the Security Hub dashboard (high contrast, readable text at small size)
