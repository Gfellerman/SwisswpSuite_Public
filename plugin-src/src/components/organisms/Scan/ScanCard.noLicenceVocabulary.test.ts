/**
 * WP.org R14 remediation, Lane E2 (v2.9.33.54) — source-content regression
 * lock for ScanCard.tsx.
 *
 * Why a source-content assertion instead of a render test: TierBadge (the
 * component that used to render "NO LICENSE") is an unexported, internal
 * sub-component driven by SCAN_TIER[scanType] — a static, per-scan-type
 * value that (per scanConstants.ts, verified) is only ever "free" or "pro",
 * never "none". There is no live call path that can pass tier="none" to
 * exercise a render-based assertion; the defect was that the string still
 * COMPILED into this shared, unaliased file (it ships in the Free bundle
 * regardless of whether the branch ever executes — see
 * docs/architecture/FREEMIUM_DUAL_BUILD_ARCHITECTURE.md's physical-
 * exclusion doctrine). A source-content check is the correct test for a
 * compiled-but-unreachable string, matching this project's own
 * FREE_BUNDLE_STRING_CENSUS methodology.
 *
 * Fail-first (CLAUDE.md §0.5 rule 1): run against the pre-fix file (which
 * declared `labels: Record<typeof tier, string> = { pro: "PRO", free:
 * "FREE", none: "NO LICENSE" }`) — this test fails. After removing the
 * "none"/"NO LICENSE" case, it passes.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, it, expect } from "vitest";

// NOTE: deliberately NOT `new URL("./ScanCard.tsx", import.meta.url)` —
// Vite's bundler special-cases that exact expression shape as an asset-URL
// reference (it rewrites it to the dev-server origin, e.g.
// "http://localhost:3000/..."), which is not a filesystem path. Using
// process.cwd() (Vitest's cwd is the plugin/ package root) avoids that
// transform entirely.
const SOURCE = readFileSync(
  path.join(process.cwd(), "src/components/organisms/Scan/ScanCard.tsx"),
  "utf-8"
);

describe("ScanCard.tsx — no licence vocabulary in source", () => {
  it('never declares the "NO LICENSE" label string', () => {
    expect(SOURCE).not.toContain("NO LICENSE");
  });

  it('never declares a "none" tier variant of the badge', () => {
    // The dead branch used the literal key `none:` inside the styles/labels
    // Records — assert neither survives, not just the label string above.
    expect(SOURCE).not.toMatch(/\bnone:\s*["'`]/);
  });
});
