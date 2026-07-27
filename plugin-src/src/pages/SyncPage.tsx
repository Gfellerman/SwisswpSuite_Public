/**
 * Sync Page — Phase 3 Migration Complete
 * Agent: debugger + backend-specialist
 * Wired to: SyncManager (full live component)
 * Features: diff-based push, connection management, sync schedules, target site key generation, sync logs
 *
 * Freemium Dual-Build (Phase 3, 2026-07-17): this direct /sync route has no
 * beta gate of its own (unlike the BackupsPage "Sync Two Sites" sub-tab) —
 * Sync is Pro-only and physically absent from the Free zip, so this route
 * must show the same upsell placeholder regardless of how it's reached.
 */
import React from "react";
import SyncManager from "../components/Sync/SyncManager";
import { ProUpsellPlaceholder } from "../components/organisms/Upsell/ProUpsellPlaceholder";
import { isProEdition, hasEditionMismatch } from "../lib/edition";
import { RefreshCw } from "lucide-react";

export const SyncPage: React.FC = () => {
  if (!isProEdition()) {
    return (
      <ProUpsellPlaceholder
        feature="Site Synchronisation"
        icon={RefreshCw}
        // WCAG 1.3.1: this placeholder is the sole top-level content directly
        // under DashboardLayout's page <h1> (no intervening <h2>) — h3
        // default would skip a level.
        headingLevel="h2"
        description="Keep a staging site and your live site in sync — push content changes both ways with a diff view before anything is applied."
        bullets={[
          "Two-way content sync between staging and live",
          "Diff-based push — review changes before they apply",
          "Scheduled sync + full connection/activity logs",
        ]}
        editionMismatch={hasEditionMismatch()}
      />
    );
  }
  return <SyncManager />;
};

export default SyncPage;
