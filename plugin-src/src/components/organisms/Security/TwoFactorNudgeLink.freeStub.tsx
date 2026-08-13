/**
 * FREE-EDITION-ONLY BUILD-TIME REPLACEMENT for
 * components/organisms/Security/TwoFactorNudgeLink.tsx — see that file's
 * docblock for the extraction rationale (2026-08-13, WP.org round-3
 * re-audit).
 *
 * `plugin/vite.config.ts` aliases the exact specifier
 * "./organisms/Security/TwoFactorNudgeLink" (as written at SecurityHub.tsx's
 * one call site) to THIS file only when built with EDITION=free. See
 * GeoLockdownCard.freeStub.tsx / TwoFactorSettings.freeStub.tsx for the full
 * Rollup static-import-elision writeup (identical mechanism).
 *
 * Renders nothing — the Login Safeguard card already carries the page-level
 * FeaturePointer upsell for Free/no-edition users (see the "Upsell
 * redesign" comment at SecurityHub.tsx's call site); a second per-card CTA
 * pointing at a Pro-only settings tab would be redundant AND would leak the
 * "Two-Factor Authentication (2FA)" string into the Free bundle again.
 */
export function TwoFactorNudgeLink() {
  return null;
}
