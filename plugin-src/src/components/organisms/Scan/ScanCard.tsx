/**
 * ScanCard — Trigger card for the deep-malware scan (v2.9.28.0)
 *
 * Handles:
 *  - Loading spinner on trigger button
 *  - WCAG AA: aria-busy, aria-disabled, aria-label on all interactive elements
 *
 * v2.9.30.x — The Quick/Deep toggle on the Malware Scan card was removed.
 * It was a v2.9.28.x relic from before the 3-Scan Redesign (v2.9.29.0). Deep
 * mode now lives on its own dedicated `deep-malware` card with the async
 * pipeline. The legacy toggle was a no-op (parent coerced mode→quick) and
 * misled users into thinking they had triggered a Deep scan when they had not.
 *
 */

import React from "react";
import { Sparkles } from "lucide-react";
import type { MalwareScanResult, ScanReportConfig } from "../../../types";
import {
  SCAN_LABELS,
  SCAN_DESCRIPTIONS,
  type ScanTypeValue,
} from "./scanConstants";
import { Button } from "../../ui/Button";

// ── Icon map ──────────────────────────────────────────────────────────────────

const SCAN_ICONS: Record<ScanTypeValue, React.ElementType> = {
  "deep-malware": Sparkles,
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface ScanCardProps {
  scanType: ScanTypeValue;
  onTrigger: () => void;
  isLoading: boolean;
  result?: MalwareScanResult | null;
  /** Optional config — currently unused by this build's single card. */
  config?: ScanReportConfig | null;
  /**
   * Optional phase-aware label shown while the scan is running, replacing
   * the generic "Scanning…" button label.
   */
  loadingMessage?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const ScanCard: React.FC<ScanCardProps> = ({
  scanType,
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
    lastScanSummary = (
      // WCAG 1.4.3: text-neutral-500 on white is ~3.5:1 (FAIL) → text-neutral-600 is ~5.9:1 (PASS)
      <p className="mt-1 text-xs font-medium text-neutral-600">
        Last scan: {(result.files_scanned ?? 0).toLocaleString()} files
        checked,{" "}
        <span
          className={
            (result.threats_found ?? 0) > 0
              ? "font-black text-red-600"
              : "font-black text-emerald-600"
          }
        >
          {result.threats_found ?? 0} threat
          {(result.threats_found ?? 0) !== 1 ? "s" : ""} found
        </span>
      </p>
    );
  }

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
        (an async multi-phase pipeline). The legacy toggle was a no-op (parent
        silently coerced mode→quick because the old /scan/malware?mode=deep
        endpoint now returns 410 Gone).
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
