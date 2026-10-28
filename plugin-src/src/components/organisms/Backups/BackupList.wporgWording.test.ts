/**
 * Source-content regression lock for BackupList.tsx, added after a
 * WordPress.org reviewer flagged a wording inaccuracy.
 *
 * The reviewer flagged "Backups are kept until you delete them manually" as
 * a statement contradicted by the code: SwissWPSuite_Backup_Engine::
 * enforce_retention() (class-swisswpsuite-backup-engine.php) prunes to the
 * `swisswpsuite_backup_retention_count` option (default 10) on every
 * completed run — nothing here is kept "until you delete it manually".
 *
 * Fail-first: run against the pre-fix file (which
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

/**
 * Source-content regression lock added for STEP 4.2 (v2.9.33.61, design B′
 * — FIX_PLAN_L6X_VALIDATED.md §5c): the database restore leaves the Free
 * edition. The restore confirm dialogs here used to promise the plugin
 * would import the database dump inside a backup ("your database will be
 * restored too … a safety copy … is saved first"). This build's restorer
 * (class-swisswpsuite-restorer.php process_database_dump()) never imports
 * a dump — it writes nothing and returns db_restored:false. A confirm
 * dialog that still promised an import would contradict the honest
 * db_notice text the same restore then shows.
 *
 * Fail-first: run against the pre-fix file (which still carried "your
 * database will be restored too" in both handleRestore() and
 * handleRestoreSet()) — this test fails. After the reword, it passes.
 */
describe("BackupList.tsx (Free) — restore confirm dialogs never promise a database import", () => {
  it("never claims a restore will bring the database back", () => {
    expect(SOURCE).not.toContain("your database will be restored too");
    expect(SOURCE).not.toContain(
      "a safety copy of your current database is saved first"
    );
  });

  it("the single-file restore confirm states the database is not imported", () => {
    expect(SOURCE).toContain(
      "This will replace your current files with the files in the backup file ${backup.name}. Your existing files will be overwritten. If it holds a database copy, that copy is not imported; your current database is not replaced. This cannot be undone."
    );
    // A continuation part holds no database copy, so the text must not presume one.
    expect(SOURCE).not.toContain("The database copy inside this backup");
  });

  it("the set restore confirm states the database is not imported", () => {
    expect(SOURCE).toContain(
      'the site files in it will be restored to disk. If it also holds a database copy, that copy is not imported; your current database is not replaced. This cannot be undone.`'
    );
  });

  it("carries no Pro/upgrade vocabulary (the one upsell link lives in Settings only)", () => {
    expect(SOURCE).not.toMatch(/\bPro\b/);
    expect(SOURCE.toLowerCase()).not.toMatch(
      /\b(upgrade|unlock|subscription)\b/
    );
  });
});
