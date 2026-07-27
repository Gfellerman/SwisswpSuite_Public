/**
 * ScanResultPanel — Branching result renderer (v2.9.28.0)
 *
 * Renders scan results for ai-audit, malware, and full-ai scan types.
 * Handles three display states:
 *   1. Loading — indeterminate progress bar
 *   2. Result available — type-specific result layout
 *   3. No result — returns null (nothing rendered)
 *
 * ARIA:
 *  - Loading state: role="progressbar" + aria-label + aria-valuenow={undefined}
 *  - Result container: role="region" + aria-label
 *  - Findings list: role="list"
 */

import React, { useState } from "react";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Bug,
  Shield,
  ExternalLink,
  Loader2,
  ChevronDown,
  ChevronUp,
  ShieldOff,
  Archive,
  Wrench,
  Sparkles,
  Lock,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  isFreeEdition,
  hasEditionMismatch,
  PRO_DOWNLOAD_URL,
} from "../../../lib/edition";
import type {
  AiAuditResult,
  MalwareScanResult,
  FullAiScanResult,
} from "../../../types";
import type { ScanTypeValue } from "./scanConstants";

// ── v2.9.28.22 — Filter non-analyzable findings from bulk "Check with AI" ─
//
// Findings about files that don't exist on disk (readme.html, missing core
// files, etc.) return 400 (v2.9.28.35, was 404) from /analyze-file — there is
// no content to scan. PHP classify_integrity_finding() marks these with
// specific categories:
//   known_safe_missing — deleted for hardening (readme.html, license.txt, etc.)
//   core_missing       — WordPress core files absent from disk
//   bundled_plugin     — can be missing OR modified; check title for "missing"
//   theme_modified     — can be missing OR modified; check title for "missing"
// Filtering them before the API call prevents the "none of N files could be
// analyzed" toast that confused users running bulk AI on Full AI scan results.
/**
 * Returns true when the finding is about a file that does not exist on disk.
 * Sending these to /analyze-file returns 400 — there is no content to analyze.
 */
function isMissingFileFinding(f: {
  integrity_category?: string;
  title: string;
}): boolean {
  const ic = f.integrity_category ?? "";
  const alwaysMissing = new Set(["known_safe_missing", "core_missing"]);
  if (alwaysMissing.has(ic)) return true;
  if (ic === "bundled_plugin" || ic === "theme_modified") {
    return f.title.toLowerCase().includes("missing");
  }
  return false;
}

// ── v2.9.28.35 — File-analyzable categorizer + path extraction ────────────
//
// PRIOR BUG (fixed here): the bulk "Check with AI" flow was sending raw
// `finding.evidence` to POST /security/analyze-file as the `file` parameter.
// For FILE findings that works ("wp-content/plugins/foo/bar.php"). For
// CONFIG/NETWORK/HEADER/PLUGIN-INVENTORY findings, evidence is descriptive
// text such as:
//   "wp-config.php (0644) — group or world readable"
//   "No CF-Ray or CF-Connecting-IP headers detected"
//   "[{\"name\":\"Cart Abandonment Recovery...\"}]"
// which caused PHP `file_exists()` to fail → 404/400 error → silent UI failure.
//
// The fix classifies each finding BEFORE the API call and extracts a clean
// file path when the finding really targets a file on disk. Non-file findings
// receive a friendly inline message instead of being sent to the API.
//
// Decision order (first match wins):
//   1. If the finding is about a missing file → NOT analyzable.
//   2. If fix_type is a canonical file-fix (chmod_*, delete_*, disable_wp_debug)
//      → analyzable; extract the path from evidence.
//   3. If fix_type is navigate_hardening / manual / empty → configuration
//      finding; NOT analyzable.
//   4. Fallback: extract a path-like token from evidence (a word ending in
//      .php/.js/.html/.htaccess/.htm/.ini/.conf/.sql/.txt). If one exists,
//      treat as analyzable; else NOT analyzable.
//
// Canonical fix_type allowlist is sourced from the PHP backend:
// see plugin/includes/api/class-swisswpsuite-api.php::fix_security_finding()
// ($allowed_fix_types near line 10313).
type AnalyzableFinding = {
  evidence?: string;
  fix_type?: string;
  integrity_category?: string;
  title: string;
};

const FILE_FIX_TYPES = new Set([
  "chmod_file",
  "chmod_dir",
  "chmod_special",
  "delete_file",
  "delete_sensitive_file",
]);

const FILE_EXTENSIONS_REGEX =
  /[A-Za-z0-9_./-]+\.(?:php|js|css|html?|htaccess|ini|conf|sql|txt|json|xml)\b/i;

/**
 * Extract a clean file path from an evidence string. Evidence strings from
 * Sentinel L1 can be either a pure path ("wp-content/plugins/foo/bar.php")
 * or a path followed by descriptive text ("wp-config.php (0644) — group
 * or world readable"). This function returns the longest leading
 * whitespace-delimited token that looks like a filename; if no such token
 * is found it returns null.
 */
function extractPathFromEvidence(evidence: string): string | null {
  const trimmed = evidence.trim();
  if (!trimmed) return null;

  // First-token preference: take everything up to the first whitespace.
  const firstToken = trimmed.split(/\s+/)[0];
  if (firstToken && FILE_EXTENSIONS_REGEX.test(firstToken)) {
    // Strip any trailing punctuation (quotes, commas, parens, colons).
    return firstToken.replace(/[,:;'")\]]+$/, "").replace(/^[('[]+/, "");
  }

  // Fallback: first filename-like match anywhere in the string.
  const match = trimmed.match(FILE_EXTENSIONS_REGEX);
  return match ? match[0] : null;
}

/**
 * Classify a finding for the bulk "Check with AI" flow.
 *   - { analyzable: true, extractedPath } → send extractedPath to /analyze-file
 *   - { analyzable: false } → show inline "configuration check — no file to
 *     analyze" message; do NOT call the API
 */
function classifyFindingForAi(f: AnalyzableFinding): {
  analyzable: boolean;
  extractedPath: string | null;
} {
  // Rule 1: missing-file findings are never analyzable.
  if (isMissingFileFinding(f))
    return { analyzable: false, extractedPath: null };

  const evidence = (f.evidence ?? "").trim();
  const fixType = (f.fix_type ?? "").trim();

  // Rule 2: canonical file-fix types — the finding explicitly targets a file.
  if (FILE_FIX_TYPES.has(fixType)) {
    const path = evidence ? extractPathFromEvidence(evidence) : null;
    if (path) return { analyzable: true, extractedPath: path };
    // Has a file fix_type but we couldn't parse a path — fall through to
    // rule 4 instead of sending garbage to the API.
  }

  // Special case: disable_wp_debug always targets wp-config.php.
  if (fixType === "disable_wp_debug") {
    return { analyzable: true, extractedPath: "wp-config.php" };
  }

  // Rule 3: configuration-only fix types — never analyzable with AI.
  if (fixType === "navigate_hardening" || fixType === "manual") {
    return { analyzable: false, extractedPath: null };
  }

  // Rule 4: heuristic fallback — if evidence contains a filename-like token,
  // treat as analyzable. This covers findings with empty fix_type but real
  // file evidence (common for M1/M2 modules).
  if (evidence) {
    const path = extractPathFromEvidence(evidence);
    if (path) return { analyzable: true, extractedPath: path };
  }

  return { analyzable: false, extractedPath: null };
}

// ── v2.9.28.21 — Bulk "Check with AI" safety cap ──────────────────────────
//
// Live test (2026-04-23) showed users clicking "Check with AI" with 433+ files
// selected, triggering 433 sequential AI calls, burning tokens, and flooding
// the toast area with per-file results. This cap + single summary toast fixes
// that without changing the onAnalyze signature (void return; no per-call
// success/failure granularity is reported back to the panel).
//
// Server-side batching is NOT added here — per orchestrator instruction, the
// sequential client-side approach is retained with these UX guardrails:
//   1. Cap at MAX_AI_BATCH files per click (shows a confirm modal when exceeded)
//   2. Progress counter ("Analyzing 3 of 10…") replaces the static button label
//   3. Single summary toast on completion ("AI analysis complete: N files")
const MAX_AI_BATCH = 10;

/**
 * Run `onAnalyze(file, { bulk: true })` sequentially for each file in `files`,
 * calling `onProgress(index)` after each resolves. Returns a Promise that
 * resolves with `{ succeeded, failed }` counts when every call has completed.
 * Individual rejections increment `failed` but do NOT halt the chain so that
 * one bad file (e.g. file_not_found) doesn't abort the rest.
 */
async function runAiAnalyzeChain(
  files: string[],
  onAnalyze: (file: string, options?: { bulk?: boolean }) => void,
  onProgress: (index: number) => void
): Promise<{ succeeded: number; failed: number }> {
  let succeeded = 0;
  let failed = 0;
  for (let i = 0; i < files.length; i++) {
    try {
      await Promise.resolve(onAnalyze(files[i], { bulk: true }));
      succeeded++;
    } catch {
      failed++;
    }
    onProgress(i + 1);
  }
  return { succeeded, failed };
}

/**
 * Minimal inline confirmation modal. Reuses the a11y pattern from
 * HardeningConfirmDialog (role=dialog, aria-modal, Escape-to-cancel) without
 * pulling in the heavier component that is coupled to the HardeningOption
 * shape. Rendered only when open=true so it has zero footprint otherwise.
 */
interface BulkAiConfirmModalProps {
  open: boolean;
  totalSelected: number;
  cap: number;
  onConfirm: () => void;
  onCancel: () => void;
}
const BulkAiConfirmModal: React.FC<BulkAiConfirmModalProps> = ({
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
              You selected <strong>{totalSelected}</strong> files.
              AI-powered analysis isn&rsquo;t included in the free plugin —
              it fires zero AI tokens in this build.
              {hasEditionMismatch() && (
                <>
                  {" "}
                  You already own SwissSuite AI Pro —{" "}
                  <a
                    href={PRO_DOWNLOAD_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline"
                  >
                    download &amp; install Pro
                  </a>{" "}
                  to use it.
                </>
              )}
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

// ── Grade badge ───────────────────────────────────────────────────────────────

const GRADE_STYLES: Record<string, string> = {
  A: "bg-green-100 text-green-800 border-green-200",
  B: "bg-blue-100 text-blue-800 border-blue-200",
  C: "bg-amber-100 text-amber-800 border-amber-200",
  D: "bg-red-100 text-red-800 border-red-200",
  F: "bg-red-100 text-red-800 border-red-200",
};

interface GradeBadgeProps {
  grade: string;
}

const GradeBadge: React.FC<GradeBadgeProps> = ({ grade }) => {
  const upper = grade.toUpperCase();
  return (
    <span
      className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border-2 text-xl font-black ${GRADE_STYLES[upper] ?? "bg-secondary border-border text-neutral-600"}`}
      aria-label={`Security grade: ${upper}`}
    >
      {/* WCAG 4.1.2: aria-hidden on the visible text node prevents VoiceOver from
          announcing both the aria-label AND the text content (double-announcement). */}
      <span aria-hidden="true">{upper}</span>
    </span>
  );
};

// ── Severity icon ─────────────────────────────────────────────────────────────

interface SeverityIconProps {
  severity: "critical" | "high" | "medium" | "low";
}

const SeverityIcon: React.FC<SeverityIconProps> = ({ severity }) => {
  switch (severity) {
    case "critical":
    case "high":
      return (
        <AlertTriangle
          size={14}
          className="mt-0.5 shrink-0 text-red-500"
          aria-hidden="true"
        />
      );
    case "medium":
      return (
        <AlertCircle
          size={14}
          className="mt-0.5 shrink-0 text-amber-500"
          aria-hidden="true"
        />
      );
    default:
      // WCAG 1.4.11: text-blue-400 on white is ~2.6:1 (FAIL for non-text UI component, 3:1 required)
      // text-blue-700 on white is ~5.7:1 — passes both 3:1 non-text contrast and 4.5:1 if read as text
      return (
        <Info
          size={14}
          className="mt-0.5 shrink-0 text-blue-700"
          aria-hidden="true"
        />
      );
  }
};

// ── Severity label badge ──────────────────────────────────────────────────────

const SEVERITY_BADGE_STYLES: Record<SeverityIconProps["severity"], string> = {
  critical: "bg-red-50 text-red-700 border-red-200",
  // WCAG 1.4.3: text-orange-700 on bg-orange-50 is ~4.5:1 borderline (FAIL at text-[10px] which is
  // normal-weight text — 4.5:1 required). text-orange-800 on bg-orange-50 is ~5.8:1 (PASS).
  high: "bg-orange-50 text-orange-800 border-orange-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  // WCAG 1.4.3: text-blue-600 on bg-blue-50 is ~4.0:1 (FAIL at text-[10px]). text-blue-700 is ~5.7:1 (PASS).
  low: "bg-blue-50 text-blue-700 border-blue-200",
};

interface SeverityBadgeProps {
  severity: SeverityIconProps["severity"];
}

const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => (
  <span
    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black tracking-[0.08em] uppercase ${SEVERITY_BADGE_STYLES[severity]}`}
  >
    {severity}
  </span>
);

// ── Loading bar ───────────────────────────────────────────────────────────────

const LoadingBar: React.FC = () => (
  /*
    WCAG 4.1.2: role="status" removed from the outer container.
    Having both role="status" on the container AND role="progressbar" on the inner div
    created two AT-accessible elements with the same label "Scan in progress", causing
    NVDA to double-announce. The progressbar is the correct semantic element for this
    loading indicator. The container has no live region role — it is a layout wrapper only.
  */
  <div className="bg-card border-border flex flex-col gap-4 rounded-2xl border p-6">
    <div className="flex items-center gap-3">
      <Loader2
        size={18}
        className="text-swiss-navy shrink-0 animate-spin"
        aria-hidden="true"
      />
      <p className="text-swiss-navy text-sm font-black tracking-tight uppercase">
        Scanning…
      </p>
    </div>
    {/*
      WCAG 4.1.2: Indeterminate progressbar per WAI-ARIA spec.
      aria-valuenow intentionally absent — its absence signals indeterminate state to AT.
      aria-valuemin={0} and aria-valuemax={100} are required even for indeterminate bars
      so AT can compute the value range when valuenow is later provided.
      aria-label is the only label here (no labelledby anchor), which is valid for
      a non-interactive widget without a visible heading.
    */}
    <div
      role="progressbar"
      aria-label="Scan in progress"
      aria-valuemin={0}
      aria-valuemax={100}
      className="bg-secondary h-2 w-full overflow-hidden rounded-full"
    >
      <div className="bg-swiss-navy/70 h-full w-1/3 animate-pulse rounded-full" />
    </div>
    <p className="text-xs font-medium text-neutral-500">
      This may take up to a minute. Please wait…
    </p>
  </div>
);

// ── AI audit result (ai-audit and full-ai) ────────────────────────────────────

interface AuditResultViewProps {
  result: AiAuditResult | FullAiScanResult;
  isFullAi: boolean;
  /** Navigate to History tab (and optionally auto-expand the latest entry). */
  onViewHistory?: () => void;
  /** Mark a file as safe (add to ignore list). Receives the evidence file path. */
  onMarkSafe?: (evidence: string) => Promise<void> | void;
  /**
   * Persistent "Mark Safe" by finding id — used for findings that do NOT have
   * a file path on disk (e.g. "WordPress Version Detected", "PHP Version:
   * 8.3.30", "Bundled Plugin File Missing"). These findings cannot be added
   * to the path-based ignore list, so they use the id-based safelist instead.
   * When this prop is provided AND the finding has no `evidence`, the row
   * renders a Mark Safe button that POSTs `{ finding_id }` to /security/ignore.
   */
  onMarkSafeById?: (findingId: string) => Promise<void> | void;
  /**
   * Number of findings the server already filtered out because they appear in
   * the user's safelist. Drives the "N items hidden — manage" disclosure rendered
   * above the findings list. When 0/undefined the disclosure is hidden.
   */
  hiddenSafelistCount?: number;
  /** Called when the user clicks "Manage" inside the hidden-safelist disclosure. */
  onManageSafelist?: () => void;
  /** Move a file to quarantine. Receives the evidence file path. */
  onQuarantine?: (evidence: string) => void;
  /**
   * v2.9.28.11 — Batch action handler. When provided, a selection UI
   * (select-all header + per-row checkboxes + 3-button batch bar) is rendered.
   * Parent is responsible for calling the bulk endpoint and updating local state.
   */
  onBulkAction?: (
    action: "ignore" | "quarantine" | "delete",
    evidenceList: string[]
  ) => Promise<void> | void;
  onAnalyze?: (filepath: string, options?: { bulk?: boolean }) => void;
  /** Security-plan gate for AI analysis buttons. */
  hasSentinelPro?: boolean;
  /** Any-paid gate for bulk quarantine/delete actions. */
  canRemediate?: boolean;
}

const AuditResultView: React.FC<AuditResultViewProps> = ({
  result,
  isFullAi,
  onViewHistory,
  onMarkSafe,
  onMarkSafeById,
  hiddenSafelistCount,
  onManageSafelist,
  onQuarantine,
  onBulkAction,
  onAnalyze,
  hasSentinelPro,
  canRemediate,
}) => {
  const [showAllFindings, setShowAllFindings] = useState(false);
  const [pendingSafe, setPendingSafe] = useState<Record<string, boolean>>({});

  // v2.9.28.11 — Batch selection state for bulk actions (restored from v2.9.27.71).
  // Only findings with a `.evidence` file path are selectable; non-file findings
  // (general advice, config gaps) are excluded from bulk operations.
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // v2.9.28.21 — Bulk AI analysis progress + confirm state.
  // aiProgress: { current, total } while the chain runs; null when idle.
  // aiConfirm:  list to run when user confirms the MAX_AI_BATCH cap; null when no prompt.
  const [aiProgress, setAiProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [aiConfirm, setAiConfirm] = useState<string[] | null>(null);

  // v2.9.28.35 — Inline "configuration finding — nothing to analyze" state.
  // Keyed by finding.id. When a user clicks "Check N with AI" with non-file
  // findings selected, each non-file finding gets its ID added here and a
  // friendly neutral message renders inline on the row (not a red error).
  const [nonFileInfo, setNonFileInfo] = useState<Set<string>>(new Set());

  // Start the AI chain on `files`. Shared between the direct click path (≤cap)
  // and the "confirm modal" path (>cap). Clears selection after kickoff so the
  // user can't double-click and double-fire.
  const startAiBatch = (files: string[]) => {
    const list = files.slice(0, MAX_AI_BATCH);
    setSelected(new Set());
    setAiProgress({ current: 0, total: list.length });
    toast.success(
      list.length === 1
        ? "Analyzing 1 file with AI…"
        : `Analyzing ${list.length} files with AI…`
    );
    void runAiAnalyzeChain(list, onAnalyze!, (index) =>
      setAiProgress({ current: index, total: list.length })
    ).then(({ succeeded, failed }) => {
      setAiProgress(null);
      if (succeeded === 0 && failed > 0) {
        toast.error(
          failed === 1
            ? "AI analysis failed — file could not be analyzed."
            : `AI analysis failed — none of the ${failed} files could be analyzed.`
        );
      } else if (failed > 0) {
        toast.success(
          `AI analyzed ${succeeded} of ${list.length} files. ${failed} could not be analyzed.`
        );
      } else {
        toast.success(
          list.length === 1
            ? "AI analysis complete."
            : `AI analysis complete: ${list.length} files processed.`
        );
      }
    });
  };

  const selectableFindings = result.findings.filter((f) => !!f.evidence);

  const toggleOne = (evidence: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(evidence)) next.delete(evidence);
      else next.add(evidence);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === selectableFindings.length) setSelected(new Set());
    else setSelected(new Set(selectableFindings.map((f) => f.evidence!)));
  };

  const allSelected =
    selectableFindings.length > 0 &&
    selected.size === selectableFindings.length;

  const truncatedSummary =
    result.summary.length > 80
      ? result.summary.slice(0, 80) + "…"
      : result.summary;
  const topFindings = result.findings.slice(0, 5);
  const visibleFindings = showAllFindings ? result.findings : topFindings;
  const fullResult = result as FullAiScanResult;

  return (
    <div
      role="region"
      aria-label={isFullAi ? "Full AI scan result" : "Security audit result"}
      className="bg-card border-border flex flex-col gap-5 rounded-2xl border p-6"
    >
      {/* Grade + summary */}
      <div className="flex items-start gap-4">
        <GradeBadge grade={result.grade} />
        <div className="min-w-0 flex-1">
          <p
            className="text-sm leading-relaxed font-medium text-neutral-700"
            title={result.summary}
          >
            {truncatedSummary}
          </p>
          <p className="mt-1 text-xs font-medium text-neutral-400">
            Scanned {new Date(result.scanned_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Full-AI extras: CVE + attack chains */}
      {isFullAi && (
        <div className="flex flex-wrap gap-3">
          <div className="bg-secondary border-border flex items-center gap-2 rounded-xl border px-3 py-1.5">
            <Shield size={13} className="text-neutral-500" aria-hidden="true" />
            <span className="text-xs font-black text-neutral-700">
              {fullResult.cve_matches} CVE
              {fullResult.cve_matches !== 1 ? "s" : ""} matched
            </span>
          </div>
          <div className="bg-secondary border-border flex items-center gap-2 rounded-xl border px-3 py-1.5">
            <Bug size={13} className="text-neutral-500" aria-hidden="true" />
            <span className="text-xs font-black text-neutral-700">
              {fullResult.attack_chains} attack chain
              {fullResult.attack_chains !== 1 ? "s" : ""} identified
            </span>
          </div>
        </div>
      )}

      {/* Findings list — expandable inline */}
      {topFindings.length > 0 && (
        <div>
          <h4 className="mb-3 text-xs font-black tracking-[0.08em] text-neutral-500 uppercase">
            {showAllFindings ? "All findings" : "Top findings"}
          </h4>

          {/*
            v2.9.28.11 — Batch-action bar (restored from v2.9.27.71).
            Only rendered when parent provides onBulkAction AND at least one
            finding has a file path (evidence). The bar shows:
              - Select-all checkbox on the left
              - 3 colored action buttons (Mark Safe / Quarantine / Delete) on the right, visible only when selection.size > 0
            Buttons clear the selection after the async call resolves.
            WCAG 1.4.3 / 4.1.2: aria-label on checkbox; focus ring via focus-visible utility.
          */}
          {onBulkAction && selectableFindings.length > 0 && (
            <div className="bg-secondary border-border mb-3 flex items-center justify-between gap-3 rounded-xl border p-2">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-black tracking-[0.08em] text-neutral-700 uppercase select-none">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label={
                    allSelected
                      ? "Deselect all findings"
                      : "Select all findings"
                  }
                  className="border-border focus-visible:ring-swiss-navy h-4 w-4 rounded focus-visible:ring-2"
                />
                {selected.size > 0
                  ? `${selected.size} of ${selectableFindings.length} selected`
                  : `Select all (${selectableFindings.length})`}
              </label>

              {selected.size > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const list = [...selected];
                      Promise.resolve(onBulkAction("ignore", list)).then(() =>
                        setSelected(new Set())
                      );
                    }}
                    className="bg-secondary text-swiss-navy border-border hover:bg-muted focus-visible:ring-swiss-navy inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black tracking-[0.08em] uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    Mark {selected.size} Safe
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!canRemediate) {
                        toast.error("Upgrade to a paid plan for this feature — swisswpsecure.com/products");
                        return;
                      }
                      const list = [...selected];
                      Promise.resolve(onBulkAction("quarantine", list)).then(
                        () => setSelected(new Set())
                      );
                    }}
                    disabled={!canRemediate}
                    aria-disabled={!canRemediate ? true : undefined}
                    className={`focus-visible:ring-swiss-navy inline-flex items-center gap-1 rounded-full bg-amber-600 px-2.5 py-1 text-[10px] font-black tracking-[0.08em] text-white uppercase transition-colors hover:bg-amber-700 focus-visible:ring-2 focus-visible:outline-none${!canRemediate ? " cursor-not-allowed opacity-50" : ""}`}
                    title={!canRemediate ? "Requires a paid plan" : undefined}
                  >
                    {!canRemediate && <Lock size={10} aria-hidden="true" className="mr-0.5" />}
                    Quarantine {selected.size}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!canRemediate) {
                        toast.error("Upgrade to a paid plan for this feature — swisswpsecure.com/products");
                        return;
                      }
                      const list = [...selected];
                      Promise.resolve(onBulkAction("delete", list)).then(() =>
                        setSelected(new Set())
                      );
                    }}
                    disabled={!canRemediate}
                    aria-disabled={!canRemediate ? true : undefined}
                    className={`focus-visible:ring-swiss-navy inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-black tracking-[0.08em] text-white uppercase transition-colors hover:bg-red-700 focus-visible:ring-2 focus-visible:outline-none${!canRemediate ? " cursor-not-allowed opacity-50" : ""}`}
                    title={!canRemediate ? "Requires a paid plan" : undefined}
                  >
                    {!canRemediate && <Lock size={10} aria-hidden="true" className="mr-0.5" />}
                    Delete {selected.size}
                  </button>
                  {onAnalyze && (
                    <button
                      type="button"
                      onClick={() => {
                        if (aiProgress) return; // already running; no double-fire
                        const allSelected = [...selected];

                        // v2.9.28.35 — Classify each selected finding. File findings
                        // produce a real on-disk path; config/network/header findings
                        // get a friendly inline "no file to analyze" message.
                        const analyzablePaths: string[] = [];
                        const nonFileIds: string[] = [];
                        const seenPaths = new Set<string>();
                        for (const evidencePath of allSelected) {
                          const f = result.findings.find(
                            (finding) => finding.evidence === evidencePath
                          );
                          if (!f) continue;
                          const { analyzable, extractedPath } =
                            classifyFindingForAi(f);
                          if (analyzable && extractedPath) {
                            if (!seenPaths.has(extractedPath)) {
                              seenPaths.add(extractedPath);
                              analyzablePaths.push(extractedPath);
                            }
                          } else {
                            nonFileIds.push(f.id);
                          }
                        }

                        // Show inline neutral info on every non-file finding row.
                        if (nonFileIds.length > 0) {
                          setNonFileInfo((prev) => {
                            const next = new Set(prev);
                            nonFileIds.forEach((id) => next.add(id));
                            return next;
                          });
                        }

                        // All selected findings are non-file → nothing to call; show
                        // a friendly neutral toast (NOT an error) and clear selection.
                        if (analyzablePaths.length === 0) {
                          toast.info(
                            allSelected.length === 1
                              ? "This finding is a configuration check — there's no source file to analyze. See the inline note."
                              : `${allSelected.length} configuration findings selected — no source files to analyze. See the inline notes on each.`
                          );
                          setSelected(new Set());
                          return;
                        }

                        // Mixed selection: run AI on file findings, note the skipped ones.
                        if (nonFileIds.length > 0) {
                          toast.info(
                            `Analyzing ${analyzablePaths.length} file${analyzablePaths.length > 1 ? "s" : ""} with AI — ${nonFileIds.length} configuration finding${nonFileIds.length > 1 ? "s" : ""} skipped (see inline notes).`
                          );
                        }

                        if (analyzablePaths.length > MAX_AI_BATCH) {
                          setAiConfirm(analyzablePaths);
                          return;
                        }
                        startAiBatch(analyzablePaths);
                      }}
                      disabled={!hasSentinelPro || !!aiProgress}
                      aria-disabled={!hasSentinelPro ? true : undefined}
                      aria-label={`Analyze ${selected.size} selected files with AI`}
                      className={`bg-swiss-navy focus-visible:ring-swiss-navy inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black tracking-[0.08em] text-white uppercase hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none transition-colors${!hasSentinelPro || !!aiProgress ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      {!hasSentinelPro ? (
                        <Lock size={10} aria-hidden="true" />
                      ) : aiProgress ? (
                        <Loader2
                          size={10}
                          className="animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <Sparkles size={10} aria-hidden="true" />
                      )}
                      {aiProgress
                        ? `Analyzing ${aiProgress.current} of ${aiProgress.total}…`
                        : `Check ${selected.size} with AI`}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <BulkAiConfirmModal
            open={!!aiConfirm}
            totalSelected={aiConfirm?.length ?? 0}
            cap={MAX_AI_BATCH}
            onConfirm={() => {
              const list = aiConfirm ?? [];
              setAiConfirm(null);
              startAiBatch(list);
            }}
            onCancel={() => setAiConfirm(null)}
          />

          {/* Persistent "Mark Safe" disclosure — server-side filter removed
              N findings from this scan because the user previously marked them
              safe. Surfaced here so the count never "lies" silently: users
              can see at a glance that something was hidden, and click Manage
              to remove items from the safelist. */}
          {!!hiddenSafelistCount && hiddenSafelistCount > 0 && (
            <div
              role="status"
              className="flex items-center justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs"
            >
              <span className="flex items-center gap-2 font-medium text-blue-800">
                <ShieldOff
                  size={12}
                  className="shrink-0 text-blue-700"
                  aria-hidden="true"
                />
                {hiddenSafelistCount === 1
                  ? "1 finding hidden — marked safe by you"
                  : `${hiddenSafelistCount} findings hidden — marked safe by you`}
              </span>
              {onManageSafelist && (
                <button
                  type="button"
                  onClick={onManageSafelist}
                  className="focus-visible:ring-swiss-navy inline-flex items-center gap-1 rounded font-black text-blue-900 underline underline-offset-2 hover:text-blue-700 focus-visible:ring-2 focus-visible:outline-none"
                  aria-label="Manage safelist — review or remove items you marked safe"
                >
                  Manage
                </button>
              )}
            </div>
          )}

          <ul
            role="list"
            className="space-y-2.5"
            aria-label="Security findings"
          >
            {visibleFindings.map((finding) => {
              const isPending = !!pendingSafe[finding.id];
              const hasEvidence = !!finding.evidence;
              return (
                <li
                  key={finding.evidence || finding.id}
                  className="bg-secondary border-border flex items-start gap-2.5 rounded-xl border p-3"
                >
                  {/* v2.9.28.11 — Per-finding checkbox rendered BEFORE the severity icon. */}
                  {onBulkAction && hasEvidence && (
                    <input
                      type="checkbox"
                      checked={selected.has(finding.evidence!)}
                      onChange={() => toggleOne(finding.evidence!)}
                      aria-label={`Select finding: ${finding.title}`}
                      className="border-border focus-visible:ring-swiss-navy mt-0.5 h-4 w-4 shrink-0 rounded focus-visible:ring-2"
                    />
                  )}
                  <SeverityIcon severity={finding.severity} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-neutral-800">
                        {finding.title}
                      </span>
                      <SeverityBadge severity={finding.severity} />
                    </div>
                    {finding.detail && (
                      <p className="mt-0.5 text-xs leading-snug font-medium text-neutral-500">
                        {finding.detail}
                      </p>
                    )}
                    {finding.remediation && (
                      <p className="mt-1 flex items-start gap-1 text-xs leading-snug font-medium text-neutral-600">
                        <Wrench
                          size={10}
                          className="text-swiss-navy mt-0.5 shrink-0"
                          aria-hidden="true"
                        />
                        <span>
                          <span className="font-black">Fix:</span>{" "}
                          {finding.remediation}
                        </span>
                      </p>
                    )}
                    {/* v2.9.28.35 — Inline neutral info message for non-file findings.
                        Rendered when the user clicked "Check N with AI" and this finding
                        was classified as a configuration check (no source file to analyze).
                        role="status" so screen readers announce the message; neutral
                        blue-50 styling to distinguish from real errors. */}
                    {nonFileInfo.has(finding.id) && (
                      <div
                        role="status"
                        className="mt-2 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-2 text-xs text-blue-800"
                      >
                        <Info
                          size={12}
                          className="mt-0.5 shrink-0"
                          aria-hidden="true"
                        />
                        <span>
                          This finding is a configuration check — there&rsquo;s
                          no source file to analyze. Review the remediation
                          steps above.
                        </span>
                      </div>
                    )}
                    {/* Per-finding actions.
                        - File findings (hasEvidence): show Mark Safe (path-based) + Quarantine.
                        - Non-file findings (e.g. "WordPress Version Detected", "Bundled Plugin
                          File Missing"): show Mark Safe by id when onMarkSafeById is provided.
                          These rows have no Quarantine button — nothing to move on disk. */}
                    {((hasEvidence && (onMarkSafe || onQuarantine)) ||
                      (!hasEvidence && onMarkSafeById)) && (
                      <div className="mt-2 flex items-center gap-2">
                        {hasEvidence && onMarkSafe && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (!finding.evidence) return;
                              setPendingSafe((prev) => ({
                                ...prev,
                                [finding.id]: true,
                              }));
                              try {
                                await onMarkSafe(finding.evidence!);
                              } finally {
                                setPendingSafe((prev) => {
                                  const n = { ...prev };
                                  delete n[finding.id];
                                  return n;
                                });
                              }
                            }}
                            disabled={isPending}
                            aria-busy={isPending}
                            aria-label={`Mark ${finding.evidence} as safe`}
                            className="bg-secondary text-swiss-navy border-border hover:bg-muted focus-visible:ring-swiss-navy inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black tracking-[0.08em] uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isPending ? (
                              <Loader2
                                size={10}
                                className="animate-spin"
                                aria-hidden="true"
                              />
                            ) : (
                              <ShieldOff size={10} aria-hidden="true" />
                            )}
                            {isPending ? "Marking…" : "Mark Safe"}
                          </button>
                        )}
                        {!hasEvidence && onMarkSafeById && (
                          <button
                            type="button"
                            onClick={async () => {
                              setPendingSafe((prev) => ({
                                ...prev,
                                [finding.id]: true,
                              }));
                              try {
                                await onMarkSafeById(finding.id);
                              } finally {
                                setPendingSafe((prev) => {
                                  const n = { ...prev };
                                  delete n[finding.id];
                                  return n;
                                });
                              }
                            }}
                            disabled={isPending}
                            aria-busy={isPending}
                            aria-label={`Mark "${finding.title}" as safe — hide it from future scans`}
                            className="bg-secondary text-swiss-navy border-border hover:bg-muted focus-visible:ring-swiss-navy inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black tracking-[0.08em] uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isPending ? (
                              <Loader2
                                size={10}
                                className="animate-spin"
                                aria-hidden="true"
                              />
                            ) : (
                              <ShieldOff size={10} aria-hidden="true" />
                            )}
                            {isPending ? "Marking…" : "Mark Safe"}
                          </button>
                        )}
                        {onQuarantine && (
                          <button
                            type="button"
                            onClick={() =>
                              finding.evidence && onQuarantine(finding.evidence)
                            }
                            aria-label={`Quarantine ${finding.evidence}`}
                            className="focus-visible:ring-swiss-navy inline-flex items-center gap-1 rounded-full bg-amber-600 px-2 py-0.5 text-[10px] font-black tracking-[0.08em] text-white uppercase transition-colors hover:bg-amber-700 focus-visible:ring-2 focus-visible:outline-none"
                          >
                            <Archive size={10} aria-hidden="true" />
                            Quarantine
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {/* "Show all / Show fewer" — expands the list INLINE; does NOT navigate to History */}
          {result.findings.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAllFindings((prev) => !prev)}
              className="text-swiss-navy hover:text-swiss-navy/70 focus-visible:ring-swiss-navy mt-2 flex items-center gap-1 rounded text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
              aria-expanded={showAllFindings}
              aria-label={
                showAllFindings
                  ? "Show fewer findings"
                  : `Show all ${result.findings.length} findings`
              }
            >
              {showAllFindings ? (
                <>
                  <ChevronUp size={12} aria-hidden="true" />
                  Show fewer
                </>
              ) : (
                <>
                  <ChevronDown size={12} aria-hidden="true" />
                  Show all {result.findings.length} findings
                </>
              )}
            </button>
          )}
        </div>
      )}

      {topFindings.length === 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <CheckCircle2
            size={16}
            className="shrink-0 text-emerald-600"
            aria-hidden="true"
          />
          <span className="text-xs font-black text-emerald-700">
            No issues found — looking good!
          </span>
        </div>
      )}

      {/* Always-visible "View in History" link — provides a clear path to the full persisted record */}
      {onViewHistory && (
        <div className="border-border flex items-center justify-between gap-3 border-t pt-3">
          <p className="text-xs font-medium text-neutral-400">
            Results are saved to History for 90 days.
          </p>
          <button
            type="button"
            onClick={onViewHistory}
            className="text-swiss-navy hover:text-swiss-navy/70 focus-visible:ring-swiss-navy inline-flex shrink-0 items-center gap-1.5 rounded text-xs font-black underline underline-offset-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
            aria-label="View this scan in the History tab"
          >
            View in History
            <ExternalLink size={11} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
};

// ── Malware result ────────────────────────────────────────────────────────────

interface MalwareResultViewProps {
  result: MalwareScanResult;
  onViewHistory?: () => void;
  /**
   * v2.9.28.04 — "Mark as Safe" handler invoked when the user whitelists a finding.
   * Receives the ABSPATH-relative file path. The parent is responsible for calling
   * POST /security/ignore and then removing the threat from the local state so the
   * UI reflects the change immediately.
   */
  onMarkSafe?: (relativePath: string) => Promise<void> | void;
  /**
   * v2.9.28.11 — Batch action handler (restored from v2.9.27.71). Malware threats
   * expose `.file` rather than `.evidence`, but semantically the list of paths
   * passed to onBulkAction is identical to the AI audit path.
   */
  onBulkAction?: (
    action: "ignore" | "quarantine" | "delete",
    pathList: string[]
  ) => Promise<void> | void;
  /**
   * v2.9.28.14 — Per-threat "Analyze with AI" handler (regression restore from v2.9.27.94).
   * When provided, each actionable threat row renders a Pro-gated "Analyze" button that
   * invokes onAnalyze(threat.file). Parent owns the AI analysis request + modal display.
   */
  onAnalyze?: (filepath: string, options?: { bulk?: boolean }) => void;
  /** v2.9.28.14 — File path currently being analyzed (drives per-row spinner). */
  analyzingFile?: string | null;
  /** v2.9.28.14 — Security-plan gate. When false, the Analyze button renders disabled with a Lock icon. */
  hasSentinelPro?: boolean;
  /** Any-paid gate for bulk quarantine/delete actions. */
  canRemediate?: boolean;
}

const MalwareResultView: React.FC<MalwareResultViewProps> = ({
  result,
  onViewHistory,
  onMarkSafe,
  onBulkAction,
  onAnalyze,
  analyzingFile,
  hasSentinelPro,
  canRemediate,
}) => {
  const hasThreats = (result.threats_found ?? 0) > 0;
  // Local "in-flight" state per-threat so the Mark-as-Safe button can disable and
  // display a spinner while the POST is pending. Keyed by threat file path + index
  // (threats of the same file are unlikely but the index keeps collisions safe).
  const [pendingSafe, setPendingSafe] = useState<Record<string, boolean>>({});

  // v2.9.28.11 — Bulk selection state (parity with AuditResultView).
  // Actionable (medium+) threats: primary bulk UI.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggleOneThreat = (file: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(file)) next.delete(file);
      else next.add(file);
      return next;
    });
  };

  // v2.9.28.13 — Separate bulk selection state for low-risk (info/low) threats.
  // Keeping a distinct Set prevents the two sections from stepping on each other
  // and makes the "Select all" in each bar behave intuitively.
  const [selectedLow, setSelectedLow] = useState<Set<string>>(new Set());
  const toggleOneLowThreat = (file: string) => {
    setSelectedLow((prev) => {
      const next = new Set(prev);
      if (next.has(file)) next.delete(file);
      else next.add(file);
      return next;
    });
  };
  // v2.9.28.08: Collapsible "low-risk findings" section. Default collapsed so
  // a clean site (0 actionable threats + N info/low items) shows the green
  // "all clear" state prominently rather than a wall of noise.
  const [showLowRisk, setShowLowRisk] = useState(false);

  // v2.9.28.21 — Bulk AI analysis progress + confirm state. Single aiProgress
  // is shared across both bulk bars (actionable + low-risk) because the
  // on-screen button labels are mutually exclusive in practice — a user who
  // clicks "Check N with AI" on one list won't be clicking on the other
  // simultaneously, and a single in-flight chain prevents double-fire either way.
  const [aiProgress, setAiProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [aiConfirm, setAiConfirm] = useState<string[] | null>(null);

  const startAiBatch = (files: string[]) => {
    const list = files.slice(0, MAX_AI_BATCH);
    // Clear whichever selection set this batch came from — we don't know the
    // source here, so clear both defensively.
    setSelected(new Set());
    setSelectedLow(new Set());
    setAiProgress({ current: 0, total: list.length });
    toast.success(
      list.length === 1
        ? "Analyzing 1 file with AI…"
        : `Analyzing ${list.length} files with AI…`
    );
    void runAiAnalyzeChain(list, onAnalyze!, (index) =>
      setAiProgress({ current: index, total: list.length })
    ).then(({ succeeded, failed }) => {
      setAiProgress(null);
      if (succeeded === 0 && failed > 0) {
        toast.error(
          failed === 1
            ? "AI analysis failed — file could not be analyzed."
            : `AI analysis failed — none of the ${failed} files could be analyzed.`
        );
      } else if (failed > 0) {
        toast.success(
          `AI analyzed ${succeeded} of ${list.length} files. ${failed} could not be analyzed.`
        );
      } else {
        toast.success(
          list.length === 1
            ? "AI analysis complete."
            : `AI analysis complete: ${list.length} files processed.`
        );
      }
    });
  };

  // v2.9.28.08: Split threats into actionable (medium+) vs low-risk (info/low).
  // Backend (class-swisswpsuite-scan-orchestrator.php) now assigns severity by
  // category and only counts medium/high/critical in threats_found — but the
  // full list is still returned so the detail view can show low-risk items
  // in a separate, collapsible section.
  const allThreats = result.threats ?? [];
  const actionableThreats = allThreats.filter(
    (t) =>
      t.severity === "medium" ||
      t.severity === "high" ||
      t.severity === "critical"
  );
  const lowRiskThreats = allThreats.filter(
    (t) => t.severity === "info" || t.severity === "low"
  );
  const hasLowRisk = lowRiskThreats.length > 0;

  const handleMarkSafe = async (key: string, relativePath: string) => {
    if (!onMarkSafe) return;
    setPendingSafe((prev) => ({ ...prev, [key]: true }));
    try {
      await onMarkSafe(relativePath);
    } finally {
      setPendingSafe((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  return (
    <div
      role="region"
      aria-label="Malware scan result"
      className="bg-card border-border flex flex-col gap-5 rounded-2xl border p-6"
    >
      {/* Summary counts */}
      <div className="flex flex-wrap gap-3">
        <div className="bg-secondary border-border flex items-center gap-2 rounded-xl border px-4 py-2.5">
          <Shield size={14} className="text-neutral-500" aria-hidden="true" />
          <span className="text-xs font-black text-neutral-700">
            {(result.files_scanned ?? 0).toLocaleString()} files scanned
          </span>
        </div>
        <div
          className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 ${
            hasThreats
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {hasThreats ? (
            <AlertTriangle size={14} aria-hidden="true" />
          ) : (
            <CheckCircle2 size={14} aria-hidden="true" />
          )}
          <span className="text-xs font-black">
            {result.threats_found ?? 0} threat
            {(result.threats_found ?? 0) !== 1 ? "s" : ""} found
          </span>
        </div>
        <div className="bg-secondary border-border flex items-center gap-2 rounded-xl border px-3 py-2.5">
          <span className="text-xs font-medium text-neutral-500">
            Mode:{" "}
            <span className="font-black text-neutral-700 uppercase">
              {result.mode}
            </span>
          </span>
        </div>
        {/* AI grade badge (deep mode only). Colors meet WCAG AA. */}
        {result.ai_grade && (
          <div
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 ${
              result.ai_grade === "A" || result.ai_grade === "B"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : result.ai_grade === "C"
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : result.ai_grade === "?"
                    ? "bg-secondary border-border text-neutral-700"
                    : "border-red-200 bg-red-50 text-red-800"
            }`}
            aria-label={`AI grade ${result.ai_grade}`}
          >
            <Sparkles size={14} aria-hidden="true" />
            <span className="text-xs font-black">
              Grade{" "}
              <span className="font-black uppercase">{result.ai_grade}</span>
            </span>
          </div>
        )}
      </div>

      {/* Status pills (deep mode only). Each phase soft-degrades:
          ok = phase ran cleanly, unavailable = phase skipped (no key/quota),
          degraded_* = phase ran but with reduced output (AI only). */}
      {(result.vps_lookup_status ||
        result.wpscan_status ||
        result.patchstack_status ||
        result.ai_status) && (
        <div
          className="flex flex-wrap gap-2"
          role="list"
          aria-label="Deep scan phase status"
        >
          {[
            { label: "VPS hash", value: result.vps_lookup_status },
            { label: "WPScan", value: result.wpscan_status },
            { label: "Patchstack", value: result.patchstack_status },
            { label: "AI", value: result.ai_status },
          ]
            .filter((p) => !!p.value)
            .map((p) => {
              const isOk = p.value === "ok";
              const isDegraded =
                typeof p.value === "string" &&
                (p.value.startsWith("degraded") || p.value === "rate_limited");
              const cls = isOk
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : isDegraded
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : "bg-secondary border-border text-neutral-600";
              return (
                <span
                  key={p.label}
                  role="listitem"
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black tracking-[0.08em] uppercase ${cls}`}
                >
                  {p.label}: {p.value}
                </span>
              );
            })}
        </div>
      )}

      {/* VPS degradation warning — shown when the hash-DB phase soft-degraded. */}
      {(result.vps_lookup_status === "degraded" ||
        result.vps_lookup_status === "rate_limited") && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {result.vps_lookup_status === "degraded"
            ? "VPS signature database was unreachable during this scan — files were checked with local scanning only. Consider re-running the scan."
            : "Scan rate limit reached — some files were checked with local scanning only."}
        </p>
      )}

      {/* Detection sources that contributed to this scan's findings. */}
      {result.sources && result.sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black tracking-[0.08em] text-neutral-500 uppercase">
            Sources:
          </span>
          {result.sources.map((src) => (
            <span
              key={src}
              className="bg-secondary border-border inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black tracking-[0.08em] text-neutral-700 uppercase"
            >
              {src}
            </span>
          ))}
        </div>
      )}

      {/* Actionable threat list (medium+ severity only) */}
      {hasThreats && actionableThreats.length > 0 && (
        <div>
          <h4 className="mb-3 text-xs font-black tracking-[0.08em] text-neutral-500 uppercase">
            Threats detected
          </h4>

          {/* v2.9.28.11 — Batch-action bar for malware (parity with AuditResultView). */}
          {onBulkAction && (
            <div className="bg-secondary border-border mb-3 flex items-center justify-between gap-3 rounded-xl border p-2">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-black tracking-[0.08em] text-neutral-700 uppercase select-none">
                <input
                  type="checkbox"
                  checked={
                    selected.size > 0 &&
                    selected.size === actionableThreats.length
                  }
                  onChange={() => {
                    if (selected.size === actionableThreats.length)
                      setSelected(new Set());
                    else
                      setSelected(
                        new Set(actionableThreats.map((t) => t.file))
                      );
                  }}
                  aria-label={
                    selected.size === actionableThreats.length
                      ? "Deselect all threats"
                      : "Select all threats"
                  }
                  className="border-border focus-visible:ring-swiss-navy h-4 w-4 rounded focus-visible:ring-2"
                />
                {selected.size > 0
                  ? `${selected.size} of ${actionableThreats.length} selected`
                  : `Select all (${actionableThreats.length})`}
              </label>

              {selected.size > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const list = [...selected];
                      Promise.resolve(onBulkAction("ignore", list)).then(() =>
                        setSelected(new Set())
                      );
                    }}
                    className="bg-secondary text-swiss-navy border-border hover:bg-muted focus-visible:ring-swiss-navy inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black tracking-[0.08em] uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    Mark {selected.size} Safe
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!canRemediate) {
                        toast.error("Upgrade to a paid plan for this feature — swisswpsecure.com/products");
                        return;
                      }
                      const list = [...selected];
                      Promise.resolve(onBulkAction("quarantine", list)).then(
                        () => setSelected(new Set())
                      );
                    }}
                    disabled={!canRemediate}
                    aria-disabled={!canRemediate ? true : undefined}
                    className={`focus-visible:ring-swiss-navy inline-flex items-center gap-1 rounded-full bg-amber-600 px-2.5 py-1 text-[10px] font-black tracking-[0.08em] text-white uppercase transition-colors hover:bg-amber-700 focus-visible:ring-2 focus-visible:outline-none${!canRemediate ? " cursor-not-allowed opacity-50" : ""}`}
                    title={!canRemediate ? "Requires a paid plan" : undefined}
                  >
                    {!canRemediate && <Lock size={10} aria-hidden="true" className="mr-0.5" />}
                    Quarantine {selected.size}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!canRemediate) {
                        toast.error("Upgrade to a paid plan for this feature — swisswpsecure.com/products");
                        return;
                      }
                      const list = [...selected];
                      Promise.resolve(onBulkAction("delete", list)).then(() =>
                        setSelected(new Set())
                      );
                    }}
                    disabled={!canRemediate}
                    aria-disabled={!canRemediate ? true : undefined}
                    className={`focus-visible:ring-swiss-navy inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-black tracking-[0.08em] text-white uppercase transition-colors hover:bg-red-700 focus-visible:ring-2 focus-visible:outline-none${!canRemediate ? " cursor-not-allowed opacity-50" : ""}`}
                    title={!canRemediate ? "Requires a paid plan" : undefined}
                  >
                    {!canRemediate && <Lock size={10} aria-hidden="true" className="mr-0.5" />}
                    Delete {selected.size}
                  </button>
                  {onAnalyze && (
                    <button
                      type="button"
                      onClick={() => {
                        // v2.9.28.21 — cap + confirm flow (malware actionable list).
                        const list = [...selected];
                        if (aiProgress) return;
                        if (list.length > MAX_AI_BATCH) {
                          setAiConfirm(list);
                          return;
                        }
                        startAiBatch(list);
                      }}
                      disabled={!hasSentinelPro || !!aiProgress}
                      aria-disabled={!hasSentinelPro ? true : undefined}
                      aria-label={`Analyze ${selected.size} selected files with AI`}
                      className={`bg-swiss-navy focus-visible:ring-swiss-navy inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black tracking-[0.08em] text-white uppercase hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none transition-colors${!hasSentinelPro || !!aiProgress ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      {!hasSentinelPro ? (
                        <Lock size={10} aria-hidden="true" />
                      ) : aiProgress ? (
                        <Loader2
                          size={10}
                          className="animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <Sparkles size={10} aria-hidden="true" />
                      )}
                      {aiProgress
                        ? `Analyzing ${aiProgress.current} of ${aiProgress.total}…`
                        : `Check ${selected.size} with AI`}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <BulkAiConfirmModal
            open={!!aiConfirm}
            totalSelected={aiConfirm?.length ?? 0}
            cap={MAX_AI_BATCH}
            onConfirm={() => {
              const list = aiConfirm ?? [];
              setAiConfirm(null);
              startAiBatch(list);
            }}
            onCancel={() => setAiConfirm(null)}
          />

          <ul role="list" className="space-y-2" aria-label="Detected threats">
            {actionableThreats.map((threat, idx) => {
              const key = `${threat.file}|${idx}`;
              const isPending = !!pendingSafe[key];
              return (
                <li
                  key={idx}
                  className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3"
                >
                  {/* v2.9.28.11 — Per-threat checkbox (parity with AuditResultView). */}
                  {onBulkAction && (
                    <input
                      type="checkbox"
                      checked={selected.has(threat.file)}
                      onChange={() => toggleOneThreat(threat.file)}
                      aria-label={`Select threat: ${threat.file}`}
                      className="border-border focus-visible:ring-swiss-navy mt-0.5 h-4 w-4 shrink-0 rounded focus-visible:ring-2"
                    />
                  )}
                  <Bug
                    size={14}
                    className="mt-0.5 shrink-0 text-red-500"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black break-all text-red-800">
                      {threat.file}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-red-600">
                      {threat.type}
                      {threat.severity ? ` — ${threat.severity}` : ""}
                    </p>
                  </div>
                  {/*
                    v2.9.28.04 (Issue 4): Mark-as-Safe control.
                    Reuses the existing POST /security/ignore endpoint which writes
                    to swisswpsuite_security_ignored_paths. Both perform_core_scan()
                    (Quick mode) and SwissWPSuite_Security_Scanner::is_safe_folder()
                    (Deep mode) already consult that option, so a whitelisted file
                    will be skipped by every future scan — no new storage required.
                    Button is only rendered when the parent provided onMarkSafe.
                    WCAG 4.1.2: aria-label describes the action target explicitly.
                  */}
                  {onMarkSafe && (
                    <button
                      type="button"
                      onClick={() => handleMarkSafe(key, threat.file)}
                      disabled={isPending}
                      aria-busy={isPending}
                      aria-label={`Mark ${threat.file} as safe and exclude from future scans`}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-red-300 bg-white px-2.5 py-1 text-[10px] font-black tracking-[0.08em] text-red-700 uppercase transition-colors hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      title="Exclude this file from future malware scans"
                    >
                      {isPending ? (
                        <Loader2
                          size={10}
                          className="animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <ShieldOff size={10} aria-hidden="true" />
                      )}
                      {isPending ? "Marking…" : "Mark Safe"}
                    </button>
                  )}
                  {/*
                    v2.9.28.14 — Per-threat "Analyze with AI" button (regression restore from v2.9.27.94).
                    Pro-gated: Free users see a disabled button with a Lock icon, mirroring the old
                    ScanResultsTable behavior so the upgrade prompt stays discoverable rather than hidden.
                    WCAG 4.1.2: aria-label describes action + target; disabled state carries aria-busy
                    only while analyzing (not when Pro-gated — that is a permission state, not a busy one).
                  */}
                  {onAnalyze && (
                    <button
                      type="button"
                      onClick={() => onAnalyze(threat.file)}
                      disabled={
                        !hasSentinelPro || analyzingFile === threat.file
                      }
                      aria-busy={analyzingFile === threat.file}
                      aria-label={
                        hasSentinelPro
                          ? `Analyze ${threat.file} with AI`
                          : "AI Analysis requires Pro license"
                      }
                      title={
                        hasSentinelPro
                          ? "Analyze with AI"
                          : "AI Analysis requires Pro license"
                      }
                      className="bg-swiss-navy focus-visible:ring-swiss-navy inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black tracking-[0.08em] text-white uppercase transition-colors hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {analyzingFile === threat.file ? (
                        <Loader2
                          size={10}
                          className="animate-spin"
                          aria-hidden="true"
                        />
                      ) : hasSentinelPro ? (
                        <Sparkles size={10} aria-hidden="true" />
                      ) : (
                        <Lock size={10} aria-hidden="true" />
                      )}
                      {analyzingFile === threat.file ? "Analyzing…" : "Analyze"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          {onMarkSafe && (
            <p className="mt-2 text-[11px] leading-snug font-medium text-neutral-500">
              Mark Safe adds the file to your ignore list so future scans skip
              it. You can review or remove entries later under Security Hub &gt;
              Ignore Paths.
            </p>
          )}
        </div>
      )}

      {!hasThreats && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <CheckCircle2
            size={16}
            className="shrink-0 text-emerald-600"
            aria-hidden="true"
          />
          <span className="text-xs font-black text-emerald-700">
            No malware detected. Your files look clean.
          </span>
        </div>
      )}

      {/*
        v2.9.28.08: Info banner + collapsible low-risk findings.
        Only renders when the scan returned info/low severity items. Explains
        to the user why the headline threat count is 0 despite N files being
        listed. Uses the plugin's standard info-banner pattern (bg-blue-50 +
        border-blue-100 + text-blue-700) — no hardcoded hex, no text-foreground
        on a light background. Icon is aria-hidden (decorative).
        NOTE: Quick Scan is local checksum + regex only — no AI is involved.
      */}
      {hasLowRisk && (
        <>
          <div
            role="note"
            className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50 p-3"
          >
            <Info
              size={12}
              className="mt-0.5 shrink-0 text-blue-700"
              aria-hidden="true"
            />
            <p className="text-xs leading-relaxed font-medium text-blue-700">
              Quick Scan compares your files against the official WordPress
              baseline. Bundled plugins and theme edits are expected deviations
              — they are flagged for visibility but not counted as threats. Only
              modified core files or suspicious patterns are actionable.
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowLowRisk((prev) => !prev)}
              aria-expanded={showLowRisk}
              aria-controls="low-risk-findings-list"
              className="bg-secondary hover:bg-secondary/70 border-border focus-visible:ring-swiss-navy flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <span className="text-xs font-black tracking-[0.08em] text-neutral-700 uppercase">
                {lowRiskThreats.length} low-risk finding
                {lowRiskThreats.length !== 1 ? "s" : ""} (not counted as
                threats)
              </span>
              {showLowRisk ? (
                <ChevronUp
                  size={14}
                  className="shrink-0 text-neutral-500"
                  aria-hidden="true"
                />
              ) : (
                <ChevronDown
                  size={14}
                  className="shrink-0 text-neutral-500"
                  aria-hidden="true"
                />
              )}
            </button>

            {showLowRisk && (
              <div id="low-risk-findings-list">
                {/*
                  v2.9.28.13 — Bulk-action bar for LOW-RISK findings.
                  On clean sites the "actionable threats" block is empty, so the
                  primary bulk bar never rendered. Users reported they could not
                  bulk-ignore low-risk deviations. This bar exposes Mark Safe /
                  Quarantine / Delete for the low-risk section independently,
                  with its own selection state (selectedLow).
                */}
                {onBulkAction && lowRiskThreats.length > 0 && (
                  <div className="bg-secondary border-border mt-2 mb-2 flex items-center justify-between gap-3 rounded-xl border p-2">
                    <label className="flex cursor-pointer items-center gap-2 text-xs font-black tracking-[0.08em] text-neutral-700 uppercase select-none">
                      <input
                        type="checkbox"
                        checked={
                          selectedLow.size > 0 &&
                          selectedLow.size === lowRiskThreats.length
                        }
                        onChange={() => {
                          if (selectedLow.size === lowRiskThreats.length)
                            setSelectedLow(new Set());
                          else
                            setSelectedLow(
                              new Set(lowRiskThreats.map((t) => t.file))
                            );
                        }}
                        aria-label={
                          selectedLow.size === lowRiskThreats.length
                            ? "Deselect all low-risk findings"
                            : "Select all low-risk findings"
                        }
                        className="border-border focus-visible:ring-swiss-navy h-4 w-4 rounded focus-visible:ring-2"
                      />
                      {selectedLow.size > 0
                        ? `${selectedLow.size} of ${lowRiskThreats.length} selected`
                        : `Select all (${lowRiskThreats.length})`}
                    </label>

                    {selectedLow.size > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const list = [...selectedLow];
                            Promise.resolve(onBulkAction("ignore", list)).then(
                              () => setSelectedLow(new Set())
                            );
                          }}
                          className="bg-secondary text-swiss-navy border-border hover:bg-muted focus-visible:ring-swiss-navy inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black tracking-[0.08em] uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none"
                        >
                          Mark {selectedLow.size} Safe
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!canRemediate) {
                              toast.error("Upgrade to a paid plan for this feature — swisswpsecure.com/products");
                              return;
                            }
                            const list = [...selectedLow];
                            Promise.resolve(
                              onBulkAction("quarantine", list)
                            ).then(() => setSelectedLow(new Set()));
                          }}
                          disabled={!canRemediate}
                          aria-disabled={!canRemediate ? true : undefined}
                          className={`focus-visible:ring-swiss-navy inline-flex items-center gap-1 rounded-full bg-amber-600 px-2.5 py-1 text-[10px] font-black tracking-[0.08em] text-white uppercase transition-colors hover:bg-amber-700 focus-visible:ring-2 focus-visible:outline-none${!canRemediate ? " cursor-not-allowed opacity-50" : ""}`}
                          title={!canRemediate ? "Requires a paid plan" : undefined}
                        >
                          {!canRemediate && <Lock size={10} aria-hidden="true" className="mr-0.5" />}
                          Quarantine {selectedLow.size}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!canRemediate) {
                              toast.error("Upgrade to a paid plan for this feature — swisswpsecure.com/products");
                              return;
                            }
                            const list = [...selectedLow];
                            Promise.resolve(onBulkAction("delete", list)).then(
                              () => setSelectedLow(new Set())
                            );
                          }}
                          disabled={!canRemediate}
                          aria-disabled={!canRemediate ? true : undefined}
                          className={`focus-visible:ring-swiss-navy inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-black tracking-[0.08em] text-white uppercase transition-colors hover:bg-red-700 focus-visible:ring-2 focus-visible:outline-none${!canRemediate ? " cursor-not-allowed opacity-50" : ""}`}
                          title={!canRemediate ? "Requires a paid plan" : undefined}
                        >
                          {!canRemediate && <Lock size={10} aria-hidden="true" className="mr-0.5" />}
                          Delete {selectedLow.size}
                        </button>
                        {onAnalyze && (
                          <button
                            type="button"
                            onClick={() => {
                              // v2.9.28.21 — cap + confirm flow (malware low-risk list).
                              const list = [...selectedLow];
                              if (aiProgress) return;
                              if (list.length > MAX_AI_BATCH) {
                                setAiConfirm(list);
                                return;
                              }
                              startAiBatch(list);
                            }}
                            disabled={!hasSentinelPro || !!aiProgress}
                            aria-disabled={!hasSentinelPro ? true : undefined}
                            aria-label={`Analyze ${selectedLow.size} selected files with AI`}
                            className={`bg-swiss-navy focus-visible:ring-swiss-navy inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black tracking-[0.08em] text-white uppercase hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none transition-colors${!hasSentinelPro || !!aiProgress ? "cursor-not-allowed opacity-50" : ""}`}
                          >
                            {!hasSentinelPro ? (
                              <Lock size={10} aria-hidden="true" />
                            ) : aiProgress ? (
                              <Loader2
                                size={10}
                                className="animate-spin"
                                aria-hidden="true"
                              />
                            ) : (
                              <Sparkles size={10} aria-hidden="true" />
                            )}
                            {aiProgress
                              ? `Analyzing ${aiProgress.current} of ${aiProgress.total}…`
                              : `Check ${selectedLow.size} with AI`}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <ul
                  role="list"
                  className="space-y-2"
                  aria-label="Low-risk findings not counted as threats"
                >
                  {lowRiskThreats.map((threat, idx) => {
                    const key = `lowrisk|${threat.file}|${idx}`;
                    const isPending = !!pendingSafe[key];
                    return (
                      <li
                        key={idx}
                        className="bg-secondary border-border flex items-start gap-2.5 rounded-xl border p-3"
                      >
                        {/* v2.9.28.13 — Per-row checkbox for low-risk findings. */}
                        {onBulkAction && (
                          <input
                            type="checkbox"
                            checked={selectedLow.has(threat.file)}
                            onChange={() => toggleOneLowThreat(threat.file)}
                            aria-label={`Select low-risk finding: ${threat.file}`}
                            className="border-border focus-visible:ring-swiss-navy mt-0.5 h-4 w-4 shrink-0 rounded focus-visible:ring-2"
                          />
                        )}
                        <Info
                          size={12}
                          className="mt-0.5 shrink-0 text-blue-700"
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black break-all text-neutral-700">
                            {threat.file}
                          </p>
                          <p className="mt-0.5 text-xs font-medium text-neutral-500">
                            {threat.type}
                            {threat.severity ? ` — ${threat.severity}` : ""}
                          </p>
                        </div>
                        {onMarkSafe && (
                          <button
                            type="button"
                            onClick={() => handleMarkSafe(key, threat.file)}
                            disabled={isPending}
                            aria-busy={isPending}
                            aria-label={`Mark ${threat.file} as safe and exclude from future scans`}
                            className="border-border hover:bg-secondary focus-visible:ring-swiss-navy inline-flex shrink-0 items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-[10px] font-black tracking-[0.08em] text-neutral-600 uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                            title="Exclude this file from future malware scans"
                          >
                            {isPending ? (
                              <Loader2
                                size={10}
                                className="animate-spin"
                                aria-hidden="true"
                              />
                            ) : (
                              <ShieldOff size={10} aria-hidden="true" />
                            )}
                            {isPending ? "Marking…" : "Ignore"}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-neutral-400">
          Scanned {new Date(result.scanned_at).toLocaleDateString()}
        </p>
        {onViewHistory && (
          <button
            type="button"
            onClick={onViewHistory}
            className="text-swiss-navy hover:text-swiss-navy/70 focus-visible:ring-swiss-navy inline-flex shrink-0 items-center gap-1.5 rounded text-xs font-black underline underline-offset-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
            aria-label="View this scan in the History tab"
          >
            View in History
            <ExternalLink size={11} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface ScanResultPanelProps {
  scanType: ScanTypeValue;
  result:
    | AiAuditResult
    | MalwareScanResult
    | FullAiScanResult
    | null
    | undefined;
  isLoading: boolean;
  onViewHistory?: () => void;
  /** Called when the user clicks "Mark Safe" on a finding. Receives the file path. */
  onMarkSafe?: (relativePath: string) => Promise<void> | void;
  /**
   * v2.9.30.x — Persistent "Mark Safe" by id (no file path). Used for AI Audit
   * findings without an `evidence` field — e.g. "WordPress Version Detected".
   * Forwarded only to AuditResultView; MalwareResultView ignores it.
   */
  onMarkSafeById?: (findingId: string) => Promise<void> | void;
  /** Hidden-by-safelist count returned by the backend; renders the disclosure banner. */
  hiddenSafelistCount?: number;
  /** Called when the user clicks "Manage" in the hidden-safelist disclosure. */
  onManageSafelist?: () => void;
  /** Called when the user clicks "Quarantine" on a finding. Receives the file path. */
  onQuarantine?: (filepath: string) => void;
  /**
   * v2.9.28.11 — Batch action handler (restored from v2.9.27.71).
   * When provided, ScanResultPanel renders a select-all checkbox + per-row
   * checkboxes + a batch-action bar with Mark Safe / Quarantine / Delete buttons.
   * Parent (SecurityHub) calls /security/bulk and updates the scan result state.
   */
  onBulkAction?: (
    action: "ignore" | "quarantine" | "delete",
    fileList: string[]
  ) => Promise<void> | void;
  /**
   * v2.9.28.14 — Per-threat "Analyze with AI" handler (regression restore from v2.9.27.94).
   * Only malware / full-ai scan types render the button; ai-audit ignores it.
   */
  onAnalyze?: (filepath: string, options?: { bulk?: boolean }) => void;
  /** v2.9.28.14 — File path currently being analyzed (drives per-row spinner). */
  analyzingFile?: string | null;
  /** v2.9.28.14 — Security-plan gate. When false, the Analyze/Check with AI button renders disabled with a Lock icon. */
  hasSentinelPro?: boolean;
  /**
   * Any-paid gate for quarantine/delete bulk actions.
   * When false, the Quarantine and Delete buttons in the bulk action bar render disabled.
   * Separate from hasSentinelPro so Security-plan users get AI analysis while any-paid
   * users (including SEO_MONTHLY) get remediation actions.
   */
  canRemediate?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const ScanResultPanel: React.FC<ScanResultPanelProps> = ({
  scanType,
  result,
  isLoading,
  onViewHistory,
  onMarkSafe,
  onMarkSafeById,
  hiddenSafelistCount,
  onManageSafelist,
  onQuarantine,
  onBulkAction,
  onAnalyze,
  analyzingFile,
  hasSentinelPro,
  canRemediate,
}) => {
  if (isLoading) {
    return <LoadingBar />;
  }

  if (!result) {
    return null;
  }

  // v2.9.29.0 — deep-malware reuses the MalwareResultView since it returns
  // the same MalwareScanResult shape (with optional source/status fields).
  if (scanType === "malware" || scanType === "deep-malware") {
    return (
      <MalwareResultView
        result={result as MalwareScanResult}
        onViewHistory={onViewHistory}
        onMarkSafe={onMarkSafe}
        onBulkAction={onBulkAction}
        onAnalyze={onAnalyze}
        analyzingFile={analyzingFile}
        hasSentinelPro={hasSentinelPro}
        canRemediate={canRemediate}
      />
    );
  }

  return (
    <AuditResultView
      result={result as AiAuditResult | FullAiScanResult}
      isFullAi={scanType === "full-ai"}
      onViewHistory={onViewHistory}
      onMarkSafe={onMarkSafe}
      onMarkSafeById={onMarkSafeById}
      hiddenSafelistCount={
        hiddenSafelistCount ??
        (result as AiAuditResult | FullAiScanResult).hidden_safelist_count
      }
      onManageSafelist={onManageSafelist}
      onQuarantine={onQuarantine}
      onBulkAction={onBulkAction}
      onAnalyze={onAnalyze}
      hasSentinelPro={hasSentinelPro}
      canRemediate={canRemediate}
    />
  );
};

export default ScanResultPanel;
