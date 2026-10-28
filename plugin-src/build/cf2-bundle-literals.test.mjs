/**
 * CF2 D-1 / D-2 acceptance (validator-written), at source level (the .63 build
 * lane re-checks the built bundle: LNK-1 rows :10/:19/:23 and TXT-1 :23 gone).
 *
 * D-1  src/shims/use-sync-external-store.ts keeps no PRESERVED comment
 *      (a `/*!` banner, or any comment holding @license/@preserve, which
 *      esbuild copies into the bundle) carrying a URL or the word LICENSE.
 *      The MIT credit stays, in an ordinary comment and/or the readme.
 * D-2a build/strip-vendor-urls.mjs replaces React Router's SSR fallback
 *      origin with a value that is not an http(s):// literal and is still a
 *      valid URL base (`new URL(path, base)` must not throw).
 * D-2b no src/ file keeps a preserved comment holding an http(s):// URL
 *      (Build B :19 is the `@link https://swisswpsecure.com` line of the
 *      `@license GPL-2.0+` header in src/lib/errorReporting.ts).
 *
 * Ids: CF2-D1-1, CF2-D2-1, CF2-D2-2. RED on d40767d0: all three.
 * Run from plugin/: ../node_modules/.bin/vitest run build/cf2-bundle-literals.test.mjs
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { LOCALHOST_ORIGIN_REPLACEMENT } from "./strip-vendor-urls.mjs";

const PLUGIN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function preservedComments(text) {
  const out = [];
  const re = /\/\*[\s\S]*?\*\//g;
  let m;
  while ((m = re.exec(text))) {
    const c = m[0];
    if (c.startsWith("/*!") || /@license|@preserve/.test(c)) out.push(c);
  }
  return out;
}

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx|js|mjs|css)$/.test(e.name) && !/\.test\./.test(e.name)) acc.push(p);
  }
  return acc;
}

describe("CF2 bundle literals", () => {
  it("CF2-D1-1: the shim keeps no preserved comment with a URL or LICENSE", () => {
    const src = fs.readFileSync(path.join(PLUGIN, "src/shims/use-sync-external-store.ts"), "utf8");
    expect(src.length).toBeGreaterThan(100);
    const bad = preservedComments(src).filter((c) => /https?:\/\/|LICENSE/.test(c));
    expect(bad).toEqual([]);
    // The credit itself stays in the source (ordinary comment).
    expect(src).toMatch(/Meta Platforms/);
  });

  it("CF2-D2-1: the SSR fallback origin replacement is no http(s) literal and is a valid URL base", () => {
    const r = LOCALHOST_ORIGIN_REPLACEMENT.replacement;
    expect(r).not.toMatch(/https?:\/\//);
    expect(() => new URL("/admin.php?page=x", r.replace(/^["'`]|["'`]$/g, ""))).not.toThrow();
  });

  it("CF2-D2-2: no src/ file keeps a preserved comment holding a URL", () => {
    const files = walk(path.join(PLUGIN, "src"));
    expect(files.length).toBeGreaterThan(50);
    const hits = [];
    for (const f of files) {
      for (const c of preservedComments(fs.readFileSync(f, "utf8"))) {
        if (/https?:\/\//.test(c)) hits.push(path.relative(PLUGIN, f));
      }
    }
    expect([...new Set(hits)]).toEqual([]);
  });
});
