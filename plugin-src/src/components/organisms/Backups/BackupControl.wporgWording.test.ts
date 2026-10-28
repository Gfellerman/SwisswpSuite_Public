/**
 * Source-content regression lock for BackupControl.tsx, added for STEP 4.2
 * (v2.9.33.61, design B′ — FIX_PLAN_L6X_VALIDATED.md §5c): the database
 * restore leaves the Free edition. The backup-type descriptions shown when
 * picking what to back up used to describe what happens on RESTORE, and
 * promised this build would import the database dump inside a backup
 * ("your database too — a safety copy of your current database is saved
 * first") or implied a one-click restore ("Good for a quick save before
 * editing content"). This build's restorer never imports a dump — it
 * writes nothing and returns db_restored:false — so these descriptions
 * must not promise an import the plugin cannot perform.
 *
 * Fail-first: run against the pre-fix file (which still carried "your
 * database too — a safety copy of your current database is saved first"
 * and "Good for a quick save before editing content") — this test fails.
 * After the reword, it passes.
 *
 * Pattern follows BackupList.wporgWording.test.ts (plain source-content
 * assertions via readFileSync, no component render needed).
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, it, expect } from "vitest";

const SOURCE = readFileSync(
  path.join(
    process.cwd(),
    "src/components/organisms/Backups/BackupControl.tsx"
  ),
  "utf-8"
);

describe("BackupControl.tsx (Free) — backup-type descriptions never promise a database import", () => {
  it('never claims a restore brings "your database too" back with a safety copy', () => {
    expect(SOURCE).not.toContain(
      "your database too — a safety copy of your current database is saved first"
    );
  });

  it('never describes the database-only backup as a one-click "quick save" the restore flow delivers', () => {
    expect(SOURCE).not.toContain(
      "Good for a quick save before editing content"
    );
  });

  it('the "Everything" description states the database copy is not imported', () => {
    expect(SOURCE).toContain(
      "Restoring this backup restores your files; the database copy inside it is not imported, so your current database is not replaced."
    );
  });

  it('the "Content Only" description tells the user to import the database themselves', () => {
    expect(SOURCE).toContain(
      "This plugin does not import that database back for you; you would use your hosting provider's database tool (for example phpMyAdmin) to bring it back yourself."
    );
  });

  it("carries no Pro/upgrade vocabulary (the one upsell link lives in Settings only)", () => {
    expect(SOURCE).not.toMatch(/\bPro\b/);
    expect(SOURCE.toLowerCase()).not.toMatch(
      /\b(upgrade|unlock|subscription)\b/
    );
  });
});
