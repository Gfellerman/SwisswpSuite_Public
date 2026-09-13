/**
 * ESSENTIAL_HARDENING_KEYS — default section grouping for the hardening grid.
 *
 * `HardeningOption.tier` ("essential" | "advanced") normally decides which of
 * the two hardening sections an option appears in. This list is the fallback
 * used by HardeningOptionsGrid.tsx when the API omits `tier` for an option,
 * so an older backend still produces a sensible layout.
 *
 * Keep in sync with:
 *   - plugin/src/components/organisms/Security/HardeningOptionsGrid.tsx
 *   - plugin/includes/security/class-swisswpsuite-hardening.php → $options keys
 */
export const ESSENTIAL_HARDENING_KEYS: string[] = [
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
