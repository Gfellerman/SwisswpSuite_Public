/**
 * useSecurityStateStore — Zustand slice for Security Hub cross-tab state.
 * =============================================================================
 * Introduced in v2.9.30.118 (TD-1 refactor) to consolidate state shared across
 * multiple Security Hub tabs (Dashboard / Quarantine / Cloud Shield) and the
 * global modals. Reading via selectors keeps re-renders scoped — the Quarantine
 * tab does NOT re-render when Geo settings change.
 *
 * Scope (WHY these fields live here):
 * - Banned / allowed IPs are read by Quarantine tab, Log Advisor modal,
 *   Firewall Advisor modal, and Cloud Shield status block.
 * - Geo settings are read by the Dashboard tab and (in future) the Geo Blocking
 *   tab. Currently inline in SecurityHub.tsx.
 * - Quarantined files + ignored paths are read by the Quarantine tab.
 * - Ignored findings (id-based safelist) are read by SentinelSafelistSheet
 *   (already extracted) — hoisted here for symmetry with the path-based list.
 *
 * Non-goals (these do NOT belong here):
 * - Scan results (useScanStore owns those)
 * - Logs / security status (TanStack Query via useSecurityStatus)
 * - Hardening options (useHardening hook owns those)
 * - Sentinel report / credits (useLicenseStore)
 * - Modal open/close state (useUiStore owns those — debounce / focus traps)
 *
 * This store intentionally does NOT auto-fetch on mount. Each value is set by:
 *   (a) a useEffect that mirrors a TanStack Query's data into the store, OR
 *   (b) a mutation handler in the corresponding custom hook.
 * Centralising the data here lets multiple consumers (Dashboard + Quarantine
 * tab + Log Advisor modal) read from one source without prop-drilling or
 * duplicate fetch chains.
 */
import { create } from "zustand";
import type { QuarantineFile, HardeningOption } from "../types";

/**
 * Geo-Lockdown list mode + country list. Mirrors the server-side option
 * `swisswpsuite_geo_settings` (list_mode: blacklist | whitelist, countries: ISO codes).
 */
export interface GeoSettings {
  list_mode: "blacklist" | "whitelist";
  countries: string[];
}

/** Single country record for the country picker. */
export interface CountryRecord {
  code: string;
  name: string;
  flag: string;
}

export interface SecurityState {
  // ── IP management ─────────────────────────────────────────────────────────
  /** Flat list of banned IPs. Source of truth mirrored from
   *  GET /security/banned-ips via useSecurityStatus (TanStack Query). */
  bannedIps: string[];
  /** Map: IP → "auto" | "manual" (ban source). Drives the Blocked IPs UI
   *  badge in the Quarantine tab. */
  bannedIpTypes: Record<string, string>;
  /** Free-text input for the manual "Block IP" form. UI-only, not persisted. */
  manualIp: string;
  /** IP allowlist (permanent trust — never auto-blocked by login protection). */
  allowedIps: string[];
  /** Admin's own current IP. Surfaced in the Quarantine tab so they can
   *  safelist themselves before reviewing/releasing bans. */
  currentIp: string;
  /** Free-text input for the manual "Allow IP" form. UI-only. */
  manualAllowedIp: string;

  // ── Quarantine & ignore lists ─────────────────────────────────────────────
  /** Files currently in quarantine. */
  quarantinedFiles: QuarantineFile[];
  /** Paths excluded from automated scans (path-based). */
  ignoredPaths: string[];
  /** Finding ids excluded from automated scans (id-based safelist). */
  ignoredFindings: string[];

  // ── Geo settings ──────────────────────────────────────────────────────────
  geoSettings: GeoSettings;
  /** All countries (for the country picker). Loaded once on mount. */
  allCountries: CountryRecord[];
  /** Search filter for the country picker. UI-only. */
  geoSearch: string;
  /** True while POST /geo/settings is in flight. */
  savingGeo: boolean;

  // ── Hardening (state-only; queries in useHardening hook) ──────────────────
  /** Cached hardening options. Written by the useHardening hook after
   *  GET /hardening/status resolves. */
  hardeningOptions: HardeningOption[];
  /** True while POST /hardening/apply-all is in flight. */
  loadingHardening: boolean;
}

// ── Setters ────────────────────────────────────────────────────────────────
export interface SecurityStateSetters {
  // IP
  setBannedIps: (ips: string[]) => void;
  setBannedIpTypes: (map: Record<string, string>) => void;
  setManualIp: (ip: string) => void;
  setAllowedIps: (ips: string[]) => void;
  setCurrentIp: (ip: string) => void;
  setManualAllowedIp: (ip: string) => void;

  // Quarantine & ignore
  setQuarantinedFiles: (files: QuarantineFile[]) => void;
  setIgnoredPaths: (paths: string[]) => void;
  setIgnoredFindings: (ids: string[]) => void;
  removeIgnoredFinding: (id: string) => void;

  // Geo
  setGeoSettings: (settings: GeoSettings) => void;
  setAllCountries: (countries: CountryRecord[]) => void;
  setGeoSearch: (q: string) => void;
  setSavingGeo: (busy: boolean) => void;

  // Hardening
  setHardeningOptions: (options: HardeningOption[]) => void;
  /** Optimistic toggle — flips one option's `enabled` without a refetch. */
  toggleHardeningOption: (key: string, enabled: boolean) => void;
  setLoadingHardening: (busy: boolean) => void;
}

export const useSecurityStateStore = create<SecurityState & SecurityStateSetters>(
  (set) => ({
    // ── Defaults ────────────────────────────────────────────────────────────
    bannedIps: [],
    bannedIpTypes: {},
    manualIp: "",
    allowedIps: [],
    currentIp: "",
    manualAllowedIp: "",

    quarantinedFiles: [],
    ignoredPaths: [],
    ignoredFindings: [],

    geoSettings: { list_mode: "blacklist", countries: [] },
    allCountries: [],
    geoSearch: "",
    savingGeo: false,

    hardeningOptions: [],
    loadingHardening: false,

    // ── Setters ─────────────────────────────────────────────────────────────
    setBannedIps: (ips) => set({ bannedIps: ips }),
    setBannedIpTypes: (map) => set({ bannedIpTypes: map }),
    setManualIp: (ip) => set({ manualIp: ip }),
    setAllowedIps: (ips) => set({ allowedIps: ips }),
    setCurrentIp: (ip) => set({ currentIp: ip }),
    setManualAllowedIp: (ip) => set({ manualAllowedIp: ip }),

    setQuarantinedFiles: (files) => set({ quarantinedFiles: files }),
    setIgnoredPaths: (paths) => set({ ignoredPaths: paths }),
    setIgnoredFindings: (ids) => set({ ignoredFindings: ids }),
    removeIgnoredFinding: (id) =>
      set((s) => ({
        ignoredFindings: s.ignoredFindings.filter((fid) => fid !== id),
      })),

    setGeoSettings: (settings) => set({ geoSettings: settings }),
    setAllCountries: (countries) => set({ allCountries: countries }),
    setGeoSearch: (q) => set({ geoSearch: q }),
    setSavingGeo: (busy) => set({ savingGeo: busy }),

    setHardeningOptions: (options) => set({ hardeningOptions: options }),
    toggleHardeningOption: (key, enabled) =>
      set((s) => ({
        hardeningOptions: s.hardeningOptions.map((opt) =>
          opt.key === key ? { ...opt, enabled } : opt
        ),
      })),
    setLoadingHardening: (busy) => set({ loadingHardening: busy }),
  })
);
