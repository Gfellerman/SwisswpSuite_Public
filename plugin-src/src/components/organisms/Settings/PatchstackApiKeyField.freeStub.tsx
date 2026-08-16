/**
 * WP.org B12a residual closure (2026-08-13, v2.9.33.17) —
 * FREE-EDITION-ONLY BUILD-TIME REPLACEMENT for
 * components/organisms/Settings/PatchstackApiKeyField.tsx.
 *
 * Same shape and same fix as WpscanApiKeyField.freeStub.tsx (read that
 * file's docblock for the full mechanism) — the real component is rendered
 * UNCONDITIONALLY at its one call site (`SettingsPage.tsx`), gated only by
 * an internal `isProUser` PROP (a Pro-tier capability check, legitimate
 * within Pro), so every Free install always rendered full Patchstack-
 * specific descriptive copy, a live outbound link to patchstack.com, and
 * the "Not available on this plan. Learn more" notice.
 *
 * `plugin/vite.config.ts` aliases the exact specifier
 * "../components/organisms/Settings/PatchstackApiKeyField" (as written at
 * SettingsPage.tsx's one call site) to THIS file, only when built with
 * EDITION=free.
 *
 * Free-edition FUNCTIONALITY is unchanged: Patchstack vulnerability lookup
 * has always been 100% Pro-only with zero Free-tier capability, so the real
 * component's Free-rendered state was already fully inert. Renders nothing.
 */
export function PatchstackApiKeyField() {
  return null;
}
