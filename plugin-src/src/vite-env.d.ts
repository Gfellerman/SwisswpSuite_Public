/// <reference types="vite/client" />

interface LicenseStatus {
  active: boolean;
  tier: string;
  tier_name: string;
  masked_key: string;
  features: string[];
  capabilities: string[];
  expires: string | null;
  warning?: string | null;
  stripe_customer_id?: string | null;
  // Option A: per-feature subscription map (null for old-model licenses).
  subscriptions?: Record<
    string,
    {
      active: boolean;
      status: string;
      expires_at: string | null;
      tier: string | null;
    }
  > | null;
  // Freemium Dual-Build (Phase 3; populated Phase 4): see the identical
  // field on types.ts's LicenseStatus for the full docblock — now populated
  // by class-swisswpsuite-license.php::get_status().
  edition_mismatch?: boolean;
}

interface TokenStatus {
  balance: number;
  usage: number;
}

interface TrialStatus {
  active: boolean;
  ends_at: string | null;
}

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
  isStandalone: boolean;
  license: LicenseStatus;
  trial: TrialStatus;
  tokens: TokenStatus;
  hasAdvancedWaf: boolean;
  sentinelIsPro: boolean;
  hasWooCommerce: boolean;
  // Freemium Dual-Build (Phase 3, 2026-07-17): which zip this install is
  // running — 'free' (wordpress.org, premium/AI code physically absent) or
  // 'pro' (swisswpsecure.com download, full superset). Stamped server-side
  // by the PHP bootstrap. Treat anything other than the literal 'pro' as
  // free — see plugin/src/lib/edition.ts. Optional because older cached
  // bootstraps predating this field won't have it; the helper defaults
  // missing/unknown to free regardless of this type's optionality.
  edition?: "free" | "pro";
}

interface Window {
  swisswpsuiteData: SwissWPSuiteData;
}
