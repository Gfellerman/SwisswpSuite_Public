import React, { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Lock,
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
import { FULL_SCAN_LOCKED_LABEL } from "./onPageProCopy";

interface OnPageDiagnosticsProps {
  seoBreakdown: {
    on_page: number;
    technical: number;
    content: number;
  };
  isPro: boolean;
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
    <div className="border border-border rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-background/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${scoreColor(factor.score)}`} />
          <span className="text-[11px] font-black uppercase tracking-widest text-neutral-700">
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
            <span className="text-[10px] font-bold bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-100">
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
        <div className="border-t border-border bg-background/30 divide-y divide-border">
          {displayIssues.map((issue: OnPageIssue, idx: number) => (
            <div
              key={`${issue.post_id}-${idx}`}
              className="p-4 flex flex-col gap-1.5"
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${severityDot(issue.severity)}`}
                />
                <a
                  href={issue.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-swiss-navy hover:underline flex items-center gap-1 truncate max-w-[280px]"
                >
                  {issue.title}
                  <ExternalLink size={10} className="flex-shrink-0" />
                </a>
              </div>
              <p className="text-[11px] text-neutral-600 ml-3.5">{issue.gap}</p>
              <p className="text-[10px] text-neutral-400 ml-3.5 italic">
                {issue.fix_hint}
              </p>
            </div>
          ))}
          {issueCount > 10 && (
            <div className="p-3 text-center text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
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
  isPro,
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
    if (!isPro) return;
    setHasTriggeredScan(true);
    refetch();
  }, [isPro, refetch]);

  // A2: PHP always returns status: "complete" — scanning state is derived from isFetching only.
  const isScanning = isFetching;

  return (
    <div className="glass-panel rounded-[32px] p-10 border border-border">
      <h3
        className="text-[12px] font-black text-swiss-navy uppercase tracking-[0.3em] mb-2 border-b border-border pb-6 text-center"
        title="Composite of metadata coverage, technical health, and image alt text quality"
      >
        SEO Health Breakdown
      </h3>
      <p className="text-[10px] text-neutral-500 text-center mb-8 italic">
        Composite of metadata coverage, technical health, and image alt text
        quality
      </p>

      {/* Score Cards — always visible from stats */}
      <div className="space-y-8 mb-8">
        {Object.entries(seoBreakdown).map(([key, value]) => (
          <div key={key} className="group">
            <div className="flex justify-between text-[11px] mb-3 font-black uppercase tracking-widest text-neutral-700">
              <span className="group-hover:text-swiss-navy transition-colors">
                {DIMENSION_LABELS[key] || key.replace("_", " ")}
              </span>
              <span className="text-swiss-navy">{value}%</span>
            </div>
            <div className="h-3 bg-background rounded-full w-full overflow-hidden p-0.5 border border-border">
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
      <p className="text-[10px] text-neutral-500 leading-relaxed mb-6 px-1">
        Technical score reflects server and WordPress configuration — the plugin
        monitors and can help fix these. Meta Coverage and Image Alt Text scores
        reflect your content decisions — the plugin identifies what is missing;
        you make the changes.
      </p>

      {/* Run Full Scan button */}
      {!isPro ? (
        <div className="flex items-center justify-center gap-2 p-4 bg-neutral-50 rounded-2xl border border-neutral-200">
          <Lock size={14} className="text-neutral-400" />
          <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
            {FULL_SCAN_LOCKED_LABEL}
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleRunScan}
          disabled={isScanning}
          className="swps-cta-dark w-full flex items-center justify-center gap-2 p-4 rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isScanning ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span className="text-xs font-black uppercase tracking-widest">
                Scanning your site...
              </span>
            </>
          ) : (
            <>
              <Search size={14} />
              <span className="text-xs font-black uppercase tracking-widest">
                Run Full Scan
              </span>
            </>
          )}
        </button>
      )}

      {/* Audit Results — shown after scan completes */}
      {auditData && auditData.status === "complete" && (
        <div className="mt-8 space-y-6">
          {/* Overall score badge */}
          <div className="flex items-center justify-between p-4 bg-background/50 rounded-2xl border border-border">
            <div className="flex items-center gap-3">
              {auditData.score >= 80 ? (
                <CheckCircle size={18} className="text-emerald-500" />
              ) : auditData.score >= 50 ? (
                <AlertTriangle size={18} className="text-orange-500" />
              ) : (
                <AlertTriangle size={18} className="text-red-500" />
              )}
              <span className="text-[11px] font-black uppercase tracking-widest text-neutral-700">
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
          <div className="flex justify-between text-[10px] text-neutral-400 px-1">
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
              <h4 className="text-[11px] font-black text-swiss-navy uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <Zap size={12} />
                Quick Wins
              </h4>
              <div className="space-y-2">
                {auditData.quick_wins.map((win, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-background/30 rounded-xl border border-border"
                  >
                    <span className="text-[10px] font-black text-swiss-navy bg-swiss-navy/5 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-[11px] font-bold text-neutral-700">
                        {win.action}
                      </p>
                      <p className="text-[10px] text-emerald-600 font-bold">
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
