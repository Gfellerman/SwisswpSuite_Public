# SwissWPSuite AI — WP.org SVN Assets

This folder contains the WordPress.org directory assets for SwissWPSuite AI. These files go into the `/assets/` directory of the WP.org SVN repository — **not** into the plugin zip.

---

## Why a separate folder?

WordPress.org uses a two-directory SVN layout:

```
/trunk/          ← plugin source code (what the zip is built from)
/assets/         ← directory listing images (banner, icon, screenshots)
/tags/           ← release snapshots (one per version bump)
```

WP.org serves banner images and screenshots directly from `/assets/`. If you commit them into `/trunk/`, they appear in the plugin zip but NOT on the directory listing page. Every file in this folder must be committed to `/assets/` in SVN.

---

## Expected files

| Filename | Status | Spec |
|---|---|---|
| `banner-772x250.png` | **TODO** — produce per `ASSET_BRIEF.md` | 772 × 250 px, PNG, ≤ 1 MB |
| `banner-1544x500.png` | **TODO** — produce per `ASSET_BRIEF.md` | 1544 × 500 px, PNG, ≤ 1 MB |
| `icon-128x128.png` | **TODO** — produce per `ASSET_BRIEF.md` | 128 × 128 px, PNG, opaque bg |
| `icon-256x256.png` | **TODO** — produce per `ASSET_BRIEF.md` | 256 × 256 px, PNG, opaque bg |
| `screenshot-1.png` | **TODO** — Security Hub dashboard overview | 1200 × 675 px, PNG |
| `screenshot-2.png` | **TODO** — Malware scan results + AI analysis | 1200 × 675 px, PNG |
| `screenshot-3.png` | **TODO** — WAF / IP blocking log | 1200 × 675 px, PNG |
| `screenshot-4.png` | **TODO** — Hardening options (11 toggles) | 1200 × 675 px, PNG |
| `screenshot-5.png` | **TODO** — 2FA TOTP setup screen | 1200 × 675 px, PNG |
| `screenshot-6.png` | **TODO** — Backup list with cloud status | 1200 × 675 px, PNG |
| `screenshot-7.png` | **TODO** — Sync Teleport diff comparison | 1200 × 675 px, PNG |
| `screenshot-8.png` — | **TODO** — Migration wizard progress | 1200 × 675 px, PNG |
| `screenshot-9.png` | **TODO** — AI SEO bulk meta table | 1200 × 675 px, PNG |
| `screenshot-10.png` | **TODO** — Tablet responsive view at 768px | 1200 × 675 px, PNG |

See [ASSET_BRIEF.md](ASSET_BRIEF.md) for the full production spec for each file.

---

## SVN commit instructions

### First-time setup (if you have not checked out WP.org SVN before)

```bash
# Check out your plugin's SVN repository
svn checkout https://plugins.svn.wordpress.org/swisswpsuite-ai/ ~/wpsvn/swisswpsuite-ai
cd ~/wpsvn/swisswpsuite-ai
```

### Adding assets

```bash
cd ~/wpsvn/swisswpsuite-ai/assets/

# Copy your finished files here
cp /path/to/banner-772x250.png .
cp /path/to/banner-1544x500.png .
cp /path/to/icon-128x128.png .
cp /path/to/icon-256x256.png .
cp /path/to/screenshot-*.png .

# Add to SVN (required for new files; skip for updates)
svn add banner-772x250.png banner-1544x500.png icon-128x128.png icon-256x256.png screenshot-*.png

# Commit
svn commit -m "Add directory assets: banner, icon, screenshots"
```

### Updating existing assets

```bash
cd ~/wpsvn/swisswpsuite-ai/assets/
cp /path/to/updated-file.png .
svn commit -m "Update screenshot-3: refreshed WAF log state"
```

Changes appear on the WP.org listing within a few minutes of commit. The CDN cache clears automatically.

### Updating only assets (no code change)

You do not need to bump the plugin version or touch `/trunk/` when updating assets. Asset changes are independent of code releases.

---

## WP.org developer references

- [Plugin Assets — WordPress Plugin Developer Handbook](https://developer.wordpress.org/plugins/wordpress-org/plugin-assets/)
- [Using Subversion — WordPress Plugin Developer Handbook](https://developer.wordpress.org/plugins/wordpress-org/how-to-use-subversion/)
- [Plugin Headers — WP.org Plugin Directory](https://developer.wordpress.org/plugins/plugin-basics/header-requirements/)

---

## Filename rules (WP.org enforces these)

WP.org parses asset filenames exactly. Do not rename, add suffixes, or use uppercase letters.

- Banners: `banner-772x250.png` and `banner-1544x500.png` — both required; only the retina variant is shown on HiDPI displays
- Icon: `icon-128x128.png` and `icon-256x256.png` — both required
- Screenshots: `screenshot-1.png` through `screenshot-10.png` — numbered sequentially, no gaps. The order matches the `== Screenshots ==` section in `readme.txt`
- All filenames: lowercase, no spaces
