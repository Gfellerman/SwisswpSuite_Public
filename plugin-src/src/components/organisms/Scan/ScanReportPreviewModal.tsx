/**
 * ScanReportPreviewModal — Scan report preview (v2.9.28.0)
 *
 * Displays the data the scheduled scan email report is built from, rendered
 * with the app's own components (no HTML markup from the backend).
 *
 * WCAG / ARIA requirements:
 *  - role="dialog" + aria-modal="true" + aria-labelledby
 *  - Focus trap: Tab/Shift+Tab cycles within modal; Escape closes
 *  - Return focus to the trigger element on close (WCAG 2.4.3)
 *  - Backdrop click closes the modal
 *  - Scroll region: tabIndex=0 + role="region" + aria-label, so keyboard
 *    users can scroll it and the focus trap can cycle through it (WCAG 2.1.1/2.1.2)
 *
 * Focus trap pattern mirrors SentinelM5ConsentModal (the established codebase pattern).
 */

import React, { useCallback, useEffect, useRef } from "react";
import { X, Mail } from "lucide-react";
import type { ScanReportPreview } from "../../../types";
import { SentinelGradeBadge } from "../Sentinel/SentinelGradeBadge";

// ── Focusable selector — same as SentinelM5ConsentModal for consistency ──────

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// ── Props ─────────────────────────────────────────────────────────────────────

interface ScanReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Report data from GET /security/scan/report-preview, or null. */
  preview: ScanReportPreview | null;
}

// Severity presentation — AA pairs copied from ScanHistoricalRecord.tsx:12-26.
const SEVERITY_LABEL: Record<string, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Info",
};
const SEVERITY_CLASS: Record<string, string> = {
  critical: "border-red-200 bg-red-50 text-red-700",
  high: "border-orange-200 bg-orange-50 text-orange-800",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-blue-200 bg-blue-50 text-blue-700",
  info: "border-neutral-200 bg-neutral-50 text-neutral-600",
};
const GRADES = ["A", "B", "C", "D", "F"] as const;
type Grade = (typeof GRADES)[number];

// ── Component ─────────────────────────────────────────────────────────────────

export const ScanReportPreviewModal: React.FC<ScanReportPreviewModalProps> = ({
  isOpen,
  onClose,
  preview,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  /**
   * WCAG 2.4.3: capture the element that held focus when the modal opened,
   * so we can return focus to it on close. Without this, focus drops to
   * document.body and screen-reader virtual cursors reset to page top.
   */
  const triggerRef = useRef<HTMLElement | null>(null);

  // Save the trigger element the moment the modal becomes visible.
  // This runs before the focus-trap effect (React runs effects in declaration order)
  // so triggerRef is set before focus moves into the dialog.
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
    }
  }, [isOpen]);

  // Stable close handler — restores focus before calling onClose.
  const handleClose = useCallback(() => {
    triggerRef.current?.focus();
    onClose();
  }, [onClose]);

  // Focus trap: Tab cycles within dialog; Escape closes.
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
        return;
      }

      if (e.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    // Move initial focus to the first focusable element inside the dialog.
    const firstFocusable =
      dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    firstFocusable?.focus();

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    // WHY no aria-hidden on backdrop: The WAI-ARIA spec forbids aria-hidden="true"
    // on any ancestor of an element with role="dialog". The backdrop must be
    // presentational only; ARIA containment is handled by aria-modal="true".
    <div
      className="bg-swiss-navy/50 animate-in fade-in fixed inset-0 z-[99996] flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={(e) => {
        // Close on backdrop click but not on dialog content click
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      {/*
        PARENT CONTRACT (VoiceOver): aria-modal="true" suppresses background content for
        NVDA and JAWS but does NOT work in VoiceOver (macOS/iOS). The parent component MUST
        apply `inert` to all background siblings when this modal is open so VoiceOver users
        cannot navigate outside it. Supported in Chrome 102+, Firefox 112+, Safari 15.5+.
        Target: all siblings of the modal's portal root.
      */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="scan-preview-modal-title"
        className="bg-card border-border animate-in zoom-in-95 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border duration-300"
        // Prevent backdrop click handler from firing when clicking inside the dialog
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-border flex shrink-0 items-center justify-between gap-4 border-b p-6">
          <div className="flex items-center gap-3">
            <div className="bg-brand-accent/10 shrink-0 rounded-xl p-2.5">
              <Mail
                size={18}
                className="text-brand-accent"
                aria-hidden="true"
              />
            </div>
            <h2
              id="scan-preview-modal-title"
              className="text-swiss-navy dark:text-foreground text-base font-black tracking-tight uppercase"
            >
              Email Report Preview
            </h2>
          </div>
          {/* WCAG 2.4.3: handleClose restores focus to the trigger element on close */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close email report preview"
            className="hover:text-swiss-navy dark:hover:text-foreground hover:bg-background focus-visible:ring-swiss-navy shrink-0 rounded-xl border border-transparent p-2 text-neutral-600 transition-all focus-visible:ring-2 focus-visible:outline-none dark:text-neutral-400"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/*
          Scroll region: tabIndex=0 + role="region" + aria-label keeps a focusable
          node here (the [tabindex] selector matches it, same role the iframe used
          to play in the focus trap) and lets keyboard users scroll the region
          (WCAG 2.1.1).
        */}
        <div
          className="flex-1 overflow-y-auto p-6"
          tabIndex={0}
          role="region"
          aria-label="Report preview"
        >
          {preview && preview.has_scan ? (
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-4">
                {(GRADES as readonly string[]).includes(preview.grade) && (
                  <SentinelGradeBadge grade={preview.grade as Grade} size="md" />
                )}
                <p className="text-sm text-neutral-700">{preview.summary}</p>
              </div>
              {preview.findings.length > 0 ? (
                <table className="w-full border-collapse text-left text-sm">
                  <caption className="sr-only">
                    Findings included in the report
                  </caption>
                  <thead>
                    <tr className="border-border border-b">
                      <th scope="col" className="p-2 font-bold text-neutral-700">
                        Severity
                      </th>
                      <th scope="col" className="p-2 font-bold text-neutral-700">
                        Issue
                      </th>
                      <th scope="col" className="p-2 font-bold text-neutral-700">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.findings.map((f, i) => (
                      <tr key={i} className="border-border border-b">
                        <td className="p-2">
                          <span
                            className={`inline-block rounded border px-2 py-0.5 text-xs font-bold ${
                              SEVERITY_CLASS[f.severity] ?? SEVERITY_CLASS.info
                            }`}
                          >
                            {SEVERITY_LABEL[f.severity] ?? SEVERITY_LABEL.info}
                          </span>
                        </td>
                        <td className="p-2 font-medium text-neutral-900">
                          {f.title || "—"}
                        </td>
                        <td className="p-2 text-neutral-700">
                          {f.description || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm font-bold text-emerald-700">
                  No issues found in this scan.
                </p>
              )}
              {preview.total_findings > 5 && (
                <p className="text-xs text-neutral-600">
                  Showing top 5 of {preview.total_findings} findings.
                </p>
              )}
              <p className="text-xs text-neutral-600">
                <strong>Next scheduled scan:</strong>{" "}
                {preview.scan_report_enabled === false
                  ? "Off"
                  : preview.next_scheduled_ts
                    ? new Date(
                        preview.next_scheduled_ts * 1000
                      ).toLocaleString()
                    : "Not scheduled"}
              </p>
              {preview.sections.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-neutral-700">
                    Also in the e-mail:
                  </p>
                  <ul className="list-disc pl-5 text-sm text-neutral-700">
                    {preview.sections.map((s, i) => (
                      <li key={i}>{s.heading}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-secondary border-border flex h-40 items-center justify-center rounded-xl border p-4">
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                No scan results yet. Run a scan to see what the daily report
                will contain.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-border bg-background flex shrink-0 items-center justify-end border-t p-5">
          <button
            type="button"
            onClick={handleClose}
            className="hover:bg-secondary focus-visible:ring-swiss-navy dark:hover:text-foreground inline-flex items-center justify-center rounded-full bg-transparent px-6 py-3 text-xs font-black tracking-[0.15em] text-neutral-700 uppercase transition-all duration-500 hover:text-neutral-900 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:text-neutral-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScanReportPreviewModal;
