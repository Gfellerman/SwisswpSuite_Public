/**
 * WP.org R14 remediation round 10, Lane E27-REACT (v2.9.33.58) —
 * source-content regression lock for seoHealthAdvice.tsx.
 *
 * The FAQ scoring dimension (`faq_bonus` field + its advice sentence) moved
 * to the Pro package (pro-overlay/src/components/organisms/Seo/
 * seoHealthAdvice.tsx keeps it, backed by
 * pro-overlay/src/types.pro.ts#ProSeoScanResultFields). The Free module must
 * carry no reference to it — a compiled-but-unreachable string still ships
 * in the Free bundle (ZC-RULE), so this is a source-content check, matching
 * this project's FREE_BUNDLE_STRING_CENSUS methodology, not a render test.
 *
 * Fail-first (CLAUDE.md §0.5 rule 1): run against the pre-fix file (which
 * declared `if (scanResult.faq_bonus < 5) { parts.push(\`Adding FAQ
 * content can earn up to ...\`); }`) — this test fails. After removing the
 * faq_bonus branch, it passes.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, it, expect } from "vitest";

// NOTE: deliberately NOT `new URL("./seoHealthAdvice.tsx", import.meta.url)`
// — Vite's bundler special-cases that exact expression shape as an
// asset-URL reference (rewritten to the dev-server origin, not a filesystem
// path). Using process.cwd() (Vitest's cwd is the plugin/ package root)
// avoids that transform entirely.
const SOURCE = readFileSync(
  path.join(process.cwd(), "src/components/organisms/Seo/seoHealthAdvice.tsx"),
  "utf-8"
);

describe("seoHealthAdvice.tsx (Free) — no FAQ vocabulary in source", () => {
  it("positive control: still carries its own Free advice wording", () => {
    // Proves the search itself can find something before trusting a zero.
    expect(SOURCE).toContain("Thin Content");
    expect(SOURCE).toContain("150-character target");
  });

  it('never mentions "FAQ" in any casing', () => {
    expect(SOURCE.toLowerCase()).not.toContain("faq");
  });

  it("never references the faq_bonus field", () => {
    expect(SOURCE).not.toContain("faq_bonus");
  });
});
