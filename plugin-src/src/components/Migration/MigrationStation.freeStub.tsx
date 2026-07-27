/**
 * Authored by: Frontend Specialist
 * Skills: react-patterns, typescript-expert
 * Date: 2026-07-27
 *
 * WP.org round-3 remediation, Sprint W2c (Free JS-bundle hygiene) —
 * FREE-EDITION-ONLY BUILD-TIME REPLACEMENT for
 * components/Migration/MigrationStation.tsx (the ~169KB Site Migration UI —
 * the single largest leak found in this sprint's inventory).
 *
 * `BackupsPage.tsx` already gates the real component's RENDER behind
 * `isProEditionBuild` (a Free visitor always sees the "Site Migration"
 * ProUpsellPlaceholder instead — see BackupsPage.tsx's migration-section
 * ternary), but per the same Rollup static-analysis reasoning documented in
 * AIContentPage.freeStub.tsx, a runtime-only gate does not stop Rollup from
 * still emitting MigrationStation's ~169KB of code inside the shipped
 * BackupsPage chunk — it's a plain top-level
 * `import MigrationStation from "../components/Migration/MigrationStation"`
 * (static, not React.lazy), so the whole module graph it pulls in
 * (PostMigrationChecklist, etc.) compiles in regardless of whether the
 * ternary ever reaches that branch at runtime.
 *
 * `plugin/vite.config.ts` aliases the exact specifier
 * "../components/Migration/MigrationStation" (as written at BackupsPage.tsx's
 * one call site) to THIS file only when built with EDITION=free. Vite's
 * alias resolution happens at module-resolve time, before Rollup ever parses
 * the real MigrationStation.tsx — so in a Free build the real file, and
 * everything it transitively imports, never enters the module graph at all.
 * Pro builds never add the alias.
 *
 * This component is never actually mounted at runtime in Free (BackupsPage's
 * own `!isProEditionBuild` ternary returns the real ProUpsellPlaceholder
 * before this branch is ever reached), so its content is inert — but it
 * renders a real upsell rather than `null`, matching this codebase's
 * "graceful degradation" convention (see SyncManager.freeStub.tsx) in case a
 * future refactor of BackupsPage.tsx ever reaches this branch directly.
 * Copy/props below mirror BackupsPage.tsx's own already-shipped Migration
 * placeholder verbatim (feature/description/bullets/icon, "page" variant —
 * no variant prop at that call site — default "h3" heading, since this
 * section sits nested under BackupsPage's own <h1>, not a routed page).
 * Prop signature mirrors the real component's `MigrationStationProps`
 * (`onCancel`) exactly so BackupsPage.tsx needs no change for either
 * edition; `onCancel` is accepted and intentionally unused — there is
 * nothing here to cancel.
 */
import React from "react";
import { ProUpsellPlaceholder } from "../organisms/Upsell/ProUpsellPlaceholder";
import { hasEditionMismatch } from "../../lib/edition";
import { GitMerge } from "lucide-react";

interface MigrationStationProps {
  onCancel: () => void;
}

export const MigrationStation: React.FC<MigrationStationProps> = () => (
  <ProUpsellPlaceholder
    feature="Site Migration"
    icon={GitMerge}
    description="Move your whole site — files, database, media, themes and plugins — to a new host or domain in a guided, chunked transfer built for shared hosting."
    bullets={[
      "Guided host-to-host or domain-to-domain transfer",
      "Chunked upload — safe on shared-hosting request limits",
      "Post-migration health check confirms the new site works",
    ]}
    editionMismatch={hasEditionMismatch()}
  />
);

export default MigrationStation;
