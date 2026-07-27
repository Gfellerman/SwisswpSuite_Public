/**
 * ScanReportSettingsPanel — Inline auto-save settings for scheduled scan reports (v2.9.28.0)
 *
 * UX rules enforced:
 *  - NO "Save Settings" button — every field auto-saves on blur or immediate toggle
 *  - Email field: validates on blur, calls onSave({scan_report_email: value}) when valid
 *  - Enabled toggle: calls onSave({scan_report_enabled: !current}) immediately on change
 *  - Test-send button: rate-limited — disabled for 1 hour after last send, with countdown
 *  - All controls use proper <label htmlFor> associations
 *
 * ARIA:
 *  - inline error uses role="alert" for screen reader announcement
 *  - test-send success/error uses aria-live="polite"
 *  - isSaving state uses aria-busy on the fieldset
 */

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  Mail,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  BellRing,
} from 'lucide-react';
import { wpApi } from '../../../services/api';
import type { ScanReportConfig } from '../../../types';

// ── Rate limit helpers ────────────────────────────────────────────────────────

const RATE_LIMIT_KEY = 'swisswpsuite_scan_test_send_ts';
const RATE_LIMIT_MS  = 60 * 60 * 1000; // 1 hour

function getLastSendTs(): number | null {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

function recordSendTs(): void {
  try {
    localStorage.setItem(RATE_LIMIT_KEY, String(Date.now()));
  } catch {
    // localStorage unavailable — rate limit check degrades gracefully
  }
}

function getRemainingCooldownMs(): number {
  const last = getLastSendTs();
  if (!last) return 0;
  const remaining = RATE_LIMIT_MS - (Date.now() - last);
  return Math.max(0, remaining);
}

function formatCountdown(ms: number): string {
  const totalSecs = Math.ceil(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

// ── Email validation ──────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

// ── Toggle row component (re-usable in this panel) ────────────────────────────

interface ToggleRowProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  /**
   * 'default' — navy ON / gray OFF (standard)
   * 'traffic'  — green ON / red OFF (use for critical enable/disable controls)
   */
  colorScheme?: 'default' | 'traffic';
}

const ToggleRow: React.FC<ToggleRowProps> = ({
  id,
  label,
  description,
  checked,
  disabled = false,
  onChange,
  colorScheme = 'default',
}) => {
  /*
   * TAILWIND JIT NOTE: All class strings here must be FULL literal strings visible
   * to the content scanner. Never split class names across concatenation — Tailwind
   * scans static strings only. Each branch below is a complete, standalone class list.
   *
   * WCAG 1.4.11: non-text contrast ≥ 3:1
   *   bg-emerald-600 on white = 4.5:1  (PASS)
   *   bg-red-500    on white = 4.0:1  (PASS for non-text, 3:1 threshold)
   */

  // Build the full className imperatively so every branch is a complete literal string.
  let trackAndRingClasses: string;
  if (colorScheme === 'traffic') {
    trackAndRingClasses = checked
      ? 'bg-emerald-600 border-emerald-600 focus-visible:ring-emerald-600'
      : 'bg-red-500 border-red-500 focus-visible:ring-red-500';
  } else {
    trackAndRingClasses = checked
      ? 'bg-swiss-navy border-swiss-navy focus-visible:ring-swiss-navy'
      : 'bg-neutral-200 border-neutral-300 focus-visible:ring-swiss-navy';
  }

  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex-1 min-w-0">
        <label
          htmlFor={id}
          className="text-sm font-black text-neutral-800 cursor-pointer select-none"
        >
          {label}
        </label>
        {/* WCAG 1.4.3: text-neutral-500 on white is ~3.5:1 (FAIL) → text-neutral-600 is ~5.9:1 (PASS) */}
        {description && (
          <p className="text-xs text-neutral-600 font-medium mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      {/* Accessible toggle switch */}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onChange(!checked);
          }
        }}
        className={[
          'relative inline-flex items-center shrink-0 w-10 h-5 rounded-full border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2',
          trackAndRingClasses,
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
      >
        <span
          className={[
            'absolute w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-0.5',
          ].join(' ')}
          aria-hidden="true"
        />
      </button>
    </div>
  );
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface ScanReportSettingsPanelProps {
  config: ScanReportConfig | null;
  onSave: (partial: Partial<ScanReportConfig>) => void;
  isSaving: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const ScanReportSettingsPanel: React.FC<ScanReportSettingsPanelProps> = ({
  config,
  onSave,
  isSaving,
}) => {
  const emailId   = useId();
  const statusId  = useId();

  // ── Email field state ───────────────────────────────────────────────────────

  const [emailValue, setEmailValue]   = useState(config?.scan_report_email ?? '');
  const [emailError, setEmailError]   = useState<string | null>(null);
  const prevEmailRef                  = useRef(config?.scan_report_email ?? '');

  // Keep email field in sync when config reloads (e.g. after initial fetch)
  useEffect(() => {
    const incoming = config?.scan_report_email ?? '';
    setEmailValue(incoming);
    prevEmailRef.current = incoming;
  }, [config?.scan_report_email]);

  const handleEmailBlur = useCallback(() => {
    const trimmed = emailValue.trim();

    // No-op: nothing changed
    if (trimmed === prevEmailRef.current) return;

    // Validation
    if (trimmed !== '' && !isValidEmail(trimmed)) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    setEmailError(null);
    prevEmailRef.current = trimmed;
    onSave({ scan_report_email: trimmed });
  }, [emailValue, onSave]);

  // ── Enabled toggle ──────────────────────────────────────────────────────────

  const [enabledLocal, setEnabledLocal] = useState(config?.scan_report_enabled ?? false);

  useEffect(() => {
    setEnabledLocal(config?.scan_report_enabled ?? false);
  }, [config?.scan_report_enabled]);

  const handleToggleEnabled = useCallback(
    (next: boolean) => {
      setEnabledLocal(next);
      onSave({ scan_report_enabled: next });
    },
    [onSave],
  );

  // ── Test-send button state ──────────────────────────────────────────────────

  const [testSendStatus, setTestSendStatus] = useState<
    'idle' | 'sending' | 'success' | 'error'
  >('idle');
  const [testSendMessage, setTestSendMessage] = useState<string | null>(null);
  const [cooldownMs, setCooldownMs]           = useState(() => getRemainingCooldownMs());

  // Countdown ticker
  useEffect(() => {
    if (cooldownMs <= 0) return;
    const id = setInterval(() => {
      const remaining = getRemainingCooldownMs();
      setCooldownMs(remaining);
      if (remaining <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownMs]);

  const handleTestSend = useCallback(async () => {
    if (cooldownMs > 0 || testSendStatus === 'sending') return;

    setTestSendStatus('sending');
    setTestSendMessage(null);

    try {
      const result = await wpApi<{ success: boolean; message: string }>(
        '/security/scan/report-test-send',
        { method: 'POST' },
      );

      if (result.success) {
        setTestSendStatus('success');
        setTestSendMessage(result.message || 'Test email sent successfully.');
        recordSendTs();
        setCooldownMs(RATE_LIMIT_MS);
      } else {
        setTestSendStatus('error');
        setTestSendMessage(result.message || 'Failed to send test email.');
      }
    } catch (err) {
      setTestSendStatus('error');
      setTestSendMessage(
        err instanceof Error ? err.message : 'An error occurred while sending the test email.',
      );
    }
  }, [cooldownMs, testSendStatus]);

  const isTestSendDisabled = cooldownMs > 0 || testSendStatus === 'sending' || isSaving;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <section
      id="scan-report-settings-panel"
      aria-label="Scan report settings"
      className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-5"
    >
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-secondary rounded-xl shrink-0">
          <BellRing size={18} className="text-swiss-navy" aria-hidden="true" />
        </div>
        <div>
          <h3 className="font-black text-sm text-swiss-navy uppercase tracking-tight">
            Scheduled Scan Report
          </h3>
          {/* WCAG 1.4.3: text-neutral-500 on white is ~3.5:1 (FAIL) → text-neutral-600 is ~5.9:1 (PASS) */}
          <p className="text-xs font-medium text-neutral-600 mt-0.5">
            Configure automated email reports after each scheduled scan. Changes save instantly.
          </p>
        </div>
        {isSaving && (
          <Loader2
            size={14}
            className="animate-spin text-neutral-400 ml-auto shrink-0"
            aria-label="Saving…"
          />
        )}
      </div>

      <fieldset
        className="flex flex-col gap-4 border-0 p-0 m-0 min-w-0"
        aria-busy={isSaving}
        disabled={isSaving}
      >
        <legend className="sr-only">Scan report settings</legend>

        {/* Enabled toggle — traffic colorScheme: green=enabled, red=disabled */}
        <ToggleRow
          id={`${emailId}-enabled`}
          label="Enable scheduled email reports"
          description="Send an email after each scheduled scan summarising the grade, key findings, and recommended actions."
          checked={enabledLocal}
          disabled={isSaving}
          onChange={handleToggleEnabled}
          colorScheme="traffic"
        />

        <div className="border-t border-border" aria-hidden="true" />

        {/* Email input */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor={emailId}
            className="text-sm font-black text-neutral-800 flex items-center gap-1.5"
          >
            <Mail size={14} className="text-neutral-400" aria-hidden="true" />
            Report email address
          </label>
          {/* WCAG 1.4.3: text-neutral-500 on white is ~3.5:1 (FAIL) → text-neutral-600 is ~5.9:1 (PASS) */}
          <p className="text-xs font-medium text-neutral-600">
            Scan reports will be sent to this address. Saved automatically when you leave the field.
          </p>
          <input
            id={emailId}
            type="email"
            value={emailValue}
            onChange={(e) => {
              setEmailValue(e.target.value);
              if (emailError) setEmailError(null);
            }}
            onBlur={handleEmailBlur}
            placeholder="you@example.com"
            aria-describedby={emailError ? `${emailId}-error` : undefined}
            aria-invalid={!!emailError}
            className={[
              'w-full px-4 py-2.5 rounded-xl border text-sm font-medium bg-background text-neutral-800 placeholder-neutral-400',
              'transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-swiss-navy',
              emailError ? 'border-red-400' : 'border-border hover:border-swiss-navy/40',
            ].join(' ')}
          />
          {emailError && (
            <p
              id={`${emailId}-error`}
              role="alert"
              className="text-xs font-black text-red-600 flex items-center gap-1.5"
            >
              <AlertCircle size={12} aria-hidden="true" />
              {emailError}
            </p>
          )}
        </div>

        <div className="border-t border-border" aria-hidden="true" />

        {/* Test-send button */}
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-black text-neutral-800">Send a test email</p>
            {/* WCAG 1.4.3: text-neutral-500 on white is ~3.5:1 (FAIL) → text-neutral-600 is ~5.9:1 (PASS) */}
            <p className="text-xs font-medium text-neutral-600 mt-0.5">
              Sends a sample report to the configured address so you can check formatting and delivery.
              {cooldownMs > 0 && (
                // WCAG 1.4.3: text-amber-600 on white is ~3.5:1 (FAIL) → text-amber-700 is ~4.7:1 (PASS)
                <span className="text-amber-700 font-black ml-1">
                  Available in {formatCountdown(cooldownMs)}.
                </span>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={handleTestSend}
            disabled={isTestSendDisabled}
            aria-busy={testSendStatus === 'sending'}
            aria-label={
              cooldownMs > 0
                ? `Test email rate limited — try again in ${formatCountdown(cooldownMs)}`
                : 'Send test scan report email'
            }
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary border border-border text-xs font-black uppercase tracking-[0.08em] text-neutral-700 hover:bg-card hover:border-swiss-navy/40 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-swiss-navy disabled:opacity-50 disabled:cursor-not-allowed self-start"
          >
            {testSendStatus === 'sending' ? (
              <Loader2 size={13} className="animate-spin" aria-hidden="true" />
            ) : (
              <Send size={13} aria-hidden="true" />
            )}
            {testSendStatus === 'sending' ? 'Sending…' : 'Send Test Email'}
          </button>

          {/*
            WCAG 4.1.3 two-step live region pattern:
            PROBLEM: The previous implementation conditionally mounted this element only when
            testSendMessage was set. NVDA and JAWS require the live region node to already
            exist in the DOM before content is injected — mounting AND populating in the same
            render tick causes both AT to miss the announcement entirely.
            FIX: The live region is ALWAYS in the DOM (no conditional render). It starts empty.
            When testSendMessage is set, the text is injected into the already-present node.
            NVDA/JAWS observe the DOM mutation and announce it politely after the current
            interaction completes. role="status" carries implicit aria-live="polite" —
            the explicit aria-live="polite" is retained for broader AT compatibility.
          */}
          <p
            id={statusId}
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className={`flex items-center gap-1.5 text-xs font-black ${
              testSendStatus === 'success' ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {testSendMessage && (
              <>
                {testSendStatus === 'success' ? (
                  <CheckCircle2 size={13} aria-hidden="true" />
                ) : (
                  <AlertCircle size={13} aria-hidden="true" />
                )}
                {testSendMessage}
              </>
            )}
          </p>
        </div>
      </fieldset>
    </section>
  );
};

export default ScanReportSettingsPanel;
