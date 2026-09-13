import React, { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Zap,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Search,
} from "lucide-react";
import type {
  OnPageAuditResult,
  OnPageFactor,
  OnPageIssue,
} from "../../../types";

interface OnPageDiagnosticsProps {
  seoBreakdown: {
    on_page: number;
    technical: number;
    content: number;
  };
}

/** Label mapping for score cards. */
const DIMENSION_LABELS: Record<string, string> = {
  on_page: "Meta Coverage",
  technical: "Technical",
  content: "Image Alt Text",
};

/** Color class for a given score percentage. */
const scoreColor = (score: number): string => {
  if (score >= 90)
    return "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]";
  if (score >= 70) return "bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]";
  if (score >= 40)
    return "bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.2)]";
  return "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]";
};

/** Text color for a given score percentage. */
const scoreTextColor = (score: number): string => {
  if (score >= 90) return "text-emerald-600";
  if (score >= 70) return "text-yellow-600";
  if (score >= 40) return "text-orange-600";
  return "text-red-600";
};

/** Dot color for severity badge. */
const severityDot = (severity: string): string => {
  if (severity === "high") return "bg-red-500";
  if (severity === "medium") return "bg-orange-500";
  return "bg-yellow-500";
};

const fetchOnPageAudit = async (force: boolean): Promise<OnPageAuditResult> => {
  const apiUrl = window.swisswpsuiteData?.apiUrl;
  const nonce = window.swisswpsuiteData?.nonce;
  if (!apiUrl || !nonce) {
    throw new Error("API not available");
  }
  const url = force
    ? `${apiUrl}/seo/onpage-audit?force=1`
    : `${apiUrl}/seo/onpage-audit`;
  const res = await fetch(url, {
    headers: { "X-WP-Nonce": nonce },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
};

const FactorRow: React.FC<{ factorKey: string; factor: OnPageFactor }> = ({
  factorKey,
  factor,
}) => {
  const [expanded, setExpanded] = useState(false);
  const issueCount = factor.issues.length;
  const displayIssues = factor.issues.slice(0, 10);

  return (
    <div className="border-border overflow-hidden rounded-2xl border">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="hover:bg-background/50 flex w-full items-center justify-between p-4 text-left transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${scoreColor(factor.score)}`} />
          <span className="text-[11px] font-black tracking-widest text-neutral-700 uppercase">
            {factor.label}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-[11px] font-black ${scoreTextColor(factor.score)}`}
          >
            {factor.score}%
          </span>
          {issueCount > 0 && (
            <span className="rounded-full border border-red-100 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
              {issueCount} {issueCount === 1 ? "issue" : "issues"}
            </span>
          )}
          {expanded ? (
            <ChevronUp size={14} className="text-neutral-400" />
          ) : (
            <ChevronDown size={14} className="text-neutral-400" />
          )}
        </div>
      </button>
      {expanded && displayIssues.length > 0 && (
        <div className="border-border bg-background/30 divide-border divide-y border-t">
          {displayIssues.map((issue: OnPageIssue, idx: number) => (
            <div
              key={`${issue.post_id}-${idx}`}
              className="flex flex-col gap-1.5 p-4"
            >
              <div className="flex items-center gap-2">
                <div
                  className={`h-1.5 w-1.5 rounded-full ${severityDot(issue.severity)}`}
                />
                <a
                  href={issue.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-swiss-navy flex max-w-[280px] items-center gap-1 truncate text-xs font-bold hover:underline"
                >
                  {issue.title}
                  <ExternalLink size={10} className="flex-shrink-0" />
                </a>
              </div>
              <p className="ml-3.5 text-[11px] text-neutral-600">{issue.gap}</p>
              <p className="ml-3.5 text-[10px] text-neutral-400 italic">
                {issue.fix_hint}
              </p>
            </div>
          ))}
          {issueCount > 10 && (
            <div className="p-3 text-center text-[10px] font-bold tracking-widest text-neutral-400 uppercase">
              + {issueCount - 10} more issues
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const OnPageDiagnostics: React.FC<OnPageDiagnosticsProps> = ({
  seoBreakdown,
}) => {
  const [hasTriggeredScan, setHasTriggeredScan] = useState(false);

  const {
    data: auditData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<OnPageAuditResult>({
    queryKey: ["onpage-audit"],
    queryFn: () => fetchOnPageAudit(hasTriggeredScan),
    enabled: false,
    // A2: PHP onpage-audit always returns status: "complete" — no polling needed.
    // isFetching (React Query internal) handles the loading state during refetch.
    refetchInterval: false,
  });

  const handleRunScan = useCallback(() => {
    setHasTriggeredScan(true);
    refetch();
  }, [refetch]);

  // A2: PHP always returns status: "complete" — scanning state is derived from isFetching only.
  const isScanning = isFetching;

  return (
    <div className="glass-panel border-border rounded-[32px] border p-10">
      <h3
        className="text-swiss-navy border-border mb-2 border-b pb-6 text-center text-[12px] font-black tracking-[0.3em] uppercase"
        title="Composite of metadata coverage, technical health, and image alt text quality"
      >
        SEO Health Breakdown
      </h3>
      <p className="mb-8 text-center text-[10px] text-neutral-500 italic">
        Composite of metadata coverage, technical health, and image alt text
        quality
      </p>

      {/* Score Cards — always visible from stats */}
      <div className="mb-8 space-y-8">
        {Object.entries(seoBreakdown).map(([key, value]) => (
          <div key={key} className="group">
            <div className="mb-3 flex justify-between text-[11px] font-black tracking-widest text-neutral-700 uppercase">
              <span className="group-hover:text-swiss-navy transition-colors">
                {DIMENSION_LABELS[key] || key.replace("_", " ")}
              </span>
              <span className="text-swiss-navy">{value}%</span>
            </div>
            <div className="bg-background border-border h-3 w-full overflow-hidden rounded-full border p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  value > 80
                    ? "bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                    : "bg-red-500 shadow-[0_0_15px_rgba(213,43,30,0.2)]"
                }`}
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Explanation text — always visible */}
      <p className="mb-6 px-1 text-[10px] leading-relaxed text-neutral-500">
        Technical score reflects server and WordPress configuration — the plugin
        monitors and can help fix these. Meta Coverage and Image Alt Text scores
        reflect your content decisions — the plugin identifies what is missing;
        you make the changes.
      </p>

      {/* Run Full Scan button */}
      <button
        type="button"
        onClick={handleRunScan}
        disabled={isScanning}
        className="swps-cta-dark flex w-full items-center justify-center gap-2 rounded-2xl p-4 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isScanning ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            <span className="text-xs font-black tracking-widest uppercase">
              Scanning your site...
            </span>
          </>
        ) : (
          <>
            <Search size={14} />
            <span className="text-xs font-black tracking-widest uppercase">
              Run Full Scan
            </span>
          </>
        )}
      </button>

      {/* Audit Results — shown after scan completes */}
      {auditData && auditData.status === "complete" && (
        <div className="mt-8 space-y-6">
          {/* Overall score badge */}
          <div className="bg-background/50 border-border flex items-center justify-between rounded-2xl border p-4">
            <div className="flex items-center gap-3">
              {auditData.score >= 80 ? (
                <CheckCircle size={18} className="text-emerald-500" />
              ) : auditData.score >= 50 ? (
                <AlertTriangle size={18} className="text-orange-500" />
              ) : (
                <AlertTriangle size={18} className="text-red-500" />
              )}
              <span className="text-[11px] font-black tracking-widest text-neutral-700 uppercase">
                Overall SEO Health
              </span>
            </div>
            <span
              className={`text-lg font-black ${scoreTextColor(auditData.score)}`}
            >
              {auditData.score}%
            </span>
          </div>

          {/* Metadata */}
          <div className="flex justify-between px-1 text-[10px] text-neutral-400">
            <span>
              {auditData.post_count} pages scanned
              {auditData.is_sample ? " (sample)" : ""}
            </span>
            <span>
              Last scan: {new Date(auditData.scanned_at).toLocaleString()}
            </span>
          </div>

          {/* Per-factor expandable rows */}
          <div className="space-y-2">
            {Object.entries(auditData.factors).map(([key, factor]) => (
              <FactorRow key={key} factorKey={key} factor={factor} />
            ))}
          </div>

          {/* Quick Wins */}
          {auditData.quick_wins.length > 0 && (
            <div className="mt-6">
              <h4 className="text-swiss-navy mb-4 flex items-center gap-2 text-[11px] font-black tracking-[0.2em] uppercase">
                <Zap size={12} />
                Quick Wins
              </h4>
              <div className="space-y-2">
                {auditData.quick_wins.map((win, idx) => (
                  <div
                    key={idx}
                    className="bg-background/30 border-border flex items-start gap-3 rounded-xl border p-3"
                  >
                    <span className="text-swiss-navy bg-swiss-navy/5 mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-black">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-[11px] font-bold text-neutral-700">
                        {win.action}
                      </p>
                      <p className="text-[10px] font-bold text-emerald-600">
                        {win.impact}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OnPageDiagnostics;
