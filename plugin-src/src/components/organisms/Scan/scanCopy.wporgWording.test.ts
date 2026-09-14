/**
 * Source-content regression lock for scanCopy.ts (Free).
 *
 * An earlier fix corrected this module's wording accuracy (the
 * enumeration cap and the daily-cadence gate). A later reviewer pass found
 * a second, structural issue: SECURITY_AUDIT_DESCRIPTION and
 * MALWARE_DESCRIPTION named a "Security Audit" / "Malware Scan" the Free
 * Scan tab has no card for — runScan()'s "security-audit" and "malware"
 * branches are gone (SecurityHub.tsx's handleTriggerScan now only accepts
 * "deep-malware"), and SCAN_TYPES (scanConstants.ts) carries the single
 * "deep-malware" key, so those two paragraphs described scans nothing on
 * the screen can start. Both exports are gone; the deep-malware
 * description alone carries the on-demand + daily-quick-audit facts, since
 * it is the only card this build renders.
 *
 * Fail-first: reverting DEEP_SCAN_DESCRIPTIONS'
 * "deep-malware" entry to drop the "On demand" / daily-audit clauses, or
 * reintroducing SECURITY_AUDIT_DESCRIPTION / MALWARE_DESCRIPTION, fails the
 * assertions below.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, it, expect } from "vitest";

const SOURCE = readFileSync(
  path.join(process.cwd(), "src/components/organisms/Scan/scanCopy.ts"),
  "utf-8"
);

describe("scanCopy.ts (Free) — scan-scope and cadence wording matches the code", () => {
  it('deep-scan description never claims "every" PHP file is enumerated', () => {
    expect(SOURCE).not.toMatch(/enumerates every PHP file/);
  });

  it("deep-scan description states the real 5,000-file / 2 MB enumeration cap", () => {
    expect(SOURCE).toContain(
      "scans up to 5,000 PHP files (2 MB each) in your active plugins, active theme, and uploads folder"
    );
  });

  it("deep-scan description states it runs on demand", () => {
    expect(SOURCE).toMatch(/"deep-malware":\s*\n?\s*"On demand,/);
  });

  it("deep-scan description states the daily quick audit is gated on the scan report e-mail option", () => {
    expect(SOURCE).toContain(
      "A daily quick audit also runs automatically once the scan report e-mail is switched on."
    );
  });

  it("carries no separate security-audit/malware promise — this build has one scan card", () => {
    expect(SOURCE).not.toContain("SECURITY_AUDIT_DESCRIPTION");
    expect(SOURCE).not.toContain("MALWARE_DESCRIPTION");
  });
});
