/**
 * dashboardProCopy — Dashboard.tsx's "no data yet" empty-state copy.
 *
 * ARS Round C P1-21 (F-41, 2026-08-23): the Free build told users with no
 * scan/SEO data yet to "Activate your license and run a security scan or
 * SEO check" — but this plugin's readme states the Free edition needs no
 * license key at all (see docs/architecture/FREEMIUM_DUAL_BUILD_ARCHITECTURE.md
 * §2). Extracted per this project's string-presence doctrine so
 * vite.config.ts can alias this module away in the Free build; the
 * freeStub sibling drops the license-activation instruction entirely.
 */
export const DASHBOARD_EMPTY_STATE_DESCRIPTION =
  "Activate your license and run a security scan or SEO check to populate your dashboard with real data from your site.";
