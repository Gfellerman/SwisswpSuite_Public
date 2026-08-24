import React from "react";
import { X } from "lucide-react";
import { isFreeEdition } from "../../../lib/edition";
import { EditionMismatchDownloadCta } from "./EditionMismatchDownloadCta";
import { BULK_AI_FREE_EDITION_NOTICE } from "./scanResultProCopy";

/**
 * BulkAiConfirmModal — confirmation dialog shown when a bulk "Check N with
 * AI" click exceeds MAX_AI_BATCH. Extracted from ScanResultPanel.tsx (ARS
 * Round D, D-K-1, WP.org R4 F-01, 2026-08-2x) so it can be aliased away in
 * the Free build (plugin/vite.config.ts, specifier "./BulkAiConfirmModal")
 * instead of merely relabeling it. This dialog can only ever OPEN via the
 * bulk AI-analyze buttons (AiAnalyzeFileButton/BulkAiAnalyzeButton), which
 * are themselves aliased away in Free — so in a genuine Free install
 * `aiConfirm` (the state that drives `open`) can never become non-null and
 * this dialog is structurally unreachable at runtime. Per this project's
 * string-presence doctrine (a runtime-unreachable code path is not exempt
 * from physical exclusion) it still needs its own alias so its copy —
 * including the edition-mismatch branch's text — never compiles into the
 * Free bundle. Minimal inline confirmation modal; reuses the a11y pattern
 * from HardeningConfirmDialog (role=dialog, aria-modal, Escape-to-cancel)
 * without pulling in the heavier component that is coupled to the
 * HardeningOption shape. Rendered only when open=true so it has zero
 * footprint otherwise.
 */
export interface BulkAiConfirmModalProps {
  open: boolean;
  totalSelected: number;
  cap: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const BulkAiConfirmModal: React.FC<BulkAiConfirmModalProps> = ({
  open,
  totalSelected,
  cap,
  onConfirm,
  onCancel,
}) => {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-ai-confirm-title"
        aria-describedby="bulk-ai-confirm-body"
        className="border-border w-full max-w-md rounded-2xl border bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3
            id="bulk-ai-confirm-title"
            className="text-base font-black text-neutral-900"
          >
            Analyze {cap} files with AI?
          </h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel"
            className="hover:bg-secondary focus-visible:ring-swiss-navy shrink-0 rounded-full p-1 focus-visible:ring-2 focus-visible:outline-none"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <p id="bulk-ai-confirm-body" className="mb-4 text-sm text-neutral-700">
          {isFreeEdition() ? (
            <>
              You selected <strong>{totalSelected}</strong> files.{" "}
              {BULK_AI_FREE_EDITION_NOTICE}
              <EditionMismatchDownloadCta />
            </>
          ) : (
            <>
              You selected <strong>{totalSelected}</strong> files. AI analysis
              is slow and uses tokens — we&rsquo;ll run it on the first{" "}
              <strong>{cap}</strong>. You can re-run on the rest afterwards.
            </>
          )}
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="border-border hover:bg-secondary focus-visible:ring-swiss-navy rounded-xl border px-4 py-2 text-sm font-black text-neutral-700 focus-visible:ring-2 focus-visible:outline-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className="bg-swiss-navy focus-visible:ring-swiss-navy rounded-xl px-4 py-2 text-sm font-black text-white hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none"
          >
            Analyze first {cap}
          </button>
        </div>
      </div>
    </div>
  );
};
