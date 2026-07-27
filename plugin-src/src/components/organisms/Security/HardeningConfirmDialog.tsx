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
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
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

  // F-309: acknowledgement checkbox for options that require the user to confirm
  // they've set up a server cron job before enabling (disable_wp_cron_public).
  // Reset on every dialog open so a previous ack doesn't carry over.
  const [cronAck, setCronAck] = useState(false);

  // Save the trigger element the moment the dialog becomes visible — before
  // focus moves inside (React runs effects in declaration order).
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
      setCronAck(false);
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
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
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

  // F-309: options that require the "I have set up a server cron job" acknowledgement
  // before Confirm is enabled. Currently only disable_wp_cron_public — enabling it
  // without a server cron is the #1 cause of silently broken scheduled backups.
  const requiresCronAck = option.key === "disable_wp_cron_public";

  // Build the exact command with the current site URL prefilled so the user can
  // copy-paste without editing. Falls back to location.* if swisswpsuiteData is
  // not present (defensive — that global is always injected by the WP admin shell).
  const cronCommand = (() => {
    const base =
      (typeof window !== "undefined" &&
        (window.swisswpsuiteData?.homeUrl ||
          `${window.location.protocol}//${window.location.hostname}`)) ||
      "";
    return `*/5 * * * * wget -q -O - ${base}/wp-cron.php?doing_wp_cron >/dev/null 2>&1`;
  })();

  const copyCronCommand = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(cronCommand)
        .then(() => toast.success("Cron command copied"))
        .catch(() =>
          toast.error("Copy failed — select the text and copy manually"),
        );
    } else {
      toast.error("Clipboard unavailable — select the text and copy manually");
    }
  };

  // Confirm button is disabled until the ack checkbox is ticked, for options that need it.
  const confirmDisabled = requiresCronAck && !cronAck;

  // WHY no aria-hidden on backdrop: WAI-ARIA forbids aria-hidden="true" on any
  // ancestor of a role="dialog" element — it would hide the dialog from screen
  // readers entirely. Backdrop is presentational; ARIA containment is handled
  // by aria-modal="true" on the inner dialog container.
  return (
    <div className="fixed inset-0 bg-swiss-navy/50 backdrop-blur-sm flex items-center justify-center z-[99997] animate-in fade-in p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hardening-confirm-title"
        aria-describedby="hardening-confirm-desc"
        className="w-full max-w-lg bg-card rounded-3xl shadow-premium border border-border overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300"
      >
        {/* ------------------------------------------------------------------ */}
        {/* Header                                                               */}
        {/* ------------------------------------------------------------------ */}
        <div className="p-8 border-b border-border flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500/10 rounded-2xl shrink-0">
              <AlertTriangle
                size={24}
                className="text-red-500"
                aria-hidden="true"
              />
            </div>
            <div>
              <h2
                id="hardening-confirm-title"
                className="font-black text-xl text-swiss-navy uppercase tracking-tight"
              >
                {warning_title}
              </h2>
              <p className="text-xs font-medium text-neutral-500 mt-1">
                Hardening option — {option.label}
              </p>
            </div>
          </div>
          {/* WCAG 2.4.3: handleCancel restores focus to trigger on close */}
          <button
            type="button"
            onClick={handleCancel}
            aria-label="Cancel and keep option disabled"
            className="text-neutral-400 hover:text-swiss-navy hover:bg-background p-2 rounded-xl transition-all border border-transparent shrink-0"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Scrollable body                                                      */}
        {/* ------------------------------------------------------------------ */}
        <div className="p-8 space-y-6 overflow-y-auto flex-1">
          {/* Warning body text */}
          <p
            id="hardening-confirm-desc"
            className="text-sm font-medium text-neutral-700 leading-relaxed"
          >
            {warning_body}
          </p>

          {/* F-309: server-cron instructions + required acknowledgement — shown only
              for options where visitor-triggered scheduling is being turned off.
              Prevents users from silently breaking backups by enabling this without
              first setting up a real server cron. */}
          {requiresCronAck && (
            <div className="space-y-3 bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <h3 className="text-xs font-black uppercase tracking-widest text-amber-800">
                Required: Set up a server cron job first
              </h3>
              <p className="text-xs font-medium text-amber-900 leading-relaxed">
                Scheduled tasks (backups, security scans, token sync) will stop
                running via WordPress cron once this is on. Go to your hosting
                control panel &rarr; Cron Jobs and add this command:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 min-w-0 text-[11px] font-mono bg-white border border-amber-200 text-amber-900 rounded-lg px-2.5 py-2 break-all select-all">
                  {cronCommand}
                </code>
                <button
                  type="button"
                  onClick={copyCronCommand}
                  className="flex-shrink-0 rounded-lg px-3 py-2 text-xs font-semibold bg-amber-200 text-amber-900 hover:bg-amber-300 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
                  aria-label="Copy cron command to clipboard"
                >
                  Copy
                </button>
              </div>
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={cronAck}
                  onChange={(e) => setCronAck(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                  aria-describedby="cron-ack-label"
                />
                <span
                  id="cron-ack-label"
                  className="text-xs font-semibold text-amber-900 leading-relaxed"
                >
                  I have set up a server cron job (without this, scheduled
                  backups and scans will stop).
                </span>
              </label>
            </div>
          )}

          {/* Conflict list — only shown when conflicts exist */}
          {conflicts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">
                Detected conflicts ({conflicts.length})
              </h3>
              <ul className="space-y-3" aria-label="Plugin conflicts">
                {conflicts.map((conflict, idx) => (
                  <li
                    key={`${conflict.plugin}-${idx}`}
                    className="bg-secondary rounded-2xl p-5 border border-border"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="text-sm font-black text-swiss-navy">
                        {conflict.title}
                      </span>
                      <span
                        className={`text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0 ${severityBadgeClass(conflict.severity)}`}
                      >
                        {conflict.severity}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-neutral-600 leading-relaxed mb-2">
                      {conflict.message}
                    </p>
                    <div className="bg-background rounded-xl p-3 border border-border">
                      <p className="text-xs font-medium text-neutral-500 leading-relaxed">
                        <span className="font-black text-swiss-navy">
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
        <div className="p-6 border-t border-border flex items-center justify-end gap-3 shrink-0 bg-background">
          {/* WCAG 2.4.3: handleCancel restores focus to trigger on close */}
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center justify-center font-black rounded-full transition-all duration-500 uppercase tracking-[0.15em] px-6 py-3 text-xs bg-transparent text-neutral-700 hover:text-neutral-900 hover:bg-secondary active:scale-95"
          >
            {cancel_button_text}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirmDisabled}
            aria-disabled={confirmDisabled}
            title={
              confirmDisabled
                ? "Tick the acknowledgement first to continue"
                : undefined
            }
            className={`inline-flex items-center justify-center gap-2 font-black rounded-full transition-all duration-500 uppercase tracking-[0.15em] px-6 py-3 text-xs border shadow-lg active:scale-95 ${
              confirmDisabled
                ? "bg-red-300 text-white/70 border-red-300/40 shadow-red-300/20 cursor-not-allowed"
                : "bg-red-600 text-white hover:bg-red-700 border-red-700/20 shadow-red-600/30"
            }`}
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
