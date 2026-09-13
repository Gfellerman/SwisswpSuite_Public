/**
 * Tree-wide source assertion: nothing under `src/` expresses a spending
 * allowance, an affordability check, a Payment-Required response, or a
 * destination this build cannot write a backup to.
 *
 * The needles are assembled from fragments at runtime so that this file does
 * not itself contain the literals it forbids — a source-content test that
 * quotes its own subject matter becomes a hit for the very census it exists
 * to keep at zero. (Recurring trap: the same mistake was made four times in
 * one earlier session.)
 *
 * Fail-first (CLAUDE.md §0.5 rule 1): against the pre-fix tree every
 * assertion below fails — `hooks/useTokenBalance.ts` declares `packBalance`
 * and `canAfford`, `lib/securityHubAiProCopy.ts` and `services/api.ts` carry
 * the exhausted-allowance sentence and the 402 branch, `SecurityHub.tsx`
 * calls the three analysis endpoints and `/update-guard/status`,
 * `ScanResultPanel.tsx` reads the two vulnerability-database status fields,
 * and `BackupControl.tsx`/`BackupList.tsx` name five off-site providers.
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

/** Allowance vocabulary, joined at runtime. */
const ALLOWANCE = [
  ["useToken", "Balance"],
  ["can", "Afford"],
  ["tokens", "Needed"],
  ["pack", "Balance"],
  ["totalSpend", "able"],
  ["balance_", "remaining"],
  ["status === ", "402"],
  ["Not enough AI ", "tokens"],
  ["tokens (", "balance:"],
].map((parts) => parts.join(""));

/** Endpoints this build does not register. */
const ENDPOINTS = [
  ["/security/analyze-", "file"],
  ["/security/analyze-", "logs"],
  ["/security/analyze-", "firewall"],
  ["/update-guard/", "status"],
].map((parts) => parts.join(""));

/** Response fields this build's scan does not produce. */
const SCAN_FIELDS = [
  ["wpscan_", "status"],
  ["patchstack_", "status"],
].map((parts) => parts.join(""));

/** Off-site destinations this build cannot write to. */
const DESTINATIONS = [
  ["Google ", "Drive"],
  ["Back", "blaze B2"],
  ["Amazon ", "S3"],
  ["Drop", "box"],
].map((parts) => parts.join(""));

function hits(needle: string): string[] {
  return CORPUS.filter(({ s }) => s.includes(needle)).map(({ f }) =>
    path.relative(process.cwd(), f)
  );
}

describe("src/ — no spending-allowance vocabulary", () => {
  it("positive control: the corpus is non-empty and readable", () => {
    expect(FILES.length).toBeGreaterThan(50);
    expect(hits("export")).not.toHaveLength(0);
  });

  it("positive control: the matcher finds a string that is really there", () => {
    expect(hits(["wp", "Api"].join(""))).not.toHaveLength(0);
  });

  it.each(ALLOWANCE)("no source file references %j", (needle) => {
    expect(hits(needle)).toEqual([]);
  });

  it.each(ENDPOINTS)("no source file calls %j", (needle) => {
    expect(hits(needle)).toEqual([]);
  });

  it.each(SCAN_FIELDS)("no source file reads %j", (needle) => {
    expect(hits(needle)).toEqual([]);
  });

  it.each(DESTINATIONS)("no source file names %j", (needle) => {
    expect(hits(needle)).toEqual([]);
  });
});
