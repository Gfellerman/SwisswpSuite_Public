/**
 * Freemium Dual-Build — edition helper (Phase 3, 2026-07-17)
 *
 * `window.swisswpsuiteData.edition` is stamped server-side by the PHP
 * bootstrap as 'free' | 'pro', reflecting which zip is installed:
 *   - 'free' — wordpress.org build. Premium-local (2FA, hardening,
 *     geo-blocking, advanced WAF, cloud backup, sync, migration,
 *     update-guard) AND all AI/serviceware code (Groq, deep-scan hash
 *     lookup, AI content, AI SEO meta) are PHYSICALLY ABSENT — not
 *     gated, absent. Rendering the real UI for one of these would call
 *     dead REST routes.
 *   - 'pro' — swisswpsecure.com download. Full superset; tier gating
 *     (hasSentinelPro/hasSecurity/etc.) still applies WITHIN Pro.
 *
 * Fail-safe contract (do not weaken): a missing/undefined/unrecognized
 * value must resolve to Free. A premium control must never render just
 * because the edition field hasn't loaded yet, predates this field, or
 * was corrupted. This must win even over a stale/cached license
 * capability that claims a paid tier — capabilities describe what the
 * user is ENTITLED to; edition describes what CODE IS PRESENT to serve
 * it. See docs/architecture/FREEMIUM_DUAL_BUILD_ARCHITECTURE.md §3/§5.
 */
export function isProEdition(): boolean {
  return window.swisswpsuiteData?.edition === "pro";
}

export function isFreeEdition(): boolean {
  return !isProEdition();
}

/** Purchase a new plan — used when the user has no license / wants to buy. */
export const PRO_UPGRADE_URL = "https://swisswpsecure.com/products/";

/** Already paid — download & install the Pro edition to use an existing key. */
export const PRO_DOWNLOAD_URL = "https://swisswpsecure.com/resources/";

/**
 * True when the backend detected a paid-tier license key active on a
 * Free-edition install (`edition_mismatch`, populated server-side by
 * class-swisswpsuite-license.php::get_status() — reaches the frontend via
 * the same license payload every consumer of get_status() already reads:
 * admin.php bootstrap window.swisswpsuiteData.license, GET /settings, and
 * POST /license/refresh).
 *
 * Every `ProUpsellPlaceholder` call site should thread this in so the
 * placeholder can show "you already own this — download Pro" instead of a
 * generic purchase CTA to someone who has already paid.
 *
 * Accepts an optional fresher license object (e.g. a component's own
 * `settings?.license` from a TanStack Query cache, which can be more
 * up-to-date than the page-load bootstrap snapshot) and ORs it with the
 * `window.swisswpsuiteData.license` fallback — the same source
 * LicenseManager.tsx falls back to — so call sites with nothing fresher in
 * scope can simply call `hasEditionMismatch()`.
 */
export function hasEditionMismatch(
  license?: { edition_mismatch?: boolean } | null
): boolean {
  return (
    license?.edition_mismatch === true ||
    window.swisswpsuiteData?.license?.edition_mismatch === true
  );
}
