/**
 * ScanCard — Unified trigger card for all scan types (v2.9.28.0)
 *
 * Handles:
 *  - Free-tier quota display for ai-audit (quota remaining from ScanReportConfig)
 *  - Loading spinner on trigger button
 *  - WCAG AA: aria-busy, aria-disabled, aria-label on all interactive elements
 *
 * v2.9.30.x — The Quick/Deep toggle on the Malware Scan card was removed.
 * It was a v2.9.28.x relic from before the 3-Scan Redesign (v2.9.29.0). Deep
 * mode now lives on its own dedicated `deep-malware` card with the async
 * pipeline. The legacy toggle was a no-op (parent coerced mode→quick) and
 * misled users into thinking they had triggered a Deep scan when they had not.
 *
 * v2.9.33.16 (Package E / T9 self-audit, 2026-08-13): the tier-based
 * "Pro-lock overlay" (dimmed content + Lock icon + "4 Pro-exclusive phases"
 * bullet list + upgrade CTA) was DELETED. Two-proof verified 100% dead: (1)
 * no caller anywhere in the tree ever passes `locked=true` (tree-wide grep,
 * zero hits), and (2) `scanType === "full-ai"` — the overlay's other trigger
 * condition — is never rendered by any ScanCard call site either (T4's
 * full-ai deletion). Both halves of `isProLocked`'s `||` were therefore
 * unconditionally false. This was a REAL WP.org compliance finding, not just
 * a cleanup: because `ScanCard.tsx` is a SHARED, non-aliased component (it
 * renders the legitimately-free "ai-audit"/"malware" cards too), this dead
 * branch's third-party-service-naming strings ("VPS Hash Database
 * (MalwareBazaar + URLhaus)", "WPScan Live CVE Lookup", "Patchstack Live CVE
 * Lookup") were compiling into the Free edition's JS bundle regardless of
 * `isProEditionBuild` — the exact violation class documented in
 * docs/architecture/FREEMIUM_DUAL_BUILD_ARCHITECTURE.md's 2026-08-12
 * frontend physical-exclusion amendment, found here via this session's own
 * B12a compiled-JS fingerprint scan (T8.7) against a freshly built Free zip.
 * Deleting genuinely-dead code closes it at the source — no alias needed.
 */

import React from "react";
import { ShieldCheck, Bug, Sparkles } from "lucide-react";
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
}

// ── Component ─────────────────────────────────────────────────────────────────

export const ScanCard: React.FC<ScanCardProps> = ({
  scanType,
  tier: _tier,
  onTrigger,
  isLoading,
  result,
  config: _config,
  loadingMessage,
}) => {
  const Icon = SCAN_ICONS[scanType];
  const label = SCAN_LABELS[scanType];
  const description = SCAN_DESCRIPTIONS[scanType];

  const handleTrigger = () => {
    if (isLoading) return;
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

  // ── Normal card ─────────────────────────────────────────────────────────────
  // (The "Pro-lock overlay" branch that used to sit here was DELETED —
  // v2.9.33.16, see the file's own docblock for the two-proof verification
  // and the WP.org compliance finding its deletion closes.)

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
