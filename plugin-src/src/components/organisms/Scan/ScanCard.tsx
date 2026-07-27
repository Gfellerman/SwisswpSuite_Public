/**
 * ScanCard — Unified trigger card for all scan types (v2.9.28.0)
 *
 * Handles:
 *  - Tier-based access gating (Pro-lock overlay for full-ai / deep-malware on free/none)
 *  - Free-tier quota display for ai-audit (quota remaining from ScanReportConfig)
 *  - Loading spinner on trigger button
 *  - WCAG AA: aria-busy, aria-disabled, aria-label on all interactive elements
 *
 * v2.9.30.x — The Quick/Deep toggle on the Malware Scan card was removed.
 * It was a v2.9.28.x relic from before the 3-Scan Redesign (v2.9.29.0). Deep
 * mode now lives on its own dedicated `deep-malware` card with the async
 * pipeline. The legacy toggle was a no-op (parent coerced mode→quick) and
 * misled users into thinking they had triggered a Deep scan when they had not.
 */

import React from "react";
import {
  ShieldCheck,
  Bug,
  Sparkles,
  Lock,
  ExternalLink,
  Database,
  Cpu,
  Search,
} from "lucide-react";
import type {
  AiAuditResult,
  MalwareScanResult,
  FullAiScanResult,
  ScanReportConfig,
} from "../../../types";
import {
  SCAN_LABELS,
  SCAN_DESCRIPTIONS,
  SCAN_TIER,
  type ScanTypeValue,
} from "./scanConstants";
import { Button } from "../../ui/Button";

// ── Tier badge ────────────────────────────────────────────────────────────────

interface TierBadgeProps {
  tier: "none" | "free" | "pro";
}

const TierBadge: React.FC<TierBadgeProps> = ({ tier }) => {
  const styles: Record<typeof tier, string> = {
    // WCAG 1.4.3: upgraded text colors to meet 4.5:1 threshold on their respective bg-* colors
    // text-yellow-700 on bg-yellow-50 was ~4.1:1 (FAIL) → text-yellow-800 is ~5.6:1 (PASS)
    // text-gray-600 on bg-gray-50 was ~4.2:1 (FAIL) → text-gray-700 is ~5.5:1 (PASS)
    // text-red-600 on bg-red-50 was ~4.3:1 (FAIL) → text-red-700 is ~5.1:1 (PASS)
    pro: "text-yellow-800 bg-yellow-50 border-yellow-200",
    free: "text-gray-700 bg-gray-50 border-gray-200",
    none: "text-red-700 bg-red-50 border-red-200",
  };
  const labels: Record<typeof tier, string> = {
    pro: "PRO",
    free: "FREE",
    none: "NO LICENSE",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-black tracking-[0.1em] uppercase ${styles[tier]}`}
    >
      {labels[tier]}
    </span>
  );
};

// ── Icon map ──────────────────────────────────────────────────────────────────

const SCAN_ICONS: Record<ScanTypeValue, React.ElementType> = {
  "ai-audit": ShieldCheck,
  malware: Bug,
  "full-ai": Sparkles,
  "deep-malware": Sparkles,
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface ScanCardProps {
  scanType: ScanTypeValue;
  /** The user's current license tier. */
  tier: "none" | "free" | "pro";
  onTrigger: () => void;
  isLoading: boolean;
  result?: AiAuditResult | MalwareScanResult | FullAiScanResult | null;
  /** Optional config — used to show ai-audit quota on the free tier. */
  config?: ScanReportConfig | null;
  /**
   * Optional phase-aware label shown while the scan is running. Replaces the
   * generic "Scanning…" button label. Used by the Full AI Scan two-phase state
   * machine (v2.9.28.25) to surface "Running security audit…" vs
   * "Sending to AI for analysis…".
   */
  loadingMessage?: string;
  /**
   * v2.9.30.x — Explicit capability lock that overrides tier-based gating.
   * When true, the card renders the locked overlay regardless of `tier`.
   * WP.org round-3 (2026-07-26): no longer used for deep-malware (its local
   * phases are free/functional in every edition — see isProLocked below);
   * kept generic for any future capability-based lock a caller may need.
   */
  locked?: boolean;
  /**
   * Custom heading shown in the lock overlay when `locked=true`.
   * Defaults to "Pro Required".
   */
  lockLabel?: string;
  /**
   * Custom body text shown in the lock overlay when `locked=true`.
   * Defaults to "{scanLabel} is available on the Pro plan."
   */
  lockDescription?: string;
  /**
   * Custom CTA link text shown in the lock overlay when `locked=true`.
   * Defaults to "Upgrade to Pro".
   */
  lockCtaText?: string;
  /**
   * Custom CTA href shown in the lock overlay when `locked=true`.
   * Defaults to "https://www.swisswpsecure.com/pricing".
   */
  lockCtaHref?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const ScanCard: React.FC<ScanCardProps> = ({
  scanType,
  tier,
  onTrigger,
  isLoading,
  result,
  config: _config,
  loadingMessage,
  locked = false,
  lockLabel,
  lockDescription,
  lockCtaText,
  lockCtaHref,
}) => {
  const Icon = SCAN_ICONS[scanType];
  const label = SCAN_LABELS[scanType];
  const description = SCAN_DESCRIPTIONS[scanType];

  // Pro-lock: full-ai requires Pro; gate on free/none tier.
  // `locked` prop overrides this — used when capability check (not tier) is the gate.
  //
  // WP.org round-3 (Sprint W2/T7, 2026-07-26): "deep-malware" REMOVED from
  // this tier-based auto-lock. Sprint W1 de-gated its local phases
  // (enumerate, hash, local scan) in the PHP — they run free for every
  // tier now, so the card must not show as locked just because
  // `tier !== "pro"`. deep-malware's lock state is controlled entirely by
  // the explicit `locked` prop now (SecurityHub.tsx no longer passes one,
  // so it defaults to unlocked). full-ai keeps the original behavior
  // unchanged (it is currently unreachable — no ScanCard call site renders
  // scanType="full-ai" — so this is a no-op in practice, kept for safety).
  const isProLocked = locked || (scanType === "full-ai" && tier !== "pro");

  // Resolve lock overlay copy — custom values take priority over defaults.
  const resolvedLockLabel = lockLabel ?? "Pro Required";
  const resolvedLockDescription =
    lockDescription ?? `${label} is available on the Pro plan.`;
  const resolvedLockCtaText = lockCtaText ?? "Upgrade to Pro";
  const resolvedLockCtaHref =
    lockCtaHref ?? "https://www.swisswpsecure.com/pricing";

  const handleTrigger = () => {
    if (isProLocked || isLoading) return;
    onTrigger();
  };

  // ── Last scan summary ───────────────────────────────────────────────────────

  let lastScanSummary: React.ReactNode = null;
  if (result && !isLoading) {
    // v2.9.29.0 — deep-malware returns the same MalwareScanResult shape as
    // the bounded malware scan, so they share the "files checked / threats
    // found" summary. ai-audit and full-ai return AiAuditResult-shaped data
    // with a letter grade.
    if (scanType === "malware" || scanType === "deep-malware") {
      const malwareResult = result as MalwareScanResult;
      lastScanSummary = (
        // WCAG 1.4.3: text-neutral-500 on white is ~3.5:1 (FAIL) → text-neutral-600 is ~5.9:1 (PASS)
        <p className="mt-1 text-xs font-medium text-neutral-600">
          Last scan: {(malwareResult.files_scanned ?? 0).toLocaleString()} files
          checked,{" "}
          <span
            className={
              (malwareResult.threats_found ?? 0) > 0
                ? "font-black text-red-600"
                : "font-black text-emerald-600"
            }
          >
            {malwareResult.threats_found ?? 0} threat
            {(malwareResult.threats_found ?? 0) !== 1 ? "s" : ""} found
          </span>
        </p>
      );
    } else {
      const auditResult = result as AiAuditResult | FullAiScanResult;
      const gradeColors: Record<string, string> = {
        A: "text-green-700",
        B: "text-blue-700",
        C: "text-amber-700",
        D: "text-red-700",
        F: "text-red-700",
      };
      lastScanSummary = (
        // WCAG 1.4.3: text-neutral-500 on white is ~3.5:1 (FAIL) → text-neutral-600 is ~5.9:1 (PASS)
        <p className="mt-1 text-xs font-medium text-neutral-600">
          Last grade:{" "}
          <span
            className={`font-black ${gradeColors[auditResult.grade] ?? "text-neutral-700"}`}
          >
            {auditResult.grade}
          </span>
        </p>
      );
    }
  }

  // ── Pro-lock overlay ────────────────────────────────────────────────────────

  if (isProLocked) {
    return (
      <div className="bg-card border-border relative flex flex-col gap-4 overflow-hidden rounded-2xl border p-6">
        {/* Dimmed content underneath */}
        <div
          className="pointer-events-none opacity-30 select-none"
          aria-hidden="true"
        >
          <div className="mb-3 flex items-center gap-3">
            <div className="bg-secondary rounded-xl p-2.5">
              <Icon size={20} className="text-neutral-400" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight text-neutral-800 uppercase">
                {label}
              </h3>
              <TierBadge tier="pro" />
            </div>
          </div>
          <p className="text-xs leading-relaxed text-neutral-500">
            {description}
          </p>
        </div>

        {/*
          WCAG 4.1.2: role="note" added so aria-label has a valid host element.
          A plain <div> with no role is not a labelable landmark — aria-label is
          silently ignored by AT on roleless divs. role="note" is the correct semantic
          role for supplementary/informational content (maps to <aside> semantics).
          This ensures AT users hear "Full AI Scan requires a Pro license" when they
          enter this region. The "Upgrade to Pro" link inside provides the CTA.
        */}
        <div
          role="note"
          className="bg-card/80 absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl p-6 backdrop-blur-sm"
          aria-label={`${label} — ${resolvedLockLabel}`}
        >
          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-3">
            <Lock size={22} className="text-yellow-600" aria-hidden="true" />
          </div>
          <div className="text-center">
            <p className="text-sm font-black tracking-tight text-neutral-800 uppercase">
              {resolvedLockLabel}
            </p>
            <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-neutral-600">
              {resolvedLockDescription}
            </p>
          </div>

          {/* 4 Pro-exclusive phases — shown for full-ai and deep-malware cards */}
          {(scanType === "full-ai" || scanType === "deep-malware") && (
            <ul
              className="w-full max-w-[260px] space-y-1.5"
              aria-label="Pro features unlocked"
            >
              <li className="flex items-center gap-2 text-xs font-medium text-neutral-700">
                <Database
                  size={12}
                  className="shrink-0 text-yellow-600"
                  aria-hidden="true"
                />
                VPS Hash Database (MalwareBazaar + URLhaus)
              </li>
              <li className="flex items-center gap-2 text-xs font-medium text-neutral-700">
                <Search
                  size={12}
                  className="shrink-0 text-yellow-600"
                  aria-hidden="true"
                />
                WPScan Live CVE Lookup
              </li>
              <li className="flex items-center gap-2 text-xs font-medium text-neutral-700">
                <Search
                  size={12}
                  className="shrink-0 text-yellow-600"
                  aria-hidden="true"
                />
                Patchstack Live CVE Lookup
              </li>
              <li className="flex items-center gap-2 text-xs font-medium text-neutral-700">
                <Cpu
                  size={12}
                  className="shrink-0 text-yellow-600"
                  aria-hidden="true"
                />
                AI Analysis — graded report A–F
              </li>
            </ul>
          )}

          <a
            href={resolvedLockCtaHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-yellow-200 bg-yellow-50 px-4 py-2 text-xs font-black tracking-[0.1em] text-yellow-700 uppercase transition-colors hover:bg-yellow-100 focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:outline-none"
          >
            {resolvedLockCtaText}
            <ExternalLink size={12} aria-hidden="true" />
          </a>
        </div>
      </div>
    );
  }

  // ── Normal card ─────────────────────────────────────────────────────────────

  return (
    <div className="bg-card border-border flex flex-col gap-4 rounded-2xl border p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-secondary shrink-0 rounded-xl p-2.5">
            <Icon size={20} className="text-swiss-navy" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-swiss-navy text-sm font-black tracking-tight uppercase">
              {label}
            </h3>
            <TierBadge tier={SCAN_TIER[scanType]} />
          </div>
        </div>
        {lastScanSummary && (
          <div className="shrink-0 text-right">{lastScanSummary}</div>
        )}
      </div>

      {/* Description */}
      <p className="text-xs leading-relaxed font-medium text-neutral-600">
        {description}
      </p>

      {/*
        v2.9.30.x — The Quick/Deep toggle was removed from the Malware Scan card.
        Deep scanning now lives on the dedicated Deep Malware Scan card below
        (async pipeline with VPS hash + WPScan + Patchstack + AI). The legacy
        toggle was a no-op (parent silently coerced mode→quick because the old
        /scan/malware?mode=deep endpoint now returns 410 Gone).
      */}

      {/*
        WCAG 4.1.2: disabled={isLoading} removed — native disabled removes the button
        from the tab order, so keyboard users cannot reach it to hear "in progress…".
        aria-disabled={isLoading} keeps it focusable and announces the disabled state
        to AT without removing it from the tab order. The no-op guard in handleTrigger
        (`if (isLoading) return`) prevents accidental double-triggers.
      */}
      <Button
        variant="primary"
        size="sm"
        loading={isLoading}
        onClick={handleTrigger}
        aria-disabled={isLoading}
        aria-busy={isLoading}
        aria-label={isLoading ? `${label} in progress…` : `Start ${label}`}
        className="mt-auto w-full"
      >
        {isLoading ? (loadingMessage ?? "Scanning…") : `Start ${label}`}
      </Button>
    </div>
  );
};

export default ScanCard;
