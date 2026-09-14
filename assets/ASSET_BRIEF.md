# SwissSuite AI — WP.org Asset Production Brief

This brief contains every spec a designer (freelancer, in-house, or Canva user) needs to produce all WP.org directory assets without follow-up questions. It covers only what the **SwissSuite AI** Free plugin actually does — malware scanning, a firewall, hardening, local backup and restore, and on-page SEO. Once the images described here exist, add an `== Screenshots ==` section to `readme.txt` listing them in order, and update `assets/README.md`'s file table from TODO to done.

---

## Brand System (use these exact values everywhere)

### Colour Palette (sourced from `plugin/src/index.css` and `plugin/tailwind.config.js`)

| Token | Hex | OKLCH | Usage |
|-------|-----|-------|-------|
| **Swiss Navy** | `#0A1628` | `oklch(0.23 0.04 255)` | Primary background, headers, primary buttons |
| **Swiss Red** | `#D52B1E` | `oklch(0.52 0.18 27)` | Brand accent, CTAs, error states, Swiss cross |
| **Swiss Gold** | `#E0AC2B` | `oklch(0.75 0.15 85)` | Highlights, badges |
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
- The wordmark "SwissSuite" should be set in Inter SemiBold or Bold

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
│   [SHIELD ICON]          Security. Backup.          ┌──┐ ┌──┐ ┌──┐        │
│      with                On-Page SEO.                │UI│ │UI│ │UI│        │
│   Swiss cross            ──────────────────           │ 1│ │ 2│ │ 3│        │
│                          One Plugin.                 └──┘ └──┘ └──┘        │
│   SwissSuite AI                                                          │
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
  - Below the mark: "SwissSuite AI" in Inter Bold, white, ~28 px (standard) / ~56 px (retina)
- **Centre block (tagline):**
  - Line 1: "Security. Backup. On-Page SEO." — Inter ExtraBold, white, ~32 px (standard) / ~64 px (retina), tight line height
  - Divider rule: 60 px wide, 2 px tall, Swiss Red, beneath line 1
  - Line 2: "One Plugin." — Inter Bold, Swiss Gold (#E0AC2B), ~22 px (standard) / ~44 px (retina)
- **Right block (3 mini UI strips):**
  - 3 stacked rectangular cards, each ~180 × 50 px on standard banner
  - Card 1: dark navy card with green "Scan complete" pill + "0 threats" label
  - Card 2: dark navy card with a shield/checkmark icon + "Backup complete" label
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

## Screenshots

`readme.txt` will declare the `== Screenshots ==` section once these images exist; add it there, in this order, when you add the files. Capture from a genuine, freshly-activated Free install — every screen below exists in the free plugin exactly as shown, with nothing to unlock.

### Universal Screenshot Specs

- **Dimensions:** exactly 1200 × 675 px (16:9)
- **Format:** PNG, optimised, ≤ 500 KB each
- **Browser window width during capture:** 1440 px
- **Browser chrome:** crop OUT the URL bar, tabs, and OS chrome — the screenshot should show only the plugin UI inside the WordPress admin frame (left sidebar + plugin content area)
- **Theme:** WordPress default admin theme (do not use a custom admin theme)
- **Admin user:** "admin" (do not show real client emails or usernames)

### Filenames (mandatory — WP.org parses these)
- `screenshot-1.png` through `screenshot-6.png`

### Per-Screenshot Production Spec

---

**Screenshot 1: Security Hub overview**
- **Navigate to:** SwissSuite → Security → Dashboard tab
- **State to create before capture:**
  1. Run a Deep Scan so a recent scan appears (grade A or B)
  2. Enable at least 8 of the 12 hardening options
  3. Have 2-3 firewall blocks in the last 24h log (let it sit overnight or simulate)
- **Highlight:** the scan summary card with its grade badge, the firewall status card
- **Caption:** Security Hub — scan status, firewall status, and hardening posture at a glance.

---

**Screenshot 2: Deep Scan results**
- **Navigate to:** SwissSuite → Security → Scan tab
- **State to create:**
  1. Click "Start Deep Scan" and wait for completion
  2. Ensure at least one finding is present (test environment only: drop a harmless file with a recognisable malware-pattern string into `wp-content/uploads/test.php` — REMOVE after capture)
- **Highlight:** the grade badge, the finding list with severity badges
- **Caption:** Deep Scan results — local signature analysis with severity-ranked findings.

---

**Screenshot 3: Firewall / IP blocking log**
- **Navigate to:** SwissSuite → Security → Logs tab
- **State to create:**
  1. Have 5-10 entries in the blocked-requests log (let the WAF run for a day, or trigger from a test IP)
  2. At least 2 entries should show a SQL-injection or XSS block
  3. At least 1 IP should be in the "Currently banned" list with a Release button visible
- **Highlight:** the firewall status toggle, the blocked-requests log, the currently-banned list
- **Caption:** Firewall log — blocked requests and banned IPs, in real time.

---

**Screenshot 4: One-click hardening**
- **Navigate to:** SwissSuite → Security → Hardening tab
- **State to create:**
  1. Enable 8-10 of the 12 hardening toggles
  2. Leave 1-2 disabled so the user can see the toggle UI in both states
- **Highlight:** the row of toggles with their risk badges and descriptions
- **Caption:** One-click hardening — 12 options, plain-English descriptions, no configuration needed.

---

**Screenshot 5: Backup list and restore**
- **Navigate to:** SwissSuite → Backup
- **State to create:**
  1. Have 2-3 recent local backups in the list
  2. Open the restore confirmation dialog on one row (capture the dialog open, do not confirm)
- **Highlight:** the backup list with status badges, the restore confirmation dialog
- **Caption:** Backup and restore — local backups with one-click restore.

---

**Screenshot 6: On-page SEO audit**
- **Navigate to:** SwissSuite → SEO
- **State to create:**
  1. Run an SEO scan so scores are populated
- **Highlight:** the per-content-type score cards, the non-compliant items list
- **Caption:** On-page SEO audit — local scoring, no AI, no account required.

---

## Production Workflow (recommended order)

1. **Banners first** — they set the visual language. Approve the gradient + tagline treatment before committing to screenshots.
2. **Icon next** — small format, fast to iterate. Test at 36 × 36 px before finalising.
3. **Screenshots last** — they require a working WordPress install in the right state. Spin up a clean test site (Local by Flywheel or wp-env), install the Free plugin from a freshly built zip, configure the state per each screenshot spec, capture in one session.
4. **Optimise all PNGs** through TinyPNG or Squoosh (mozjpeg / oxipng). Target < 500 KB per screenshot, < 1 MB per banner.
5. **Verify pixel dimensions** with `identify *.png` (ImageMagick) before SVN commit — WP.org silently rejects assets that are 1 px off.

---

## Hand-off Checklist (designer signs this off)

- [ ] `banner-772x250.png` produced, ≤ 1 MB, exact dimensions
- [ ] `banner-1544x500.png` produced, ≤ 1 MB, exact dimensions, identical content
- [ ] `icon-128x128.png` produced, opaque background, exact dimensions
- [ ] `icon-256x256.png` produced, opaque background, exact dimensions
- [ ] `icon.svg` master delivered
- [ ] `screenshot-1.png` through `screenshot-6.png` produced, 1200 × 675
- [ ] `== Screenshots ==` added to `readme.txt` with matching captions, in file order
- [ ] All real emails / real client domains redacted from screenshots
- [ ] All filenames use exact casing shown above
- [ ] Files copied to the SVN `assets/` directory (NOT `trunk/` — assets live in a separate SVN directory)

See `assets/README.md` for SVN commit instructions.
