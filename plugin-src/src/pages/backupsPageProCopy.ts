/**
 * backupsPageProCopy — BackupsPage.tsx's section-tab list + header
 * description.
 *
 * ARS Round C P1-21 (F-41, 2026-08-23): the Free build rendered "Move to
 * New Host" / "Sync Two Sites" as visible tabs badged "Locked — Not
 * included in this edition" right next to the working "Backups" tab, under
 * a header promising "migrate, and synchronize ... all in one place" — a
 * locked-control presentation inside the free product's own workspace
 * (guidelines/01 §5: "present Pro features as an informational panel, not
 * as locked controls"). Migration and Sync are fully Pro-local (physically
 * absent from the Free zip — see ../lib/edition.ts), so this data is
 * extracted per this project's string-presence doctrine (not just runtime
 * reachability — see scanResultProCopy.ts's docblock for the precedent) so
 * vite.config.ts can alias this module away in the Free build; the
 * freeStub sibling returns only the "backup" entry and edition-honest
 * header copy.
 */
import type React from "react";
import { HardDrive, GitMerge, RefreshCw } from "lucide-react";

export type BackupSectionId = "backup" | "migration" | "sync";

export interface BackupSectionDef {
  id: BackupSectionId;
  label: string;
  icon: React.ElementType;
  desc: string;
}

export const BACKUP_PAGE_DESCRIPTION =
  "Backup, migrate, and synchronize your WordPress site — all in one place.";

export const BACKUP_SECTIONS: BackupSectionDef[] = [
  {
    id: "backup",
    label: "Backups",
    icon: HardDrive,
    desc: "Save and restore copies of your site",
  },
  {
    id: "migration",
    label: "Move to New Host",
    icon: GitMerge,
    desc: "Transfer your site to a different server or domain",
  },
  {
    id: "sync",
    label: "Sync Two Sites",
    icon: RefreshCw,
    desc: "Keep a staging site and a live site in sync",
  },
];
