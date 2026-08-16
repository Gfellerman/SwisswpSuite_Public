/**
 * SeoAiWorkbench — the AI bulk SEO/meta-generation workbench (Pro-only
 * serviceware; physically excluded from the Free zip).
 *
 * Extracted out of components/SeoManager.tsx (2026-08-12, WP.org
 * frontend physical-exclusion sweep, follow-up to the geo/2FA/backup-
 * encryption fixes documented in docs/architecture/
 * FREEMIUM_DUAL_BUILD_ARCHITECTURE.md's 2026-08-12 amendment). Covers the
 * AI bulk-generate action buttons, the "How It Works" panel, the slow-batch
 * / background-queue / cron-blocked status banners, the tabs+filter bar,
 * the "rewrite titles" advanced option, the items table itself (per-item
 * Generate/FAQ/Preview/Restore actions + pagination), the item Preview
 * modal, and the client-side batch progress modal.
 *
 * `plugin/vite.config.ts` aliases the exact specifier
 * "./organisms/Seo/SeoAiWorkbench" (as written at SeoManager.tsx's one
 * call site) to a null-returning `.freeStub.tsx` in the Free build — see
 * that file's docblock and vite.config.ts's alias comment block for the
 * full mechanism writeup (identical to GeoLockdownCard.tsx).
 *
 * Fully self-contained: SeoManager.tsx (which must ship in Free — it also
 * owns the genuinely-free SEO Health Check / Sitemap / llms.txt features)
 * renders this component with ZERO props. Every value this component needs
 * (window.swisswpsuiteData, its own useTokenBalance() call) is read
 * directly, matching the parent's own pattern.
 *
 * Deliberately NOT shared with SeoManager.tsx (verified by grep across the
 * whole original file before this extraction — see
 * docs/capabilities/SEO_CAPABILITIES_REFERENCE.md for the audit detail):
 * `activeTab`, `bgQueue`, `rewriteTitles`, and every handler below are used
 * ONLY within this component's own boundary. The one place that DID cross
 * the boundary — the free SEO Health Check modal's per-category quick-fix
 * button, which used to call this file's `handleFastOptimizeAll` directly
 * — was itself extracted into a separate, independently-aliased
 * `SeoCategoryQuickFixButton.tsx` so SeoManager.tsx never needs to import
 * anything from this file.
 */
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { ContentItem, ContentType } from "../../../types";
import { useTokenBalance } from "../../../hooks/useTokenBalance";
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
  Eye,
  Search,
  Activity,
  MessageSquare,
  Clock,
} from "lucide-react";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { Badge } from "../../ui/Badge";

interface FaqItem {
  question: string;
  answer: string;
}

export function SeoAiWorkbench() {
  const { canAfford } = useTokenBalance();

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
  const [slowBatchJobId, setSlowBatchJobId] = useState<string | null>(null);
  const [groqBatchId, setGroqBatchId] = useState<string | null>(null);
  const [slowBatchStatus, setSlowBatchStatus] = useState<{
    total: number;
    completed: number;
    status?: string;
  } | null>(null);

  // Client Side Batch (Small Selections — tab must stay open)
  const [isClientBatch, setIsClientBatch] = useState(false);
  const [clientBatchProgress, setClientBatchProgress] = useState({
    current: 0,
    total: 0,
    failed: 0,
  });
  const [stopBatch, setStopBatch] = useState(false);

  // Background (server-side) queue state — tab-independent.
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

  const { apiUrl, nonce } = window.swisswpsuiteData || {};

  useEffect(() => {
    fetchItems();
  }, [activeTab, page, showUnoptimized, limit]);

  // Keep bgQueueRef in sync so the poll closure always reads the live value
  useEffect(() => {
    bgQueueRef.current = bgQueue;
  }, [bgQueue]);

  // Poll background queue status when active
  useEffect(() => {
    const controller = new AbortController();

    const pollBgStatus = async () => {
      if (!apiUrl) return;
      try {
        const res = await fetch(`${apiUrl}/seo/background-status`, {
          headers: { "X-WP-Nonce": nonce },
          signal: controller.signal,
        });
        if (!res.ok) {
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
                toast.warning(
                  `SEO processing paused due to server load. Retrying in ${Math.round(retryMs / 1000)} seconds.`,
                  { id: "seo-rate-limited" }
                );
              }
            } catch {
              // Non-JSON or read error — fall back to header or default
            }
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
          if (bgPollRef.current) clearInterval(bgPollRef.current);
          setBgQueue(null);
          toast.success("SEO generation complete!");
          fetchItemsRef.current();
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const msg = err instanceof Error ? err.message : "Network error";
        console.warn("[SEO Poll]", msg);
        setPollError(`SEO background status check failed: ${msg}`);
      }
    };

    pollBgStatus();
    bgPollRef.current = setInterval(pollBgStatus, 10000);
    return () => {
      controller.abort();
      if (bgPollRef.current) clearInterval(bgPollRef.current);
    };
  }, [apiUrl, nonce]);

  const SLOW_BATCH_STORAGE_KEY = "swisswpsuite_seo_slow_batch";

  // Resume-on-mount effect — hydrates state from localStorage if a job
  // was started in a previous session and is less than 24 hours old.
  useEffect(() => {
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
        localStorage.removeItem(SLOW_BATCH_STORAGE_KEY);
        if (import.meta.env.DEV) {
          console.log(
            "[SEO SlowBatch] Stale persisted job cleared (>24h old)."
          );
        }
        return;
      }
      setSlowBatchJobId(persisted.job_id);
      setGroqBatchId(persisted.groq_batch_id);
      setSlowBatchInProgress(true);
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

  // Poll slow batch (Groq Batch API) status when job ID is set.
  useEffect(() => {
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
          if (
            job.status === "completed" ||
            job.status === "failed" ||
            job.status === "expired"
          ) {
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

  const fetchItems = async () => {
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

  useEffect(() => {
    fetchItemsRef.current = fetchItems;
  }, [fetchItems]);

  const handleTabChange = (tab: ContentType) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setPage(1);
    setSelectedIds([]);
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
        // WP.org string census closure (2026-08-13, v2.9.33.18, R2b): neutral
        // wording — no "Pro"/"upgrade"/"plan"/"purchase".
        if (res.status === 402) {
          toast.error("Not enough AI tokens for this action.");
          return;
        }
        throw new Error(err.message || "Server error");
      }

      const json = await res.json();
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

  const handleFastOptimizeAll = async (
    typeOverride?: ContentType,
    options?: { skipConfirm?: boolean }
  ) => {
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
    if (!apiUrl) return;
    if (!pendingSlowOptimizeAll) {
      setPendingSlowOptimizeAll(true);
      toast.error(
        "This will queue ALL unoptimized content for overnight AI processing — results appear within 24 hours and use 50% fewer AI tokens than instant generation. Click again to confirm."
      );
      return;
    }
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
          console.warn(`Rate Limit Hit for ID ${id}. Pausing 65s...`);
          await sleep(65000);
          retries++;
          continue;
        }

        if (res.status >= 500) {
          if (retries < MAX_RETRIES) {
            const backoff = retries === 0 ? 1000 : 3000;
            console.warn(
              `Server error ${res.status} for ID ${id}. Retrying in ${backoff}ms (attempt ${retries + 1}/${MAX_RETRIES})`
            );
            await sleep(backoff);
            retries++;
            continue;
          } else {
            throw new Error(
              `Server error ${res.status} after ${MAX_RETRIES} retries`
            );
          }
        }

        if (res.status >= 400 && res.status < 500) {
          throw new Error(`Client error ${res.status} — will not retry`);
        }

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();
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
                console.error(`FAQ generation error for post ${id}:`, err);
              });
          }
        } else {
          throw new Error(
            json.message ||
              "AI returned a response but no usable content was generated. This item will not be retried automatically."
          );
        }
      } catch (e) {
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
    <>
      {/* One-time dismissible poll error banner */}
      {pollError && (
        <div
          className="mb-8 flex items-center justify-between gap-4 rounded-xl border border-amber-400/30 bg-amber-50 px-5 py-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
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

      {/* AI bulk-generate action buttons — moved here (2026-08-12) from
          SectionHeader's action slot in SeoManager.tsx. Minor, deliberate
          visual reflow: previously wrapped inline alongside the free
          Health Check / Sitemap / AI Assistant Guide buttons in the page
          header; now its own row at the top of this panel. Documented in
          docs/capabilities/SEO_CAPABILITIES_REFERENCE.md. */}
      <div className="mb-8 flex flex-wrap gap-4">
        {selectedIds.length > 0 ? (
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
        )}
      </div>

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
              that appears in Google search results — no manual writing needed.
              Each item uses a small number of AI tokens from your plan.
              {activeTab === "image" &&
                " For images, AI looks at the image and writes a description (alt text) that helps Google Image Search and improves accessibility for screen readers."}
            </p>
          </div>
        </div>
      </div>

      {/* Slow Batch In Progress Banner (Groq Batch API — 24h) */}
      {slowBatchInProgress && (
        <div
          className="glass-panel mt-8 rounded-[2rem] border border-emerald-200/60 bg-emerald-50/40 p-6"
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
              {slowBatchStatus && slowBatchStatus.total > 0 ? (
                <div>
                  <p className="mb-2 text-xs leading-relaxed font-medium text-emerald-700">
                    Processing {slowBatchStatus.completed} of{" "}
                    {slowBatchStatus.total} items
                    {slowBatchStatus.status && ` — ${slowBatchStatus.status}`}
                  </p>
                  <div className="h-2 w-full rounded-full bg-emerald-200/50">
                    <div
                      className="h-2 rounded-full bg-emerald-600 transition-all duration-500"
                      style={{
                        width: `${Math.round((slowBatchStatus.completed / slowBatchStatus.total) * 100)}%`,
                      }}
                    />
                  </div>
                  {groqBatchId && (
                    <p className="mt-1.5 font-mono text-xs text-neutral-400">
                      AI batch: {groqBatchId}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs leading-relaxed font-medium text-emerald-700">
                  Your content is queued for overnight AI processing &mdash; SEO
                  titles and descriptions will appear automatically within 24
                  hours. Uses 50% fewer AI tokens than instant generation. You
                  can safely close this tab.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cron-blocked warning — shown when DISABLE_WP_CRON is active */}
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
              processed via inline fallback on every REST poll (~3 items per 10
              seconds). This is slower than server-side cron. For faster
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
          className="glass-panel mt-8 rounded-[2rem] border border-blue-200/60 bg-blue-50/40 p-6"
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
      <div className="border-border mt-8 flex min-w-0 flex-col items-center justify-between gap-8 border-b pb-8 md:flex-row">
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

      <div className="glass-panel mt-8 rounded-[2rem] border-orange-100/50 bg-orange-50/30 p-8">
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
                Warning: this permanently changes the product title stored in
                your database.
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
                {rewriteTitles ? "Title Rewriting On" : "Title Rewriting Off"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Card
        noPadding
        className="mt-8 overflow-visible border-none bg-transparent shadow-none"
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
                              else setSelectedIds([...selectedIds, item.id]);
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
                                  item.metaDescription ||
                                  "No description yet — click Generate SEO."}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="w-1/6 px-6 py-6 align-top">
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
                              <Bot size={10} className="text-swiss-navy" /> AI
                              Summary for Search &amp; AI Assistants
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
                Showing <span className="text-swiss-navy">{items.length}</span>{" "}
                of <span className="text-swiss-navy">{totalItems}</span>
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
    </>
  );
}
