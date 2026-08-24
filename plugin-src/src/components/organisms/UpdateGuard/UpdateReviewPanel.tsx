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

import React, { useState, useEffect, useRef } from "react";
import { Clock } from "lucide-react";
import { wpApi, ApiError } from "../../../services/api";
import type { UpdateGuardReview } from "../../../types";
import { formatIsoDate } from "./SnapshotList";

/**
 * U1 (v2.9.33.29): extract the most accurate human-readable message from a
 * failed wpApi() call. Confirmed by running this component's own test suite
 * against the ALREADY-LANDED U10 hardening of wpApi() (services/api.ts) in
 * this same release: wpApi() now THROWS an ApiError whenever a response body
 * carries `success: false`, at ANY status (2xx included, since
 * /update-guard/reviews/approve|reject are not in U10's allowSuccessFalse
 * opt-out list) -- it never resolves normally with a success:false body. So
 * a `result?.success === false` check inside the try block, as originally
 * drafted, is dead code that can never run; the real failure path is always
 * this catch block. Both this file's REST handlers (api-update-guard.php)
 * and its 400-status error shapes key the machine-readable reason as
 * `error` (e.g. `{success:false, error:'missing_slug'}`), not `message` --
 * ApiError.data carries the original parsed body, so `.data.error` is
 * checked first, matching what the backend actually sends.
 */
function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const data = err.data as { error?: string; message?: string } | undefined;
    return data?.error || data?.message || err.message || fallback;
  }
  return err instanceof Error ? err.message : fallback;
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface ReviewRowProps {
  review: UpdateGuardReview;
  onQueueChange: () => void;
  // Callback to set a surgical announcement in the sr-only live region
  // rather than relying on the full <li> content being serialized by AT.
  onAnnounce: (message: string) => void;
}

const ReviewRow: React.FC<ReviewRowProps> = ({
  review,
  onQueueChange,
  onAnnounce,
}) => {
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
      // U1 (v2.9.33.29): response.success is now enforced by wpApi() itself (U10,
      // this same release) — a success:false body throws an ApiError instead of
      // resolving, so there is no separate `if (!success)` branch to write here;
      // the catch block below is the single failure path. See extractErrorMessage()
      // above for why.
      await wpApi<{ success: boolean; slug?: string }>(
        "/update-guard/reviews/approve",
        {
          method: "POST",
          body: JSON.stringify({ slug: review.slug }),
        }
      );
      // WCAG 4.1.3 (A-4 fix): announce a surgical message rather than letting
      // AT serialize the full <li> content (which includes buttons, icons, badge text).
      // Wording reflects the GENUINE-ALLOW semantics (owner ruling, 2026-08-20): approval
      // is scoped to this exact slug+version+package — a different build or a version bump
      // will still be blocked and re-queued for review, not silently let through.
      onAnnounce(
        `${review.slug} approved — this exact version will be allowed on the next update.`
      );
      onQueueChange();
    } catch (err) {
      rowErrorSeq.current += 1;
      setRowError(extractErrorMessage(err, "Approve failed."));
    } finally {
      setApproveLoading(false);
    }
  };

  const handleReject = async () => {
    setRowError(null);
    setRejectLoading(true);
    try {
      // U1 (v2.9.33.29): same rationale as handleApprove above — wpApi() itself
      // (U10) throws on success:false, so the single failure path is the catch.
      await wpApi<{ success: boolean; slug?: string }>(
        "/update-guard/reviews/reject",
        {
          method: "POST",
          body: JSON.stringify({ slug: review.slug }),
        }
      );
      // WCAG 4.1.3 (A-4 fix): surgical announcement on reject.
      onAnnounce(`${review.slug} rejected. Removed from review queue.`);
      onQueueChange();
    } catch (err) {
      rowErrorSeq.current += 1;
      setRowError(extractErrorMessage(err, "Reject failed."));
    } finally {
      setRejectLoading(false);
    }
  };

  return (
    <li className="border-border bg-card flex flex-col gap-2 rounded-xl border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        {/* Info */}
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <code className="font-mono text-xs font-black text-neutral-800">
              {review.slug}
            </code>
            <span className="text-xs font-medium text-neutral-600">
              v{review.version}
            </span>
            {review.findings_count > 0 && (
              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-black text-amber-700">
                {review.findings_count} finding
                {review.findings_count !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <span className="flex items-center gap-1 text-xs font-medium text-neutral-600">
            <Clock size={10} aria-hidden="true" />
            Held {formatIsoDate(review.held_at)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={handleApprove}
            disabled={isActing}
            aria-label={`Approve update for ${review.slug}`}
            aria-busy={approveLoading}
            className="bg-swiss-navy border-swiss-navy focus-visible:ring-swiss-navy inline-flex items-center rounded-lg border px-3 py-1 text-xs font-black text-white transition-colors hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {approveLoading ? "Approving…" : "Approve"}
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={isActing}
            aria-label={`Reject update for ${review.slug}`}
            aria-busy={rejectLoading}
            className="border-border bg-secondary focus-visible:ring-swiss-navy inline-flex items-center rounded-lg border px-3 py-1 text-xs font-black text-neutral-600 transition-colors hover:bg-neutral-100 focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {rejectLoading ? "Rejecting…" : "Reject"}
          </button>
        </div>
      </div>

      {/* Inline error — keyed to force remount on repeat identical errors (A-8 pattern) */}
      {rowError && (
        <span
          key={`row-err-${rowErrorSeq.current}`}
          role="alert"
          className="text-xs font-medium text-red-600"
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
  const [announcement, setAnnouncement] = useState("");

  // NVDA two-step pattern: clear the announcement after a tick so that
  // the same message can be re-announced if the same action is retried.
  useEffect(() => {
    if (announcement) {
      const id = setTimeout(() => setAnnouncement(""), 3000);
      return () => clearTimeout(id);
    }
  }, [announcement]);

  const handleAnnounce = (message: string) => {
    // Clear then set in the same synchronous call: React batches these into
    // one render, so the span stays empty until the next tick. Use a functional
    // update with a micro-delay to guarantee the empty → populated mutation
    // that NVDA observes.
    setAnnouncement("");
    setTimeout(() => setAnnouncement(message), 0);
  };

  return (
    /*
      This outer div is always in the DOM. The role="status" span inside is
      always mounted so AT can observe it. Visible content is conditional.
    */
    <div className={reviews.length > 0 ? "mb-5" : ""}>
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
          <p className="mb-3 text-xs font-black tracking-[0.08em] text-neutral-600 uppercase">
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
