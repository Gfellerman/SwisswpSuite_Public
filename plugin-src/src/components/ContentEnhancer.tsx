import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ContentBulkApplyResponse, ContentItem, ContentType } from "../types";
import { useTokenBalance } from "../hooks/useTokenBalance";
import { isProEdition } from "../lib/edition";
import {
  PenTool,
  Check,
  RefreshCw,
  Box,
  Play,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Loader,
  Search as SearchIcon,
  ExternalLink,
} from "lucide-react";

const ContentEnhancer: React.FC = () => {
  const queryClient = useQueryClient();
  // W3 — Token balance gate
  const { canAfford } = useTokenBalance();
  // Freemium Dual-Build (1B fix, defense-in-depth): this component is only
  // ever mounted by AIContentPage.tsx's isProEdition() branch, and the Free
  // build never even bundles this file (vite.config.ts aliases the whole
  // page away — see AIContentPage.freeStub.tsx). Guarded here anyway so
  // both auto-firing mount effects below (loadCategories, fetchItems) can
  // never hit the Pro-only /content* routes if this file is ever reached
  // some other way in the future.
  const isProEditionBuild = isProEdition();

  // Fix 4 (RB-308): Content Enhancer is scoped to WooCommerce Products only.
  // Posts, Pages, and Images are handled exclusively by the SEO tab.
  const [activeTab] = useState<ContentType>("product");
  const [activeField, setActiveField] = useState<
    "title" | "description" | "short_description"
  >("description");
  const [tone, setTone] = useState("Professional");
  const [instructions, setInstructions] = useState("");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Filters & Limits
  const [limit, setLimit] = useState(20);
  const [category, setCategory] = useState<string>("");
  const [status, setStatus] = useState<string>("all");
  const [categories, setCategories] = useState<any[]>([]);

  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState<number | null>(null);

  // Editable Proposals State
  // Map of ItemID -> Proposed Text
  const [editedProposals, setEditedProposals] = useState<{
    [key: number]: string;
  }>({});

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [isBulkApplying, setIsBulkApplying] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

  const { apiUrl, nonce } = window.swisswpsuiteData || {};

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // F-181 FIX: AbortController prevents unmounted state updates on tab change.
  useEffect(() => {
    const controller = new AbortController();
    const loadCategories = async () => {
      if (!isProEditionBuild || !apiUrl) return;
      try {
        const res = await fetch(
          `${apiUrl}/content/categories?type=${activeTab}`,
          {
            headers: { "X-WP-Nonce": nonce },
            signal: controller.signal,
          },
        );
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        console.error(e);
      }
    };
    loadCategories();
    setPage(1); // Reset page on tab change
    setCategory(""); // Reset category on tab change
    setEditedProposals({}); // Clear edits on tab change
    return () => controller.abort();
  }, [activeTab]);

  useEffect(() => {
    // Clear items immediately to prevent UI flicker/confusion when filter changes
    setItems([]);
    fetchItems();
  }, [activeTab, page, limit, category, status, debouncedSearch]);

  const fetchItems = async () => {
    // Freemium Dual-Build (1B, [6.2] fix): /content is Pro-only.
    if (!isProEditionBuild || !apiUrl) return;
    setLoading(true);
    try {
      let url = `${apiUrl}/content?type=${activeTab}&limit=${limit}&page=${page}`;
      if (category) url += `&category=${encodeURIComponent(category)}`;
      if (status !== "all") url += `&status=${encodeURIComponent(status)}`;
      if (debouncedSearch)
        url += `&search=${encodeURIComponent(debouncedSearch)}`;

      const res = await fetch(url, {
        headers: { "X-WP-Nonce": nonce },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.items) {
          setItems(data.items);
          setTotalPages(data.pages);
          setTotalItems(data.total);
        } else {
          setItems(data);
        }
        setSelectedIds([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRewrite = async (item: ContentItem) => {
    setGenerating(item.id);
    try {
      // All content types (including images) route to /content/rewrite.
      // The backend dispatches to the correct generation branch based on the
      // post_type stored in the DB — no client-side branching needed.
      // TODO(CE-01 D4): once the backend exposes a dedicated image-rewrite
      // endpoint, route here to POST /seo/generate/${item.id} and map
      // { data.alt_text, data.title } back to proposedTitle/proposedDescription.
      const res = await fetch(`${apiUrl}/content/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-WP-Nonce": nonce },
        body: JSON.stringify({ id: item.id, field: activeField, tone, instructions }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.rewritten) {
          // Update local state to show proposed value
          setItems((prev) =>
            prev.map((p) => {
              if (p.id !== item.id) return p;
              const update: any = {};
              if (activeField === "title")
                update.proposedTitle = data.rewritten;
              if (activeField === "description")
                update.proposedDescription = data.rewritten;
              if (activeField === "short_description")
                update.proposedShortDescription = data.rewritten;
              return { ...p, ...update };
            }),
          );
          // Also clear any manual edits for this item since we just regenerated
          setEditedProposals((prev) => {
            const newState = { ...prev };
            delete newState[item.id];
            return newState;
          });

          // Invalidate settings cache so the UI fetches fresh token balance
          queryClient.invalidateQueries({ queryKey: ["settings"] });
        } else {
          // Handle specific API error message
          toast.error("Rewrite failed: " + (data.message || "Unknown error"));
        }
      } else {
        // W3 — 402 token exhausted
        if (res.status === 402) {
          toast.error('Token balance exhausted. Purchase more tokens or upgrade your plan.');
          return;
        }
        const errData = await res.json().catch(() => ({}));
        toast.error(
          "Rewrite failed: " +
            ((errData as { message?: string }).message ||
              `Server error (${res.status})`),
        );
      }
    } catch (e) {
      console.error(e);
      toast.error("Network error. Please try again.");
    } finally {
      setGenerating(null);
    }
  };

  const handleApply = async (item: ContentItem) => {
    // Check if we have a manual edit, otherwise use the original proposal
    const manualEdit = editedProposals[item.id];
    const originalProposal = getProposedValue(item);
    const valueToApply =
      manualEdit !== undefined ? manualEdit : originalProposal;

    try {
      const res = await fetch(`${apiUrl}/content/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-WP-Nonce": nonce },
        body: JSON.stringify({
          id: item.id,
          field: activeField,
          value: valueToApply, // Pass the potentially edited value
        }),
      });

      if (res.ok) {
        toast.success("Applied successfully.");
        // Refresh to see updated content as "Current"
        fetchItems();
        // Clear edit state
        setEditedProposals((prev) => {
          const newState = { ...prev };
          delete newState[item.id];
          return newState;
        });
      } else {
        toast.error("Failed to apply — please try again.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to apply — please try again.");
    }
  };

  const handleRestore = (item: ContentItem) => {
    toast.warning("Revert this item to its previous state?", {
      action: {
        label: "Revert",
        onClick: () => doRestore(item),
      },
    });
  };

  const doRestore = async (item: ContentItem) => {
    try {
      const res = await fetch(`${apiUrl}/content/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-WP-Nonce": nonce },
        body: JSON.stringify({ id: item.id, field: activeField }),
      });
      if (res.ok) {
        fetchItems();
        toast.success("Item reverted successfully.");
      } else {
        toast.error("Revert failed. Please try again.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Network error. Please try again.");
    }
  };

  const handleBulkRewrite = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkProcessing(true);
    setBulkProgress({ current: 0, total: selectedIds.length });

    for (let i = 0; i < selectedIds.length; i++) {
      const id = selectedIds[i];
      const item = items.find((p) => p.id === id);
      if (item) {
        await handleRewrite(item);
      }
      setBulkProgress((prev) => ({ ...prev, current: i + 1 }));
    }
    setIsBulkProcessing(false);
    setSelectedIds([]);
  };

  const handleBulkApply = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkApplying(true);
    try {
      const idsWithEdits = selectedIds.filter(
        (id) => editedProposals[id] !== undefined,
      );
      const idsWithoutEdits = selectedIds.filter(
        (id) => editedProposals[id] === undefined,
      );

      let bulkApplied = 0;
      let bulkFailed: number[] = [];
      // CE-CAT5-002/CE-CAT13-003 FIX: ids the server explicitly could not act on
      // (no persisted AI proposal, or a malformed id) — previously these vanished
      // from the response and the toast reported a false "Applied N successfully".
      let bulkSkipped: ContentBulkApplyResponse["skipped_no_proposal"] = [];
      let bulkTotalReceived: number | undefined;
      let bulkTruncated = false;
      let bulkAccountingMismatch = false;

      if (idsWithoutEdits.length > 0) {
        const bulkRes = await fetch(`${apiUrl}/content/bulk-apply`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-WP-Nonce": nonce,
          },
          body: JSON.stringify({ ids: idsWithoutEdits, field: activeField }),
        });
        const bulkData: ContentBulkApplyResponse = await bulkRes.json();
        bulkApplied = bulkData.applied ?? 0;
        bulkFailed = bulkData.failed ?? [];
        bulkSkipped = bulkData.skipped_no_proposal ?? [];
        // PHP returns total_received (count before 100-item cap). If > 100, items were silently dropped.
        bulkTotalReceived = bulkData.total_received as number | undefined;
        bulkTruncated = (bulkTotalReceived ?? 0) > 100;
        // CE-CAT5-002/CE-CAT13-003 FIX: every id the server actually processed (the
        // capped set, not the pre-cap total_received) must land in exactly one of
        // applied/failed/skipped. If it doesn't, something changed server-side that
        // this frontend doesn't know how to categorize — never claim plain success.
        const processedCount = Math.min(bulkTotalReceived ?? idsWithoutEdits.length, 100);
        bulkAccountingMismatch =
          bulkApplied + bulkFailed.length + bulkSkipped.length !== processedCount;
      }

      // F-184 FIX: Per-promise .catch() prevents one network failure from rejecting
      // the entire batch. CE-005 FIX: Count actual successes, not idsWithEdits.length.
      const editResults = await Promise.all(
        idsWithEdits.map((id) =>
          fetch(`${apiUrl}/content/apply`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-WP-Nonce": nonce,
            },
            body: JSON.stringify({
              id,
              field: activeField,
              value: editedProposals[id],
            }),
          })
            .then((res) => (res.ok ? { ok: true } : { ok: false, id }))
            .catch((e) => ({ ok: false, id, error: (e as Error).message })),
        ),
      );
      const editApplied = editResults.filter((r) => r.ok).length;
      const editFailed = editResults.filter((r) => !r.ok);
      if (editFailed.length > 0) {
        bulkFailed = [
          ...bulkFailed,
          ...editFailed
            .filter((r): r is { ok: false; id: number } => "id" in r)
            .map((r) => r.id),
        ];
      }
      const totalApplied = bulkApplied + editApplied;

      const truncationNote = bulkTruncated
        ? ` (batch truncated — PHP cap of 100 applied; ${bulkTotalReceived} items were requested)`
        : "";
      // CE-CAT5-002/CE-CAT13-003 FIX: never report plain success when the server
      // skipped items or when applied+failed+skipped doesn't add up — say precisely
      // what happened instead of letting a partial batch look like a full success.
      if (bulkFailed.length > 0 || bulkSkipped.length > 0 || bulkAccountingMismatch) {
        const skippedNote =
          bulkSkipped.length > 0
            ? `, skipped ${bulkSkipped.length} (no proposal generated)`
            : "";
        const mismatchNote = bulkAccountingMismatch
          ? " — response accounting did not match items sent; please verify results manually"
          : "";
        toast.warning(
          `Applied ${totalApplied}${skippedNote}, failed ${bulkFailed.length}${truncationNote}${mismatchNote}`,
        );
      } else {
        toast.success(
          `Applied ${totalApplied} item${totalApplied !== 1 ? "s" : ""} successfully.${truncationNote}`,
        );
      }
      fetchItems();
    } catch (e) {
      console.error(e);
      toast.error("Bulk apply failed — please try again.");
    }
    setIsBulkApplying(false);
    setSelectedIds([]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) setSelectedIds([]);
    else setSelectedIds(items.map((i) => i.id));
  };

  const getProposedValue = (item: ContentItem) => {
    if (activeField === "title") return item.proposedTitle;
    if (activeField === "description") return item.proposedDescription;
    if (activeField === "short_description")
      return item.proposedShortDescription;
    return null;
  };

  const getCurrentValue = (item: ContentItem) => {
    if (activeField === "title") return item.name;
    // Use explicit separate fields from new API
    if (activeField === "short_description") return item.shortDescription;
    return item.description;
  };

  // Fix 4 (RB-308): Guard — if WooCommerce is not active, show the empty state.
  const hasWooCommerce = Boolean(window.swisswpsuiteData?.hasWooCommerce);

  if (!hasWooCommerce) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-foreground">
            Product Content Enhancer
          </h2>
          <p className="text-muted-foreground">
            Rewrite WooCommerce product titles and descriptions with tone control.
          </p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-12 text-center flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center">
            <Box size={32} className="text-purple-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black text-gray-900 dark:text-foreground">
              WooCommerce Not Active
            </h3>
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
              Content Enhancer is designed for WooCommerce products. Install and activate WooCommerce to rewrite product titles, descriptions, and short descriptions with AI-powered tone control.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              For posts, pages, and images, use the{" "}
              <strong>SEO tab</strong> — it handles all content types.
            </p>
          </div>
          <a
            href="https://wordpress.org/plugins/woocommerce/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-purple-700 transition-colors"
          >
            <ExternalLink size={16} /> Get WooCommerce
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-foreground">
            Product Content Enhancer
          </h2>
          <p className="text-muted-foreground">
            Rewrite WooCommerce product titles and descriptions with AI-powered tone control. Each rewrite uses a small number of AI tokens from your plan. For posts, pages, and images, see the <strong>SEO tab</strong>.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 w-full md:w-auto">
          <div className="bg-card p-3 rounded-xl shadow-sm border border-border flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search Bar */}
            <div className="relative">
              <SearchIcon
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 w-full md:w-48"
              />
            </div>

            <select
              value={activeField}
              onChange={(e) => setActiveField(e.target.value as any)}
              className="border border-border  rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none"
            >
              <option value="title">Product/Post Title</option>
              <option value="description">Description</option>
              <option value="short_description">Short Description</option>
            </select>

            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="border border-border  rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              title="Writing style the AI will use when rewriting your content"
              aria-label="Writing tone"
            >
              <option value="Professional">Professional</option>
              <option value="Technical">Technical</option>
              <option value="Persuasive">Persuasive</option>
              <option value="Casual">Casual</option>
              <option value="Fun">Fun & Witty</option>
              <option value="SEO Optimized">SEO Optimized</option>
            </select>

            <input
              type="text"
              placeholder="Extra instructions..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="border border-border  rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none w-40"
              title="Optional: guide the AI — e.g. 'mention free shipping' or 'keep it under 20 words'"
              aria-label="Extra instructions for the AI"
            />

            {/* Status Filter */}
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="border border-border  rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-background dark:bg-muted text-gray-700 dark:text-foreground"
            >
              <option value="all">All Status</option>
              <option value="enhanced">Enhanced (Pending)</option>
              <option value="not_enhanced">Not Enhanced</option>
            </select>

            {/* Category Filter */}
            {categories.length > 0 && (
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
                className="border border-border  rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-background dark:bg-muted text-gray-700 max-w-[150px]"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat.count})
                  </option>
                ))}
              </select>
            )}

            <div className="h-6 w-px bg-gray-300 mx-1 hidden md:block!"></div>

            {/* Bulk Actions */}
            {isBulkProcessing ? (
              <div className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                <RefreshCw size={16} className="animate-spin" />
                {bulkProgress.current}/{bulkProgress.total}
              </div>
            ) : (
              <button
                onClick={handleBulkRewrite}
                disabled={selectedIds.length === 0 || generating !== null}
                className="bg-purple-600 text-foreground dark:text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 transition"
                title="Generate AI rewrites for selected items (uses AI tokens). Results appear in the Proposed Change column for review before you apply them."
              >
                <Sparkles size={16} /> Rewrite ({selectedIds.length})
              </button>
            )}

            {isBulkApplying ? (
              <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                <Loader size={16} className="animate-spin" /> Applying...
              </div>
            ) : (
              <button
                onClick={handleBulkApply}
                disabled={selectedIds.length === 0}
                className="bg-green-600 text-foreground dark:text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 transition"
                title="Save the proposed changes to your site — overwrites the current content for selected items"
              >
                <Check size={16} /> Apply ({selectedIds.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* How-it-works hint */}
      <div className="px-1 py-2 text-xs text-muted-foreground leading-relaxed">
        <strong>How it works:</strong> Click <em>Rewrite</em> on any item to
        generate an AI proposal. Review and edit it in the Proposed Change
        column, then click <em>Apply</em> to save it to your site. You can undo
        any change with the <em>Undo</em> button while the original is still
        saved.
      </div>

      {/* Tab bar — products only (Fix 4 RB-308) */}
      <div className="flex gap-2 border-b border-border">
        <button
          className="px-4 py-2 text-sm font-medium rounded-t-lg flex items-center gap-2 bg-card border-b-2 border-purple-600 text-purple-600 shrink-0"
          aria-current="page"
        >
          <Box size={16} /> Products
        </button>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
            <Loader className="animate-spin text-purple-500" size={32} />
            <span>Loading content...</span>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-background border-b border-border">
              <tr>
                <th className="p-4 w-8">
                  <input
                    type="checkbox"
                    checked={
                      items.length > 0 && selectedIds.length === items.length
                    }
                    onChange={toggleSelectAll}
                    className="rounded border-border  text-purple-600 focus:ring-purple-500"
                  />
                </th>
                <th className="p-4 font-semibold text-gray-600 text-sm w-1/5">
                  Item
                </th>
                <th className="p-4 font-semibold text-gray-600 text-sm w-1/3">
                  Current {activeField.replace("_", " ")}
                </th>
                <th className="p-4 font-semibold text-gray-600 text-sm w-1/3">
                  Proposed Change (Editable)
                </th>
                <th className="p-4 font-semibold text-gray-600 text-sm text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => {
                const originalProposal = getProposedValue(item);
                const currentEdit = editedProposals[item.id];
                const displayValue =
                  currentEdit !== undefined
                    ? currentEdit
                    : originalProposal || "";

                return (
                  <tr key={item.id} className="hover:bg-background transition">
                    <td className="p-4 align-top">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => {
                          if (selectedIds.includes(item.id))
                            setSelectedIds(
                              selectedIds.filter((id) => id !== item.id),
                            );
                          else setSelectedIds([...selectedIds, item.id]);
                        }}
                        className="rounded border-border text-purple-600 focus:ring-purple-500"
                      />
                    </td>
                    <td className="p-4 align-top">
                      <div className="font-medium text-gray-900">
                        {item.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ID: {item.id}
                      </div>
                    </td>
                    <td className="p-4 align-top text-sm text-gray-600">
                      <div className="line-clamp-4 text-xs font-mono bg-background p-2 rounded">
                        {getCurrentValue(item) || (
                          <span className="italic text-muted-foreground">
                            Empty
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 align-top">
                      {originalProposal || displayValue ? (
                        <div className="relative">
                          <textarea
                            value={displayValue}
                            onChange={(e) =>
                              setEditedProposals((prev) => ({
                                ...prev,
                                [item.id]: e.target.value,
                              }))
                            }
                            className={`w-full text-sm p-2 rounded border focus:ring-2 focus:ring-purple-500 outline-none resize-y min-h-[100px]
                                                        ${currentEdit !== undefined ? "border-purple-300 bg-card" : "border-border bg-card text-slate-900"}`}
                          />
                          {currentEdit !== undefined && (
                            <div className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                              <PenTool size={10} /> Edited
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">
                          No proposal yet
                        </span>
                      )}
                    </td>
                    <td className="p-4 align-top text-right">
                      <div className="flex flex-col gap-2 items-end">
                        {originalProposal || currentEdit !== undefined ? (
                          <>
                            <button
                              onClick={() => handleApply(item)}
                              className="bg-green-600 text-foreground dark:text-foreground px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 w-full flex items-center justify-center gap-1"
                            >
                              <Check size={12} /> Apply
                            </button>
                            <button
                              onClick={() => handleRewrite(item)}
                              disabled={generating === item.id || !canAfford('content_enhancer')}
                              className="text-muted-foreground hover:text-purple-600 text-xs flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {generating === item.id ? (
                                <Loader className="animate-spin" size={12} />
                              ) : (
                                <RotateCcw size={12} />
                              )}
                              Regenerate
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleRewrite(item)}
                              disabled={generating === item.id || !canAfford('content_enhancer')}
                              className="bg-card border border-border text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-background w-full flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {generating === item.id ? (
                                <Loader className="animate-spin" size={12} />
                              ) : (
                                <Sparkles size={12} />
                              )}
                              Rewrite
                            </button>

                            {item.hasHistory && (
                              <button
                                onClick={() => handleRestore(item)}
                                className="text-xs text-muted-foreground hover:text-red-600 flex items-center justify-center gap-1 mt-1 w-full"
                                title="Revert to previous version"
                              >
                                <RotateCcw size={12} /> Undo
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-12 text-center text-muted-foreground"
                  >
                    No items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {!loading && items.length > 0 && (
          <div className="p-4 border-t border-border flex items-center justify-between bg-background">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                Showing {items.length} of {totalItems} items
              </span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="border border-border rounded px-2 py-1 text-xs focus:ring-1 focus:ring-purple-500 outline-none bg-card"
              >
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
                <option value={200}>200 per page</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1));
                  setSelectedIds([]);
                }}
                disabled={page === 1}
                className="p-2 rounded hover:bg-card border border-transparent hover:border-border disabled:opacity-50 disabled:cursor-not-allowed text-gray-600"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-medium text-gray-700">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => {
                  setPage((p) => Math.min(totalPages, p + 1));
                  setSelectedIds([]);
                }}
                disabled={page === totalPages}
                className="p-2 rounded hover:bg-card border border-transparent hover:border-border disabled:opacity-50 disabled:cursor-not-allowed text-gray-600"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentEnhancer;
