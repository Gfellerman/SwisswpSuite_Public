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

This tree builds a single plugin's admin app — there is no build-time
switch and no environment variable that changes what gets
compiled. From inside this directory:

```bash
npm ci
npm run build
npx vitest run
```

`npm ci` performs a clean, reproducible install strictly from
`package-lock.json` (it will refuse to run if `package.json` and
`package-lock.json` ever drift apart — see the note under "Lockfile
provenance" below for why that matters here).

`npm run build` runs `vite build` and emits the compiled bundle to
`assets/` (gitignored in this directory — this is build *output*, not
source). In the actual plugin, that `assets/` folder is what ships inside
the plugin zip alongside the PHP: Vite writes a single `entry-app-[hash].js`
(every route is bundled into it; there is no code splitting and no runtime
chunk loader), `assets/[name]-[hash].css`, and `manifest.json` (a manifest
the plugin's PHP layer reads to enqueue the two hashed filenames through
`wp_enqueue_script()` / `wp_enqueue_style()`). `vite.config.ts`'s `build.outDir`
and `build.rollupOptions` govern all of this — read it for the exact output
naming scheme.

`npx vitest run` runs this tree's own test suite (Vitest + Testing
Library + jsdom) with no separate configuration step.

`npm ci`, `npm run build` and `npx vitest run` were all run end-to-end
against this exact tree as part of preparing this publication and
completed successfully (exit code 0), including a full production bundle
(one `entry-app-*.js`, one `assets/app-*.css`, `manifest.json`).

`vite.config.ts` aliases `react`/`react-dom`/`react-dom/client`/
`react/jsx-runtime`/`react/jsx-dev-runtime` to small proxy modules in
`src/vendor-shims/` that re-export WordPress core's own already-loaded
`window.React`/`window.ReactDOM` globals at runtime, instead of bundling
this project's own copy of React (WordPress.org Guideline 13 — a plugin
must not bundle a library WordPress core already ships).

The actual release zip is produced by the monorepo's `build_plugin.sh`
wrapper, which runs this same `npm run build` and then assembles the full
plugin zip around the resulting `assets/` output. That wrapper script, and
the rest of the PHP backend, are not part of this repository — see "Where
this fits" below.

## Why the rebuilt CSS differs from the shipped `assets/app-*.css`

The JS bundle you get from `npm run build` above is byte-for-byte
identical to the one in the shipped release zip. The CSS is not, and this
is expected and benign: the actual release build runs Tailwind v4's
automatic class-name detection over the **whole plugin directory**, not
just `plugin-src/`, so the shipped stylesheet is a strict superset of a
`plugin-src`-only rebuild. The extra utility classes come from English
words that happen to appear in PHP comments and PHP-side test files
elsewhere in the plugin (Tailwind's scanner has no way to tell a class
name apart from an ordinary word in a comment, so it includes anything
that looks like one) — none of them are referenced anywhere in this
tree's own `src/`, and rebuilding here simply omits that dead weight.

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

- The plugin on WordPress.org: https://wordpress.org/plugins/swisssuite-ai/
- The company site: https://www.swisswpsecure.com/

See this repository's top-level `readme.txt` (`== Source Code ==` section)
for the canonical pointer to this directory from the plugin's own
WordPress.org listing.
