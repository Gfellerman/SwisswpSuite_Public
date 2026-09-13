/**
 * Backup-page copy and section list.
 */
import { HardDrive } from "lucide-react";
import type React from "react";

export interface BackupSectionDef {
  id: string;
  label: string;
  icon: React.ElementType;
  desc: string;
}

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
