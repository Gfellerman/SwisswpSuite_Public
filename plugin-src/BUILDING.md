# Building SwissSuite AI's admin interface from source

This directory (`plugin-src/`) is the complete, human-readable React/TypeScript
source for the SwissSuite AI admin interface, published in accordance with
WordPress.org Guideline 4 (public availability of source code and build tools
for any compiled/minified assets shipped in the plugin).

It contains the full `src/` tree plus the Vite build configuration needed to
regenerate the compiled JavaScript and CSS that ships inside the plugin's
`assets/` folder.

## What's in here

```
plugin-src/
├── src/                  full React/TypeScript source (components, hooks,
│                          stores, pages, types, lib)
├── index.html             Vite entry HTML
├── vite.config.ts         Vite build configuration
├── tsconfig.json          TypeScript compiler configuration
├── package.json           dependency manifest
├── package-lock.json      locked dependency versions
├── postcss.config.js      PostCSS (Tailwind + autoprefixer) configuration
└── tailwind.config.js     Tailwind CSS v4 theme configuration
```

## Prerequisites

- Node.js and npm. This tree was verified with:
  - `node -v` → `v24.13.1`
  - `npm -v` → `11.8.0`
  - The project does not pin an exact Node version (no `engines` field, no
    `.nvmrc`). Any reasonably current Node 20+/22+/24 LTS should work — Vite 6
    and TypeScript 5.8 are the binding constraints, not Node itself.

## Build

From inside this directory:

```bash
npm ci
npm run build
```

`npm ci` performs a clean, reproducible install strictly from
`package-lock.json` (it will refuse to run if `package.json` and
`package-lock.json` ever drift apart — see the note under "Lockfile
provenance" below for why that matters here).

`npm run build` runs `vite build` and emits the compiled bundle to
`assets/` (gitignored in this directory — this is build *output*, not
source). In the actual plugin, that `assets/` folder is what ships inside
the plugin zip alongside the PHP: Vite writes `entry-app-[hash].js`,
`chunks/[name]-[hash].js`, `assets/[name]-[hash][ext]` (CSS and static
assets), and `.vite/manifest.json` (a manifest the plugin's PHP layer reads
to enqueue the correct hashed filenames). `vite.config.ts`'s `build.outDir`
and `build.rollupOptions` govern all of this — read it for the exact output
naming scheme.

Both `npm ci` and `npm run build` were run end-to-end against this exact
tree as part of preparing this publication and completed successfully
(exit code 0), including a full production bundle (`entry-app-*.js`,
per-route `chunks/*.js`, `assets/app-*.css`, `.vite/manifest.json`).

## The `EDITION` build flag

SwissSuite AI ships as two editions from one source tree — a Free edition
(distributed on WordPress.org) and a Pro edition (distributed from
swisswpsecure.com only). `vite.config.ts` reads a plain shell environment
variable, `EDITION`, to decide which one it's building:

```bash
npm run build                # EDITION unset -> defaults to Pro (full build)
EDITION=free npm run build   # Free edition
EDITION=pro npm run build    # Pro edition (same as unset)
```

When `EDITION=free`, `vite.config.ts`'s `resolve.alias` block redirects a
growing, individually-dated list of Pro-only module import specifiers (41
entries as of v2.9.33.42, each added by its own dated code comment
recording the exact call site and rationale — grep `resolve.alias` in
`vite.config.ts` for the current, authoritative, itemized list; do not
hand-maintain a name list here, it has already gone stale once) — covering
areas such as the AI Content page, Sync page/manager, the License Manager
organism, the token-balance hook, Migration Station, Cloud Storage panel,
the Update Guard card, Two-Factor Settings, the Geo-Lockdown card, the AI
SEO bulk-generation workbench, and the AI Log Advisor's guide-content data
module — to their `*.freeStub.tsx`/`*.freeStub.ts` counterparts already
present in `src/`. (Encryption Settings was REMOVED from this list on
2026-08-22 — backup encryption-at-rest is now enabled in Free, so the real
component ships in both editions.) This is a Vite-level,
module-resolution-time substitution — the real Pro implementations, and
everything they transitively import, never enter the Free build's module
graph, so they cannot end up in the compiled Free bundle. This is why the
Free edition's zip does not contain the Pro/AI code even though both
editions build from the same `src/` tree. Both `EDITION=free` and the
default (Pro) build were verified to complete successfully as part of
preparing this publication.

Separately, and unconditionally in **both** editions, `vite.config.ts`
also aliases `react`/`react-dom`/`react-dom/client`/`react/jsx-runtime`/
`react/jsx-dev-runtime` to small proxy modules in `src/vendor-shims/` that
re-export WordPress core's own already-loaded `window.React`/
`window.ReactDOM` globals at runtime, instead of bundling this project's
own copy of React (WordPress.org Guideline 13 — a plugin must not bundle
a library WordPress core already ships). This is not an edition-gated
substitution; it applies to the shared source tree the same way for
Free and Pro alike.

The actual release zips are produced by the monorepo's
`build_plugin.sh --edition free|pro` wrapper, which runs this same
`npm run build` (with `EDITION` set accordingly) and then assembles the
full plugin zip around the resulting `assets/` output. That wrapper script,
and the rest of the PHP backend, are not part of this repository — see
"Where this fits" below.

## Lockfile provenance (read before comparing output to a shipped release)

`package-lock.json` in this directory was generated fresh, from this exact
`package.json`, at publication time. npm resolves each dependency's caret
range (e.g. `^19.2.3`) to the latest version satisfying it *at the moment
`npm install`/`npm ci` runs* — so a lockfile generated today can pin
slightly newer transitive/patch versions than whatever produced a
previously-shipped, already-compiled `assets/` bundle. WordPress.org
Guideline 4 requires that the published source can be built by a third
party, not that the rebuilt output be byte-for-byte identical to a past
release — and rebuilding from this tree does succeed. If you need the
exact dependency graph used for a specific historical release rather than
"the current tree, buildable today," treat this lockfile as best-effort
provenance rather than a guaranteed match, and pin/downgrade individual
packages to taste.

## Where this fits

This is the frontend admin-interface source only. It compiles into static
JS/CSS assets that the plugin's PHP backend enqueues inside the WordPress
admin. The plugin itself — including this compiled output — is distributed
through:

- Free edition: https://wordpress.org/plugins/swisssuite-ai/
- Pro edition: https://www.swisswpsecure.com/

See this repository's top-level `readme.txt` (`== Source Code ==` section)
for the canonical pointer to this directory from the plugin's own
WordPress.org listing.
