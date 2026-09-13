/**
 * ScanCronStatusBanner — Top-of-scan-tab status banner (v2.9.28.0)
 *
 * Shows:
 *  - Next scheduled scan time derived from config.next_scheduled_ts
 *  - Last scan grade badge (A/B/C/D/F, colored)
 *  - "Preview Email" button → opens ScanReportPreviewModal
 *  - "Settings" anchor → scrolls to ScanReportSettingsPanel
 *
 * ARIA: role="status" + aria-live="polite" so screen readers are notified
 * when the banner content refreshes after a scan completes.
 */

import React, { useMemo } from "react";
import { Calendar, Mail, Settings, Clock } from "lucide-react";
import type { ScanReportConfig } from "../../../types";

// ── Grade badge ───────────────────────────────────────────────────────────────

interface GradeBadgeProps {
  grade: string;
}

const GradeBadge: React.FC<GradeBadgeProps> = ({ grade }) => {
  const upper = grade.toUpperCase();
  const styles: Record<string, string> = {
    A: "bg-green-100 text-green-800 border-green-200",
    B: "bg-blue-100 text-blue-800 border-blue-200",
    C: "bg-amber-100 text-amber-800 border-amber-200",
    D: "bg-red-100 text-red-800 border-red-200",
    F: "bg-red-100 text-red-800 border-red-200",
  };

  return (
    <span
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm font-black ${styles[upper] ?? "bg-secondary border-border text-neutral-600"}`}
      aria-label={`Last scan grade: ${upper}`}
    >
      {/* WCAG 4.1.2: aria-hidden on visible text prevents VoiceOver double-announcement
          (it would otherwise read both the aria-label AND the text node). */}
      <span aria-hidden="true">{upper}</span>
    </span>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Format a Unix timestamp as a human-readable local date/time string.
 * Returns "—" when the value is null or in the past.
 */
function formatNextScheduled(ts: number | null): string {
  if (!ts) return "—";
  const date = new Date(ts * 1000);
  const now = Date.now();
  if (date.getTime() < now) return "Due soon";

  // Relative time for events within 48h
  const diffMs = date.getTime() - now;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) {
    const diffMin = Math.floor(diffMs / (1000 * 60));
    return `in ${diffMin} min${diffMin !== 1 ? "s" : ""}`;
  }
  if (diffHours < 48) {
    return `in ${diffHours} hour${diffHours !== 1 ? "s" : ""}`;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ScanCronStatusBannerProps {
  config: ScanReportConfig | null | undefined;
  /** Called when user clicks "Preview Email" — parent opens the preview modal. */
  onPreviewEmail: () => void;
  /** ID of the settings panel element for the scroll anchor. */
  settingsPanelId?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const ScanCronStatusBanner: React.FC<ScanCronStatusBannerProps> = ({
  config,
  onPreviewEmail,
  settingsPanelId = "scan-report-settings-panel",
}) => {
  const lastScan = config?.last_scan ?? null;

  const nextScheduledLabel = useMemo(
    () => formatNextScheduled(config?.next_scheduled_ts ?? null),
    [config?.next_scheduled_ts]
  );

  return (
    <div className="bg-card border-border flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border px-5 py-4">
      {/*
        WCAG 4.1.3 / 4.1.2: role="status" removed from the outer card.
        Wrapping interactive buttons inside a role="status" with aria-atomic="true"
        caused AT to re-announce the entire card including button labels every time
        nextScheduledLabel updated. Instead, a focused live region (below) announces
        only the dynamic status text without capturing the action buttons.
      */}

      {/* Next scan */}
      <div className="flex shrink-0 items-center gap-2">
        <Clock
          size={14}
          className="shrink-0 text-neutral-400"
          aria-hidden="true"
        />
        <span className="text-xs font-medium text-neutral-600">
          Next scan:{" "}
          <span className="font-black text-neutral-800">
            {nextScheduledLabel}
          </span>
        </span>
      </div>

      {/* Last grade */}
      {lastScan?.grade ? (
        <div className="flex shrink-0 items-center gap-2">
          <Calendar
            size={14}
            className="shrink-0 text-neutral-400"
            aria-hidden="true"
          />
          <span className="text-xs font-medium text-neutral-600">
            Last grade:
          </span>
          <GradeBadge grade={lastScan.grade} />
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-2">
          {/* WCAG 1.3.1: aria-label removed — plain <div> has no role, so aria-label was
              silently ignored by AT. The visible text span conveys the meaning already. */}
          <Calendar
            size={14}
            className="shrink-0 text-neutral-400"
            aria-hidden="true"
          />
          {/* WCAG 1.4.3: text-neutral-500 on white was ~3.5:1 (FAIL) → text-neutral-600 (PASS) */}
          <span className="text-xs font-medium text-neutral-600">
            No scan yet
          </span>
        </div>
      )}

      {/*
        WCAG 4.1.3: Scoped live region announces only dynamic status text (next scan,
        last grade). Mounted permanently so NVDA/JAWS detect the region before content changes.
        sr-only keeps it visually hidden. aria-atomic="true" announces the whole string at once.
      */}
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {`Next scan: ${nextScheduledLabel}.${lastScan?.grade ? ` Last grade: ${lastScan.grade}.` : " No scan yet."}`}
      </span>

      {/* Spacer */}
      <div className="min-w-0 flex-1" aria-hidden="true" />

      {/* Actions */}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onPreviewEmail}
          className="bg-secondary border-border hover:bg-card hover:border-swiss-navy/40 focus-visible:ring-swiss-navy inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black tracking-[0.08em] text-neutral-700 uppercase transition-all duration-200 focus-visible:ring-2 focus-visible:outline-none"
          aria-label="Preview scheduled scan email report"
        >
          <Mail size={12} aria-hidden="true" />
          Preview Email
        </button>

        <a
          href={`#${settingsPanelId}`}
          onClick={(e) => {
            e.preventDefault();
            document
              .getElementById(settingsPanelId)
              ?.scrollIntoView({ behavior: "smooth" });
          }}
          className="bg-secondary border-border hover:bg-card hover:border-swiss-navy/40 focus-visible:ring-swiss-navy inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black tracking-[0.08em] text-neutral-700 uppercase transition-all duration-200 focus-visible:ring-2 focus-visible:outline-none"
          aria-label="Scroll to scan report settings"
        >
          <Settings size={12} aria-hidden="true" />
          Settings
        </a>
      </div>
    </div>
  );
};

export default ScanCronStatusBanner;
