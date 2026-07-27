/**
 * useLicenseStore — Zustand slice for license + capability gate checks.
 * =============================================================================
 * Introduced in v2.9.30.118 (TD-1 refactor) to centralise the license-derived
 * booleans that gate Security Hub UI:
 *   - hasSentinelPro   — true for paid plans (drives Pro badges + lock state)
 *   - hasSecurity      — true only for plans with the 'waf' capability
 *   - hasAdvancedWaf   — true when backend reports Advanced WAF available
 *   - currentTier      — "none" | "free" | "pro" — drives ScanCard tier prop
 *
 * Why a store (not just useQuery + selectors):
 *   - License checks are read by Security Hub, every Scan card, the Quarantine
 *     tab, the Log/Firewall Advisor modals, and the Cloud Shield panel.
 *   - The Sentinel Pro status updates only when a license check resolves —
 *     a single source of truth avoids stale-closure races.
 *   - The derived booleans (hasSentinelPro / hasSecurity / currentTier) are
 *     computed once here rather than re-evaluated in every consumer.
 *
 * Source data:
 *   - `sentinelCredits` + `identityValid` — fetched from
 *     GET /security/sentinel/status (mirrored from useSecurityStatus hook)
 *   - `sentinelIsPro` + `hasAdvancedWaf` + `homeUrl` — PHP-injected via
 *     window.swisswpsuiteData. Read once on store init.
 *
 * Non-goals:
 *   - This store does NOT own token balance (useTokenBalance hook does).
 *   - It does NOT auto-fetch on mount — values are mirrored from the
 *     Sentinel status query by a single useEffect in SecurityHub.tsx.
 */
import { create } from "zustand";
import type { SentinelCredits } from "../types";

/** License tier derived from the available signals. */
export type LicenseTier = "none" | "free" | "pro";

export interface LicenseState {
  /** Sentinel credit balance + is_pro flag. Source: GET /security/sentinel/status. */
  sentinelCredits: SentinelCredits | null;
  /** True when the license server confirms a valid identity. False on 401/403. */
  identityValid: boolean;

  // ── PHP-injected flags (read once from window.swisswpsuiteData) ───────────
  /** True if WordPress reports Advanced WAF available (hosting-level). */
  hasAdvancedWaf: boolean;
  /** Home URL of the site (for in-admin links to /wp-admin/update-core.php). */
  homeUrl: string;
}

export interface LicenseDerived {
  /** True for any paid tier. Drives Pro badges, scan capability checks. */
  hasSentinelPro: boolean;
  /** True ONLY for the Security plan (capability 'waf'). Gates WAF, geo,
   *  hardening, IP allowlist, and the Deep Malware Scan card. */
  hasSecurity: boolean;
  /** "none" = no license, "free" = license but not Pro, "pro" = Pro. */
  currentTier: LicenseTier;
}

export interface LicenseStateSetters {
  setSentinelCredits: (credits: SentinelCredits | null) => void;
  setIdentityValid: (valid: boolean) => void;
  /** Read PHP-injected flags once. Called by SecurityHub on mount. */
  initFromWindow: () => void;
}

export type LicenseStore =
  LicenseState &
  LicenseDerived &
  LicenseStateSetters;

const computeDerived = (
  sentinelCredits: SentinelCredits | null,
  sentinelIsPro: boolean
): LicenseDerived => {
  const hasSentinelPro = !!sentinelCredits?.is_pro || !!sentinelIsPro;
  const caps = window.swisswpsuiteData?.license?.capabilities;
  const hasSecurity =
    Array.isArray(caps) && caps.includes("waf");
  const currentTier: LicenseTier = hasSentinelPro
    ? "pro"
    : sentinelCredits
      ? "free"
      : "none";
  return { hasSentinelPro, hasSecurity, currentTier };
};

const readPhpInjected = () => {
  const data = window.swisswpsuiteData;
  return {
    hasAdvancedWaf: !!data?.hasAdvancedWaf,
    homeUrl: (data?.homeUrl as string) ?? "",
    sentinelIsPro: !!data?.sentinelIsPro,
  };
};

export const useLicenseStore = create<LicenseStore>((set, get) => ({
  // ── State ─────────────────────────────────────────────────────────────────
  sentinelCredits: null,
  identityValid: true,
  hasAdvancedWaf: false,
  homeUrl: "",

  // ── Derived (initial values; recomputed by setter side-effects) ───────────
  hasSentinelPro: false,
  hasSecurity: false,
  currentTier: "none",

  // ── Setters ───────────────────────────────────────────────────────────────
  setSentinelCredits: (credits) => {
    const { hasAdvancedWaf, homeUrl } = get();
    set({
      sentinelCredits: credits,
      ...computeDerived(credits, false),
      hasAdvancedWaf,
      homeUrl,
    });
  },
  setIdentityValid: (valid) => set({ identityValid: valid }),

  initFromWindow: () => {
    const { hasAdvancedWaf, homeUrl, sentinelIsPro } = readPhpInjected();
    const { sentinelCredits } = get();
    set({
      hasAdvancedWaf,
      homeUrl,
      ...computeDerived(sentinelCredits, sentinelIsPro),
    });
  },
}));
