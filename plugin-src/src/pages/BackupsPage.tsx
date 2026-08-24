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
import { BetaGate, BetaBanner } from "../components/organisms/Backups/BetaFeatureGate";
import MigrationStation from "../components/Migration/MigrationStation";
import { useBackups } from "../hooks/useBackups";
import { useSettings } from "../hooks/useSettings";
import { FeaturePointer } from "../components/organisms/Upsell/FeaturePointer";
import { isProEdition } from "../lib/edition";
import {
  BACKUP_PAGE_DESCRIPTION,
  BACKUP_SECTIONS,
} from "./backupsPageProCopy";
import { HardDrive, ShieldAlert, FlaskConical } from "lucide-react";

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

  // ARS Round C P1-21 (F-41, 2026-08-23): the "Locked — Not included in
  // this edition" ProBadge that used to render here for the migration/sync
  // tabs is REMOVED. It is provably dead in both editions now: BACKUP_SECTIONS
  // (below, from backupsPageProCopy) freeStubs down to a single "backup"
  // entry in Free — never in BETA_SECTIONS — so isBetaSection() is never
  // true for anything Free actually iterates over; in Pro, isProEditionBuild
  // is always true, so the render below always picks BetaBadge, never
  // ProBadge, regardless of BACKUP_SECTIONS' contents. Deleting the
  // component (not just its call site) removes the "Locked"/"Not included
  // in this edition" strings from the Free bundle's bytes, per this
  // project's string-presence doctrine (see backupsPageProCopy.ts).

  // BetaGate/BetaBanner extracted to BetaFeatureGate.tsx (ARS Round D delta
  // M1, 2026-08-24) — see that file's docblock. Aliased to a null-rendering
  // stub in the Free build so the "Beta Features" copy is physically
  // absent from the Free bundle (this file itself is not aliasable — it
  // hosts the always-free local Backup/Restore feature).

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
                  {isBetaSection(section.id) && isProEditionBuild && (
                    <BetaBadge />
                  )}
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
            // Upsell redesign (2026-08-04, design point 1/2): the compact
            // "Cloud Backup" ProUpsellPlaceholder (bullets + CTA pair) is
            // removed — cloud destinations are a local, non-AI Pro feature,
            // so this section carries one neutral "edition" FeaturePointer.
            <FeaturePointer variant="edition" />
          )}
        </div>
      )}

      {/* Site Migration Section — Beta (Pro edition only) */}
      {activeSection === "migration" && (
        <div className="animate-in fade-in space-y-4 duration-300">
          {!isProEditionBuild ? (
            // Upsell redesign (2026-08-04, design point 1/2): the full
            // "Site Migration" ProUpsellPlaceholder is removed — Migration
            // is a local, non-AI Pro feature, so this sub-tab carries one
            // neutral "edition" FeaturePointer.
            <FeaturePointer variant="edition" />
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
            // Upsell redesign (2026-08-04, design point 1/2): the full
            // "Site Synchronisation" ProUpsellPlaceholder is removed — Sync
            // is a local, non-AI Pro feature, so this sub-tab carries one
            // neutral "edition" FeaturePointer.
            <FeaturePointer variant="edition" />
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
