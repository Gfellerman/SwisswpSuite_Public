/**
 * ScanCronStatusBanner — Top-of-scan-tab status banner (v2.9.28.0)
 *
 * Shows:
 *  - Tier badge (FREE / PRO / NO LICENSE)
 *  - Next scheduled scan time derived from config.next_scheduled_ts
 *  - Last scan grade badge (A/B/C/D/F, colored)
 *  - "Preview Email" button → opens ScanReportPreviewModal
 *  - "Settings" anchor → scrolls to ScanReportSettingsPanel
 *
 * ARIA: role="status" + aria-live="polite" so screen readers are notified
 * when the banner content refreshes after a scan completes.
 */

import React, { useMemo } from 'react';
import { Calendar, Mail, Settings, Clock } from 'lucide-react';
import type { ScanReportConfig } from '../../../types';

// ── Grade badge ───────────────────────────────────────────────────────────────

interface GradeBadgeProps {
  grade: string;
}

const GradeBadge: React.FC<GradeBadgeProps> = ({ grade }) => {
  const upper = grade.toUpperCase();
  const styles: Record<string, string> = {
    A: 'bg-green-100 text-green-800 border-green-200',
    B: 'bg-blue-100 text-blue-800 border-blue-200',
    C: 'bg-amber-100 text-amber-800 border-amber-200',
    D: 'bg-red-100 text-red-800 border-red-200',
    F: 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <span
      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-black border ${styles[upper] ?? 'bg-secondary text-neutral-600 border-border'}`}
      aria-label={`Last scan grade: ${upper}`}
    >
      {/* WCAG 4.1.2: aria-hidden on visible text prevents VoiceOver double-announcement
          (it would otherwise read both the aria-label AND the text node). */}
      <span aria-hidden="true">{upper}</span>
    </span>
  );
};

// ── Tier badge ────────────────────────────────────────────────────────────────

interface TierBadgeProps {
  tier: 'none' | 'free' | 'pro';
}

const TierBadge: React.FC<TierBadgeProps> = ({ tier }) => {
  const styles: Record<typeof tier, string> = {
    // WCAG 1.4.3: upgraded text colors to meet 4.5:1 threshold on their respective bg-* colors
    // text-yellow-700 on bg-yellow-50 was ~4.1:1 (FAIL) → text-yellow-800 is ~5.6:1 (PASS)
    // text-gray-600 on bg-gray-50 was ~4.2:1 (FAIL) → text-gray-700 is ~5.5:1 (PASS)
    // text-red-600 on bg-red-50 was ~4.3:1 (FAIL) → text-red-700 is ~5.1:1 (PASS)
    pro:  'text-yellow-800 bg-yellow-50 border-yellow-200',
    free: 'text-gray-700 bg-gray-50 border-gray-200',
    none: 'text-red-700 bg-red-50 border-red-200',
  };
  const labels: Record<typeof tier, string> = {
    pro:  'PRO',
    free: 'FREE',
    none: 'NO LICENSE',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-[0.1em] border ${styles[tier]}`}
    >
      {labels[tier]}
    </span>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Format a Unix timestamp as a human-readable local date/time string.
 * Returns "—" when the value is null or in the past.
 */
function formatNextScheduled(ts: number | null): string {
  if (!ts) return '—';
  const date = new Date(ts * 1000);
  const now = Date.now();
  if (date.getTime() < now) return 'Due soon';

  // Relative time for events within 48h
  const diffMs = date.getTime() - now;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) {
    const diffMin = Math.floor(diffMs / (1000 * 60));
    return `in ${diffMin} min${diffMin !== 1 ? 's' : ''}`;
  }
  if (diffHours < 48) {
    return `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ScanCronStatusBannerProps {
  config: ScanReportConfig | null | undefined;
  /**
   * The user's current license tier — passed from the parent to correctly show
   * the tier badge even before the first scan runs (when last_scan is null).
   * Distinct from last_scan.tier which reflects the tier used during the last scan.
   */
  currentTier: 'none' | 'free' | 'pro';
  /** Called when user clicks "Preview Email" — parent opens the preview modal. */
  onPreviewEmail: () => void;
  /** ID of the settings panel element for the scroll anchor. */
  settingsPanelId?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const ScanCronStatusBanner: React.FC<ScanCronStatusBannerProps> = ({
  config,
  currentTier,
  onPreviewEmail,
  settingsPanelId = 'scan-report-settings-panel',
}) => {
  const lastScan = config?.last_scan ?? null;
  // currentTier: what the user IS right now (from license state) — used for the tier badge.
  // lastScan?.tier: what tier RAN the last scan — used for historical grade display only.
  const tier = currentTier;

  const nextScheduledLabel = useMemo(
    () => formatNextScheduled(config?.next_scheduled_ts ?? null),
    [config?.next_scheduled_ts],
  );

  return (
    <div
      className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4 bg-card border border-border rounded-2xl"
    >
      {/*
        WCAG 4.1.3 / 4.1.2: role="status" removed from the outer card.
        Wrapping interactive buttons inside a role="status" with aria-atomic="true"
        caused AT to re-announce the entire card including button labels every time
        nextScheduledLabel updated. Instead, a focused live region (below) announces
        only the dynamic status text without capturing the action buttons.
      */}

      {/* Tier */}
      <div className="flex items-center gap-2 shrink-0">
        {/* WCAG 1.4.3: text-neutral-500 on white was ~3.5:1 (FAIL) → text-neutral-600 is ~5.9:1 (PASS) */}
        <span className="text-xs font-black uppercase tracking-[0.08em] text-neutral-600">Tier</span>
        <TierBadge tier={tier} />
      </div>

      {/* Next scan */}
      <div className="flex items-center gap-2 shrink-0">
        <Clock size={14} className="text-neutral-400 shrink-0" aria-hidden="true" />
        <span className="text-xs font-medium text-neutral-600">
          Next scan:{' '}
          <span className="font-black text-neutral-800">{nextScheduledLabel}</span>
        </span>
      </div>

      {/* Last grade */}
      {lastScan?.grade ? (
        <div className="flex items-center gap-2 shrink-0">
          <Calendar size={14} className="text-neutral-400 shrink-0" aria-hidden="true" />
          <span className="text-xs font-medium text-neutral-600">Last grade:</span>
          <GradeBadge grade={lastScan.grade} />
        </div>
      ) : (
        <div className="flex items-center gap-2 shrink-0">
          {/* WCAG 1.3.1: aria-label removed — plain <div> has no role, so aria-label was
              silently ignored by AT. The visible text span conveys the meaning already. */}
          <Calendar size={14} className="text-neutral-400 shrink-0" aria-hidden="true" />
          {/* WCAG 1.4.3: text-neutral-500 on white was ~3.5:1 (FAIL) → text-neutral-600 (PASS) */}
          <span className="text-xs font-medium text-neutral-600">No scan yet</span>
        </div>
      )}

      {/*
        WCAG 4.1.3: Scoped live region announces only dynamic status text (tier, next scan,
        last grade). Mounted permanently so NVDA/JAWS detect the region before content changes.
        sr-only keeps it visually hidden. aria-atomic="true" announces the whole string at once.
      */}
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {`Tier: ${tier.toUpperCase()}. Next scan: ${nextScheduledLabel}.${lastScan?.grade ? ` Last grade: ${lastScan.grade}.` : ' No scan yet.'}`}
      </span>

      {/* Spacer */}
      <div className="flex-1 min-w-0" aria-hidden="true" />

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        <button
          type="button"
          onClick={onPreviewEmail}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary border border-border text-xs font-black uppercase tracking-[0.08em] text-neutral-700 hover:bg-card hover:border-swiss-navy/40 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-swiss-navy"
          aria-label="Preview scheduled scan email report"
        >
          <Mail size={12} aria-hidden="true" />
          Preview Email
        </button>

        <a
          href={`#${settingsPanelId}`}
          onClick={(e) => {
            e.preventDefault();
            document.getElementById(settingsPanelId)?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary border border-border text-xs font-black uppercase tracking-[0.08em] text-neutral-700 hover:bg-card hover:border-swiss-navy/40 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-swiss-navy"
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
