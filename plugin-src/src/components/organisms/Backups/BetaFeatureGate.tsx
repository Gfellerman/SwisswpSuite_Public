import React from "react";
import { FlaskConical, Settings as SettingsIcon } from "lucide-react";

/**
 * BetaFeatureGate — the Sync/Migration "this is a Beta feature" gate + banner
 * pair, extracted out of BackupsPage.tsx.
 *
 * ARS Round D delta (M1, SOCRATIC_AUDIT_ROUND_D.md MEDIUM-1, DELTA_PLAN_R4.md
 * DX-2, 2026-08-24): `BetaGate`/`BetaBanner` were defined inline in
 * BackupsPage.tsx and, although both only ever render when
 * `isProEditionBuild` is true (Sync/Migration are Pro-only sections), the
 * literal string "Beta Features" (inside `BetaGate`'s copy: '...enable
 * <strong>Beta Features</strong> in Settings...') still compiled into the
 * always-shipped Free JS bundle — BackupsPage.tsx itself is not aliasable
 * (it hosts the always-free local Backup/Restore feature). Per this
 * project's own string-presence doctrine (used throughout this round —
 * LicenseTierBadge.tsx, BetaFeaturesToggleRow.tsx, etc.), a runtime gate
 * alone does not satisfy "must be physically absent from the Free bundle";
 * this component must be aliased to a null-rendering stub in Free instead.
 *
 * Extracted to its own module so it can be aliased away in the Free build
 * (`plugin/vite.config.ts`, specifier "./BetaFeatureGate"), exactly like
 * `BetaFeaturesToggleRow.tsx`/`LicenseTierBadge.tsx`. Both `BetaGate` and
 * `BetaBanner` ship in this one module (they are a matched pair used
 * together at both BackupsPage.tsx call sites — Migration and Sync) so a
 * single alias entry covers both.
 */
export interface BetaGateProps {
  feature: string;
}

export const BetaGate: React.FC<BetaGateProps> = ({ feature }) => (
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
        <span
          className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-800 uppercase dark:border-amber-800/50 dark:bg-amber-900/30 dark:text-amber-300"
          aria-label="Beta feature"
        >
          <FlaskConical className="h-2.5 w-2.5" aria-hidden="true" />
          Beta
        </span>
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

export interface BetaBannerProps {
  feature: string;
}

export const BetaBanner: React.FC<BetaBannerProps> = ({ feature }) => (
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
