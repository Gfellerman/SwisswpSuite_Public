/**
 * WP.org B12a residual closure (2026-08-13, v2.9.33.17) —
 * FREE-EDITION-ONLY BUILD-TIME REPLACEMENT for
 * components/organisms/Settings/WpscanApiKeyField.tsx.
 *
 * The real component is NOT gated by `isProEdition()` at its call site
 * (`SettingsPage.tsx`) — unlike TwoFactorSettings/EncryptionSettings above
 * it, it is rendered UNCONDITIONALLY in both editions, with an internal
 * `isProUser` PROP (`!!window.swisswpsuiteData?.sentinelIsPro`, a Pro-tier
 * CAPABILITY check, not an edition check — legitimate, because within Pro a
 * customer on a non-Security tier should still see this locked, exactly the
 * same way Pro's own internal tier gates work elsewhere). That means in the
 * Free build, before this fix, EVERY Free install ALWAYS rendered the real
 * component: full WPScan-specific descriptive copy ("WPScan maintains a
 * database of known security issues…"), a live outbound link to
 * wpscan.com, and the trialware-shaped "Not available on this plan. Learn
 * more" notice — a rendered instance of exactly the "third state" this
 * project's binding doctrine forbids (a feature must be fully working with
 * no gate, or physically absent — never a visible-but-locked stub), not
 * merely a compiled-but-hidden string.
 *
 * `plugin/vite.config.ts` aliases the exact specifier
 * "../components/organisms/Settings/WpscanApiKeyField" (as written at
 * SettingsPage.tsx's one call site) to THIS file, only when built with
 * EDITION=free.
 *
 * Free-edition FUNCTIONALITY is unchanged: WPScan vulnerability lookup has
 * always been a 100% Pro-only feature (docs/architecture/
 * FREEMIUM_DUAL_BUILD_ARCHITECTURE.md §2 — "ships Pro-only") with zero
 * Free-tier capability, so the real component's Free-rendered state was
 * already fully inert (disabled input, no working action) — this stub
 * removes only the now-forbidden descriptive/upsell chrome around that
 * always-inert control, not any working behavior. Renders nothing
 * (layout-safe emptiness), matching the established EncryptionSettings.
 * freeStub.tsx / TwoFactorSettings.freeStub.tsx convention.
 */
export function WpscanApiKeyField() {
  return null;
}
