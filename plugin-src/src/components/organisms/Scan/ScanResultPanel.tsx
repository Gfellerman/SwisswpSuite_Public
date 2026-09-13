/**
 * ScanResultPanel — Deep-malware scan result renderer (v2.9.28.0)
 *
 * This build's Scan tab has one card — deep-malware — so this renders its
 * MalwareScanResult shape only. Handles three display states:
 *   1. Loading — indeterminate progress bar
 *   2. Result available — threat list
 *   3. No result — returns null (nothing rendered)
 *
 * ARIA:
 *  - Loading state: role="progressbar" + aria-label + aria-valuenow={undefined}
 *  - Result container: role="region" + aria-label
 *  - Findings list: role="list"
 */

import React, { useState } from "react";
import {
  AlertTriangle,
  Info,
  CheckCircle2,
  Bug,
  Shield,
  ExternalLink,
  Loader2,
  ChevronDown,
  ChevronUp,
  ShieldOff,
} from "lucide-react";
import { toast } from "../../../lib/toast";
import type { MalwareScanResult } from "../../../types";
import type { ScanTypeValue } from "./scanConstants";
import {
  buildScanPhasePills,
  scanFindingActions,
  scanResultBadges,
  scanResultNotices,
  scanSelectionActions,
} from "./scanResultExtras";

// ── Loading bar ───────────────────────────────────────────────────────────────

const LoadingBar: React.FC = () => (
  /*
    WCAG 4.1.2: role="status" removed from the outer container.
    Having both role="status" on the container AND role="progressbar" on the inner div
    created two AT-accessible elements with the same label "Scan in progress", causing
    NVDA to double-announce. The progressbar is the correct semantic element for this
    loading indicator. The container has no live region role — it is a layout wrapper only.
  */
  <div className="bg-card border-border flex flex-col gap-4 rounded-2xl border p-6">
    <div className="flex items-center gap-3">
      <Loader2
        size={18}
        className="text-swiss-navy shrink-0 animate-spin"
        aria-hidden="true"
      />
      <p className="text-swiss-navy text-sm font-black tracking-tight uppercase">
        Scanning…
      </p>
    </div>
    {/*
      WCAG 4.1.2: Indeterminate progressbar per WAI-ARIA spec.
      aria-valuenow intentionally absent — its absence signals indeterminate state to AT.
      aria-valuemin={0} and aria-valuemax={100} are required even for indeterminate bars
      so AT can compute the value range when valuenow is later provided.
      aria-label is the only label here (no labelledby anchor), which is valid for
      a non-interactive widget without a visible heading.
    */}
    <div
      role="progressbar"
      aria-label="Scan in progress"
      aria-valuemin={0}
      aria-valuemax={100}
      className="bg-secondary h-2 w-full overflow-hidden rounded-full"
    >
      <div className="bg-swiss-navy/70 h-full w-1/3 animate-pulse rounded-full" />
    </div>
    <p className="text-xs font-medium text-neutral-500">
      This may take up to a minute. Please wait…
    </p>
  </div>
);

// ── Malware result ────────────────────────────────────────────────────────────

interface MalwareResultViewProps {
  result: MalwareScanResult;
  onViewHistory?: () => void;
  /**
   * v2.9.28.04 — "Mark as Safe" handler invoked when the user whitelists a finding.
   * Receives the ABSPATH-relative file path. The parent is responsible for calling
   * POST /security/ignore and then removing the threat from the local state so the
   * UI reflects the change immediately.
   */
  onMarkSafe?: (relativePath: string) => Promise<void> | void;
  /**
   * v2.9.28.11 — Batch action handler. Malware threats expose `.file` rather
   * than `.evidence`, but the list of paths passed to onBulkAction is the
   * same shape as the security-audit path's.
   */
  onBulkAction?: (
    action: "ignore" | "quarantine" | "delete",
    pathList: string[]
  ) => Promise<void> | void;
  /**
   * v2.9.28.14 — Per-threat "Analyze with AI" handler (regression restore from v2.9.27.94).
   * When provided, each actionable threat row renders an "Analyze" button that
   * invokes onAnalyze(threat.file). Parent owns the analysis request + dialog.
   */
  onAnalyze?: (filepath: string, options?: { bulk?: boolean }) => void;
  /** v2.9.28.14 — File path currently being analyzed (drives per-row spinner). */
  analyzingFile?: string | null;
}

const MalwareResultView: React.FC<MalwareResultViewProps> = ({
  result,
  onViewHistory,
  onMarkSafe,
  onBulkAction,
  onAnalyze,
  analyzingFile,
}) => {
  const hasThreats = (result.threats_found ?? 0) > 0;
  const resultRecord = result as unknown as Record<string, unknown>;
  const phasePills = buildScanPhasePills(resultRecord);
  // Local "in-flight" state per-threat so the Mark-as-Safe button can disable and
  // display a spinner while the POST is pending. Keyed by threat file path + index
  // (threats of the same file are unlikely but the index keeps collisions safe).
  const [pendingSafe, setPendingSafe] = useState<Record<string, boolean>>({});

  // v2.9.28.11 — Bulk selection state.
  // Actionable (medium+) threats: primary bulk UI.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggleOneThreat = (file: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(file)) next.delete(file);
      else next.add(file);
      return next;
    });
  };

  // v2.9.28.13 — Separate bulk selection state for low-risk (info/low) threats.
  // Keeping a distinct Set prevents the two sections from stepping on each other
  // and makes the "Select all" in each bar behave intuitively.
  const [selectedLow, setSelectedLow] = useState<Set<string>>(new Set());
  const toggleOneLowThreat = (file: string) => {
    setSelectedLow((prev) => {
      const next = new Set(prev);
      if (next.has(file)) next.delete(file);
      else next.add(file);
      return next;
    });
  };
  // v2.9.28.08: Collapsible "low-risk findings" section. Default collapsed so
  // a clean site (0 actionable threats + N info/low items) shows the green
  // "all clear" state prominently rather than a wall of noise.
  const [showLowRisk, setShowLowRisk] = useState(false);

  // v2.9.28.08: Split threats into actionable (medium+) vs low-risk (info/low).
  // Backend (class-swisswpsuite-scan-orchestrator.php) now assigns severity by
  // category and only counts medium/high/critical in threats_found — but the
  // full list is still returned so the detail view can show low-risk items
  // in a separate, collapsible section.
  const allThreats = result.threats ?? [];
  const actionableThreats = allThreats.filter(
    (t) =>
      t.severity === "medium" ||
      t.severity === "high" ||
      t.severity === "critical"
  );
  const lowRiskThreats = allThreats.filter(
    (t) => t.severity === "info" || t.severity === "low"
  );
  const hasLowRisk = lowRiskThreats.length > 0;

  const handleMarkSafe = async (key: string, relativePath: string) => {
    if (!onMarkSafe) return;
    setPendingSafe((prev) => ({ ...prev, [key]: true }));
    try {
      await onMarkSafe(relativePath);
    } finally {
      setPendingSafe((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  return (
    <div
      role="region"
      aria-label="Malware scan result"
      className="bg-card border-border flex flex-col gap-5 rounded-2xl border p-6"
    >
      {/* Summary counts */}
      <div className="flex flex-wrap gap-3">
        <div className="bg-secondary border-border flex items-center gap-2 rounded-xl border px-4 py-2.5">
          <Shield size={14} className="text-neutral-500" aria-hidden="true" />
          <span className="text-xs font-black text-neutral-700">
            {(result.files_scanned ?? 0).toLocaleString()} files scanned
          </span>
        </div>
        <div
          className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 ${
            hasThreats
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {hasThreats ? (
            <AlertTriangle size={14} aria-hidden="true" />
          ) : (
            <CheckCircle2 size={14} aria-hidden="true" />
          )}
          <span className="text-xs font-black">
            {result.threats_found ?? 0} threat
            {(result.threats_found ?? 0) !== 1 ? "s" : ""} found
          </span>
        </div>
        <div className="bg-secondary border-border flex items-center gap-2 rounded-xl border px-3 py-2.5">
          <span className="text-xs font-medium text-neutral-500">
            Mode:{" "}
            <span className="font-black text-neutral-700 uppercase">
              {result.mode}
            </span>
          </span>
        </div>
        {scanResultBadges.map((Badge, i) => (
          <Badge key={i} result={resultRecord} />
        ))}
      </div>

      {/* One pill per phase the scan ran. Each phase soft-degrades:
          ok = phase ran cleanly, unavailable = phase produced nothing,
          degraded_* = phase ran but with reduced output. */}
      {phasePills.length > 0 && (
        <div
          className="flex flex-wrap gap-2"
          role="list"
          aria-label="Deep scan phase status"
        >
          {phasePills.map((p) => {
            const isOk = p.value === "ok";
            const isDegraded =
              typeof p.value === "string" &&
              (p.value.startsWith("degraded") || p.value === "rate_limited");
            const cls = isOk
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : isDegraded
                ? "bg-amber-50 border-amber-200 text-amber-800"
                : "bg-secondary border-border text-neutral-600";
            return (
              <span
                key={p.label}
                role="listitem"
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black tracking-[0.08em] uppercase ${cls}`}
              >
                {p.label}: {p.value}
              </span>
            );
          })}
        </div>
      )}

      {scanResultNotices.map((Notice, i) => (
        <Notice key={i} result={resultRecord} />
      ))}

      {/* Detection sources that contributed to this scan's findings. */}
      {result.sources && result.sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black tracking-[0.08em] text-neutral-500 uppercase">
            Sources:
          </span>
          {result.sources.map((src) => (
            <span
              key={src}
              className="bg-secondary border-border inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black tracking-[0.08em] text-neutral-700 uppercase"
            >
              {src}
            </span>
          ))}
        </div>
      )}

      {/* Actionable threat list (medium+ severity only) */}
      {hasThreats && actionableThreats.length > 0 && (
        <div>
          <h4 className="mb-3 text-xs font-black tracking-[0.08em] text-neutral-500 uppercase">
            Threats detected
          </h4>

          {/* v2.9.28.11 — Batch-action bar for malware. */}
          {onBulkAction && (
            <div className="bg-secondary border-border mb-3 flex items-center justify-between gap-3 rounded-xl border p-2">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-black tracking-[0.08em] text-neutral-700 uppercase select-none">
                <input
                  type="checkbox"
                  checked={
                    selected.size > 0 &&
                    selected.size === actionableThreats.length
                  }
                  onChange={() => {
                    if (selected.size === actionableThreats.length)
                      setSelected(new Set());
                    else
                      setSelected(
                        new Set(actionableThreats.map((t) => t.file))
                      );
                  }}
                  aria-label={
                    selected.size === actionableThreats.length
                      ? "Deselect all threats"
                      : "Select all threats"
                  }
                  className="border-border focus-visible:ring-swiss-navy h-4 w-4 rounded focus-visible:ring-2"
                />
                {selected.size > 0
                  ? `${selected.size} of ${actionableThreats.length} selected`
                  : `Select all (${actionableThreats.length})`}
              </label>

              {selected.size > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const list = [...selected];
                      Promise.resolve(onBulkAction("ignore", list)).then(() =>
                        setSelected(new Set())
                      );
                    }}
                    className="bg-secondary text-swiss-navy border-border hover:bg-muted focus-visible:ring-swiss-navy inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black tracking-[0.08em] uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    Mark {selected.size} Safe
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const list = [...selected];
                      Promise.resolve(onBulkAction("quarantine", list)).then(
                        () => setSelected(new Set())
                      );
                    }}
                    className="focus-visible:ring-swiss-navy inline-flex items-center gap-1 rounded-full bg-amber-600 px-2.5 py-1 text-[10px] font-black tracking-[0.08em] text-white uppercase transition-colors hover:bg-amber-700 focus-visible:ring-2 focus-visible:outline-none"
                  >
                    Quarantine {selected.size}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const list = [...selected];
                      Promise.resolve(onBulkAction("delete", list)).then(() =>
                        setSelected(new Set())
                      );
                    }}
                    className="focus-visible:ring-swiss-navy inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-black tracking-[0.08em] text-white uppercase transition-colors hover:bg-red-700 focus-visible:ring-2 focus-visible:outline-none"
                  >
                    Delete {selected.size}
                  </button>
                  {onAnalyze &&
                    scanSelectionActions.map((Action, i) => (
                      <Action
                        key={i}
                        selected={[...selected]}
                        onInspect={onAnalyze}
                        onClearSelection={() => setSelected(new Set())}
                      />
                    ))}
                </div>
              )}
            </div>
          )}

          <ul role="list" className="space-y-2" aria-label="Detected threats">
            {actionableThreats.map((threat, idx) => {
              const key = `${threat.file}|${idx}`;
              const isPending = !!pendingSafe[key];
              return (
                <li
                  key={idx}
                  className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3"
                >
                  {/* v2.9.28.11 — Per-threat checkbox. */}
                  {onBulkAction && (
                    <input
                      type="checkbox"
                      checked={selected.has(threat.file)}
                      onChange={() => toggleOneThreat(threat.file)}
                      aria-label={`Select threat: ${threat.file}`}
                      className="border-border focus-visible:ring-swiss-navy mt-0.5 h-4 w-4 shrink-0 rounded focus-visible:ring-2"
                    />
                  )}
                  <Bug
                    size={14}
                    className="mt-0.5 shrink-0 text-red-500"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black break-all text-red-800">
                      {threat.file}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-red-600">
                      {threat.type}
                      {threat.severity ? ` — ${threat.severity}` : ""}
                    </p>
                    {/* LiveQA Fix Sprint 2026-08-04 (§1.4 root cause 4): every
                        raw/free finding now carries a plain-English "why this
                        matched, and whether that alone means danger"
                        explanation — shown here unconditionally, not gated
                        behind the paid "Analyze with AI" action. */}
                    {threat.explanation && (
                      <p className="mt-1 text-[11px] leading-snug font-medium text-red-500">
                        {threat.explanation}
                      </p>
                    )}
                  </div>
                  {/*
                    v2.9.28.04 (Issue 4): Mark-as-Safe control.
                    Reuses the existing POST /security/ignore endpoint which writes
                    to swisswpsuite_security_ignored_paths. Both perform_core_scan()
                    (Quick mode) and SwissWPSuite_Security_Scanner::is_safe_folder()
                    (Deep mode) already consult that option, so a whitelisted file
                    will be skipped by every future scan — no new storage required.
                    Button is only rendered when the parent provided onMarkSafe.
                    WCAG 4.1.2: aria-label describes the action target explicitly.
                  */}
                  {onMarkSafe && (
                    <button
                      type="button"
                      onClick={() => handleMarkSafe(key, threat.file)}
                      disabled={isPending}
                      aria-busy={isPending}
                      aria-label={`Mark ${threat.file} as safe and exclude from future scans`}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-red-300 bg-white px-2.5 py-1 text-[10px] font-black tracking-[0.08em] text-red-700 uppercase transition-colors hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      title="Exclude this file from future malware scans"
                    >
                      {isPending ? (
                        <Loader2
                          size={10}
                          className="animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <ShieldOff size={10} aria-hidden="true" />
                      )}
                      {isPending ? "Marking…" : "Mark Safe"}
                    </button>
                  )}
                  {onAnalyze &&
                    scanFindingActions.map((Action, i) => (
                      <Action
                        key={i}
                        file={threat.file}
                        isInspecting={analyzingFile === threat.file}
                        onInspect={onAnalyze}
                      />
                    ))}
                </li>
              );
            })}
          </ul>
          {onMarkSafe && (
            <p className="mt-2 text-[11px] leading-snug font-medium text-neutral-500">
              Mark Safe adds the file to your ignore list so future scans skip
              it. You can review or remove entries later under Security Hub &gt;
              Ignore Paths.
            </p>
          )}
        </div>
      )}

      {!hasThreats && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <CheckCircle2
            size={16}
            className="shrink-0 text-emerald-600"
            aria-hidden="true"
          />
          <span className="text-xs font-black text-emerald-700">
            No malware detected. Your files look clean.
          </span>
        </div>
      )}

      {/*
        v2.9.28.08: Info banner + collapsible low-risk findings.
        Only renders when the scan returned info/low severity items. Explains
        to the user why the headline threat count is 0 despite N files being
        listed. Uses the plugin's standard info-banner pattern (bg-blue-50 +
        border-blue-100 + text-blue-700) — no hardcoded hex, no text-foreground
        on a light background. Icon is aria-hidden (decorative).
        NOTE: Quick Scan is local checksum + regex only — no AI is involved.
      */}
      {hasLowRisk && (
        <>
          <div
            role="note"
            className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50 p-3"
          >
            <Info
              size={12}
              className="mt-0.5 shrink-0 text-blue-700"
              aria-hidden="true"
            />
            <p className="text-xs leading-relaxed font-medium text-blue-700">
              Quick Scan compares your files against the official WordPress
              baseline. Bundled plugins and theme edits are expected deviations
              — they are flagged for visibility but not counted as threats. Only
              modified core files or suspicious patterns are actionable.
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowLowRisk((prev) => !prev)}
              aria-expanded={showLowRisk}
              aria-controls="low-risk-findings-list"
              className="bg-secondary hover:bg-secondary/70 border-border focus-visible:ring-swiss-navy flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <span className="text-xs font-black tracking-[0.08em] text-neutral-700 uppercase">
                {lowRiskThreats.length} low-risk finding
                {lowRiskThreats.length !== 1 ? "s" : ""} (not counted as
                threats)
              </span>
              {showLowRisk ? (
                <ChevronUp
                  size={14}
                  className="shrink-0 text-neutral-500"
                  aria-hidden="true"
                />
              ) : (
                <ChevronDown
                  size={14}
                  className="shrink-0 text-neutral-500"
                  aria-hidden="true"
                />
              )}
            </button>

            {showLowRisk && (
              <div id="low-risk-findings-list">
                {/*
                  v2.9.28.13 — Bulk-action bar for LOW-RISK findings.
                  On clean sites the "actionable threats" block is empty, so the
                  primary bulk bar never rendered. Users reported they could not
                  bulk-ignore low-risk deviations. This bar exposes Mark Safe /
                  Quarantine / Delete for the low-risk section independently,
                  with its own selection state (selectedLow).
                */}
                {onBulkAction && lowRiskThreats.length > 0 && (
                  <div className="bg-secondary border-border mt-2 mb-2 flex items-center justify-between gap-3 rounded-xl border p-2">
                    <label className="flex cursor-pointer items-center gap-2 text-xs font-black tracking-[0.08em] text-neutral-700 uppercase select-none">
                      <input
                        type="checkbox"
                        checked={
                          selectedLow.size > 0 &&
                          selectedLow.size === lowRiskThreats.length
                        }
                        onChange={() => {
                          if (selectedLow.size === lowRiskThreats.length)
                            setSelectedLow(new Set());
                          else
                            setSelectedLow(
                              new Set(lowRiskThreats.map((t) => t.file))
                            );
                        }}
                        aria-label={
                          selectedLow.size === lowRiskThreats.length
                            ? "Deselect all low-risk findings"
                            : "Select all low-risk findings"
                        }
                        className="border-border focus-visible:ring-swiss-navy h-4 w-4 rounded focus-visible:ring-2"
                      />
                      {selectedLow.size > 0
                        ? `${selectedLow.size} of ${lowRiskThreats.length} selected`
                        : `Select all (${lowRiskThreats.length})`}
                    </label>

                    {selectedLow.size > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const list = [...selectedLow];
                            Promise.resolve(onBulkAction("ignore", list)).then(
                              () => setSelectedLow(new Set())
                            );
                          }}
                          className="bg-secondary text-swiss-navy border-border hover:bg-muted focus-visible:ring-swiss-navy inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black tracking-[0.08em] uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none"
                        >
                          Mark {selectedLow.size} Safe
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const list = [...selectedLow];
                            Promise.resolve(
                              onBulkAction("quarantine", list)
                            ).then(() => setSelectedLow(new Set()));
                          }}
                          className="focus-visible:ring-swiss-navy inline-flex items-center gap-1 rounded-full bg-amber-600 px-2.5 py-1 text-[10px] font-black tracking-[0.08em] text-white uppercase transition-colors hover:bg-amber-700 focus-visible:ring-2 focus-visible:outline-none"
                        >
                          Quarantine {selectedLow.size}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const list = [...selectedLow];
                            Promise.resolve(onBulkAction("delete", list)).then(
                              () => setSelectedLow(new Set())
                            );
                          }}
                          className="focus-visible:ring-swiss-navy inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-black tracking-[0.08em] text-white uppercase transition-colors hover:bg-red-700 focus-visible:ring-2 focus-visible:outline-none"
                        >
                          Delete {selectedLow.size}
                        </button>
                        {onAnalyze &&
                          scanSelectionActions.map((Action, i) => (
                            <Action
                              key={i}
                              selected={[...selectedLow]}
                              onInspect={onAnalyze}
                              onClearSelection={() => setSelectedLow(new Set())}
                            />
                          ))}
                      </div>
                    )}
                  </div>
                )}

                <ul
                  role="list"
                  className="space-y-2"
                  aria-label="Low-risk findings not counted as threats"
                >
                  {lowRiskThreats.map((threat, idx) => {
                    const key = `lowrisk|${threat.file}|${idx}`;
                    const isPending = !!pendingSafe[key];
                    return (
                      <li
                        key={idx}
                        className="bg-secondary border-border flex items-start gap-2.5 rounded-xl border p-3"
                      >
                        {/* v2.9.28.13 — Per-row checkbox for low-risk findings. */}
                        {onBulkAction && (
                          <input
                            type="checkbox"
                            checked={selectedLow.has(threat.file)}
                            onChange={() => toggleOneLowThreat(threat.file)}
                            aria-label={`Select low-risk finding: ${threat.file}`}
                            className="border-border focus-visible:ring-swiss-navy mt-0.5 h-4 w-4 shrink-0 rounded focus-visible:ring-2"
                          />
                        )}
                        <Info
                          size={12}
                          className="mt-0.5 shrink-0 text-blue-700"
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black break-all text-neutral-700">
                            {threat.file}
                          </p>
                          <p className="mt-0.5 text-xs font-medium text-neutral-500">
                            {threat.type}
                            {threat.severity ? ` — ${threat.severity}` : ""}
                          </p>
                        </div>
                        {onMarkSafe && (
                          <button
                            type="button"
                            onClick={() => handleMarkSafe(key, threat.file)}
                            disabled={isPending}
                            aria-busy={isPending}
                            aria-label={`Mark ${threat.file} as safe and exclude from future scans`}
                            className="border-border hover:bg-secondary focus-visible:ring-swiss-navy inline-flex shrink-0 items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-[10px] font-black tracking-[0.08em] text-neutral-600 uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                            title="Exclude this file from future malware scans"
                          >
                            {isPending ? (
                              <Loader2
                                size={10}
                                className="animate-spin"
                                aria-hidden="true"
                              />
                            ) : (
                              <ShieldOff size={10} aria-hidden="true" />
                            )}
                            {isPending ? "Marking…" : "Ignore"}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-neutral-400">
          Scanned {new Date(result.scanned_at).toLocaleDateString()}
        </p>
        {onViewHistory && (
          <button
            type="button"
            onClick={onViewHistory}
            className="text-swiss-navy hover:text-swiss-navy/70 focus-visible:ring-swiss-navy inline-flex shrink-0 items-center gap-1.5 rounded text-xs font-black underline underline-offset-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
            aria-label="View this scan in the History tab"
          >
            View in History
            <ExternalLink size={11} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface ScanResultPanelProps {
  scanType: ScanTypeValue;
  result: MalwareScanResult | null | undefined;
  isLoading: boolean;
  onViewHistory?: () => void;
  /** Called when the user clicks "Mark Safe" on a finding. Receives the file path. */
  onMarkSafe?: (relativePath: string) => Promise<void> | void;
  /**
   * v2.9.28.11 — Batch action handler (restored from v2.9.27.71).
   * When provided, ScanResultPanel renders a select-all checkbox + per-row
   * checkboxes + a batch-action bar with Mark Safe / Quarantine / Delete buttons.
   * Parent (SecurityHub) calls /security/bulk and updates the scan result state.
   */
  onBulkAction?: (
    action: "ignore" | "quarantine" | "delete",
    fileList: string[]
  ) => Promise<void> | void;
  /**
   * Hand one file to the page for inspection. Wired to whichever control a
   * finding row or a selection offers.
   */
  onAnalyze?: (filepath: string, options?: { bulk?: boolean }) => void;
  /** File path currently being inspected (drives the per-row spinner). */
  analyzingFile?: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const ScanResultPanel: React.FC<ScanResultPanelProps> = ({
  result,
  isLoading,
  onViewHistory,
  onMarkSafe,
  onBulkAction,
  onAnalyze,
  analyzingFile,
}) => {
  if (isLoading) {
    return <LoadingBar />;
  }

  if (!result) {
    return null;
  }

  return (
    <MalwareResultView
      result={result}
      onViewHistory={onViewHistory}
      onMarkSafe={onMarkSafe}
      onBulkAction={onBulkAction}
      onAnalyze={onAnalyze}
      analyzingFile={analyzingFile}
    />
  );
};

export default ScanResultPanel;
