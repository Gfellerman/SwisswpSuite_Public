/**
 * ScanReportPreviewModal — Email report HTML preview (v2.9.28.0)
 *
 * Displays a sandboxed iframe preview of the scheduled scan email report.
 *
 * WCAG / ARIA requirements:
 *  - role="dialog" + aria-modal="true" + aria-labelledby
 *  - Focus trap: Tab/Shift+Tab cycles within modal; Escape closes
 *  - Return focus to the trigger element on close (WCAG 2.4.3)
 *  - Backdrop click closes the modal
 *
 * Security:
 *  - iframe sandbox="allow-same-origin" — no scripts execute in preview
 *
 * Focus trap pattern mirrors SentinelM5ConsentModal (the established codebase pattern).
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { X, Mail } from 'lucide-react';

// ── Focusable selector — same as SentinelM5ConsentModal for consistency ──────
//
// WHY iframes are handled via tabindex="0" rather than adding "iframe" here:
// Native iframes are natively focusable (they appear in the browser tab order)
// but they are NOT matched by the standard FOCUSABLE_SELECTOR — an iframe has
// no [href], no role, and no tabindex attribute by default. Without an explicit
// tabindex="0", when the user Tabs from the last matched element (the Close
// button) the trap would not see the iframe as the "last" node and focus would
// leak out of the dialog. Adding tabindex="0" to the iframe is the minimal fix:
// it becomes matched by the [tabindex]:not([tabindex="-1"]) rule and the trap
// cycles correctly. (WCAG 2.1.2)

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// ── Props ─────────────────────────────────────────────────────────────────────

interface ScanReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Raw HTML string for the email preview — rendered via iframe srcDoc.
   * Using srcDoc (not src) avoids a cross-origin fetch: the PHP endpoint
   * returns the HTML body directly in the JSON envelope, so we inject it
   * inline. sandbox="allow-same-origin" prevents script execution.
   */
  previewHtml: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const ScanReportPreviewModal: React.FC<ScanReportPreviewModalProps> = ({
  isOpen,
  onClose,
  previewHtml,
}) => {
  const dialogRef  = useRef<HTMLDivElement>(null);
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
      if (e.key === 'Escape') {
        handleClose();
        return;
      }

      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) return;

      const first  = focusable[0];
      const last   = focusable[focusable.length - 1];
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

    document.addEventListener('keydown', handleKeyDown);

    // Move initial focus to the first focusable element inside the dialog.
    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    firstFocusable?.focus();

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    // WHY no aria-hidden on backdrop: The WAI-ARIA spec forbids aria-hidden="true"
    // on any ancestor of an element with role="dialog". The backdrop must be
    // presentational only; ARIA containment is handled by aria-modal="true".
    <div
      className="fixed inset-0 bg-swiss-navy/50 backdrop-blur-sm flex items-center justify-center z-[99996] animate-in fade-in p-4"
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
        className="w-full max-w-2xl bg-card rounded-3xl shadow-premium border border-border overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300"
        // Prevent backdrop click handler from firing when clicking inside the dialog
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-accent/10 rounded-xl shrink-0">
              <Mail size={18} className="text-brand-accent" aria-hidden="true" />
            </div>
            <h2
              id="scan-preview-modal-title"
              className="font-black text-base text-swiss-navy uppercase tracking-tight"
            >
              Email Report Preview
            </h2>
          </div>
          {/* WCAG 2.4.3: handleClose restores focus to the trigger element on close */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close email report preview"
            className="text-neutral-400 hover:text-swiss-navy hover:bg-background p-2 rounded-xl transition-all border border-transparent shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-swiss-navy"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Iframe preview body */}
        <div className="flex-1 overflow-hidden p-4">
          {previewHtml ? (
            <iframe
              // srcDoc injects the HTML string directly — no cross-origin fetch needed.
              // The PHP endpoint returns {success: true, html: "..."} so we use the
              // string value here, not a URL.
              srcDoc={previewHtml}
              title="Scan email report preview"
              // sandbox="allow-same-origin" — permits the iframe to read same-origin
              // cookies/localStorage if needed for relative links, but blocks all script
              // execution. No allow-scripts — this is display-only HTML.
              sandbox="allow-same-origin"
              // WCAG 2.1.2: tabindex="0" makes the iframe appear in the FOCUSABLE_SELECTOR
              // query ([tabindex]:not([tabindex="-1"])), so the focus trap correctly cycles
              // through it. Without this, Tab from the "Close" footer button would find the
              // iframe as "next" natively but the trap's querySelectorAll would not count it,
              // causing focus to escape the dialog to background content.
              tabIndex={0}
              className="w-full h-full min-h-[400px] rounded-xl border border-border bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-swiss-navy"
              aria-label="Email report HTML preview"
            />
          ) : (
            <div className="flex items-center justify-center h-[400px] bg-secondary rounded-xl border border-border">
              <p className="text-sm font-medium text-neutral-500">No preview available.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border flex items-center justify-end shrink-0 bg-background">
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex items-center justify-center font-black rounded-full transition-all duration-500 uppercase tracking-[0.15em] px-6 py-3 text-xs bg-transparent text-neutral-700 hover:text-neutral-900 hover:bg-secondary active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-swiss-navy"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScanReportPreviewModal;
