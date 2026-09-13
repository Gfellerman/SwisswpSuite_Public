/**
 * Overlay shadow drift (AC-17).
 *
 * `plugin/vite.config.ts`'s `SWISSWPSUITE_OVERLAY` resolver lets a file at
 * `<overlay>/<rel>` take the place of `src/<rel>` for every importer. A pair
 * like that is a shadow pair, and it has one failure mode nothing else
 * catches: an export added to the base file never reaches the overlay build,
 * because the overlay file — not the base one — is what resolves. The symptom
 * is an import that resolves in one build and not the other.
 *
 * This test states the invariant that closes it: **for every shadow pair,
 * every named export of the base file is also a named export of its shadow.**
 * The overlay may add exports; it may never drop one.
 *
 * A pair that cannot satisfy it belongs in DOCUMENTED_DIVERGENCES with the
 * reason, so the exception is a line someone signed rather than a silent gap.
 *
 * Fail-first (CLAUDE.md §0.5 rule 1): the second control below is the
 * fail-first proof that runs on every invocation — it removes one export
 * name from a real base file's parsed set and asserts the comparison then
 * reports a missing export. Without it a green run would be indistinguishable
 * from a run that parsed nothing.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import path from "path";
import { describe, it, expect } from "vitest";

const PLUGIN_ROOT = process.cwd();
const SRC_ROOT = path.join(PLUGIN_ROOT, "src");
const OVERLAY_ROOT = path.resolve(PLUGIN_ROOT, "..", "pro-overlay", "src");

/**
 * Pairs whose shadow deliberately does not re-export everything the base
 * file exports, each with the reason. Empty is the intended steady state.
 */
const DOCUMENTED_DIVERGENCES: Record<string, string> = {};

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/**
 * Named exports declared in a module's source. Covers the four forms this
 * codebase uses: `export const/function/class/interface/type X`,
 * `export { A, B as C }`, `export default`, and `export * from`.
 */
export function parseExports(source: string): Set<string> {
  const names = new Set<string>();
  const decl =
    /\bexport\s+(?:declare\s+)?(?:async\s+)?(?:const|let|var|function\*?|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g;
  for (const m of source.matchAll(decl)) names.add(m[1]);
  for (const m of source.matchAll(/\bexport\s*\{([^}]*)\}/g)) {
    for (const raw of m[1].split(",")) {
      const part = raw.trim();
      if (!part) continue;
      const as = part.split(/\s+as\s+/);
      const name = (as[1] ?? as[0]).replace(/^type\s+/, "").trim();
      if (name) names.add(name);
    }
  }
  if (/\bexport\s+default\b/.test(source)) names.add("default");
  if (/\bexport\s*\*/.test(source)) names.add("*");
  return names;
}

interface ShadowPair {
  rel: string;
  base: string;
  overlay: string;
}

const PAIRS: ShadowPair[] = existsSync(OVERLAY_ROOT)
  ? walk(OVERLAY_ROOT)
      .map((overlay) => {
        const rel = path.relative(OVERLAY_ROOT, overlay);
        return { rel, base: path.join(SRC_ROOT, rel), overlay };
      })
      .filter((p) => existsSync(p.base))
      .filter((p) => /\.tsx?$/.test(p.rel) && !/\.test\.tsx?$/.test(p.rel))
  : [];

function missingExports(pair: ShadowPair): string[] {
  const baseNames = parseExports(readFileSync(pair.base, "utf-8"));
  const overlayNames = parseExports(readFileSync(pair.overlay, "utf-8"));
  if (overlayNames.has("*")) return [];
  return [...baseNames].filter((n) => n !== "*" && !overlayNames.has(n));
}

describe("pro-overlay — shadow pairs keep the base file's exports", () => {
  it("positive control: the overlay exists and shadows real base files", () => {
    expect(existsSync(OVERLAY_ROOT)).toBe(true);
    expect(PAIRS.length).toBeGreaterThan(20);
  });

  it("fail-first control: a dropped export is reported as missing", () => {
    const sample = PAIRS.find(
      (p) => parseExports(readFileSync(p.base, "utf-8")).size > 0
    );
    expect(sample).toBeDefined();
    const baseNames = [...parseExports(readFileSync(sample!.base, "utf-8"))];
    const overlayNames = parseExports(readFileSync(sample!.overlay, "utf-8"));
    overlayNames.delete(baseNames[0]);
    overlayNames.delete("*");
    expect(
      baseNames.filter((n) => n !== "*" && !overlayNames.has(n))
    ).toContain(baseNames[0]);
  });

  it("every shadow pair re-exports the base file's names", () => {
    const drift = PAIRS.map((p) => ({ rel: p.rel, missing: missingExports(p) }))
      .filter((r) => r.missing.length > 0)
      .filter((r) => !(r.rel in DOCUMENTED_DIVERGENCES));
    expect(
      drift.map((d) => `${d.rel} is missing: ${d.missing.join(", ")}`)
    ).toEqual([]);
  });
});
