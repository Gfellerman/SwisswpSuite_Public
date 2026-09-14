/**
 * Vitest coverage for scanResultExtras.tsx (Free build).
 *
 * The Free deep scan orchestrator writes only `status: 'ok'` per phase
 * (`enumerate`, `local_scan`) — it never produces `unavailable`,
 * `degraded_*` or `rate_limited`. This file must type and render exactly
 * what this build produces, with any unrecognized status string handled
 * by a generic fallback that never assumes a status this build cannot
 * emit.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildScanPhasePills } from "./scanResultExtras";

describe("scanResultExtras (Free)", () => {
  it("builds a pill for each Free phase the deep scan actually produces (enumerate + local_scan, both 'ok')", () => {
    const result = {
      phases: {
        enumerate: { status: "ok" },
        local_scan: { status: "ok" },
      },
    };

    const pills = buildScanPhasePills(result);

    expect(pills).toEqual([
      { label: "File list", value: "ok" },
      { label: "Signature scan", value: "ok" },
    ]);
  });

  it("carries no phase-status vocabulary this build never produces, in source (positive control: 'local_scan' is present)", () => {
    // `new URL(rel, import.meta.url)` resolves relative to the test
    // runner's own root under Vitest, not this file's directory — resolve
    // from process.cwd() (vitest always runs from `plugin/`) instead.
    const filePath = resolve(
      process.cwd(),
      "src/components/organisms/Scan/scanResultExtras.tsx"
    );
    const source = readFileSync(filePath, "utf8");

    // Positive control — proves this read/match approach can find something
    // in this exact file before trusting the negative assertion below.
    expect(source).toContain("local_scan");

    expect(source).not.toMatch(/degraded|rate_limited|unavailable/);
  });
});
