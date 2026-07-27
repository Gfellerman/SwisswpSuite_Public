import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { ContentItem, ContentType, SeoScanResult } from "../types";
import { useTokenBalance } from "../hooks/useTokenBalance";
import {
  Sparkles,
  Check,
  AlertCircle,
  RefreshCw,
  Bot,
  FileText,
  Image as ImageIcon,
  Box,
  Layout,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Loader,
  Play,
  Ban,
  RotateCcw,
  AlertTriangle,
  PieChart,
  Eye,
  Search,
  Copy,
  Activity,
  MessageSquare,
  Clock,
} from "lucide-react";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { SectionHeader } from "./ui/SectionHeader";
import { ProUpsellPlaceholder } from "./organisms/Upsell/ProUpsellPlaceholder";
import { isProEdition, hasEditionMismatch } from "../lib/edition";

interface FaqItem {
  question: string;
  answer: string;
}

const SeoManager: React.FC = () => {
  // W3 — Token balance gate
  const { canAfford } = useTokenBalance();
  // Freemium Dual-Build (Phase 3, 2026-07-17): SEO is a MIXED tab — AI meta
  // generation (this page's main table/bulk-optimize workflow, below) is
  // serviceware and physically absent from the Free zip. Sitemap and SEO
  // Health Check (both local, no AI) stay free and are NOT gated — they are
  // separate modals triggered from the header buttons, structurally outside
  // the block this flag wraps.
  const isProEditionBuild = isProEdition();

  const [activeTab, setActiveTab] = useState<ContentType>("product");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState<number | null>(null);
  const [generatingFaqId, setGeneratingFaqId] = useState<number | null>(null);
  const [postFaqs, setPostFaqs] = useState<Record<number, FaqItem[]>>({});

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filters
  const [showUnoptimized, setShowUnoptimized] = useState(false);

  // Bulk Optimization (Selection)
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Batch Options
  const [rewriteTitles, setRewriteTitles] = useState(false);

  const [slowBatchInProgress, setSlowBatchInProgress] = useState(false);
  // SEO-HIGH-3 FIX: Track slow batch job ID and poll for status.
  // F-224/F-225: job_id is a string (e.g. "wp-internal-123"), not a number.
  const [slowBatchJobId, setSlowBatchJobId] = useState<string | null>(null);
  const [groqBatchId, setGroqBatchId] = useState<string | null>(null);
  const [slowBatchStatus, setSlowBatchStatus] = useState<{
    total: number;
    completed: number;
    status?: string;
  } | null>(null);

  // Sitemap
  const [showSitemapModal, setShowSitemapModal] = useState(false);

  // llms.txt
  const [showLlmModal, setShowLlmModal] = useState(false);
  const [llmContent, setLlmContent] = useState("");
  const [generatingLlm, setGeneratingLlm] = useState(false);
  const [copied, setCopied] = useState(false);

  // Scan / Health
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanResult, setScanResult] = useState<SeoScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [showNonCompliantDetails, setShowNonCompliantDetails] = useState(false);
  const [fixingNonCompliant, setFixingNonCompliant] = useState(false);

  // Client Side Batch (Small Selections — tab must stay open)
  const [isClientBatch, setIsClientBatch] = useState(false);
  const [clientBatchProgress, setClientBatchProgress] = useState({
    current: 0,
    total: 0,
    failed: 0,
  });
  const [stopBatch, setStopBatch] = useState(false);

  // Background (server-side) queue state — tab-independent.
  // F-323 (v2.9.28.48): added permanently_failed — already present in the
  // /seo/background-status response since v2.9.28.45 but missing from this
  // type, so the count was never surfaced in the progress banner.
  // F-331: added cron_blocked to surface DISABLE_WP_CRON inline fallback warning.
  const [bgQueue, setBgQueue] = useState<{
    active: boolean;
    total: number;
    completed: number;
    failed: number;
    permanently_failed?: number;
    pending: number;
    percent: number;
    estimated_minutes: number;
    last_error?: string | null;
    last_item_error?: string | null;
    cron_blocked?: boolean;
  } | null>(null);
  const bgPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // C1: One-time poll error banner — shown once per error, dismissible by user.
  const [pollError, setPollError] = useState<string | null>(null);

  // Refs to expose live state values inside stale closures (avoids re-running the poll effect)
  const bgQueueRef = useRef(bgQueue);
  const fetchItemsRef = useRef<() => void>(() => {});

  // Pending confirmation flags (replaces confirm() dialogs)
  const [pendingOptimizeAll, setPendingOptimizeAll] = useState(false);
  const [pendingSlowOptimizeAll, setPendingSlowOptimizeAll] = useState(false);
  const [pendingRestoreId, setPendingRestoreId] = useState<number | null>(null);

  // Stop signal ref (replaces DOM getElementById hack)
  const stopSignalRef = useRef<boolean>(false);

  // Preview
  const [previewItem, setPreviewItem] = useState<ContentItem | null>(null);

  const { apiUrl, nonce, homeUrl } = window.swisswpsuiteData || {};

  useEffect(() => {
    fetchItems();
  }, [activeTab, page, showUnoptimized, limit]);

  // Keep bgQueueRef in sync so the poll closure always reads the live value
  useEffect(() => {
    bgQueueRef.current = bgQueue;
  }, [bgQueue]);

  // Poll background queue status when active
  useEffect(() => {
    // Freemium Dual-Build: /seo/background-status tracks the server-side AI
    // (Groq) meta-generation queue — deliberately Pro-only (a real side-effect
    // poll, not a passive status read; see
    // docs/architecture/FREEMIUM_DUAL_BUILD_ARCHITECTURE.md's Post-Phase-5
    // note). Free never has an active background job to poll for, so skip
    // the whole effect — including the setInterval setup — rather than just
    // render-gating the AI-meta-generation block downstream. A render-level
    // gate alone would still leave this poll firing unconditionally on every
    // SeoManager mount, hitting a Pro-only route every 10s forever (403 spam).
    if (!isProEditionBuild) {
      return;
    }
    // SEO frontend fix: AbortController prevents state updates on unmounted component.
    const controller = new AbortController();

    const pollBgStatus = async () => {
      if (!apiUrl) return;
      try {
        const res = await fetch(`${apiUrl}/seo/background-status`, {
          headers: { "X-WP-Nonce": nonce },
          signal: controller.signal,
        });
        if (!res.ok) {
          // 503 = lock held or skip window active — Groq rate-limited or server overloaded.
          // Respect retry_after from body if present, otherwise use retry-after header.
          if (res.status === 503) {
            let retryMs = 10000;
            try {
              const errData = await res.json();
              if (errData?.retry_after) {
                retryMs = errData.retry_after * 1000;
              } else {
                const raHeader = res.headers.get("retry-after");
                if (raHeader) {
                  const raSecs = parseInt(raHeader, 10);
                  if (!isNaN(raSecs)) retryMs = raSecs * 1000;
                }
              }
              if (errData?.rate_limited) {
                // F-324 (v2.9.28.48): stable id dedupes — without it, repeated 503
                // responses would spawn a new toast every poll interval (~30s)
                // forever. Sonner replaces an existing toast with the same id
                // instead of stacking, so each retry simply refreshes the message.
                toast.warning(
                  `SEO processing paused due to server load. Retrying in ${Math.round(retryMs / 1000)} seconds.`,
                  { id: "seo-rate-limited" }
                );
              }
            } catch {
              // Non-JSON or read error — fall back to header or default
            }
            // Reschedule using retryMs instead of fixed 10s
            if (bgPollRef.current) clearInterval(bgPollRef.current);
            bgPollRef.current = setInterval(pollBgStatus, retryMs);
            return;
          }
          return;
        }
        const data = await res.json();
        if (data.active) {
          setBgQueue(data);
        } else if (bgQueueRef.current?.active) {
          // Job just finished — clear poll and refresh item list
          if (bgPollRef.current) clearInterval(bgPollRef.current);
          setBgQueue(null);
          toast.success("SEO generation complete!");
          fetchItemsRef.current();
        }
      } catch (err) {
        // AbortError is expected on unmount — ignore it silently.
        if (err instanceof DOMException && err.name === "AbortError") return;
        // C1: Surface poll errors as a one-time dismissible banner instead of swallowing silently.
        // Avoid toast per tick (noisy) — set state once; user can dismiss.
        const msg = err instanceof Error ? err.message : "Network error";
        console.warn("[SEO Poll]", msg);
        setPollError(`SEO background status check failed: ${msg}`);
      }
    };

    // Check status on mount (resume after tab reopen)
    pollBgStatus();

    // Start polling every 10 seconds
    bgPollRef.current = setInterval(pollBgStatus, 10000);
    return () => {
      controller.abort();
      if (bgPollRef.current) clearInterval(bgPollRef.current);
    };
  }, [apiUrl, nonce]);

  // F-224 / F-225: localStorage key for persisting the in-progress slow batch job.
  const SLOW_BATCH_STORAGE_KEY = "swisswpsuite_seo_slow_batch";

  // F-225: Resume-on-mount effect — hydrates state from localStorage if a job
  // was started in a previous session and is less than 24 hours old.
  // Must be declared BEFORE the polling effect so React runs it first.
  useEffect(() => {
    // Freemium Dual-Build sweep fix: this hydrates slowBatchJobId, which in
    // turn drives the /batch/status poll effect below (a Pro-only route).
    // localStorage is per-browser/site, not per-edition-build, so a browser
    // that previously ran the Pro build with an in-flight overnight batch
    // would otherwise resume-hydrate that job here after switching to (or
    // reviewing) the Free build, spamming a dead route. No point resuming
    // anyway — Free can never have queued a batch in the first place.
    if (!isProEditionBuild) return;
    try {
      const raw = localStorage.getItem(SLOW_BATCH_STORAGE_KEY);
      if (!raw) return;
      const persisted = JSON.parse(raw) as {
        job_id: string;
        groq_batch_id: string | null;
        queued_at: number;
        total: number;
        type: ContentType;
      };
      const TTL_MS = 24 * 60 * 60 * 1000;
      if (Date.now() - persisted.queued_at > TTL_MS) {
        // Stale entry — job TTL has elapsed, Groq will have discarded it.
        localStorage.removeItem(SLOW_BATCH_STORAGE_KEY);
        if (import.meta.env.DEV) {
          console.log(
            "[SEO SlowBatch] Stale persisted job cleared (>24h old)."
          );
        }
        return;
      }
      // Valid in-flight job — hydrate UI state.
      setSlowBatchJobId(persisted.job_id);
      setGroqBatchId(persisted.groq_batch_id);
      setSlowBatchInProgress(true);
      // Status will be corrected on the first poll response.
      setSlowBatchStatus({
        total: persisted.total,
        completed: 0,
        status: "resuming",
      });
      const minutesAgo = Math.round((Date.now() - persisted.queued_at) / 60000);
      toast.info(
        `Resumed in-progress SEO batch from ${minutesAgo} minute${minutesAgo === 1 ? "" : "s"} ago.`
      );
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error(
          "[SEO SlowBatch] Failed to read persisted job from localStorage:",
          err
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount only.

  // SEO-HIGH-3 FIX: Poll slow batch (Groq Batch API) status when job ID is set.
  useEffect(() => {
    // Freemium Dual-Build sweep fix: /batch/status is Pro-only; defense-in-
    // depth alongside the resume-on-mount guard above.
    if (!isProEditionBuild) return;
    if (!slowBatchJobId || !apiUrl) return;
    const controller = new AbortController();
    const pollSlowBatch = async () => {
      try {
        const res = await fetch(
          `${apiUrl}/batch/status?job_id=${slowBatchJobId}`,
          { headers: { "X-WP-Nonce": nonce }, signal: controller.signal }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.job) {
          const job = data.job;
          setSlowBatchStatus({
            total: job.total_requests ?? 0,
            completed: job.completed_requests ?? 0,
            status: job.status,
          });
          // If job is complete, failed, or expired, stop polling and refresh items.
          // F-224/F-225: "expired" is the PHP-side terminal state for jobs >24h old
          // or purged from the DB — treat identically to "failed" so polling halts.
          if (
            job.status === "completed" ||
            job.status === "failed" ||
            job.status === "expired"
          ) {
            // Post-audit fix: also clear the "in progress" flag so the banner
            // auto-dismisses on terminal states. Without this, the green banner
            // stays stuck until the user manually clicks the X — amplified by
            // F-225's resume-from-localStorage path hydrating expired jobs.
            setSlowBatchInProgress(false);
            setSlowBatchJobId(null);
            setGroqBatchId(null);
            try {
              localStorage.removeItem(SLOW_BATCH_STORAGE_KEY);
            } catch (_) {
              /* Safari private mode may throw — safe to ignore */
            }
            if (job.status === "completed") {
              toast.success(
                `Overnight AI batch complete! ${job.completed_requests ?? 0} items processed.`
              );
              fetchItemsRef.current();
            } else if (job.status === "expired") {
              toast.warning(
                "The batch job expired (no result received within 24 hours or it was purged). Please re-queue."
              );
            } else {
              toast.error(
                "Overnight AI batch failed. Check diagnostics for details."
              );
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.warn("[SEO SlowBatch Poll]", err);
        // F-334: clear the in-progress flag so the banner doesn't stay stuck on network error.
        setSlowBatchInProgress(false);
        setSlowBatchJobId(null);
        setGroqBatchId(null);
      }
    };
    pollSlowBatch();
    const interval = setInterval(pollSlowBatch, 60000); // Poll every 60s
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [slowBatchJobId, apiUrl, nonce]);

  const handleScan = async () => {
    setScanning(true);
    setShowScanModal(true);
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
          setShowScanModal(false);
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

  const fetchItems = async () => {
    // Freemium Dual-Build (1B, [6.2] fix): /content is Pro-only AI-metadata
    // storage and 404s in Free. The items table this populates only renders
    // behind isProEditionBuild below (ProUpsellPlaceholder otherwise), so
    // fetching here in Free was a pure wasted 404 on every SEO page load —
    // mirrors the isProEditionBuild early-return already shipped on the
    // background-status poll effect above.
    if (!isProEditionBuild) return;
    if (!apiUrl) return;
    setLoading(true);
    try {
      let url = `${apiUrl}/content?type=${activeTab}&limit=${limit}&page=${page}`;
      if (showUnoptimized) {
        url += "&filter=unoptimized";
      }

      const res = await fetch(url, {
        headers: { "X-WP-Nonce": nonce },
      });

      // Handle non-JSON response (e.g. fatal error HTML)
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error("Invalid Server Response: " + text.substring(0, 100));
      }

      if (res.ok) {
        if (data.items) {
          setItems(data.items);
          setTotalPages(data.pages);
          setTotalItems(data.total);
        } else {
          setItems(data);
        }
        setSelectedIds([]);
      } else {
        console.error("API Error:", data);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load content. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Keep fetchItemsRef in sync — must be after fetchItems declaration to avoid "used before declaration" TS error
  useEffect(() => {
    fetchItemsRef.current = fetchItems;
  }, [fetchItems]);

  const handleTabChange = (tab: ContentType) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setPage(1);
    setSelectedIds([]);
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

  const handleGenerate = async (item: ContentItem) => {
    setGenerating(item.id);
    try {
      const res = await fetch(`${apiUrl}/seo/generate/${item.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-WP-Nonce": nonce },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        if (res.status === 402) {
          toast.error(
            "Token balance exhausted. Purchase more tokens or upgrade your plan."
          );
          return;
        }
        throw new Error(err.message || "Server error");
      }

      const json = await res.json();
      // HIGH-2 FIX: verify that at least one required field is non-empty before
      // marking the item as successfully generated. json.success:true + empty fields
      // is the "silent success" pattern — treat it as an error.
      const hasUsableFields =
        json.success &&
        json.data &&
        (item.type === "image"
          ? json.data.alt_text || json.data.title
          : json.data.title || json.data.description);
      if (hasUsableFields) {
        const updates = mapResultToItem(json.data, item.type);
        setItems((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, ...updates } : p))
        );
      } else {
        throw new Error(
          json.message ||
            "AI returned a response but no usable content was generated. Please try again."
        );
      }
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Unknown error";
      setItems((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, lastError: msg } : p))
      );
    } finally {
      setGenerating(null);
    }
  };

  // SEO frontend fix: Replace `any` with typed API result shape.
  const mapResultToItem = (
    result: {
      title?: string;
      description?: string;
      llmSummary?: string;
      alt_text?: string;
      altText?: string;
    },
    type: ContentType
  ): Partial<ContentItem> => {
    const updates: Partial<ContentItem> = {
      lastError: undefined,
      hasHistory: true,
    };
    if (type === "image") {
      updates.altText = result.alt_text || result.altText;
      updates.name = result.title;
    } else {
      updates.metaTitle = result.title;
      updates.metaDescription = result.description;
      updates.llmSummary = result.llmSummary;
    }
    return updates;
  };

  const handleFastBulkOptimize = async () => {
    if (selectedIds.length === 0 || loading) return;
    startClientBatch(selectedIds);
  };

  const handleSlowBulkOptimize = async () => {
    if (selectedIds.length === 0 || loading) return;
    await handleSlowQueueBatch(selectedIds);
  };

  // Audit CRIT-1 + CRIT-2 fix: accept explicit type + skipConfirm so the Health
  // Report category buttons bypass the two-click confirm toast AND avoid the stale
  // `activeTab` closure (setActiveTab → setTimeout race). When called from the
  // action bar button, both args are omitted, preserving the old two-click UX.
  //
  // Bug fix (2026-04-20): When called from the top-level "Generate SEO for All" button
  // (no typeOverride), resolve to `type="all"` for text tabs so the query spans
  // posts + pages + products together — not just the active tab. The Images tab
  // retains tab-scoped behavior because the vision/alt-text pipeline is different
  // from the text SEO pipeline. The PHP /content endpoint supports type=all at
  // class-swisswpsuite-api.php:1621-1623.
  const handleFastOptimizeAll = async (
    typeOverride?: ContentType,
    options?: { skipConfirm?: boolean }
  ) => {
    // Freemium Dual-Build (1B fix): defense-in-depth — the button that calls
    // this is now gated on isProEditionBuild above, but this handler also
    // hits the Pro-only /content?fields=ids route directly, so guard here
    // too in case it is ever reached another way.
    if (!isProEditionBuild) return;
    if (!apiUrl) return;
    const targetType: ContentType =
      typeOverride ?? (activeTab === "image" ? "image" : "all");
    const skipConfirm = options?.skipConfirm === true;
    if (!skipConfirm && !pendingOptimizeAll) {
      setPendingOptimizeAll(true);
      toast.error(
        "This will generate SEO titles and descriptions for ALL content that has none. AI will also create FAQ sections automatically. Takes ~2 min per 5 items — you can close this tab while it runs. Click again to confirm."
      );
      return;
    }
    setPendingOptimizeAll(false);
    setLoading(true);
    try {
      const res = await fetch(
        `${apiUrl}/content?type=${targetType}&filter=unoptimized&fields=ids&limit=10000`,
        {
          headers: { "X-WP-Nonce": nonce },
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.ids && data.ids.length > 0) {
          await handleBackgroundQueue(data.ids, targetType);
        } else {
          toast.error(
            targetType === "all"
              ? "No unoptimized posts, pages, or products found."
              : "No unoptimized items found."
          );
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to fetch unoptimized items. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSlowOptimizeAll = async () => {
    // Freemium Dual-Build (1B fix): same defense-in-depth guard as
    // handleFastOptimizeAll above — this also hits the Pro-only
    // /content?fields=ids route directly.
    if (!isProEditionBuild) return;
    if (!apiUrl) return;
    if (!pendingSlowOptimizeAll) {
      setPendingSlowOptimizeAll(true);
      toast.error(
        "This will queue ALL unoptimized content for overnight AI processing — results appear within 24 hours and use 50% fewer AI tokens than instant generation. Click again to confirm."
      );
      return;
    }
    // Bug fix (2026-04-20): same "all types" semantics as handleFastOptimizeAll
    // — top-level Queue All Overnight spans posts + pages + products for text tabs.
    const targetType: ContentType = activeTab === "image" ? "image" : "all";
    setPendingSlowOptimizeAll(false);
    setLoading(true);
    try {
      const res = await fetch(
        `${apiUrl}/content?type=${targetType}&filter=unoptimized&fields=ids&limit=10000`,
        {
          headers: { "X-WP-Nonce": nonce },
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.ids && data.ids.length > 0) {
          await handleSlowQueueBatch(data.ids, targetType);
        } else {
          toast.error(
            targetType === "all"
              ? "No unoptimized posts, pages, or products found."
              : "No unoptimized items found."
          );
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to fetch unoptimized items. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Submit items for server-side background processing.
   * Tab-independent: WP-Cron handles processing even if tab is closed.
   * Also auto-generates FAQ for each post.
   */
  const handleBackgroundQueue = async (
    idsToQueue: number[],
    typeOverride?: ContentType
  ) => {
    if (!apiUrl || idsToQueue.length === 0 || loading) return;
    const targetType: ContentType = typeOverride ?? activeTab;
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/seo/submit-background`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-WP-Nonce": nonce },
        body: JSON.stringify({
          ids: idsToQueue,
          type: targetType,
          generate_faq: targetType !== "image",
          rewrite_titles: rewriteTitles,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          toast.error(data.message || "A background job is already running.");
        } else {
          throw new Error(data.message || "Server error");
        }
        return;
      }

      if (data.success) {
        setSelectedIds([]);
        setBgQueue({
          active: true,
          total: data.total,
          completed: 0,
          failed: 0,
          pending: data.total,
          percent: 0,
          estimated_minutes: data.estimated_minutes,
        });
        toast.success(
          `Started! ${data.total} items are being processed. SEO titles, descriptions, and FAQs will be generated automatically. You can close this tab.`
        );
        // BUG #6 FIX (v2.9.28.45): Surface dropped IDs so the user can re-submit them.
        // Server caps each batch at 500. Previously >500-item submissions silently dropped
        // the overflow; now the server returns dropped_count + dropped_ids and the frontend
        // makes that visible via a warning toast.
        if (data.dropped_count && data.dropped_count > 0) {
          toast.warning(
            `${data.dropped_count} items were not queued (per-batch limit is 500). They remain unoptimized — please run "Queue All" again to process them.`,
            { duration: 8000 }
          );
        }
      } else {
        throw new Error(data.message || "Queue failed.");
      }
    } catch (e: unknown) {
      console.error(e);
      toast.error(
        (e instanceof Error ? e.message : null) ||
          "Failed to start background job. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSlowQueueBatch = async (
    idsToQueue: number[],
    typeOverride?: ContentType
  ) => {
    if (!apiUrl || idsToQueue.length === 0) return;
    // Bug fix (2026-04-20): accept an optional typeOverride so the top-level
    // "Queue All Overnight" can submit type='all' for cross-tab bulk.
    // Falls back to activeTab to preserve behavior for selection-based callers.
    const submittedType: ContentType = typeOverride ?? activeTab;
    try {
      const res = await fetch(`${apiUrl}/seo/queue-bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-WP-Nonce": nonce },
        body: JSON.stringify({
          ids: idsToQueue,
          type: submittedType,
          rewrite_titles: rewriteTitles,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || "Server error");
      }

      const data = await res.json();
      if (data.success) {
        setSlowBatchInProgress(true);
        // SEO-HIGH-3 FIX: Store job ID to enable status polling.
        if (data.job_id) {
          const jobId = String(data.job_id);
          const batchId = data.groq_batch_id
            ? String(data.groq_batch_id)
            : null;
          setSlowBatchJobId(jobId);
          setGroqBatchId(batchId);
          setSlowBatchStatus({
            total: data.items_queued ?? 0,
            completed: 0,
            status: "queued",
          });
          // F-224: Persist to localStorage so polling can resume after tab close.
          try {
            const payload = {
              job_id: jobId,
              groq_batch_id: batchId,
              queued_at: Date.now(),
              total: data.items_queued ?? 0,
              type: submittedType,
            };
            localStorage.setItem(
              SLOW_BATCH_STORAGE_KEY,
              JSON.stringify(payload)
            );
          } catch (storageErr) {
            if (import.meta.env.DEV) {
              console.error(
                "[SEO SlowBatch] Failed to persist job to localStorage:",
                storageErr
              );
            }
          }
        }
        setSelectedIds([]);
        toast.success(
          `Queued for overnight processing! ${data.items_queued} items will get SEO titles and descriptions within 24 hours — using 50% fewer AI tokens. You can close this tab.`
        );
        // BUG #6 FIX (v2.9.28.45): Surface dropped IDs from the server's 500-item cap.
        if (data.dropped_count && data.dropped_count > 0) {
          toast.warning(
            `${data.dropped_count} items were not queued (per-batch limit is 500). They remain unoptimized — please run "Queue All Overnight" again to process them.`,
            { duration: 8000 }
          );
        }
      } else {
        throw new Error(data.message || "Queue failed.");
      }
    } catch (e: unknown) {
      console.error(e);
      toast.error(
        (e instanceof Error ? e.message : null) ||
          "Failed to queue batch. Please try again."
      );
    }
  };

  const startClientBatch = async (idsToProcess: number[]) => {
    setIsClientBatch(true);
    setStopBatch(false);
    stopSignalRef.current = false;
    setClientBatchProgress({
      current: 0,
      total: idsToProcess.length,
      failed: 0,
    });

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const CONCURRENCY = 3;

    for (let i = 0; i < idsToProcess.length; i += CONCURRENCY) {
      if (stopSignalRef.current) {
        break;
      }

      const chunk = idsToProcess.slice(i, i + CONCURRENCY);
      const promises = chunk.map((id) => processSingleItem(id, sleep));
      await Promise.all(promises);

      setClientBatchProgress((prev) => ({
        ...prev,
        current: Math.min(prev.current + chunk.length, prev.total),
      }));
      await sleep(100);
    }

    setIsClientBatch(false);
    setSelectedIds([]);
  };

  const processSingleItem = async (
    id: number,
    sleep: (ms: number) => Promise<unknown>
  ) => {
    let retries = 0;
    const MAX_RETRIES = 2;
    let success = false;

    while (!success && retries <= MAX_RETRIES) {
      try {
        const res = await fetch(`${apiUrl}/seo/generate/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-WP-Nonce": nonce },
          body: JSON.stringify({ rewriteTitle: rewriteTitles }),
        });

        if (res.status === 429) {
          // Rate limited — pause 65s then retry (existing behaviour)
          console.warn(`Rate Limit Hit for ID ${id}. Pausing 65s...`);
          await sleep(65000);
          retries++;
          continue;
        }

        if (res.status >= 500) {
          // Server error — retry with exponential backoff (1s, 3s)
          if (retries < MAX_RETRIES) {
            const backoff = retries === 0 ? 1000 : 3000;
            console.warn(
              `Server error ${res.status} for ID ${id}. Retrying in ${backoff}ms (attempt ${retries + 1}/${MAX_RETRIES})`
            );
            await sleep(backoff);
            retries++;
            continue;
          } else {
            // All retries exhausted
            throw new Error(
              `Server error ${res.status} after ${MAX_RETRIES} retries`
            );
          }
        }

        if (res.status >= 400 && res.status < 500) {
          // Client error (4xx, excluding 429 handled above) — do NOT retry
          throw new Error(`Client error ${res.status} — will not retry`);
        }

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();
        // HIGH-2 FIX: verify at least one required field is non-empty — same guard
        // as handleGenerate to prevent silent-success marking items as done.
        // W4 FIX: derive the shape check from the item's own `type`, not `activeTab`.
        // Usually equivalent, but diverges if the tab changes mid-batch or if an
        // item's post_type doesn't match the active tab. Fall back to `activeTab`
        // if the item can't be located in the current state (shouldn't happen).
        const itemForId = items.find((p) => p.id === id);
        const effectiveType = itemForId?.type ?? activeTab;
        const hasUsableFields =
          json.success &&
          json.data &&
          (effectiveType === "image"
            ? json.data.alt_text || json.data.title
            : json.data.title || json.data.description);
        if (hasUsableFields) {
          const updates = mapResultToItem(json.data, effectiveType);
          setItems((prev) =>
            prev.map((p) => {
              if (p.id === id)
                return { ...p, ...updates, lastError: undefined };
              return p;
            })
          );
          success = true;

          // Auto-generate FAQ for posts/pages/products (not images)
          // F-219 FIX: Log failures instead of silently swallowing them.
          // W4 FIX: gate on the item's own type, not activeTab, to stay consistent
          // with the hasUsableFields check above.
          if (effectiveType !== "image") {
            fetch(`${apiUrl}/seo/generate-faq`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-WP-Nonce": nonce,
              },
              body: JSON.stringify({ post_id: id, num_faqs: 5 }),
            })
              .then((r) => {
                if (!r.ok) {
                  console.error(
                    `FAQ generation failed for post ${id}: HTTP ${r.status}`
                  );
                  return null;
                }
                return r.json();
              })
              .then((faqData) => {
                if (faqData?.success && faqData.faqs) {
                  setPostFaqs((prev) => ({ ...prev, [id]: faqData.faqs }));
                }
              })
              .catch((err) => {
                // FAQ generation is best-effort — don't block the batch, but log for debugging.
                console.error(`FAQ generation error for post ${id}:`, err);
              });
          }
        } else {
          // HIGH-2 FIX: empty-data is not a network error — don't retry, surface immediately.
          throw new Error(
            json.message ||
              "AI returned a response but no usable content was generated. This item will not be retried automatically."
          );
        }
      } catch (e) {
        // Network error (fetch throws) — retry with backoff.
        // WARN-4 fix: case-insensitive match. Chrome: "TypeError: Failed to fetch";
        // Firefox: "TypeError: NetworkError when attempting to fetch resource".
        const isNetworkError =
          e instanceof TypeError && /fetch|network/i.test(e.message);
        if (isNetworkError && retries < MAX_RETRIES) {
          const backoff = retries === 0 ? 1000 : 3000;
          console.warn(
            `Network error for ID ${id}. Retrying in ${backoff}ms (attempt ${retries + 1}/${MAX_RETRIES})`
          );
          await sleep(backoff);
          retries++;
          continue;
        }
        // Non-retryable error or retries exhausted — count as failure
        setClientBatchProgress((prev) => ({
          ...prev,
          failed: prev.failed + 1,
        }));
        break;
      }
    }
  };

  const handleRestore = async (item: ContentItem) => {
    if (pendingRestoreId !== item.id) {
      setPendingRestoreId(item.id);
      toast.error(
        "This will undo the last AI changes for this item. Click Rollback again to confirm."
      );
      return;
    }

    setPendingRestoreId(null);
    try {
      const res = await fetch(`${apiUrl}/content/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-WP-Nonce": nonce },
        body: JSON.stringify({ id: item.id, field: "all" }),
      });
      if (res.ok) {
        toast.success("Item restored to previous state.");
        fetchItems();
      } else {
        toast.error("Restore failed. Please try again.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Restore failed. Please try again.");
    }
  };

  const handleGenerateFaq = async (item: ContentItem) => {
    if (generatingFaqId !== null) return;
    setGeneratingFaqId(item.id);
    try {
      const res = await fetch(`${apiUrl}/seo/generate-faq`, {
        method: "POST",
        headers: {
          "X-WP-Nonce": nonce,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ post_id: item.id, num_faqs: 5 }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "FAQ generation failed.");
      }
      setPostFaqs((prev) => ({ ...prev, [item.id]: data.faqs }));
      toast.success(`FAQ generated! ${data.count} Q&As added.`);
    } catch (e: unknown) {
      console.error(e);
      toast.error(
        (e instanceof Error ? e.message : null) ||
          "FAQ generation failed. Please try again."
      );
    } finally {
      setGeneratingFaqId(null);
    }
  };

  // SEO frontend fix: Extracted from IIFE inside items.map() — named render helper is idiomatic React.
  const renderSeoStatus = (item: ContentItem) => {
    if (item.lastError) {
      return (
        <Badge
          className="text-brand-accent animate-pulse rounded-xl border-none bg-red-50 px-3 py-1.5 text-xs font-black uppercase"
          icon={AlertTriangle}
        >
          Generation Failed
        </Badge>
      );
    }

    const analysis: { label: string; pass: boolean }[] = [];
    if (activeTab === "image") {
      if (item.altText && item.altText.length > 5)
        analysis.push({ label: "Alt Text Present", pass: true });
      else analysis.push({ label: "Missing Alt Text", pass: false });
    } else {
      if (
        item.metaTitle &&
        item.metaTitle.length >= 10 &&
        item.metaTitle.length <= 70
      )
        analysis.push({ label: "SEO Title Good (10–70 chars)", pass: true });
      else if (item.metaTitle && item.metaTitle.length > 70)
        analysis.push({ label: "SEO Title Too Long (>70 chars)", pass: false });
      else analysis.push({ label: "SEO Title Missing", pass: false });

      if (
        item.metaDescription &&
        item.metaDescription.length >= 50 &&
        item.metaDescription.length <= 160
      )
        analysis.push({
          label: "Description Good (50–160 chars)",
          pass: true,
        });
      else if (item.metaDescription && item.metaDescription.length > 160)
        analysis.push({
          label: "Description Too Long (>160 chars)",
          pass: false,
        });
      else analysis.push({ label: "Description Missing", pass: false });
    }

    const isOptimized = analysis.every((a) => a.pass);

    return (
      <div className="group/status relative flex items-center">
        {isOptimized ? (
          <Badge
            className="rounded-xl border-none bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-600 uppercase"
            icon={Check}
          >
            SEO Ready
          </Badge>
        ) : (
          <Badge
            className="bg-background rounded-xl border-none px-3 py-1.5 text-xs font-black text-neutral-700 uppercase"
            icon={AlertCircle}
          >
            Needs SEO
          </Badge>
        )}

        {/* Analysis Tooltip */}
        <div className="bg-card dark:bg-card shadow-premium border-border dark:border-border/20 invisible absolute top-full left-0 z-50 mt-4 w-72 translate-y-2 rounded-[1.5rem] border p-6 opacity-0 transition-all duration-300 group-hover/status:visible group-hover/status:translate-y-0 group-hover/status:opacity-100">
          <h4 className="border-border mb-4 border-b pb-3 text-xs font-black tracking-widest text-neutral-700 uppercase">
            SEO Checks
          </h4>
          <ul className="space-y-3">
            {analysis.map((check, idx) => (
              <li key={idx} className="flex items-center gap-3 text-sm">
                <div
                  className={`rounded-md p-1 ${check.pass ? "bg-emerald-50 text-emerald-600" : "text-brand-accent bg-red-50"}`}
                >
                  {check.pass ? <Check size={10} /> : <X size={10} />}
                </div>
                <span
                  className={`font-black tracking-tight uppercase ${check.pass ? "text-slate-700" : "text-brand-accent"}`}
                >
                  {check.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  const toggleSelectAllPage = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((i) => i.id));
    }
  };

  return (
    <div className="animate-in fade-in min-w-0 space-y-12 pb-20 duration-700">
      {/* C1: One-time dismissible poll error banner */}
      {pollError && (
        <div
          className="flex items-center justify-between gap-4 rounded-xl border border-amber-400/30 bg-amber-50 px-5 py-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
          role="alert"
        >
          <span>{pollError}</span>
          <button
            type="button"
            onClick={() => setPollError(null)}
            className="shrink-0 font-bold text-amber-600 hover:text-amber-900 dark:hover:text-amber-100"
            aria-label="Dismiss poll error"
          >
            &times;
          </button>
        </div>
      )}
      <SectionHeader
        title="SEO & Search Visibility"
        description={
          isProEditionBuild
            ? "Improve how your site appears in search engines and AI assistants — AI generates your titles, descriptions, and image captions automatically. For rewriting WooCommerce product descriptions with tone control, see AI Content."
            : "Improve how your site appears in search engines and AI assistants. Run a free SEO Health Check, generate your Sitemap, and create an AI Assistant Guide below — AI-generated titles, descriptions, and image captions are a Pro feature."
        }
        action={
          <div className="flex flex-col items-start gap-3 sm:items-end">
            {/* Action Buttons */}
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
                onClick={() => setShowSitemapModal(true)}
                icon={Layout}
                className="border-border hover:bg-background rounded-xl text-sm font-black tracking-widest uppercase transition-all"
              >
                Sitemap
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowLlmModal(true)}
                icon={FileText}
                className="border-border hover:bg-background rounded-xl text-sm font-black tracking-widest uppercase transition-all"
                title="Generates an llms.txt guide that helps AI assistants like ChatGPT and Perplexity understand and cite your site correctly. Free, local — no AI tokens used."
              >
                AI Assistant Guide
              </Button>

              {/* Freemium Dual-Build (C2 fix, item #9 "Queue all overnight"):
                  every button in this block spends AI tokens (instant or
                  overnight) via the Pro-only Groq pipeline — physically
                  absent from the Free zip. Un-gated, "Generate SEO for All"
                  rendered greyed-out-looking (balance always 0) and "Queue
                  All Overnight" rendered fully clickable but hit a dead AI
                  route on click. Gating the whole selectedIds ternary (not
                  just the no-selection arm) also covers the bulk-selection
                  variant defensively, even though the Pro-only items table
                  below (the only way to populate selectedIds) never mounts
                  in Free. */}
              {isProEditionBuild &&
                (selectedIds.length > 0 ? (
                  <>
                    <Button
                      variant="primary"
                      onClick={handleFastBulkOptimize}
                      disabled={!canAfford("sentinel_seo")}
                      icon={Sparkles}
                      className="text-foreground dark:text-foreground bg-swiss-navy hover:bg-brand-accent shadow-swiss-navy/10 rounded-xl border-none px-6 text-sm font-black tracking-widest uppercase shadow-lg transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Generate SEO titles & descriptions now using AI tokens. Tab must stay open."
                    >
                      Generate SEO ({selectedIds.length} selected)
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleSlowBulkOptimize}
                      icon={Clock}
                      className="text-foreground dark:text-foreground rounded-xl border-none bg-emerald-600 px-6 text-sm font-black tracking-widest uppercase shadow-lg shadow-emerald-600/10 transition-all hover:bg-emerald-700 active:scale-95"
                      title="Queue for overnight AI processing — uses 50% fewer AI tokens. Results arrive within 24 hours."
                    >
                      Queue Overnight &mdash; 50% Cheaper ({selectedIds.length})
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="primary"
                      onClick={() => handleFastOptimizeAll()}
                      disabled={loading || !canAfford("sentinel_seo")}
                      icon={Play}
                      className="text-foreground bg-swiss-navy hover:bg-secondary rounded-xl border-none text-sm font-black tracking-widest uppercase disabled:cursor-not-allowed disabled:opacity-50"
                      title="Generate SEO titles & descriptions for all unoptimized content now. Uses AI tokens. Tab must stay open."
                    >
                      Generate SEO for All
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleSlowOptimizeAll}
                      disabled={loading}
                      icon={Clock}
                      className="text-foreground rounded-xl border-none bg-emerald-600 text-sm font-black tracking-widest uppercase hover:bg-emerald-700"
                      title="Queue all unoptimized content for overnight AI processing — uses 50% fewer AI tokens. Results arrive within 24 hours. You can close this tab."
                    >
                      Queue All Overnight &mdash; 50% Cheaper
                    </Button>
                  </>
                ))}
            </div>
          </div>
        }
      />

      {isProEditionBuild ? (
        <>
          <div className="glass-panel border-l-swiss-red group relative overflow-hidden rounded-[2.5rem] border-l-4 p-8">
            <div className="bg-swiss-red/5 absolute top-0 right-0 -mt-16 -mr-16 h-32 w-32 rounded-full transition-transform duration-700 group-hover:scale-110" />
            <div className="relative z-10 flex items-start gap-6">
              <div className="bg-card dark:bg-secondary border-border dark:text-foreground flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-neutral-900 transition-transform group-hover:rotate-12 dark:border-transparent">
                <Bot size={24} />
              </div>
              <div>
                <h4 className="text-foreground dark:text-foreground mb-2 text-sm font-black tracking-widest uppercase">
                  How It Works
                </h4>
                <p className="max-w-3xl text-sm leading-relaxed font-medium text-neutral-700">
                  AI reads your content and writes the SEO title and description
                  that appears in Google search results — no manual writing
                  needed. Each item uses a small number of AI tokens from your
                  plan.
                  {activeTab === "image" &&
                    " For images, AI looks at the image and writes a description (alt text) that helps Google Image Search and improves accessibility for screen readers."}
                </p>
              </div>
            </div>
          </div>

          {/* Slow Batch In Progress Banner (Groq Batch API — 24h) */}
          {slowBatchInProgress && (
            <div
              className="glass-panel rounded-[2rem] border border-emerald-200/60 bg-emerald-50/40 p-6"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Clock size={20} />
                </div>
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <h4 className="text-sm font-black tracking-widest text-emerald-800 uppercase">
                      Overnight AI Queue Running
                    </h4>
                    <button
                      onClick={() => setSlowBatchInProgress(false)}
                      aria-label="Dismiss batch in progress notice"
                      className="rounded-lg p-1 text-emerald-600 transition-colors hover:text-emerald-800"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {/* SEO-HIGH-3 FIX: Show progress when polling data is available */}
                  {slowBatchStatus && slowBatchStatus.total > 0 ? (
                    <div>
                      <p className="mb-2 text-xs leading-relaxed font-medium text-emerald-700">
                        Processing {slowBatchStatus.completed} of{" "}
                        {slowBatchStatus.total} items
                        {slowBatchStatus.status &&
                          ` — ${slowBatchStatus.status}`}
                      </p>
                      <div className="h-2 w-full rounded-full bg-emerald-200/50">
                        <div
                          className="h-2 rounded-full bg-emerald-600 transition-all duration-500"
                          style={{
                            width: `${Math.round((slowBatchStatus.completed / slowBatchStatus.total) * 100)}%`,
                          }}
                        />
                      </div>
                      {/* F-225: AI batch ID for debugging/support visibility */}
                      {groqBatchId && (
                        <p className="mt-1.5 font-mono text-xs text-neutral-400">
                          AI batch: {groqBatchId}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs leading-relaxed font-medium text-emerald-700">
                      Your content is queued for overnight AI processing &mdash;
                      SEO titles and descriptions will appear automatically
                      within 24 hours. Uses 50% fewer AI tokens than instant
                      generation. You can safely close this tab.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* F-331: Cron-blocked warning — shown when DISABLE_WP_CRON is active */}
          {bgQueue?.cron_blocked && (
            <div
              className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3.5 dark:border-amber-700 dark:bg-amber-900/15"
              role="alert"
              aria-label="SEO processing inline fallback warning"
            >
              <AlertTriangle
                size={15}
                className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="mb-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                  SEO processing via inline fallback — no WP-Cron detected
                </p>
                <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                  Your hosting environment has WP-Cron disabled. SEO items are
                  processed via inline fallback on every REST poll (~3 items per
                  10 seconds). This is slower than server-side cron. For faster
                  processing, set up a server cron job:{" "}
                  <code className="rounded bg-amber-100 px-1 font-mono text-[10px] dark:bg-amber-900/40">
                    */5 * * * * wget -q -O - {"{homeUrl}"}
                    /wp-cron.php?doing_wp_cron
                  </code>
                </p>
              </div>
            </div>
          )}

          {/* Background SEO Queue Banner — server-side fast processing */}
          {bgQueue?.active && (
            <div
              className="glass-panel rounded-[2rem] border border-blue-200/60 bg-blue-50/40 p-6"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Activity size={20} className="animate-pulse" />
                </div>
                <div className="flex-1">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-sm font-black tracking-widest text-blue-800 uppercase">
                      AI Generating SEO + FAQs in Background
                    </h4>
                    <button
                      onClick={async () => {
                        await fetch(`${apiUrl}/seo/cancel-background`, {
                          method: "POST",
                          headers: { "X-WP-Nonce": nonce },
                        });
                        setBgQueue(null);
                        toast.success("Background job cancelled.");
                      }}
                      aria-label="Cancel background job"
                      className="bg-secondary text-swiss-navy border-border hover:bg-muted hover:text-brand-accent rounded-xl border px-3 py-1 text-xs font-black uppercase transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="mb-2 h-2 w-full rounded-full bg-blue-100">
                    <div
                      className="h-2 rounded-full bg-blue-600 transition-all duration-500"
                      style={{ width: `${bgQueue.percent}%` }}
                    />
                  </div>
                  <p className="text-xs font-medium text-blue-700">
                    {bgQueue.completed} / {bgQueue.total} complete &bull;{" "}
                    {bgQueue.failed > 0 ? `${bgQueue.failed} failed · ` : ""}
                    {(bgQueue.permanently_failed ?? 0) > 0
                      ? `${bgQueue.permanently_failed} permanently failed · `
                      : ""}
                    {bgQueue.estimated_minutes}min remaining &mdash;{" "}
                    <span className="font-bold">
                      You can close this tab safely.
                    </span>
                  </p>
                  {(bgQueue.last_error || bgQueue.last_item_error) && (
                    <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                      {bgQueue.last_item_error || bgQueue.last_error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tabs & Filters */}
          <div className="border-border flex min-w-0 flex-col items-center justify-between gap-8 border-b pb-8 md:flex-row">
            <div className="scrollbar-hide bg-card dark:bg-secondary border-border dark:border-border/10 flex max-w-full self-start overflow-x-auto rounded-2xl border p-1.5 backdrop-blur-sm">
              {[
                { id: "product", label: "Products", icon: Box },
                { id: "post", label: "Articles", icon: FileText },
                { id: "page", label: "Pages", icon: Layout },
                { id: "image", label: "Images", icon: ImageIcon },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as ContentType)}
                  className={`flex shrink-0 items-center gap-2.5 rounded-xl px-6 py-2.5 text-sm font-black tracking-widest uppercase transition-all ${
                    activeTab === tab.id
                      ? "bg-secondary dark:bg-card/10 dark:text-foreground shadow-soft text-neutral-900 ring-1 ring-slate-200 dark:ring-white/20"
                      : "dark:hover:text-foreground hover:bg-background dark:hover:bg-secondary text-neutral-700 hover:text-neutral-900 dark:bg-transparent"
                  }`}
                >
                  <tab.icon size={14} /> {tab.label}
                </button>
              ))}
            </div>

            <div className="flex w-full items-center gap-4 md:w-auto">
              <button
                onClick={() => setShowUnoptimized(!showUnoptimized)}
                className={`group flex items-center gap-3 rounded-2xl border-none px-5 py-3 text-sm font-black tracking-widest uppercase transition-all ${
                  showUnoptimized
                    ? "bg-brand-accent text-foreground dark:text-foreground shadow-brand-accent/20 shadow-lg"
                    : "bg-background hover:bg-secondary text-neutral-700"
                }`}
              >
                <Filter
                  size={14}
                  className={showUnoptimized ? "animate-pulse" : ""}
                />
                {showUnoptimized
                  ? "Showing: Needs Attention Only"
                  : "Showing: All Content"}
                {showUnoptimized && (
                  <X
                    size={12}
                    className="ml-1 opacity-50 transition-transform group-hover:scale-110"
                  />
                )}
              </button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchItems()}
                className="bg-background hover:text-swiss-navy rounded-2xl p-3 text-neutral-700 transition-all duration-500 hover:rotate-180"
                icon={RefreshCw}
              />
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] border-orange-100/50 bg-orange-50/30 p-8">
            <div className="flex items-start gap-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100/50 text-orange-600">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-black tracking-widest text-orange-800 uppercase">
                    Also Rewrite Product Titles
                  </h4>
                  <Badge className="border-none bg-orange-100/50 px-3 text-xs font-black text-orange-700 uppercase">
                    Advanced Option
                  </Badge>
                </div>
                <p className="mb-6 text-xs leading-relaxed font-medium text-orange-700/80">
                  When enabled, AI will also rewrite your product titles (max 6
                  words) to be more search-friendly.{" "}
                  <span className="font-bold underline decoration-orange-300">
                    Warning: this permanently changes the product title stored
                    in your database.
                  </span>
                </p>
                <div className="group flex w-fit cursor-pointer items-center gap-4">
                  <div
                    role="switch"
                    aria-checked={rewriteTitles}
                    aria-label="Also rewrite product titles"
                    tabIndex={0}
                    className={`h-6 w-12 cursor-pointer rounded-full p-1 transition-colors duration-300 ${rewriteTitles ? "bg-green-500" : "bg-red-500"}`}
                    onClick={() => setRewriteTitles(!rewriteTitles)}
                    onKeyDown={(e) =>
                      (e.key === "Enter" || e.key === " ") &&
                      setRewriteTitles(!rewriteTitles)
                    }
                  >
                    <div
                      className="h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-300"
                      style={{
                        transform: rewriteTitles
                          ? "translateX(1.5rem)"
                          : "translateX(0)",
                      }}
                    />
                  </div>
                  <span className="text-sm font-black tracking-widest text-orange-900 uppercase opacity-80 transition-opacity group-hover:opacity-100">
                    {rewriteTitles
                      ? "Title Rewriting On"
                      : "Title Rewriting Off"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Card
            noPadding
            className="overflow-visible border-none bg-transparent shadow-none"
          >
            {loading ? (
              <div className="glass-panel flex flex-col items-center gap-6 rounded-[3rem] p-32 text-center text-neutral-700">
                <Loader className="text-swiss-navy animate-spin" size={48} />
                <span className="text-sm font-black tracking-widest uppercase">
                  Loading content...
                </span>
              </div>
            ) : (
              <div className="border-border dark:border-border/10 bg-card dark:bg-secondary shadow-premium overflow-hidden rounded-[2.5rem] border">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-background dark:bg-secondary border-border dark:border-border/10 border-b text-xs font-black tracking-widest text-neutral-700 uppercase">
                      <tr>
                        <th className="w-12 px-6 py-5">
                          <div className="flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={
                                items.length > 0 &&
                                selectedIds.length === items.length
                              }
                              onChange={toggleSelectAllPage}
                              className="border-border dark:border-border/10 bg-card dark:bg-secondary text-swiss-red focus:ring-swiss-red h-4 w-4 rounded-lg transition-all"
                            />
                          </div>
                        </th>
                        <th className="px-6 py-5">Content</th>
                        <th className="px-6 py-5">SEO Status</th>
                        <th className="px-6 py-5">
                          {activeTab === "image"
                            ? "AI Alt Text"
                            : "AI Summary for Google"}
                        </th>
                        <th className="px-6 py-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {items.map((item) => (
                        <tr
                          key={item.id}
                          className="group hover:bg-background/50 transition-all duration-300"
                        >
                          <td className="px-6 py-6 align-top">
                            <div className="flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(item.id)}
                                onChange={() => {
                                  if (selectedIds.includes(item.id))
                                    setSelectedIds(
                                      selectedIds.filter((id) => id !== item.id)
                                    );
                                  else
                                    setSelectedIds([...selectedIds, item.id]);
                                }}
                                className="border-border text-brand-accent focus:ring-brand-accent h-4 w-4 rounded-lg transition-all"
                              />
                            </div>
                          </td>
                          <td className="w-1/3 px-6 py-6 align-top">
                            <div className="flex gap-6">
                              {activeTab === "image" && item.imageUrl && (
                                <div className="relative shrink-0">
                                  <img
                                    src={item.imageUrl}
                                    alt={item.altText}
                                    className="border-border shadow-soft h-20 w-20 rounded-2xl border object-cover transition-transform duration-500 group-hover:scale-105"
                                  />
                                  <div className="absolute inset-0 rounded-2xl ring-1 ring-black/5 ring-inset" />
                                </div>
                              )}
                              <div>
                                <div className="dark:text-foreground group-hover:text-brand-accent mb-2 text-[13px] leading-tight font-black text-neutral-900 transition-colors">
                                  {item.name}
                                </div>
                                {postFaqs[item.id] &&
                                  postFaqs[item.id].length > 0 && (
                                    <span className="mb-1.5 inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-black tracking-widest text-emerald-600 uppercase">
                                      <MessageSquare size={10} />
                                      FAQ ({postFaqs[item.id].length})
                                    </span>
                                  )}
                                <div className="line-clamp-2 max-w-sm text-sm leading-relaxed font-medium text-neutral-700 italic">
                                  {activeTab === "image"
                                    ? item.altText ||
                                      item.description ||
                                      "No alt text yet — click Generate SEO."
                                    : item.description ||
                                      "No description found — click Generate SEO."}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="w-1/6 px-6 py-6 align-top">
                            {/* Status Check Logic — extracted to renderSeoStatus() */}
                            {renderSeoStatus(item)}
                          </td>
                          <td className="px-6 py-6 align-top">
                            {activeTab === "image" ? (
                              <div className="max-w-xs text-sm leading-relaxed font-medium text-neutral-700 italic">
                                {item.altText || (
                                  <span className="text-foreground text-xs font-black tracking-widest uppercase not-italic">
                                    No alt text yet — click Generate SEO
                                  </span>
                                )}
                              </div>
                            ) : item.llmSummary ? (
                              <div className="max-w-sm space-y-3">
                                <div className="flex items-center gap-2 text-xs font-black tracking-widest text-neutral-700 uppercase">
                                  <Bot size={10} className="text-swiss-navy" />{" "}
                                  AI Summary for Search &amp; AI Assistants
                                </div>
                                <div className="dark:text-foreground bg-background dark:bg-secondary border-border dark:border-border/10 line-clamp-3 cursor-help rounded-2xl border p-4 text-sm leading-relaxed font-medium text-slate-600 italic transition-all hover:line-clamp-none">
                                  "{item.llmSummary}"
                                </div>
                              </div>
                            ) : (
                              <div className="text-foreground text-xs font-black tracking-widest uppercase italic">
                                Not generated yet
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-6 text-right align-top">
                            <div className="flex flex-col items-end gap-3">
                              <Button
                                variant={
                                  generating === item.id ? "ghost" : "primary"
                                }
                                size="sm"
                                onClick={() => handleGenerate(item)}
                                loading={generating === item.id}
                                disabled={!canAfford("sentinel_seo")}
                                className={`rounded-xl px-6 py-2 text-xs font-black tracking-widest uppercase transition-all disabled:cursor-not-allowed disabled:opacity-50 ${generating === item.id ? "bg-background" : "bg-swiss-navy text-foreground dark:text-foreground hover:bg-brand-accent border-none"}`}
                                icon={Sparkles}
                                title="Generate SEO title & description using AI (uses AI tokens)"
                              >
                                {generating === item.id
                                  ? "Generating..."
                                  : "Generate SEO"}
                              </Button>

                              {activeTab !== "image" && (
                                <Button
                                  variant={
                                    generatingFaqId === item.id
                                      ? "ghost"
                                      : "secondary"
                                  }
                                  size="sm"
                                  onClick={() => handleGenerateFaq(item)}
                                  disabled={generatingFaqId !== null}
                                  aria-busy={generatingFaqId === item.id}
                                  aria-label={
                                    generatingFaqId === item.id
                                      ? "Generating FAQ..."
                                      : "Generate FAQ"
                                  }
                                  className={`rounded-xl border px-6 py-2 text-xs font-black tracking-widest uppercase transition-all ${generatingFaqId === item.id ? "bg-background border-border cursor-not-allowed text-neutral-400" : "bg-background border-border hover:text-swiss-navy hover:border-swiss-navy text-neutral-700"}`}
                                  icon={
                                    generatingFaqId === item.id
                                      ? Loader
                                      : MessageSquare
                                  }
                                >
                                  {generatingFaqId === item.id
                                    ? "Generating..."
                                    : "Generate FAQ"}
                                </Button>
                              )}

                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setPreviewItem(item)}
                                  className="bg-background hover:text-swiss-navy rounded-xl p-2 text-neutral-700 transition-all"
                                  title="View current SEO title, description & AI summary"
                                >
                                  <Eye size={12} />
                                </Button>

                                {item.hasHistory && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRestore(item)}
                                    className="bg-background hover:text-brand-accent rounded-xl p-2 text-neutral-700 transition-all"
                                    title="Undo last AI changes and restore previous SEO data"
                                  >
                                    <RotateCcw size={12} />
                                  </Button>
                                )}

                                {item.permalink && activeTab !== "image" && (
                                  <a
                                    href={`https://metatags.io/?url=${encodeURIComponent(item.permalink)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-background inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs tracking-wider text-neutral-500 uppercase transition-all hover:text-sky-600"
                                    title="See how this page looks in Google search results — opens metatags.io"
                                  >
                                    <ExternalLink size={10} />
                                    Google Preview
                                  </a>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {items.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="text-foreground py-32 text-center"
                          >
                            <div className="flex flex-col items-center gap-4">
                              <div className="bg-background flex h-16 w-16 items-center justify-center rounded-3xl">
                                <Search size={32} className="opacity-20" />
                              </div>
                              <p className="text-sm font-black tracking-widest uppercase">
                                {showUnoptimized
                                  ? "All content has SEO titles and descriptions."
                                  : "No content found in this category."}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pagination Controls */}
            {!loading && items.length > 0 && (
              <div className="glass-panel mt-8 flex items-center justify-between rounded-3xl px-8 py-6">
                <div className="flex items-center gap-6">
                  <span className="text-sm font-black tracking-widest text-neutral-700 uppercase">
                    Showing{" "}
                    <span className="text-swiss-navy">{items.length}</span> of{" "}
                    <span className="text-swiss-navy">{totalItems}</span>
                  </span>
                  <div className="bg-secondary h-4 w-px" />
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="text-swiss-navy hover:text-brand-accent cursor-pointer bg-transparent text-sm font-black tracking-widest uppercase transition-colors outline-none"
                    aria-label="Items per page"
                  >
                    <option value={20}>20 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                  </select>
                </div>
                <div className="flex items-center gap-6">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="bg-background hover:text-swiss-navy hover:bg-secondary flex h-10 w-10 items-center justify-center rounded-xl text-neutral-700 transition-all disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-swiss-navy text-sm font-black tracking-widest uppercase">
                    Page <span className="text-brand-accent">{page}</span> of{" "}
                    {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="bg-background hover:text-swiss-navy hover:bg-secondary flex h-10 w-10 items-center justify-center rounded-xl text-neutral-700 transition-all disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </Card>
        </>
      ) : (
        <ProUpsellPlaceholder
          feature="AI SEO Meta Generation"
          icon={Sparkles}
          description="AI reads each product, post, page, or image and writes the SEO title, description, and alt text that appears in Google search results — no manual writing needed. Your Sitemap and free SEO Health Check above still work fully."
          bullets={[
            "AI-generated SEO titles & meta descriptions",
            "AI alt-text for images (accessibility + Image Search)",
            "Bulk-optimize your whole catalog, or queue it overnight",
          ]}
          editionMismatch={hasEditionMismatch()}
        />
      )}

      {/* Scan Modal */}
      {showScanModal && (
        <div
          className="bg-swiss-navy/40 animate-in fade-in fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm duration-300"
          role="dialog"
          aria-modal="true"
          aria-labelledby="seo-audit-title"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setShowScanModal(false);
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
                  {/* Score + Realistic Ceiling */}
                  <div className="glass-panel bg-background/50 flex items-center justify-between rounded-3xl p-6">
                    <div>
                      <div className="text-swiss-navy text-4xl font-black">
                        {scanResult.score}
                        <span className="text-foreground text-xl">/100</span>
                      </div>
                      <div className="mt-2 text-xs font-black tracking-widest text-neutral-700 uppercase">
                        Overall SEO Score
                      </div>
                      {scanResult.score < 100 &&
                        scanResult.max_achievable_score < 100 && (
                          <div className="mt-1 text-[11px] font-medium text-neutral-500">
                            Realistic ceiling:{" "}
                            <span className="text-swiss-navy font-black">
                              {scanResult.max_achievable_score}
                            </span>
                            /100 given site content
                          </div>
                        )}
                    </div>
                    <div
                      className={`flex h-16 w-16 items-center justify-center rounded-2xl ${scanResult.score >= 80 ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"}`}
                    >
                      <PieChart size={32} />
                    </div>
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
                        // RB-305: prefer `actionable` (new shape) over `missing` (old shape)
                        const actionableCount =
                          entry.actionable ?? entry.missing;
                        const thinCount = entry.excluded_thin_content ?? 0;
                        const needsAction = actionableCount > 0;
                        // Label map
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
                            {/* RB-305: thin content informational note */}
                            {thinCount > 0 && (
                              <p className="text-[11px] leading-relaxed text-neutral-500">
                                + {thinCount} thin content{" "}
                                {key === "image" ? "files" : "pages"} (normal —
                                too little content for AI to improve)
                              </p>
                            )}
                            {/* RB-306: per-category fix button.
                                Audit CRIT-1 + CRIT-2 fix: pass the target type explicitly
                                (avoids stale activeTab closure) and skipConfirm=true
                                (bypasses the two-click confirm toast). */}
                            {needsAction && (
                              <button
                                onClick={() => {
                                  const targetType = contentTypeMap[key];
                                  setShowScanModal(false);
                                  setActiveTab(targetType);
                                  handleFastOptimizeAll(targetType, {
                                    skipConfirm: true,
                                  });
                                }}
                                className="bg-brand-accent hover:bg-brand-accent/90 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-black tracking-widest text-white uppercase transition-all"
                                aria-label={`Generate SEO for all ${labelMap[key] ?? key} with missing metadata`}
                              >
                                <Sparkles size={12} />
                                {key === "image"
                                  ? `Generate Alt Text for All (${actionableCount})`
                                  : `Generate SEO for All ${labelMap[key] ?? key} (${actionableCount})`}
                              </button>
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
                          {/* Group: Thin Content — Expected */}
                          {scanResult.non_compliant_items.some(
                            (i) => i.reason === "short_content"
                          ) && (
                            <div>
                              <div className="mb-2 flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                <span className="text-[11px] font-black tracking-widest text-amber-700 uppercase">
                                  Thin Content — Expected Limitation
                                </span>
                              </div>
                              <p className="mb-3 text-[11px] leading-relaxed text-neutral-500">
                                These pages have minimal content. The AI cannot
                                generate 150+ character descriptions from
                                insufficient source material. This is normal and
                                does not indicate a problem.
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
                                  disabled={
                                    fixingNonCompliant ||
                                    (bgQueue?.active ?? false)
                                  }
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
                          ) : scanResult.non_compliant_items.every(
                              (i) => i.reason === "short_content"
                            ) ? (
                            <>
                              The remaining items have very little content, so
                              the AI cannot write full descriptions for them.
                              Your score of{" "}
                              <strong>{scanResult.score}/100</strong> is the
                              best possible for your site&apos;s content — no
                              action needed.
                            </>
                          ) : scanResult.non_compliant_items.some(
                              (i) => i.reason === "missing"
                            ) ? (
                            <>
                              Use the <strong>Generate SEO</strong> buttons
                              above to create titles and descriptions for items
                              that have no SEO data yet.
                            </>
                          ) : (
                            <>
                              {
                                scanResult.non_compliant_items.filter(
                                  (i) => i.reason === "below_threshold"
                                ).length
                              }{" "}
                              item
                              {scanResult.non_compliant_items.filter(
                                (i) => i.reason === "below_threshold"
                              ).length !== 1
                                ? "s have"
                                : " has"}{" "}
                              short descriptions (under 150 characters) and can
                              be re-generated for better results.
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
                        {/* Fix Non-Compliant action button — only when below_threshold items exist */}
                        {scanResult.non_compliant_items.some(
                          (i) => i.reason === "below_threshold"
                        ) && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleFixNonCompliant}
                            loading={fixingNonCompliant}
                            disabled={
                              fixingNonCompliant || (bgQueue?.active ?? false)
                            }
                            className="bg-brand-accent hover:bg-brand-accent/90 mt-3 rounded-xl border-none px-5 py-2 text-xs font-black tracking-widest text-white uppercase transition-all"
                            icon={RefreshCw}
                          >
                            {fixingNonCompliant
                              ? "Queuing..."
                              : `Re-Generate Short Descriptions (${scanResult.non_compliant_items.filter((i) => i.reason === "below_threshold").length})`}
                          </Button>
                        )}
                        {/* Show notice when a missing-description issue exists alongside below_threshold */}
                        {scanResult.non_compliant_items.some(
                          (i) => i.reason === "missing"
                        ) &&
                          scanResult.non_compliant_items.some(
                            (i) => i.reason === "below_threshold"
                          ) && (
                            <p className="mt-2 text-xs leading-relaxed font-medium opacity-60">
                              Items with no descriptions at all require the
                              per-category <strong>Generate SEO</strong> buttons
                              above. The button here only re-generates items
                              that already have a short description.
                            </p>
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
                onClick={() => setShowScanModal(false)}
                aria-label="Close SEO health check"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewItem && (
        <div
          className="bg-swiss-navy/40 animate-in fade-in fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm duration-300"
          role="dialog"
          aria-modal="true"
          aria-labelledby="seo-preview-title"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setPreviewItem(null);
            }
          }}
        >
          <div
            className="bg-card dark:bg-card shadow-premium border-border dark:border-border/10 animate-in zoom-in-95 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2.5rem] border duration-300"
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
                  <Eye size={24} />
                </div>
                <div>
                  <h3
                    id="seo-preview-title"
                    className="text-swiss-navy text-xl font-black tracking-tight uppercase"
                  >
                    SEO Details
                  </h3>
                  <p className="mt-0.5 text-xs font-black tracking-widest text-neutral-700 uppercase">
                    Current titles, descriptions & AI summary
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="text-foreground hover:text-swiss-navy rounded-2xl p-3 transition-all"
              >
                <X size={28} />
              </button>
            </div>

            <div className="custom-scrollbar space-y-10 overflow-y-auto p-10">
              <div>
                <h4 className="mb-4 text-sm font-black tracking-widest text-neutral-700 uppercase">
                  Content Title
                </h4>
                <div className="bg-background text-swiss-navy border-border rounded-2xl border p-5 text-sm font-black">
                  {previewItem.name}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-10">
                {previewItem.metaTitle && (
                  <div className="group">
                    <h4 className="text-brand-accent mb-4 flex items-center gap-2 text-sm font-black tracking-widest uppercase">
                      <div className="bg-brand-accent h-3 w-1 rounded-full" />{" "}
                      Optimized Meta Title
                    </h4>
                    <div className="bg-card border-border group-hover:border-brand-accent/20 text-swiss-navy rounded-2xl border-2 p-5 text-sm font-bold transition-all">
                      {previewItem.metaTitle}
                    </div>
                  </div>
                )}

                {previewItem.metaDescription && (
                  <div className="group">
                    <h4 className="text-brand-accent mb-4 flex items-center gap-2 text-sm font-black tracking-widest uppercase">
                      <div className="bg-brand-accent h-3 w-1 rounded-full" />{" "}
                      Optimized Meta Description
                    </h4>
                    <div className="bg-card border-border group-hover:border-brand-accent/20 text-swiss-navy rounded-2xl border-2 p-5 text-[13px] leading-[1.6] font-medium italic transition-all">
                      "{previewItem.metaDescription}"
                    </div>
                  </div>
                )}
              </div>

              {previewItem.llmSummary && (
                <div className="glass-panel bg-swiss-navy text-foreground dark:text-foreground relative overflow-hidden rounded-[2rem] p-8">
                  <div className="bg-secondary dark:bg-secondary absolute top-0 right-0 -mt-16 -mr-16 h-32 w-32 rounded-full" />
                  <h4 className="text-foreground/50 relative z-10 mb-6 flex items-center gap-2 text-xs font-black tracking-widest uppercase">
                    <Bot size={14} className="text-brand-accent" /> AI Summary
                    for Search &amp; AI Assistants
                  </h4>
                  <div className="relative z-10 text-sm leading-relaxed font-medium italic opacity-90">
                    "{previewItem.llmSummary}"
                  </div>
                </div>
              )}

              {previewItem.altText && (
                <div className="group">
                  <h4 className="mb-4 flex items-center gap-2 text-sm font-black tracking-widest text-emerald-600 uppercase">
                    <div className="h-3 w-1 rounded-full bg-emerald-600" />{" "}
                    Image Alt Text (for Google Images &amp; Screen Readers)
                  </h4>
                  <div className="bg-card border-border text-swiss-navy rounded-2xl border-2 p-5 text-sm font-medium transition-all group-hover:border-emerald-600/20">
                    {previewItem.altText}
                  </div>
                </div>
              )}

              {previewItem.tags && previewItem.tags.length > 0 && (
                <div>
                  <h4 className="mb-4 text-sm font-black tracking-widest text-neutral-700 uppercase">
                    AI-Generated Tags
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {previewItem.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="bg-background text-swiss-navy border-border rounded-xl border px-4 py-2 text-sm font-black tracking-tight uppercase transition-all"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {previewItem.lastError && (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
                  <div className="text-brand-accent mb-3 flex items-center gap-2 text-sm font-black tracking-widest uppercase">
                    <AlertTriangle size={14} /> Generation Error
                  </div>
                  <div className="text-brand-accent text-xs leading-relaxed font-medium">
                    {previewItem.lastError}
                  </div>
                </div>
              )}
            </div>

            <div className="border-border bg-background/50 flex justify-end border-t p-8">
              <Button
                variant="ghost"
                className="hover:text-swiss-navy text-sm font-black tracking-widest text-neutral-700 uppercase"
                onClick={() => setPreviewItem(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Client Batch Modal */}
      {isClientBatch && (
        <div
          className="bg-swiss-navy/40 animate-in fade-in fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm duration-300"
          role="dialog"
          aria-modal="true"
          aria-labelledby="seo-batch-title"
          onKeyDown={(e) => {
            if (e.key === "Escape" && !stopBatch) {
              setStopBatch(true);
              stopSignalRef.current = true;
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
            <div className="p-10">
              <h3
                id="seo-batch-title"
                className="text-swiss-navy mb-8 flex items-center gap-4 text-2xl font-black tracking-tight uppercase"
              >
                <Sparkles className="text-brand-accent animate-pulse" />{" "}
                Generating SEO...
              </h3>
              <div className="space-y-8">
                <div className="bg-background border-border flex items-center gap-6 rounded-3xl border p-6">
                  <div className="bg-card shadow-soft flex h-14 w-14 items-center justify-center rounded-2xl">
                    <RefreshCw
                      className="text-swiss-navy animate-spin"
                      size={24}
                    />
                  </div>
                  <div>
                    <div className="text-swiss-navy text-sm font-black tracking-widest uppercase">
                      AI Processing Items
                    </div>
                    <div className="mt-1 text-xs font-black tracking-widest text-neutral-700 uppercase">
                      Keep this tab open until complete
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-4 flex justify-between text-sm font-black tracking-widest text-neutral-700 uppercase">
                    <span>Progress</span>
                    <span className="text-swiss-navy">
                      {Math.round(
                        (clientBatchProgress.current /
                          clientBatchProgress.total) *
                          100
                      )}
                      %
                    </span>
                  </div>
                  <div className="bg-background flex h-4 overflow-hidden rounded-full ring-1 ring-slate-100">
                    <div
                      className="bg-swiss-navy h-full transition-all duration-700 ease-out"
                      style={{
                        width: `${((clientBatchProgress.current - clientBatchProgress.failed) / clientBatchProgress.total) * 100}%`,
                      }}
                    />
                    {clientBatchProgress.failed > 0 && (
                      <div
                        className="bg-brand-accent h-full transition-all duration-300 ease-out"
                        style={{
                          width: `${(clientBatchProgress.failed / clientBatchProgress.total) * 100}%`,
                        }}
                      />
                    )}
                  </div>
                  <div className="mt-4 flex justify-between text-xs font-black tracking-widest text-neutral-700 uppercase">
                    <span>Done: {clientBatchProgress.current}</span>
                    {clientBatchProgress.failed > 0 && (
                      <span className="text-brand-accent animate-pulse">
                        Failed: {clientBatchProgress.failed}
                      </span>
                    )}
                    <span>Total: {clientBatchProgress.total}</span>
                  </div>
                </div>

                <div className="border-border flex justify-end border-t pt-4">
                  {stopBatch ? (
                    <div className="text-brand-accent flex animate-pulse items-center gap-2 text-sm font-black tracking-widest uppercase">
                      <Ban size={16} /> Stopping after current item...
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setStopBatch(true);
                        stopSignalRef.current = true;
                      }}
                      icon={Ban}
                      className="hover:text-brand-accent text-sm font-black tracking-widest text-neutral-700 uppercase"
                    >
                      Stop
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sitemap Modal */}
      {showSitemapModal && (
        <div
          className="bg-swiss-navy/40 animate-in fade-in fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm duration-300"
          role="dialog"
          aria-modal="true"
          aria-labelledby="seo-sitemap-title"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setShowSitemapModal(false);
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
                  onClick={() => setShowSitemapModal(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* llms.txt Modal */}
      {showLlmModal && (
        <div
          className="bg-swiss-navy/40 animate-in fade-in fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm duration-300"
          role="dialog"
          aria-modal="true"
          aria-labelledby="seo-llm-title"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setShowLlmModal(false);
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
                onClick={() => setShowLlmModal(false)}
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
                onClick={() => setShowLlmModal(false)}
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
