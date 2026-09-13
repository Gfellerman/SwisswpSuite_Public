import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  SecurityLog,
  SentinelReport,
  SentinelLayer1Finding,
  ScanHistoryRecord,
  ScanHistoryDetail,
  DeepScanStatus,
  HardeningOption,
  QuarantineFile,
  AbandonedPluginsStatus,
  LatestScanResponse,
  SecurityStatus,
} from "../types";
import { wpApi, ApiError } from "../services/api";
import { STATUS_TTL, HARDENING_TTL, LOGS_TTL } from "../lib/cacheTtl";
import { useScanStore } from "../store/useScanStore";
import {
  Shield,
  ShieldAlert,
  Globe,
  Lock,
  EyeOff,
  FileSearch,
  ScanSearch,
  KeyRound,
  AlertTriangle,
  X,
  CheckCircle,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Loader,
  ExternalLink,
  History,
  ShieldOff,
} from "lucide-react";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { toast } from "../lib/toast";
import { Badge } from "./ui/Badge";
import { SectionHeader } from "./ui/SectionHeader";
import { SentinelGradeBadge } from "./organisms/Sentinel/SentinelGradeBadge";
import {
  buildScanSummaryTitle,
  buildScanSummarySubtitle,
} from "./organisms/Sentinel/scanSummaryCopy";
// T4 (Package E / G2 dead-path removal, 2026-08-13): SentinelM5ConsentModal
// import DELETED — its only render site and the state that opened it are
// both deleted (see the deletion comments further down this file).
import { ScanHistoryTable } from "./organisms/Security/ScanHistoryTable";
import { HardeningOptionsGrid } from "./organisms/Security/HardeningOptionsGrid";
import { CloudShieldPanel } from "./organisms/Security/CloudShieldPanel";
import { SecurityLogsPanel } from "./organisms/Security/SecurityLogsPanel";
import { QuarantineTab } from "./organisms/Security/QuarantineTab";
import ScanCronStatusBanner from "./organisms/Scan/ScanCronStatusBanner";
import ScanCard from "./organisms/Scan/ScanCard";
import ScanResultPanel from "./organisms/Scan/ScanResultPanel";
import ScanReportPreviewModal from "./organisms/Scan/ScanReportPreviewModal";
import ScanReportSettingsPanel from "./organisms/Scan/ScanReportSettingsPanel";
import { ScanHistoricalRecord } from "./organisms/Scan/ScanHistoricalRecord";
import {
  DEEP_MALWARE_START_FAILURE_MESSAGE,
  DEEP_MALWARE_PHASE_LABELS,
} from "./organisms/Scan/scanCopy";
import { WafTierPanel } from "./organisms/Security/WafTierPanel";
import { mapScanDetail } from "./organisms/Scan/scanDetailMapper";
import type { ScanDetailResponse } from "./organisms/Scan/scanDetailMapper";
import {
  loginSafeguardRows,
  securityDashboardCards,
  securityDashboardLeadSections,
  securityDataReviewSections,
} from "./organisms/Security/securityPageSections";
import type { SecurityDataReviewActions } from "./organisms/Security/securityPageSections";
import type {
  SecurityAuditResult,
  MalwareScanResult,
  DeepMalwareScanJob,
  ScanReportConfig,
  HardeningToggleResponse,
} from "../types";

const calculatePercent = (value: number, total: number): number => {
  if (!total || total === 0) return 0;
  return Math.min(100, Math.round((value / total) * 100));
};

/**
 * v2.9.30.x — Persistent "Mark Safe" management sheet.
 *
 * Renders a modal listing every finding id the user has marked safe. The id
 * alone is not human-readable ("auto-a1b2c3d4e5f6", "m4-001"), so we resolve
 * each id against the current AI Audit findings to display a friendly title
 * when possible. Ids without a match (e.g. items safelisted on a previous
 * scan whose underlying condition has since been remediated) render as the
 * raw id — still removable, but labeled "Previously dismissed finding" so the
 * user knows what they're looking at.
 *
 * The sheet uses the same modal pattern as ScanReportPreviewModal: role=dialog
 * + aria-modal, Escape closes, backdrop click closes. Focus management is
 * lightweight (focus the close button on mount) because the action list is
 * short and the existing pattern's focus trap is not strictly required.
 */
interface SentinelSafelistSheetProps {
  findingIds: string[];
  currentScanFindings: SecurityAuditResult["findings"];
  onClose: () => void;
  onRemove: (findingId: string) => Promise<void> | void;
}

const SentinelSafelistSheet: React.FC<SentinelSafelistSheetProps> = ({
  findingIds,
  currentScanFindings,
  onClose,
  onRemove,
}) => {
  const closeBtnRef = React.useRef<HTMLButtonElement | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Resolve id -> title from the current scan if available. The current scan
  // already had safelisted entries filtered out, so the typical hit-rate is
  // low — we still try because users often "Manage" right after marking, in
  // which case the most-recent finding can match.
  const titleById = useMemo(() => {
    const map: Record<string, { title: string; severity: string }> = {};
    for (const f of currentScanFindings) {
      map[f.id] = { title: f.title, severity: f.severity };
    }
    return map;
  }, [currentScanFindings]);

  useEffect(() => {
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="safelist-sheet-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl">
        <div className="border-border flex items-center justify-between border-b p-4">
          <h2
            id="safelist-sheet-title"
            className="text-swiss-navy flex items-center gap-2 text-sm font-black"
          >
            <ShieldOff size={14} aria-hidden="true" />
            Safelist — items you marked safe
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close safelist manager"
            className="hover:bg-secondary focus-visible:ring-swiss-navy rounded-full p-1 focus-visible:ring-2 focus-visible:outline-none"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {findingIds.length === 0 ? (
            <p className="text-xs font-medium text-neutral-500">
              You haven&rsquo;t marked any findings safe yet. When you do, they
              appear here so you can undo if needed.
            </p>
          ) : (
            <ul role="list" className="space-y-2">
              {findingIds.map((id) => {
                const meta = titleById[id];
                const label = meta?.title ?? "Previously dismissed finding";
                const isRemoving = removingId === id;
                return (
                  <li
                    key={id}
                    className="bg-secondary border-border flex items-center justify-between gap-2 rounded-xl border p-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-black text-neutral-800">
                        {label}
                      </p>
                      <p className="truncate text-[10px] font-medium text-neutral-500">
                        {id}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isRemoving}
                      aria-busy={isRemoving}
                      aria-label={`Remove "${label}" from safelist — future scans will re-check this item`}
                      onClick={async () => {
                        setRemovingId(id);
                        try {
                          await onRemove(id);
                        } finally {
                          setRemovingId(null);
                        }
                      }}
                      className="border-border text-swiss-navy hover:bg-muted focus-visible:ring-swiss-navy inline-flex items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-[10px] font-black tracking-[0.08em] uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isRemoving ? (
                        <Loader
                          size={10}
                          className="animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <RotateCcw size={10} aria-hidden="true" />
                      )}
                      Undo
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

const SecurityHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    | "dashboard"
    | "scan"
    | "logs"
    | "quarantine"
    | "hardening"
    | "cloud-shield"
    | "history"
  >("dashboard");

  // HIGH-32/35: Track initial data load to prevent stale-data flash
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // HIGH-35: Default all toggles to false (not undefined/true) to prevent flash of incorrect state
  const [firewallEnabled, setFirewallEnabled] = useState(false);
  const [spamProtection, setSpamProtection] = useState(false);

  // Granular Security Controls
  const [blockSqli, setBlockSqli] = useState(false);
  const [blockXss, setBlockXss] = useState(false);
  const [simulationMode, setSimulationMode] = useState(false);

  const [loginEnabled, setLoginEnabled] = useState(false);
  const [loginMaxRetries, setLoginMaxRetries] = useState(3);

  // F-302: scanning / scanResults / basicScanExpanded / handleScan removed —
  // the legacy POST /security/scan basic core-integrity flow was superseded by
  // the ScanCard + ScanResultPanel architecture (security-audit / malware /
  // deep-malware).
  // BasicScanResults lives as an organism in case the flow is revived later.
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [lastScan, setLastScan] = useState<string>("Never");

  // ── Scan state (v2.9.28.43): sourced from useScanStore Zustand slice ─────
  // Replaces 10 useState hooks that previously lived here. See
  // plugin/src/store/useScanStore.ts for rationale. Functional updates use
  // the dedicated `updateXxxResult` helpers (see store docs).
  const scanReportConfig = useScanStore((s) => s.scanReportConfig);
  const setScanReportConfig = useScanStore((s) => s.setScanReportConfig);
  const updateMalwareResult = useScanStore((s) => s.updateMalwareResult);
  // v2.9.29.0 — Deep Malware Scan async pipeline state.
  const deepMalwareJobId = useScanStore((s) => s.deepMalwareJobId);
  const setDeepMalwareJobId = useScanStore((s) => s.setDeepMalwareJobId);
  const deepMalwarePhase = useScanStore((s) => s.deepMalwarePhase);
  const setDeepMalwarePhase = useScanStore((s) => s.setDeepMalwarePhase);
  const deepMalwareStatus = useScanStore((s) => s.deepMalwareStatus);
  const setDeepMalwareStatus = useScanStore((s) => s.setDeepMalwareStatus);
  const deepMalwareResult = useScanStore((s) => s.deepMalwareResult);
  const setDeepMalwareResult = useScanStore((s) => s.setDeepMalwareResult);
  const updateDeepMalwareResult = useScanStore(
    (s) => s.updateDeepMalwareResult
  );
  const [previewModalOpen, setPreviewModalOpen] = React.useState(false);
  const [previewHtml, setPreviewHtml] = React.useState<string | null>(null);

  // Deep Scan State
  // ARS Round D (D-K-10, 2026-08-2x): showDeepScanModal/setShowDeepScanModal
  // REMOVED — the pre-existing TODO above already flagged it dead since
  // v2.9.28.0 (never read anywhere); this round's deletion of
  // proceedDeepScan()/startDeepScan() removed its one remaining WRITE,
  // making it provably 100% dead (confirmed via `command grep -n
  // "showDeepScanModal"` → only the declaration itself remained).
  const [deepScanStatus, setDeepScanStatus] = useState<DeepScanStatus>({
    status: "idle",
  });
  // @deprecated v2.9.28.11 — The Deep Scan UI that populated this state was replaced by
  // ScanResultPanel's own selection state (v2.9.28.11). The dead consumers that used to
  // justify keeping it (handleBulkAction, toggleThreatSelection, toggleSelectAllThreats,
  // the legacy Bulk AI Analysis Modal) were removed in the LiveQA fix sprint (2026-08-04,
  // §4.4). This state is now WRITE-ONLY: performBulkOperation() still clears processed
  // items from it on every bulk action (shared with the live handleScanPanelBulkAction
  // path), but nothing reads it anymore. Safe to remove alongside showDeepScanModal
  // once performBulkOperation's setSelectedThreats() call is also cleaned up.
  const [selectedThreats, setSelectedThreats] = useState<string[]>([]); // For bulk actions

  // Quarantine & Ignore Lists
  const [quarantinedFiles, setQuarantinedFiles] = useState<QuarantineFile[]>(
    []
  );
  const [ignoredPaths, setIgnoredPaths] = useState<string[]>([]);
  // v2.9.30.x — id-based safelist (parallel to ignoredPaths). Returned by the
  // same GET /security/ignore endpoint as `ignored_findings`. Drives the
  // "Manage safelist" sheet rendered from the scan result panel.
  const [ignoredFindings, setIgnoredFindings] = useState<string[]>([]);
  const [safelistSheetOpen, setSafelistSheetOpen] = useState(false);
  const [bannedIps, setBannedIps] = useState<string[]>([]);
  // v2.9.30.84: parallel map from IP -> ban source ('auto' | 'manual') for the
  // Blocked IPs UI badge. Kept separate from bannedIps so all existing
  // `bannedIps.includes(ip)` / `.map((ip) => ...)` consumers continue to work
  // unchanged. New entries default to 'auto' (firewall auto-ban) — the
  // backend currently stores manual + auto bans in the same option.
  const [bannedIpTypes, setBannedIpTypes] = useState<Record<string, string>>(
    {}
  );
  const [manualIp, setManualIp] = useState("");
  // v2.9.30.84: IP allowlist state
  const [allowedIps, setAllowedIps] = useState<string[]>([]);
  const [currentIp, setCurrentIp] = useState("");
  const [manualAllowedIp, setManualAllowedIp] = useState("");
  // v2.9.28.43: migrated to useScanStore (scan-related state consolidation)
  const analyzingFile = useScanStore((s) => s.analyzingFile);

  // Which analysis dialog, if any, is on screen.
  const [showLogAdvisor, setShowLogAdvisor] = useState(false);
  const [showFirewallAdvisor, setShowFirewallAdvisor] = useState(false);
  // File the result panel asked to have analysed; the stamp changes on every
  // request so the same file can be requested twice in a row.
  const [analyzeRequest, setAnalyzeRequest] = useState<{
    file: string;
    requestedAt: number;
  } | null>(null);
  // Bumped on every successful ban so an open report can refresh itself.
  const [banRevision, setBanRevision] = useState(0);
  // Most recent scan response envelope, handed to the analysis section.
  const [lastScanResponse, setLastScanResponse] = useState<unknown>(null);

  // B.6/DASH-2 (VALIDATOR_DASH.md, v2.9.33.49): WAF self-test tile state.
  // wafSelfTest is populated from GET /security/status's additive
  // `waf_self_test` field (Fix B.4, backend lane — see the file header
  // note) and refreshed after a manual "Run self-test now" call.
  const [wafSelfTest, setWafSelfTest] = useState<
    SecurityStatus["waf_self_test"] | null
  >(null);
  const [runningWafSelfTest, setRunningWafSelfTest] = useState(false);

  // Latest scan report shown on the Dashboard tab.
  const [sentinelReport, setSentinelReport] = useState<SentinelReport | null>(
    null
  );
  // T4 (Package E, 2026-08-13): `sentinelScanning` state DELETED — it was
  // write-only (set true/false only inside the now-deleted
  // runSentinelFullScan(), never read by any render/conditional in this
  // file — confirmed by tree-wide grep before this edit).
  // Manual fix guide state for L1 findings (chmod failures on Hostinger)
  const [l1ManualFix, setL1ManualFix] = useState<{
    what: string;
    why: string;
    how: string[];
  } | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryRecord[]>([]);
  // v2.9.28.43: migrated to useScanStore
  const historicalScanDetail = useScanStore((s) => s.historicalScanDetail);
  const setHistoricalScanDetail = useScanStore(
    (s) => s.setHistoricalScanDetail
  );
  const [loadingHistoricalScanId, setLoadingHistoricalScanId] = useState<
    number | null
  >(null);
  // T4 (Package E, 2026-08-13): `showM5Consent` state DELETED —
  // setShowM5Consent(true) had zero call sites anywhere in the tree (only
  // `setShowM5Consent(false)` calls remained, from the modal's own
  // onConsent/onCancel handlers, both deleted alongside the modal below).

  // Hardening State
  const [hardeningOptions, setHardeningOptions] = useState<HardeningOption[]>(
    []
  );
  const [loadingHardening, setLoadingHardening] = useState(false);
  // ARS Round C P1-24 / LiveQA-F3 (2026-08-23): serialises toggleHardening()
  // calls so at most one optimistic write + POST is ever in flight. The
  // earlier fix for this race was applied to plugin/src/hooks/useHardening.ts,
  // an orphaned hook with zero callers — the live handler wired to
  // HardeningOptionsGrid's onToggle is toggleHardening() below, so the
  // serialisation must live here.
  const hardeningMutationQueueRef = useRef<Promise<void>>(Promise.resolve());

  // Abandoned Plugin Detection State
  const [abandonedPlugins, setAbandonedPlugins] =
    useState<AbandonedPluginsStatus | null>(null);
  const [abandonedRefreshing, setAbandonedRefreshing] = useState(false);
  // DX-4a (ARS Round D, MEDIUM-3 — handoff/DX4_abandoned-async-ui-contract.md):
  // flips true once POST /security/abandoned-plugins/refresh dispatches the
  // background check (202) or confirms one is already running (429); the
  // polling useEffect near handleAbandonedPluginsRefresh watches this flag.
  const [abandonedCheckPending, setAbandonedCheckPending] = useState(false);

  // Cloud Shield (Cloudflare detection) State
  const [cloudflareDetected, setCloudflareDetected] = useState(false);
  const [cloudflareConnectingIp, setCloudflareConnectingIp] = useState(false);
  const [cloudflareCountryHeader, setCloudflareCountryHeader] = useState(false);

  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const showConfirm = (message: string, onConfirm: () => void) =>
    setConfirmDialog({ message, onConfirm });

  // ── v2.9.30.117: TanStack Query cache layer ──────────────────────────────
  // These useQuery calls replace the raw wpApi() useEffect fetches that fired
  // on every SecurityHub mount (i.e. every tab-switch). The cache deduplicates:
  // if data is fresher than staleTime, the component re-mounts and reads from
  // cache instead of issuing a new network request.
  //
  // Sync pattern: each query.data drives a useEffect that calls the existing
  // local setState setters. This keeps ALL downstream consumers (firewallEnabled,
  // logs, bannedIps, hardeningOptions, etc.) unchanged — zero refactor surface.
  //
  // Security guarantee: every mutation (ban, unban, hardening toggle, scan
  // complete) calls queryClient.invalidateQueries(...) for the matching key,
  // so admin actions always reflect immediately. See invalidation map below.
  const queryClient = useQueryClient();

  // /security/status — WAF, spam, login, last_scan
  const {
    data: _securityStatusData,
    isLoading: _securityStatusLoading,
    isError: securityStatusError,
  } = useQuery<{
    firewall_enabled: boolean;
    spam_enabled: boolean;
    block_sqli: boolean;
    block_xss: boolean;
    simulation_mode: boolean;
    login_enabled: boolean;
    login_max_retries?: number;
    last_scan: string;
    // B.6/DASH-2 (VALIDATOR_DASH.md, v2.9.33.49): additive, optional so
    // an older backend response (pre-self-test) still satisfies this
    // shape — see SecurityStatus in types.ts for the field definition.
    waf_self_test?: SecurityStatus["waf_self_test"];
  }>({
    queryKey: ["security-status"],
    queryFn: () =>
      wpApi<{
        firewall_enabled: boolean;
        spam_enabled: boolean;
        block_sqli: boolean;
        block_xss: boolean;
        simulation_mode: boolean;
        login_enabled: boolean;
        login_max_retries?: number;
        last_scan: string;
        waf_self_test?: SecurityStatus["waf_self_test"];
      }>("/security/status"),
    staleTime: STATUS_TTL,
  });

  useEffect(() => {
    const data = _securityStatusData;
    if (!data) return;
    setFirewallEnabled(data.firewall_enabled ?? false);
    setSpamProtection(data.spam_enabled ?? false);
    setBlockSqli(data.block_sqli ?? false);
    setBlockXss(data.block_xss ?? false);
    setSimulationMode(data.simulation_mode ?? false);
    setLoginEnabled(data.login_enabled ?? false);
    setLoginMaxRetries(data.login_max_retries ?? 3);
    setLastScan(data.last_scan);
    setWafSelfTest(data.waf_self_test ?? null);
  }, [_securityStatusData]); // eslint-disable-line react-hooks/exhaustive-deps

  // R2-4 (REAUDIT_DASH_R2.md, v2.9.33.49 round 3): `firewallEnabled` never
  // leaves its `useState(false)` default while /security/status has not yet
  // returned real data, so `!firewallEnabled` alone cannot tell "confirmed
  // off" apart from "unknown because the query errored". Only treat the
  // firewall as known-disabled when a real response has actually landed.
  const wafSelfTestBlockedByFirewallOff = securityStatusError
    ? _securityStatusData !== undefined && !firewallEnabled
    : !firewallEnabled;

  // /security/logs
  const { data: _logsData } = useQuery<SecurityLog[]>({
    queryKey: ["security-logs"],
    queryFn: async () => {
      const data = await wpApi<SecurityLog[] | { logs: SecurityLog[] }>(
        "/security/logs"
      );
      if (Array.isArray(data)) return data;
      if (data && Array.isArray((data as { logs: SecurityLog[] }).logs)) {
        return (data as { logs: SecurityLog[] }).logs;
      }
      return [];
    },
    staleTime: LOGS_TTL,
  });

  useEffect(() => {
    if (_logsData !== undefined) setLogs(_logsData);
  }, [_logsData]);

  // /hardening/status — hardening options list
  const { data: _hardeningData } = useQuery<{
    success: boolean;
    options: Record<string, HardeningOption>;
  }>({
    queryKey: ["hardening-status"],
    queryFn: () =>
      wpApi<{ success: boolean; options: Record<string, HardeningOption> }>(
        "/hardening/status"
      ),
    staleTime: HARDENING_TTL,
  });

  useEffect(() => {
    const data = _hardeningData;
    if (data?.success && data.options) {
      setHardeningOptions(Object.values(data.options));
    }
  }, [_hardeningData]);

  // /security/banned-ips — flat list, type map, allowed IPs, current IP
  // v2.9.30.84: response shape includes allowed_ips + current_ip.
  const { data: _bannedIpsData } = useQuery<{
    bannedIps: string[];
    bannedIpTypes: Record<string, string>;
    allowedIps: string[];
    currentIp: string;
  }>({
    queryKey: ["security-banned-ips"],
    queryFn: async () => {
      type BannedIpEntry = { ip: string; type?: string };
      type BannedIpsRaw = {
        ips: BannedIpEntry[] | string[];
        allowed_ips?: string[];
        current_ip?: string;
      };
      const data = await wpApi<BannedIpsRaw>("/security/banned-ips");
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
    },
    staleTime: STATUS_TTL,
  });

  useEffect(() => {
    const data = _bannedIpsData;
    if (!data) return;
    setBannedIps(data.bannedIps);
    setBannedIpTypes(data.bannedIpTypes);
    setAllowedIps(data.allowedIps);
    if (data.currentIp) setCurrentIp(data.currentIp);
  }, [_bannedIpsData]);

  // /security/sentinel/latest-scan — merged list+detail in one round-trip.
  // v2.9.30.117: replaces the two-call sequence in fetchLatestScanReport().
  // record: null = no scans yet (first-install state) — handled below.
  const { data: _latestScanData, isLoading: _latestScanLoading } =
    useQuery<LatestScanResponse>({
      queryKey: ["sentinel-latest-scan"],
      queryFn: () =>
        wpApi<LatestScanResponse>("/security/sentinel/latest-scan"),
      staleTime: STATUS_TTL,
    });

  useEffect(() => {
    const detail = _latestScanData;
    if (!detail || !detail.success || !detail.record) return;

    // SEC-4: findings already fixed via the fix-it pipeline are removed
    // server-side (build_scan_detail() filters swisswpsuite_security_fixed_findings
    // before the response is built), so every finding here is still open.
    const openFindings = detail.layer1_findings ?? [];

    if (openFindings.length > 0) {
      setSentinelReport({ layer: 1, findings: openFindings });
    }
  }, [_latestScanData]); // eslint-disable-line react-hooks/exhaustive-deps

  // /security/environment — Cloudflare detection (deferred, non-critical)
  // This stays as a useQuery driven by mount since it was already deferred.
  const { data: _envData } = useQuery<{
    success: boolean;
    environment: {
      cloudflare: {
        detected: boolean;
        connecting_ip?: boolean;
        country_header?: boolean;
      };
    };
  }>({
    queryKey: ["security-environment"],
    queryFn: () =>
      wpApi<{
        success: boolean;
        environment: {
          cloudflare: {
            detected: boolean;
            connecting_ip?: boolean;
            country_header?: boolean;
          };
        };
      }>("/security/environment"),
    staleTime: HARDENING_TTL,
  });

  useEffect(() => {
    const data = _envData;
    if (!data?.environment?.cloudflare) return;
    setCloudflareDetected(!!data.environment.cloudflare.detected);
    setCloudflareConnectingIp(!!data.environment.cloudflare.connecting_ip);
    setCloudflareCountryHeader(!!data.environment.cloudflare.country_header);
  }, [_envData]);

  // ── Mount effect: deferred non-critical fetches only ─────────────────────
  // Critical reads (status, logs, sentinel, hardening, banned-IPs, latest-scan,
  // environment) are now driven by the useQuery hooks above — they fire
  // automatically and deduplicate on tab re-mount.
  // The mount useEffect now only handles fetches that cannot be cleanly
  // expressed as read-only queries: deepScanStatus, abandoned-plugins.
  useEffect(() => {
    // Deferred non-critical fetches — fire after the initial paint completes.
    const deferredId = setTimeout(() => {
      void fetchDeepScanStatus();
      // Abandoned plugin detection — non-critical, silent fail
      wpApi<AbandonedPluginsStatus>("/security/abandoned-plugins")
        .then((data) => setAbandonedPlugins(data))
        .catch(() => {});
    }, 100);

    // isInitialLoading: set to false when the critical queries have settled.
    // The useQuery hooks start fetching synchronously; we check their loading
    // state through the _securityStatusLoading / _latestScanLoading flags.
    // However for simplicity we retain the original pattern: clear it on first
    // paint (the queries auto-show their own loading states via the existing
    // state vars which default to false/empty, which is identical behaviour to
    // the original Promise.all().finally()).
    setIsInitialLoading(false);

    return () => clearTimeout(deferredId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll Deep Scan if running
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (deepScanStatus?.status === "running") {
      interval = setInterval(fetchDeepScanStatus, 3000);
    }
    return () => clearInterval(interval);
  }, [deepScanStatus?.status]);

  // Fetch Lists when tab changes
  useEffect(() => {
    if (activeTab === "quarantine") {
      fetchQuarantine();
      fetchIgnored();
      // v2.9.30.117: banned-IPs is now a cached query (["security-banned-ips"]).
      // Invalidating forces a refetch only if the quarantine tab is opened AND
      // the cache is stale — deduplicates the double-fetch that previously fired
      // on both mount and quarantine-tab switch.
      queryClient.invalidateQueries({ queryKey: ["security-banned-ips"] });
    }
    if (activeTab === "history" && scanHistory.length === 0) {
      fetchScanHistory();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scan Consolidation: fetch report config on mount ──────────────────────
  useEffect(() => {
    wpApi<ScanReportConfig>("/security/scan/report-config")
      .then((data) => setScanReportConfig(data))
      .catch(() => {
        // Non-critical — panel degrades gracefully with null config
      });
  }, []);

  // ── Scan Consolidation: trigger handlers ─────────────────────────────────

  const handleTriggerScan = async (scanType: "deep-malware") => {
    // Reset prior result + advance to running. The poller below clears
    // these on completion. Setting jobId after the start call lets the
    // useEffect-based poller pick up the new job.
    setDeepMalwareResult(null);
    setDeepMalwarePhase("pending");
    setDeepMalwareStatus("running");

    try {
      // ── v2.9.29.0 Async Deep Malware Scan (start + poll) ────────────────
      // Pipeline: enumerate → local_scan → complete. Each /status poll
      // advances one phase. ~2-5 min total on typical sites.
      const startEnvelope = await wpApi<{
        success: boolean;
        job_id?: string;
        status?: string;
        message?: string;
      }>("/security/scan/malware/start", { method: "POST" });
      if (!startEnvelope.success || !startEnvelope.job_id) {
        throw new Error(
          startEnvelope.message ?? DEEP_MALWARE_START_FAILURE_MESSAGE
        );
      }
      // Hand the job_id to the poller useEffect below — the polling loop
      // owns the network back-pressure, retries, and result delivery.
      setDeepMalwareJobId(startEnvelope.job_id);
    } catch (e) {
      console.error(`Scan ${scanType} failed`, e);
      const msg = e instanceof Error ? e.message : "";
      toast.error(
        msg && !msg.toLowerCase().includes("authentication failed")
          ? msg
          : "Scan failed. Please try again."
      );
      setDeepMalwareStatus("error");
      setDeepMalwareJobId(null);
      setDeepMalwarePhase(null);
    }
  };

  // v2.9.29.0 — Deep Malware Scan phase-label dictionary. Each pipeline
  // phase maps to a user-facing message shown on the ScanCard's loading
  // button. The labels themselves live in scanCopy.ts (imported
  // above as DEEP_MALWARE_PHASE_LABELS).

  /**
   * v2.9.29.0 — Deep Malware Scan poller.
   *
   * Triggers when `deepMalwareJobId` becomes non-null (the start handler in
   * handleTriggerScan sets it after POST /malware/start succeeds). Polls
   * GET /security/scan/malware/status?job_id=... every 3 seconds, surfacing
   * the current pipeline phase via setDeepMalwarePhase. On a terminal
   * status (complete | error | failed | not_found) the poller writes the
   * final result, clears the job id, and unsubscribes via its cleanup
   * function.
   *
   * Safety cap: 200 polls × 3s = 10 minutes max wait. Deep scans on typical
   * Hostinger shared hosts complete well under that.
   *
   * The cleanup branch (return () => { cancelled = true; … }) is critical:
   * if the user navigates away mid-scan or the component remounts, we abort
   * the polling loop and avoid setting state on an unmounted component.
   */
  React.useEffect(() => {
    if (!deepMalwareJobId) {
      return undefined;
    }

    let cancelled = false;
    const MAX_POLLS = 200;
    const POLL_INTERVAL_MS = 3000;

    const runPoller = async () => {
      for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        if (cancelled) return;

        let envelope: DeepMalwareScanJob;
        try {
          envelope = await wpApi<DeepMalwareScanJob>(
            `/security/scan/malware/status?job_id=${encodeURIComponent(deepMalwareJobId)}`,
            { method: "GET" }
          );
        } catch (e) {
          if (e instanceof ApiError && e.status === 404) {
            if (!cancelled) {
              toast.error("Scan job expired. Please start a new scan.");
              setDeepMalwareStatus("error");
              setDeepMalwareJobId(null);
              setDeepMalwarePhase(null);
            }
            return;
          }
          // Transient network error — keep trying until cap.
          if (attempt === MAX_POLLS - 1) {
            if (!cancelled) {
              toast.error("Network error during scan. Please try again.");
              setDeepMalwareStatus("error");
              setDeepMalwareJobId(null);
              setDeepMalwarePhase(null);
            }
            return;
          }
          continue;
        }
        if (cancelled) return;

        setDeepMalwarePhase(envelope.phase);

        if (envelope.status === "complete" && envelope.result) {
          setDeepMalwareResult(envelope.result);
          setDeepMalwareStatus("complete");
          setDeepMalwareJobId(null);
          setDeepMalwarePhase(null);

          // v2.9.30.117: scan complete → invalidate so next tab visit shows fresh data
          queryClient.invalidateQueries({ queryKey: ["sentinel-latest-scan"] });
          queryClient.invalidateQueries({ queryKey: ["security-status"] });

          // Mirror Full AI: refresh banner state so the cron-status banner
          // reflects the just-completed scan grade.
          try {
            const refreshed = await wpApi<ScanReportConfig>(
              "/security/scan/report-config"
            );
            if (!cancelled) setScanReportConfig(refreshed);
          } catch {
            // Non-critical — banner degrades to stale state.
          }
          return;
        }

        if (
          envelope.status === "error" ||
          envelope.status === "failed" ||
          envelope.status === "not_found"
        ) {
          toast.error(envelope.message ?? "Scan failed. Please try again.");
          setDeepMalwareStatus("error");
          setDeepMalwareJobId(null);
          setDeepMalwarePhase(null);
          return;
        }
        // Continue polling on status === 'running' | 'pending'.
      }

      if (!cancelled) {
        toast.error(
          "Scan is taking longer than expected. Check back in a few minutes."
        );
        setDeepMalwareStatus("error");
        setDeepMalwareJobId(null);
        setDeepMalwarePhase(null);
      }
    };

    void runPoller();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepMalwareJobId]);

  // v2.9.29.0 — pollDeepScanToCompletion() was removed. The synchronous
  // /security/deep-scan/status endpoint now returns 410 Gone; the new
  // Deep Malware Scan flow is driven by the React.useEffect poller above
  // (see DEEP_MALWARE_PHASE_LABELS + the deepMalwareJobId effect).

  const handleMarkMalwareSafe = async (relativePath: string) => {
    if (!relativePath) return;
    try {
      const res = await wpApi<{ success: boolean; message?: string }>(
        "/security/ignore",
        { method: "POST", body: JSON.stringify({ path: relativePath }) }
      );
      if (!res.success) {
        toast.error(res.message || "Failed to mark file as safe.");
        return;
      }
      // Optimistically strip the marked file from the current threat list and
      // decrement the threat count. threats_found is a derived counter so we
      // keep it in sync with threats.length. v2.9.29.0 — apply the same edit
      // to deepMalwareResult so the user sees the row vanish from whichever
      // scan card they're working in.
      const stripFinding = (
        prev: MalwareScanResult | null
      ): MalwareScanResult | null => {
        if (!prev) return prev;
        const remaining = (prev.threats ?? []).filter(
          (t) => t.file !== relativePath
        );
        return {
          ...prev,
          threats: remaining,
          threats_found: remaining.length,
        };
      };
      updateMalwareResult(stripFinding);
      updateDeepMalwareResult(stripFinding);
      // Refresh the ignore list so the Ignore Paths panel picks up the new entry.
      fetchIgnored();
      toast.success("Marked as safe. Future scans will skip this file.");
    } catch (e) {
      console.error("Failed to mark as safe", e);
      toast.error("Network error marking file as safe.");
    }
  };

  // Navigate to History tab and refresh the scan history list so the just-completed
  // scan appears at the top. Called from ScanResultPanel's "View in History" button.
  // Results continue to show inline on the Scan tab — this is a secondary navigation path.
  const handleViewScanInHistory = () => {
    setActiveTab("history");
    // Inline the history fetch so we don't reference fetchScanHistory before its declaration.
    wpApi<{ history: ScanHistoryRecord[] }>("/security/sentinel/scan-history")
      .then((data) => {
        if (data.history) setScanHistory(data.history);
      })
      .catch((e) => {
        console.error(
          "[SwissSuite] handleViewScanInHistory history fetch failed:",
          e
        );
      });
  };

  const handleSaveReportConfig = async (partial: Partial<ScanReportConfig>) => {
    try {
      const updated = await wpApi<ScanReportConfig>(
        "/security/scan/report-config",
        { method: "POST", body: JSON.stringify(partial) }
      );
      setScanReportConfig(updated);
    } catch (e) {
      console.error("Failed to save scan report config", e);
      toast.error("Failed to save report settings.");
    }
  };

  const handleOpenPreview = async () => {
    try {
      const data = await wpApi<{ html?: string }>(
        "/security/scan/report-preview"
      );
      setPreviewHtml(data.html ?? null);
      setPreviewModalOpen(true);
    } catch (e) {
      console.error("Failed to load report preview", e);
      toast.error("Failed to load report preview.");
    }
  };

  // @deprecated v2.9.30.117 — replaced by useQuery(["security-status"]) above.
  // Kept to avoid TypeScript "declared but never read" errors during transition.
  // Remove in v2.9.31 once the useQuery approach is confirmed stable.
  const fetchStatus = async () => {
    try {
      const data = await wpApi<{
        firewall_enabled: boolean;
        spam_enabled: boolean;
        block_sqli: boolean;
        block_xss: boolean;
        simulation_mode: boolean;
        login_enabled: boolean;
        login_max_retries?: number;
        last_scan: string;
      }>("/security/status");
      setFirewallEnabled(data.firewall_enabled ?? false);
      setSpamProtection(data.spam_enabled ?? false);
      setBlockSqli(data.block_sqli ?? false);
      setBlockXss(data.block_xss ?? false);
      setSimulationMode(data.simulation_mode ?? false);
      setLoginEnabled(data.login_enabled ?? false);
      setLoginMaxRetries(data.login_max_retries ?? 3);
      setLastScan(data.last_scan);
    } catch (e) {
      console.error("Failed to fetch security status", e);
    }
  };

  // @deprecated v2.9.30.117 — replaced by useQuery(["security-environment"]) above.
  const fetchEnvironment = async () => {
    try {
      const data = await wpApi<{
        success: boolean;
        environment: {
          cloudflare: {
            detected: boolean;
            connecting_ip?: boolean;
            country_header?: boolean;
          };
        };
      }>("/security/environment");
      if (data.environment?.cloudflare) {
        setCloudflareDetected(!!data.environment.cloudflare.detected);
        setCloudflareConnectingIp(!!data.environment.cloudflare.connecting_ip);
        setCloudflareCountryHeader(
          !!data.environment.cloudflare.country_header
        );
      }
    } catch (e) {
      console.error("Failed to fetch environment data", e);
    }
  };

  // DX-4a (ARS Round D, MEDIUM-3 — handoff/DX4_abandoned-async-ui-contract.md):
  // POST /security/abandoned-plugins/refresh no longer runs the check
  // inline (it could take several minutes against api.wordpress.org and
  // risk a 502/504 on shared hosting). It now returns 202 immediately with
  // `in_progress: true` and dispatches the check in the background — or
  // 429 with `in_progress: true` if one was already running. Either way
  // this handler now hands off to the polling effect below instead of
  // treating the POST response itself as the final result; the response
  // no longer carries `plugins`/a real `last_check`.
  const handleAbandonedPluginsRefresh = async () => {
    setAbandonedRefreshing(true);
    try {
      const data = await wpApi<
        AbandonedPluginsStatus & { in_progress?: boolean }
      >("/security/abandoned-plugins/refresh", { method: "POST" });
      if (data.in_progress) {
        setAbandonedCheckPending(true);
      } else {
        // Defensive: the contract's happy path always returns
        // in_progress:true at 202 — only reachable if a future backend
        // revision reintroduces a synchronous-shaped response.
        setAbandonedPlugins(data);
        setAbandonedRefreshing(false);
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        // Contract's suggested UI pattern: 429 means a check is ALREADY
        // running — not an error, just "start polling the run in flight".
        setAbandonedCheckPending(true);
        return;
      }
      toast.error("Failed to refresh abandoned plugin data.");
      setAbandonedRefreshing(false);
    }
  };

  /**
   * DX-4a async "Refresh" poller. Fires once abandonedCheckPending flips
   * true and polls the EXISTING GET /security/abandoned-plugins status
   * route (DX-4a taught it to also return `in_progress`) every 3s until the
   * dispatched check finishes (in_progress:false && last_check>0) or 60s
   * elapse, whichever comes first — mirrors the Deep Malware Scan poller's
   * cancelled-flag/attempt-cap pattern above (React.useEffect keyed off
   * deepMalwareJobId) for unmount-safety and codebase consistency.
   */
  React.useEffect(() => {
    if (!abandonedCheckPending) {
      return undefined;
    }

    let cancelled = false;
    const MAX_POLLS = 20; // 20 x 3s = 60s
    const POLL_INTERVAL_MS = 3000;

    const runPoller = async () => {
      for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        if (cancelled) return;

        try {
          const status = await wpApi<
            AbandonedPluginsStatus & { in_progress?: boolean }
          >("/security/abandoned-plugins");
          if (cancelled) return;
          if (!status.in_progress && status.last_check > 0) {
            setAbandonedPlugins(status);
            setAbandonedCheckPending(false);
            setAbandonedRefreshing(false);
            return;
          }
        } catch (e) {
          // Transient network hiccup mid-poll — keep trying until the cap
          // rather than aborting the whole in-flight background check.
          console.error("Failed to poll abandoned-plugin status", e);
        }
      }
      if (!cancelled) {
        toast.info(
          "Still checking for abandoned plugins — this can take a few minutes on large sites. Check back shortly."
        );
        setAbandonedCheckPending(false);
        setAbandonedRefreshing(false);
      }
    };

    runPoller();

    return () => {
      cancelled = true;
    };
  }, [abandonedCheckPending]);

  // @deprecated v2.9.30.117 — replaced by useQuery(["security-logs"]) above.
  const fetchLogs = async () => {
    try {
      const data = await wpApi<SecurityLog[] | { logs: SecurityLog[] }>(
        "/security/logs"
      );
      if (Array.isArray(data)) {
        setLogs(data);
      } else if (
        data &&
        Array.isArray((data as { logs: SecurityLog[] }).logs)
      ) {
        setLogs((data as { logs: SecurityLog[] }).logs);
      } else {
        setLogs([]);
      }
    } catch (e) {
      console.error("Failed to fetch logs", e);
    }
  };

  // v2.9.29.0 — /security/deep-scan/status now returns 410 Gone (the new
  // Deep Malware Scan flow uses /scan/malware/start + /scan/malware/status).
  // This helper is a no-op so the mount-time deferred fetch and the legacy
  // 3s-polling effect (still wired to deepScanStatus.status) never network.
  // The deepScanStatus state is retained for one release because the legacy
  // DeepScanProgressModal + Bulk Analysis modal still reference it. Both
  // are deprecated and will be removed in v2.9.30 (see TODO @ line 449).
  const fetchDeepScanStatus = async () => {
    setDeepScanStatus((prev) => prev ?? { status: "idle" });
  };

  const fetchQuarantine = async () => {
    try {
      const data = await wpApi<{ files: QuarantineFile[] }>(
        "/security/quarantine"
      );
      setQuarantinedFiles(data.files || []);
    } catch (e) {
      console.error(e);
    }
  };

  // @deprecated v2.9.30.117 — replaced by useQuery(["security-banned-ips"]) above.
  const fetchBannedIps = async () => {
    try {
      // v2.9.30.84: response shape changed to include allowed_ips + current_ip,
      // and `ips` is now `Array<{ip, type}>` rather than `string[]`. Old
      // string-array shape is still tolerated for forward/backward safety.
      type BannedIpEntry = { ip: string; type?: string };
      type BannedIpsResponse = {
        ips: BannedIpEntry[] | string[];
        allowed_ips?: string[];
        current_ip?: string;
      };
      const data = await wpApi<BannedIpsResponse>("/security/banned-ips");
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
      setBannedIps(flatIps);
      setBannedIpTypes(typeMap);
      if (Array.isArray(data.allowed_ips)) setAllowedIps(data.allowed_ips);
      if (typeof data.current_ip === "string") setCurrentIp(data.current_ip);
    } catch (e) {
      console.error(e);
    }
  };

  // v2.9.30.84: IP Allowlist handlers
  const handleAllowIp = (ip: string) => {
    if (!ip) return;
    showConfirm(`Add ${ip} to the permanent allowlist?`, async () => {
      try {
        const data = await wpApi<{
          success: boolean;
          message?: string;
          already_present?: boolean;
        }>("/security/allowed-ips", {
          method: "POST",
          body: JSON.stringify({ ip }),
        });
        if (data.success) {
          if (data.already_present) {
            toast.info("IP is already in the allowlist.");
          } else {
            toast.success("IP added to allowlist.");
          }
          setManualAllowedIp("");
          // v2.9.30.117: invalidate cached query so UI reflects change immediately
          queryClient.invalidateQueries({ queryKey: ["security-banned-ips"] });
        } else {
          toast.error("Failed to add IP: " + (data.message || "Unknown error"));
        }
      } catch (e) {
        console.error(e);
        toast.error("Network error while adding IP to allowlist.");
      }
    });
  };

  const handleRemoveAllowedIp = (ip: string) => {
    showConfirm(`Remove ${ip} from the allowlist?`, async () => {
      try {
        const data = await wpApi<{ success: boolean; message?: string }>(
          "/security/allowed-ips",
          {
            method: "DELETE",
            body: JSON.stringify({ ip }),
          }
        );
        if (data.success) {
          toast.success("IP removed from allowlist.");
          // v2.9.30.117: invalidate cached query so UI reflects change immediately
          queryClient.invalidateQueries({ queryKey: ["security-banned-ips"] });
        } else {
          toast.error(
            "Failed to remove IP: " + (data.message || "Unknown error")
          );
        }
      } catch (e) {
        console.error(e);
        toast.error("Network error while removing IP from allowlist.");
      }
    });
  };

  const fetchIgnored = async () => {
    try {
      const data = await wpApi<{
        ignored: string[];
        ignored_findings?: string[];
      }>("/security/ignore");
      setIgnoredPaths(data.ignored || []);
      setIgnoredFindings(
        Array.isArray(data.ignored_findings) ? data.ignored_findings : []
      );
    } catch (e) {
      console.error(e);
    }
  };

  /**
   * v2.9.30.x — Remove a finding id from the persistent safelist.
   * Used by the "Manage safelist" sheet's Undo button.
   */
  const handleRemoveSafelistFinding = async (findingId: string) => {
    if (!findingId) return;
    try {
      const res = await wpApi<{ success: boolean; message?: string }>(
        "/security/ignore/remove",
        {
          method: "POST",
          body: JSON.stringify({ finding_id: findingId }),
        }
      );
      if (!res.success) {
        toast.error(res.message || "Failed to remove from safelist.");
        return;
      }
      setIgnoredFindings((prev) => prev.filter((id) => id !== findingId));
      // The next scan will re-emit the finding — the user must re-scan to
      // see it return, which is the expected and least-surprising behavior.
      toast.success(
        "Removed from safelist. Next scan will re-check this item."
      );
    } catch (e) {
      console.error("Failed to remove safelist finding", e);
      toast.error("Network error removing safelist entry.");
    }
  };

  // @deprecated v2.9.30.117 — replaced by useQuery(["hardening-status"]) above.
  const fetchHardeningStatus = async () => {
    try {
      const data = await wpApi<{
        success: boolean;
        options: Record<string, HardeningOption>;
      }>("/hardening/status");
      if (data.success && data.options) {
        setHardeningOptions(Object.values(data.options));
      }
    } catch (e) {
      console.error("Failed to fetch hardening status", e);
    }
  };

  const handleToggle = async (option: string, value: boolean) => {
    // Optimistic update
    if (option === "firewall") setFirewallEnabled(value);
    if (option === "spam") setSpamProtection(value);
    if (option === "block_sqli") setBlockSqli(value);
    if (option === "block_xss") setBlockXss(value);
    if (option === "simulation_mode") setSimulationMode(value);
    if (option === "login") setLoginEnabled(value);

    try {
      await wpApi<{
        success: boolean;
        message?: string;
      }>("/security/toggle", {
        method: "POST",
        body: JSON.stringify({ option, value }),
      });
      // Success — optimistic update stands; no revert needed
    } catch (e: unknown) {
      console.error("Failed to toggle option", e);
      // ApiError carries structured data; fall back to generic message
      if (e instanceof Error) {
        toast.error(e.message || "Failed to update setting.");
      }
      // v2.9.30.117: invalidate so the cached status reverts to server truth
      queryClient.invalidateQueries({ queryKey: ["security-status"] });
    }
  };

  const saveLoginSettings = async (retries: number) => {
    setLoginMaxRetries(retries);
    try {
      await wpApi<{ success: boolean }>("/settings", {
        method: "POST",
        body: JSON.stringify({ loginMaxRetries: retries }),
      });
      toast.success("Login settings saved.");
    } catch (e) {
      console.error("Failed to save login settings", e);
    }
  };

  // F-302: handleScan removed — POST /security/scan basic flow was superseded
  // by ScanCard / ScanResultPanel. The endpoint + BasicScanResults organism
  // remain available for future reuse.

  // ARS Round D (D-K-10, 2026-08-2x, surfaced by C5 — not itself an R4
  // finding, CLAUDE.md two-proof dead-code doctrine applies): proceedDeepScan()
  // + startDeepScan() DELETED. Two-proof: (1) source — zero callers anywhere
  // in this file besides each other (confirmed via `command grep -n
  // "proceedDeepScan\|startDeepScan"`); the actual deep-malware trigger
  // wired to the UI is handleTriggerScan("deep-malware") below, a
  // completely separate code path hitting a different route
  // (/security/malware/start vs. these two's /security/deep-scan/start,
  // /backup/environment-status). (2) built-bundle — a fresh `vite build`
  // then `command grep -rl "environment-status\|proceedDeepScan" assets/`
  // → 0 hits.

  // T4 (Package E / G2 dead-path removal, 2026-08-13): runSentinelFullScan()
  // DELETED. Two-proof verification per the owner's dead-code deletion rule:
  //   Proof 1 (tree-wide grep, before this edit, with a positive control
  //     proving the search methodology finds live code): `runSentinelFullScan(`
  //     had exactly ONE call site — SentinelM5ConsentModal's onConsent
  //     callback (deleted in the same change, below). No other file imports
  //     or calls it.
  //   Proof 2 (dynamic-dispatch ruled out): no template-literal/computed-key
  //     call, no useUiStore selector, and no test file invokes it. The ONLY
  //     opener of the modal that called it, `setShowM5Consent(true)`, had
  //     ZERO call sites anywhere in the tree (checked both this file's local
  //     useState AND the separate useUiStore Zustand copy of the same flag —
  //     both dead; useUiStore's copy is orphaned independently of this
  //     deletion, see its own field removal below).
  // Backend route (/security/sentinel/full-scan, the deprecated Sentinel L2
  // alias) stays registered per rule 0.4 — flagged as a dead-route candidate
  // in this session's report, not deleted.

  /**
   * SEC-3 FIX: Load the most recent scan from storage on mount so results
   * persist across page refreshes. Only runs when sentinelReport is still null
   * (never overwrites a live in-session scan result).
   *
   * Flow: GET /scan-history (limit=1) → grab record.id → GET /scan-history/{id}
   * → rebuild SentinelReport and populate sentinelReport state.
   * Findings with status === 'fixed' (written by SEC-4) are filtered out so
   * resolved issues do not reappear.
   * @deprecated v2.9.30.117 — replaced by useQuery(["sentinel-latest-scan"]) which
   * calls GET /security/sentinel/latest-scan (one round-trip instead of two).
   */
  const fetchLatestScanReport = async () => {
    try {
      const histData = await wpApi<{ history: ScanHistoryRecord[] }>(
        "/security/sentinel/scan-history"
      );
      if (!histData.history || histData.history.length === 0) return;

      const latestRecord = histData.history[0];
      setScanHistory(histData.history);

      const detail = await wpApi<ScanHistoryDetail & { success: boolean }>(
        `/security/sentinel/scan-history/${latestRecord.id}`
      );
      if (!detail.success) return;

      // SEC-4: findings fixed via the fix-it pipeline are already removed
      // server-side: get_sentinel_scan_record() filters against
      // swisswpsuite_security_fixed_findings before returning results.
      const openFindings = detail.layer1_findings ?? [];

      if (openFindings.length > 0) {
        setSentinelReport({ layer: 1, findings: openFindings });
      }
    } catch (e) {
      // Silently swallow — missing scan history is normal on first install.
      console.error("[SwissSuite] fetchLatestScanReport failed:", e);
    }
  };

  const fetchScanHistory = async () => {
    try {
      const data = await wpApi<{ history: ScanHistoryRecord[] }>(
        "/security/sentinel/scan-history"
      );
      if (data.history) {
        setScanHistory(data.history);
      }
    } catch (e) {
      console.error("[SwissSuite] fetchScanHistory failed:", e);
    }
  };

  const fetchScanRecord = async (recordId: number) => {
    setLoadingHistoricalScanId(recordId);
    setHistoricalScanDetail(null);
    try {
      const data = await wpApi<ScanDetailResponse & { success: boolean }>(
        `/security/sentinel/scan-history/${recordId}`
      );
      if (data.success) {
        setHistoricalScanDetail(mapScanDetail(data));
        setActiveTab("scan");
      } else {
        toast.error("Failed to load scan record.");
      }
    } catch (e) {
      console.error("[SwissSuite] fetchScanRecord failed:", e);
      toast.error("Failed to load scan record.");
    } finally {
      setLoadingHistoricalScanId(null);
    }
  };

  const toggleHardening = (key: string, enabled: boolean): Promise<void> => {
    // ARS Round C P1-24 / LiveQA-F3 (2026-08-23): every call is chained onto
    // hardeningMutationQueueRef instead of firing immediately, so at most one
    // optimistic write + POST + settle-refetch is ever in flight. A second
    // rapid click (same option or a different one) waits its turn instead of
    // racing the first — this is what makes the final state converge on
    // backend truth instead of a stale intermediate optimistic value.
    const run = async (): Promise<void> => {
      // Optimistic update — toggle immediately so UI reacts at once
      setHardeningOptions((prev) =>
        prev.map((opt) => (opt.key === key ? { ...opt, enabled } : opt))
      );
      try {
        const data = await wpApi<HardeningToggleResponse>("/hardening/toggle", {
          method: "POST",
          body: JSON.stringify({ option: key, enable: enabled }),
        });
        if (!data.success) {
          toast.error("Failed to toggle: " + (data.message || "Unknown error"));
        } else if (data.htaccess_warning) {
          // U9 (2026-08-20 UI truth fix): the DB flag saved but the paired
          // server-level (.htaccess) rule failed to write — a toggle that
          // silently stayed "on" in the UI while not actually enforced at
          // the server level. Surface it instead of a plain success.
          toast.warning(data.htaccess_warning);
        }
      } catch (e: unknown) {
        console.error(e);
        if (e instanceof Error) {
          toast.error(e.message || "Network error — could not save setting.");
        } else {
          toast.error("Network error — could not save setting.");
        }
      } finally {
        // Re-fetch the authoritative status after EVERY settle (success OR
        // failure), not just on failure as before — this guarantees the
        // store ends on backend truth even if two rapid toggles briefly
        // disagreed about what the "current" state was.
        await queryClient.invalidateQueries({ queryKey: ["hardening-status"] });
      }
    };

    // `.then(run, run)` (not just `.then(run)`) keeps the queue alive even
    // if a previous link somehow rejects — run() itself never rejects
    // (every error path above is caught), but the queue must not wedge
    // permanently if that ever changes.
    const next = hardeningMutationQueueRef.current.then(run, run);
    hardeningMutationQueueRef.current = next;
    return next;
  };

  const applyAllHardening = () => {
    showConfirm(
      "Enable all recommended security hardening options?",
      async () => {
        setLoadingHardening(true);
        try {
          const data = await wpApi<{ success: boolean; message?: string }>(
            "/hardening/apply-all",
            {
              method: "POST",
            }
          );
          if (data.success) {
            // v2.9.30.117: invalidate so the hardening grid reflects server state
            queryClient.invalidateQueries({ queryKey: ["hardening-status"] });
            toast.success("All recommended security options applied.");
          } else {
            toast.error("Failed: " + data.message);
          }
        } catch (e) {
          console.error(e);
          toast.error("Network error.");
        } finally {
          setLoadingHardening(false);
        }
      }
    );
  };

  // --- Action Handlers ---

  const handleBanIp = (ip: string) => {
    if (!ip) return;
    showConfirm(`Are you sure you want to permanently ban ${ip}?`, async () => {
      try {
        const data = await wpApi<{ success: boolean; message?: string }>(
          "/security/ban-ip",
          {
            method: "POST",
            body: JSON.stringify({ ip }),
          }
        );
        if (data.success) {
          toast.success("IP Banned successfully.");
          setManualIp("");
          // v2.9.30.117: invalidate so the banned-IPs list reflects immediately
          queryClient.invalidateQueries({ queryKey: ["security-banned-ips"] });
          setBanRevision((n) => n + 1);
        } else {
          toast.error("Failed to ban IP: " + (data.message || "Unknown error"));
        }
      } catch (e) {
        console.error(e);
        toast.error("Network error during ban.");
      }
    });
  };

  const handleUnbanIp = (ip: string) => {
    showConfirm(`Unban ${ip}?`, async () => {
      try {
        await wpApi<{ success: boolean }>("/security/unban-ip", {
          method: "POST",
          body: JSON.stringify({ ip }),
        });
        // v2.9.30.117: invalidate so the banned-IPs list reflects immediately
        queryClient.invalidateQueries({ queryKey: ["security-banned-ips"] });
        toast.success("IP unbanned.");
      } catch (e) {
        // v2.9.30.85: surface backend error message rather than generic
        // "Network error." string. The previous catch swallowed legitimate
        // 4xx responses (e.g., "IP not found in ban list" from a stale row)
        // and displayed them as transport failures, which prevented users
        // from understanding what actually went wrong.
        const msg =
          (e instanceof Error && e.message) ||
          "Could not unban IP. Please try again.";
        console.error("Unban IP failed:", e);
        toast.error(msg);
      }
    });
  };

  const handleIgnore = async (filepath: string) => {
    try {
      await wpApi<{ success: boolean }>("/security/ignore", {
        method: "POST",
        body: JSON.stringify({ path: filepath }),
      });
      setDeepScanStatus((prev) => ({
        ...prev,
        results: prev.results?.filter((r) => r.file !== filepath),
      }));
    } catch (e) {
      toast.error("Failed to ignore file.");
    }
  };

  const handleQuarantine = (filepath: string) => {
    showConfirm(
      "Move this file to quarantine? It will be removed from its current location.",
      async () => {
        try {
          const data = await wpApi<{ success: boolean; message?: string }>(
            "/security/quarantine/move",
            {
              method: "POST",
              body: JSON.stringify({ file: filepath }),
            }
          );
          if (data.success) {
            setDeepScanStatus((prev) => ({
              ...prev,
              results: prev.results?.filter((r) => r.file !== filepath),
            }));
          } else {
            toast.error("Error: " + data.message);
          }
        } catch (e) {
          toast.error("Failed to quarantine file.");
        }
      }
    );
  };

  // ── Sentinel L1 Finding Action Handlers ────────────────────────────
  // These adapt the existing ignore/quarantine/delete infrastructure
  // to work with SentinelLayer1Finding objects (which use `evidence`
  // for the file path, not `file`).

  const handleL1MarkSafe = async (finding: SentinelLayer1Finding) => {
    if (!finding.evidence) return;
    try {
      await wpApi<{ success: boolean }>("/security/ignore", {
        method: "POST",
        body: JSON.stringify({ path: finding.evidence }),
      });
      // Remove from local state
      setSentinelReport((prev) =>
        prev
          ? {
              ...prev,
              findings: prev.findings.filter((f) => f.id !== finding.id),
            }
          : prev
      );
      toast.success(
        "Marked as safe. This file will not appear on future scans."
      );
    } catch {
      toast.error("Failed to mark file as safe.");
    }
  };

  const handleL1Quarantine = (finding: SentinelLayer1Finding) => {
    if (!finding.evidence) return;
    showConfirm(
      "Move this file to quarantine? It will be removed from its current location but can be restored.",
      async () => {
        try {
          const data = await wpApi<{ success: boolean; message?: string }>(
            "/security/quarantine/move",
            {
              method: "POST",
              body: JSON.stringify({ file: finding.evidence }),
            }
          );
          if (data.success) {
            setSentinelReport((prev) =>
              prev
                ? {
                    ...prev,
                    findings: prev.findings.filter((f) => f.id !== finding.id),
                  }
                : prev
            );
            fetchQuarantine();
            toast.success("File quarantined successfully.");
          } else {
            toast.error(
              "Quarantine failed: " + (data.message || "Unknown error")
            );
          }
        } catch {
          toast.error("Failed to quarantine file.");
        }
      }
    );
  };

  const handleL1Delete = (finding: SentinelLayer1Finding) => {
    if (!finding.evidence) return;
    showConfirm(
      "Permanently delete this file? This action CANNOT be undone. Unlike quarantine, the file will not be recoverable.",
      async () => {
        try {
          const data = await wpApi<{
            success: boolean;
            count?: number;
            failed?: Array<{ path: string; reason: string }>;
            message?: string;
          }>("/security/bulk", {
            method: "POST",
            body: JSON.stringify({
              action: "delete",
              items: [finding.evidence],
            }),
          });
          if (data.success) {
            setSentinelReport((prev) =>
              prev
                ? {
                    ...prev,
                    findings: prev.findings.filter((f) => f.id !== finding.id),
                  }
                : prev
            );
            toast.success("File deleted successfully.");
            if (data.failed?.length) {
              toast.error(
                `${data.failed.length} item(s) could not be processed: ${data.failed.map((f) => f.path).join(", ")}`
              );
            }
          } else {
            toast.error("Delete failed: " + (data.message || "Unknown error"));
          }
        } catch {
          toast.error("Failed to delete file.");
        }
      }
    );
  };

  const handleL1BulkAction = async (
    action: "ignore" | "quarantine" | "delete",
    targetFindings: SentinelLayer1Finding[]
  ) => {
    const items = targetFindings
      .map((f) => f.evidence)
      .filter((e): e is string => !!e);
    if (items.length === 0) return;

    if (action === "quarantine" || action === "delete") {
      const label =
        action === "quarantine" ? "quarantine" : "permanently delete";
      showConfirm(
        `${action === "quarantine" ? "Move" : "Delete"} ${items.length} file(s)? ${action === "delete" ? "This cannot be undone." : "They can be restored later."}`,
        async () => {
          try {
            const data = await wpApi<{
              success: boolean;
              count?: number;
              failed?: Array<{ path: string; reason: string }>;
              message?: string;
            }>("/security/bulk", {
              method: "POST",
              body: JSON.stringify({ action, items }),
            });
            if (data.success) {
              const ids = new Set(targetFindings.map((f) => f.id));
              setSentinelReport((prev) =>
                prev
                  ? {
                      ...prev,
                      findings: prev.findings.filter((f) => !ids.has(f.id)),
                    }
                  : prev
              );
              if (action === "quarantine") fetchQuarantine();
              toast.success(`${items.length} file(s) ${label}d.`);
              if (data.failed?.length) {
                toast.error(
                  `${data.failed.length} item(s) could not be processed: ${data.failed.map((f) => f.path).join(", ")}`
                );
              }
            } else {
              toast.error(
                `Bulk ${label} failed: ` + (data.message || "Unknown error")
              );
            }
          } catch {
            toast.error(`Bulk ${label} failed.`);
          }
        }
      );
    } else {
      // ignore (mark as safe) — no confirmation needed
      try {
        const data = await wpApi<{
          success: boolean;
          count?: number;
          failed?: Array<{ path: string; reason: string }>;
          message?: string;
        }>("/security/bulk", {
          method: "POST",
          body: JSON.stringify({ action: "ignore", items }),
        });
        if (data.success) {
          const ids = new Set(targetFindings.map((f) => f.id));
          setSentinelReport((prev) =>
            prev
              ? {
                  ...prev,
                  findings: prev.findings.filter((f) => !ids.has(f.id)),
                }
              : prev
          );
          fetchIgnored();
          toast.success(`${items.length} file(s) marked as safe.`);
          if (data.failed?.length) {
            toast.error(
              `${data.failed.length} item(s) could not be processed: ${data.failed.map((f) => f.path).join(", ")}`
            );
          }
        } else {
          toast.error(
            "Bulk ignore failed: " + (data.message || "Unknown error")
          );
        }
      } catch {
        toast.error("Bulk ignore failed.");
      }
    }
  };

  // ---------------------------------------------------------------------------
  // ARS Round E (F-08): parseFindingForFix() and handleL1Fix() — the
  // frontend caller of the now-deleted POST /security/findings/fix route —
  // were removed here as dead code. Two-proof (validator, VALIDATOR_E.md
  // §3.4/§0): `grep -rn "handleL1Fix" plugin/src` had exactly one hit (this
  // definition, zero callers) both before and after checking the built zip
  // for any remaining reference to the route string; the
  // backend route + handler were deleted in the same round (LE-B, see
  // RoundELaneB_F08_DeadRouteDeletionTest.php). `SentinelLayer1Finding`'s
  // `fix_type` field is unaffected and still used elsewhere (the "N issues
  // can be fixed" summary badge below, ScanResultPanel's
  // classifyFindingForAi()) — only the dead POST-and-remediate flow itself
  // was removed.
  // ---------------------------------------------------------------------------

  const handleL1NavigateHardening = () => {
    setActiveTab("hardening");
  };

  // ---------------------------------------------------------------------------

  const handleRestore = async (id: string) => {
    try {
      await wpApi<{ success: boolean }>("/security/quarantine/restore", {
        method: "POST",
        body: JSON.stringify({ id }),
      });
      fetchQuarantine();
      toast.success("File restored successfully.");
    } catch (e) {
      toast.error("Failed to restore.");
    }
  };

  const handleDeleteQuarantine = (id: string) => {
    showConfirm(
      "Permanently delete this file? This cannot be undone.",
      async () => {
        try {
          await wpApi<{ success: boolean }>("/security/quarantine/delete", {
            method: "POST",
            body: JSON.stringify({ id }),
          });
          fetchQuarantine();
          toast.success("File permanently deleted.");
        } catch (e) {
          toast.error("Failed to delete.");
        }
      }
    );
  };

  const handleUnIgnore = async (path: string) => {
    try {
      await wpApi<{ success: boolean }>("/security/ignore/remove", {
        method: "POST",
        body: JSON.stringify({ path }),
      });
      fetchIgnored();
    } catch (e) {
      toast.error("Failed to un-ignore.");
    }
  };

  /**
   * v2.9.33.x (LiveQA Fix Sprint 2026-08-04, §1.5) — return shape widened from
   * a plain boolean to { success, failed }. Bulk "Mark Safe" was silently
   * dropping findings the server correctly reported as undismissable
   * (description-only findings that fail the path-regex validation in
   * bulk_security_action()) because callers only ever saw a boolean "did the
   * overall request succeed" — never which individual items failed. All 5
   * call sites below were updated from `if (await performBulkOperation(...))`
   * to `if ((await performBulkOperation(...)).success)` to match — an object
   * is always truthy, so leaving any call site un-migrated would have made it
   * silently ALWAYS take the success branch regardless of outcome.
   */
  const performBulkOperation = async (
    action: "ignore" | "delete" | "quarantine",
    items: string[]
  ): Promise<{
    success: boolean;
    failed: Array<{ path: string; reason: string }>;
  }> => {
    try {
      const data = await wpApi<{
        success: boolean;
        count?: number;
        failed?: Array<{ path: string; reason: string }>;
        message?: string;
      }>("/security/bulk", {
        method: "POST",
        body: JSON.stringify({ action, items }),
      });
      if (data.success) {
        // Remove processed items from the list
        if (deepScanStatus?.results) {
          setDeepScanStatus((prev) => ({
            ...prev,
            results: prev.results?.filter((r) => !items.includes(r.file)),
          }));
        }
        // Deselect processed items
        setSelectedThreats((prev) => prev.filter((f) => !items.includes(f)));

        if (action === "ignore") fetchIgnored();
        if (action === "quarantine") fetchQuarantine();

        if (data.failed?.length) {
          toast.error(
            `${data.failed.length} item(s) could not be processed: ${data.failed.map((f) => f.path).join(", ")}`
          );
        }

        return { success: true, failed: data.failed ?? [] };
      } else {
        toast.error("Bulk action failed: " + data.message);
        return { success: false, failed: [] };
      }
    } catch (e) {
      console.error(e);
      toast.error("Bulk action failed.");
      return { success: false, failed: [] };
    }
  };

  /**
   * v2.9.28.11 — Batch-action handler for the ScanResultPanel selection UI.
   *
   * Receives an action verb and a list of file paths (from
   * MalwareResultView's `threat.file`). Calls the shared
   * `performBulkOperation` (unchanged backend: POST /security/bulk) and, on
   * success, removes the acted-upon threats from the deep-malware panel's
   * `malwareResult.threats` optimistically.
   */
  const handleScanPanelBulkAction = useCallback(
    async (
      action: "ignore" | "quarantine" | "delete",
      fileList: string[]
    ): Promise<void> => {
      if (fileList.length === 0) return;
      const verbMap = {
        ignore: "marked safe",
        quarantine: "quarantined",
        delete: "deleted",
      } as const;
      const result = await performBulkOperation(action, fileList);
      if (result.success) {
        // v2.9.33.x (LiveQA Fix Sprint 2026-08-04, §1.5) — bulk "Mark Safe" used
        // to hide EVERY originally-selected item on any success:true response,
        // even the ones the server just reported in `failed` (e.g.
        // description-only findings that fail bulk_security_action()'s
        // path-format regex). Filtering to only the items NOT in `failed`
        // keeps undismissable findings visible instead of letting them
        // silently vanish and then reappear on the next scan.
        const failedPaths = new Set(result.failed.map((f) => f.path));
        const succeededList = fileList.filter((f) => !failedPaths.has(f));

        // Remove from the malware threat list so the same selection cleared
        // from the deep-malware panel reflects immediately without waiting
        // for a re-scan.
        updateMalwareResult((prev) =>
          prev
            ? {
                ...prev,
                threats: (prev.threats ?? []).filter(
                  (t) => !succeededList.includes(t.file)
                ),
                threats_found: Math.max(
                  0,
                  (prev.threats_found ?? 0) -
                    (prev.threats ?? []).filter((t) =>
                      succeededList.includes(t.file)
                    ).length
                ),
              }
            : prev
        );
        if (action === "ignore") fetchIgnored();
        if (succeededList.length > 0) {
          toast.success(
            `${succeededList.length} finding${succeededList.length === 1 ? "" : "s"} ${verbMap[action]}.`
          );
        }
        // performBulkOperation() already toasts the failed-item detail (paths
        // + reasons) — no duplicate toast here for the failed remainder.
      }
    },
    // performBulkOperation is recreated each render but closes over stable
    // setters — the stale-closure risk is limited to deepScanStatus.results
    // (used only in the legacy modal path, not in the new scan panels).
    // fetchIgnored is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // B.6/DASH-2 (VALIDATOR_DASH.md, v2.9.33.49): one-click "Run self-test
  // now" — POSTs to the backend self-test endpoint (Fix B lane, HMAC-marked
  // probe that cannot accumulate WAF strikes on the shared proxy address —
  // see VALIDATOR_DASH.md §1 Fix B), then invalidates ["security-status"]
  // so GET /security/status is re-fetched with the fresh waf_self_test
  // result. success:false at HTTP 200 is deliberately NOT opted out via
  // allowSuccessFalse — a self-test call that itself failed to run (as
  // opposed to a self-test that ran and found the WAF not blocking) should
  // surface as a request error, not a silent no-op.
  //
  // Contract note (verified against the built backend, class-swisswpsuite-
  // api-security.php::run_waf_self_test_now(), 2026-09-03): the POST
  // response nests the fresh result under `result`, NOT `waf_self_test` —
  // a deliberately different shape from GET /security/status's own
  // `waf_self_test` field. The two also use different key names for the
  // timestamp: the POST's raw stored-option shape carries `time`
  // (SwissWPSuite_Security::store_self_test_result()'s row shape), while
  // GET /security/status remaps that same value to `last_run` when
  // building its response. This block re-shapes the POST payload into the
  // GET shape before calling setWafSelfTest() so the rest of this
  // component only ever deals with one shape.
  const runWafSelfTest = async () => {
    setRunningWafSelfTest(true);
    try {
      const data = await wpApi<{
        success: boolean;
        message?: string;
        result?: {
          time: string;
          result: NonNullable<SecurityStatus["waf_self_test"]>["result"];
          http_code: number | null;
          blocked_row_seen: boolean | null;
          detail: string;
        };
      }>("/security/waf-self-test", { method: "POST" });

      if (data.result) {
        setWafSelfTest({
          last_run: data.result.time,
          result: data.result.result,
          http_code: data.result.http_code,
          blocked_row_seen: data.result.blocked_row_seen,
          detail: data.result.detail,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["security-status"] });

      switch (data.result?.result) {
        case "ok":
          toast.success(
            data.result?.detail
              ? `WAF self-test passed — ${data.result.detail}`
              : "WAF self-test passed — the firewall blocked the test attack."
          );
          break;
        case "failed":
          toast.error(
            data.result?.detail
              ? `WAF self-test FAILED — ${data.result.detail}`
              : "WAF self-test FAILED — the firewall did not block the test attack. Check your WAF settings."
          );
          break;
        case "unknown":
          toast.warning(
            data.result?.detail
              ? `WAF self-test inconclusive — ${data.result.detail}`
              : "WAF self-test inconclusive — this run proves nothing either way. Try again shortly."
          );
          break;
        case "off":
          toast.info("Self-test skipped — the firewall is currently off.");
          break;
        default:
          toast.success(data.message || "Self-test completed.");
      }
    } catch (e: unknown) {
      console.error("WAF self-test failed", e);
      toast.error(
        e instanceof Error
          ? e.message
          : "Self-test request failed — check your connection."
      );
    } finally {
      setRunningWafSelfTest(false);
    }
  };

  // Everything the analysis dialogs delegate back to this page.
  const reviewActions: SecurityDataReviewActions = {
    banIp: handleBanIp,
    ignoreFile: handleIgnore,
    quarantineFile: handleQuarantine,
    fileCleared: (file) => {
      setDeepScanStatus((prev) => ({
        ...prev,
        results: prev.results?.filter((r) => r.file !== file),
      }));
      setSelectedThreats((prev) => prev.filter((f) => f !== file));
    },
    goToLogs: () => setActiveTab("logs"),
    goToHardening: () => setActiveTab("hardening"),
    confirmAction: showConfirm,
  };

  // HIGH-32: Show skeleton while initial data loads to prevent stale-data flash
  if (isInitialLoading) {
    return (
      <div
        className="animate-pulse space-y-6"
        aria-busy="true"
        aria-label="Loading Security Hub"
      >
        <div className="bg-secondary h-10 w-1/3 rounded-xl" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-secondary h-36 rounded-2xl" />
          ))}
        </div>
        <div className="bg-secondary h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Security Hub"
        description="Monitor and protect your site from malware and vulnerabilities."
        action={
          activeTab === "dashboard" ? (
            <Button
              variant="secondary"
              onClick={() => setActiveTab("scan")}
              icon={ScanSearch}
              className="rounded-xl"
            >
              Run a Scan →
            </Button>
          ) : undefined
        }
      />

      {/* Tab Navigation — sticky row, right-aligned to stay clear of left panel */}
      <div className="bg-background/95 border-border dark:border-border/10 sticky top-0 z-30 mb-8 border-b shadow-sm backdrop-blur-md">
        <div className="scrollbar-hide flex justify-start overflow-x-auto text-sm font-black tracking-widest uppercase">
          {(
            [
              "dashboard",
              "scan",
              "logs",
              "quarantine",
              "hardening",
              "cloud-shield",
              "history",
            ] as const
          ).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`hover:text-swiss-navy hover:border-swiss-navy shrink-0 border-b-2 px-6 py-4 transition-all ${activeTab === tab ? "border-swiss-navy text-swiss-navy" : "border-transparent text-slate-500"}`}
            >
              {tab === "history" ? (
                <span className="flex items-center gap-1.5">
                  <History size={13} aria-hidden="true" />
                  History
                </span>
              ) : tab === "cloud-shield" ? (
                <span className="flex items-center gap-1.5">
                  <Globe size={13} aria-hidden="true" />
                  Cloud Shield
                </span>
              ) : (
                tab
              )}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "dashboard" && (
        <>
          {securityDashboardLeadSections.map((Section, i) => (
            <Section key={i} />
          ))}

          {/* Dashboard Grid - Swiss Precision Style */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* WAF Card */}
            <div className="glass-panel relative overflow-hidden p-6 transition-all">
              <div className="bg-swiss-navy absolute top-0 right-0 -mt-12 -mr-12 h-24 w-24 rounded-full" />
              <div className="relative z-10 mb-6 flex items-start justify-between">
                <div
                  className={`rounded-2xl p-3 ${firewallEnabled ? "bg-swiss-navy shadow-swiss-navy/20 text-white shadow-lg" : "bg-secondary text-neutral-700"}`}
                >
                  <Shield size={24} />
                </div>
                {/* Basic WAF on/off is free in both editions (Freemium Dual-Build
                     this switch renders unconditionally, matching the
                     Detection Only Mode checkbox below. */}
                <div
                  role="switch"
                  aria-checked={firewallEnabled}
                  aria-label="Toggle Smart Firewall"
                  tabIndex={0}
                  className={`h-6 w-12 cursor-pointer rounded-full p-1 ring-1 transition-all duration-300 ring-inset ${firewallEnabled ? "bg-green-500 ring-green-600" : "bg-red-500 ring-red-600"}`}
                  onClick={() => handleToggle("firewall", !firewallEnabled)}
                  onKeyDown={(e) =>
                    e.key === "Enter" || e.key === " "
                      ? handleToggle("firewall", !firewallEnabled)
                      : undefined
                  }
                >
                  <div
                    className="h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-300"
                    style={{
                      transform: firewallEnabled
                        ? "translateX(1.5rem)"
                        : "translateX(0)",
                    }}
                  />
                </div>
              </div>
              <h3 className="text-swiss-navy relative z-10 mb-2 text-xs font-black tracking-widest uppercase">
                Smart Firewall
              </h3>
              <p className="relative z-10 mb-4 text-sm leading-relaxed font-medium text-neutral-700">
                Automatically stops malicious requests, SQL injections, and
                cross-site scripting attacks.
              </p>

              {/* Detection Only Mode switches the firewall between
                  log-only and actively blocking. */}
              <div className="border-border relative z-10 border-t pt-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="simMode"
                    checked={simulationMode}
                    onChange={(e) =>
                      handleToggle("simulation_mode", e.target.checked)
                    }
                    className="border-border text-swiss-navy focus:ring-swiss-navy mt-0.5 h-4 w-4 shrink-0 rounded-md transition-all"
                  />
                  <div>
                    <label
                      htmlFor="simMode"
                      className="hover:text-swiss-navy mb-0.5 block cursor-pointer text-sm font-black tracking-widest text-slate-600 uppercase transition-colors"
                    >
                      Detection Only Mode
                    </label>
                    <p className="text-xs leading-relaxed font-medium text-neutral-500">
                      Log threats without blocking them. Useful for testing —
                      attacks are recorded but not stopped.
                    </p>
                  </div>
                </div>
              </div>

              {/* WAF rule-set summary — WafTierPanel.tsx owns its own
                  reads; see that file's docblock. */}
              <WafTierPanel />

              {/* WAF Self-Test — B.6/DASH-2 (VALIDATOR_DASH.md, v2.9.33.49).
                  One-click, no-reload probe that fires a real (HMAC-marked,
                  strike-exempt) attack pattern at a non-own-namespace URL and
                  reports whether the firewall actually blocked it. Five
                  states, matching the backend's `waf_self_test.result` enum
                  (Fix B lane): off (firewall disabled — nothing to test),
                  never (no self-test has ever run), ok/failed (a real
                  pass/fail verdict), unknown (inconclusive — six distinct
                  causes, see unknownCause(); proves nothing either way and
                  must never be shown as OK). */}
              <div className="border-border relative z-10 mt-4 border-t pt-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-black tracking-widest text-neutral-700 uppercase">
                    WAF Self-Test
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs font-black tracking-widest uppercase"
                    onClick={runWafSelfTest}
                    disabled={
                      runningWafSelfTest || wafSelfTestBlockedByFirewallOff
                    }
                    loading={runningWafSelfTest}
                    aria-busy={runningWafSelfTest}
                    title={
                      wafSelfTestBlockedByFirewallOff
                        ? "Turn on the Smart Firewall to run a self-test"
                        : undefined
                    }
                  >
                    {runningWafSelfTest ? "Running…" : "Run self-test now"}
                  </Button>
                </div>
                {(() => {
                  const when = wafSelfTest?.last_run
                    ? new Date(wafSelfTest.last_run).toLocaleString()
                    : null;
                  // F-9 (REAUDIT_DASH_R1.md, v2.9.33.49 round 2): before
                  // GET /security/status resolves, firewallEnabled still
                  // holds its useState(false) default, which used to fall
                  // straight into the "Off — disabled" branch below on
                  // every first paint regardless of the real setting. Hold
                  // a neutral loading branch until the query has data.
                  // R2-4 (REAUDIT_DASH_R2.md, v2.9.33.49 round 3): a failed
                  // /security/status request also leaves data === undefined,
                  // which used to fall through to the neutral loading
                  // branch forever. Branch on the error first so a 403/500/
                  // offline admin sees a truthful, recoverable state instead
                  // of a permanent stall.
                  if (securityStatusError) {
                    return (
                      <p
                        className="text-xs font-semibold text-red-700 dark:text-red-400"
                        role="status"
                      >
                        Status unavailable — try again.
                      </p>
                    );
                  }
                  if (_securityStatusLoading) {
                    return (
                      <p
                        className="text-xs font-semibold text-neutral-600 dark:text-neutral-400"
                        role="status"
                      >
                        Checking…
                      </p>
                    );
                  }
                  if (!firewallEnabled) {
                    return (
                      <p
                        className="text-xs font-semibold text-neutral-600 dark:text-neutral-400"
                        role="status"
                      >
                        Off — the firewall is currently disabled.
                      </p>
                    );
                  }
                  if (!wafSelfTest || wafSelfTest.result === "never") {
                    return (
                      <p
                        className="text-xs font-semibold text-neutral-600 dark:text-neutral-400"
                        role="status"
                      >
                        Never run — click "Run self-test now" to verify the
                        firewall is actually blocking attacks.
                      </p>
                    );
                  }
                  if (wafSelfTest.result === "ok") {
                    return (
                      <>
                        <p
                          className="flex items-center gap-1 text-xs font-black tracking-widest text-emerald-800 uppercase dark:text-emerald-400"
                          role="status"
                        >
                          <CheckCircle size={12} /> OK
                          {when ? ` — ${when}` : ""}
                        </p>
                        {wafSelfTest.detail ? (
                          <p className="text-muted-foreground mt-1 text-xs font-normal normal-case">
                            {wafSelfTest.detail}
                          </p>
                        ) : null}
                      </>
                    );
                  }
                  if (wafSelfTest.result === "failed") {
                    return (
                      <>
                        <p
                          className="flex items-center gap-1 text-xs font-black tracking-widest text-red-700 uppercase dark:text-red-400"
                          role="status"
                        >
                          <ShieldAlert size={12} /> FAILED
                          {when ? ` — ${when}` : ""}
                        </p>
                        {wafSelfTest.detail ? (
                          <p className="text-muted-foreground mt-1 text-xs font-normal normal-case">
                            {wafSelfTest.detail}
                          </p>
                        ) : null}
                      </>
                    );
                  }
                  if (wafSelfTest.result === "unknown") {
                    // F-R3-1 (REAUDIT_DASH_R3): `unknown` has SIX distinct
                    // causes, not one. R2-1 + V-2 widened it from 2 causes
                    // to 9 cells; the old fixed single-cause label below
                    // was false for 7 of them — including the cache-hit /
                    // redirect case, the likeliest outcome on a
                    // cache-fronted host. For result === "unknown",
                    // http_code is a TOTAL function onto the cause class —
                    // see SwissWPSuite_Security::run_waf_self_test()'s
                    // ladder and VALIDATOR_DASH_R3.md §2.2 rows 2–11. Keep
                    // the two in sync; the authoritative sentence is always
                    // wafSelfTest.detail, rendered below.
                    const unknownCause = (code: number | null): string => {
                      if (code === null) return "loopback request failed";
                      if (code === 0) return "loopback unreachable";
                      if (code >= 500 || code === 429)
                        return "site did not respond normally";
                      if (code === 403)
                        return "blocked before the firewall ran";
                      if (code === 200)
                        return "probe never reached the firewall";
                      return `unexpected response (HTTP ${code})`;
                    };
                    return (
                      <>
                        <p
                          className="flex items-center gap-1 text-xs font-black tracking-widest text-amber-800 uppercase dark:text-amber-400"
                          role="status"
                        >
                          <AlertTriangle size={12} /> Unknown (
                          {unknownCause(wafSelfTest.http_code)})
                          {when ? ` — ${when}` : ""}
                        </p>
                        {wafSelfTest.detail ? (
                          <p className="text-muted-foreground mt-1 text-xs font-normal normal-case">
                            {wafSelfTest.detail}
                          </p>
                        ) : null}
                      </>
                    );
                  }
                  // result === "off" reported by the backend itself (e.g. a
                  // stale run() from before the firewall was disabled).
                  return (
                    <p
                      className="text-xs font-semibold text-neutral-600 dark:text-neutral-400"
                      role="status"
                    >
                      Off{when ? ` — last attempted ${when}` : ""}
                    </p>
                  );
                })()}
              </div>
            </div>

            {securityDashboardCards.map((Card, i) => (
              <Card key={i} />
            ))}
            {/* Login Security Card */}
            <div className="glass-panel relative overflow-hidden p-6 transition-all">
              <div className="bg-card/5 absolute top-0 right-0 -mt-12 -mr-12 h-24 w-24 rounded-full" />
              <div className="relative z-10 mb-6 flex items-start justify-between">
                <div
                  className={`rounded-2xl p-3 ${loginEnabled ? "bg-slate-800 text-white shadow-lg shadow-slate-900/20" : "bg-secondary text-neutral-700"}`}
                >
                  <KeyRound size={24} />
                </div>
                {/* Login-lockout protection — this switch renders
                     unconditionally. */}
                <div
                  role="switch"
                  aria-checked={loginEnabled}
                  aria-label="Toggle Login Safeguard"
                  tabIndex={0}
                  className={`h-6 w-12 cursor-pointer rounded-full p-1 ring-1 transition-all duration-300 ring-inset ${loginEnabled ? "bg-green-500 ring-green-600" : "bg-red-500 ring-red-600"}`}
                  onClick={() => handleToggle("login", !loginEnabled)}
                  onKeyDown={(e) =>
                    e.key === "Enter" || e.key === " "
                      ? handleToggle("login", !loginEnabled)
                      : undefined
                  }
                >
                  <div
                    className="h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-300"
                    style={{
                      transform: loginEnabled
                        ? "translateX(1.5rem)"
                        : "translateX(0)",
                    }}
                  />
                </div>
              </div>
              <h3 className="text-swiss-navy relative z-10 mb-2 text-xs font-black tracking-widest uppercase">
                Login Safeguard
              </h3>
              <p className="relative z-10 mb-3 text-sm leading-relaxed font-medium text-neutral-700">
                Protect your admin area from brute-force login attempts with
                automated locking.
              </p>
              {loginSafeguardRows.map((Row, i) => (
                <Row key={i} />
              ))}

              {/* Max-login-attempts is part of the same login-lockout
                   protection as the switch above. */}
              <div className="border-border relative z-10 border-t pt-4">
                <div className="mb-1 flex items-center justify-between">
                  <label
                    htmlFor="loginRetries"
                    className="text-sm font-black tracking-widest text-slate-600 uppercase"
                  >
                    Max Login Attempts
                  </label>
                  <select
                    id="loginRetries"
                    value={loginMaxRetries}
                    onChange={(e) =>
                      saveLoginSettings(parseInt(e.target.value))
                    }
                    className="bg-background border-border focus:ring-swiss-navy rounded-lg px-3 py-1 text-sm font-black"
                  >
                    {[1, 3, 5, 10].map((n) => (
                      <option key={n} value={n}>
                        {n} attempts
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs leading-relaxed font-medium text-neutral-500">
                  After this many failed logins, the IP is blocked for 15
                  minutes.
                </p>
              </div>
            </div>

            {/* Integrity Card */}
            <div className="glass-panel relative overflow-hidden p-6 transition-all">
              <div className="absolute top-0 right-0 -mt-12 -mr-12 h-24 w-24 rounded-full bg-emerald-500/5" />
              <div className="relative z-10 mb-6 flex items-start justify-between">
                <div className="text-foreground dark:text-foreground rounded-2xl bg-emerald-500 p-3 shadow-lg shadow-emerald-500/20">
                  <FileSearch size={24} />
                </div>
                <Badge className="rounded-full border-none bg-emerald-100 px-3 py-1 text-xs font-black tracking-widest text-emerald-700 uppercase">
                  Secure
                </Badge>
              </div>
              <h3 className="text-swiss-navy relative z-10 mb-2 text-xs font-black tracking-widest uppercase">
                File Integrity
              </h3>
              <p className="relative z-10 mb-4 text-sm leading-relaxed font-medium text-neutral-700">
                Compares your WordPress core files to the official WordPress
                release to detect any unexpected changes. Alerts you if core
                files have been modified, deleted, or replaced — a common sign
                of a hack.
              </p>
              <div className="border-border mt-auto flex items-center justify-between border-t pt-4">
                <span className="text-sm font-black tracking-widest text-neutral-700 uppercase">
                  Last Verified
                </span>
                <span className="text-sm font-black tracking-widest text-emerald-600 uppercase">
                  {lastScan === "Never"
                    ? "Automatic daily checks enabled"
                    : lastScan}
                </span>
              </div>
            </div>
          </div>

          {/* Abandoned Plugins Panel */}
          {abandonedPlugins !== null && (
            <div className="glass-panel relative mt-4 overflow-hidden p-6 transition-all">
              <div className="absolute top-0 right-0 -mt-12 -mr-12 h-24 w-24 rounded-full bg-orange-500/5" />
              <div className="relative z-10 mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-swiss-navy text-xs font-black tracking-widest uppercase">
                    Closed / Abandoned Plugins
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed font-medium text-neutral-700">
                    Plugins closed on WordPress.org no longer receive security
                    updates. Commercial/custom plugins not on WP.org are
                    informational only.
                  </p>
                </div>
                {abandonedPlugins.enabled &&
                  abandonedPlugins.plugins.length > 0 &&
                  (() => {
                    const hasClosedPlugins = abandonedPlugins.plugins.some(
                      (p) => p.reason === "closed"
                    );
                    return (
                      <Badge
                        className={`ml-4 shrink-0 rounded-full border-none px-3 py-1 text-xs font-black tracking-widest uppercase ${
                          hasClosedPlugins
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {hasClosedPlugins ? "HIGH" : "INFO"}
                      </Badge>
                    );
                  })()}
              </div>

              {!abandonedPlugins.enabled ? (
                <p className="text-muted-foreground relative z-10 text-sm font-medium">
                  Abandoned plugin detection is disabled.
                </p>
              ) : abandonedPlugins.plugins.length === 0 ? (
                <div className="relative z-10">
                  <div className="mb-2 flex items-center gap-2 text-sm font-black tracking-widest text-emerald-700 uppercase">
                    <CheckCircle size={16} />
                    No closed or abandoned plugins detected
                  </div>
                  {abandonedPlugins.last_check > 0 && (
                    <p className="text-muted-foreground text-xs font-medium">
                      Last checked:{" "}
                      {new Date(
                        abandonedPlugins.last_check * 1000
                      ).toLocaleString()}
                    </p>
                  )}
                </div>
              ) : (
                <div className="relative z-10 space-y-3">
                  {abandonedPlugins.plugins.map((plugin) => {
                    const isClosed = plugin.reason === "closed";
                    return (
                      <div
                        key={plugin.slug}
                        className={`rounded-xl border p-4 ${
                          isClosed
                            ? "border-red-200 bg-red-50"
                            : "border-amber-200 bg-amber-50"
                        }`}
                      >
                        <div className="mb-0.5 flex items-center gap-2">
                          <p className="text-swiss-navy text-sm font-black">
                            {plugin.name}
                          </p>
                          <Badge
                            className={`shrink-0 rounded-full border-none px-2 py-0.5 text-xs font-black tracking-widest uppercase ${
                              isClosed
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {isClosed
                              ? "CLOSED"
                              : "SLUG MISMATCH — Verify if the plugin is still available on WordPress.org if it has been removed"}
                          </Badge>
                        </div>
                        <code className="font-mono text-xs text-neutral-600">
                          {plugin.slug}
                        </code>
                        <p
                          className={`mt-1 text-xs font-medium ${
                            isClosed ? "text-red-700" : "text-amber-700"
                          }`}
                        >
                          {isClosed
                            ? `This plugin was closed on WordPress.org${
                                plugin.closed_date
                                  ? ` on ${plugin.closed_date}`
                                  : ""
                              }. It no longer receives security updates. Deactivate and find an alternative.`
                            : "This plugin is not listed on WordPress.org. This is normal for commercial, hosting-bundled, or custom-built plugins. Verify it comes from a trusted source."}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="border-border relative z-10 mt-4 flex items-center justify-between border-t pt-4">
                {abandonedPlugins.last_check > 0 && abandonedPlugins.enabled ? (
                  <span className="text-muted-foreground text-xs font-medium">
                    Last checked:{" "}
                    {new Date(
                      abandonedPlugins.last_check * 1000
                    ).toLocaleString()}
                  </span>
                ) : (
                  <span />
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs font-black tracking-widest uppercase"
                  onClick={handleAbandonedPluginsRefresh}
                  disabled={abandonedRefreshing}
                  loading={abandonedRefreshing}
                  aria-busy={abandonedRefreshing}
                >
                  {abandonedRefreshing ? (
                    <>
                      <Loader size={12} className="mr-1.5 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <RotateCcw size={12} className="mr-1.5" />
                      Re-check now
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Scan summary card — shown after any scan completes, on Dashboard tab */}
          {sentinelReport && (
            <div
              className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
              role="status"
              aria-live="polite"
              aria-label="Latest scan result summary"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-neutral-800">
                    {buildScanSummaryTitle(_latestScanData?.record)}
                  </p>
                  <p className="mt-0.5 text-sm text-neutral-500">
                    {buildScanSummarySubtitle(sentinelReport.findings)}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  className="shrink-0 rounded-xl text-sm"
                  onClick={() => setActiveTab("scan")}
                  aria-label="View findings and apply fixes on the Scan tab"
                >
                  View &amp; Fix
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "scan" && (
        <div className="animate-in fade-in slide-in-from-right-4 space-y-4">
          {/* ── Historical scan detail (opened via History tab VIEW button) ── */}
          {historicalScanDetail && (
            <ScanHistoricalRecord
              historicalScanDetail={historicalScanDetail}
              onClose={() => setHistoricalScanDetail(null)}
            />
          )}

          {/* ── Scan Consolidation UI (v2.9.28.0) ─────────────────────────── */}
          <ScanCronStatusBanner
            config={scanReportConfig}
            onPreviewEmail={handleOpenPreview}
          />

          {/* One card covers both the signature scan and the posture
              check, so there is no separate malware card. */}
          <ScanCard
            scanType="deep-malware"
            onTrigger={() => handleTriggerScan("deep-malware")}
            isLoading={deepMalwareStatus === "running"}
            result={deepMalwareResult}
            loadingMessage={
              deepMalwarePhase
                ? (DEEP_MALWARE_PHASE_LABELS[deepMalwarePhase] ?? undefined)
                : undefined
            }
          />
          <ScanResultPanel
            scanType="deep-malware"
            result={deepMalwareResult}
            isLoading={deepMalwareStatus === "running"}
            onViewHistory={handleViewScanInHistory}
            onMarkSafe={handleMarkMalwareSafe}
            onBulkAction={handleScanPanelBulkAction}
            onAnalyze={(file) =>
              setAnalyzeRequest({ file, requestedAt: Date.now() })
            }
            analyzingFile={analyzingFile}
          />

          <ScanReportSettingsPanel
            config={scanReportConfig}
            onSave={handleSaveReportConfig}
            isSaving={false}
          />
        </div>
      )}

      {activeTab === "logs" && (
        <SecurityLogsPanel
          logs={logs}
          onBanIp={handleBanIp}
          bannedIps={bannedIps}
        />
      )}

      {activeTab === "hardening" && (
        <HardeningOptionsGrid
          options={hardeningOptions}
          isLoading={loadingHardening}
          onToggle={toggleHardening}
          onApplyAll={applyAllHardening}
        />
      )}

      {activeTab === "cloud-shield" && (
        <CloudShieldPanel
          cloudflareDetected={cloudflareDetected}
          cloudflareConnectingIp={cloudflareConnectingIp}
          cloudflareCountryHeader={cloudflareCountryHeader}
          headersActive={hardeningOptions.some(
            (o) => o.key === "force_security_headers" && o.enabled
          )}
          wafActive={firewallEnabled}
          botBlockingActive={hardeningOptions.some(
            (o) => o.key === "block_bad_bots" && o.enabled
          )}
          versionHidingActive={hardeningOptions.some(
            (o) => o.key === "hide_wp_version" && o.enabled
          )}
        />
      )}

      {activeTab === "quarantine" && (
        <QuarantineTab
          bannedIps={bannedIps}
          bannedIpTypes={bannedIpTypes}
          manualIp={manualIp}
          allowedIps={allowedIps}
          currentIp={currentIp}
          manualAllowedIp={manualAllowedIp}
          quarantinedFiles={quarantinedFiles}
          ignoredPaths={ignoredPaths}
          onChangeManualIp={setManualIp}
          onChangeManualAllowedIp={setManualAllowedIp}
          onBanIp={handleBanIp}
          onUnbanIp={handleUnbanIp}
          onAllowIp={handleAllowIp}
          onRemoveAllowedIp={handleRemoveAllowedIp}
          onRestoreQuarantine={handleRestore}
          onDeleteQuarantine={handleDeleteQuarantine}
          onUnIgnore={handleUnIgnore}
          onMount={() => {
            // v2.9.30.117: refetch only if cache stale — TanStack Query dedupes.
            void fetchQuarantine();
            void fetchIgnored();
            queryClient.invalidateQueries({
              queryKey: ["security-banned-ips"],
            });
          }}
        />
      )}

      {/* ── History Tab Panel ─────────────────────────────────────── */}
      {activeTab === "history" && (
        <ScanHistoryTable
          scanHistory={scanHistory}
          loadingRecordId={loadingHistoricalScanId}
          onRefresh={fetchScanHistory}
          onViewRecord={(record) => {
            fetchScanRecord(record.id);
          }}
        />
      )}

      {securityDataReviewSections.map((Section, i) => (
        <Section
          key={i}
          reportOpen={{ logs: showLogAdvisor, firewall: showFirewallAdvisor }}
          onOpenReport={(report) =>
            report === "logs"
              ? setShowLogAdvisor(true)
              : setShowFirewallAdvisor(true)
          }
          onCloseReport={(report) =>
            report === "logs"
              ? setShowLogAdvisor(false)
              : setShowFirewallAdvisor(false)
          }
          inspectRequest={analyzeRequest}
          bannedIps={bannedIps}
          banRevision={banRevision}
          scanInFlight={deepScanStatus?.status === "running"}
          lastScanResponse={lastScanResponse}
          actions={reviewActions}
        />
      ))}

      {/* Scan Report Preview Modal (v2.9.28.0) */}
      <ScanReportPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        previewHtml={previewHtml}
      />

      {/* T4 (Package E / G2 dead-path removal, 2026-08-13): the Module 5
          Consent Modal render (<SentinelM5ConsentModal>) that used to sit
          here was DELETED — `setShowM5Consent(true)` had zero call sites
          anywhere in the tree, so this modal could never open. See the
          two-proof verification comment above runSentinelFullScan's
          deletion site. */}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-msg"
        >
          <div className="bg-card border-border animate-in zoom-in-95 mx-4 w-full max-w-md rounded-3xl border p-8 duration-200">
            <p
              id="confirm-dialog-msg"
              className="text-foreground mb-6 text-sm leading-relaxed font-bold whitespace-pre-line"
            >
              {confirmDialog.message}
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setConfirmDialog(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* L1 Manual Fix Guide Modal (chmod failures on Hostinger/CloudLinux) */}
      {l1ManualFix && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm duration-300">
          <div className="bg-card dark:bg-card border-border dark:border-border/20 animate-in zoom-in-95 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[2.5rem] border backdrop-blur-xl duration-500">
            <div className="bg-swiss-navy flex shrink-0 items-center justify-between p-8 text-white">
              <h3 className="flex items-center gap-4 text-xl font-black tracking-[0.1em] uppercase">
                <AlertTriangle size={24} className="text-brand-accent" /> Manual
                Fix REQUIRED
              </h3>
              <button
                onClick={() => setL1ManualFix(null)}
                aria-label="Close manual fix guide"
                className="bg-secondary dark:bg-card/10 dark:hover:bg-card/20 dark:text-foreground rounded-2xl p-3 text-neutral-900 transition-all hover:bg-slate-200"
              >
                <X size={24} />
              </button>
            </div>

            <div className="bg-background dark:bg-card/50 flex-1 space-y-10 overflow-y-auto p-10">
              {/* WHAT */}
              <div className="bg-card dark:bg-secondary border-border dark:border-border/10 shadow-soft rounded-3xl border p-8">
                <div className="mb-4 flex items-center justify-between">
                  <span className="bg-secondary dark:bg-secondary rounded-lg px-3 py-1.5 text-xs font-black tracking-widest text-neutral-700 uppercase">
                    NODE_STATUS
                  </span>
                  <h4 className="dark:text-foreground text-xs font-black tracking-widest text-neutral-900 uppercase">
                    THE SECURITY BREACH
                  </h4>
                </div>
                <p className="text-[14px] leading-relaxed font-bold text-neutral-700">
                  {l1ManualFix.what}
                </p>
              </div>

              {/* WHY */}
              <div className="bg-background border-border rounded-3xl border p-8 shadow-inner">
                <h4 className="text-swiss-navy mb-5 flex items-center gap-3 text-xs font-black tracking-widest uppercase">
                  <span className="bg-brand-accent/10 text-brand-accent rounded-lg px-3 py-1.5 text-xs font-black tracking-widest uppercase">
                    RESTRICTION
                  </span>
                  REASON FOR MANUAL INTERVENTION
                </h4>
                <p className="text-[14px] leading-relaxed font-bold text-slate-600 italic">
                  {l1ManualFix.why}
                </p>
              </div>

              {/* HOW */}
              <div className="bg-card dark:bg-secondary border-border dark:border-border/10 relative overflow-hidden rounded-[2rem] border p-10">
                <div className="bg-brand-accent/10 absolute top-0 right-0 -mt-10 -mr-10 h-32 w-32 blur-3xl" />
                <div className="relative z-10 mb-6 flex items-center justify-between">
                  <h3 className="bg-gradient-to-r from-neutral-900 to-neutral-600 bg-clip-text text-xl font-bold text-transparent dark:from-white dark:to-slate-400">
                    Security Core
                  </h3>
                  <span className="bg-secondary dark:bg-card/10 dark:text-foreground rounded-lg px-3 py-1.5 text-xs font-black tracking-widest text-neutral-900 uppercase">
                    PROTOCOL
                  </span>
                </div>
                <h4 className="dark:text-foreground relative z-10 mb-8 flex items-center gap-3 text-xs font-black tracking-widest text-neutral-900 uppercase">
                  REMEDIATION SEQUENCE
                </h4>
                <ol className="relative z-10 space-y-6">
                  {l1ManualFix.how.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-6">
                      <span className="text-swiss-navy bg-card shadow-glow-white flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-[12px] font-black">
                        {idx + 1}
                      </span>
                      <span className="text-[14px] leading-relaxed font-black tracking-tight">
                        {step.replace(/^\d+\.\s*/, "")}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="bg-background dark:bg-secondary border-border dark:border-border/10 flex shrink-0 justify-center border-t p-8">
              <Button
                onClick={() => setL1ManualFix(null)}
                variant="primary"
                size="lg"
                className="w-full"
              >
                MISSION ACKNOWLEDGED
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityHub;
