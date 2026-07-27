/**
 * UpdateReviewPanel — Phase 2 component for the review queue (review_first mode).
 *
 * Displays updates held in the review queue with Approve / Reject actions.
 * Renders nothing when the queue is empty.
 *
 * ARIA:
 *  - List container: aria-live="polite" for announcements when items change
 *  - Action buttons: aria-label includes slug + action
 *  - Loading per-row: aria-busy on the relevant button
 *  - Inline errors: role="alert"
 */

import React, { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import { wpApi } from '../../../services/api';
import type { UpdateGuardReview } from '../../../types';
import { formatIsoDate } from './SnapshotList';

// ── Sub-components ────────────────────────────────────────────────────────────

interface ReviewRowProps {
  review: UpdateGuardReview;
  onQueueChange: () => void;
  // Callback to set a surgical announcement in the sr-only live region
  // rather than relying on the full <li> content being serialized by AT.
  onAnnounce: (message: string) => void;
}

const ReviewRow: React.FC<ReviewRowProps> = ({ review, onQueueChange, onAnnounce }) => {
  const [approveLoading, setApproveLoading] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  // A-8 pattern: monotonically-incrementing counter forces React to remount the
  // role="alert" span even when the error message is identical on a retry.
  const rowErrorSeq = useRef(0);

  const isActing = approveLoading || rejectLoading;

  const handleApprove = async () => {
    setRowError(null);
    setApproveLoading(true);
    try {
      await wpApi('/update-guard/reviews/approve', {
        method: 'POST',
        body: JSON.stringify({ slug: review.slug }),
      });
      // WCAG 4.1.3 (A-4 fix): announce a surgical message rather than letting
      // AT serialize the full <li> content (which includes buttons, icons, badge text).
      onAnnounce(`${review.slug} approved. Removed from review queue.`);
      onQueueChange();
    } catch (err) {
      rowErrorSeq.current += 1;
      setRowError(err instanceof Error ? err.message : 'Approve failed.');
    } finally {
      setApproveLoading(false);
    }
  };

  const handleReject = async () => {
    setRowError(null);
    setRejectLoading(true);
    try {
      await wpApi('/update-guard/reviews/reject', {
        method: 'POST',
        body: JSON.stringify({ slug: review.slug }),
      });
      // WCAG 4.1.3 (A-4 fix): surgical announcement on reject.
      onAnnounce(`${review.slug} rejected. Removed from review queue.`);
      onQueueChange();
    } catch (err) {
      rowErrorSeq.current += 1;
      setRowError(err instanceof Error ? err.message : 'Reject failed.');
    } finally {
      setRejectLoading(false);
    }
  };

  return (
    <li className="flex flex-col gap-2 p-3 rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        {/* Info */}
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="font-mono text-xs font-black text-neutral-800">{review.slug}</code>
            <span className="text-xs text-neutral-600 font-medium">v{review.version}</span>
            {review.findings_count > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black border bg-amber-50 text-amber-700 border-amber-200">
                {review.findings_count} finding{review.findings_count !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <span className="text-xs text-neutral-600 font-medium flex items-center gap-1">
            <Clock size={10} aria-hidden="true" />
            Held {formatIsoDate(review.held_at)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleApprove}
            disabled={isActing}
            aria-label={`Approve update for ${review.slug}`}
            aria-busy={approveLoading}
            className="inline-flex items-center px-3 py-1 rounded-lg bg-swiss-navy text-white text-xs font-black hover:opacity-90 border border-swiss-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-swiss-navy disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {approveLoading ? 'Approving…' : 'Approve'}
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={isActing}
            aria-label={`Reject update for ${review.slug}`}
            aria-busy={rejectLoading}
            className="inline-flex items-center px-3 py-1 rounded-lg border border-border bg-secondary text-xs font-black text-neutral-600 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-swiss-navy disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {rejectLoading ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
      </div>

      {/* Inline error — keyed to force remount on repeat identical errors (A-8 pattern) */}
      {rowError && (
        <span
          key={`row-err-${rowErrorSeq.current}`}
          role="alert"
          className="text-xs text-red-600 font-medium"
        >
          {rowError}
        </span>
      )}
    </li>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export interface UpdateReviewPanelProps {
  reviews: UpdateGuardReview[];
  onQueueChange: () => void;
}

const UpdateReviewPanel: React.FC<UpdateReviewPanelProps> = ({
  reviews,
  onQueueChange,
}) => {
  /*
    WCAG 4.1.3 — A-3 fix: This component must NEVER return null.
    Previously it returned null when reviews.length === 0, which destroyed the
    aria-live <ul>. When the queue refilled, the component would remount with
    content already in it — NVDA/JAWS would not announce the new items because
    they were never observing the region.

    Fix: always render a containing div. When the queue is empty, render only
    the hidden live region (role="status" sr-only) so NVDA can observe future
    mutations. The visible heading + list are conditionally rendered.

    A-4 fix: The <ul aria-live="polite"> approach is replaced with a dedicated
    role="status" sr-only span populated via useEffect (two-step pattern).
    This gives a surgical announcement ("woocommerce approved. Removed from
    review queue.") instead of serializing the entire <li> DOM subtree.
    The <ul> retains aria-label for AT to identify the region, but aria-live
    is moved off the list onto the dedicated announcement span.
  */
  const [announcement, setAnnouncement] = useState('');

  // NVDA two-step pattern: clear the announcement after a tick so that
  // the same message can be re-announced if the same action is retried.
  useEffect(() => {
    if (announcement) {
      const id = setTimeout(() => setAnnouncement(''), 3000);
      return () => clearTimeout(id);
    }
  }, [announcement]);

  const handleAnnounce = (message: string) => {
    // Clear then set in the same synchronous call: React batches these into
    // one render, so the span stays empty until the next tick. Use a functional
    // update with a micro-delay to guarantee the empty → populated mutation
    // that NVDA observes.
    setAnnouncement('');
    setTimeout(() => setAnnouncement(message), 0);
  };

  return (
    /*
      This outer div is always in the DOM. The role="status" span inside is
      always mounted so AT can observe it. Visible content is conditional.
    */
    <div className={reviews.length > 0 ? 'mb-5' : ''}>
      {/*
        WCAG 4.1.3 / NVDA two-step: always-mounted announcement region.
        role="status" implies aria-live="polite" + aria-atomic="true".
        Content is set asynchronously (setTimeout 0) after approve/reject —
        never in the same render tick as mount.
      */}
      <span role="status" className="sr-only">
        {announcement}
      </span>

      {reviews.length > 0 && (
        <>
          <p className="text-xs font-black uppercase tracking-[0.08em] text-neutral-600 mb-3">
            Review Queue ({reviews.length})
          </p>
          {/*
            aria-label identifies the region for AT but aria-live is intentionally
            NOT on this element — announcements go through the surgical role="status"
            span above to avoid AT serializing the full <li> subtree.
          */}
          <ul
            className="flex flex-col gap-2"
            aria-label="Plugin update review queue"
          >
            {reviews.map((review) => (
              <ReviewRow
                key={`${review.slug}-${review.held_at}`}
                review={review}
                onQueueChange={onQueueChange}
                onAnnounce={handleAnnounce}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default UpdateReviewPanel;
