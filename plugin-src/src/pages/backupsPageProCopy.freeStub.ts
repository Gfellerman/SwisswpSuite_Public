/**
 * Free-edition stub for backupsPageProCopy.ts (ARS Round C P1-21 / F-41,
 * 2026-08-23). Wired via vite.config.ts's resolve.alias, active only when
 * EDITION === 'free'.
 *
 * Migration and Sync are physically absent from the Free zip (see
 * ../lib/edition.ts), so this build never has a "locked" tab to show for
 * them — the tab list carries only the one section that actually works,
 * and the header describes what this edition genuinely does instead of
 * promising migrate/sync "all in one place".
 */
import { HardDrive } from "lucide-react";
import type { BackupSectionDef } from "./backupsPageProCopy";

export const BACKUP_PAGE_DESCRIPTION =
  "Back up and restore your WordPress site";

export const BACKUP_SECTIONS: BackupSectionDef[] = [
  {
    id: "backup",
    label: "Backups",
    icon: HardDrive,
    desc: "Save and restore copies of your site",
  },
];
