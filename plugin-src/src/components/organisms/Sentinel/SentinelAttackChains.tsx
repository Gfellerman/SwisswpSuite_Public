import React, { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Lock,
  Flame,
  ExternalLink,
} from "lucide-react";
import { Badge } from "../../ui/Badge";
import type { SentinelAttackChain } from "../../../types";
import {
  CHAIN_SEVERITY_ORDER,
  CHAIN_SEVERITY_BORDER,
  CHAIN_SEVERITY_DOT,
} from "./sentinelConstants";

interface SentinelAttackChainsProps {
  chains: SentinelAttackChain[];
  /** List of active security feature names — used to determine "Blocked" state */
  activeProtections: string[];
  isPro: boolean;
}

// Sort order for exploitability (trivial is most dangerous, so sort first)
const EXPLOITABILITY_ORDER: Record<
  SentinelAttackChain["exploitability"],
  number
> = {
  trivial: 0,
  moderate: 1,
  difficult: 2,
  theoretical: 3,
};

interface ExploitabilityLabelProps {
  level: SentinelAttackChain["exploitability"];
}

const ExploitabilityLabel: React.FC<ExploitabilityLabelProps> = ({ level }) => {
  // WCAG 1.4.3: All text colors must achieve 4.5:1 contrast on bg-card (≈ white).
  // red-600   (#DC2626) = ~4.6:1 — borderline; red-700   (#B91C1C) = ~5.1:1 — safe.
  // amber-600 (#D97706) = ~3.5:1 — FAILS;      amber-700 (#B45309) = ~4.7:1 — safe.
  // cyan-600  (#0891B2) = ~3.8:1 — FAILS;      cyan-700  (#0E7490) = ~4.6:1 — safe.
  // slate-500 (#64748B) = ~3.5:1 — FAILS;      slate-600 (#475569) = ~5.9:1 — safe.
  const config: Record<
    SentinelAttackChain["exploitability"],
    { label: string; className: string }
  > = {
    trivial: {
      label: "Anyone can do this",
      className: "text-red-700 font-black",
    },
    moderate: {
      label: "Needs some skill",
      className: "text-amber-700 font-black",
    },
    difficult: {
      label: "Requires expertise",
      className: "text-cyan-700 font-black",
    },
    theoretical: {
      label: "Unlikely in practice",
      className: "text-slate-600 font-black",
    },
  };
  // Safe fallback: if the API returns an unexpected exploitability value (e.g. AI hallucination),
  // degrade gracefully instead of crashing with "Cannot destructure property 'label' of undefined".
  const { label, className } = config[level] ?? {
    label: level,
    className: "text-slate-600 font-black",
  };
  return <span className={`text-xs ${className}`}>{label}</span>;
};

export const SentinelAttackChains: React.FC<SentinelAttackChainsProps> = ({
  chains,
  activeProtections,
  isPro,
}) => {
  const [expandedChainId, setExpandedChainId] = useState<string | null>(null);

  /**
   * WHY useMemo: sorting runs O(n log n). Without memoisation it re-runs on
   * every render, including the many renders caused by toggling expandedChainId.
   * The sorted order only changes when the `chains` prop reference changes.
   */
  const sortedChains = useMemo(
    () =>
      [...chains].sort((a, b) => {
        // Use ?? 99 so unknown severity/exploitability values sort last instead of producing NaN.
        const severityDiff =
          (CHAIN_SEVERITY_ORDER[a.severity] ?? 99) -
          (CHAIN_SEVERITY_ORDER[b.severity] ?? 99);
        if (severityDiff !== 0) return severityDiff;
        return (
          (EXPLOITABILITY_ORDER[a.exploitability] ?? 99) -
          (EXPLOITABILITY_ORDER[b.exploitability] ?? 99)
        );
      }),
    [chains]
  );

  const toggleChain = (id: string) => {
    setExpandedChainId((prev) => (prev === id ? null : id));
  };

  if (sortedChains.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        {/* WCAG 1.3.1: aria-hidden prevents NVDA from announcing "shield check image"
            before the empty-state text. The icon is purely decorative here. */}
        <ShieldCheck
          size={40}
          className="mb-3 text-emerald-500"
          aria-hidden="true"
        />
        <p className="text-xs font-black tracking-widest text-emerald-700 uppercase">
          No attack chains identified
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          Your site configuration does not expose any exploitable kill chains.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3" role="list" aria-label="Attack chains">
      {sortedChains.map((chain) => {
        const isExpanded = expandedChainId === chain.id;
        const isBlocked =
          chain.swisswpsuite_break_point !== null &&
          activeProtections.some(
            (p) =>
              p
                .toLowerCase()
                .includes(chain.swisswpsuite_break_point!.toLowerCase()) ||
              chain
                .swisswpsuite_break_point!.toLowerCase()
                .includes(p.toLowerCase())
          );
        const isProRequired = chain.upgrade_required === "Pro" && !isPro;

        return (
          <div
            key={chain.id}
            role="listitem"
            className={`border-border overflow-hidden rounded-xl border border-l-4 transition-all ${CHAIN_SEVERITY_BORDER[chain.severity] ?? "border-l-slate-300"} ${isBlocked ? "border-emerald-200 bg-emerald-50/30" : "bg-card"}`}
          >
            {/* Collapsed header — always visible */}
            <button
              type="button"
              aria-expanded={isExpanded}
              aria-controls={`chain-body-${chain.id}`}
              onClick={() => toggleChain(chain.id)}
              // WCAG 2.4.7: focus:outline-none removed — it unconditionally suppresses
              // the browser focus ring. focus-visible:ring-2 alone provides a keyboard-only
              // indicator in all modern browsers. ring-offset-1 prevents the ring from
              // overlapping the border-l-4 severity indicator.
              className="hover:bg-background/50 focus-visible:ring-swiss-navy flex w-full items-center gap-3 rounded-xl p-4 text-left transition-colors focus-visible:ring-2 focus-visible:ring-offset-1"
            >
              {/* Severity dot */}
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${CHAIN_SEVERITY_DOT[chain.severity] ?? "bg-slate-300"}`}
                aria-hidden="true"
              />

              {/* Chain name + exploitability */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-swiss-navy truncate text-sm font-black">
                    {chain.name}
                  </span>
                  <ExploitabilityLabel level={chain.exploitability} />
                </div>
                <div className="mt-0.5 flex items-center gap-1">
                  <span className="text-xs font-medium tracking-widest text-neutral-500 uppercase">
                    {chain.severity}
                  </span>
                  {chain.attacker_type && (
                    <span className="text-xs text-neutral-400">
                      · {chain.attacker_type}
                    </span>
                  )}
                </div>
              </div>

              {/* Right badges */}
              <div className="flex shrink-0 items-center gap-2">
                {isBlocked && (
                  <Badge variant="success">
                    Blocked by {chain.swisswpsuite_break_point}
                  </Badge>
                )}
                {isProRequired && !isBlocked && (
                  <Badge variant="warning">
                    {/* Upsell redesign (2026-08-04, T3): neutral copy — no
                        "Pro" word. WCAG 4.1.2: Lock is decorative — the
                        badge text conveys the meaning. Without aria-hidden
                        NVDA announces "lock image Not Included". */}
                    <Lock size={10} className="mr-1" aria-hidden="true" />
                    Not Included
                  </Badge>
                )}
                {isExpanded ? (
                  <ChevronUp
                    size={16}
                    className="text-neutral-400"
                    aria-hidden="true"
                  />
                ) : (
                  <ChevronDown
                    size={16}
                    className="text-neutral-400"
                    aria-hidden="true"
                  />
                )}
              </div>
            </button>

            {/* Expanded body */}
            {isExpanded && (
              <div
                id={`chain-body-${chain.id}`}
                className="border-border/60 space-y-4 border-t px-4 pb-4"
              >
                {/* Attack steps */}
                <div className="pt-4">
                  <h4 className="mb-3 flex items-center gap-2 text-xs font-black tracking-widest text-neutral-500 uppercase">
                    <Flame
                      size={12}
                      className="text-brand-accent"
                      aria-hidden="true"
                    />
                    Kill Chain Steps
                  </h4>
                  <ol className="space-y-2">
                    {chain.steps.map((step, idx) => {
                      const isLastStep = idx === chain.steps.length - 1;
                      return (
                        <li
                          key={idx}
                          className={`flex items-start gap-3 text-sm ${isLastStep ? "font-black text-red-700" : "font-medium text-neutral-700"}`}
                        >
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-black ${isLastStep ? "bg-red-100 text-red-700" : "bg-secondary text-neutral-600"}`}
                            aria-hidden="true"
                          >
                            {idx + 1}
                          </span>
                          {step}
                        </li>
                      );
                    })}
                  </ol>
                </div>

                {/* Impact */}
                <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                  <p className="mb-1 text-xs font-black tracking-widest text-red-700 uppercase">
                    Impact
                  </p>
                  <p className="text-sm leading-relaxed font-medium text-red-900">
                    {chain.impact}
                  </p>
                </div>

                {/* Protection callout — Blocked */}
                {isBlocked && (
                  <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <ShieldCheck
                      size={18}
                      className="mt-0.5 shrink-0 text-emerald-600"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="mb-1 text-xs font-black tracking-widest text-emerald-700 uppercase">
                        SwissSuite Blocks This Chain
                      </p>
                      <p className="text-sm font-medium text-emerald-800">
                        The <strong>{chain.swisswpsuite_break_point}</strong>{" "}
                        feature interrupts this attack at step{" "}
                        {chain.steps.length > 1
                          ? "an early stage"
                          : "the only stage"}
                        , preventing full exploitation.
                      </p>
                    </div>
                  </div>
                )}

                {/* Upsell redesign (2026-08-04, T3): neutral-copy callout —
                    no "Pro"/"Upgrade" words. */}
                {isProRequired && (
                  <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <Lock
                      size={18}
                      className="mt-0.5 shrink-0 text-amber-600"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="mb-1 text-xs font-black tracking-widest text-amber-700 uppercase">
                        Not Included On This Plan
                      </p>
                      <p className="mb-2 text-sm font-medium text-amber-800">
                        {chain.swisswpsuite_break_point ? (
                          <>
                            Blocking <strong>{chain.name}</strong> requires
                            the <strong>{chain.swisswpsuite_break_point}</strong>{" "}
                            feature.
                          </>
                        ) : (
                          <>
                            Blocking <strong>{chain.name}</strong> requires a
                            feature not included on this plan.
                          </>
                        )}
                      </p>
                      <a
                        href="https://swisswpsecure.com/products"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-black tracking-widest text-amber-700 uppercase underline underline-offset-2 hover:text-amber-900"
                      >
                        Learn more{" "}
                        <ExternalLink size={10} aria-hidden="true" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Remediation */}
                {chain.remediation.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-xs font-black tracking-widest text-neutral-500 uppercase">
                      Remediation
                    </h4>
                    <ul className="space-y-1">
                      {chain.remediation.map((step, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-sm text-neutral-700"
                        >
                          <span
                            className="mt-0.5 font-black text-emerald-500"
                            aria-hidden="true"
                          >
                            →
                          </span>
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SentinelAttackChains;
