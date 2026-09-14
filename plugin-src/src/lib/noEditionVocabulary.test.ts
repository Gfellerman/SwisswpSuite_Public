/**
 * Tree-wide source assertion: nothing under `src/` tells a user that a
 * feature or an action belongs to a different build of this plugin.
 *
 * The corpus includes `*.test.ts(x)` files as well as application source.
 * This build's zip excludes tests, but the published source repository
 * ships them (they are read by anyone reviewing the build) — a comment or
 * fixture in a test file is exactly as visible there as a string in
 * application code, so the census must cover both.
 *
 * The strings and identifiers are assembled from fragments at runtime so
 * that this file does not itself contain the literals it forbids — a
 * source-content test that quotes its own subject matter becomes a hit for
 * the very census it exists to keep at zero. Because the corpus now
 * includes this file itself, that self-exemption is load-bearing, not
 * cosmetic: without the fragment split, every one of this file's own
 * `it.each` titles below would be a permanent, unfixable self-hit.
 *
 * Fail-first: run against the pre-fix tree, where
 * the phrase fragments below appear in several copy modules and the
 * identifiers appear in 30-plus components — every assertion fails.
 */
import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";
import { describe, it, expect } from "vitest";

const ROOT = path.join(process.cwd(), "src");

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      sourceFiles(full, out);
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const FILES = sourceFiles(ROOT);
const CORPUS = FILES.map((f) => ({ f, s: readFileSync(f, "utf-8") }));

/** Phrase fragments, joined at runtime. */
const PHRASES = [
  ["in this ", "edi", "tion"],
  ["Not available in this ", "edi", "tion"],
  ["FREE ", "EDI", "TION"],
].map((parts) => parts.join(""));

/** Identifier fragments, joined at runtime. */
const IDENTIFIERS = [
  ["isPro", "Edition", "Build"],
  ["isPro", "Edition("],
  ["entitlement", "Flags"],
  ["sentinel", "ProSignal"],
  ["free", "Stub"],
].map((parts) => parts.join(""));

function hits(needle: string): string[] {
  return CORPUS.filter(({ s }) => s.includes(needle)).map(({ f }) =>
    path.relative(process.cwd(), f)
  );
}

describe("src/ — no cross-build vocabulary", () => {
  it("positive control: the corpus is non-empty and readable", () => {
    expect(FILES.length).toBeGreaterThan(50);
    expect(hits("export")).not.toHaveLength(0);
  });

  it.each(PHRASES)("no source file contains the phrase %j", (phrase) => {
    expect(hits(phrase)).toEqual([]);
  });

  it.each(IDENTIFIERS)("no source file references %j", (identifier) => {
    expect(hits(identifier)).toEqual([]);
  });
});
