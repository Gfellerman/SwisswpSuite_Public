/**
 * v2.9.30.117 — Shared TanStack Query hooks for SecurityHub read-only status calls.
 *
 * These replace the raw wpApi() calls that previously fired on every SecurityHub
 * mount (i.e. every tab-switch). With shared query keys, all SecurityHub consumers
 * read from the same cache — no duplicate network requests.
 *
 * Security model: enforcement is always server-side. Caching the display view
 * for 20–60 s does not weaken security. Every mutation that changes these values
 * must call queryClient.invalidateQueries({ queryKey: [...] }) so the UI reflects
 * the change immediately after an admin action.
 *
 * Query key registry:
 *   ["security-status"]    — /security/status (WAF, spam, geo, login, alerts)
 *   ["security-logs"]      — /security/logs
 *   ["sentinel-status"]    — /security/sentinel/status (credits, identity)
 *   ["hardening-status"]   — /hardening/status (hardening options)
 *   ["security-banned-ips"]— /security/banned-ips (flat list + typeMap)
 *   ["security-environment"]— /security/environment (Cloudflare detection)
 *   ["sentinel-latest-scan"]— /security/sentinel/latest-scan (merged list+detail)
 */

import { useQuery } from "@tanstack/react-query";
import { wpApi } from "../services/api";
import {
  SecurityLog,
  HardeningOption,
  SecurityAlert,
  SentinelAuditResult,
  SentinelCredits,
  LatestScanResponse,
} from "../types";
import { STATUS_TTL, HARDENING_TTL, LOGS_TTL } from "../lib/cacheTtl";

// ─── /security/status ────────────────────────────────────────────────────────

export interface SecurityStatusData {
  firewall_enabled: boolean;
  spam_enabled: boolean;
  block_sqli: boolean;
  block_xss: boolean;
  simulation_mode: boolean;
  geo_enabled: boolean;
  global_geo_block: boolean;
  login_enabled: boolean;
  login_max_retries?: number;
  last_scan: string;
  alerts?: SecurityAlert;
}

export function useSecurityStatus() {
  return useQuery<SecurityStatusData>({
    queryKey: ["security-status"],
    queryFn: () => wpApi<SecurityStatusData>("/security/status"),
    staleTime: STATUS_TTL,
  });
}

// ─── /security/logs ──────────────────────────────────────────────────────────

type RawLogsResponse = SecurityLog[] | { logs: SecurityLog[] };

function normalizeLogs(data: RawLogsResponse): SecurityLog[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray((data as { logs: SecurityLog[] }).logs)) {
    return (data as { logs: SecurityLog[] }).logs;
  }
  return [];
}

export function useSecurityLogs() {
  return useQuery<SecurityLog[]>({
    queryKey: ["security-logs"],
    queryFn: async () => {
      const data = await wpApi<RawLogsResponse>("/security/logs");
      return normalizeLogs(data);
    },
    staleTime: LOGS_TTL,
  });
}

// ─── /security/sentinel/status ───────────────────────────────────────────────

export interface SentinelStatusData {
  has_audit: boolean;
  audit?: SentinelAuditResult;
  credits?: SentinelCredits;
  identity_valid?: boolean;
}

export function useSentinelStatus() {
  return useQuery<SentinelStatusData>({
    queryKey: ["sentinel-status"],
    queryFn: () => wpApi<SentinelStatusData>("/security/sentinel/status"),
    staleTime: STATUS_TTL,
  });
}

// ─── /hardening/status ───────────────────────────────────────────────────────

export interface HardeningStatusData {
  success: boolean;
  options: Record<string, HardeningOption>;
}

export function useHardeningStatus() {
  return useQuery<HardeningStatusData>({
    queryKey: ["hardening-status"],
    queryFn: () => wpApi<HardeningStatusData>("/hardening/status"),
    // Owner decision #4 (2026-07-17): Hardening is now partially free (6 of
    // 13 options), so its route is present in both editions — no `enabled`
    // gate needed here (matches the inline useQuery in SecurityHub.tsx,
    // which remains the only live call site; this hook is still unused).
    staleTime: HARDENING_TTL,
  });
}

// ─── /security/banned-ips ────────────────────────────────────────────────────

type BannedIpEntry = { ip: string; type?: string };
type RawBannedIpsResponse = {
  ips: BannedIpEntry[] | string[];
  allowed_ips?: string[];
  current_ip?: string;
};

export interface BannedIpsData {
  bannedIps: string[];
  bannedIpTypes: Record<string, string>;
  allowedIps: string[];
  currentIp: string;
}

function normalizeBannedIps(data: RawBannedIpsResponse): BannedIpsData {
  const rawIps = Array.isArray(data.ips)
    ? data.ips
    : Object.values((data.ips as unknown as Record<string, unknown>) || {});
  const flatIps: string[] = [];
  const typeMap: Record<string, string> = {};
  for (const entry of rawIps) {
    if (typeof entry === "string") {
      if (entry) {
        flatIps.push(entry);
        typeMap[entry] = "auto";
      }
    } else if (entry && typeof entry === "object" && "ip" in entry) {
      const e = entry as BannedIpEntry;
      if (e.ip) {
        flatIps.push(e.ip);
        typeMap[e.ip] = e.type || "auto";
      }
    }
  }
  return {
    bannedIps: flatIps,
    bannedIpTypes: typeMap,
    allowedIps: Array.isArray(data.allowed_ips) ? data.allowed_ips : [],
    currentIp: typeof data.current_ip === "string" ? data.current_ip : "",
  };
}

export function useBannedIps() {
  return useQuery<BannedIpsData>({
    queryKey: ["security-banned-ips"],
    queryFn: async () => {
      const data = await wpApi<RawBannedIpsResponse>("/security/banned-ips");
      return normalizeBannedIps(data);
    },
    staleTime: STATUS_TTL,
  });
}

// ─── /security/environment ───────────────────────────────────────────────────

export interface SecurityEnvironmentData {
  success: boolean;
  environment: {
    cloudflare: {
      detected: boolean;
      connecting_ip?: boolean;
      country_header?: boolean;
    };
  };
}

export function useSecurityEnvironment() {
  return useQuery<SecurityEnvironmentData>({
    queryKey: ["security-environment"],
    queryFn: () => wpApi<SecurityEnvironmentData>("/security/environment"),
    staleTime: HARDENING_TTL,
  });
}

// ─── /security/sentinel/latest-scan ──────────────────────────────────────────

export function useLatestScan() {
  return useQuery<LatestScanResponse>({
    queryKey: ["sentinel-latest-scan"],
    queryFn: () => wpApi<LatestScanResponse>("/security/sentinel/latest-scan"),
    staleTime: STATUS_TTL,
  });
}
