/**
 * HardeningConfirmDialog — confirmation dialog for high-risk hardening toggles.
 *
 * Shown when the user attempts to enable a hardening option that is flagged
 * `requires_confirmation: true`. The dialog content (title, body, conflict list,
 * button labels) is driven entirely by the pre-toggle-check API response so the
 * UI stays correct as the PHP conflict data evolves.
 *
 * A11y contract (matches SentinelM5ConsentModal pattern):
 *   - role="dialog" + aria-modal="true" on the inner container
 *   - aria-labelledby / aria-describedby wired to visible heading + body text
 *   - Focus trapped inside while open; Tab cycles between focusable elements
 *   - Escape key cancels and restores focus to the triggering element
 *   - Trigger focus restored on close (WCAG 2.4.3)
 *
 * Parent contract (VoiceOver fix — WCAG 1.3.1):
 *   VoiceOver on macOS/iOS does not honour aria-modal="true". When this dialog
 *   is open, the parent SHOULD apply `inert` to all background content siblings.
 *   Example:
 *     <main inert={pendingToggle !== null ? true : undefined}>...</main>
 *     <HardeningConfirmDialog ... />
 */
import React, { useCallback, useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";
import { HardeningOption, PreToggleCheckResult } from "../../../types";

// ---------------------------------------------------------------------------
// Shared focusable selector — identical to SentinelM5ConsentModal so both
// components always target the same element set for Tab-trapping and initial
// focus placement.
// ---------------------------------------------------------------------------
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// ---------------------------------------------------------------------------
// Severity badge colours
// ---------------------------------------------------------------------------
function severityBadgeClass(severity: string): string {
  switch (severity) {
    case "critical":
      return "bg-red-200 text-red-800 border border-red-300";
    case "high":
      return "bg-red-100 text-red-700 border border-red-200";
    case "medium":
      return "bg-amber-100 text-amber-700 border border-amber-200";
    default:
      return "bg-emerald-100 text-emerald-700 border border-emerald-200";
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface HardeningConfirmDialogProps {
  isOpen: boolean;
  option: HardeningOption | null;
  preToggleData: PreToggleCheckResult | null;
  onConfirm: () => void;
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const HardeningConfirmDialog: React.FC<HardeningConfirmDialogProps> = ({
  isOpen,
  option,
  preToggleData,
  onConfirm,
  onCancel,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  // WCAG 2.4.3: capture the element that held focus when the dialog opened
  // so we can restore it on close (prevents NVDA/JAWS from resetting to page top).
  const triggerRef = useRef<HTMLElement | null>(null);

  // Save the trigger element the moment the dialog becomes visible — before
  // focus moves inside (React runs effects in declaration order).
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
    }
  }, [isOpen]);

  // Stable cancel wrapper: restores focus before calling parent callback.
  const handleCancel = useCallback(() => {
    triggerRef.current?.focus();
    onCancel();
  }, [onCancel]);

  // Focus trap + Escape handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCancel();
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
    // Uses the same FOCUSABLE_SELECTOR as the Tab-trap so both always agree.
    const firstFocusable =
      dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    firstFocusable?.focus();

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleCancel]);

  const handleConfirm = () => {
    // WCAG 2.4.3: restore focus to trigger before calling onConfirm
    triggerRef.current?.focus();
    onConfirm();
  };

  // Don't render when closed or when there's no data to show
  if (!isOpen || !option || !preToggleData) return null;

  const {
    warning_title = `Enable ${option.label}?`,
    warning_body = "Are you sure you want to enable this option? It may affect site functionality.",
    confirm_button_text = "Enable Anyway",
    cancel_button_text = "Keep Disabled",
    conflicts = [],
  } = preToggleData;

  // WHY no aria-hidden on backdrop: WAI-ARIA forbids aria-hidden="true" on any
  // ancestor of a role="dialog" element — it would hide the dialog from screen
  // readers entirely. Backdrop is presentational; ARIA containment is handled
  // by aria-modal="true" on the inner dialog container.
  return (
    <div className="bg-swiss-navy/50 animate-in fade-in fixed inset-0 z-[99997] flex items-center justify-center p-4 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hardening-confirm-title"
        aria-describedby="hardening-confirm-desc"
        className="bg-card border-border animate-in zoom-in-95 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border duration-300"
      >
        {/* ------------------------------------------------------------------ */}
        {/* Header                                                               */}
        {/* ------------------------------------------------------------------ */}
        <div className="border-border flex shrink-0 items-start justify-between gap-4 border-b p-8">
          <div className="flex items-center gap-4">
            <div className="shrink-0 rounded-2xl bg-red-500/10 p-3">
              <AlertTriangle
                size={24}
                className="text-red-500"
                aria-hidden="true"
              />
            </div>
            <div>
              <h2
                id="hardening-confirm-title"
                className="text-swiss-navy text-xl font-black tracking-tight uppercase"
              >
                {warning_title}
              </h2>
              <p className="mt-1 text-xs font-medium text-neutral-500">
                Hardening option — {option.label}
              </p>
            </div>
          </div>
          {/* WCAG 2.4.3: handleCancel restores focus to trigger on close */}
          <button
            type="button"
            onClick={handleCancel}
            aria-label="Cancel and keep option disabled"
            className="hover:text-swiss-navy hover:bg-background shrink-0 rounded-xl border border-transparent p-2 text-neutral-400 transition-all"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Scrollable body                                                      */}
        {/* ------------------------------------------------------------------ */}
        <div className="flex-1 space-y-6 overflow-y-auto p-8">
          {/* Warning body text */}
          <p
            id="hardening-confirm-desc"
            className="text-sm leading-relaxed font-medium text-neutral-700"
          >
            {warning_body}
          </p>

          {/* Conflict list — only shown when conflicts exist */}
          {conflicts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-black tracking-widest text-neutral-500 uppercase">
                Detected conflicts ({conflicts.length})
              </h3>
              <ul className="space-y-3" aria-label="Plugin conflicts">
                {conflicts.map((conflict, idx) => (
                  <li
                    key={`${conflict.plugin}-${idx}`}
                    className="bg-secondary border-border rounded-2xl border p-5"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <span className="text-swiss-navy text-sm font-black">
                        {conflict.title}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-black tracking-widest uppercase ${severityBadgeClass(conflict.severity)}`}
                      >
                        {conflict.severity}
                      </span>
                    </div>
                    <p className="mb-2 text-xs leading-relaxed font-medium text-neutral-600">
                      {conflict.message}
                    </p>
                    <div className="bg-background border-border rounded-xl border p-3">
                      <p className="text-xs leading-relaxed font-medium text-neutral-500">
                        <span className="text-swiss-navy font-black">
                          Resolution:{" "}
                        </span>
                        {conflict.resolution}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Footer buttons                                                       */}
        {/* ------------------------------------------------------------------ */}
        <div className="border-border bg-background flex shrink-0 items-center justify-end gap-3 border-t p-6">
          {/* WCAG 2.4.3: handleCancel restores focus to trigger on close */}
          <button
            type="button"
            onClick={handleCancel}
            className="hover:bg-secondary inline-flex items-center justify-center rounded-full bg-transparent px-6 py-3 text-xs font-black tracking-[0.15em] text-neutral-700 uppercase transition-all duration-500 hover:text-neutral-900 active:scale-95"
          >
            {cancel_button_text}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-red-700/20 bg-red-600 px-6 py-3 text-xs font-black tracking-[0.15em] text-white uppercase shadow-lg shadow-red-600/30 transition-all duration-500 hover:bg-red-700 active:scale-95"
          >
            <AlertTriangle size={14} aria-hidden="true" />
            {confirm_button_text}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HardeningConfirmDialog;
