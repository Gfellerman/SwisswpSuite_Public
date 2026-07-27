/**
 * Authored by: Frontend Specialist
 * Skills: react-patterns, ui-ux-pro-max
 * Date: 2026-03-07
 *
 * Backup — Save, Site Migration, Site Sync
 * All three sub-features are sections within the same Backup page.
 */

import React, { useState } from "react";
import { BackupControl } from "../components/organisms/Backups/BackupControl";
import { BackupList } from "../components/organisms/Backups/BackupList";
import { BackupAutomationsPanel } from "../components/organisms/Backups/BackupAutomationsPanel";
import { CloudStoragePanel } from "../components/organisms/Backups/CloudStoragePanel";
import MigrationStation from "../components/Migration/MigrationStation";
import { useBackups } from "../hooks/useBackups";
import { useSettings } from "../hooks/useSettings";
import { ProUpsellPlaceholder } from "../components/organisms/Upsell/ProUpsellPlaceholder";
import { isProEdition, hasEditionMismatch } from "../lib/edition";
import {
  HardDrive,
  GitMerge,
  RefreshCw,
  ShieldAlert,
  FlaskConical,
  Settings as SettingsIcon,
  Cloud,
  Lock,
} from "lucide-react";

type BackupSection = "backup" | "migration" | "sync";

// Modules gated behind the "Beta Features" toggle in Settings > General.
// Wired to `swisswpsuite_beta_features` ('yes'/'no') via SwissSettings.betaFeatures.
const BETA_SECTIONS: ReadonlySet<BackupSection> = new Set([
  "migration",
  "sync",
]);

const SyncManager = React.lazy(() => import("../components/Sync/SyncManager"));

const BackupsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<BackupSection>("backup");
  const { backups } = useBackups();
  const { settings } = useSettings();
  const betaEnabled = settings?.betaFeatures === true;
  // Freemium Dual-Build (Phase 3, 2026-07-17): Sync and Migration are fully
  // Pro-local features, physically absent from the Free zip. This takes
  // priority over the beta flag — turning on Beta Features in a Free
  // install cannot unlock code that isn't there. Cloud Backup (below) is
  // similarly Pro-only; local Backup/Restore is free and unaffected.
  const isProEditionBuild = isProEdition();

  const isBetaSection = (id: BackupSection) => BETA_SECTIONS.has(id);
  const isBetaLocked = (id: BackupSection) => isBetaSection(id) && !betaEnabled;

  const BetaBadge: React.FC<{ className?: string }> = ({ className = "" }) => (
    <span
      className={`inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-800 uppercase dark:border-amber-800/50 dark:bg-amber-900/30 dark:text-amber-300 ${className}`}
      aria-label="Beta feature"
    >
      <FlaskConical className="h-2.5 w-2.5" aria-hidden="true" />
      Beta
    </span>
  );

  // Freemium Dual-Build: in the Free edition, Migration/Sync are Pro-local
  // (physically absent), so the nav shows a "Pro" badge — never "Beta" — to
  // stay coherent with the ProUpsellPlaceholder shown in the panel body.
  const ProBadge: React.FC<{ className?: string }> = ({ className = "" }) => (
    <span
      className={`inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-indigo-800 uppercase dark:border-indigo-800/50 dark:bg-indigo-900/30 dark:text-indigo-300 ${className}`}
      aria-label="Pro feature"
    >
      <Lock className="h-2.5 w-2.5" aria-hidden="true" />
      Pro
    </span>
  );

  const BetaGate: React.FC<{ feature: string }> = ({ feature }) => (
    <div
      role="region"
      aria-label={`${feature} is a Beta feature`}
      className="flex flex-col items-start gap-4 rounded-xl border border-amber-200 bg-amber-50/80 p-6 sm:flex-row dark:border-amber-800 dark:bg-amber-900/10"
    >
      <FlaskConical
        className="mt-0.5 h-6 w-6 flex-shrink-0 text-amber-600"
        aria-hidden="true"
      />
      <div className="flex-1">
        <h3 className="flex items-center gap-2 text-base font-semibold text-amber-900 dark:text-amber-200">
          {feature} is a Beta feature
          <BetaBadge />
        </h3>
        <p className="mt-1.5 max-w-2xl text-sm text-amber-800 dark:text-amber-300">
          This module is still in active testing. To try it, enable{" "}
          <strong>Beta Features</strong> in Settings &rarr; General. You can
          turn it off again at any time — your data is not affected.
        </p>
        <a
          href="#/settings"
          className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-700 focus:ring-2 focus:ring-amber-500/60 focus:outline-none"
        >
          <SettingsIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Open Settings
        </a>
      </div>
    </div>
  );

  const BetaBanner: React.FC<{ feature: string }> = ({ feature }) => (
    <div
      role="note"
      className="flex items-start gap-3 rounded-lg border border-amber-200/70 bg-amber-50/60 p-3 text-sm dark:border-amber-800/50 dark:bg-amber-900/10"
    >
      <FlaskConical
        className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600"
        aria-hidden="true"
      />
      <p className="text-amber-800 dark:text-amber-300">
        <strong>{feature}</strong> is a Beta feature. It works in our testing,
        but edge cases may exist. Please back up your site before using it.
      </p>
    </div>
  );

  const sections: {
    id: BackupSection;
    label: string;
    icon: React.ElementType;
    desc: string;
  }[] = [
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

  return (
    <div className="animate-in fade-in space-y-8 duration-500">
      <header>
        <h1 className="dark:text-foreground flex items-center gap-3 text-3xl font-bold text-gray-900">
          <HardDrive className="h-8 w-8 text-emerald-500" />
          Backup
        </h1>
        <p className="text-muted-foreground mt-2 max-w-3xl">
          Backup, migrate, and synchronize your WordPress site — all in one
          place.
        </p>
      </header>

      {/* Sub-section Navigator */}
      <div className="bg-secondary dark:bg-card/50 flex w-fit flex-col gap-2 rounded-xl p-1 sm:flex-row">
        {sections.map((section) => {
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
                  {isBetaSection(section.id) &&
                    (isProEditionBuild ? <BetaBadge /> : <ProBadge />)}
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
          <BackupAutomationsPanel />
          {isProEditionBuild ? (
            <CloudStoragePanel />
          ) : (
            <ProUpsellPlaceholder
              feature="Cloud Backup"
              variant="compact"
              icon={Cloud}
              description="Upload backups automatically to your own Google Drive, Dropbox, S3, Backblaze B2, or FTP/SFTP storage — off-site, so a server issue can't take your backups with it."
              bullets={[
                "Google Drive, S3, Backblaze B2, Dropbox & FTP/SFTP",
                "Automatic upload after every scheduled backup",
                "Your own storage account — nothing passes through our servers",
              ]}
              editionMismatch={hasEditionMismatch(settings?.license)}
            />
          )}
        </div>
      )}

      {/* Site Migration Section — Beta (Pro edition only) */}
      {activeSection === "migration" && (
        <div className="animate-in fade-in space-y-4 duration-300">
          {!isProEditionBuild ? (
            <ProUpsellPlaceholder
              feature="Site Migration"
              icon={GitMerge}
              description="Move your whole site — files, database, media, themes and plugins — to a new host or domain in a guided, chunked transfer built for shared hosting."
              bullets={[
                "Guided host-to-host or domain-to-domain transfer",
                "Chunked upload — safe on shared-hosting request limits",
                "Post-migration health check confirms the new site works",
              ]}
              editionMismatch={hasEditionMismatch(settings?.license)}
            />
          ) : isBetaLocked("migration") ? (
            <BetaGate feature="Site Migration" />
          ) : (
            <>
              <BetaBanner feature="Site Migration" />
              <MigrationStation onCancel={() => setActiveSection("backup")} />
            </>
          )}
        </div>
      )}

      {/* Site Sync Section — Beta (Pro edition only) */}
      {activeSection === "sync" && (
        <div className="animate-in fade-in space-y-4 duration-300">
          {!isProEditionBuild ? (
            <ProUpsellPlaceholder
              feature="Site Synchronisation"
              icon={RefreshCw}
              description="Keep a staging site and your live site in sync — push content changes both ways with a diff view before anything is applied."
              bullets={[
                "Two-way content sync between staging and live",
                "Diff-based push — review changes before they apply",
                "Scheduled sync + full connection/activity logs",
              ]}
              editionMismatch={hasEditionMismatch(settings?.license)}
            />
          ) : isBetaLocked("sync") ? (
            <BetaGate feature="Site Synchronisation" />
          ) : (
            <>
              <BetaBanner feature="Site Synchronisation" />
              <React.Suspense
                fallback={
                  <div className="flex h-48 items-center justify-center text-neutral-700">
                    Loading Sync...
                  </div>
                }
              >
                <SyncManager />
              </React.Suspense>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default BackupsPage;
