/**
 * WP.org B12a residual closure (2026-08-13, v2.9.33.17, controller-directed
 * sweep) — FREE-EDITION-ONLY BUILD-TIME REPLACEMENT for
 * components/organisms/Backups/BackupAutomationsPanel.tsx.
 *
 * The real component is rendered UNCONDITIONALLY at its one call site
 * (`pages/BackupsPage.tsx`, `<BackupAutomationsPanel />`, no
 * `isProEdition()` gate at all) — internally gated only by `hasCloudFeature`
 * (a license-capability check for `backup_cloud`/`backup_pro`). Since Free
 * never carries a paid license, `hasCloudFeature` is always `false` there,
 * so every Free install always rendered the real component's locked-teaser
 * branch: a "Backup Automations" heading, a "Not Included" badge, and the
 * descriptive copy "Automatically back up your site on a schedule — daily,
 * weekly, or hourly. Not included on this plan — see Settings for
 * details." — matching the bare "on this plan" B12a fingerprint, the exact
 * same trialware-shaped "third state" pattern as the WPScan/Patchstack API
 * key fields (see those `.freeStub.tsx` files for the full doctrine
 * writeup).
 *
 * `plugin/vite.config.ts` aliases the exact specifier
 * "../components/organisms/Backups/BackupAutomationsPanel" (as written at
 * `BackupsPage.tsx`'s one call site) to THIS file, only when built with
 * EDITION=free.
 *
 * Free-edition FUNCTIONALITY is unchanged: scheduled/cloud backup
 * automation is a 100% Pro-only feature (docs/architecture/
 * FREEMIUM_DUAL_BUILD_ARCHITECTURE.md §2/§4 — `backup-scheduler.php`/
 * `backup-automations.php` stay Pro-excluded, `/backup/schedule` routes are
 * not registered in Free) with zero Free-tier capability — the real
 * component's `!hasCloudFeature` branch is the ONLY thing Free ever
 * rendered (the entire "main render" automation editor below it in the
 * real file is unreachable without `hasCloudFeature`), so removing it
 * removes no working behavior. Renders nothing (layout-safe emptiness).
 */
export function BackupAutomationsPanel() {
  return null;
}
