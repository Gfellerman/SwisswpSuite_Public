import { describe, it, expect, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import {
  stripVendorUrls,
  stripVendorUrlsPlugin,
  VENDOR_ERROR_STRING_REPLACEMENTS,
  LOCALHOST_ORIGIN_REPLACEMENT,
  CSS_ATTRIBUTION_REPLACEMENT,
} from "./strip-vendor-urls.mjs";

// A fixture chunk carrying all six vendor error-string URLs the way the
// real bundle does — the React Router message duplicated twice, plus one
// each for the ungap polyfill, Redux, Redux Toolkit and Immer, including
// the `${e}` template-literal interpolation the Redux entries embed the
// URL inside of.
const SIX_LITERAL_FIXTURE = [
  'function Bh(e){return`${e} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`}',
  'function QO(e){return`${e} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`}',
  'let t=ye(gf(e)); warn("we recommend you load a polyfill such as https://github.com/ungap/url-search-params.");',
  'function Lt(e){return`Minified Redux error #${e}; visit https://redux.js.org/Errors?code=${e} for the full message or use the non-minified dev environment`}',
  'function Ar(e){return`Minified Redux Toolkit error #${e}; visit https://redux-toolkit.js.org/Errors?code=${e} for the full message or use the non-minified dev environment`}',
  'function Jr(e,...t){throw new Error(`[Immer] minified error nr: ${e}. Full error at: https://github.com/immerjs/immer/blob/main/src/utils/errors.ts`)}',
].join("\n");

describe("stripVendorUrls — B4 positive control (six literals)", () => {
  it("replaces all six occurrences and leaves no https?:// literal from the table behind", () => {
    const { code, count } = stripVendorUrls(
      SIX_LITERAL_FIXTURE,
      VENDOR_ERROR_STRING_REPLACEMENTS
    );
    expect(count).toBe(6);
    for (const { source, pattern } of VENDOR_ERROR_STRING_REPLACEMENTS) {
      if (source) expect(code.includes(source)).toBe(false);
      if (pattern) expect(pattern.test(code)).toBe(false);
    }
    expect(code).toContain("the React Router documentation.");
    expect(code).toContain("the ungap/url-search-params package.");
    expect(code).toContain("the Redux error index");
    expect(code).toContain("the Redux Toolkit error index");
    expect(code).toContain("the Immer error documentation");
  });

  it("never leaves a dangling `${` where a replaced Redux URL used to sit", () => {
    const { code } = stripVendorUrls(
      SIX_LITERAL_FIXTURE,
      VENDOR_ERROR_STRING_REPLACEMENTS
    );
    // Each replacement's cut point is *after* the closing `}` of the last
    // template expression in its source string (both Redux entries end in
    // literal `${e}`) — so the surviving text must still read as a complete,
    // closed expression immediately before "visit the Redux ... index".
    expect(code).toContain("error #${e}; visit the Redux error index for");
    expect(code).toContain(
      "error #${e}; visit the Redux Toolkit error index for"
    );
    // And the cut must not have split "${e}" itself — no bare "${" survives
    // anywhere without an immediately-following "}".
    expect(/\$\{(?!e\})/.test(code)).toBe(false);
  });
});

describe("stripVendorUrls — B4 negative control (no listed literal present)", () => {
  it("makes zero replacements and returns byte-identical output", () => {
    const untouched =
      'function ordinary(e){return e+1}var x="no urls here at all";';
    const { code, count } = stripVendorUrls(untouched);
    expect(count).toBe(0);
    expect(code).toBe(untouched);
  });
});

describe("stripVendorUrls — SSR fallback origin (localhost)", () => {
  it("replaces the unreachable-in-browser default origin with a host-less file:/// base", () => {
    const fixture =
      'function kx(e,t,r=!1){let n="http://localhost";e&&(n=e.location.origin!=="null"?e.location.origin:e.location.href)}';
    const { code, count } = stripVendorUrls(fixture, [
      LOCALHOST_ORIGIN_REPLACEMENT,
    ]);
    expect(count).toBe(1);
    expect(code).not.toContain("http://localhost");
    expect(code).toContain('let n="file:///"');
    expect(code).not.toMatch(/https?:\/\//);
  });

  it("does not touch an unrelated bare 'localhost' with no scheme", () => {
    const fixture = 'if (host === "localhost:3000") { /* dev only */ }';
    const { code, count } = stripVendorUrls(fixture, [
      LOCALHOST_ORIGIN_REPLACEMENT,
    ]);
    expect(count).toBe(0);
    expect(code).toBe(fixture);
  });
});

describe("stripVendorUrls — CSS attribution banner (tailwindcss.com)", () => {
  it("replaces the bare URL inside Tailwind's `/*! ... */` legal comment, keeps the rest", () => {
    const fixture =
      "/*! tailwindcss v4.3.3 | MIT License | https://tailwindcss.com */@layer properties{}";
    const { code, count } = stripVendorUrls(fixture, [
      CSS_ATTRIBUTION_REPLACEMENT,
    ]);
    expect(count).toBe(1);
    expect(code).toBe(
      "/*! tailwindcss v4.3.3 | MIT License | the Tailwind CSS project */@layer properties{}"
    );
  });
});

describe("stripVendorUrlsPlugin — closeBundle hook contract", () => {
  // The plugin operates on files Vite has already written to `outDir`
  // (see the module docblock for why `renderChunk`/`generateBundle` were
  // abandoned: Rollup threads those hooks through every plugin for the
  // SAME chunk in resolved order, and `enforce: "post"` still ran before
  // Vite's own minifier in practice — verified against a real `vite
  // build`, where the Redux entries' `${e}` only exists post-minify).
  // These tests exercise `configResolved` + `closeBundle` against a real
  // temp directory on disk, the same contract Vite drives the plugin
  // through.
  let tmpDir;

  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = undefined;
  });

  function makeTmpOutDir(files) {
    tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "strip-vendor-urls-test-")
    );
    for (const [rel, content] of Object.entries(files)) {
      const full = path.join(tmpDir, rel);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, content, "utf8");
    }
    return tmpDir;
  }

  it("leaves untouched files byte-identical", async () => {
    const dir = makeTmpOutDir({
      "entry-app-XYZ.js": "var x=1;",
    });
    const plugin = stripVendorUrlsPlugin();
    plugin.configResolved({ root: dir, build: { outDir: dir } });
    await plugin.closeBundle();
    expect(fs.readFileSync(path.join(dir, "entry-app-XYZ.js"), "utf8")).toBe(
      "var x=1;"
    );
  });

  it("rewrites a .js file containing the localhost fallback origin", async () => {
    const dir = makeTmpOutDir({
      "entry-app-XYZ.js": 'let n="http://localhost";',
    });
    const plugin = stripVendorUrlsPlugin();
    plugin.configResolved({ root: dir, build: { outDir: dir } });
    await plugin.closeBundle();
    const out = fs.readFileSync(path.join(dir, "entry-app-XYZ.js"), "utf8");
    expect(out).toContain('let n="file:///"');
    expect(out).not.toMatch(/https?:\/\//);
  });

  it("rewrites a nested .css file's Tailwind attribution banner (assets/assets/*)", async () => {
    const dir = makeTmpOutDir({
      "assets/app-ABC.css":
        "/*! tailwindcss v4.3.3 | MIT License | https://tailwindcss.com */",
    });
    const plugin = stripVendorUrlsPlugin();
    plugin.configResolved({ root: dir, build: { outDir: dir } });
    await plugin.closeBundle();
    const out = fs.readFileSync(path.join(dir, "assets/app-ABC.css"), "utf8");
    expect(out).toBe(
      "/*! tailwindcss v4.3.3 | MIT License | the Tailwind CSS project */"
    );
  });

  it("rewrites the Redux/Redux Toolkit error-index URLs even when the interpolated identifier is not literally 'e'", async () => {
    // Simulates a future minifier picking a different short name for the
    // same parameter — the whole reason the Redux/Redux-Toolkit rows are
    // regex-based instead of hardcoded to "${e}".
    const dir = makeTmpOutDir({
      "entry-app-XYZ.js":
        'function Lt(zz){return`Minified Redux error #${zz}; visit https://redux.js.org/Errors?code=${zz} for the full message`}',
    });
    const plugin = stripVendorUrlsPlugin();
    plugin.configResolved({ root: dir, build: { outDir: dir } });
    await plugin.closeBundle();
    const out = fs.readFileSync(path.join(dir, "entry-app-XYZ.js"), "utf8");
    expect(out).toContain("visit the Redux error index for");
    expect(out).not.toContain("redux.js.org");
  });

  it("ignores non-.js/.css files under outDir", async () => {
    const dir = makeTmpOutDir({
      "manifest.json": '{"note":"http://localhost should not be touched"}',
    });
    const plugin = stripVendorUrlsPlugin();
    plugin.configResolved({ root: dir, build: { outDir: dir } });
    await plugin.closeBundle();
    expect(fs.readFileSync(path.join(dir, "manifest.json"), "utf8")).toBe(
      '{"note":"http://localhost should not be touched"}'
    );
  });
});
