/**
 * WP.org R14 remediation round 10, Lane E28-REACT (v2.9.33.58) —
 * source-content regression lock for BackupList.tsx.
 *
 * The reviewer flagged "Backups are kept until you delete them manually" as
 * a statement contradicted by the code: SwissWPSuite_Backup_Engine::
 * enforce_retention() (class-swisswpsuite-backup-engine.php) prunes to the
 * `swisswpsuite_backup_retention_count` option (default 10) on every
 * completed run — nothing here is kept "until you delete it manually".
 *
 * Fail-first (CLAUDE.md §0.5 rule 1): run against the pre-fix file (which
 * declared the old string twice — the pill `title` attribute and the
 * footer paragraph) — this test fails. After the reword, it passes.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, it, expect } from "vitest";

// process.cwd() is vitest's package root (plugin/), not this file's own
// directory — see ScanCard.noLicenceVocabulary.test.ts for why a literal
// `new URL(..., import.meta.url)` is avoided here.
const SOURCE = readFileSync(
  path.join(
    process.cwd(),
    "src/components/organisms/Backups/BackupList.tsx"
  ),
  "utf-8"
);

describe("BackupList.tsx (Free) — retention wording matches the engine", () => {
  it('never claims backups are "kept until you delete them manually"', () => {
    expect(SOURCE).not.toContain(
      "Backups are kept until you delete them manually"
    );
  });

  it("states the actual 10-backup retention budget the engine enforces", () => {
    expect(SOURCE).toContain(
      "The 10 most recent backups are kept; older ones are removed"
    );
  });
});
