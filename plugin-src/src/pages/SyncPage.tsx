/**
 * Sync Page — Phase 3 Migration Complete
 * Agent: debugger + backend-specialist
 * Wired to: SyncManager (full live component)
 * Features: diff-based push, connection management, sync schedules, target site key generation, sync logs
 *
 * Freemium Dual-Build (Phase 3, 2026-07-17): this direct /sync route has no
 * beta gate of its own (unlike the BackupsPage "Sync Two Sites" sub-tab) —
 * Sync is Pro-only and physically absent from the Free zip, so this route
 * must show the same upsell treatment regardless of how it's reached.
 *
 * Upsell redesign (2026-08-04, design point 1/2): the Free branch used to
 * render a full ProUpsellPlaceholder (bullets + "Upgrade to Pro"/"Download
 * Pro" CTA pair). Per the owner-approved redesign, every per-page
 * placeholder is removed — Sync is a local, non-AI Pro feature, so this
 * page carries one neutral "edition" FeaturePointer instead, pointing
 * in-app to Settings.
 */
import React from "react";
import SyncManager from "../components/Sync/SyncManager";
import { FeaturePointer } from "../components/organisms/Upsell/FeaturePointer";
import { isProEdition } from "../lib/edition";
import { RefreshCw } from "lucide-react";

export const SyncPage: React.FC = () => {
  if (!isProEdition()) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <RefreshCw
          size={40}
          className="mx-auto mb-4 text-neutral-400"
          aria-hidden="true"
        />
        {/* WCAG 1.3.1: sole top-level content directly under DashboardLayout's
            page <h1> (no intervening <h2>) — h2 avoids a heading-level skip. */}
        <h2 className="dark:text-foreground text-lg font-semibold text-neutral-900">
          Site Synchronisation
        </h2>
        <div className="mt-3">
          <FeaturePointer variant="edition" />
        </div>
      </div>
    );
  }
  return <SyncManager />;
};

export default SyncPage;
