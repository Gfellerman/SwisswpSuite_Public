/**
 * Tree-wide source assertion: nothing under `src/` tells a user that a
 * feature or an action belongs to a different build of this plugin.
 *
 * The strings and identifiers are assembled from fragments at runtime so
 * that this file does not itself contain the literals it forbids — a
 * source-content test that quotes its own subject matter becomes a hit for
 * the very census it exists to keep at zero.
 *
 * Fail-first (CLAUDE.md §0.5 rule 1): run against the pre-fix tree, where
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
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
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
