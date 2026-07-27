/**
 * UpdateBlockedBanner — Phase 2 post-block notification banner.
 *
 * Renders an amber warning banner when the last verdict indicates a block
 * in review_first or block_on_match mode.
 *
 * ARIA:
 *  - Banner container: role="alert" for immediate SR announcement on mount
 *  - Override button: disabled after first use (idempotent override)
 */

import React, { useState, useRef } from 'react';
import { AlertTriangle, ShieldOff } from 'lucide-react';
import { wpApi } from '../../../services/api';
import type { UpdateGuardStatus, UpdateGuardLastVerdict } from '../../../types';

// ── Props ─────────────────────────────────────────────────────────────────────

export interface UpdateBlockedBannerProps {
  status: UpdateGuardStatus | null;
  onOverride: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

const UpdateBlockedBanner: React.FC<UpdateBlockedBannerProps> = ({
  status,
  onOverride,
}) => {
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [overrideUsed, setOverrideUsed] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  // A-8 pattern: force role="alert" remount on repeated identical error messages.
  const overrideErrorSeq = useRef(0);

  // Guard: only render when conditions are met
  if (!status) return null;

  const isBlockingMode =
    status.mode === 'block_on_match' || status.mode === 'review_first';

  if (!isBlockingMode) return null;

  const hasVerdictData =
    status.last_verdict !== null &&
    typeof status.last_verdict === 'object' &&
    'slug' in status.last_verdict;

  if (!hasVerdictData) return null;

  const verdict = status.last_verdict as UpdateGuardLastVerdict;

  if (verdict.type !== 'staged_scan') return null;

  // All guards passed — render the banner
  const handleOverride = async () => {
    if (overrideUsed || overrideLoading) return;
    setOverrideError(null);
    setOverrideLoading(true);
    try {
      await wpApi('/update-guard/override', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setOverrideUsed(true);
      onOverride();
    } catch (err) {
      overrideErrorSeq.current += 1;
      setOverrideError(err instanceof Error ? err.message : 'Override failed.');
    } finally {
      setOverrideLoading(false);
    }
  };

  return (
    <div
      role="alert"
      className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Icon + info */}
        <div className="flex items-start gap-3 min-w-0">
          <div className="shrink-0 mt-0.5">
            <AlertTriangle
              size={18}
              className="text-amber-600"
              aria-hidden="true"
            />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-amber-800 mb-1">
              Update Blocked
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-xs text-amber-800 font-medium">
                Plugin:{' '}
                <code className="font-mono text-xs bg-amber-100 border border-amber-200 rounded px-1.5 py-0.5">
                  {verdict.slug}
                </code>
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black border bg-amber-100 text-amber-700 border-amber-300">
                {verdict.findings_count} finding{verdict.findings_count !== 1 ? 's' : ''}
              </span>
              {(verdict as UpdateGuardLastVerdict & { confidence?: string }).confidence && (
                <span className="text-xs text-amber-700 font-medium">
                  Confidence: {(verdict as UpdateGuardLastVerdict & { confidence?: string }).confidence}
                </span>
              )}
            </div>
            <p className="text-xs text-amber-700 font-medium mt-1">
              {status.mode === 'block_on_match'
                ? 'The update was blocked due to security findings. Review the findings before proceeding.'
                : 'The update is held for your review. Approve or reject from the queue below.'}
            </p>
          </div>
        </div>

        {/* Override button */}
        <div className="shrink-0 flex flex-col items-end gap-1">
          {/*
            WCAG 2.1.1 / A-5 fix: Two different disabled patterns used here depending on state:

            1. overrideLoading (transient) — native `disabled` is correct here. The user
               just clicked the button; it will re-enable once the request resolves.
               Native disabled is fine for momentary loading gates.

            2. overrideUsed (permanent end-state) — use `aria-disabled="true"` instead of
               native `disabled`. Native disabled would remove the button from the tab order
               entirely, making it invisible to keyboard users. With aria-disabled, the button
               remains focusable so AT can announce "Override applied, dimmed, button" and
               keyboard users can discover that the override has been consumed.
               The onClick handler already guards against re-firing (overrideUsed check).
          */}
          <button
            type="button"
            onClick={handleOverride}
            disabled={overrideLoading}
            aria-disabled={overrideUsed || overrideLoading ? true : undefined}
            aria-label={
              overrideUsed
                ? 'Override already applied — update will proceed'
                : 'Override block once and allow this update to proceed'
            }
            aria-busy={overrideLoading}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-black hover:bg-amber-700 border border-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-swiss-navy disabled:opacity-50 disabled:cursor-not-allowed transition-colors${overrideUsed ? ' opacity-50 cursor-not-allowed' : ''}`}
          >
            <ShieldOff size={12} aria-hidden="true" />
            {overrideUsed ? 'Override applied' : overrideLoading ? 'Applying…' : 'Override once'}
          </button>
          {overrideError && (
            <span
              key={`override-err-${overrideErrorSeq.current}`}
              role="alert"
              className="text-xs text-red-600 font-medium"
            >
              {overrideError}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpdateBlockedBanner;
