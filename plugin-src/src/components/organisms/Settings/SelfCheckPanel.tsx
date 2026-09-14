/**
 * AGENT: frontend-specialist
 * Skills: react-patterns, ui-ux-pro-max, typescript-expert
 * Date: 2026-09-07
 *
 * Self-Check panel (DIAG-EXPORT-SELFCHECK Phase 1, v2.9.33.53).
 *
 * Response shape is copied verbatim into types.ts (SelfCheckResult et
 * al.) to match class-swisswpsuite-selfcheck.php's response shape.
 *
 * One-click AJAX, no "Save" button: "Run self-check" fires
 * POST /selfcheck/run and updates in place; nothing here requires a page
 * reload. "Export diagnostics" downloads a JSON file client-side (Blob +
 * object URL) — no network round trip beyond the GET that fetches the
 * redacted payload. "Never auto-sent" is a structural property here —
 * this component contains zero transport code for the exported payload
 * beyond the single GET that retrieves it.
 *
 * Six statuses render distinctly (never collapse `not_available` or
 * `inconclusive` into a failure-looking style):
 *   ok             — passed
 *   warn           — passed with a caveat worth reviewing
 *   fail           — a real problem
 *   skip           — this check does not apply here (never a problem)
 *   not_available  — this check does not apply to this install
 *   inconclusive   — could not determine (never shown as a failure)
 *
 * Audit-fix round:
 *   - M-1: "Run self-check" no longer sends mail (the backend moved the
 *     mail probe out of run_all()); the panel copy above reflects that.
 *     "Send test email" is a NEW, separate, explicit action — its own
 *     mutation, own POST /selfcheck/mail-test, own transient result —
 *     never folded into the cached self-check result.
 *   - M-3: GET /selfcheck/export reports "you haven't run it yet" as a
 *     200 with `success:false, code:'never_run'`, NOT a genuine
 *     route-not-found error — see isNeverRunExport() below.
 *   - H-1: the never-run shape of /selfcheck/last is `SelfCheckNeverRun`
 *     (`ran_at: null`), never `SelfCheckResult` with `ran_at: 0` — see
 *     hasRun()'s docblock.
 *
 * Every network call here uses ordinary error handling: a failed request
 * surfaces the server's own message (or a neutral fallback), and the
 * existing loading/error/empty/success states cover the rest — see
 * errorMessage() below.
 */

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "../../../lib/toast";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { Badge } from "../../ui/Badge";
import { ApiError, wpApi } from "../../../services/api";
import type {
  SelfCheckExportResponse,
  SelfCheckItem,
  SelfCheckLastResponse,
  SelfCheckMailTestResponse,
  SelfCheckResult,
  SelfCheckStatus,
} from "../../../types";
import {
  AlertTriangle,
  Ban,
  CheckCircle,
  Download,
  HelpCircle,
  Loader2,
  MinusCircle,
  PlayCircle,
  Send,
  XCircle,
} from "lucide-react";

const SELFCHECK_QUERY_KEY = ["selfcheck", "last"] as const;

/**
 * M-3 (VALIDATOR_V53_SELFCHECK_FIXES.md §2.3/§7): the export route reports
 * "never run" as a 200 with `success:false, code:'never_run'`, not a 404.
 * `wpApi()` auto-throws an ApiError for any `success:false` 2xx body, so
 * this state arrives here as a normal catch — distinguish it from a
 * genuinely missing route (404) by the `code` field on the error's `data`.
 */
function isNeverRunExport(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    (err.data as { code?: string } | undefined)?.code === "never_run"
  );
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}

/**
 * Discriminates the two `/selfcheck/last` shapes by the presence of
 * `groups` — the never-run response (`SelfCheckNeverRun`, `ran_at: null`)
 * never carries it. CORRECTED 2026-09-07 (H-1): a prior revision treated
 * `ran_at === 0` as the never-run sentinel; the backend never sends that —
 * it sends a structurally different, `null`-ran_at body.
 */
function hasRun(
  data: SelfCheckLastResponse | undefined
): data is SelfCheckResult {
  return !!data && "groups" in data;
}

const STATUS_META: Record<
  SelfCheckStatus,
  {
    label: string;
    icon: React.ElementType;
    badgeVariant:
      "success" | "warning" | "danger" | "neutral" | "info" | "outline";
    /** role="status" text color class, matches the Badge palette. */
    textClass: string;
  }
> = {
  ok: {
    label: "OK",
    icon: CheckCircle,
    badgeVariant: "success",
    textClass: "text-emerald-800 dark:text-emerald-400",
  },
  warn: {
    label: "Warning",
    icon: AlertTriangle,
    badgeVariant: "warning",
    textClass: "text-amber-800 dark:text-amber-400",
  },
  fail: {
    label: "Failed",
    icon: XCircle,
    badgeVariant: "danger",
    textClass: "text-red-700 dark:text-red-400",
  },
  skip: {
    label: "Skipped",
    icon: MinusCircle,
    badgeVariant: "neutral",
    textClass: "text-neutral-600 dark:text-neutral-400",
  },
  not_available: {
    label: "Not applicable",
    icon: Ban,
    badgeVariant: "outline",
    textClass: "text-neutral-600 dark:text-neutral-400",
  },
  inconclusive: {
    label: "Could not determine",
    icon: HelpCircle,
    badgeVariant: "info",
    textClass: "text-blue-700 dark:text-blue-400",
  },
};

function StatusBadge({ status }: { status: SelfCheckStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.inconclusive;
  const Icon = meta.icon;
  return (
    <Badge variant={meta.badgeVariant} icon={Icon}>
      {meta.label}
    </Badge>
  );
}

function CheckRow({ check }: { check: SelfCheckItem }) {
  const meta = STATUS_META[check.status] ?? STATUS_META.inconclusive;
  return (
    <li className="border-border flex flex-col gap-2 border-b py-3 last:border-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${meta.textClass}`}>{check.label}</p>
        {check.detail ? (
          <p className="mt-0.5 text-xs text-neutral-700 dark:text-neutral-400">
            {check.detail}
          </p>
        ) : null}
        {check.evidence ? (
          <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
            {check.evidence}
          </p>
        ) : null}
      </div>
      <div className="shrink-0">
        <StatusBadge status={check.status} />
      </div>
    </li>
  );
}

function SummaryRow({ summary }: { summary: SelfCheckResult["summary"] }) {
  // Frozen contract's summary carries exactly 5 buckets (ok/warn/fail/skip/
  // not_available) — see types.ts's SelfCheckSummary docblock for why
  // `inconclusive` has no dedicated bucket here.
  //
  // Labels here are deliberately distinct wording from STATUS_META's
  // per-check badge labels (e.g. "Failures" here vs. "Failed" on the
  // per-check badge) — a testing-library getNodeText() dedupe/collision
  // gotcha found in SelfCheckPanel.test.tsx: it reads only DIRECT text-node
  // children, so a chip like `<span><span>{count}</span>{label}</span>`
  // exposes `label` alone as this element's matchable text, identical to a
  // same-worded badge elsewhere on the page. Distinct wording keeps every
  // status's rendered text unambiguous for screen readers and tests alike.
  const chips: Array<{ key: keyof SelfCheckResult["summary"]; label: string }> =
    [
      { key: "ok", label: "OK" },
      { key: "warn", label: "Warnings" },
      { key: "fail", label: "Failures" },
      { key: "skip", label: "Skips" },
      { key: "not_available", label: "N/A" },
    ];

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map(({ key, label }) => (
        <span
          key={key}
          className="border-border bg-secondary dark:bg-card/50 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300"
        >
          <span className="dark:text-foreground font-black text-neutral-900">
            {summary[key]}
          </span>
          {label}
        </span>
      ))}
    </div>
  );
}

function formatLastRun(ranAt: number): string {
  try {
    return new Date(ranAt * 1000).toLocaleString();
  } catch {
    return "";
  }
}

function buildExportFilename(): string {
  let host = "site";
  try {
    const homeUrl = window.swisswpsuiteData?.homeUrl || window.location.href;
    const parsed = new URL(homeUrl);
    if (parsed.hostname) host = parsed.hostname;
  } catch {
    if (window.location.hostname) host = window.location.hostname;
  }
  const safeHost = host.replace(/[^a-z0-9.-]/gi, "_");
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `swisssuite-diagnostics-${safeHost}-${date}.json`;
}

/**
 * Triggers a client-side JSON file download via a Blob + object URL. No
 * network request beyond the one that already fetched `payload` — this
 * function performs no transport of its own.
 */
function triggerJsonDownload(filename: string, payload: unknown): void {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function SelfCheckPanel() {
  const queryClient = useQueryClient();
  const [exporting, setExporting] = useState(false);
  // WCAG 4.1.3 / NVDA two-step live-region pattern (matches
  // UpdateReviewPanel.tsx): a single, ALWAYS-MOUNTED sr-only role="status"
  // span (rendered unconditionally below, outside every branch of the
  // loading/error/results ternary) is the sole live-region owner for this
  // panel. NVDA/JAWS require the node to already exist before content is
  // injected — a node that mounts already-populated (as SummaryRow's div
  // did) is frequently missed. Clearing then re-setting on a fresh tick
  // guarantees a DOM mutation NVDA can observe even for back-to-back runs
  // with an identical summary.
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    if (!announcement) return;
    const id = setTimeout(() => setAnnouncement(""), 3000);
    return () => clearTimeout(id);
  }, [announcement]);
  const announce = (message: string) => {
    setAnnouncement("");
    setTimeout(() => setAnnouncement(message), 0);
  };
  const lastQuery = useQuery<SelfCheckLastResponse>({
    queryKey: SELFCHECK_QUERY_KEY,
    queryFn: () => wpApi<SelfCheckLastResponse>("/selfcheck/last"),
    // This is a manual, on-demand admin panel, not a background poll — the
    // default client-wide retry:3-with-backoff (lib/queryClient.ts) would
    // delay a 404 "older backend, route doesn't exist yet" verdict by
    // several seconds for no benefit. Fail fast; the user can re-open the
    // tab or click "Run self-check" to try again.
    retry: false,
  });

  const runMutation = useMutation({
    mutationFn: () =>
      wpApi<SelfCheckResult>("/selfcheck/run", { method: "POST" }),
    onSuccess: (data) => {
      queryClient.setQueryData(SELFCHECK_QUERY_KEY, data);
      toast.success("Self-check complete.");
      const s = data.summary;
      announce(
        `Self-check complete: ${s.ok} OK, ${s.warn} warnings, ${s.fail} failures, ${s.skip} skipped, ${s.not_available} not applicable.`
      );
    },
    onError: (err) => {
      toast.error(`Self-check could not run: ${errorMessage(err, "please try again.")}`);
    },
  });

  // M-1 (VALIDATOR_V53_SELFCHECK_FIXES.md §3/§5): the mail probe is a
  // separate, explicit, one-click action — never part of `run_all()` — so
  // its result is transient local state, not persisted into the cached
  // self-check result. Same doctrine the module already applies to the WAF
  // self-test's "Run self-test now" button.
  const [mailTestResult, setMailTestResult] = useState<SelfCheckItem | null>(
    null
  );
  const mailTestMutation = useMutation({
    mutationFn: () =>
      wpApi<SelfCheckMailTestResponse>("/selfcheck/mail-test", {
        method: "POST",
      }),
    onSuccess: (data) => {
      setMailTestResult(data.check);
      // WCAG 4.1.3: this toast is the ONLY channel that reaches screen
      // reader users for this action — the persistent CheckRow below is
      // plain DOM (not a live region) and the panel's dedicated
      // `announce()` helper is reserved for the "Run self-check" bulk
      // summary (see its own comment above), so it is never called here.
      // A hardcoded "sent" string on the non-fail branch was both
      // misleading (a `skip` result — e.g. no admin email configured —
      // never actually sent anything) and a parity gap (sighted users saw
      // `data.check.detail` in the row; AT users heard only the generic
      // string). Use the same plain-English `detail` field for every
      // status — but pick the toast SEVERITY by status too (F-side-note,
      // REAUDIT_V53_SELFCHECK_ROUND2.md, 2026-09-07): a prior revision
      // routed every non-fail status through `toast.success`, so a `warn`
      // result (e.g. mail intercepted by another plugin's pre_wp_mail
      // filter) rendered as a GREEN success toast carrying warning text —
      // actively misleading. `ok` is the only genuinely successful outcome;
      // `warn` is a caveat worth reviewing; `skip` means nothing was
      // attempted at all. send_test_mail() (POST /selfcheck/mail-test) only
      // ever returns ok/warn/fail/skip — `inconclusive`/`not_available` are
      // reserved for other checks in the run_all() suite.
      switch (data.check.status) {
        case "fail":
          toast.error(data.check.detail || "The test email could not be sent.");
          break;
        case "warn":
          toast.warning(
            data.check.detail || "The test email result needs review."
          );
          break;
        case "skip":
          toast.info(data.check.detail || "The test email was not sent.");
          break;
        case "ok":
        default:
          toast.success(data.check.detail || "Test email request sent.");
          break;
      }
    },
    onError: (err) => {
      toast.error(
        `Could not send the test email: ${errorMessage(err, "please try again.")}`
      );
    },
  });

  const result = lastQuery.data;
  const running = runMutation.isPending;
  const mailTesting = mailTestMutation.isPending;

  // WCAG 2.1.1 / 4.1.2 (a11y review fix): native `disabled` removes the
  // Export button from the tab order entirely, so its `title` — the ONLY
  // explanation for why it is unavailable — is unreachable by keyboard and
  // never announced by AT. `exportBlocked` drives `aria-disabled` instead
  // (button stays focusable + explained); the `exporting` in-flight state
  // stays a native `disabled` via the Button `loading` prop, since that is
  // a momentary, self-clearing gate, not a persistent explained state.
  const exportUnavailableReason = !hasRun(result)
    ? "Run a self-check first"
    : undefined;
  const exportBlocked = exportUnavailableReason !== undefined;

  const handleRun = () => {
    runMutation.mutate();
  };

  const handleSendTestEmail = () => {
    if (mailTesting) return;
    mailTestMutation.mutate();
  };

  const handleExport = async () => {
    if (exporting || exportBlocked) return;
    setExporting(true);
    try {
      const payload = await wpApi<SelfCheckExportResponse>("/selfcheck/export");
      triggerJsonDownload(buildExportFilename(), payload);
      toast.success("Diagnostics file downloaded.");
    } catch (err) {
      if (isNeverRunExport(err)) {
        // M-3: the export route reports "never run" as a 200 with
        // success:false rather than a genuine error — a friendly, distinct
        // message from the ordinary error-handling branch below.
        toast.error(
          errorMessage(err, "Run the self-check first, then export.")
        );
      } else {
        toast.error(
          `Could not export diagnostics: ${errorMessage(err, "please try again.")}`
        );
      }
    } finally {
      setExporting(false);
    }
  };

  const lastRunLabel = useMemo(
    () => (hasRun(result) ? formatLastRun(result.ran_at) : ""),
    [result]
  );

  return (
    <Card className="max-w-3xl space-y-6 p-6">
      {/*
        WCAG 4.1.3: the sole live-region for this panel. Always mounted
        (never conditionally rendered) so NVDA/JAWS observe it as an
        existing node whose text mutates, not a freshly-inserted node that
        already carries content — see the two-step `announce()` helper.
      */}
      <span role="status" className="sr-only">
        {announcement}
      </span>
      <div className="border-border flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="dark:text-foreground text-lg font-semibold text-neutral-900">
            Self-Check
          </h3>
          <p className="text-xs text-neutral-700 dark:text-neutral-400">
            A quick, on-demand review of your site's security, backups,
            scheduling, and environment. Running it checks everything locally
            and sends nothing anywhere. The separate "Send test email" button
            below is the only action here that sends anything — one real email,
            on request.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 rounded-xl text-xs font-black tracking-widest uppercase"
          onClick={handleRun}
          disabled={running}
          loading={running}
          aria-busy={running}
          icon={running ? undefined : PlayCircle}
        >
          {running ? "Running…" : "Run self-check"}
        </Button>
      </div>

      {lastQuery.isError ? (
        <p
          className="text-xs font-semibold text-red-700 dark:text-red-400"
          role="status"
        >
          Status unavailable — try again.
        </p>
      ) : lastQuery.isLoading ? (
        <p
          className="flex items-center gap-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400"
          role="status"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Checking…
        </p>
      ) : !hasRun(result) ? (
        <p
          className="text-xs font-semibold text-neutral-600 dark:text-neutral-400"
          role="status"
        >
          Never run — click "Run self-check" to see your site's status across
          security, backups, scheduling, and more.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Last run: {lastRunLabel}
            </p>
          </div>
          <SummaryRow summary={result.summary} />

          <div className="space-y-4">
            {result.groups.map((group) => (
              <details key={group.id} open className="group">
                <summary className="cursor-pointer text-xs font-black tracking-widest text-neutral-700 uppercase dark:text-neutral-300">
                  {group.label}
                </summary>
                <ul className="mt-2 pl-1">
                  {group.checks.map((check) => (
                    <CheckRow key={check.id} check={check} />
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </div>
      )}

      <div className="border-border flex flex-col gap-4 border-t pt-4">
        <div>
          <Button
            variant="secondary"
            size="sm"
            className={`rounded-xl text-xs font-black tracking-widest uppercase ${
              exportBlocked ? "cursor-not-allowed opacity-50" : ""
            }`}
            onClick={handleExport}
            aria-disabled={exportBlocked || undefined}
            loading={exporting}
            aria-busy={exporting}
            icon={exporting ? undefined : Download}
            aria-label={
              exportBlocked
                ? `Export diagnostics — ${exportUnavailableReason}`
                : undefined
            }
            title={exportUnavailableReason}
          >
            {exporting ? "Preparing…" : "Export diagnostics"}
          </Button>
          <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
            Nothing is sent anywhere — this file stays on your computer until
            you attach it to a support request.
          </p>
        </div>

        <div>
          <Button
            variant="secondary"
            size="sm"
            className="rounded-xl text-xs font-black tracking-widest uppercase"
            onClick={handleSendTestEmail}
            loading={mailTesting}
            aria-busy={mailTesting}
            icon={mailTesting ? undefined : Send}
          >
            {mailTesting ? "Sending…" : "Send test email"}
          </Button>
          <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
            Sends one real email to your site's admin address, on request, to
            confirm outgoing mail works. Unlike "Run self-check", this is not
            checked automatically.
          </p>
          {mailTestResult ? (
            <ul className="mt-2">
              <CheckRow check={mailTestResult} />
            </ul>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export default SelfCheckPanel;
