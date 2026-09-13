/**
 * Authored by: Frontend Specialist
 * Skills: react-patterns, ui-ux-pro-max
 * Date: 2026-03-07
 *
 * Backup page — local save and restore.
 */

import React, { useState } from "react";
import { BackupControl } from "../components/organisms/Backups/BackupControl";
import { BackupList } from "../components/organisms/Backups/BackupList";
import { useBackups } from "../hooks/useBackups";
import { BACKUP_PAGE_DESCRIPTION, BACKUP_SECTIONS } from "./backupsPageProCopy";
import { HardDrive, ShieldAlert } from "lucide-react";

type BackupSection = string;

const BackupsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<BackupSection>("backup");
  const { backups } = useBackups();

  return (
    <div className="animate-in fade-in space-y-8 duration-500">
      <header>
        <h1 className="dark:text-foreground flex items-center gap-3 text-3xl font-bold text-gray-900">
          <HardDrive className="h-8 w-8 text-emerald-500" />
          Backup
        </h1>
        <p className="text-muted-foreground mt-2 max-w-3xl">
          {BACKUP_PAGE_DESCRIPTION}
        </p>
      </header>

      {/* Sub-section Navigator */}
      <div className="bg-secondary dark:bg-card/50 flex w-fit flex-col gap-2 rounded-xl p-1 sm:flex-row">
        {BACKUP_SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              aria-label={`${section.label}: ${section.desc}`}
              aria-pressed={isActive}
              className={`flex min-h-[44px] items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium transition-all duration-200 focus:ring-2 focus:ring-blue-500/50 focus:outline-none ${
                isActive
                  ? "bg-card dark:bg-secondary dark:text-foreground text-neutral-900 shadow-sm"
                  : "dark:hover:text-foreground text-neutral-700 hover:text-neutral-700"
              } `}
            >
              <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span className="text-left">
                <span className="block flex items-center gap-1.5">
                  {section.label}
                </span>
                <span className="text-muted-foreground block text-[11px] leading-tight font-normal">
                  {section.desc}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Backup Section — full-width vertical stack */}
      {activeSection === "backup" && (
        <div className="space-y-8">
          {/* First-time user callout — P0 */}
          {backups.length === 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-800 dark:bg-amber-900/10">
              <ShieldAlert
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  Your site has no backup yet.
                </p>
                <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                  If something goes wrong — a bad plugin update, an accidental
                  deletion, a hack — you'll have nothing to restore from. Create
                  your first backup now. It takes about 2–5 minutes.
                </p>
              </div>
            </div>
          )}
          <BackupControl />
          <BackupList />
        </div>
      )}
    </div>
  );
};

export default BackupsPage;
