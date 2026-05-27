# SwissWPSuite AI — WP.org Asset Production Brief

This brief contains every spec a designer (freelancer, in-house, or Canva user) needs to produce all WP.org directory assets without follow-up questions. Hand this file off as-is.

---

## Brand System (use these exact values everywhere)

### Colour Palette (sourced from `plugin/src/index.css` and `plugin/tailwind.config.js`)

| Token | Hex | OKLCH | Usage |
|-------|-----|-------|-------|
| **Swiss Navy** | `#0A1628` | `oklch(0.23 0.04 255)` | Primary background, headers, primary buttons |
| **Swiss Red** | `#D52B1E` | `oklch(0.52 0.18 27)` | Brand accent, CTAs, error states, Swiss cross |
| **Swiss Gold** | `#E0AC2B` | `oklch(0.75 0.15 85)` | Highlights, premium-tier badges |
| **Off-white** | `#F4EFE5` | `oklch(0.9195 0.0169 88.003)` | Body background on light surfaces |
| **Neutral 700** | `#3F3F3F` | `oklch(0.3012 0 0)` | Primary text |
| **Success** | `#0E8C5A` | (emerald-600) | "Connected" / "Clean" indicators |
| **Warning** | `#D97706` | (amber-600) | Degraded states |

### Typography
- **Primary:** Inter (sans-serif). Weights used: 400, 500, 600, 700, 800
- **Display / headlines:** Inter Bold or ExtraBold
- **Monospace (UI only):** JetBrains Mono
- Do not use Playfair, decorative scripts, or condensed fonts on marketing assets

### Logo / Iconography Cues
- The brand mark is a **Swiss cross integrated into a security shield**. The shield is the security signal; the cross is the country-of-origin signal (Swiss = quality, neutrality, trust)
- Avoid generic padlock icons — every security plugin uses one, and we want to stand out
- The wordmark "SwissWPSuite" should be set in Inter SemiBold or Bold

---

## Banner (BOTH sizes required by WP.org)

WP.org requires two banner files. The high-DPI variant is shown to retina users; the standard variant is the fallback. Both must contain the same content — only the resolution differs.

### `banner-772x250.png` (standard, mandatory)
- **Dimensions:** exactly 772 × 250 px
- **Format:** PNG, optimised, ≤ 1 MB
- **Colour space:** sRGB

### `banner-1544x500.png` (retina, mandatory)
- **Dimensions:** exactly 1544 × 500 px
- **Format:** PNG, optimised, ≤ 1 MB
- **Colour space:** sRGB
- **Content:** identical to the standard banner, 2× resolution

### Banner Layout

```
┌────────────────────────────────────────────────────────────────────────────┐
│  [LEFT 35%]              [CENTRE 35%]              [RIGHT 30%]             │
│                                                                            │
│   [SHIELD ICON]          Security. Backup.         ┌──┐ ┌──┐ ┌──┐         │
│      with                Migration. AI SEO.        │UI│ │UI│ │UI│         │
│   Swiss cross            ──────────────────        │ 1│ │ 2│ │ 3│         │
│                          One Plugin.               └──┘ └──┘ └──┘         │
│   SwissWPSuite AI                                                          │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
   Dark Swiss Navy gradient background (#0A1628 → #1A2A45)
```

### Banner Specs (verbatim)

- **Background:** linear gradient from `#0A1628` (top-left) to `#1A2A45` (bottom-right). Subtle. No texture.
- **Left block:**
  - Shield + Swiss cross mark, ~140 px tall on the standard banner (280 px on retina)
  - Shield body in Swiss Navy with 2 px Swiss Red stroke
  - Swiss cross inside the shield in pure white (#FFFFFF)
  - Below the mark: "SwissWPSuite AI" in Inter Bold, white, ~28 px (standard) / ~56 px (retina)
- **Centre block (tagline):**
  - Line 1: "Security. Backup. Migration. AI SEO." — Inter ExtraBold, white, ~32 px (standard) / ~64 px (retina), tight line height
  - Divider rule: 60 px wide, 2 px tall, Swiss Red, beneath line 1
  - Line 2: "One Plugin." — Inter Bold, Swiss Gold (#E0AC2B), ~22 px (standard) / ~44 px (retina)
- **Right block (3 mini UI strips):**
  - 3 stacked rectangular cards, each ~180 × 50 px on standard banner
  - Card 1: dark navy card with green "Scan complete" pill + "0 threats" label
  - Card 2: dark navy card with cloud icon + "Backup uploaded" label
  - Card 3: dark navy card with chart icon + "SEO Score: 92" label
  - All cards: 1 px Swiss Navy stroke at 30% opacity, 8 px corner radius
- **Padding:** 32 px outer margin on standard banner (64 px on retina)
- **No drop shadows, no Web 2.0 gradients on text, no glow effects**

---

## Icon (BOTH sizes required by WP.org)

### `icon-128x128.png` and `icon-256x256.png`
- **Dimensions:** exactly 128 × 128 and 256 × 256 px
- **Format:** PNG, **no transparency** — WP.org renders icons on a white card background; transparency creates visual artefacts
- **Master file:** also deliver `icon.svg` (vector master, any size)

### Icon Design Spec

- **Background:** solid Swiss Navy `#0A1628`, full canvas, no padding outside this
- **Foreground composition:**
  - A **security shield** silhouette centred, occupying ~70% of the canvas height
  - Shield body: Swiss Red `#D52B1E`
  - Inside the shield: a **white Swiss cross** (the classic 1:6 ratio cross — short, fat arms, not a Latin cross)
  - Below the shield, inside the canvas: small "SW" wordmark in Inter Bold, white, ~14 px on the 128 variant
- **No drop shadow, no gradient, no glow** — flat design renders crisply at every WP.org display size
- The icon must be recognisable at 36 × 36 px (the smallest size WP.org renders it in plugin lists)

### Filenames (mandatory — do not rename)
- `icon-128x128.png`
- `icon-256x256.png`
- `icon.svg` (optional master, helpful for future re-export)

---

## Screenshots (all 10 required)

### Universal Screenshot Specs

- **Dimensions:** exactly 1200 × 675 px (16:9)
- **Format:** PNG, optimised, ≤ 500 KB each
- **Browser window width during capture:** 1440 px
- **Browser chrome:** crop OUT the URL bar, tabs, and OS chrome — the screenshot should show only the plugin UI inside the WordPress admin frame (left sidebar + plugin content area)
- **Theme:** WordPress default admin theme (do not use a custom admin theme)
- **WordPress version:** 6.7 (matches "Tested up to")
- **Admin user:** "admin" (do not show real client emails or usernames)

### Filenames (mandatory — WP.org parses these)
- `screenshot-1.png` through `screenshot-10.png`

### Per-Screenshot Production Spec

---

**Screenshot 1: Security Hub overview**
- **Navigate to:** SwissWPSuite → Security Hub → Dashboard tab
- **State to create before capture:**
  1. Run an AI Security Audit so a recent scan appears (grade B or A)
  2. Enable at least 8 of the 11 hardening options
  3. Have 2-3 firewall blocks in the last 24h log (let it sit overnight or simulate)
- **Highlight:** the "Security Score" tile, the "Last Scan: Grade A" badge, the hardening posture meter
- **Caption:** Security Hub dashboard — threat count, scan status, and hardening score at a glance.

---

**Screenshot 2: Malware scan results**
- **Navigate to:** SwissWPSuite → Security Hub → Scan tab
- **State to create:**
  1. Click "Run Deep Malware Scan with AI" and wait for completion
  2. Ensure at least one finding is present (test environment: drop a harmless file containing the string "eval(base64_decode(" into wp-content/uploads/test.php — REMOVE after capture)
  3. Expand the AI analysis panel on the finding by clicking "Analyze with AI"
- **Highlight:** the AI grade badge (A/B/C), the source-tag pills (Hash DB / Pattern / AI), the inline AI analysis text
- **Caption:** Malware scan results — file list with threat classifications and inline AI analysis.

---

**Screenshot 3: WAF / IP blocking**
- **Navigate to:** SwissWPSuite → Security Hub → Logs tab
- **State to create:**
  1. Have 5-10 entries in the "Blocked Requests" log (let the WAF run for a day, or trigger by curl-ing wp-admin with a SQL injection payload from a test IP)
  2. At least 2 entries should show "SQL injection blocked" or "XSS blocked"
  3. At least 1 IP should be in the "Currently banned" list with "Release IP" button visible
- **Highlight:** the WAF status badge ("Active"), the blocked-requests count, the "Currently banned" list
- **Caption:** WAF rules and IP blocking — live firewall log with blocked request details.

---

**Screenshot 4: Hardening options**
- **Navigate to:** SwissWPSuite → Security Hub → Hardening tab
- **State to create:**
  1. Enable 8-10 of the 11 hardening toggles
  2. Leave 1-2 disabled so the user can see the toggle UI in both states
  3. Make sure the "Disable XML-RPC" and "Disable File Editing" and "Force 2FA for Admins" toggles are ON
- **Highlight:** the row of green toggles, the per-row description text, the "Hardening Score: 9/11" tile
- **Caption:** Hardening options — 11 one-click security toggles, most enabled.

---

**Screenshot 5: 2FA setup**
- **Navigate to:** SwissWPSuite → Security Hub → Two-Factor Authentication
- **State to create:**
  1. As the admin user, click "Set up 2FA"
  2. The QR code modal should be visible
  3. Show the QR code, the 6-digit backup code entry field, and the 8 recovery codes (BLUR or REGENERATE the recovery codes before publishing — do not ship real recovery codes)
- **Highlight:** the QR code, the "Step 2 of 3" indicator, the "Scan with your authenticator app" instruction
- **Caption:** Two-factor authentication — TOTP setup screen for WordPress admin accounts.

---

**Screenshot 6: Backup list**
- **Navigate to:** SwissWPSuite → Settings → Backup tab
- **State to create:**
  1. Have 3 recent backups in the list (run "Backup Now" 3 times over a few days, or let the daily cron run for 3 days)
  2. Connect Google Drive under Cloud → Google Drive so the Google Drive icon shows "Connected" green
  3. The most recent backup should show "Uploaded to Google Drive" with a green cloud icon
- **Highlight:** the "Last successful backup: 2 hours ago" line, the Google Drive connected badge, the row-level cloud upload indicators
- **Caption:** Backup Fortress — backup list with Google Drive and S3 cloud status indicators.

---

**Screenshot 7: Sync diff view**
- **Navigate to:** SwissWPSuite → Sync Teleport → Compare tab
- **State to create:**
  1. Connect two test sites (staging + production) via Sync Teleport
  2. Make 2-3 content changes on staging (edit a post title, add a product, upload a media item)
  3. Click "Compare" and let the diff render
- **Highlight:** the two-column diff (Local vs Remote), the highlighted differences in amber, the "Push 3 changes →" button
- **Caption:** Sync Teleport — diff comparison table between staging and production.

---

**Screenshot 8: Migration wizard**
- **Navigate to:** SwissWPSuite → Migration Station → New Migration
- **State to create:**
  1. Start a migration to a test destination
  2. Capture on step 2 or 3 of the wizard (after destination is selected, during transfer)
  3. The progress bar should show ~45-65% so the user sees activity in progress
- **Highlight:** the step indicator ("Step 3 of 5: Transferring files"), the progress bar, the "12,847 files transferred" counter, the elapsed time
- **Caption:** Migration Station — step-by-step migration wizard progress screen.

---

**Screenshot 9: AI SEO bulk table**
- **Navigate to:** SwissWPSuite → SEO Manager → Bulk Optimise
- **State to create:**
  1. Have 10-15 posts loaded in the bulk table
  2. Run "Generate AI Suggestions" on the visible rows
  3. The "AI Suggestion" column should be populated with green cells showing the generated meta description for each post
- **Highlight:** the AI Suggestion column (green), the score-improvement column (e.g. "62 → 89"), the "Apply All Suggestions" button at the top
- **Caption:** AI SEO tools — bulk meta optimisation table with AI-generated suggestions.

---

**Screenshot 10: Tablet view at 768px**
- **Navigate to:** SwissWPSuite → Security Hub → Dashboard (same as screenshot 1)
- **State to create:**
  1. Resize browser to exactly 768 px wide (Chrome DevTools → Toolbar → iPad)
  2. The plugin UI should reflow: sidebar tabs become a horizontal scroll, cards stack vertically
  3. Show the responsive collapse — header at top, single-column cards below
- **Highlight:** the responsive layout, the touch-friendly tap targets, the readable typography at tablet size
- **Caption:** Mobile-responsive admin — plugin UI on a tablet viewport at 768px.

---

## Production Workflow (recommended order)

1. **Banners first** — they set the visual language. Approve the gradient + tagline treatment before committing to screenshots.
2. **Icon next** — small format, fast to iterate. Test at 36 × 36 px before finalising.
3. **Screenshots last** — they require a working WordPress install in the right state. Spin up a clean test site (Local by Flywheel or wp-env), install the plugin, configure the state per each screenshot spec, capture in one session.
4. **Optimise all PNGs** through TinyPNG or Squoosh (mozjpeg / oxipng). Target < 500 KB per screenshot, < 1 MB per banner.
5. **Verify pixel dimensions** with `identify *.png` (ImageMagick) before SVN commit — WP.org silently rejects assets that are 1 px off.

---

## Hand-off Checklist (designer signs this off)

- [ ] `banner-772x250.png` produced, ≤ 1 MB, exact dimensions
- [ ] `banner-1544x500.png` produced, ≤ 1 MB, exact dimensions, identical content
- [ ] `icon-128x128.png` produced, opaque background, exact dimensions
- [ ] `icon-256x256.png` produced, opaque background, exact dimensions
- [ ] `icon.svg` master delivered
- [ ] `screenshot-1.png` through `screenshot-10.png` produced, 1200 × 675, captions match readme.txt
- [ ] All recovery codes / real emails / real client domains redacted from screenshots
- [ ] All filenames use exact casing shown above
- [ ] Files copied to `/path/to/svn/assets/` (NOT `/trunk/` — assets live in a separate SVN directory)

See `public/assets/README.md` for SVN commit instructions.
