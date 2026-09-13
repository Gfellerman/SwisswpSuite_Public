/**
 * WP.org R14 remediation round 10, Lane E28-REACT (v2.9.33.58) —
 * source-content regression lock for SecurityLogsPanel.tsx.
 *
 * The reviewer flagged "Only the most recent 50 high-priority security
 * events are shown here." — SwissWPSuite_Api_Security::get_security_logs()
 * (class-swisswpsuite-api-security.php) calls
 * `$security->get_logs( 20 )`, so the endpoint returns 20 rows, not 50.
 *
 * Fail-first (CLAUDE.md §0.5 rule 1): run against the pre-fix file (which
 * still said "50") — this test fails. After the reword to "20", it passes.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, it, expect } from "vitest";

const SOURCE = readFileSync(
  path.join(
    process.cwd(),
    "src/components/organisms/Security/SecurityLogsPanel.tsx"
  ),
  "utf-8"
);

describe("SecurityLogsPanel.tsx — event-count wording matches the endpoint", () => {
  it('never claims "the most recent 50" events are shown', () => {
    expect(SOURCE).not.toContain("most recent 50");
  });

  it('states the endpoint\'s actual limit ("the most recent 20")', () => {
    expect(SOURCE).toContain(
      "Only the most recent 20 high-priority security events are shown here."
    );
  });
});
