import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  SecurityLog,
  SentinelReport,
  SentinelLayer2Report,
  SentinelLayer1Finding,
  ScanHistoryRecord,
  ScanHistoryDetail,
  SecurityAlert,
  DeepScanStatus,
  AiFileAnalysis,
  LogAnalysis,
  FirewallAnalysis,
  SentinelAuditResult,
  SentinelCredits,
  HardeningOption,
  QuarantineFile,
  AbandonedPluginsStatus,
  LatestScanResponse,
} from "../types";
import { wpApi, ApiError } from "../services/api";
import {
  STATUS_TTL,
  HARDENING_TTL,
  LOGS_TTL,
  UPDATE_GUARD_POLL,
} from "../lib/cacheTtl";
import { useTokenBalance } from "../hooks/useTokenBalance";
import { useScanStore } from "../store/useScanStore";
import {
  Shield,
  ShieldAlert,
  Globe,
  Lock,
  ShieldCheck,
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
import { toast } from "sonner";
import { Badge } from "./ui/Badge";
import { SectionHeader } from "./ui/SectionHeader";
import { SentinelGradeBadge } from "./organisms/Sentinel/SentinelGradeBadge";
import { SentinelAttackChains } from "./organisms/Sentinel/SentinelAttackChains";
import { SentinelM5ConsentModal } from "./organisms/Sentinel/SentinelM5ConsentModal";
import { ScanHistoryTable } from "./organisms/Security/ScanHistoryTable";
import { HardeningOptionsGrid } from "./organisms/Security/HardeningOptionsGrid";
import { CloudShieldPanel } from "./organisms/Security/CloudShieldPanel";
import { SecurityLogsPanel } from "./organisms/Security/SecurityLogsPanel";
import { QuarantineTab } from "./organisms/Security/QuarantineTab";
import { FREE_HARDENING_KEYS } from "../constants/hardening";
import ScanCronStatusBanner from "./organisms/Scan/ScanCronStatusBanner";
import ScanCard from "./organisms/Scan/ScanCard";
import ScanResultPanel from "./organisms/Scan/ScanResultPanel";
import ScanReportPreviewModal from "./organisms/Scan/ScanReportPreviewModal";
import ScanReportSettingsPanel from "./organisms/Scan/ScanReportSettingsPanel";
import { ScanHistoricalRecord } from "./organisms/Scan/ScanHistoricalRecord";
import UpdateGuardCard from "./organisms/UpdateGuard/UpdateGuardCard";
import { FeaturePointer } from "./organisms/Upsell/FeaturePointer";
import { isProEdition } from "../lib/edition";
import type {
  AiAuditResult,
  MalwareScanResult,
  FullAiScanResult,
  FullAiScanJob,
  DeepMalwareScanJob,
  ScanReportConfig,
  UpdateGuardStatus,
  UpdateSnapshot,
  UpdateGuardReview,
} from "../types";

interface RemediateResponse {
  success: boolean;
  message?: string;
  manual_fix?: { what: string; why: string; how: string[] };
  auto_fix_available?: boolean;
}

interface FixNowIssue {
  id?: string;
  file?: string;
  title?: string;
  description?: string;
  impact?: string;
  remediation?: string;
  [key: string]: unknown;
}

// Helper Component for "Fix Now" - Defined BEFORE usage to prevent ReferenceError
const FixNowButton = ({
  issueId,
  issue,
}: {
  issueId: string;
  issue?: FixNowIssue;
}) => {
  const [loading, setLoading] = useState(false);
  const [fixed, setFixed] = useState(false);
  const [showManualGuide, setShowManualGuide] = useState(false);
  const [manualFix, setManualFix] = useState<{
    what: string;
    why: string;
    how: string[];
  } | null>(null);

  const handleFix = async () => {
    setLoading(true);
    try {
      const body: Record<string, unknown> = { issue_id: issueId };

      // If AI suggested "delete_malware", use specific action
      if (
        issueId === "malicious_file_detected" ||
        issueId === "delete_malware"
      ) {
        body.action = "delete_malware";
        body.file = issue?.file;
      }

      const data = await wpApi<RemediateResponse>(
        "/security/sentinel/remediate",
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      );

      if (data.success) {
        setFixed(true);
        toast.success(data.message || "Issue fixed successfully!");
      } else if (data.manual_fix) {
        // Auto-fix not available - show manual guide
        setManualFix(data.manual_fix);
        setShowManualGuide(true);
      } else if (data.auto_fix_available === false) {
        // Explicitly not auto-fixable
        setManualFix(data.manual_fix ?? null);
        setShowManualGuide(true);
      } else {
        toast.error("Fix Failed: " + (data.message || "Unknown error"));
      }
    } catch (e) {
      console.error(e);
      toast.error("Fix Failed: Network Error");
    } finally {
      setLoading(false);
    }
  };

  if (fixed) {
    return (
      <Button disabled variant="success" icon={CheckCircle}>
        Fixed
      </Button>
    );
  }

  return (
    <>
      <Button
        onClick={handleFix}
        disabled={loading}
        loading={loading}
        variant="primary"
        icon={Shield}
        className="shadow-glow-red"
      >
        {loading ? "Fixing..." : "Fix Now"}
      </Button>

      {/* Manual Fix Guide Modal */}
      {showManualGuide && manualFix && (
        <div className="bg-card dark:bg-card shadow-premium border-border dark:border-border/20 animate-in zoom-in-95 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[2.5rem] border backdrop-blur-xl duration-500">
          <div className="bg-swiss-navy flex shrink-0 items-center justify-between p-8 text-white">
            <h3 className="flex items-center gap-4 text-xl font-black tracking-[0.1em] uppercase">
              <AlertTriangle size={24} className="text-brand-accent" /> Manual
              Fix REQUIRED
            </h3>
            <button
              onClick={() => setShowManualGuide(false)}
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
                {manualFix.what}
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
                {manualFix.why}
              </p>
            </div>

            {/* HOW */}
            <div className="bg-card dark:bg-secondary border-border dark:border-border/10 shadow-premium relative overflow-hidden rounded-[2rem] border p-10">
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
                {manualFix.how.map((step, idx) => (
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
              onClick={() => setShowManualGuide(false)}
              variant="primary"
              size="lg"
              className="w-full"
            >
              MISSION ACKNOWLEDGED
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

const calculatePercent = (value: number, total: number): number => {
  if (!total || total === 0) return 0;
  return Math.min(100, Math.round((value / total) * 100));
};

// Module-scope constants — hoisted here to avoid re-creation on every render

// Log action button base styles (used in getLogActionButton)
const LOG_BTN_BASE =
  "bg-secondary text-swiss-navy hover:bg-swiss-navy hover:text-white rounded-xl uppercase font-black text-xs px-4";
const LOG_BTN_ACCENT =
  "bg-brand-accent/10 text-brand-accent hover:bg-brand-accent hover:text-foreground border border-brand-accent/30 rounded-xl uppercase font-black text-xs px-4";

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
  currentScanFindings: AiAuditResult["findings"];
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

  // Geo-Blocking State
  const [geoEnabled, setGeoEnabled] = useState(false);
  const [globalGeoBlock, setGlobalGeoBlock] = useState(false);

  const [loginEnabled, setLoginEnabled] = useState(false);
  const [loginMaxRetries, setLoginMaxRetries] = useState(3);

  // F-302: scanning / scanResults / basicScanExpanded / handleScan removed —
  // the legacy POST /security/scan basic core-integrity flow was superseded by
  // the ScanCard + ScanResultPanel architecture (ai-audit / malware / full-ai).
  // BasicScanResults lives as an organism in case the flow is revived later.
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [lastScan, setLastScan] = useState<string>("Never");
  const [alerts, setAlerts] = useState<SecurityAlert | null>(null); // Background AI Alerts

  // --- Alert dismiss persistence helpers ---
  /**
   * Key: swisswp_dismissed_threats
   * Shape: Record<fingerprint, dismissedAtMs>
   * — a map so multiple distinct alert clusters can be dismissed independently.
   */
  const ALERT_DISMISS_KEY = "swisswp_dismissed_threats";
  const ALERT_DISMISS_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Stable fingerprint for a SecurityAlert — used as the dismiss identity key.
   *
   * Uses verdict + threatLevel + sorted topIps (server-injected, deterministic).
   * Avoids the AI-generated summary, which changes on every cron run even for
   * the same attack cluster, causing dismissed alerts to re-appear immediately.
   * Falls back to summary prefix only when topIps is absent (legacy alerts).
   */
  const getAlertFingerprint = (alert: SecurityAlert): string => {
    // Normalize IPs to /24 subnet so rotating IPs from the same attacker
    // (e.g. 185.177.72.50, 185.177.72.56, 185.177.72.30) share one dismiss key.
    const toSubnet = (ip: string) => ip.split(".").slice(0, 3).join(".");
    const ipPart =
      alert.topIps && alert.topIps.length > 0
        ? [...new Set(alert.topIps.map(toSubnet))].sort().join(",")
        : alert.summary.slice(0, 80);
    return `${alert.verdict}|${alert.threatLevel}|${ipPart}`;
  };

  /** Returns true if this alert was dismissed within the last 24 hours. */
  const isAlertDismissed = (alert: SecurityAlert): boolean => {
    try {
      const stored = localStorage.getItem(ALERT_DISMISS_KEY);
      if (!stored) return false;
      const map = JSON.parse(stored) as Record<string, number>;
      const fp = getAlertFingerprint(alert);
      const dismissedAt = map[fp];
      if (!dismissedAt) return false;
      return Date.now() - dismissedAt < ALERT_DISMISS_TTL_MS;
    } catch {
      return false;
    }
  };

  /** Persists the dismiss in localStorage (map-per-fingerprint) and clears alert state. */
  const handleDismissAlert = () => {
    if (alerts) {
      try {
        const stored = localStorage.getItem(ALERT_DISMISS_KEY);
        const map: Record<string, number> = stored ? JSON.parse(stored) : {};
        // Evict entries older than 24h to keep the map lean
        const now = Date.now();
        for (const key of Object.keys(map)) {
          if (now - map[key] >= ALERT_DISMISS_TTL_MS) delete map[key];
        }
        map[getAlertFingerprint(alerts)] = now;
        localStorage.setItem(ALERT_DISMISS_KEY, JSON.stringify(map));
      } catch {
        // localStorage may be unavailable in some strict environments — silently ignore
      }
    }
    setAlerts(null);
  };

  // ── Scan state (v2.9.28.43): sourced from useScanStore Zustand slice ─────
  // Replaces 10 useState hooks that previously lived here. See
  // plugin/src/store/useScanStore.ts for rationale. Functional updates use
  // the dedicated `updateXxxResult` helpers (see store docs).
  const scanReportConfig = useScanStore((s) => s.scanReportConfig);
  const setScanReportConfig = useScanStore((s) => s.setScanReportConfig);
  const aiAuditResult = useScanStore((s) => s.aiAuditResult);
  const setAiAuditResult = useScanStore((s) => s.setAiAuditResult);
  const updateAiAuditResult = useScanStore((s) => s.updateAiAuditResult);
  const malwareResult = useScanStore((s) => s.malwareResult);
  const setMalwareResult = useScanStore((s) => s.setMalwareResult);
  const updateMalwareResult = useScanStore((s) => s.updateMalwareResult);
  const fullAiResult = useScanStore((s) => s.fullAiResult);
  const setFullAiResult = useScanStore((s) => s.setFullAiResult);
  const updateFullAiResult = useScanStore((s) => s.updateFullAiResult);
  const aiAuditLoading = useScanStore((s) => s.aiAuditLoading);
  const setAiAuditLoading = useScanStore((s) => s.setAiAuditLoading);
  const malwareLoading = useScanStore((s) => s.malwareLoading);
  const setMalwareLoading = useScanStore((s) => s.setMalwareLoading);
  const fullAiLoading = useScanStore((s) => s.fullAiLoading);
  const setFullAiLoading = useScanStore((s) => s.setFullAiLoading);
  // v2.9.28.25: Phase-aware progress message surfaced on the Full AI ScanCard
  // during the two-phase state-machine flow. Empty string means "no message"
  // (falls back to the ScanCard's default "Scanning…" label).
  const fullAiPhaseMessage = useScanStore((s) => s.fullAiPhaseMessage);
  const setFullAiPhaseMessage = useScanStore((s) => s.setFullAiPhaseMessage);
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
  // ── Update Guard State (Sprint 2 — Phase 1) ───────────────────────────────
  const [updateGuardSnapshots, setUpdateGuardSnapshots] = useState<
    UpdateSnapshot[]
  >([]);
  const [previewModalOpen, setPreviewModalOpen] = React.useState(false);
  const [previewHtml, setPreviewHtml] = React.useState<string | null>(null);

  // Deep Scan State
  // TODO: deprecated — showDeepScanModal is no longer triggered after v2.9.28.0 scan consolidation. Remove in v2.9.30.
  const [showDeepScanModal, setShowDeepScanModal] = useState(false);
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
  // "Manage safelist" sheet rendered from the AI Audit result panel.
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
  const [aiAnalysis, setAiAnalysis] = useState<AiFileAnalysis | null>(null);
  // v2.9.28.43: migrated to useScanStore (scan-related state consolidation)
  const analyzingFile = useScanStore((s) => s.analyzingFile);
  const setAnalyzingFile = useScanStore((s) => s.setAnalyzingFile);

  // Log Advisor State
  const [showLogAdvisor, setShowLogAdvisor] = useState(false);
  const [logAnalysis, setLogAnalysis] = useState<LogAnalysis | null>(null);
  const [analyzingLogs, setAnalyzingLogs] = useState(false);

  // Firewall Analysis State
  const [showFirewallAdvisor, setShowFirewallAdvisor] = useState(false);
  const [firewallAnalysis, setFirewallAnalysis] =
    useState<FirewallAnalysis | null>(null);
  const [analyzingFirewall, setAnalyzingFirewall] = useState(false);

  // W4 — Elapsed timer for long AI calls (compound model; 15–60s)
  const [aiElapsed, setAiElapsed] = React.useState(0);
  const aiTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const startAiTimer = React.useCallback(() => {
    setAiElapsed(0);
    aiTimerRef.current = setInterval(
      () => setAiElapsed((prev) => prev + 1),
      1000
    );
  }, []);

  const stopAiTimer = React.useCallback(() => {
    if (aiTimerRef.current) {
      clearInterval(aiTimerRef.current);
      aiTimerRef.current = null;
    }
  }, []);

  // Cleanup elapsed timer on unmount
  React.useEffect(() => () => stopAiTimer(), [stopAiTimer]);

  // W3 — Token balance gate
  const {
    canAfford,
    tokensNeeded,
    // v32: total spendable = monthly allowance + purchased pack. canAfford() is already
    // pack-aware; tokenSpendable is shown in the "insufficient tokens" messages so the
    // number the user sees matches the affordability check when they own a pack.
    totalSpendable: tokenSpendable,
    setBalance,
  } = useTokenBalance();

  const [sentinelCredits, setSentinelCredits] =
    useState<SentinelCredits | null>(null);
  const [identityValid, setIdentityValid] = useState(true);

  // Sentinel Full Scan (Layer 1 + optional Layer 2) State
  const [sentinelReport, setSentinelReport] = useState<SentinelReport | null>(
    null
  );
  const [sentinelScanning, setSentinelScanning] = useState(false);
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
  const [showM5Consent, setShowM5Consent] = useState(false);
  const [expandedSentinelView, setExpandedSentinelView] = useState<
    "layer2" | "layer1" | null
  >(null);

  // Hardening State
  const [hardeningOptions, setHardeningOptions] = useState<HardeningOption[]>(
    []
  );
  const [loadingHardening, setLoadingHardening] = useState(false);

  // Abandoned Plugin Detection State
  const [abandonedPlugins, setAbandonedPlugins] =
    useState<AbandonedPluginsStatus | null>(null);
  const [abandonedRefreshing, setAbandonedRefreshing] = useState(false);

  // Cloud Shield (Cloudflare detection) State
  const [cloudflareDetected, setCloudflareDetected] = useState(false);
  const [cloudflareConnectingIp, setCloudflareConnectingIp] = useState(false);
  const [cloudflareCountryHeader, setCloudflareCountryHeader] = useState(false);

  // Geo Country Picker State
  const [geoSettings, setGeoSettings] = useState<{
    list_mode: "blacklist" | "whitelist";
    countries: string[];
  }>({ list_mode: "blacklist", countries: [] });
  const [allCountries, setAllCountries] = useState<
    { code: string; name: string; flag: string }[]
  >([]);
  const [geoSearch, setGeoSearch] = useState("");
  const [showGeoPicker, setShowGeoPicker] = useState(false);
  const [savingGeo, setSavingGeo] = useState(false);

  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const showConfirm = (message: string, onConfirm: () => void) =>
    setConfirmDialog({ message, onConfirm });

  // Memoised country filter — avoids re-filtering on every render unrelated to geo search
  const filteredCountries = useMemo(
    () =>
      allCountries.filter(
        (c) =>
          c.name.toLowerCase().includes(geoSearch.toLowerCase()) ||
          c.code.toLowerCase().includes(geoSearch.toLowerCase())
      ),
    [allCountries, geoSearch]
  );

  // Log Action Guide State — shows manual fix guide for non-auto-fixable advisor actions
  const [logActionGuide, setLogActionGuide] = useState<{
    what: string;
    why: string;
    how: string[];
  } | null>(null);

  const { homeUrl, hasAdvancedWaf, sentinelIsPro } =
    window.swisswpsuiteData || {};

  // Primary: REST fetch updates sentinelCredits. Fallback: PHP-injected sentinelIsPro
  // from window.swisswpsuiteData ensures buttons unlock even if REST fetch fails
  // (e.g. output buffer corruption by LiteSpeed Cache on plugin-heavy sites).
  // IMPORTANT: wp_localize_script converts PHP booleans to strings ("1"/""),
  // so we use !! (truthiness) instead of === true (strict equality).
  const hasSentinelPro = !!sentinelCredits?.is_pro || !!sentinelIsPro;

  // ── Security-plan gate (WAF, hardening, geo, login, AI log, IP allowlist,
  //    quarantine/delete, blocked IPs, attack-chain blocking, Update Guard) ──
  // Gated on the 'waf' capability — present only on Security plan tiers.
  // Intentionally separate from hasSentinelPro (which gates deep malware scan
  // and is granted to ALL paid plans including SEO_MONTHLY).
  const securityCaps = window.swisswpsuiteData?.license?.capabilities;
  const hasSecurity =
    Array.isArray(securityCaps) && securityCaps.includes("waf");

  // ── Freemium Dual-Build (Phase 3, 2026-07-17) ──────────────────────────────
  // Update Guard, Geo-Blocking, and 2FA are entirely Pro-local — physically
  // absent from the Free zip, not merely capability-gated. This must win
  // over hasSecurity/hasSentinelPro even if a stale cached capability claims
  // a paid tier, because in the Free build the code (and its backing REST
  // routes) simply isn't there. Scanner, basic WAF, basic login protection,
  // quarantine, and logs are free and unaffected — they already use the
  // "interactive toggle vs BASIC ACTIVE label" pattern below.
  //
  // Hardening is the exception (Owner decision #4, 2026-07-17): it is now
  // PARTIALLY free — 6 of 13 options are free/functional in BOTH editions,
  // the other 7 are Pro-locked. Its REST routes are present in the Free zip,
  // so isProEditionBuild is NOT used to gate the Hardening panel or its data
  // query below; the free/locked split is enforced per-option inside
  // HardeningOptionsGrid.tsx via FREE_HARDENING_KEYS (constants/hardening.ts).
  const isProEditionBuild = isProEdition();

  // ── Scan Consolidation: derive current tier from hasSentinelPro ───────────
  // 'pro'  — active Pro license detected (sentinelCredits.is_pro or sentinelIsPro)
  // 'free' — license present but not Pro (sentinelCredits exists, is_pro false)
  // 'none' — no license / credentials not yet fetched
  const currentTier: "none" | "free" | "pro" = hasSentinelPro
    ? "pro"
    : sentinelCredits
      ? "free"
      : "none";

  // Free tier hardening options — always accessible, no Pro required.
  // Canonical list lives in plugin/src/constants/hardening.ts — imported above.
  // PHP equivalent: api.php get_free_hardening_options()

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

  // /security/status — WAF, spam, geo, login, last_scan, alerts
  const { data: _securityStatusData, isLoading: _securityStatusLoading } =
    useQuery<{
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
    }>({
      queryKey: ["security-status"],
      queryFn: () =>
        wpApi<{
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
    setGeoEnabled(data.geo_enabled ?? false);
    setGlobalGeoBlock(data.global_geo_block ?? false);
    setLoginEnabled(data.login_enabled ?? false);
    setLoginMaxRetries(data.login_max_retries ?? 3);
    setLastScan(data.last_scan);
    if (data.alerts && !isAlertDismissed(data.alerts)) {
      setAlerts(data.alerts);
    }
  }, [_securityStatusData]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // /security/sentinel/status — credits, identity
  const { data: _sentinelStatusData } = useQuery<{
    has_audit: boolean;
    audit?: SentinelAuditResult;
    credits?: SentinelCredits;
    identity_valid?: boolean;
  }>({
    queryKey: ["sentinel-status"],
    queryFn: () =>
      wpApi<{
        has_audit: boolean;
        audit?: SentinelAuditResult;
        credits?: SentinelCredits;
        identity_valid?: boolean;
      }>("/security/sentinel/status"),
    staleTime: STATUS_TTL,
  });

  useEffect(() => {
    const data = _sentinelStatusData;
    if (!data) return;
    if (data.credits) setSentinelCredits(data.credits);
    if (data.identity_valid === false) setIdentityValid(false);
  }, [_sentinelStatusData]);

  // /hardening/status — hardening options list
  // Owner decision #4 (2026-07-17): Hardening is now PARTIALLY free (6 of 13
  // options), so its route is present and this query is enabled in BOTH
  // editions — unlike Update Guard/Geo/2FA above, which stay Pro-only.
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

    // SEC-4: Filter out findings with status === 'fixed'.
    const openFindings = (detail.layer1_findings ?? []).filter(
      (f) => f.status !== "fixed"
    );

    if (detail.layer2_report) {
      const l2 = detail.layer2_report;
      setSentinelReport({
        ...l2,
        individual_findings: openFindings,
        attack_chains: l2.attack_chains ?? [],
        remediation_plan: l2.remediation_plan ?? [],
        positive_findings: l2.positive_findings ?? [],
        scan_metadata: l2.scan_metadata ?? {
          sentinel_version: "2.1",
          analysis_date: new Date().toISOString(),
          model_used: "unknown",
          findings_count: openFindings.length,
          critical_count: openFindings.filter((f) => f.severity === "critical")
            .length,
          chains_count: (l2.attack_chains ?? []).length,
        },
      });
    } else if (openFindings.length > 0) {
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
  // expressed as read-only queries: deepScanStatus, geoSettings, abandoned-plugins.
  useEffect(() => {
    // Deferred non-critical fetches — fire after the initial paint completes.
    const deferredId = setTimeout(() => {
      void fetchDeepScanStatus();
      // Freemium Dual-Build: Geo-Blocking is Pro-local — physically absent
      // from the Free zip, so /geo/settings + /geo/countries must never
      // fire there (the routes don't exist).
      if (isProEditionBuild) {
        void fetchGeoSettings();
      }
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

  // ── Update Guard: status + snapshots + reviews (Phase 2) ─────────────────
  const [updateGuardStatus, setUpdateGuardStatus] =
    useState<UpdateGuardStatus | null>(null);
  const [updateGuardLoading, setUpdateGuardLoading] = useState(true);
  const [updateGuardReviews, setUpdateGuardReviews] = useState<
    UpdateGuardReview[]
  >([]);

  const fetchUpdateGuard = useCallback(async () => {
    try {
      const [statusData, snapshotsData, reviewsData] = await Promise.all([
        wpApi<UpdateGuardStatus>("/update-guard/status"),
        wpApi<UpdateSnapshot[]>("/update-guard/snapshots"),
        wpApi<UpdateGuardReview[]>("/update-guard/reviews"),
      ]);
      setUpdateGuardStatus(statusData);
      setUpdateGuardSnapshots(snapshotsData ?? []);
      setUpdateGuardReviews(reviewsData ?? []);
    } catch {
      // Non-critical — card degrades gracefully when backend not yet available
      setUpdateGuardStatus(null);
      setUpdateGuardSnapshots([]);
      setUpdateGuardReviews([]);
    } finally {
      setUpdateGuardLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Freemium Dual-Build: Update Guard is Pro-local — physically absent
    // from the Free zip, so status/snapshots/reviews must never fire there
    // (the routes don't exist — this was the source of 404 console spam,
    // repeated on every mount plus the 5-min poll below).
    if (!isProEditionBuild) {
      setUpdateGuardLoading(false);
      return;
    }
    let cancelled = false;
    const doFetch = async () => {
      if (!cancelled) await fetchUpdateGuard();
    };
    doFetch();
    // v2.9.30.117: reduced from 30 s to 5 min (UPDATE_GUARD_POLL = 300_000).
    // Snapshots and reviews change only on user action (approve/reject/restore/delete)
    // which triggers a refetch directly. Background polling exists as a safety net.
    const interval = setInterval(() => {
      if (!cancelled) fetchUpdateGuard();
    }, UPDATE_GUARD_POLL);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [fetchUpdateGuard, isProEditionBuild]);

  // ── Scan Consolidation: trigger handlers ─────────────────────────────────

  const handleTriggerScan = async (
    scanType: "ai-audit" | "malware" | "full-ai" | "deep-malware"
  ) => {
    // v2.9.30.x — Mode arg removed. The malware card no longer offers a
    // Quick/Deep toggle (that moved to the dedicated deep-malware card in
    // v2.9.29.0). The legacy /scan/malware?mode=deep endpoint returns 410
    // Gone, so the request body now always sends {mode: "quick"} below.

    // WP.org round-3 (Sprint W2/T7, 2026-07-26): the "!hasSecurity blocks
    // deep-malware" guard that used to sit here was REMOVED, on the
    // reasoning that Sprint W1 had de-gated deep-malware's local phases
    // (enumerate, hash, local scan) in the PHP so they ran free in every
    // edition, leaving only the service phases (vps_lookup/wpscan/
    // patchstack/ai_analysis) needing Pro.
    // SUPERSEDED (LiveQA Fix Sprint, 2026-08-04, owner scan-edition
    // ruling): "Deep scan" is Pro-only again at the whole-scan level, so
    // this function's deep-malware branch is now unreachable in Free by
    // construction — the ScanCard that calls it is edition-gated at the
    // SecurityHub.tsx call site (see the block below), not via a `locked`
    // prop. No client-side hasSecurity re-guard was added back here
    // deliberately: the render-level gate already makes this branch
    // dead code on Free, and a second guard here would just be an
    // unreachable duplicate of it.

    // H-3: Token balance gate for token-consuming scan types.
    // v2.9.29.0 — deep-malware is also token-consuming (AI analysis phase).
    // v2.9.31.2 — ai-audit REMOVED from this gate. The "Security Audit" (ai-audit)
    // runs Layer 1 ONLY: a deterministic, local, zero-AI, zero-token posture audit.
    // Backend proof: SwissWPSuite_Scan_Orchestrator::run_ai_audit() calls
    // run_full_scan(false) (L2/Groq path skipped) on licensed sites and
    // run_free_l1_audit() (no Groq, no token read/write) on the Free edition — no AI
    // call and no token deduction exists anywhere on that path. It is a FREE feature
    // that MUST run while unlicensed with a 0 token balance. Including ai-audit here
    // made the button silently no-op in the Free/no-license state (canAfford returned
    // false at balance 0, so we returned before firing the request) — a bug, not a
    // gate. Only genuinely AI/token-consuming scans belong here: full-ai, deep-malware.
    // deep-malware deliberately STAYS in this list (Sprint W2/T7, 2026-07-26):
    // in Pro, its ai_analysis phase is real Groq spend and this remains the
    // correct pre-flight gate. In Free, useTokenBalance() is aliased to a stub
    // whose canAfford() always returns true (Task B/A9) — so this condition is
    // a permanent no-op there and never blocks the free local phases; the real
    // edition-based unlock lives in the removed guard above and the ScanCard's
    // locked prop, not here.
    const isTokenGated = scanType === "full-ai" || scanType === "deep-malware";
    if (isTokenGated && !canAfford("sentinel_security")) {
      toast.error(
        `Need ~${tokensNeeded("sentinel_security").toLocaleString()} tokens to run this scan (balance: ${tokenSpendable.toLocaleString()}). Purchase more tokens or upgrade your plan.`
      );
      return;
    }

    if (scanType === "ai-audit") setAiAuditLoading(true);
    if (scanType === "malware") setMalwareLoading(true);
    if (scanType === "full-ai") setFullAiLoading(true);
    if (scanType === "deep-malware") {
      // Reset prior result + advance to running. The poller below clears
      // these on completion. Setting jobId after the start call lets the
      // useEffect-based poller pick up the new job.
      setDeepMalwareResult(null);
      setDeepMalwarePhase("pending");
      setDeepMalwareStatus("running");
    }

    try {
      // ── v2.9.29.0 Async Deep Malware Scan (start + poll) ────────────────
      // Pipeline: enumerate → hashing → vps_lookup → local_scan → wpscan
      //         → patchstack → ai_analysis → complete. Each /status poll
      // advances one phase. ~2-5 min total on typical sites.
      if (scanType === "deep-malware") {
        const startEnvelope = await wpApi<{
          success: boolean;
          job_id?: string;
          status?: string;
          message?: string;
        }>("/security/scan/malware/start", { method: "POST" });
        if (!startEnvelope.success || !startEnvelope.job_id) {
          throw new Error(
            startEnvelope.message ?? "Could not start Deep Malware Scan."
          );
        }
        // Hand the job_id to the poller useEffect below — the polling loop
        // owns the network back-pressure, retries, and result delivery.
        setDeepMalwareJobId(startEnvelope.job_id);
        return;
      }

      // ── v2.9.28.21 Async Full AI Scan (start + poll) ────────────────────
      // The synchronous /security/scan/full-ai route times out at Hostinger's
      // ~60s edge under load and returns a 504 that hides the scan result.
      // We now POST /start to kick off a WP-Cron job, then poll /status every
      // 3s until the backend reports 'complete' or 'failed'. 5-minute cap.
      if (scanType === "full-ai") {
        const startEnvelope = await wpApi<{
          success: boolean;
          job_id?: string;
          status?: string;
          message?: string;
        }>("/security/scan/full-ai/start", { method: "POST" });
        if (!startEnvelope.success || !startEnvelope.job_id) {
          throw new Error(
            startEnvelope.message ?? "Could not start Full AI scan."
          );
        }
        const finalResult = await pollFullAiJobToCompletion(
          startEnvelope.job_id
        );
        setFullAiResult(finalResult);
        // v2.9.30.117: scan complete → invalidate so next tab visit shows fresh data
        queryClient.invalidateQueries({ queryKey: ["sentinel-latest-scan"] });
        queryClient.invalidateQueries({ queryKey: ["security-status"] });
        return;
      }

      const body =
        scanType === "malware" ? JSON.stringify({ mode: "quick" }) : undefined;
      const envelope = await wpApi<{
        success: boolean;
        result: AiAuditResult | MalwareScanResult | FullAiScanResult;
        message?: string;
        balance_remaining?: number;
      }>(`/security/scan/${scanType}`, { method: "POST", body });

      // F-2: PHP returns { success: false, code: 'scan_failed', message: ... } for
      // generic orchestrator errors (e.g. 'Sentinel not available'). Without this
      // guard the next branches would destructure envelope.result (undefined) into
      // state and later crash on result.summary.length. Throwing hands control to
      // the existing catch block which shows a user-visible toast.
      if (!envelope.success) {
        throw new Error(envelope.message ?? "Scan failed. Please try again.");
      }

      // H-2C: Update local token balance from the authoritative server-side value.
      if (typeof envelope.balance_remaining === "number") {
        setBalance(envelope.balance_remaining);
      }

      if (scanType === "ai-audit") {
        setAiAuditResult((envelope.result as AiAuditResult) ?? null);
        // v2.9.30.117: scan complete → invalidate so next tab visit shows fresh data
        queryClient.invalidateQueries({ queryKey: ["sentinel-latest-scan"] });
        queryClient.invalidateQueries({ queryKey: ["security-status"] });
      } else if (scanType === "malware") {
        // Quick-mode malware result is fully eager — no polling, no queue.
        setMalwareResult((envelope.result as MalwareScanResult) ?? null);
        // v2.9.30.117: scan complete → invalidate so next tab visit shows fresh data
        queryClient.invalidateQueries({ queryKey: ["sentinel-latest-scan"] });
        queryClient.invalidateQueries({ queryKey: ["security-status"] });
      }
    } catch (e) {
      console.error(`Scan ${scanType} failed`, e);
      const msg = e instanceof Error ? e.message : "";
      toast.error(
        msg && !msg.toLowerCase().includes("authentication failed")
          ? msg
          : "Scan failed. Please try again."
      );
      if (scanType === "deep-malware") {
        setDeepMalwareStatus("error");
        setDeepMalwareJobId(null);
        setDeepMalwarePhase(null);
      }
    } finally {
      if (scanType === "ai-audit") setAiAuditLoading(false);
      if (scanType === "malware") setMalwareLoading(false);
      if (scanType === "full-ai") {
        setFullAiLoading(false);
        // v2.9.28.25: Reset phase-aware progress text so the next run starts clean.
        setFullAiPhaseMessage("");
      }
      // deep-malware: don't clear loading here — the poller useEffect owns
      // the lifecycle and clears state on terminal phase.
    }
  };

  /**
   * v2.9.28.21 — Poll /security/scan/full-ai/status every 3s until the backend
   * reports a terminal state ('complete' | 'failed'). Returns the final
   * FullAiScanResult on success.
   *
   * Safety cap: 100 polls × 3s = 5 minutes max wait. Real scans on typical
   * Hostinger shared hosts complete in under 90s; the cap only matters when
   * the VPS is very slow or the site's WP-Cron is genuinely broken.
   *
   * Throws Error on timeout / failed status / 'not_found'. The caller's catch
   * block surfaces the error message via toast.
   */
  const pollFullAiJobToCompletion = async (
    jobId: string
  ): Promise<FullAiScanResult> => {
    const MAX_POLLS = 100;
    const POLL_INTERVAL_MS = 3000;

    for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      let envelope: FullAiScanJob;
      try {
        envelope = await wpApi<FullAiScanJob>(
          `/security/scan/full-ai/status?job_id=${encodeURIComponent(jobId)}`,
          { method: "GET" }
        );
      } catch (e) {
        // Network hiccup — don't give up yet. Let the next poll cycle retry.
        // If the transient expired (404) the ApiError's status is 404 and the
        // wpApi wrapper raises an Error — we propagate via a re-throw on the
        // final attempt but keep retrying until then.
        if (e instanceof ApiError && e.status === 404) {
          throw new Error("Scan job expired. Please start a new scan.");
        }
        if (attempt === MAX_POLLS - 1) {
          throw e;
        }
        continue;
      }

      if (envelope.status === "complete" && envelope.result) {
        // v2.9.28.32 (F-296): Clear the phase hint before returning so the
        // ScanCard doesn't briefly show "Sending to AI for analysis…" while
        // the success toast renders.
        setFullAiPhaseMessage("");
        // v2.9.28.38 — Banner auto-refresh. The server stamps
        // swisswpsuite_last_scan_report on complete (api.php v2.9.28.37 Bug 3),
        // so /security/scan/report-config now returns the fresh grade. Re-fetch
        // it here so <ScanCronStatusBanner> reflects the just-completed scan
        // without requiring a tab-switch or page reload. Silent on failure —
        // the banner degrades gracefully to stale data, same as the mount-time
        // fetch at useEffect([]) above.
        try {
          const refreshed = await wpApi<ScanReportConfig>(
            "/security/scan/report-config"
          );
          setScanReportConfig(refreshed);
        } catch {
          // Non-critical — banner keeps previous state.
        }
        return envelope.result;
      }
      if (envelope.status === "failed") {
        throw new Error(envelope.message ?? "Scan failed. Please try again.");
      }
      if (envelope.status === "not_found") {
        throw new Error("Scan job expired. Please start a new scan.");
      }

      // v2.9.28.25: Surface phase-aware progress text to the Full AI ScanCard.
      // Phase 1 (l1_running) = local filesystem/config audit, ~30-45 s.
      // Phase 2 (l2_running) = VPS AI analysis, ~15 s.
      // l2_pending = brief transient state between phases — treat as Phase 1 tail.
      if (envelope.status === "l1_running" || envelope.status === "pending") {
        setFullAiPhaseMessage("Running security audit…");
      } else if (
        envelope.status === "l2_pending" ||
        envelope.status === "l2_running"
      ) {
        setFullAiPhaseMessage("Sending to AI for analysis…");
      }
      // Continue polling.
    }

    throw new Error(
      "Scan is taking longer than expected. Check back in a few minutes."
    );
  };

  /**
   * v2.9.29.0 — Deep Malware Scan phase-label dictionary.
   *
   * Each pipeline phase maps to a user-facing message shown on the ScanCard's
   * loading button. Keep these short — they replace the default "Scanning…"
   * label and appear on a 280-px-wide button. Order here matches the
   * pipeline state machine in scan-orchestrator.php::run_deep_malware_scan().
   */
  const DEEP_MALWARE_PHASE_LABELS: Record<string, string> = {
    pending: "Preparing scan…",
    enumerate: "Discovering files…",
    hashing: "Computing file fingerprints…",
    vps_lookup: "Checking threat database…",
    local_scan: "Scanning file contents…",
    wpscan: "Looking up plugin vulnerabilities (WPScan)…",
    patchstack: "Verifying security patches (Patchstack)…",
    ai_analysis: "Running AI security analysis…",
    complete: "Scan complete",
  };

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

  /**
   * v2.9.28.04 (Issue 4) — Mark a malware finding as safe.
   *
   * POSTs to /security/ignore (existing endpoint, no new storage needed). Both
   * SwissWPSuite_Security::perform_core_scan() (Quick mode) and
   * SwissWPSuite_Security_Scanner::is_safe_folder() (Deep mode) consult
   * swisswpsuite_security_ignored_paths, so whitelisted files are skipped by
   * every future scan automatically.
   *
   * After a successful POST we remove the entry from the in-memory
   * malwareResult.threats array so the UI reflects the change immediately
   * without requiring a page reload.
   */
  const handleAuditMarkSafe = async (evidence: string) => {
    if (!evidence) return;
    try {
      const res = await wpApi<{ success: boolean; message?: string }>(
        "/security/ignore",
        { method: "POST", body: JSON.stringify({ path: evidence }) }
      );
      if (!res.success) {
        toast.error(res.message || "Failed to mark file as safe.");
        return;
      }
      updateAiAuditResult((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          findings: prev.findings.filter((f) => f.evidence !== evidence),
        };
      });
      fetchIgnored();
      toast.success("Marked as safe. Future scans will skip this file.");
    } catch (e) {
      console.error("Failed to mark audit finding as safe", e);
      toast.error("Network error marking file as safe.");
    }
  };

  /**
   * v2.9.30.x — Persistent "Mark Safe" by finding id (no file path).
   *
   * Used for AI Audit findings that have no `evidence` field — e.g.
   * "WordPress Version Detected", "PHP Version: 8.3.30", "Bundled Plugin File
   * Missing". These cannot be added to the path-based ignore list, so they go
   * into the id-based safelist (wp_options key
   * `swisswpsuite_sentinel_ignored_findings`). The same /security/ignore
   * endpoint accepts a `finding_id` body — the backend keeps the two stores
   * separate so paths and ids never collide.
   *
   * After the POST we strip the finding from the live AiAudit result so the
   * row disappears immediately. The next scan will not re-emit the finding
   * because transform_l1_to_ai_audit_result() filters by the safelist before
   * returning.
   */
  const handleAuditMarkSafeById = async (findingId: string) => {
    if (!findingId) return;
    try {
      const res = await wpApi<{ success: boolean; message?: string }>(
        "/security/ignore",
        { method: "POST", body: JSON.stringify({ finding_id: findingId }) }
      );
      if (!res.success) {
        toast.error(res.message || "Failed to mark finding as safe.");
        return;
      }
      updateAiAuditResult((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          findings: prev.findings.filter((f) => f.id !== findingId),
          hidden_safelist_count: (prev.hidden_safelist_count ?? 0) + 1,
        };
      });
      toast.success("Marked as safe. Future scans will hide this finding.");
    } catch (e) {
      console.error("Failed to mark audit finding (by id) as safe", e);
      toast.error("Network error marking finding as safe.");
    }
  };

  const handleFullAiMarkSafe = async (evidence: string) => {
    if (!evidence) return;
    try {
      const res = await wpApi<{ success: boolean; message?: string }>(
        "/security/ignore",
        { method: "POST", body: JSON.stringify({ path: evidence }) }
      );
      if (!res.success) {
        toast.error(res.message || "Failed to mark file as safe.");
        return;
      }
      updateFullAiResult((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          findings: prev.findings.filter((f) => f.evidence !== evidence),
        };
      });
      fetchIgnored();
      toast.success("Marked as safe. Future scans will skip this file.");
    } catch (e) {
      console.error("Failed to mark full AI audit finding as safe", e);
      toast.error("Network error marking file as safe.");
    }
  };

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
          "[SwissWP] handleViewScanInHistory history fetch failed:",
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
        geo_enabled: boolean;
        global_geo_block: boolean;
        login_enabled: boolean;
        login_max_retries?: number;
        last_scan: string;
        alerts?: SecurityAlert;
      }>("/security/status");
      setFirewallEnabled(data.firewall_enabled ?? false);
      setSpamProtection(data.spam_enabled ?? false);
      setBlockSqli(data.block_sqli ?? false);
      setBlockXss(data.block_xss ?? false);
      setSimulationMode(data.simulation_mode ?? false);
      setGeoEnabled(data.geo_enabled ?? false);
      setGlobalGeoBlock(data.global_geo_block ?? false);
      setLoginEnabled(data.login_enabled ?? false);
      setLoginMaxRetries(data.login_max_retries ?? 3);
      setLastScan(data.last_scan);
      if (data.alerts && !isAlertDismissed(data.alerts)) {
        setAlerts(data.alerts);
      }
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

  const handleAbandonedPluginsRefresh = async () => {
    setAbandonedRefreshing(true);
    try {
      const data = await wpApi<AbandonedPluginsStatus>(
        "/security/abandoned-plugins/refresh",
        { method: "POST" }
      );
      setAbandonedPlugins(data);
    } catch (e) {
      toast.error("Failed to refresh abandoned plugin data.");
    } finally {
      setAbandonedRefreshing(false);
    }
  };

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
      // The next scan will re-emit the finding. We do NOT mutate aiAuditResult
      // here because the finding's title/severity are not stored alongside the
      // id — the user must re-scan to see it return, which is the expected
      // and least-surprising behavior.
      toast.success(
        "Removed from safelist. Next scan will re-check this item."
      );
    } catch (e) {
      console.error("Failed to remove safelist finding", e);
      toast.error("Network error removing safelist entry.");
    }
  };

  const fetchGeoSettings = async () => {
    try {
      const [settingsData, countriesData] = await Promise.all([
        wpApi<{
          settings: {
            list_mode: "blacklist" | "whitelist";
            countries: string[];
          };
        }>("/geo/settings"),
        wpApi<{ countries: { code: string; name: string; flag: string }[] }>(
          "/geo/countries"
        ),
      ]);
      setGeoSettings({
        list_mode: settingsData.settings?.list_mode || "blacklist",
        countries: settingsData.settings?.countries || [],
      });
      setAllCountries(countriesData.countries || []);
    } catch (e) {
      console.error("Failed to fetch geo settings", e);
    }
  };

  const saveGeoCountries = async (
    countries: string[],
    list_mode: "blacklist" | "whitelist"
  ) => {
    setSavingGeo(true);
    try {
      const data = await wpApi<{ success: boolean; message?: string }>(
        "/geo/settings",
        {
          method: "POST",
          body: JSON.stringify({ countries, list_mode }),
        }
      );
      if (data.success) {
        setGeoSettings({ list_mode, countries });
        toast.success("Geo-Lockdown countries saved.");
      } else {
        toast.error("Failed to save: " + (data.message || "Unknown error"));
      }
    } catch (e) {
      toast.error("Network error saving geo settings.");
    } finally {
      setSavingGeo(false);
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
    if (option === "geo") setGeoEnabled(value);
    if (option === "global_geo_block") setGlobalGeoBlock(value);
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

  const proceedDeepScan = async () => {
    setShowDeepScanModal(false);
    setHistoricalScanDetail(null); // Clear historical view when starting a new scan
    setDeepScanStatus({
      status: "running",
      message: "Starting...",
      processed_folders: 0,
      total_folders: 1,
    });
    try {
      await wpApi<{ success: boolean; message?: string }>(
        "/security/deep-scan/start",
        {
          method: "POST",
        }
      );
      fetchDeepScanStatus();
    } catch (e) {
      console.error("Deep scan failed to start", e);
      const msg =
        e instanceof Error
          ? e.message
          : "Failed to start scan. Please check your connection.";
      setDeepScanStatus({ status: "error", message: msg });
      toast.error(msg);
    }
  };

  const startDeepScan = async () => {
    // Pre-Flight Check
    try {
      const status = await wpApi<{ dirty: boolean; locked: number }>(
        "/backup/environment-status"
      );
      if (status.dirty) {
        const reason = status.locked
          ? "a process lock is active"
          : "temporary files were found from a previous operation";
        showConfirm(
          `System Alert: The temporary environment has activity (${reason}).\n\nStarting a Deep Scan might conflict with running backups or migrations.\n\nProceed anyway?`,
          () => proceedDeepScan()
        );
        return;
      }
    } catch (e) {
      console.error("Env check failed", e);
    }

    proceedDeepScan();
  };

  // @deprecated v2.9.30.117 — replaced by useQuery(["sentinel-status"]) above.
  const fetchSentinelStatus = async () => {
    try {
      const data = await wpApi<{
        has_audit: boolean;
        audit?: SentinelAuditResult;
        credits?: SentinelCredits;
        identity_valid?: boolean;
      }>("/security/sentinel/status");
      if (data.credits) {
        setSentinelCredits(data.credits);
      }
      if (data.identity_valid === false) {
        setIdentityValid(false);
      }
    } catch (e) {
      console.error("[SwissWP] fetchSentinelStatus failed:", e);
    }
  };

  const runSentinelFullScan = async (includeLayer2 = false) => {
    // Guard: prevent duplicate scans within the same page session (e.g. from
    // stale service workers, browser extensions, or other external triggers).
    const SCAN_LOCK_KEY = "swisswp_sentinel_scan_in_progress";
    if (sessionStorage.getItem(SCAN_LOCK_KEY)) {
      toast.error(
        "A scan is already in progress. Please wait for it to complete."
      );
      return;
    }
    sessionStorage.setItem(SCAN_LOCK_KEY, "1");
    setSentinelScanning(true);
    try {
      const data = await wpApi<{
        result?: { layer2?: Record<string, unknown>; layer1?: unknown[] };
        message?: string;
      }>("/security/sentinel/full-scan", {
        method: "POST",
        body: JSON.stringify({ include_layer2: includeLayer2 }),
      });
      if (data.result) {
        const r = data.result;
        if (r.layer2) {
          // MEDIUM defensive fallback: PHP may return `grade` instead of `security_grade`
          const layer2 = r.layer2 as Record<string, unknown>;
          const findings = (r.layer1 ||
            layer2.individual_findings ||
            []) as SentinelLayer1Finding[];
          setSentinelReport({
            ...layer2,
            layer: 2,
            security_grade: (layer2.security_grade ??
              layer2.grade) as SentinelLayer2Report["security_grade"],
            individual_findings: findings,
            // Defensive defaults: AI may omit these top-level fields
            attack_chains: (layer2.attack_chains ??
              []) as SentinelLayer2Report["attack_chains"],
            remediation_plan: (layer2.remediation_plan ??
              []) as SentinelLayer2Report["remediation_plan"],
            positive_findings: (layer2.positive_findings ??
              []) as SentinelLayer2Report["positive_findings"],
            scan_metadata:
              (layer2.scan_metadata as SentinelLayer2Report["scan_metadata"]) ?? {
                sentinel_version: "2.1",
                analysis_date: new Date().toISOString(),
                model_used: "unknown",
                findings_count: findings.length,
                critical_count: findings.filter(
                  (f) => f.severity === "critical"
                ).length,
                chains_count: ((layer2.attack_chains ?? []) as unknown[])
                  .length,
              },
          } as SentinelLayer2Report);
        } else if (r.layer1) {
          setSentinelReport({
            layer: 1,
            findings: r.layer1 as SentinelLayer1Finding[],
          });
        }
        toast.success("Security scan complete.");
      } else {
        toast.error(data.message || "Scan returned no report data.");
      }
    } catch (e) {
      console.error("[SwissWP] runSentinelFullScan failed:", e);
      toast.error(
        e instanceof ApiError
          ? e.message
          : "Scan request failed — check your connection."
      );
    } finally {
      sessionStorage.removeItem(SCAN_LOCK_KEY);
      setSentinelScanning(false);
    }
  };

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

      // SEC-4: Filter out findings with status === 'fixed' (set in current session).
      // Cross-session persistence is handled server-side: get_sentinel_scan_record()
      // filters against swisswpsuite_security_fixed_findings before returning results.
      const openFindings = (detail.layer1_findings ?? []).filter(
        (f) => f.status !== "fixed"
      );

      if (detail.layer2_report) {
        // detail.layer2_report is already typed as SentinelLayer2Report — use it directly,
        // but override individual_findings with the filtered (non-fixed) subset.
        // Defensive defaults: stored report may have incomplete AI-generated fields.
        const l2 = detail.layer2_report;
        setSentinelReport({
          ...l2,
          individual_findings: openFindings,
          attack_chains: l2.attack_chains ?? [],
          remediation_plan: l2.remediation_plan ?? [],
          positive_findings: l2.positive_findings ?? [],
          scan_metadata: l2.scan_metadata ?? {
            sentinel_version: "2.1",
            analysis_date: new Date().toISOString(),
            model_used: "unknown",
            findings_count: openFindings.length,
            critical_count: openFindings.filter(
              (f) => f.severity === "critical"
            ).length,
            chains_count: (l2.attack_chains ?? []).length,
          },
        });
      } else if (openFindings.length > 0) {
        setSentinelReport({ layer: 1, findings: openFindings });
      }
    } catch (e) {
      // Silently swallow — missing scan history is normal on first install.
      console.error("[SwissWP] fetchLatestScanReport failed:", e);
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
      console.error("[SwissWP] fetchScanHistory failed:", e);
    }
  };

  const fetchScanRecord = async (recordId: number) => {
    setLoadingHistoricalScanId(recordId);
    setHistoricalScanDetail(null);
    try {
      const data = await wpApi<ScanHistoryDetail & { success: boolean }>(
        `/security/sentinel/scan-history/${recordId}`
      );
      if (data.success) {
        setHistoricalScanDetail({
          record: data.record,
          layer1_findings: data.layer1_findings,
          layer2_report: data.layer2_report,
        });
        setActiveTab("scan");
      } else {
        toast.error("Failed to load scan record.");
      }
    } catch (e) {
      console.error("[SwissWP] fetchScanRecord failed:", e);
      toast.error("Failed to load scan record.");
    } finally {
      setLoadingHistoricalScanId(null);
    }
  };

  const toggleHardening = async (key: string, enabled: boolean) => {
    // Optimistic update — toggle immediately so UI reacts at once
    setHardeningOptions((prev) =>
      prev.map((opt) => (opt.key === key ? { ...opt, enabled } : opt))
    );
    try {
      const data = await wpApi<{
        success: boolean;
        message?: string;
        upgrade_required?: boolean;
      }>("/hardening/toggle", {
        method: "POST",
        body: JSON.stringify({ option: key, enable: enabled }),
      });
      if (!data.success) {
        toast.error("Failed to toggle: " + (data.message || "Unknown error"));
        // v2.9.30.117: invalidate cache so UI reverts to server truth immediately
        queryClient.invalidateQueries({ queryKey: ["hardening-status"] });
      }
    } catch (e: unknown) {
      console.error(e);
      if (e instanceof Error) {
        toast.error(e.message || "Network error — could not save setting.");
      } else {
        toast.error("Network error — could not save setting.");
      }
      // v2.9.30.117: invalidate cache to revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ["hardening-status"] });
    }
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
          if (showFirewallAdvisor) handleAnalyzeFirewall();
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
        // 4xx responses (e.g., "IP not found in ban list" from a stale row,
        // or "IP management requires a Pro license." for free-tier users)
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
      setSentinelReport((prev) => {
        if (!prev) return prev;
        if (prev.layer === 1) {
          return {
            ...prev,
            findings: prev.findings.filter((f) => f.id !== finding.id),
          };
        }
        return {
          ...prev,
          individual_findings: (
            prev as SentinelLayer2Report
          ).individual_findings.filter((f) => f.id !== finding.id),
        };
      });
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
            setSentinelReport((prev) => {
              if (!prev) return prev;
              if (prev.layer === 1) {
                return {
                  ...prev,
                  findings: prev.findings.filter((f) => f.id !== finding.id),
                };
              }
              return {
                ...prev,
                individual_findings: (
                  prev as SentinelLayer2Report
                ).individual_findings.filter((f) => f.id !== finding.id),
              };
            });
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
            setSentinelReport((prev) => {
              if (!prev) return prev;
              if (prev.layer === 1) {
                return {
                  ...prev,
                  findings: prev.findings.filter((f) => f.id !== finding.id),
                };
              }
              return {
                ...prev,
                individual_findings: (
                  prev as SentinelLayer2Report
                ).individual_findings.filter((f) => f.id !== finding.id),
              };
            });
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
              setSentinelReport((prev) => {
                if (!prev) return prev;
                if (prev.layer === 1) {
                  return {
                    ...prev,
                    findings: prev.findings.filter((f) => !ids.has(f.id)),
                  };
                }
                return {
                  ...prev,
                  individual_findings: (
                    prev as SentinelLayer2Report
                  ).individual_findings.filter((f) => !ids.has(f.id)),
                };
              });
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
          setSentinelReport((prev) => {
            if (!prev) return prev;
            if (prev.layer === 1) {
              return {
                ...prev,
                findings: prev.findings.filter((f) => !ids.has(f.id)),
              };
            }
            return {
              ...prev,
              individual_findings: (
                prev as SentinelLayer2Report
              ).individual_findings.filter((f) => !ids.has(f.id)),
            };
          });
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
  // Fix it feature — parse finding evidence into fix API payload
  // ---------------------------------------------------------------------------

  const parseFindingForFix = (
    finding: SentinelLayer1Finding
  ): { fix_type: string; target_path: string; target_perms: string } => {
    const evidence = finding.evidence || "";
    // Extract file path from evidence (e.g. "wp-config.php (0644)" -> "wp-config.php")
    const pathMatch = evidence.match(/^([^\s(]+)/);
    const targetPath = pathMatch ? pathMatch[1] : "";
    // Determine target perms based on fix_type
    let targetPerms = "0644";
    if (finding.fix_type === "chmod_file") {
      // wp-config.php should be 0600, others 0644
      targetPerms = targetPath.includes("wp-config") ? "0600" : "0644";
    } else if (finding.fix_type === "chmod_dir") {
      targetPerms = "0755";
    }
    return {
      fix_type: finding.fix_type || "",
      target_path: targetPath,
      target_perms: targetPerms,
    };
  };

  const handleL1Fix = async (finding: SentinelLayer1Finding): Promise<void> => {
    if (
      !finding.fix_type ||
      finding.fix_type === "manual" ||
      finding.fix_type === "navigate_hardening"
    )
      return;
    const runFix = async () => {
      try {
        const payload = {
          ...parseFindingForFix(finding),
          // SEC-4: Pass finding_code so the backend can persist it as "fixed" across refreshes.
          // Bug fix: finding.code and finding.file_path may be undefined — fall back to id/evidence/title
          finding_code:
            (finding.code || finding.id || "") +
            ":" +
            (finding.evidence || finding.title || ""),
          // WP.org round-3 (Sprint W3): disable_wp_debug now requires explicit
          // confirmation server-side — this rewrites wp-config.php.
          ...(finding.fix_type === "disable_wp_debug" ? { confirm: true } : {}),
        };
        const data = await wpApi<RemediateResponse>("/security/findings/fix", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (data.success) {
          // SEC-4 FIX: Mark the finding as 'fixed' in local state AND persist to backend.
          // Local state: hides the finding immediately in the current session.
          // Backend: the fix endpoint appends the finding ID to swisswpsuite_security_fixed_findings
          // wp_option, so fetchLatestScanReport() filters it on future page loads.
          setSentinelReport((prev) => {
            if (!prev) return prev;
            const markFixed = (f: SentinelLayer1Finding) =>
              f.id === finding.id ? { ...f, status: "fixed" } : f;
            if (prev.layer === 1) {
              return { ...prev, findings: prev.findings.map(markFixed) };
            }
            return {
              ...prev,
              individual_findings: (
                prev as SentinelLayer2Report
              ).individual_findings.map(markFixed),
            };
          });
          toast.success(
            data.message || "Fixed successfully. Re-run scan to confirm."
          );
        } else if (data.manual_fix) {
          // Bug fix: chmod failures on Hostinger return a manual_fix guide — display it
          setL1ManualFix(data.manual_fix);
        } else {
          toast.error(
            data.message ||
              "Fix failed. See the manual steps for an alternative approach."
          );
        }
      } catch {
        toast.error(
          "Fix request failed — check your connection and try again."
        );
      }
    };
    // WP.org round-3 (Sprint W3, T5): disable_wp_debug rewrites wp-config.php —
    // confirm with the user before asserting `confirm: true` to the backend.
    // Mirrors the identical gate in handleLogActionFix (debug_mode_enabled).
    if (finding.fix_type === "disable_wp_debug") {
      showConfirm(
        "Disable WP_DEBUG mode? This rewrites your wp-config.php file.",
        runFix
      );
      return;
    }
    await runFix();
  };

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
   * v2.9.28.11 — Batch-action handler for the restored ScanResultPanel selection UI.
   *
   * Receives an action verb and a list of file paths (from either AuditResultView's
   * `finding.evidence` or MalwareResultView's `threat.file`). Calls the shared
   * `performBulkOperation` (unchanged backend: POST /security/bulk) and, on success,
   * removes the acted-upon findings from BOTH `aiAuditResult` and `fullAiResult`
   * state slices — because `AuditResultView` is rendered by both scan types and
   * the user may be acting from either panel. Malware scan panel clears its own
   * `malwareResult.threats` optimistically.
   *
   * Regression guard: Frontend memory v2.9.28.10 entry — always update BOTH
   * ai-audit and full-ai state when a shared component triggers a mutation.
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

        // Remove the acted-upon findings from AI audit result panels.
        updateAiAuditResult((prev) =>
          prev
            ? {
                ...prev,
                findings: prev.findings.filter(
                  (f) => !succeededList.includes(f.evidence ?? "")
                ),
              }
            : prev
        );
        updateFullAiResult((prev) =>
          prev
            ? {
                ...prev,
                findings: prev.findings.filter(
                  (f) => !succeededList.includes(f.evidence ?? "")
                ),
              }
            : prev
        );
        // Also remove from malware threat list so the same selection cleared from
        // the malware panel reflects immediately without waiting for a re-scan.
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

  const handleAiAnalyze = async (
    filepath: string,
    options?: { bulk?: boolean }
  ) => {
    // v2.9.28.23 — Defensive guard against unintended auto-fire.
    // Chrome DevTools browser testing showed ~9 analyze-file requests firing ~20s
    // after Full AI Scan completion with no user click between. A full code audit
    // (v2.9.28.23) found ZERO auto-trigger useEffects that call this function or
    // runAiAnalyzeChain — every call path is wired to an explicit onClick. The
    // most plausible remaining cause is a stale effect / re-entrancy race during
    // an active scan poll. This guard blocks any analyze-file request while a
    // scan that owns file findings is still in-flight (aiAudit / fullAi / malware
    // loading or deep-scan polling). AI analysis is always USER-INITIATED — it is
    // safe to short-circuit here because every legitimate path is a direct click.
    // W3 — Token balance gate: block the call early if insufficient tokens
    if (!canAfford("sentinel_security")) {
      toast.error(
        `Need ~${tokensNeeded("sentinel_security").toLocaleString()} tokens to analyze a file (balance: ${tokenSpendable.toLocaleString()}). Purchase more tokens or upgrade your plan.`
      );
      return;
    }
    if (
      aiAuditLoading ||
      fullAiLoading ||
      malwareLoading ||
      deepScanStatus?.status === "running"
    ) {
      // Silently drop — no toast (the user didn't ask for this, so no error UX needed).
      // The click-surface buttons are already disabled via aiProgress/analyzingFile state.
      return;
    }
    // Guard against re-entrant calls for the same file while one is in flight.
    if (analyzingFile === filepath) return;
    setAnalyzingFile(filepath);
    setAiAnalysis(null);
    // W4 — persistent toast + elapsed timer for single-file (non-bulk) calls
    const toastId = !options?.bulk
      ? toast.info("AI is analyzing — this may take up to 60 seconds…", {
          duration: Infinity,
        })
      : null;
    if (!options?.bulk) startAiTimer();
    try {
      const data = await wpApi<{
        success: boolean;
        analysis?: Omit<AiFileAnalysis, "file">;
        auto_whitelisted?: boolean;
        message?: string;
        balance_remaining?: number;
      }>("/security/analyze-file", {
        method: "POST",
        body: JSON.stringify({ file: filepath }),
      });
      // H-2C: Update local token balance from the authoritative server-side value.
      if (typeof data.balance_remaining === "number") {
        setBalance(data.balance_remaining);
      }
      if (data.success && data.analysis) {
        setAiAnalysis({ file: filepath, ...data.analysis });
        // Auto-remove files that were whitelisted by the backend (AI verdict: safe)
        if (data.auto_whitelisted) {
          setDeepScanStatus((prev) => ({
            ...prev,
            results: prev.results?.filter((r) => r.file !== filepath),
          }));
          setSelectedThreats((prev) => prev.filter((f) => f !== filepath));
        }
      } else {
        if (!options?.bulk) {
          toast.error(data.message || "AI file analysis failed.");
        }
        throw new Error(data.message || "AI file analysis failed");
      }
    } catch (e: any) {
      console.error(e);
      // W3 — 402 token exhausted
      if (e instanceof ApiError && e.status === 402) {
        toast.error(
          "Token balance exhausted. Purchase more tokens or upgrade your plan."
        );
        throw e; // still let the chain count this as a failure
      }
      if (!options?.bulk) {
        toast.error("Analysis request failed — check your connection.");
      }
      throw e; // Let the chain count this as a failure
    } finally {
      if (toastId) toast.dismiss(toastId);
      if (!options?.bulk) stopAiTimer();
      setAnalyzingFile(null);
    }
  };

  const handleAnalyzeLogs = async () => {
    // N-4: Token balance gate — block early if insufficient tokens.
    if (!canAfford("sentinel_security")) {
      toast.error(
        `Need ~${tokensNeeded("sentinel_security").toLocaleString()} tokens (balance: ${tokenSpendable.toLocaleString()}). Purchase more tokens or upgrade your plan.`
      );
      return;
    }
    setAnalyzingLogs(true);
    setLogAnalysis(null);
    // W4 — persistent toast + elapsed timer for compound model calls
    const toastId = toast.info(
      "AI is analyzing — this may take up to 60 seconds…",
      { duration: Infinity }
    );
    startAiTimer();
    try {
      const data = await wpApi<{
        success: boolean;
        analysis?: LogAnalysis;
        message?: string;
      }>("/security/analyze-logs", {
        method: "POST",
      });
      if (data.success && data.analysis) {
        setLogAnalysis(data.analysis);
      } else {
        toast.error(
          data.message ||
            "Log analysis failed — ensure you have security logs and a Pro license."
        );
      }
    } catch (e: any) {
      console.error(e);
      // W3 — 402 token exhausted
      if (e instanceof ApiError && e.status === 402) {
        toast.error(
          "Token balance exhausted. Purchase more tokens or upgrade your plan."
        );
        return;
      }
      toast.error(
        e?.message || "Analysis request failed — check your connection."
      );
    } finally {
      toast.dismiss(toastId);
      stopAiTimer();
      setAnalyzingLogs(false);
    }
  };

  const handleAnalyzeFirewall = async () => {
    // N-4: Token balance gate — block early if insufficient tokens.
    if (!canAfford("sentinel_security")) {
      toast.error(
        `Need ~${tokensNeeded("sentinel_security").toLocaleString()} tokens (balance: ${tokenSpendable.toLocaleString()}). Purchase more tokens or upgrade your plan.`
      );
      return;
    }
    setAnalyzingFirewall(true);
    setFirewallAnalysis(null);
    // W4 — persistent toast + elapsed timer for compound model calls
    const toastId = toast.info(
      "AI is analyzing — this may take up to 60 seconds…",
      { duration: Infinity }
    );
    startAiTimer();
    try {
      const data = await wpApi<{
        success: boolean;
        analysis?: FirewallAnalysis;
        message?: string;
      }>("/security/analyze-firewall", {
        method: "POST",
      });
      if (data.success && data.analysis) {
        setFirewallAnalysis(data.analysis);
      } else {
        toast.error(
          data.message ||
            "Firewall analysis failed — ensure you have blocked requests and a Pro license."
        );
      }
    } catch (e: any) {
      console.error(e);
      // W3 — 402 token exhausted
      if (e instanceof ApiError && e.status === 402) {
        toast.error(
          "Token balance exhausted. Purchase more tokens or upgrade your plan."
        );
        return;
      }
      toast.error("Analysis request failed — check your connection.");
    } finally {
      toast.dismiss(toastId);
      stopAiTimer();
      setAnalyzingFirewall(false);
    }
  };

  // Show a manual 2FA setup guide (hardcoded — matches what the API returns for two_factor_authentication)
  const handleLogAction2FA = () => {
    setShowLogAdvisor(false);
    setLogActionGuide({
      what: "One or more administrator accounts do not have Two-Factor Authentication enabled. A stolen password alone is sufficient to compromise your site.",
      why: "2FA must be set up individually by each user — it cannot be enabled automatically on their behalf.",
      how: [
        'Go to System Config → Security tab → click "Enable 2FA"',
        "Scan the QR code with Google Authenticator, Authy, or any TOTP app",
        "Enter the 6-digit code to verify setup",
        "Save the backup recovery codes in a secure location",
        "Once enrolled, 2FA will be required on every login",
      ],
    });
  };

  // Call the sentinel remediate endpoint for a known issue_id.
  // If auto-fixable → toast success. If manual only → show guide modal.
  const handleLogActionFix = async (issueId: string) => {
    setShowLogAdvisor(false);
    const runFix = async () => {
      try {
        const data = await wpApi<RemediateResponse>(
          "/security/sentinel/remediate",
          {
            method: "POST",
            body: JSON.stringify(
              // WP.org round-3 (Sprint W3): debug_mode_enabled now requires
              // explicit confirmation server-side — this rewrites wp-config.php.
              issueId === "debug_mode_enabled"
                ? { issue_id: issueId, confirm: true }
                : { issue_id: issueId }
            ),
          }
        );
        if (data.success) {
          toast.success(data.message || "Issue fixed successfully!");
        } else if (data.manual_fix) {
          setLogActionGuide(data.manual_fix);
        } else {
          toast.error(data.message || "Fix failed. Please try manually.");
        }
      } catch (e) {
        console.error(e);
        toast.error("Network error — could not contact fix endpoint.");
      }
    };
    if (issueId === "debug_mode_enabled") {
      showConfirm(
        "Disable WP_DEBUG mode? This rewrites your wp-config.php file.",
        runFix
      );
      return;
    }
    await runFix();
  };

  // Returns ONE action button for a given AI-generated action string (priority-ordered)
  const getLogActionButton = (action: string): React.ReactNode => {
    const a = action.toLowerCase();
    const ipMatch = action.match(/\b(\d{1,3}\.){3}\d{1,3}\b/);
    // Badge shown when the recommended action is already done
    const doneBadge = (label: string) => (
      <span className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black tracking-widest text-emerald-600 uppercase dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
        <CheckCircle size={10} /> {label}
      </span>
    );

    // P1: Direct IP ban — highest priority. Check if already banned first.
    if (ipMatch) {
      const ip = ipMatch[0];
      if (bannedIps.includes(ip)) return doneBadge("Already Banned");
      return (
        <Button
          size="sm"
          className={LOG_BTN_ACCENT}
          onClick={() => handleBanIp(ip)}
        >
          Ban IP
        </Button>
      );
    }
    // P2: Firewall / WAF — our BUILT-IN firewall. If already on, say so; if off, enable it.
    if (a.includes("firewall") || a.includes("waf")) {
      if (firewallEnabled) return doneBadge("WAF Active");
      return (
        <Button
          size="sm"
          className={LOG_BTN_BASE}
          onClick={() => {
            setShowLogAdvisor(false);
            handleToggle("firewall", true);
            toast.success("SwissSuite built-in firewall enabled!");
          }}
        >
          Enable WAF
        </Button>
      );
    }
    // P3: Login / brute-force protection
    if (a.includes("login") || a.includes("brute")) {
      if (loginEnabled) return doneBadge("Login Prot. Active");
      return (
        <Button
          size="sm"
          className={LOG_BTN_BASE}
          onClick={() => {
            setShowLogAdvisor(false);
            handleToggle("login", true);
          }}
        >
          Enable Login Prot.
        </Button>
      );
    }
    // P4: Geo-blocking
    if (
      a.includes("geo") ||
      a.includes("country") ||
      a.includes("geographic") ||
      a.includes("region")
    ) {
      if (geoEnabled) return doneBadge("Geo-Lock Active");
      return (
        <Button
          size="sm"
          className={LOG_BTN_BASE}
          onClick={() => {
            setShowLogAdvisor(false);
            handleToggle("geo", true);
          }}
        >
          Enable Geo-Lock
        </Button>
      );
    }
    // P5: Two-Factor Authentication — can't auto-enable; show setup guide
    if (
      a.includes("2fa") ||
      a.includes("two-factor") ||
      a.includes("two factor") ||
      a.includes("authenticat")
    ) {
      return (
        <Button size="sm" className={LOG_BTN_BASE} onClick={handleLogAction2FA}>
          2FA Guide
        </Button>
      );
    }
    // P6: Spam / bot protection
    if (a.includes("spam") || a.includes("bot protec")) {
      if (spamProtection) return doneBadge("Spam Prot. Active");
      return (
        <Button
          size="sm"
          className={LOG_BTN_BASE}
          onClick={() => {
            setShowLogAdvisor(false);
            handleToggle("spam", true);
          }}
        >
          Enable Spam Prot.
        </Button>
      );
    }
    // P7: SQL injection blocking
    if (a.includes("sql") || a.includes("injection")) {
      if (blockSqli) return doneBadge("SQLi Blocked");
      return (
        <Button
          size="sm"
          className={LOG_BTN_BASE}
          onClick={() => {
            setShowLogAdvisor(false);
            handleToggle("block_sqli", true);
          }}
        >
          Block SQLi
        </Button>
      );
    }
    // P8: XSS blocking
    if (a.includes("xss") || a.includes("cross-site")) {
      if (blockXss) return doneBadge("XSS Blocked");
      return (
        <Button
          size="sm"
          className={LOG_BTN_BASE}
          onClick={() => {
            setShowLogAdvisor(false);
            handleToggle("block_xss", true);
          }}
        >
          Block XSS
        </Button>
      );
    }
    // P9a: Debug mode — auto-fixable via sentinel remediate
    if (a.includes("debug")) {
      return (
        <Button
          size="sm"
          className={LOG_BTN_BASE}
          onClick={() => handleLogActionFix("debug_mode_enabled")}
        >
          Fix Debug
        </Button>
      );
    }
    // P9b: File permissions / htaccess — auto-fixable via sentinel remediate
    if (a.includes("permission") || a.includes("htaccess")) {
      return (
        <Button
          size="sm"
          className={LOG_BTN_BASE}
          onClick={() => handleLogActionFix("htaccess_permissions")}
        >
          Fix Perms
        </Button>
      );
    }
    // P9c: Generic hardening / security headers
    if (a.includes("harden") || a.includes("header")) {
      return (
        <Button
          size="sm"
          className={LOG_BTN_BASE}
          onClick={() => {
            setShowLogAdvisor(false);
            setActiveTab("hardening");
          }}
        >
          Harden
        </Button>
      );
    }
    // P10: WordPress core / plugin / theme updates — link to WP Updates page
    if (
      a.includes("update") &&
      (a.includes("patch") ||
        a.includes("core") ||
        a.includes("plugin") ||
        a.includes("theme") ||
        a.includes("exploit") ||
        a.includes("vulnerabilit"))
    ) {
      return (
        <Button
          size="sm"
          className={LOG_BTN_BASE}
          onClick={() => {
            setShowLogAdvisor(false);
            window.location.href =
              (homeUrl || "") + "/wp-admin/update-core.php";
          }}
        >
          WP Updates
        </Button>
      );
    }
    return null;
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
      {/* Security Alerts Banner (Background AI Monitor) */}
      {alerts &&
        (() => {
          // Evaluate real-time protection state so the banner never shows a false
          // "no protection active" warning when defences are already in place.
          const attackingIpAlreadyBanned =
            Array.isArray(alerts.topIps) &&
            alerts.topIps.some((ip) => bannedIps.includes(ip));
          const isProtectionActive = loginEnabled || attackingIpAlreadyBanned;

          return isProtectionActive ? (
            // Protected state — amber/info tone (WCAG AA: amber-800 on amber-50 ≥ 4.5:1)
            <div
              role="status"
              aria-live="polite"
              className="animate-in fade-in slide-in-from-top-2 flex items-start justify-between rounded-r-lg border-l-4 border-amber-500 bg-amber-50 p-4"
            >
              <div>
                <h3 className="flex items-center gap-2 font-bold text-amber-800">
                  <ShieldAlert size={20} /> Security Alert: {alerts.verdict}
                </h3>
                <p className="mt-1 text-sm text-amber-800">
                  Login protection is active. Monitoring for further attempts.
                </p>
                <div className="mt-2 text-xs font-semibold text-amber-700 uppercase">
                  Threat Level: {alerts.threatLevel}
                </div>
              </div>
              <button
                onClick={handleDismissAlert}
                className="text-amber-600 hover:text-amber-800"
                aria-label="Dismiss security alert"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            // Unprotected state — red alert (original styling preserved)
            <div className="bg-muted animate-in fade-in slide-in-from-top-2 flex items-start justify-between rounded-r-lg border-l-4 border-red-500 p-4">
              <div>
                <h3 className="flex items-center gap-2 font-bold text-red-600">
                  <ShieldAlert size={20} /> Security Alert: {alerts.verdict}
                </h3>
                <p className="mt-1 text-sm text-red-700">{alerts.summary}</p>
                <div className="mt-2 text-xs font-semibold text-red-600 uppercase">
                  Threat Level: {alerts.threatLevel}
                </div>
              </div>
              <button
                onClick={handleDismissAlert}
                className="text-red-400 hover:text-red-600"
                aria-label="Dismiss security alert"
              >
                <X size={18} />
              </button>
            </div>
          );
        })()}

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
          {/* Firewall Advisor modal moved to global scope — see end of component */}

          {/* Bulk Analysis Modal moved to global scope — see end of component */}

          {/* AI Security Analysis Modal moved to global scope — see below */}

          {/* Deep Scan Modal moved to global scope — see below */}

          {/* Update Guard Card (Sprint 2 — Phase 1 Observe) */}
          {isProEditionBuild && (
            <UpdateGuardCard
              status={updateGuardStatus}
              snapshots={updateGuardSnapshots}
              reviews={updateGuardReviews}
              isLoading={updateGuardLoading}
              hasSentinelPro={hasSecurity}
              onSettingsChange={fetchUpdateGuard}
            />
          )}
          {/* Upsell redesign (2026-08-04, design point 1/2): Update Guard's
              compact ProUpsellPlaceholder is removed — its absence, plus
              Geo-Blocking's and the 2FA link's below, is covered by this
              single page-level pointer rather than one CTA per card. */}
          {!isProEditionBuild && <FeaturePointer variant="edition" />}

          {/* Dashboard Grid - Swiss Precision Style */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* WAF Card */}
            <div className="glass-panel premium-card relative overflow-hidden p-6 transition-all">
              <div className="bg-swiss-navy absolute top-0 right-0 -mt-12 -mr-12 h-24 w-24 rounded-full" />
              <div className="relative z-10 mb-6 flex items-start justify-between">
                <div
                  className={`rounded-2xl p-3 ${firewallEnabled ? "bg-swiss-navy shadow-swiss-navy/20 text-white shadow-lg" : "bg-secondary text-neutral-700"}`}
                >
                  <Shield size={24} />
                </div>
                {/* Basic WAF on/off is free in both editions (Freemium Dual-Build
                     Option A, see the hasSecurity comment above) — this switch must
                     render unconditionally, matching the Detection Only Mode
                     checkbox below. It was previously gated on hasSecurity (the
                     paid 'waf' capability), which hid it entirely for Free/non-
                     Security-plan users behind a read-only label — live-QA-found
                     and fixed 2026-08-02. */}
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

              {/* Freemium Dual-Build (2026-07-17): Detection Only Mode is
                  basic-WAF behavior, not a Security-plan feature — un-gated
                  from hasSecurity so Free admins can switch the WAF from
                  log-only to actively blocking (owner decision, Option A).
                  The API now accepts this toggle for any manage_options
                  admin, not just Security-plan tiers. */}
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

              {/* WAF Protection Tier Section */}
              {hasAdvancedWaf ? (
                <div className="relative z-10 mt-4 border-t border-emerald-200 pt-4 dark:border-emerald-800">
                  <p className="mb-2 flex items-center gap-1 text-xs font-black tracking-widest text-emerald-600 uppercase dark:text-emerald-400">
                    <CheckCircle size={11} /> Advanced WAF Active
                  </p>
                  <ul className="space-y-1">
                    {[
                      "28+ SQLi patterns + comment injection",
                      "40+ XSS patterns + all event handlers",
                      "3-layer recursive URL decoding",
                      "Double/triple-encoded payload detection",
                    ].map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-1.5 text-xs text-neutral-600 dark:text-neutral-400"
                      >
                        <CheckCircle
                          size={10}
                          className="mt-0.5 shrink-0 text-emerald-500"
                        />{" "}
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="border-border relative z-10 mt-4 border-t pt-4">
                  <p className="text-swiss-navy mb-2 text-xs font-black tracking-widest uppercase">
                    Basic WAF Running
                  </p>
                  <ul className="mb-3 space-y-1">
                    {[
                      "5 SQLi patterns (UNION, DROP, etc.)",
                      "4 XSS patterns (script, onload, etc.)",
                      "Path traversal protection",
                    ].map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-1.5 text-xs text-neutral-600 dark:text-neutral-400"
                      >
                        <CheckCircle
                          size={10}
                          className="mt-0.5 shrink-0 text-emerald-500"
                        />{" "}
                        {f}
                      </li>
                    ))}
                  </ul>
                  {/* Upsell redesign (2026-08-04, T1): this box is a
                      plan-upsell to an EXISTING customer (Pro build, WAF
                      capability not on their tier) — permitted per the
                      design doc since WP.org never reviews the Pro build.
                      Gated on isProEditionBuild (not just hasAdvancedWaf)
                      so it structurally cannot render in the Free build even
                      under a stale/corrupted capability cache. The page
                      already carries one neutral FeaturePointer (above, near
                      Update Guard) for the Free case — no second pointer
                      added here per the "one pointer per view" rule. */}
                  {isProEditionBuild && (
                    <div className="bg-swiss-navy/5 border-swiss-navy/10 rounded-xl border p-3">
                      <p className="text-swiss-navy mb-1 text-xs font-black tracking-widest uppercase">
                        Upgrade for Full Protection
                      </p>
                      <ul className="mb-2 space-y-0.5">
                        {[
                          "28+ SQLi + comment injection bypass",
                          "40+ XSS + all event handler attacks",
                          "Multi-layer encoding bypass detection",
                        ].map((f) => (
                          <li
                            key={f}
                            className="flex items-start gap-1.5 text-xs text-neutral-500"
                          >
                            <Lock
                              size={9}
                              className="text-swiss-navy/40 mt-0.5 shrink-0"
                            />{" "}
                            {f}
                          </li>
                        ))}
                      </ul>
                      <a
                        href="https://swisswpsecure.com/#pricing"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-swiss-navy inline-flex items-center gap-1 text-xs font-black tracking-widest uppercase hover:underline"
                      >
                        Upgrade to Security Plan →
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Geo-Blocking Card */}
            {isProEditionBuild ? (
              <div className="glass-panel premium-card relative overflow-hidden p-6 transition-all">
                <div className="bg-brand-accent/5 absolute top-0 right-0 -mt-12 -mr-12 h-24 w-24 rounded-full" />
                <div className="relative z-10 mb-6 flex items-start justify-between">
                  <div
                    className={`rounded-2xl p-3 ${geoEnabled && hasSecurity ? "bg-swiss-red shadow-brand-accent/20 text-white shadow-lg" : "bg-secondary text-neutral-700"}`}
                  >
                    <Globe size={24} />
                  </div>
                  {hasSecurity && (
                    <div
                      role="switch"
                      aria-checked={geoEnabled}
                      aria-label="Toggle Geo-Lockdown"
                      tabIndex={0}
                      className={`h-6 w-12 cursor-pointer rounded-full p-1 ring-1 transition-all duration-300 ring-inset ${geoEnabled ? "bg-green-500 ring-green-600" : "bg-red-500 ring-red-600"}`}
                      onClick={() => handleToggle("geo", !geoEnabled)}
                      onKeyDown={(e) =>
                        e.key === "Enter" || e.key === " "
                          ? handleToggle("geo", !geoEnabled)
                          : undefined
                      }
                    >
                      <div
                        className="h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-300"
                        style={{
                          transform: geoEnabled
                            ? "translateX(1.5rem)"
                            : "translateX(0)",
                        }}
                      />
                    </div>
                  )}
                </div>
                <h3 className="text-swiss-navy relative z-10 mb-2 text-xs font-black tracking-widest uppercase">
                  Geo-Lockdown
                </h3>
                <p className="relative z-10 mb-4 text-sm leading-relaxed font-medium text-neutral-700">
                  Restrict site access based on visitor location. Prevent
                  traffic from high-risk regions.
                </p>

                {!hasSecurity ? (
                  <div className="border-border relative z-10 flex flex-col items-center justify-center border-t py-6 pt-4 opacity-60">
                    <Lock size={24} className="mb-2 text-neutral-500" />
                    <span className="text-xs font-black tracking-widest text-neutral-500 uppercase">
                      PRO FEATURE
                    </span>
                    <p className="mt-1 text-center text-xs text-neutral-500">
                      Upgrade to unlock Geo-Lockdown
                    </p>
                    <a
                      href="https://swisswpsecure.com/products"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-accent mt-2 inline-block text-xs font-bold hover:underline"
                    >
                      swisswpsecure.com/products
                    </a>
                  </div>
                ) : (
                  <div className="border-border relative z-10 space-y-3 border-t pt-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="globalGeo"
                        checked={globalGeoBlock}
                        onChange={(e) =>
                          handleToggle("global_geo_block", e.target.checked)
                        }
                        className="border-border text-brand-accent focus:ring-brand-accent mt-0.5 h-4 w-4 shrink-0 rounded-md transition-all"
                      />
                      <div>
                        <label
                          htmlFor="globalGeo"
                          className="hover:text-brand-accent mb-0.5 block cursor-pointer text-sm font-black tracking-widest text-slate-600 uppercase transition-colors"
                        >
                          Block High-Risk Zones
                        </label>
                        <p className="text-xs leading-relaxed font-medium text-neutral-500">
                          Automatically blocks countries that are the most
                          common sources of WordPress attacks. Uses the country
                          list below.
                        </p>
                      </div>
                    </div>

                    {/* Mode selector */}
                    <div className="flex gap-2">
                      {(["blacklist", "whitelist"] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() =>
                            setGeoSettings((prev) => ({
                              ...prev,
                              list_mode: mode,
                            }))
                          }
                          className={`flex-1 rounded-lg border py-1.5 text-xs font-black tracking-widest uppercase transition-all ${geoSettings.list_mode === mode ? "bg-swiss-navy border-swiss-navy text-white" : "bg-secondary border-border hover:border-swiss-navy text-neutral-700"}`}
                        >
                          {mode === "blacklist" ? "Block List" : "Allow List"}
                        </button>
                      ))}
                    </div>

                    {/* Country picker toggle */}
                    <button
                      onClick={() => {
                        setShowGeoPicker(!showGeoPicker);
                        if (!showGeoPicker && allCountries.length === 0)
                          fetchGeoSettings();
                      }}
                      className="text-swiss-navy hover:text-brand-accent flex w-full items-center justify-between py-1 text-xs font-black tracking-widest uppercase transition-colors"
                    >
                      <span>
                        {geoSettings.countries.length > 0
                          ? `${geoSettings.countries.length} ${geoSettings.list_mode === "blacklist" ? "Blocked" : "Allowed"}`
                          : "Select Countries"}
                      </span>
                      <span>{showGeoPicker ? "▲" : "▼"}</span>
                    </button>

                    {showGeoPicker && (
                      <div className="border-border overflow-hidden rounded-xl border">
                        <input
                          type="text"
                          placeholder="Search countries..."
                          value={geoSearch}
                          onChange={(e) => setGeoSearch(e.target.value)}
                          className="bg-background border-border focus:ring-swiss-navy w-full border-b px-3 py-2 text-xs font-bold focus:ring-1 focus:outline-none"
                        />
                        <div className="max-h-40 overflow-y-auto">
                          {filteredCountries.map((country) => (
                            <label
                              key={country.code}
                              className="hover:bg-secondary flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs font-bold"
                            >
                              <input
                                type="checkbox"
                                checked={geoSettings.countries.includes(
                                  country.code
                                )}
                                onChange={(e) => {
                                  const next = e.target.checked
                                    ? [...geoSettings.countries, country.code]
                                    : geoSettings.countries.filter(
                                        (c) => c !== country.code
                                      );
                                  setGeoSettings((prev) => ({
                                    ...prev,
                                    countries: next,
                                  }));
                                }}
                                className="h-3 w-3 rounded"
                              />
                              <span>{country.flag}</span>
                              <span>{country.name}</span>
                            </label>
                          ))}
                        </div>
                        <div className="border-border border-t p-2">
                          <Button
                            variant="primary"
                            onClick={() =>
                              saveGeoCountries(
                                geoSettings.countries,
                                geoSettings.list_mode
                              )
                            }
                            loading={savingGeo}
                            disabled={savingGeo}
                          >
                            Save Countries
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
            {/* Upsell redesign (2026-08-04, design point 1/2): Geo-Blocking's
                compact ProUpsellPlaceholder is removed — see the single
                page-level FeaturePointer rendered further down this
                sub-tab (near Login Safeguard) for the neutral pointer that
                covers both this card and Update Guard above. */}

            {/* Login Security Card */}
            <div className="glass-panel premium-card relative overflow-hidden p-6 transition-all">
              <div className="bg-card/5 absolute top-0 right-0 -mt-12 -mr-12 h-24 w-24 rounded-full" />
              <div className="relative z-10 mb-6 flex items-start justify-between">
                <div
                  className={`rounded-2xl p-3 ${loginEnabled ? "bg-slate-800 text-white shadow-lg shadow-slate-900/20" : "bg-secondary text-neutral-700"}`}
                >
                  <KeyRound size={24} />
                </div>
                {/* Basic login-lockout protection is free in both editions
                     (same Freemium Dual-Build Option A as the WAF card above) —
                     this switch must render unconditionally. It was previously
                     gated on hasSecurity, which left Free/non-Security-plan
                     users with NO interactive control at all (only a read-only
                     "ACTIVE — N ATTEMPTS" label) — live-QA-found and fixed
                     2026-08-02. */}
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
              {isProEditionBuild && (
                <Link
                  to="/settings?tab=security"
                  className="relative z-10 mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 transition-colors hover:text-blue-800"
                >
                  <ShieldCheck size={14} />
                  Set up Two-Factor Authentication (2FA)
                </Link>
              )}
              {/* Upsell redesign (2026-08-04, design point 1/2): the Free
                  branch's "Two-Factor Authentication (2FA) — Pro Feature"
                  link is removed — covered by the page-level FeaturePointer
                  below, not a second per-card CTA. */}

              {/* Max-login-attempts is part of the same free basic
                   login-lockout protection as the switch above — must render
                   unconditionally for the same reason. Previously gated on
                   hasSecurity, hiding this control entirely for Free/non-
                   Security-plan users — live-QA-found and fixed 2026-08-02. */}
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
                  After this many failed logins, the IP is temporarily locked
                  out for 30 minutes.
                </p>
              </div>
            </div>

            {/* Integrity Card */}
            <div className="glass-panel premium-card relative overflow-hidden p-6 transition-all">
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
            <div className="glass-panel premium-card relative mt-4 overflow-hidden p-6 transition-all">
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

          {/* AI Log Advisors — moved here from Logs tab (H-7).
              Upsell redesign (2026-08-04, T2): both branches below are now
              gated on isProEditionBuild, not just hasSecurity. Their buttons
              call /security/analyze-firewall and /security/analyze-logs,
              which are registered ONLY when SWISSWPSUITE_EDITION === 'pro'
              (class-swisswpsuite-api-security.php ~:251-290, F2) — physically
              absent in the Free build. hasSecurity alone (a license
              capability) is not a safe gate here: per lib/edition.ts's own
              documented fail-safe contract, a stale/cached capability must
              never be trusted over which code is actually present, or a
              Free session with a corrupted capability cache could render
              live buttons that hit a dead route. The former Free-reachable
              "PRO" card ("Upgrade to Pro to unlock") is removed outright,
              not replaced with a second pointer — the page already carries
              one FeaturePointer (near Update Guard, above) covering this
              view, and design's "sparingly"/one-pointer-per-view rule
              favors not duplicating it here. */}
          {isProEditionBuild && hasSecurity && (
            <div className="glass-panel premium-card mt-4 p-6 transition-all">
              <div className="mb-4">
                <h3 className="text-swiss-navy mb-1 text-xs font-black tracking-widest uppercase">
                  AI Log Analysis
                </h3>
                <p className="text-sm font-medium text-neutral-500">
                  Analyzes your existing log data with AI — no new scan
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setShowFirewallAdvisor(true)}
                  icon={Shield}
                  className="rounded-xl border border-gray-200 text-sm font-black tracking-widest uppercase hover:bg-gray-100"
                >
                  Analyze Firewall Logs (Log Analysis)
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowLogAdvisor(true)}
                  icon={Sparkles}
                  className="rounded-xl border border-gray-200 text-sm font-black tracking-widest uppercase hover:bg-gray-100"
                >
                  Analyze Logs with AI
                </Button>
              </div>
            </div>
          )}
          {isProEditionBuild && !hasSecurity && (
            <div className="glass-panel premium-card mt-4 p-6 opacity-60 transition-all">
              <div className="mb-4">
                <h3 className="text-swiss-navy mb-1 flex items-center gap-2 text-xs font-black tracking-widest uppercase">
                  AI Log Analysis
                  <Badge className="bg-muted text-muted-foreground border-border text-xs font-black tracking-widest uppercase">
                    PRO
                  </Badge>
                </h3>
                <p className="text-sm font-medium text-neutral-500">
                  Analyzes your existing log data with AI — no new scan.
                  Requires a plan that includes Security.
                </p>
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
                    {sentinelReport.layer === 2
                      ? `Security Grade: ${(sentinelReport as SentinelLayer2Report).security_grade ?? "—"}`
                      : "Quick Scan Complete"}
                  </p>
                  <p className="mt-0.5 text-sm text-neutral-500">
                    {(() => {
                      const findings =
                        sentinelReport.layer === 1
                          ? sentinelReport.findings
                          : ((sentinelReport as SentinelLayer2Report)
                              .individual_findings ?? []);
                      const fixable = findings.filter(
                        (f) =>
                          f.fix_type &&
                          f.fix_type !== "manual" &&
                          f.fix_type !== "navigate_hardening" &&
                          f.fix_type !== ""
                      ).length;
                      return fixable > 0
                        ? `${fixable} issue${fixable > 1 ? "s" : ""} can be fixed with one click`
                        : "Review findings on the Scan tab";
                    })()}
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
            currentTier={currentTier}
            onPreviewEmail={handleOpenPreview}
          />

          <ScanCard
            scanType="ai-audit"
            tier={currentTier}
            onTrigger={() => handleTriggerScan("ai-audit")}
            isLoading={aiAuditLoading}
            result={aiAuditResult}
            config={scanReportConfig}
          />
          {/* Upsell redesign (2026-08-04, T2/T5) — applies to all 3
              ScanResultPanel instances below (ai-audit/malware/deep-malware):
              hasSentinelPro gates the "Check with AI" / Analyze action, which
              calls /security/analyze-file — registered ONLY in the Pro build
              (F2, api-security.php ~:251-263). Combined with isProEditionBuild
              so a stale/cached Free-session capability can never enable a
              control whose backing route is physically absent, matching the
              same fail-safe contract lib/edition.ts documents for every other
              paid-capability gate in this file. canRemediate is now
              unconditionally true: quarantine/delete are a FREE-tier
              capability (class-swisswpsuite-api-security.php:1814-1817,
              class-swisswpsuite-security-quarantine.php:48-58) — the backend
              already accepts these calls on Free. Previously this passed the
              *paid-plan* `hasSentinelPro` local (sentinelCredits.is_pro /
              sentinelIsPro), which wrongly locked a free capability behind a
              paid-plan flag (L1 register §2.1). Distinct from the
              hasSentinelPro PROP, which correctly keeps gating the separate
              AI action. */}
          <ScanResultPanel
            scanType="ai-audit"
            result={aiAuditResult}
            isLoading={aiAuditLoading}
            onViewHistory={handleViewScanInHistory}
            onMarkSafe={handleAuditMarkSafe}
            onMarkSafeById={handleAuditMarkSafeById}
            onManageSafelist={() => {
              void fetchIgnored();
              setSafelistSheetOpen(true);
            }}
            onQuarantine={handleQuarantine}
            onBulkAction={handleScanPanelBulkAction}
            onAnalyze={handleAiAnalyze}
            hasSentinelPro={isProEditionBuild && hasSecurity}
            canRemediate={true}
          />
          {safelistSheetOpen && (
            <SentinelSafelistSheet
              findingIds={ignoredFindings}
              currentScanFindings={aiAuditResult?.findings ?? []}
              onClose={() => setSafelistSheetOpen(false)}
              onRemove={handleRemoveSafelistFinding}
            />
          )}

          <ScanCard
            scanType="malware"
            tier={currentTier}
            onTrigger={() => handleTriggerScan("malware")}
            isLoading={malwareLoading}
            result={malwareResult}
          />
          <ScanResultPanel
            scanType="malware"
            result={malwareResult}
            isLoading={malwareLoading}
            onViewHistory={handleViewScanInHistory}
            onMarkSafe={handleMarkMalwareSafe}
            onBulkAction={handleScanPanelBulkAction}
            onAnalyze={handleAiAnalyze}
            analyzingFile={analyzingFile}
            hasSentinelPro={isProEditionBuild && hasSecurity}
            canRemediate={true}
          />

          {/* v2.9.29.0 — Deep Malware Scan replaces the Full AI Scan card.
              The async pipeline subsumes Full AI's L1+L2 with the addition
              of VPS hash, WPScan, and Patchstack phases.
              WP.org round-3 (Sprint W2/T7, 2026-07-26): the `locked`
              override (previously `!hasSecurity`) and its "Requires
              Security Plan" copy were REMOVED — Sprint W1 de-gated
              deep-malware's local phases (enumerate, hash, local scan) in
              the PHP, so at the time they ran free in every edition.
              SUPERSEDED (LiveQA Fix Sprint, 2026-08-04, owner scan-edition
              ruling): the owner has since drawn the Free/Pro line at the
              whole-scan level, not the phase level — "Deep scan" (this
              pipeline) is Pro-only in full, alongside the AI-diagnostic
              surfaces. `/security/scan/malware/start` + `/status` are now
              registered ONLY when SWISSWPSUITE_EDITION === 'pro'
              (api-security.php ~:641), so a Free build calling either route
              gets nothing — the route is physically absent. Per WP.org
              Guideline 5, a Free-absent feature must not render as a
              clickable-but-broken OR locked-teaser card (ScanCard.tsx's own
              dimmed-overlay/Lock-icon/CTA branch is exactly the kind of
              per-feature upsell the 2026-08-03 redesign ruling forbids), so
              this card + its result panel are gated at this call site on
              isProEditionBuild instead of passed a `locked` prop — see
              ScanCard.tsx's isProLocked comment for why deep-malware stays
              OUT of that clause even though it is Pro-only again. The
              "scan" sub-tab had no FeaturePointer of its own before this —
              added below for the Free case; variant="ai" because this
              pipeline is genuinely AI-backed (its final phase is
              ai_analysis and SCAN_DESCRIPTIONS already says "consumes AI
              tokens"), unlike the "edition" pointer used elsewhere on the
              dashboard sub-tab for non-AI Pro features. */}
          {isProEditionBuild && (
            <>
              <ScanCard
                scanType="deep-malware"
                tier={currentTier}
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
                onQuarantine={handleQuarantine}
                onBulkAction={handleScanPanelBulkAction}
                onAnalyze={handleAiAnalyze}
                analyzingFile={analyzingFile}
                hasSentinelPro={isProEditionBuild && hasSecurity}
                canRemediate={true}
              />
            </>
          )}
          {!isProEditionBuild && <FeaturePointer variant="ai" />}

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
        // WP.org round-3 (Sprint W2/T7, 2026-07-26): all 13 hardening options
        // are now free/functional in every edition (opt.pro is uniformly
        // false server-side since Sprint W1) — the panel always renders, and
        // HardeningOptionsGrid's per-card gating auto-unlocks everything.
        // hasSentinelPro is threaded (not hasSecurity, which is
        // Security-plan-specific and always false for non-Security Pro
        // users) purely as that component's own defensive fallback for the
        // rare case a card's opt.pro isn't populated as a boolean.
        <HardeningOptionsGrid
          options={hardeningOptions}
          hasSentinelPro={hasSentinelPro}
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
          hasSentinelPro={hasSentinelPro}
          loadingRecordId={loadingHistoricalScanId}
          onRefresh={fetchScanHistory}
          onViewRecord={(record) => {
            fetchScanRecord(record.id);
          }}
        />
      )}

      {/* Log Advisor Modal — global scope so it renders from any tab */}
      {showLogAdvisor && (
        <div className="bg-swiss-navy/40 animate-in fade-in fixed inset-0 z-[99991] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card shadow-premium border-border/40 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border">
            <div className="custom-scrollbar flex-1 overflow-y-auto p-8">
              <div className="border-border mb-10 flex items-start justify-between border-b pb-6">
                <div className="flex items-center gap-4">
                  <div className="bg-brand-accent/10 rounded-2xl p-3">
                    <Sparkles className="text-brand-accent" size={24} />
                  </div>
                  <div>
                    <h3 className="text-swiss-navy text-2xl font-black tracking-tight uppercase">
                      Analyze Logs with AI
                    </h3>
                    <p className="mt-1 text-sm font-black tracking-widest text-neutral-700 uppercase">
                      Analyzes your existing log data with AI — no new scan
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowLogAdvisor(false)}
                  aria-label="Close log advisor"
                  className="hover:bg-background hover:text-swiss-navy rounded-xl border border-transparent p-2 text-neutral-700 transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              {!logAnalysis ? (
                <div className="py-20 text-center">
                  {analyzingLogs ? (
                    <div className="flex flex-col items-center gap-8">
                      <div className="relative">
                        <Loader
                          className="text-swiss-navy animate-spin"
                          size={48}
                        />
                        <Sparkles
                          className="text-brand-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse"
                          size={16}
                        />
                      </div>
                      <p className="text-swiss-navy text-sm font-black tracking-widest uppercase">
                        {aiElapsed > 5
                          ? `Synthesizing... (${aiElapsed}s)`
                          : "Synthesizing security audit..."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-10">
                      <p className="mx-auto max-w-md text-sm leading-relaxed font-medium text-neutral-700">
                        Generate a comprehensive forensic report by
                        cross-referencing firewall logs, brute-force patterns,
                        and threat signatures.
                      </p>
                      <Button
                        onClick={handleAnalyzeLogs}
                        disabled={!canAfford("sentinel_security")}
                        title={
                          !canAfford("sentinel_security")
                            ? `Need ~${tokensNeeded("sentinel_security").toLocaleString()} tokens (balance: ${tokenSpendable.toLocaleString()})`
                            : undefined
                        }
                        className="bg-swiss-navy hover:bg-brand-accent shadow-swiss-navy/20 rounded-2xl border-none px-12 py-5 text-xs font-black tracking-widest text-white uppercase shadow-xl transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Run AI Diagnostics
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-10">
                  <div
                    className={`rounded-3xl border p-8 ${
                      logAnalysis.threatLevel === "Critical"
                        ? "text-brand-accent border-red-100 bg-red-50"
                        : logAnalysis.threatLevel === "Medium"
                          ? "bg-card border-border text-foreground dark:text-foreground"
                          : "bg-background border-border text-swiss-navy"
                    }`}
                  >
                    <div className="mb-6 flex items-center justify-between">
                      <span className="text-2xl font-black tracking-tight uppercase">
                        {logAnalysis.verdict}
                      </span>
                      <span
                        className={`rounded-full border border-current/20 px-3 py-1 text-sm font-black tracking-widest uppercase ${logAnalysis.threatLevel === "Critical" ? "dark:bg-card/10 border-red-200 bg-red-50 text-red-600" : "bg-secondary dark:bg-background/20 dark:text-foreground text-slate-700"}`}
                      >
                        Threat: {logAnalysis.threatLevel}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed font-medium opacity-90">
                      {logAnalysis.summary}
                    </p>
                  </div>

                  <div>
                    <h4 className="mb-6 flex items-center gap-2 text-sm font-black tracking-widest text-neutral-700 uppercase">
                      <Shield size={14} /> Tactical Countermeasures
                    </h4>
                    <ul className="grid gap-4">
                      {logAnalysis.actions &&
                        Array.isArray(logAnalysis.actions) &&
                        logAnalysis.actions.map((action: string, i: number) => (
                          <li
                            key={i}
                            className="text-swiss-navy bg-card border-border hover:bg-background hover:shadow-soft group flex items-center justify-between gap-6 rounded-2xl border p-5 text-sm transition-all"
                          >
                            <div className="flex items-start gap-4">
                              <div className="bg-swiss-navy text-swiss-navy group-hover:bg-swiss-navy rounded-xl p-2 transition-all group-hover:text-white">
                                <CheckCircle size={16} />
                              </div>
                              <span className="mt-1.5 text-xs font-bold tracking-wide uppercase">
                                {action}
                              </span>
                            </div>
                            <div className="shrink-0">
                              {getLogActionButton(action)}
                            </div>
                          </li>
                        ))}
                    </ul>
                    {/* Footer: explain what Active badges mean + link to Logs for verification */}
                    <p className="pt-4 text-center text-xs leading-relaxed text-neutral-500">
                      <CheckCircle
                        size={10}
                        className="mr-1 mb-0.5 inline text-emerald-500"
                      />
                      <strong className="text-emerald-600 dark:text-emerald-400">
                        Active
                      </strong>{" "}
                      = SwissSuite is already protecting your site.{" "}
                      <button
                        onClick={() => {
                          setShowLogAdvisor(false);
                          setActiveTab("logs");
                        }}
                        className="hover:text-swiss-navy font-semibold underline underline-offset-2 transition-colors"
                      >
                        Verify in Security Logs →
                      </button>
                    </p>
                  </div>

                  <div className="border-border flex justify-end border-t pt-6">
                    <Button
                      variant="ghost"
                      className="hover:text-brand-accent rounded-xl text-xs font-black text-neutral-700 uppercase"
                      onClick={() => {
                        setLogAnalysis(null);
                        setShowLogAdvisor(false);
                      }}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Firewall (WAF) Advisor Modal — global scope so it renders from any tab */}
      {showFirewallAdvisor && (
        <div className="bg-swiss-navy/40 animate-in fade-in fixed inset-0 z-[99992] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card shadow-premium border-border/40 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2.5rem] border">
            <div className="custom-scrollbar flex-1 overflow-y-auto p-10">
              <div className="border-border mb-10 flex items-start justify-between border-b pb-6">
                <div className="flex items-center gap-4">
                  <div className="bg-brand-accent/10 rounded-2xl p-3">
                    <Shield className="text-brand-accent" size={24} />
                  </div>
                  <div>
                    <h3 className="text-swiss-navy text-2xl font-black tracking-tight uppercase">
                      Analyze Firewall Logs (Log Analysis)
                    </h3>
                    <p className="mt-1 text-sm font-black tracking-widest text-neutral-700 uppercase">
                      Analyzes your existing log data with AI — no new scan
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFirewallAdvisor(false)}
                  aria-label="Close WAF Advisor"
                  className="hover:bg-background hover:text-swiss-navy rounded-xl border border-transparent p-2 text-neutral-700 transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              {!firewallAnalysis ? (
                <div className="py-20 text-center">
                  {analyzingFirewall ? (
                    <div className="flex flex-col items-center gap-8">
                      <div className="relative">
                        <Loader
                          className="text-swiss-navy animate-spin"
                          size={48}
                        />
                        <Shield
                          className="text-brand-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse"
                          size={16}
                        />
                      </div>
                      <p className="text-swiss-navy text-sm font-black tracking-widest uppercase">
                        {aiElapsed > 5
                          ? `Analyzing... (${aiElapsed}s)`
                          : "Analyzing firewall telemetry..."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-10">
                      <p className="mx-auto max-w-md text-center text-sm leading-relaxed font-medium text-neutral-700">
                        Generate an AI report identifying persistent attackers
                        and recommended IP bans based on your firewall's blocked
                        request history.
                      </p>
                      <div className="flex justify-center">
                        <Button
                          onClick={handleAnalyzeFirewall}
                          disabled={!canAfford("sentinel_security")}
                          title={
                            !canAfford("sentinel_security")
                              ? `Need ~${tokensNeeded("sentinel_security").toLocaleString()} tokens (balance: ${tokenSpendable.toLocaleString()})`
                              : undefined
                          }
                          variant="primary"
                          size="lg"
                          className="px-12 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          CALIBRATE SHIELD
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-8">
                  {firewallAnalysis.analysis && (
                    <div className="border-border bg-background rounded-2xl border p-6">
                      <h4 className="mb-3 text-xs font-black tracking-widest text-neutral-700 uppercase">
                        Attack Pattern Analysis
                      </h4>
                      <p className="text-sm leading-relaxed font-medium">
                        {firewallAnalysis.analysis}
                      </p>
                    </div>
                  )}

                  {firewallAnalysis.suggestedBans &&
                  firewallAnalysis.suggestedBans.length > 0 ? (
                    <div>
                      <h4 className="text-swiss-navy mb-4 flex items-center gap-2 text-xs font-black tracking-widest uppercase">
                        <ShieldAlert size={14} /> Recommended IP Bans (
                        {firewallAnalysis.suggestedBans.length})
                      </h4>
                      <ul className="space-y-3">
                        {firewallAnalysis.suggestedBans.map((ban, i) => (
                          <li
                            key={i}
                            className="bg-card border-border hover:bg-background flex items-center justify-between gap-4 rounded-2xl border p-4 text-sm transition-all"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <code className="bg-secondary shrink-0 rounded-lg px-2 py-1 font-mono text-xs font-black">
                                {ban.ip}
                              </code>
                              <span className="truncate text-xs font-bold text-neutral-700">
                                {ban.reason}
                              </span>
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-black uppercase ${ban.confidence === "High" ? "border border-red-200 bg-red-50 text-red-600" : ban.confidence === "Medium" ? "border border-amber-200 bg-amber-50 text-amber-600" : "bg-secondary border-border border text-neutral-700"}`}
                              >
                                {ban.confidence}
                              </span>
                            </div>
                            {bannedIps.includes(ban.ip) ? (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black tracking-widest text-emerald-600 uppercase dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                                <CheckCircle size={10} /> Already Banned
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                className="bg-brand-accent/10 text-brand-accent hover:bg-brand-accent hover:text-foreground border-brand-accent/30 shrink-0 rounded-xl border px-4 text-xs font-black uppercase"
                                onClick={() => handleBanIp(ban.ip)}
                              >
                                Ban IP
                              </Button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="py-10 text-center text-xs font-black tracking-widest text-neutral-700 uppercase">
                      No immediate IP bans recommended — system appears clean.
                    </div>
                  )}

                  <div className="border-border flex justify-end border-t pt-4">
                    <Button
                      variant="ghost"
                      className="hover:text-brand-accent rounded-xl text-xs font-black text-neutral-700 uppercase"
                      onClick={() => {
                        setFirewallAnalysis(null);
                        setShowFirewallAdvisor(false);
                      }}
                    >
                      Close Report
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Log Action Manual Guide Modal — shown for 2FA, debug, htaccess when auto-fix is not available */}
      {logActionGuide && (
        <div className="bg-swiss-navy/40 animate-in fade-in fixed inset-0 z-[99993] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card dark:bg-card shadow-premium border-border dark:border-border/20 animate-in zoom-in-95 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[2.5rem] border backdrop-blur-xl duration-500">
            <div className="bg-swiss-navy flex shrink-0 items-center justify-between p-8 text-white">
              <h3 className="flex items-center gap-4 text-xl font-black tracking-[0.1em] uppercase">
                <AlertTriangle size={24} className="text-brand-accent" /> Manual
                Setup Required
              </h3>
              <button
                onClick={() => setLogActionGuide(null)}
                aria-label="Close guide"
                className="bg-secondary dark:bg-card/10 dark:hover:bg-card/20 dark:text-foreground rounded-2xl p-3 text-neutral-900 transition-all hover:bg-slate-200"
              >
                <X size={24} />
              </button>
            </div>

            <div className="bg-background dark:bg-card/50 flex-1 space-y-10 overflow-y-auto p-10">
              <div className="bg-card dark:bg-secondary border-border dark:border-border/10 shadow-soft rounded-3xl border p-8">
                <div className="mb-4 flex items-center justify-between">
                  <span className="bg-secondary dark:bg-secondary rounded-lg px-3 py-1.5 text-xs font-black tracking-widest text-neutral-700 uppercase">
                    ISSUE
                  </span>
                  <h4 className="dark:text-foreground text-xs font-black tracking-widest text-neutral-900 uppercase">
                    WHAT'S THE PROBLEM
                  </h4>
                </div>
                <p className="text-[14px] leading-relaxed font-bold text-neutral-700">
                  {logActionGuide.what}
                </p>
              </div>

              <div className="bg-background border-border rounded-3xl border p-8 shadow-inner">
                <h4 className="text-swiss-navy mb-5 flex items-center gap-3 text-xs font-black tracking-widest uppercase">
                  <span className="bg-brand-accent/10 text-brand-accent rounded-lg px-3 py-1.5 text-xs font-black tracking-widest uppercase">
                    WHY MANUAL
                  </span>
                  REASON FOR MANUAL INTERVENTION
                </h4>
                <p className="text-[14px] leading-relaxed font-bold text-slate-600 italic">
                  {logActionGuide.why}
                </p>
              </div>

              <div className="bg-card dark:bg-secondary border-border dark:border-border/10 shadow-premium relative overflow-hidden rounded-[2rem] border p-10">
                <div className="bg-brand-accent/10 absolute top-0 right-0 -mt-10 -mr-10 h-32 w-32 blur-3xl" />
                <h4 className="dark:text-foreground relative z-10 mb-8 flex items-center gap-3 text-xs font-black tracking-widest text-neutral-900 uppercase">
                  REMEDIATION STEPS
                </h4>
                <ol className="relative z-10 space-y-6">
                  {logActionGuide.how.map((step: string, idx: number) => (
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
                onClick={() => setLogActionGuide(null)}
                variant="primary"
                size="lg"
                className="w-full"
              >
                UNDERSTOOD
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* AI Security Analysis Modal — global scope so it renders from any tab */}
      {aiAnalysis && (
        <div className="bg-background/80 animate-in fade-in fixed inset-0 z-[99994] flex items-center justify-center p-4">
          <div className="bg-card flex max-h-[90vh] w-full max-w-lg flex-col border-2 border-black">
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6 flex items-start justify-between border-b-2 border-black pb-4">
                <h3 className="flex items-center gap-2 text-xl font-black tracking-widest text-black uppercase">
                  <Sparkles className="text-black" /> AI Security Analysis
                </h3>
                <button
                  onClick={() => setAiAnalysis(null)}
                  aria-label="Close AI analysis"
                  className="border border-transparent p-1 text-black transition-colors hover:border-black hover:bg-red-600 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="mb-6">
                <p className="bg-secondary mb-3 border border-black p-2 font-mono text-xs break-all text-black">
                  {aiAnalysis.file}
                </p>
                <div
                  className={`border border-black p-5 ${
                    aiAnalysis.verdict?.toLowerCase().includes("safe")
                      ? "bg-card text-black"
                      : aiAnalysis.verdict?.toLowerCase().includes("malicious")
                        ? "bg-red-600 text-white"
                        : "bg-background text-foreground"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xl font-black tracking-widest uppercase">
                      {aiAnalysis.verdict}
                    </span>
                    <span
                      className={`border px-2 py-1 text-sm font-black tracking-widest uppercase ${
                        aiAnalysis.verdict?.toLowerCase().includes("safe")
                          ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                          : aiAnalysis.verdict
                                ?.toLowerCase()
                                .includes("suspicious")
                            ? "border-amber-600 bg-amber-50 text-amber-700"
                            : "border-red-400 bg-red-700 text-white"
                      }`}
                    >
                      {aiAnalysis.verdict?.toLowerCase().includes("safe")
                        ? "SAFE"
                        : aiAnalysis.verdict
                              ?.toLowerCase()
                              .includes("suspicious")
                          ? "SUSPICIOUS"
                          : "DANGER"}
                    </span>
                  </div>
                  <p className="mb-1 text-xs font-bold tracking-widest uppercase opacity-70">
                    Analysis
                  </p>
                  <p className="text-sm leading-relaxed font-medium">
                    {aiAnalysis.explanation}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-black pt-4">
                <Button
                  variant="ghost"
                  className="rounded-none text-xs font-black uppercase"
                  onClick={() => setAiAnalysis(null)}
                >
                  Close
                </Button>
                {aiAnalysis.verdict?.toLowerCase().includes("safe") &&
                  (aiAnalysis.auto_whitelisted ? (
                    <span className="flex items-center gap-1 text-xs font-black tracking-widest text-green-700 uppercase">
                      <CheckCircle2 size={14} /> Auto-Whitelisted
                    </span>
                  ) : (
                    <Button
                      className="bg-card text-foreground hover:bg-background rounded-none border border-black text-xs font-black uppercase"
                      onClick={() => {
                        handleIgnore(aiAnalysis.file);
                        setAiAnalysis(null);
                      }}
                    >
                      Mark as Safe
                    </Button>
                  ))}
                {aiAnalysis.verdict?.toLowerCase().includes("suspicious") && (
                  <Button
                    className="bg-background text-foreground dark:text-foreground rounded-none border border-black text-xs font-black uppercase hover:bg-amber-500"
                    onClick={() => {
                      handleQuarantine(aiAnalysis.file);
                      setAiAnalysis(null);
                    }}
                  >
                    Quarantine File
                  </Button>
                )}
                {aiAnalysis.verdict?.toLowerCase().includes("malicious") && (
                  <Button
                    className="rounded-none border border-black bg-red-600 text-xs font-black text-white uppercase hover:bg-red-700"
                    onClick={() => {
                      handleQuarantine(aiAnalysis.file);
                      setAiAnalysis(null);
                    }}
                  >
                    Quarantine File
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scan Report Preview Modal (v2.9.28.0) */}
      <ScanReportPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        previewHtml={previewHtml}
      />

      {/* Module 5 Consent Modal — shown before Full Sentinel Scan (active probes) */}
      <SentinelM5ConsentModal
        isOpen={showM5Consent}
        siteUrl={homeUrl || window.location.origin}
        onConsent={() => {
          setShowM5Consent(false);
          runSentinelFullScan(true);
        }}
        onCancel={() => setShowM5Consent(false)}
      />

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-msg"
        >
          <div className="bg-card shadow-premium border-border animate-in zoom-in-95 mx-4 w-full max-w-md rounded-3xl border p-8 duration-200">
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
          <div className="bg-card dark:bg-card shadow-premium border-border dark:border-border/20 animate-in zoom-in-95 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[2.5rem] border backdrop-blur-xl duration-500">
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
              <div className="bg-card dark:bg-secondary border-border dark:border-border/10 shadow-premium relative overflow-hidden rounded-[2rem] border p-10">
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
