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
}

interface Window {
  swisswpsuiteData: SwissWPSuiteData;
}
