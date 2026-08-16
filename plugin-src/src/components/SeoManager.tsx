import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { ContentType, SeoScanResult } from "../types";
import {
  Sparkles,
  Check,
  RefreshCw,
  FileText,
  Image as ImageIcon,
  Layout,
  ExternalLink,
  ChevronRight,
  X,
  Loader,
  AlertTriangle,
  PieChart,
  Activity,
  Copy,
} from "lucide-react";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { SectionHeader } from "./ui/SectionHeader";
import { FeaturePointer } from "./organisms/Upsell/FeaturePointer";
import { isProEdition } from "../lib/edition";
import { SeoAiWorkbench } from "./organisms/Seo/SeoAiWorkbench";
import { SeoCategoryQuickFixButton } from "./organisms/Seo/SeoCategoryQuickFixButton";

const SeoManager: React.FC = () => {
  // Freemium Dual-Build (Phase 3, 2026-07-17): SEO is a MIXED tab — AI meta
  // generation (SeoAiWorkbench, below) is serviceware and physically absent
  // from the Free zip (see that component's own docblock for the
  // 2026-08-12 extraction that made it aliasable). Sitemap and SEO Health
  // Check (both local, no AI) stay free and are NOT gated — they are
  // separate modals triggered from the header buttons below.
  const isProEditionBuild = isProEdition();

  // LiveQA §3.10 fix (2026-08-04): the 3 SEO modals (Sitemap, llms.txt,
  // Scan/Health) previously each owned an independent boolean, so any
  // combination could be simultaneously true — a WAI-ARIA single-active-
  // dialog violation. Consolidated into one union state.
  type SeoModalKind = "sitemap" | "llm" | "scan" | null;
  const [activeModal, setActiveModal] = useState<SeoModalKind>(null);
  const showSitemapModal = activeModal === "sitemap";
  const showLlmModal = activeModal === "llm";
  const showScanModal = activeModal === "scan";

  // llms.txt
  const [llmContent, setLlmContent] = useState("");
  const [generatingLlm, setGeneratingLlm] = useState(false);
  const [copied, setCopied] = useState(false);

  // Scan / Health
  const [scanResult, setScanResult] = useState<SeoScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [showNonCompliantDetails, setShowNonCompliantDetails] = useState(false);
  const [fixingNonCompliant, setFixingNonCompliant] = useState(false);

  const { apiUrl, nonce, homeUrl } = window.swisswpsuiteData || {};

  const handleScan = async () => {
    setScanning(true);
    setActiveModal("scan");
    setShowNonCompliantDetails(false);
    try {
      const res = await fetch(`${apiUrl}/seo/scan`, {
        headers: { "X-WP-Nonce": nonce },
      });
      if (res.ok) {
        const data = await res.json();
        setScanResult(data);
      }
    } catch (e) {
      console.error(e);
      toast.error("Health audit failed. Please try again.");
    }
    setScanning(false);
  };

  const handleFixNonCompliant = async () => {
    if (!apiUrl || fixingNonCompliant) return;
    setFixingNonCompliant(true);
    try {
      const res = await fetch(`${apiUrl}/seo/fix-noncompliant`, {
        method: "POST",
        headers: {
          "X-WP-Nonce": nonce,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.count === 0) {
          toast.info(data.message);
        } else {
          toast.success(
            `${data.count} items queued for re-generation. New SEO descriptions will appear within ~${data.estimated_minutes} minutes.`
          );
          // Close the scan modal so the user can see the background queue progress
          setActiveModal(null);
        }
      } else {
        toast.error(data.message || "Failed to start non-compliant fix.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to fix non-compliant items. Please try again.");
    }
    setFixingNonCompliant(false);
  };

  const fetchLlmContent = async () => {
    setGeneratingLlm(true);
    try {
      const res = await fetch(`${apiUrl}/seo/llms-txt`, {
        headers: { "X-WP-Nonce": nonce },
      });
      if (res.ok) {
        const data = await res.json();
        setLlmContent(data.content);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate AI directive content. Please try again.");
    }
    setGeneratingLlm(false);
  };

  useEffect(() => {
    if (showLlmModal && !llmContent) {
      fetchLlmContent();
    }
  }, [showLlmModal]);

  const handleCopyLlm = () => {
    navigator.clipboard.writeText(llmContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-in fade-in min-w-0 space-y-12 pb-20 duration-700">
      <SectionHeader
        title="SEO & Search Visibility"
        description={
          isProEditionBuild
            ? "Improve how your site appears in search engines and AI assistants — AI generates your titles, descriptions, and image captions automatically. For rewriting WooCommerce product descriptions with tone control, see AI Content."
            : "Improve how your site appears in search engines and AI assistants. Run a free SEO Health Check, generate your Sitemap, and create an AI Assistant Guide below — AI-generated titles, descriptions, and image captions require an AI connection."
        }
        action={
          <div className="flex flex-wrap gap-4">
            <Button
              variant="secondary"
              onClick={handleScan}
              icon={PieChart}
              className="border-border hover:bg-background rounded-xl text-sm font-black tracking-widest uppercase transition-all"
            >
              SEO Health Check
            </Button>
            <Button
              variant="secondary"
              onClick={() => setActiveModal("sitemap")}
              icon={Layout}
              className="border-border hover:bg-background rounded-xl text-sm font-black tracking-widest uppercase transition-all"
            >
              Sitemap
            </Button>
            <Button
              variant="secondary"
              onClick={() => setActiveModal("llm")}
              icon={FileText}
              className="border-border hover:bg-background rounded-xl text-sm font-black tracking-widest uppercase transition-all"
              title="Generates an llms.txt guide that helps AI assistants like ChatGPT and Perplexity understand and cite your site correctly. Free, local — no AI tokens used."
            >
              AI Assistant Guide
            </Button>
          </div>
        }
      />

      {/* AI SEO Meta Generation workbench (Pro-only serviceware) — extracted
          to SeoAiWorkbench.tsx (2026-08-12, WP.org frontend physical-
          exclusion sweep) so it has a real file boundary to alias away in
          the Free build. Self-contained: owns its own state/effects/
          handlers, needs no props from this parent. See that file's
          docblock for the full extraction rationale, including why the AI
          bulk-generate buttons that used to sit inline in this header's
          action slot now render as their own row inside the panel below
          instead (a minor, documented visual reflow —
          docs/capabilities/SEO_CAPABILITIES_REFERENCE.md). */}
      {isProEditionBuild ? (
        <SeoAiWorkbench />
      ) : (
        // Upsell redesign (2026-08-04, design point 1/2): the full "AI SEO
        // Meta Generation" ProUpsellPlaceholder (bullets + CTA pair) is
        // removed — bulk AI generation is the only Pro-gated part of this
        // page (Health Check, Sitemap, and llms.txt above stay fully free),
        // so this section carries one neutral "ai" FeaturePointer.
        <FeaturePointer variant="ai" />
      )}

      {/* Scan Modal — fully free (SEO Health Check) */}
      {showScanModal && (
        <div
          className="bg-swiss-navy/40 animate-in fade-in fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm duration-300"
          role="dialog"
          aria-modal="true"
          aria-labelledby="seo-audit-title"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setActiveModal(null);
            }
          }}
        >
          <div
            className="bg-card dark:bg-card shadow-premium border-border dark:border-border/10 animate-in zoom-in-95 flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-[2.5rem] border duration-300"
            ref={(el) => {
              if (el) {
                const focusable = el.querySelector<HTMLElement>(
                  'button, [tabindex]:not([tabindex="-1"])'
                );
                if (focusable) focusable.focus();
              }
            }}
          >
            {/* Dialog header — always visible */}
            <div className="shrink-0 px-10 pt-10 pb-0">
              <h3
                id="seo-audit-title"
                className="text-swiss-navy mb-8 text-2xl font-black tracking-tight uppercase"
              >
                SEO Health Report
              </h3>
            </div>

            {/* Scrollable body */}
            <div className="custom-scrollbar flex-1 overflow-y-auto px-10 pb-6">
              {scanning ? (
                <div className="flex flex-col items-center gap-6 py-12">
                  <Loader className="text-swiss-navy animate-spin" size={48} />
                  <span className="text-sm font-black tracking-widest text-neutral-700 uppercase">
                    Checking your SEO coverage...
                  </span>
                </div>
              ) : scanResult ? (
                <div className="space-y-8">
                  {/* Score + Realistic Ceiling — G1 (2026-08-11, owner Option A):
                      `seo_score` is now THE canonical SEO score, identical to
                      the Dashboard tile's number for the same site state.
                      `score`/`max_achievable_score` (used before this fix)
                      are preserved server-side as a distinct "content
                      optimization completion" sub-metric — no longer shown
                      as the headline, to avoid two competing numbers on
                      this page. */}
                  <div className="glass-panel bg-background/50 flex items-center justify-between rounded-3xl p-6">
                    <div>
                      <div className="text-swiss-navy text-4xl font-black">
                        {scanResult.seo_score}
                        <span className="text-foreground text-xl">/100</span>
                      </div>
                      <div className="mt-2 text-xs font-black tracking-widest text-neutral-700 uppercase">
                        Overall SEO Score
                      </div>
                      {scanResult.seo_score < 100 &&
                        scanResult.max_achievable_seo_score < 100 && (
                          <div className="mt-1 text-[11px] font-medium text-neutral-500">
                            Realistic ceiling:{" "}
                            <span className="text-swiss-navy font-black">
                              {scanResult.max_achievable_seo_score}
                            </span>
                            /100 given site content
                          </div>
                        )}
                    </div>
                    <div
                      className={`flex h-16 w-16 items-center justify-center rounded-2xl ${scanResult.seo_score >= 80 ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"}`}
                    >
                      <PieChart size={32} />
                    </div>
                  </div>

                  {/* Sub-scores of the one canonical formula (G1) — clearly
                      labeled, never presented as a second/competing "SEO
                      score". Same three dimensions the Dashboard tile shows. */}
                  <div className="grid grid-cols-3 gap-3">
                    {(
                      [
                        ["on_page", "On-Page"],
                        ["technical", "Technical"],
                        ["content", "Content"],
                      ] as const
                    ).map(([key, label]) => (
                      <div
                        key={key}
                        className="bg-secondary rounded-2xl p-4 text-center"
                      >
                        <div className="text-swiss-navy text-xl font-black">
                          {scanResult.seo_breakdown[key]}
                          <span className="text-foreground text-xs">%</span>
                        </div>
                        <div className="mt-1 text-[10px] font-black tracking-widest text-neutral-500 uppercase">
                          {label}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Category breakdown — RB-305: use `actionable` count when present, fall back to `missing` */}
                  <div className="space-y-4">
                    {(["product", "post", "page", "image"] as const)
                      .filter(
                        (key) =>
                          scanResult.details[key] &&
                          scanResult.details[key].total > 0
                      )
                      .map((key) => {
                        const entry = scanResult.details[key];
                        const actionableCount =
                          entry.actionable ?? entry.missing;
                        const thinCount = entry.excluded_thin_content ?? 0;
                        const needsAction = actionableCount > 0;
                        const labelMap: Record<string, string> = {
                          product: "Products",
                          post: "Posts",
                          page: "Pages",
                          image: "Images",
                        };
                        const contentTypeMap: Record<string, ContentType> = {
                          product: "product",
                          post: "post",
                          page: "page",
                          image: "image",
                        };
                        return (
                          <div
                            key={key}
                            className="border-border hover:bg-background space-y-3 rounded-2xl border p-4 transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-swiss-navy text-sm font-black tracking-tight uppercase">
                                {labelMap[key] ?? key}
                              </span>
                              <Badge
                                className={`${needsAction ? "text-brand-accent bg-red-50" : "bg-emerald-50 text-emerald-600"} border-none px-3 py-1.5 text-xs font-black uppercase`}
                              >
                                {needsAction
                                  ? `${actionableCount} Needs Attention`
                                  : "All Good"}
                              </Badge>
                            </div>
                            {thinCount > 0 && (
                              <p className="text-[11px] leading-relaxed text-neutral-500">
                                + {thinCount} thin content{" "}
                                {key === "image" ? "files" : "pages"} (normal —
                                too little content for AI to improve)
                              </p>
                            )}
                            {/* Per-category AI quick-fix — Pro-only, extracted
                                to SeoCategoryQuickFixButton.tsx (2026-08-12)
                                so this always-free modal never carries the
                                real Pro-only fetch/toast logic inline. See
                                that file's docblock for the tab-preselection
                                UX trade-off this replacement made. */}
                            {needsAction && isProEditionBuild && (
                              <SeoCategoryQuickFixButton
                                targetType={contentTypeMap[key]}
                                actionableCount={actionableCount}
                                categoryLabel={labelMap[key] ?? key}
                                onQueued={() => setActiveModal(null)}
                              />
                            )}
                          </div>
                        );
                      })}
                  </div>

                  {/* Non-compliant detail toggle */}
                  {scanResult.non_compliant_items.length > 0 && (
                    <div>
                      <button
                        onClick={() =>
                          setShowNonCompliantDetails((prev) => !prev)
                        }
                        className="border-border hover:bg-background flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all"
                      >
                        <span className="text-xs font-black tracking-widest text-neutral-700 uppercase">
                          Items Needing Attention
                        </span>
                        <ChevronRight
                          size={16}
                          className={`text-neutral-400 transition-transform duration-200 ${showNonCompliantDetails ? "rotate-90" : ""}`}
                        />
                      </button>

                      {showNonCompliantDetails && (
                        <div className="animate-in slide-in-from-top-2 mt-4 space-y-6 duration-200">
                          {/* Group: Thin Content — Improvable */}
                          {scanResult.non_compliant_items.some(
                            (i) => i.reason === "short_content"
                          ) && (
                            <div>
                              <div className="mb-2 flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                <span className="text-[11px] font-black tracking-widest text-amber-700 uppercase">
                                  Thin Content — Improvable
                                </span>
                              </div>
                              <p className="mb-3 text-[11px] leading-relaxed text-neutral-500">
                                These pages have minimal source content, but the
                                AI can still write a description for them using
                                the page title and site context as a fallback.
                                They're included in{" "}
                                <strong>Re-Generate Descriptions</strong> below.
                              </p>
                              <div className="space-y-1.5">
                                {scanResult.non_compliant_items
                                  .filter((i) => i.reason === "short_content")
                                  .map((item) => (
                                    <div
                                      key={item.id}
                                      className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50/50 p-2.5"
                                    >
                                      <div className="flex min-w-0 items-center gap-2">
                                        <FileText
                                          size={13}
                                          className="shrink-0 text-amber-600"
                                        />
                                        <span className="truncate text-[11px] font-bold text-neutral-800">
                                          {item.title}
                                        </span>
                                      </div>
                                      <span className="ml-2 shrink-0 text-xs font-black tracking-widest text-neutral-400 uppercase">
                                        {item.desc_length} chars
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}

                          {/* Group: Missing — Action Required */}
                          {scanResult.non_compliant_items.some(
                            (i) => i.reason === "missing"
                          ) && (
                            <div>
                              <div className="mb-2 flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                <span className="text-[11px] font-black tracking-widest text-red-700 uppercase">
                                  Missing Metadata — Action Required
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                {scanResult.non_compliant_items
                                  .filter((i) => i.reason === "missing")
                                  .map((item) => (
                                    <div
                                      key={item.id}
                                      className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50/50 p-2.5"
                                    >
                                      <div className="flex min-w-0 items-center gap-2">
                                        {item.type === "image" ? (
                                          <ImageIcon
                                            size={13}
                                            className="shrink-0 text-red-600"
                                          />
                                        ) : (
                                          <FileText
                                            size={13}
                                            className="shrink-0 text-red-600"
                                          />
                                        )}
                                        <span className="truncate text-[11px] font-bold text-neutral-800">
                                          {item.title}
                                        </span>
                                      </div>
                                      <span className="ml-2 shrink-0 text-xs font-black tracking-widest text-red-500 uppercase">
                                        No description
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}

                          {/* Group: Below Threshold — Improvable */}
                          {scanResult.non_compliant_items.some(
                            (i) => i.reason === "below_threshold"
                          ) && (
                            <div>
                              <div className="mb-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                                  <span className="text-[11px] font-black tracking-widest text-orange-700 uppercase">
                                    Description Too Short — Can Be Improved
                                  </span>
                                </div>
                                <button
                                  onClick={handleFixNonCompliant}
                                  disabled={fixingNonCompliant}
                                  className="hover:text-brand-accent flex items-center gap-1 text-xs font-black tracking-widest text-orange-700 uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <RefreshCw
                                    size={10}
                                    className={
                                      fixingNonCompliant ? "animate-spin" : ""
                                    }
                                  />
                                  {fixingNonCompliant
                                    ? "Queuing..."
                                    : "Re-Generate All"}
                                </button>
                              </div>
                              <p className="mb-3 text-[11px] leading-relaxed text-neutral-500">
                                These items have descriptions under 150
                                characters despite sufficient page content.
                                Re-running optimization may improve them.
                              </p>
                              <div className="space-y-1.5">
                                {scanResult.non_compliant_items
                                  .filter((i) => i.reason === "below_threshold")
                                  .map((item) => (
                                    <div
                                      key={item.id}
                                      className="flex items-center justify-between rounded-xl border border-orange-100 bg-orange-50/50 p-2.5"
                                    >
                                      <div className="flex min-w-0 items-center gap-2">
                                        <FileText
                                          size={13}
                                          className="shrink-0 text-orange-600"
                                        />
                                        <span className="truncate text-[11px] font-bold text-neutral-800">
                                          {item.title}
                                        </span>
                                      </div>
                                      <span className="ml-2 shrink-0 text-xs font-black tracking-widest text-neutral-400 uppercase">
                                        {item.desc_length} chars
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dynamic Intelligence Suggestion */}
                  <div className="bg-swiss-navy text-foreground dark:text-foreground group relative overflow-hidden rounded-3xl p-6">
                    <div className="bg-secondary dark:bg-secondary absolute top-0 right-0 -mt-12 -mr-12 h-24 w-24 rounded-full" />
                    <div className="relative z-10 flex gap-4">
                      <Sparkles
                        size={18}
                        className="text-brand-accent shrink-0 animate-pulse"
                      />
                      <div className="flex-1">
                        <span className="text-foreground/50 mb-1 block text-xs font-black tracking-widest uppercase">
                          What To Do Next
                        </span>
                        <p className="text-xs leading-relaxed font-medium opacity-90">
                          {scanResult.non_compliant_items.length === 0 &&
                          (scanResult.details?.post?.missing ?? 0) === 0 &&
                          (scanResult.details?.page?.missing ?? 0) === 0 &&
                          (scanResult.details?.image?.missing ?? 0) === 0 ? (
                            <>
                              Everything looks great — all your content has SEO
                              titles and descriptions.
                            </>
                          ) : scanResult.non_compliant_items.some(
                              (i) => i.reason === "missing"
                            ) ? (
                            <>
                              Use the <strong>Generate SEO</strong> buttons
                              above to create titles, descriptions, and FAQs in
                              one pass for items that have no SEO data yet — or
                              use <strong>Re-Generate</strong> below, which now
                              also covers items with no description at all.
                            </>
                          ) : (
                            <>
                              {
                                scanResult.non_compliant_items.filter(
                                  (i) =>
                                    i.reason === "below_threshold" ||
                                    i.reason === "short_content"
                                ).length
                              }{" "}
                              item
                              {scanResult.non_compliant_items.filter(
                                (i) =>
                                  i.reason === "below_threshold" ||
                                  i.reason === "short_content"
                              ).length !== 1
                                ? "s have"
                                : " has"}{" "}
                              a short or missing description and can be
                              re-generated for better results.
                              {scanResult.faq_bonus < 5 ? (
                                <>
                                  {" "}
                                  Generating <strong>FAQs</strong> can earn up
                                  to {5 - scanResult.faq_bonus} bonus points.
                                </>
                              ) : null}
                            </>
                          )}
                        </p>
                        {scanResult.non_compliant_items.some(
                          (i) =>
                            i.type !== "image" &&
                            (i.reason === "below_threshold" ||
                              i.reason === "short_content" ||
                              i.reason === "missing")
                        ) && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleFixNonCompliant}
                            loading={fixingNonCompliant}
                            disabled={fixingNonCompliant}
                            className="bg-brand-accent hover:bg-brand-accent/90 mt-3 rounded-xl border-none px-5 py-2 text-xs font-black tracking-widest text-white uppercase transition-all"
                            icon={RefreshCw}
                          >
                            {fixingNonCompliant
                              ? "Queuing..."
                              : `Re-Generate Descriptions (${
                                  scanResult.non_compliant_items.filter(
                                    (i) =>
                                      i.type !== "image" &&
                                      (i.reason === "below_threshold" ||
                                        i.reason === "short_content" ||
                                        i.reason === "missing")
                                  ).length
                                })`}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-brand-accent flex flex-col items-center gap-4 rounded-2xl border border-red-100 bg-red-50 p-8 text-center">
                  <AlertTriangle size={32} />
                  <span className="text-sm font-black tracking-widest uppercase">
                    Health Check Failed — Please Try Again
                  </span>
                </div>
              )}
            </div>

            {/* Dialog footer — always visible */}
            <div className="border-border bg-card flex shrink-0 justify-end border-t px-10 py-6">
              <Button
                variant="ghost"
                className="hover:text-swiss-navy text-sm font-black tracking-widest text-neutral-700 uppercase"
                onClick={() => setActiveModal(null)}
                aria-label="Close SEO health check"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sitemap Modal — fully free */}
      {showSitemapModal && (
        <div
          className="bg-swiss-navy/40 animate-in fade-in fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm duration-300"
          role="dialog"
          aria-modal="true"
          aria-labelledby="seo-sitemap-title"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setActiveModal(null);
            }
          }}
        >
          <div
            className="bg-card dark:bg-card shadow-premium border-border dark:border-border/10 animate-in zoom-in-95 w-full max-w-md overflow-hidden rounded-[2.5rem] border duration-300"
            ref={(el) => {
              if (el) {
                const focusable = el.querySelector<HTMLElement>(
                  'button, [tabindex]:not([tabindex="-1"])'
                );
                if (focusable) focusable.focus();
              }
            }}
          >
            <div className="p-10 text-center">
              <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-emerald-50 text-emerald-600">
                <Layout size={36} />
              </div>
              <h3
                id="seo-sitemap-title"
                className="text-swiss-navy mb-4 text-2xl font-black tracking-tight uppercase"
              >
                Your Sitemap
              </h3>
              <p className="mb-10 text-sm font-black tracking-widest text-neutral-700 uppercase">
                Helps Google discover and index your pages
              </p>

              <div className="space-y-6">
                <div className="flex items-center justify-between rounded-2xl border border-emerald-100/50 bg-emerald-50/50 p-5">
                  <span className="text-sm font-black tracking-widest text-emerald-800 uppercase">
                    Sitemap Active
                  </span>
                  <div className="text-foreground dark:text-foreground rounded-full bg-emerald-500 p-1">
                    <Check size={12} />
                  </div>
                </div>

                <div className="bg-card border-border group flex items-center justify-between rounded-2xl border p-5 font-mono text-sm shadow-xl">
                  <span className="mr-4 truncate font-bold tracking-tight text-neutral-700 uppercase transition-colors group-hover:text-emerald-400">
                    {homeUrl ? `${homeUrl}/sitemap.xml` : "/sitemap.xml"}
                  </span>
                  <a
                    href={homeUrl ? `${homeUrl}/sitemap.xml` : "/sitemap.xml"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-secondary dark:bg-card/10 dark:text-foreground hover:text-foreground dark:hover:text-foreground flex h-10 w-10 items-center justify-center rounded-xl font-black text-neutral-900 transition-all hover:bg-emerald-500"
                    title="Open sitemap in a new tab"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>

                <div className="bg-background border-border rounded-2xl border p-6 text-left">
                  <h5 className="mb-2 text-xs font-black tracking-widest text-neutral-700 uppercase">
                    What This Does
                  </h5>
                  <p className="text-xs leading-relaxed font-medium text-neutral-700 italic">
                    Your sitemap lists all your products, posts, and pages so
                    Google and Bing can find and index them quickly. Submit it
                    to Google Search Console for faster ranking.
                  </p>
                </div>
              </div>
              <div className="mt-10 flex justify-end">
                <Button
                  variant="ghost"
                  className="hover:text-swiss-navy text-sm font-black tracking-widest text-neutral-700 uppercase"
                  onClick={() => setActiveModal(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* llms.txt Modal — fully free, local */}
      {showLlmModal && (
        <div
          className="bg-swiss-navy/40 animate-in fade-in fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm duration-300"
          role="dialog"
          aria-modal="true"
          aria-labelledby="seo-llm-title"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setActiveModal(null);
            }
          }}
        >
          <div
            className="bg-card dark:bg-card shadow-premium border-border dark:border-border/10 animate-in zoom-in-95 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2.5rem] border duration-300"
            ref={(el) => {
              if (el) {
                const focusable = el.querySelector<HTMLElement>(
                  'button, [tabindex]:not([tabindex="-1"])'
                );
                if (focusable) focusable.focus();
              }
            }}
          >
            <div className="border-border bg-background/50 flex items-center justify-between border-b p-10">
              <div className="flex items-center gap-4">
                <div className="bg-swiss-navy text-swiss-navy flex h-12 w-12 items-center justify-center rounded-2xl">
                  <FileText size={24} />
                </div>
                <div>
                  <h3
                    id="seo-llm-title"
                    className="text-swiss-navy text-xl font-black tracking-tight uppercase"
                  >
                    AI Assistant Guide (llms.txt)
                  </h3>
                  <p className="mt-0.5 text-xs font-black tracking-widest text-neutral-700 uppercase">
                    Helps AI assistants and search engines understand your site
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-foreground hover:text-swiss-navy rounded-2xl p-3 transition-all"
              >
                <X size={28} />
              </button>
            </div>

            <div className="custom-scrollbar overflow-y-auto p-10">
              <div className="glass-panel bg-swiss-navy text-foreground dark:text-foreground relative mb-10 overflow-hidden rounded-[2rem] p-8">
                <div className="bg-secondary dark:bg-secondary absolute top-0 right-0 -mt-16 -mr-16 h-32 w-32 rounded-full" />
                <h4 className="text-foreground/50 relative z-10 mb-4 flex items-center gap-2 text-sm font-black tracking-widest uppercase">
                  <Activity size={14} className="text-brand-accent" /> How To
                  Use This
                </h4>
                <p className="relative z-10 text-sm leading-relaxed font-medium italic opacity-90">
                  Copy the code below and create a WordPress page titled
                  "llms.txt" — paste this content as plain text. This tells AI
                  crawlers (such as GPTBot, Google Bard, and others) what your
                  site is about, improving how your business appears in
                  AI-generated answers.
                </p>
              </div>

              {generatingLlm ? (
                <div className="flex flex-col items-center justify-center gap-6 py-24 text-neutral-700">
                  <Loader className="text-swiss-navy animate-spin" size={48} />
                  <span className="text-sm font-black tracking-widest uppercase">
                    Generating your AI guide...
                  </span>
                </div>
              ) : (
                <div className="group relative">
                  <textarea
                    readOnly
                    value={llmContent}
                    className="bg-card border-border focus:ring-swiss-navy custom-scrollbar h-[32rem] w-full resize-none rounded-3xl border p-8 font-mono text-sm text-emerald-400 shadow-2xl outline-none focus:ring-2"
                  />
                  <button
                    onClick={handleCopyLlm}
                    className="bg-card dark:bg-card/10 dark:text-foreground hover:text-foreground dark:hover:text-foreground border-border dark:border-border/10 absolute top-6 right-6 flex h-12 w-12 items-center justify-center rounded-2xl border text-neutral-900 shadow-lg transition-all hover:scale-110 hover:bg-emerald-500"
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <Check
                        size={20}
                        className="text-foreground dark:text-foreground"
                      />
                    ) : (
                      <Copy size={20} />
                    )}
                  </button>
                </div>
              )}
            </div>
            <div className="border-border bg-background/50 flex items-center justify-between border-t p-8">
              <a
                href={`${homeUrl}/llms.txt`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-swiss-navy hover:text-brand-accent flex items-center gap-2 text-sm font-black tracking-widest uppercase transition-all"
              >
                <ExternalLink size={14} /> Check Live File
              </a>
              <Button
                variant="ghost"
                className="hover:text-swiss-navy text-sm font-black tracking-widest text-neutral-700 uppercase"
                onClick={() => setActiveModal(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeoManager;
