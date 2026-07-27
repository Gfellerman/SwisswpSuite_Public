/**
 * UpdateGuardCard — Phase 2 UI for the Update Guard feature.
 *
 * Phase 2 adds:
 *  - Live mode selector (OBSERVE / REVIEW FIRST / BLOCK ON MATCH)
 *  - Enable/disable toggle (T4-A)
 *  - URL Allowlist editor for trusted update sources (T4-B, Pro only)
 *  - SnapshotList with Restore + Delete actions
 *  - UpdateReviewPanel for the review queue
 *  - UpdateBlockedBanner for post-block notification
 *
 * ARIA:
 *  - Card: <section> + aria-label="Update Guard" + aria-busy when loading
 *  - Enable toggle: role="switch" + aria-checked + aria-busy (T4-A)
 *  - Mode buttons: role="radio" + aria-checked (mode selector = single-select group)
 *  - Mode group: role="radiogroup" + aria-label
 *  - Loading state: role="progressbar" (indeterminate — no valuemin/valuemax/valuenow)
 *  - Live region: always-rendered role="status" sr-only span (two-step NVDA/JAWS pattern)
 *  - URL allowlist: label + textarea with aria-describedby for hint text (T4-B)
 */

import React, {
  useMemo,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { Shield, Eye, CheckCheck, Lock, Link } from "lucide-react";
import { wpApi } from "../../../services/api";
import { toast } from "sonner";
import type {
  UpdateGuardStatus,
  UpdateGuardReview,
  UpdateSnapshot,
} from "../../../types";
import SnapshotList from "./SnapshotList";
import UpdateReviewPanel from "./UpdateReviewPanel";
import UpdateBlockedBanner from "./UpdateBlockedBanner";

// ── Sub-components ────────────────────────────────────────────────────────────

interface FindingsBadgeProps {
  count: number;
}

const FindingsBadge: React.FC<FindingsBadgeProps> = ({ count }) => {
  let className: string;
  if (count === 0) {
    className = "bg-green-50 text-green-700 border-green-200";
  } else if (count <= 5) {
    className = "bg-amber-50 text-amber-700 border-amber-200";
  } else {
    className = "bg-red-50 text-red-700 border-red-200";
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black border ${className}`}
      aria-label={`${count} finding${count !== 1 ? "s" : ""}`}
    >
      <span aria-hidden="true">
        {count} finding{count !== 1 ? "s" : ""}
      </span>
    </span>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatSizeBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

function formatIsoDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ── Mode definitions ──────────────────────────────────────────────────────────

type GuardMode = "observe" | "review_first" | "block_on_match";

interface ModeConfig {
  id: GuardMode;
  label: string;
  requiresPro: boolean;
}

const MODES: ModeConfig[] = [
  { id: "observe", label: "Observe", requiresPro: false },
  { id: "review_first", label: "Review First", requiresPro: true },
  { id: "block_on_match", label: "Block on Match", requiresPro: true },
];

// ── Props ─────────────────────────────────────────────────────────────────────

export interface UpdateGuardCardProps {
  status: UpdateGuardStatus | null;
  snapshots: UpdateSnapshot[];
  reviews: UpdateGuardReview[];
  isLoading: boolean;
  hasSentinelPro: boolean;
  onSettingsChange: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

const UpdateGuardCard: React.FC<UpdateGuardCardProps> = ({
  status,
  snapshots,
  reviews,
  isLoading,
  hasSentinelPro,
  onSettingsChange,
}) => {
  // Mode save state
  const [savingMode, setSavingMode] = useState<GuardMode | null>(null);
  const [modeError, setModeError] = useState<string | null>(null);

  // T4-A: Enable/disable toggle state
  // Local optimistic state mirrors status.enabled; reset from props when status changes.
  const [localEnabled, setLocalEnabled] = useState<boolean>(
    status?.enabled ?? true,
  );
  const [savingEnabled, setSavingEnabled] = useState(false);
  useEffect(() => {
    if (status !== null) {
      setLocalEnabled(status.enabled);
    }
  }, [status?.enabled]);

  const handleToggleEnabled = useCallback(async () => {
    if (savingEnabled) return;
    const nextEnabled = !localEnabled;
    // Optimistic update
    setLocalEnabled(nextEnabled);
    setSavingEnabled(true);
    try {
      await wpApi("/update-guard/settings", {
        method: "POST",
        body: JSON.stringify({
          enabled: nextEnabled,
          mode: status?.mode ?? "observe",
        }),
      });
      toast.success(`Update Guard ${nextEnabled ? "enabled" : "disabled"}.`);
      onSettingsChange();
    } catch (err) {
      // Revert optimistic update on failure
      setLocalEnabled(!nextEnabled);
      toast.error(
        err instanceof Error ? err.message : "Failed to update setting.",
      );
    } finally {
      setSavingEnabled(false);
    }
  }, [localEnabled, savingEnabled, status?.mode, onSettingsChange]);

  // T4-B: URL allowlist editor state (Pro only)
  // Textarea content is newline-separated URLs; parsed to string[] on save.
  const [allowlistText, setAllowlistText] = useState<string>(() =>
    (status?.url_allowlist ?? []).join("\n"),
  );
  const [savingAllowlist, setSavingAllowlist] = useState(false);
  // Keep textarea in sync when status prop changes (e.g. after onSettingsChange refetch)
  useEffect(() => {
    if (status !== null) {
      setAllowlistText((status.url_allowlist ?? []).join("\n"));
    }
  }, [status?.url_allowlist]);

  const handleSaveAllowlist = useCallback(async () => {
    if (savingAllowlist) return;
    const parsed = allowlistText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    setSavingAllowlist(true);
    try {
      await wpApi("/update-guard/settings", {
        method: "POST",
        body: JSON.stringify({
          mode: status?.mode ?? "observe",
          url_allowlist: parsed,
        }),
      });
      toast.success("URL allowlist saved.");
      onSettingsChange();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save allowlist.",
      );
    } finally {
      setSavingAllowlist(false);
    }
  }, [allowlistText, savingAllowlist, status?.mode, onSettingsChange]);

  // Snapshot storage totals
  const storageSummary = useMemo(() => {
    if (snapshots.length === 0) return null;
    const totalBytes = snapshots.reduce((sum, s) => sum + s.size_bytes, 0);
    return {
      count: snapshots.length,
      totalMb: formatSizeBytes(totalBytes),
    };
  }, [snapshots]);

  // Determine if last_verdict has data (non-empty object)
  const hasVerdict =
    status !== null &&
    status.last_verdict !== null &&
    typeof status.last_verdict === "object" &&
    "slug" in status.last_verdict &&
    !!(status.last_verdict as { slug?: string }).slug;

  const verdict = hasVerdict
    ? (status!.last_verdict as {
        slug: string;
        type: "post_apply_verify" | "staged_scan";
        findings_count: number;
        timestamp: string;
      })
    : null;

  // WCAG 4.1.3 — Two-step live region pattern (NVDA/JAWS requirement).
  const [verdictAnnouncement, setVerdictAnnouncement] = useState("");
  useEffect(() => {
    if (verdict) {
      const scanLabel =
        verdict.type === "post_apply_verify"
          ? "Post-Apply Verify"
          : "Staged Scan";
      setVerdictAnnouncement(
        `Last verdict: ${verdict.slug}, ${verdict.findings_count} finding${verdict.findings_count !== 1 ? "s" : ""}, ${scanLabel}, ${formatIsoDate(verdict.timestamp)}`,
      );
    } else {
      setVerdictAnnouncement("");
    }
  }, [verdict]);

  // Mode selector handler
  const handleModeChange = useCallback(
    async (mode: GuardMode) => {
      if (!hasSentinelPro && mode !== "observe") return;
      if (status?.mode === mode) return;
      if (savingMode !== null) return;

      setModeError(null);
      setSavingMode(mode);
      try {
        await wpApi("/update-guard/settings", {
          method: "POST",
          body: JSON.stringify({ mode }),
        });
        onSettingsChange();
      } catch (err) {
        setModeError(
          err instanceof Error ? err.message : "Failed to save mode.",
        );
      } finally {
        setSavingMode(null);
      }
    },
    [status?.mode, hasSentinelPro, savingMode, onSettingsChange],
  );

  const activeMode: GuardMode = status?.mode ?? "observe";

  // APG Radio Button Group: arrow-key navigation between options.
  // Tab moves focus INTO the group (landing on the checked radio) then OUT.
  // ArrowRight/ArrowDown moves to the next option; ArrowLeft/ArrowUp moves to previous.
  // This satisfies WCAG 2.1.1 Keyboard for the radiogroup pattern.
  const radioGroupRef = useRef<HTMLDivElement>(null);

  const handleRadioKeyDown = useCallback(
    (e: React.KeyboardEvent, currentIndex: number) => {
      const group = radioGroupRef.current;
      if (!group) return;

      const radios = Array.from(
        group.querySelectorAll<HTMLButtonElement>(
          '[role="radio"]:not([aria-disabled="true"])',
        ),
      );

      let targetIndex = -1;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        // Find the next non-disabled radio in the full MODES array from the current position
        for (let i = currentIndex + 1; i < MODES.length; i++) {
          const candidate = group.querySelector<HTMLButtonElement>(
            `[role="radio"][data-mode="${MODES[i].id}"]`,
          );
          if (candidate && candidate.getAttribute("aria-disabled") !== "true") {
            targetIndex = i;
            candidate.focus();
            break;
          }
        }
        // Wrap to first non-disabled if we hit the end
        if (targetIndex === -1) {
          radios[0]?.focus();
        }
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        for (let i = currentIndex - 1; i >= 0; i--) {
          const candidate = group.querySelector<HTMLButtonElement>(
            `[role="radio"][data-mode="${MODES[i].id}"]`,
          );
          if (candidate && candidate.getAttribute("aria-disabled") !== "true") {
            targetIndex = i;
            candidate.focus();
            break;
          }
        }
        // Wrap to last non-disabled if we hit the beginning
        if (targetIndex === -1) {
          radios[radios.length - 1]?.focus();
        }
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const modeConfig = MODES[currentIndex];
        if (
          modeConfig &&
          !(modeConfig.requiresPro && !hasSentinelPro) &&
          savingMode === null
        ) {
          handleModeChange(modeConfig.id);
        }
      }
    },
    [hasSentinelPro, savingMode, handleModeChange],
  );

  return (
    <section
      aria-label="Update Guard"
      aria-busy={isLoading}
      className="bg-card border border-border rounded-2xl p-6"
    >
      {/* ── Header row ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-secondary text-neutral-700 shrink-0">
            <Shield size={20} aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-black uppercase tracking-[0.08em] text-swiss-navy">
                Update Guard
              </h2>
              {/* Phase 2 badge */}
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black uppercase tracking-[0.1em] bg-blue-50 text-blue-700 border border-blue-200"
                aria-label="Phase 2 — Virtual Patching"
              >
                <span aria-hidden="true">Phase 2</span>
              </span>
            </div>
            <p className="text-xs text-neutral-600 font-medium mt-0.5">
              Monitors plugin updates, captures snapshots, and enforces review
              policies.
            </p>
          </div>
        </div>

        {/* T4-A: Enable/disable toggle — placed in header right side */}
        {status !== null && !isLoading && (
          <div className="flex items-center gap-2 shrink-0">
            {/* Visible status label */}
            <span
              className="text-xs font-black uppercase tracking-[0.08em] text-neutral-600"
              id="update-guard-enabled-label"
            >
              {localEnabled ? "Enabled" : "Disabled"}
            </span>

            {/*
              ARIA: role="switch" expresses binary on/off semantics (WAI-ARIA 1.1).
              aria-checked must be the string "true"/"false" (not boolean) for
              widest screen-reader compatibility (VoiceOver/NVDA/JAWS).
              aria-busy signals in-flight state so AT announces "updating".
              onKeyDown handles Enter/Space per WCAG 2.1.1 Keyboard requirement.
            */}
            <button
              type="button"
              role="switch"
              aria-checked={localEnabled ? "true" : "false"}
              aria-labelledby="update-guard-enabled-label"
              aria-busy={savingEnabled}
              aria-label={
                localEnabled ? "Disable Update Guard" : "Enable Update Guard"
              }
              onClick={handleToggleEnabled}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleToggleEnabled();
                }
              }}
              disabled={savingEnabled}
              // Tailwind JIT safety: two complete literal class strings, no interpolation.
              className={
                localEnabled
                  ? "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-swiss-navy transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-swiss-navy focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
                  : "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-neutral-300 transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-swiss-navy focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
              }
            >
              <span className="sr-only">
                {localEnabled ? "Disable Update Guard" : "Enable Update Guard"}
              </span>
              {/* Tailwind JIT safety: complete literal strings for translate classes */}
              <span
                aria-hidden="true"
                className={
                  localEnabled
                    ? "inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out translate-x-4"
                    : "inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out translate-x-0"
                }
              />
            </button>
          </div>
        )}
      </div>

      {/* ── Loading state ─────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="py-8 flex flex-col items-center gap-3">
          {/* aria-valuenow intentionally omitted — absence signals indeterminate to AT (WCAG 4.1.2) */}
          <div
            role="progressbar"
            aria-label="Loading Update Guard status"
            aria-valuemin={0}
            aria-valuemax={100}
            className="w-full max-w-xs h-1.5 bg-secondary rounded-full overflow-hidden"
          >
            <div
              className="h-full w-1/2 bg-swiss-navy/40 rounded-full animate-pulse"
              aria-hidden="true"
            />
          </div>
          <p className="text-xs text-neutral-600 font-medium">
            Loading Update Guard…
          </p>
        </div>
      )}

      {!isLoading && (
        <>
          {/* ── Blocked banner (above mode selector) ──────────────────────── */}
          <UpdateBlockedBanner status={status} onOverride={onSettingsChange} />

          {/* ── Mode selector ─────────────────────────────────────────────── */}
          <div className="mb-5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="text-xs font-black uppercase tracking-[0.08em] text-neutral-600 shrink-0"
                id="update-guard-mode-label"
              >
                Mode:
              </span>

              {/*
                WCAG 1.3.1 + 4.1.2 + 2.1.1: Using role="radiogroup" + role="radio" + aria-checked
                to express single-select semantics. APG Radio Button Group pattern:
                - Tab moves focus INTO the group (landing on checked radio) then OUT.
                - ArrowRight/ArrowDown moves to next option; ArrowLeft/ArrowUp to previous.
                - Only the checked radio has tabindex="0"; all others use tabindex="-1".
                - Locked options are excluded from arrow-key cycling (skip over them).
              */}
              <div
                role="radiogroup"
                aria-labelledby="update-guard-mode-label"
                className="flex flex-wrap gap-1.5"
                ref={radioGroupRef}
              >
                {MODES.map((modeConfig, modeIndex) => {
                  const isActive = activeMode === modeConfig.id;
                  const isLocked = modeConfig.requiresPro && !hasSentinelPro;
                  const isSaving = savingMode === modeConfig.id;

                  // APG: only the checked radio is in the tab order (tabindex="0").
                  // Locked options still get tabindex="-1" (focusable programmatically
                  // but not reachable by Tab — arrow-key cycling skips them).
                  const tabIndex = isActive ? 0 : -1;

                  // Tailwind JIT safety: all class strings are complete literals (no interpolation)
                  let buttonClass: string;
                  if (isActive) {
                    buttonClass =
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-[0.08em] border bg-swiss-navy text-white border-swiss-navy cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-swiss-navy";
                  } else if (isLocked) {
                    buttonClass =
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-[0.08em] border bg-secondary text-neutral-500 border-border cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-swiss-navy";
                  } else {
                    buttonClass =
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-[0.08em] border bg-secondary text-neutral-700 border-border hover:border-swiss-navy hover:text-swiss-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-swiss-navy transition-colors";
                  }

                  // WCAG 4.1.2: aria-label on individual radio buttons must NOT include
                  // the group label prefix ("Mode:") — the radiogroup's aria-labelledby
                  // already provides "Mode:" context. Repeating it causes JAWS to announce
                  // "Mode: Observe, Mode: Review First, Mode: Block on Match" as a stream.
                  const ariaLabel = isLocked
                    ? `${modeConfig.label} — requires Pro`
                    : isSaving
                      ? `${modeConfig.label} — saving`
                      : modeConfig.label;

                  return (
                    <button
                      key={modeConfig.id}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      aria-label={ariaLabel}
                      aria-busy={isSaving}
                      // WCAG 2.1.1: aria-disabled keeps button reachable to AT (announces
                      // the disabled state) while still communicating it cannot be activated.
                      // Native `disabled` would silently remove it from the tab order.
                      aria-disabled={isLocked || isSaving ? true : undefined}
                      // APG tabindex management: only checked radio is in tab order.
                      tabIndex={tabIndex}
                      // data-mode used by handleRadioKeyDown to locate siblings by mode ID.
                      data-mode={modeConfig.id}
                      onClick={() =>
                        !isLocked &&
                        !isSaving &&
                        handleModeChange(modeConfig.id)
                      }
                      // Arrow-key navigation handled here (APG pattern).
                      // Enter/Space activation also handled here for locked/saving guard.
                      onKeyDown={(e) => handleRadioKeyDown(e, modeIndex)}
                      className={buttonClass}
                    >
                      {isActive && !isSaving && (
                        <CheckCheck size={12} aria-hidden="true" />
                      )}
                      {isSaving && (
                        <span
                          className="w-3 h-3 border border-white/60 border-t-white rounded-full animate-spin"
                          aria-hidden="true"
                        />
                      )}
                      {isLocked && !isActive && (
                        <Lock size={12} aria-hidden="true" />
                      )}
                      <span aria-hidden="true">{modeConfig.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mode error */}
            {modeError && (
              <span
                role="alert"
                className="block text-xs text-red-600 font-medium mt-1.5"
              >
                {modeError}
              </span>
            )}
          </div>

          {/*
            WCAG 4.1.3 / NVDA two-step pattern:
            - role="status" implicitly sets aria-live="polite" + aria-atomic="true".
            - Explicit aria-live and aria-atomic are OMITTED — they are redundant here
              and the duplication has caused VoiceOver to double-announce in Safari.
            - Node is always in the DOM; content is set via useEffect (async),
              which fires after the DOM node exists — satisfying the two-step requirement.
          */}
          <span role="status" className="sr-only">
            {verdictAnnouncement}
          </span>

          {/* ── Last verdict panel ────────────────────────────────────────── */}
          {verdict && (
            <div className="mb-5 rounded-xl border border-border bg-secondary/50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-neutral-600 mb-2">
                Last Verdict
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <span className="font-medium text-neutral-800">
                  <span className="text-xs font-black text-neutral-600 mr-1">
                    Plugin:
                  </span>
                  <code className="font-mono text-xs bg-card border border-border rounded px-1.5 py-0.5">
                    {verdict.slug}
                  </code>
                </span>
                <FindingsBadge count={verdict.findings_count} />
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black border bg-blue-50 text-blue-700 border-blue-200"
                  aria-label={`Scan type: ${verdict.type}`}
                >
                  <span aria-hidden="true">
                    {verdict.type === "post_apply_verify"
                      ? "Post-Apply Verify"
                      : "Staged Scan"}
                  </span>
                </span>
                <span className="text-xs text-neutral-600 font-medium">
                  {formatIsoDate(verdict.timestamp)}
                </span>
              </div>
            </div>
          )}

          {/*
            WCAG 4.1.3 / live region always-mounted rule (A-3 fix):
            UpdateReviewPanel contains an aria-live="polite" <ul>. If this component
            mounts and unmounts with the queue, the live region is destroyed when the
            last item is approved/rejected. The next queue item would mount with content
            already in it, and NVDA/JAWS would not announce it.

            Fix: always render UpdateReviewPanel (with reviews={reviews} which may be []).
            The component renders null internally when reviews.length === 0, but its
            live region WILL be in the DOM if we restructure it. We pass `alwaysMount`
            signal via the reviews array: empty array = render hidden live region only.

            Note: UpdateReviewPanel itself must be updated to always render its <ul>
            (even when empty) and only conditionally render the header/items.
            See UpdateReviewPanel.tsx for the corresponding fix.
          */}
          <UpdateReviewPanel
            reviews={reviews}
            onQueueChange={onSettingsChange}
          />

          {/* ── Snapshot list ─────────────────────────────────────────────── */}
          {snapshots.length > 0 ? (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-neutral-600">
                  Snapshots
                </p>
                {storageSummary && (
                  <span className="text-xs text-neutral-600 font-medium">
                    {storageSummary.count} snapshot
                    {storageSummary.count !== 1 ? "s" : ""} ·{" "}
                    {storageSummary.totalMb} used
                  </span>
                )}
              </div>
              <SnapshotList
                snapshots={snapshots}
                onRestoreComplete={onSettingsChange}
                onDeleteComplete={onSettingsChange}
              />
            </div>
          ) : (
            // ── Empty state ──────────────────────────────────────────────
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Eye
                size={28}
                className="text-neutral-400 mb-2"
                aria-hidden="true"
              />
              <p className="text-sm font-black text-neutral-600">
                No updates intercepted yet.
              </p>
              <p className="text-xs text-neutral-600 font-medium mt-1">
                Update Guard is watching.
              </p>
            </div>
          )}

          {/* T4-B: URL Allowlist editor — Pro tier only ─────────────── */}
          {hasSentinelPro ? (
            <div className="mt-5 pt-5 border-t border-border">
              <div className="flex items-center gap-2 mb-2">
                <Link
                  size={14}
                  className="text-neutral-500 shrink-0"
                  aria-hidden="true"
                />
                <p
                  className="text-xs font-black uppercase tracking-[0.08em] text-neutral-600"
                  id="update-guard-allowlist-label"
                >
                  Trusted Update Sources
                </p>
              </div>
              <p
                className="text-xs text-neutral-600 font-medium mb-3"
                id="update-guard-allowlist-hint"
              >
                Allow updates from these custom URLs without scanning. Enter one
                URL per line.
              </p>
              <textarea
                id="update-guard-allowlist-textarea"
                aria-labelledby="update-guard-allowlist-label"
                aria-describedby="update-guard-allowlist-hint"
                aria-label="Trusted update source URLs, one per line"
                rows={4}
                value={allowlistText}
                onChange={(e) => setAllowlistText(e.target.value)}
                disabled={savingAllowlist}
                placeholder={
                  "https://example.com/custom-plugin.zip\nhttps://trusted-source.com/"
                }
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs font-mono text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-swiss-navy focus:border-swiss-navy disabled:opacity-60 disabled:cursor-not-allowed resize-none custom-scrollbar"
              />
              <div className="flex items-center justify-end mt-2">
                <button
                  type="button"
                  onClick={handleSaveAllowlist}
                  disabled={savingAllowlist}
                  aria-busy={savingAllowlist}
                  aria-label="Save trusted update source URLs"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-swiss-navy text-white text-xs font-black hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-swiss-navy disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  {savingAllowlist ? (
                    <>
                      <span
                        className="w-3 h-3 border border-white/60 border-t-white rounded-full animate-spin"
                        aria-hidden="true"
                      />
                      Saving…
                    </>
                  ) : (
                    "Save Allowlist"
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* ── Pro gate / upgrade notice ──────────────────────────────── */
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-neutral-600 font-medium">
                <Lock
                  size={12}
                  className="inline mr-1 text-neutral-500"
                  aria-hidden="true"
                />
                Advanced blocking, review controls, and trusted URL allowlist
                available with{" "}
                <a
                  href="https://swisswpsecure.com/#pricing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-black text-swiss-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-swiss-navy rounded"
                >
                  Pro
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
                .
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default UpdateGuardCard;
