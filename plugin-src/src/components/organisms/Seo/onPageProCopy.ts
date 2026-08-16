/**
 * onPageProCopy — Pro-only locked-action label for OnPageDiagnostics.tsx
 *
 * WP.org compliance (2026-08-13, v2.9.33.18 census closure, R2a): "Full scan
 * requires Pro" names the Pro upgrade path directly on a locked-action
 * label. `isPro` is a license-capability prop, reachable in either edition
 * (always false on an unlicensed Free install), so this label genuinely
 * renders for Free users today — extracted per string-presence doctrine so
 * vite.config.ts can alias this module away in the Free build.
 */
export const FULL_SCAN_LOCKED_LABEL = "Full scan requires Pro";
