/**
 * useScanStore — Zustand slice for Security Hub scan state
 * =============================================================================
 * Introduced in v2.9.28.43 (F-004 sprint) as the first Zustand store in the
 * codebase. Prepares the ground for a future ScanTabPanel extraction, which
 * currently needs ~23 props drilled from SecurityHub.tsx. Centralising scan
 * state here lets that extraction pull most of its state via `useScanStore`
 * selectors instead of props.
 *
 * Scope (WHY these fields):
 * - The fields below are exactly the scan-related pieces of state currently
 *   useState'd inside SecurityHub.tsx and consumed by ScanCard,
 *   ScanResultPanel, ScanCronStatusBanner, and the historical scan panel.
 * - Other scan-adjacent state (hardeningOptions, bannedIps, quarantinedFiles,
 *   etc.) belongs to different panels and is NOT in this store. Keep the store
 *   cohesive — if a field is only used by one tab, it stays as local useState.
 *
 * v2.9.29.0 (3-Scan Redesign Phase 4):
 *   The Full AI Scan (sync + async) is being collapsed into the new Deep
 *   Malware Scan async pipeline. The fullAi* fields are kept for one release
 *   as @deprecated so any in-flight UI does not crash mid-deploy. The new
 *   deepMalware* fields drive the third scan card.
 *
 * Usage:
 *   const { aiAuditResult, setAiAuditResult } = useScanStore();
 *   // Or with a selector for re-render control:
 *   const aiAuditResult = useScanStore((s) => s.aiAuditResult);
 *
 * Non-goals (this store intentionally does NOT own):
 * - Scan-triggering side effects (remain in SecurityHub callbacks)
 * - TanStack Query cache (scan data is imperative / on-demand)
 * - Persistence to localStorage (scan state is per-session; history lives on
 *   the server)
 */
import { create } from "zustand";
import type {
  AiAuditResult,
  MalwareScanResult,
  FullAiScanResult,
  ScanReportConfig,
  ScanHistoryDetail,
} from "../types";

/**
 * v2.9.29.0 — Lifecycle status for the new Deep Malware Scan polling flow.
 * `idle` before a scan is started; `running` while polling; `complete` once
 * the pipeline yields a final result; `error` on any pipeline-reported
 * failure (network or otherwise).
 */
export type DeepMalwareStatus = "idle" | "running" | "complete" | "error";

export interface ScanState {
  // ── Scan results ──────────────────────────────────────────────────────────
  aiAuditResult: AiAuditResult | null;
  malwareResult: MalwareScanResult | null;
  /** @deprecated v2.9.29.0 — Use deepMalwareResult. Kept for one release while
   *  the Full AI Scan UI is migrated to the Deep Malware Scan pipeline. */
  fullAiResult: FullAiScanResult | null;

  // ── Scan loading flags ────────────────────────────────────────────────────
  aiAuditLoading: boolean;
  malwareLoading: boolean;
  /** @deprecated v2.9.29.0 — Use deepMalwareStatus === 'running'. */
  fullAiLoading: boolean;

  /**
   * @deprecated v2.9.29.0 — Phase-aware progress message for the legacy Full
   * AI Scan two-phase state machine. Replaced by the deepMalwarePhase label
   * dictionary below.
   */
  fullAiPhaseMessage: string;

  // ── Per-file AI-analyze-in-flight marker (one file at a time) ────────────
  analyzingFile: string | null;

  // ── Report scheduling config (cron tier, frequency, last scan stamp) ─────
  scanReportConfig: ScanReportConfig | null;

  // ── Historical scan detail opened via History tab VIEW button ────────────
  historicalScanDetail: ScanHistoryDetail | null;

  // ── v2.9.29.0 — Deep Malware Scan async pipeline state ───────────────────
  /** Current job UUID — non-null while polling. Null on idle / complete / error. */
  deepMalwareJobId: string | null;
  /**
   * Current pipeline phase identifier. Translated to a human-readable label
   * inside SecurityHub for the ScanCard's loading message. Null on idle.
   */
  deepMalwarePhase: string | null;
  /** Lifecycle status — drives the ScanCard's loading/result rendering. */
  deepMalwareStatus: DeepMalwareStatus;
  /** Final result, populated on phase=complete and status=complete. */
  deepMalwareResult: MalwareScanResult | null;

  // ── Setters (named to match the useState names they replace) ─────────────
  setAiAuditResult: (value: AiAuditResult | null) => void;
  setMalwareResult: (value: MalwareScanResult | null) => void;
  /** @deprecated — see fullAiResult JSDoc. */
  setFullAiResult: (value: FullAiScanResult | null) => void;
  setAiAuditLoading: (value: boolean) => void;
  setMalwareLoading: (value: boolean) => void;
  /** @deprecated — see fullAiLoading JSDoc. */
  setFullAiLoading: (value: boolean) => void;
  /** @deprecated — see fullAiPhaseMessage JSDoc. */
  setFullAiPhaseMessage: (value: string) => void;
  setAnalyzingFile: (value: string | null) => void;
  setScanReportConfig: (value: ScanReportConfig | null) => void;
  setHistoricalScanDetail: (value: ScanHistoryDetail | null) => void;

  // ── Deep Malware Scan setters (v2.9.29.0) ────────────────────────────────
  setDeepMalwareJobId: (value: string | null) => void;
  setDeepMalwarePhase: (value: string | null) => void;
  setDeepMalwareStatus: (value: DeepMalwareStatus) => void;
  setDeepMalwareResult: (value: MalwareScanResult | null) => void;

  /**
   * Functional-update variants — required where a setter is currently called
   * with a `(prev) => next` callback. Today SecurityHub.tsx uses these for
   * `setFullAiResult` and `setMalwareResult` when optimistically removing
   * findings after the user acts on them. Zustand does not auto-promote a
   * plain value setter into a functional one — so we expose explicit helpers.
   */
  updateAiAuditResult: (
    updater: (prev: AiAuditResult | null) => AiAuditResult | null,
  ) => void;
  updateMalwareResult: (
    updater: (prev: MalwareScanResult | null) => MalwareScanResult | null,
  ) => void;
  /** @deprecated — see fullAiResult JSDoc. */
  updateFullAiResult: (
    updater: (prev: FullAiScanResult | null) => FullAiScanResult | null,
  ) => void;
  /** Functional update for the deep-malware result (mirrors malwareResult). */
  updateDeepMalwareResult: (
    updater: (prev: MalwareScanResult | null) => MalwareScanResult | null,
  ) => void;

  /** Clear all scan state — useful on logout or license downgrade. */
  resetScanState: () => void;
}

const initialState: Pick<
  ScanState,
  | "aiAuditResult"
  | "malwareResult"
  | "fullAiResult"
  | "aiAuditLoading"
  | "malwareLoading"
  | "fullAiLoading"
  | "fullAiPhaseMessage"
  | "analyzingFile"
  | "scanReportConfig"
  | "historicalScanDetail"
  | "deepMalwareJobId"
  | "deepMalwarePhase"
  | "deepMalwareStatus"
  | "deepMalwareResult"
> = {
  aiAuditResult: null,
  malwareResult: null,
  fullAiResult: null,
  aiAuditLoading: false,
  malwareLoading: false,
  fullAiLoading: false,
  fullAiPhaseMessage: "",
  analyzingFile: null,
  scanReportConfig: null,
  historicalScanDetail: null,
  deepMalwareJobId: null,
  deepMalwarePhase: null,
  deepMalwareStatus: "idle",
  deepMalwareResult: null,
};

export const useScanStore = create<ScanState>((set) => ({
  ...initialState,

  setAiAuditResult: (value) => set({ aiAuditResult: value }),
  setMalwareResult: (value) => set({ malwareResult: value }),
  setFullAiResult: (value) => set({ fullAiResult: value }),
  setAiAuditLoading: (value) => set({ aiAuditLoading: value }),
  setMalwareLoading: (value) => set({ malwareLoading: value }),
  setFullAiLoading: (value) => set({ fullAiLoading: value }),
  setFullAiPhaseMessage: (value) => set({ fullAiPhaseMessage: value }),
  setAnalyzingFile: (value) => set({ analyzingFile: value }),
  setScanReportConfig: (value) => set({ scanReportConfig: value }),
  setHistoricalScanDetail: (value) => set({ historicalScanDetail: value }),

  setDeepMalwareJobId: (value) => set({ deepMalwareJobId: value }),
  setDeepMalwarePhase: (value) => set({ deepMalwarePhase: value }),
  setDeepMalwareStatus: (value) => set({ deepMalwareStatus: value }),
  setDeepMalwareResult: (value) => set({ deepMalwareResult: value }),

  updateAiAuditResult: (updater) =>
    set((state) => ({ aiAuditResult: updater(state.aiAuditResult) })),
  updateMalwareResult: (updater) =>
    set((state) => ({ malwareResult: updater(state.malwareResult) })),
  updateFullAiResult: (updater) =>
    set((state) => ({ fullAiResult: updater(state.fullAiResult) })),
  updateDeepMalwareResult: (updater) =>
    set((state) => ({ deepMalwareResult: updater(state.deepMalwareResult) })),

  resetScanState: () => set(initialState),
}));
