import React, { useCallback, useEffect, useRef, useState } from "react";
import { ScanSearch, ShieldCheck, X } from "lucide-react";

interface SentinelM5ConsentModalProps {
  isOpen: boolean;
  siteUrl: string;
  onConsent: () => void;
  onCancel: () => void;
}

const CONSENT_KEY = "swisswpsuite_m5_consent_v1";
const CONSENT_TTL_DAYS = 90;
const CONSENT_TTL_MS = CONSENT_TTL_DAYS * 24 * 60 * 60 * 1000;

/**
 * Selector string that identifies all focusable elements inside the dialog.
 * Used by BOTH the Tab-trap handler and the initial-focus logic so both
 * always operate on the same element set.
 *
 * WHY: The original code used a shorter selector for initial focus than for
 * the Tab-trap. If the first focusable element were a `select` or a
 * `[tabindex]` element, initial focus would land on the wrong element while
 * the Tab key would still trap correctly — an inconsistency that is hard to
 * spot during manual QA.
 */
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getStoredConsent(): { timestamp: number } | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { timestamp: number };
  } catch {
    return null;
  }
}

function storeConsent(): void {
  try {
    localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({ timestamp: Date.now() })
    );
  } catch {
    // localStorage may be unavailable in restricted environments — silently ignore
  }
}

function isConsentValid(): boolean {
  const stored = getStoredConsent();
  if (!stored) return false;
  return Date.now() - stored.timestamp < CONSENT_TTL_MS;
}

/**
 * PARENT CONTRACT — WCAG 1.3.1 / VoiceOver fix:
 * VoiceOver on macOS/iOS does not honor aria-modal="true". When this modal
 * is open, the parent SHOULD apply `inert` to all sibling DOM nodes that
 * contain background content (the WP admin sidebar and main content area)
 * to prevent VoiceOver's virtual cursor from escaping the dialog.
 *
 * Example in parent:
 *   <main id="swisswp-main" inert={isConsentModalOpen ? true : undefined}>
 *     ...background content...
 *   </main>
 *   <SentinelM5ConsentModal isOpen={isConsentModalOpen} ... />
 *
 * `inert` is supported in Chrome 102+, Firefox 112+, Safari 15.5+.
 */
export const SentinelM5ConsentModal: React.FC<SentinelM5ConsentModalProps> = ({
  isOpen,
  siteUrl,
  onConsent,
  onCancel,
}) => {
  const [rememberConsent, setRememberConsent] = useState(true);
  const dialogRef = useRef<HTMLDivElement>(null);
  // WCAG 2.4.3: capture the element that held focus when the modal opened,
  // so we can return focus to it on close. Without this, focus drops to
  // document.body and NVDA/JAWS reset the virtual cursor to the page top.
  const triggerRef = useRef<HTMLElement | null>(null);

  // Save the trigger element the moment the modal becomes visible.
  // This effect intentionally runs before the focus-trap effect (React
  // runs effects in declaration order) so triggerRef is set before focus
  // moves into the dialog.
  useEffect(() => {
    if (isOpen && !isConsentValid()) {
      triggerRef.current = document.activeElement as HTMLElement;
    }
  }, [isOpen]);

  // If consent was previously stored and is still valid, skip the modal
  useEffect(() => {
    if (isOpen && isConsentValid()) {
      onConsent();
    }
  }, [isOpen, onConsent]);

  // WCAG 2.4.3: wrapper that restores focus to the trigger element before
  // calling the parent callback. Ensures the virtual cursor returns to the
  // exact button that opened the modal rather than dropping to document.body.
  // useCallback gives this a stable reference so the keydown effect below
  // does not re-register on every render.
  const handleCancel = useCallback(() => {
    triggerRef.current?.focus();
    onCancel();
  }, [onCancel]);

  // Trap focus inside the modal: Tab cycles between focusable elements
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // WCAG 2.4.3: handleCancel restores focus before unmounting
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
    // WHY: Uses the same FOCUSABLE_SELECTOR as the Tab-trap so both always
    // agree on which element is "first".
    const firstFocusable =
      dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    firstFocusable?.focus();

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleCancel]);

  const handleAuthorize = () => {
    if (rememberConsent) {
      storeConsent();
    }
    // WCAG 2.4.3: restore focus to trigger before calling onConsent
    triggerRef.current?.focus();
    onConsent();
  };

  // Do not render if stored consent is valid (useEffect above will fire onConsent)
  if (!isOpen || isConsentValid()) return null;

  // WHY no aria-hidden on backdrop: The WAI-ARIA spec forbids aria-hidden="true"
  // on any ancestor of an element with role="dialog". Doing so hides the entire
  // dialog — including its role — from screen readers. The backdrop must be
  // presentational only; ARIA containment is handled by aria-modal="true" on
  // the inner dialog element.
  return (
    <div className="bg-swiss-navy/50 animate-in fade-in fixed inset-0 z-[99996] flex items-center justify-center p-4 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="m5-consent-title"
        aria-describedby="m5-consent-desc"
        className="bg-card shadow-premium border-border animate-in zoom-in-95 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border duration-300"
      >
        {/* Header */}
        <div className="border-border flex shrink-0 items-start justify-between gap-4 border-b p-8">
          <div className="flex items-center gap-4">
            <div className="bg-brand-accent/10 shrink-0 rounded-2xl p-3">
              <ScanSearch
                size={24}
                className="text-brand-accent"
                aria-hidden="true"
              />
            </div>
            <div>
              <h2
                id="m5-consent-title"
                className="text-swiss-navy text-xl font-black tracking-tight uppercase"
              >
                Before We Probe Your Site
              </h2>
              <p
                id="m5-consent-desc"
                className="mt-1 text-xs leading-relaxed font-medium text-neutral-500"
              >
                Module 5 performs non-destructive active probes to verify
                real-world exploitability.
              </p>
            </div>
          </div>
          {/* WCAG 2.4.3: handleCancel restores focus to the trigger element on close */}
          <button
            type="button"
            onClick={handleCancel}
            aria-label="Cancel deep scan"
            className="hover:text-swiss-navy hover:bg-background shrink-0 rounded-xl border border-transparent p-2 text-neutral-400 transition-all"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 space-y-6 overflow-y-auto p-8">
          {/* What IS included */}
          <div>
            <h3 className="mb-3 text-xs font-black tracking-widest text-neutral-500 uppercase">
              What the deep scan includes
            </h3>
            <ul className="space-y-2" aria-label="Deep scan inclusions">
              {[
                "Path traversal verification against your REST API endpoints",
                "XML-RPC capability enumeration (read-only probes)",
                "Authentication bypass pattern testing (no credential submission)",
                "File disclosure checks on common sensitive paths",
                "HTTP header security validation",
              ].map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 text-sm text-neutral-700"
                >
                  <ShieldCheck
                    size={14}
                    className="mt-0.5 shrink-0 text-emerald-500"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* What is NOT included */}
          <div className="bg-secondary border-border rounded-2xl border p-5">
            <h3 className="mb-3 text-xs font-black tracking-widest text-neutral-500 uppercase">
              NOT included
            </h3>
            <ul className="list-inside list-disc space-y-1 text-xs font-medium text-neutral-600">
              <li>No writes or data modifications</li>
              <li>No brute-force credential testing</li>
              <li>No destructive payloads or exploits</li>
              <li>No external data transmission (all probes are local)</li>
            </ul>
          </div>

          {/* Authorization text */}
          <div className="bg-background border-border rounded-xl border p-5">
            <p className="text-xs leading-relaxed font-medium text-neutral-700">
              By clicking{" "}
              <strong className="text-swiss-navy font-black">
                I Authorize
              </strong>
              , you confirm that you are the authorized owner or administrator
              of{" "}
              <code className="bg-secondary rounded px-1.5 py-0.5 font-mono text-xs text-neutral-800">
                {siteUrl}
              </code>{" "}
              and consent to SwissSuite running non-destructive security probes
              against it.
            </p>
          </div>

          {/*
            WHY no aria-label on the checkbox: the <label htmlFor="m5-remember-consent">
            association already provides the accessible name. Adding aria-label on
            the input overrides the visible label text, causing screen readers to
            announce the aria-label string instead — a mismatch between what sighted
            and non-sighted users hear.
          */}
          <label
            className="flex cursor-pointer items-center gap-3 select-none"
            htmlFor="m5-remember-consent"
          >
            <input
              id="m5-remember-consent"
              type="checkbox"
              checked={rememberConsent}
              onChange={(e) => setRememberConsent(e.target.checked)}
              className="border-border text-swiss-navy focus:ring-swiss-navy h-4 w-4 rounded"
            />
            <span className="text-xs font-medium text-neutral-600">
              Don't ask me again for {CONSENT_TTL_DAYS} days
            </span>
          </label>
        </div>

        {/* Footer buttons */}
        <div className="border-border bg-background flex shrink-0 items-center justify-end gap-3 border-t p-6">
          {/* WCAG 2.4.3: handleCancel restores focus to the trigger element on close */}
          <button
            type="button"
            onClick={handleCancel}
            className="hover:bg-secondary inline-flex items-center justify-center rounded-full bg-transparent px-6 py-3 text-xs font-black tracking-[0.15em] text-neutral-700 uppercase transition-all duration-500 hover:text-neutral-900 active:scale-95"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAuthorize}
            className="bg-brand-accent text-foreground hover:bg-brand-accent/80 border-brand-accent/20 shadow-brand-accent/30 inline-flex items-center justify-center gap-2 rounded-full border px-6 py-3 text-xs font-black tracking-[0.15em] uppercase shadow-lg transition-all duration-500 active:scale-95"
          >
            <ScanSearch size={14} aria-hidden="true" />I Authorize — Run Deep
            Scan
          </button>
        </div>
      </div>
    </div>
  );
};

export default SentinelM5ConsentModal;
