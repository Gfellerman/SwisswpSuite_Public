/**
 * FREE_HARDENING_KEYS — canonical list of all hardening option keys.
 *
 * WP.org round-3 remediation (2026-07-26, decision D1): the "6 FREE / 7 PRO"
 * per-option split (owner decision #4, 2026-07-17) is REVOKED — the reviewer
 * quoted the backend's PRO_ONLY_OPTIONS gate verbatim as trialware (Guideline 5).
 * Every hardening toggle is now free and fully functional in both editions. The
 * `disable_wp_cron_public` option was removed entirely in the same remediation
 * (decision D11) — it is NOT one of the 12 keys below.
 *
 * This list is no longer a free/pro split — it exists purely as a fail-safe
 * fallback, consumed by HardeningOptionsGrid.tsx ONLY when a given option's
 * API-provided `pro` flag (HardeningOption.pro in types.ts) is undefined (the
 * backend now always sends `pro: false` for every option, so this fallback
 * should never actually be reached through the live UI). Same `field ?? fallback`
 * idiom already used there for `tier`.
 *
 * Keep in sync with:
 *   - plugin/src/components/organisms/Security/HardeningOptionsGrid.tsx (imports from here)
 *   - plugin/src/components/SecurityHub.tsx (imports from here)
 *   - plugin/includes/security/class-swisswpsuite-hardening.php → $options array keys
 *     (the two lists MUST match exactly — 12 keys, no disable_wp_cron_public)
 */
export const FREE_HARDENING_KEYS: string[] = [
  "disable_xmlrpc",
  "disable_file_editor",
  "block_php_uploads",
  "force_security_headers",
  "hide_wp_version",
  "disable_rest_api_guests",
  "disable_author_archives",
  "block_bad_bots",
  "block_user_enumeration",
  "enable_csp",
  "restrict_llm_crawlers",
  "restrict_google_indexing",
];
