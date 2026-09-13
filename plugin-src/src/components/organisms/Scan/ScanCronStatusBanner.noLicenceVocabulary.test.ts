/**
 * Source-content regression lock for ScanCronStatusBanner.tsx.
 *
 * The banner used to render a tier badge next to the scan schedule. The
 * whole tier concept is gone from this build, so the source must declare
 * neither the badge nor any of its labels.
 *
 * Fail-first: run against the pre-fix file (which imported
 * ./ScanTierIndicator and rendered <ScanTierIndicator tier={tier} />) —
 * fails on the third assertion. After removal, passes.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, it, expect } from "vitest";

// NOTE: deliberately NOT `new URL("./x.tsx", import.meta.url)` — Vite
// special-cases that exact expression shape as an asset-URL reference
// (rewrites it to the dev-server origin, not a filesystem path). Using
// process.cwd() (Vitest's cwd is the plugin/ package root) avoids it.
const SOURCE = readFileSync(
  path.join(
    process.cwd(),
    "src/components/organisms/Scan/ScanCronStatusBanner.tsx"
  ),
  "utf-8"
);

describe("ScanCronStatusBanner.tsx — no tier vocabulary in source", () => {
  it("positive control: the file really was read", () => {
    expect(SOURCE).toContain("ScanCronStatusBanner");
  });

  it('never declares the "NO LICENSE" label string', () => {
    expect(SOURCE).not.toContain("NO LICENSE");
  });

  it("defines no tier badge and imports no tier indicator", () => {
    expect(SOURCE).not.toMatch(/TierBadge|ScanTierIndicator/);
  });

  it("passes no tier through its props", () => {
    expect(SOURCE).not.toMatch(/\bcurrentTier\b/);
  });
});
