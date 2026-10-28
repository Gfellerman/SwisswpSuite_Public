/// <reference types="vite/client" />

interface SwissWPSuiteData {
  root: string;
  homeUrl: string;
  nonce: string;
  apiUrl: string;
  // SET-04/4.3 FIX: this plugin's own asset base URL, localized by
  // class-swisswpsuite-admin.php so the JS-error forwarder in index.tsx can
  // tell this plugin's own script errors apart from other plugins' errors.
  // Optional: a stale cached bundle (see the DOUBLE-LOAD GUARD note in
  // index.tsx) could theoretically run against an older localized-data
  // object that predates this field — the forwarder treats a missing value
  // as "cannot verify attribution" and does not forward.
  assetsBaseUrl?: string;
  version: string;
  /** Site administrator address, used as the default alert recipient. */
  adminEmail?: string;
  /**
   * Where the XML sitemap is served: /sitemap.xml with pretty permalinks, the
   * query-variable form with plain permalinks. Absent when the page was
   * rendered by an older plugin copy; the SEO screen then shows no sitemap link.
   */
  sitemapUrl?: string;
  /**
   * Where the AI assistant guide (llms.txt) is served: /llms.txt with pretty
   * permalinks, the query-variable form with plain permalinks. Absent when the
   * page was rendered by an older plugin copy; the SEO screen then shows no link.
   */
  llmsTxtUrl?: string;
}

interface Window {
  swisswpsuiteData: SwissWPSuiteData;
}
