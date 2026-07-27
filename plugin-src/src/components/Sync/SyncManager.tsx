import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Save,
  Trash2,
  Clock,
  Link as LinkIcon,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Plus,
  Copy,
  Eye,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type {
  SyncConnection,
  SyncSchedule,
  SentinelJobStatus,
  SyncItem,
  SyncItemType,
  SyncCapsule,
  SyncCapsulePayload,
  SyncInspectResult,
} from "../../types";

const SyncManager: React.FC = () => {
  const [view, setView] = useState<
    "push" | "connections" | "schedules" | "target"
  >("push");

  // Data
  const [connections, setConnections] = useState<SyncConnection[]>([]);
  const [schedules, setSchedules] = useState<SyncSchedule[]>([]);
  const [activeConnectionId, setActiveConnectionId] = useState<string>("");
  const [localKey, setLocalKey] = useState("");
  const [logs, setLogs] = useState<string[]>([]);

  // Push State
  const [items, setItems] = useState<SyncItem[]>([]);
  const [typeFilter, setTypeFilter] = useState<SyncItemType | "all">("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [diffResults, setDiffResults] = useState<Record<number, string>>({});
  const [isPushing, setIsPushing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pull State
  const [selectedPullIds, setSelectedPullIds] = useState<number[]>([]);
  const [isPulling, setIsPulling] = useState(false);

  // Inspect / Diff State
  const [inspectItem, setInspectItem] = useState<SyncItem | null>(null);
  const [inspectData, setInspectData] = useState<{
    local: SyncCapsule;
    remote: SyncCapsule;
  } | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);

  // Raw Meta Diff State
  const [metaDiff, setMetaDiff] = useState<{
    diff: Array<{
      key: string;
      local: string[];
      remote: string[];
      in_sync_scope: boolean;
    }>;
    only_local: string[];
    only_remote: string[];
    identical_count: number;
    diff_count: number;
  } | null>(null);
  const [isLoadingMetaDiff, setIsLoadingMetaDiff] = useState(false);

  // Initial Load
  useEffect(() => {
    fetchLocalKey();
    fetchConnections();
    fetchSchedules();
    fetchItems();
  }, []);

  // Finding #13: Reset diff/selection state when active connection changes.
  // The dropdown onChange already resets isConnected and diffResults, but this
  // useEffect ensures selectedIds, selectedPullIds, and inspect state are also
  // cleaned up — preventing stale selections from a previous connection.
  useEffect(() => {
    setIsConnected(false);
    setDiffResults({});
    setSelectedIds([]);
    setSelectedPullIds([]);
    setInspectItem(null);
    setInspectData(null);
    setMetaDiff(null);
  }, [activeConnectionId]);

  // Auto-refresh sentinel status every 15s while on schedules tab
  useEffect(() => {
    if (view !== "schedules") return;
    const interval = setInterval(fetchSchedules, 15000);
    return () => clearInterval(interval);
  }, [view]);

  // Diff modal — ref, trigger-return ref, escape key handler, focus trap
  // (all hooks must live at component top level — React rules of hooks)
  const diffModalRef = useRef<HTMLDivElement>(null);
  // WCAG 2.4.3 — save the element that opened the dialog so focus can return on close
  const diffTriggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!inspectItem) return;

    // Move focus into the dialog on open (programmatic focus only — outline-none on container is safe here)
    diffModalRef.current?.focus();

    // WCAG 2.1 SC 2.1.1 / APG Dialog Pattern — Escape closes the dialog
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setInspectItem(null);
        setInspectData(null);
        setMetaDiff(null);
      }

      // WCAG 2.1 SC 2.1.2 — focus trap: cycle Tab / Shift+Tab within the dialog
      if (e.key === "Tab") {
        const modal = diffModalRef.current;
        if (!modal) return;

        const FOCUSABLE =
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
        const focusable = Array.from(
          modal.querySelectorAll<HTMLElement>(FOCUSABLE)
        ).filter((el) => !el.closest("[aria-hidden='true']"));

        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          // Shift+Tab: if focus is on first focusable, wrap to last
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          // Tab: if focus is on last focusable, wrap to first
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [inspectItem]);

  // WCAG 2.4.3 — return focus to trigger on modal close
  useEffect(() => {
    if (!inspectItem && diffTriggerRef.current) {
      diffTriggerRef.current.focus();
      diffTriggerRef.current = null;
    }
  }, [inspectItem]);

  const nonce = window.swisswpsuiteData?.nonce;
  // Finding #3: Use dynamic API URL instead of hardcoded /wp-json/ paths.
  // This fixes subdirectory WP installations where wp-json is not at the root.
  const apiUrl = (
    window.swisswpsuiteData?.apiUrl ?? "/wp-json/swisswpsuite/v1"
  ).replace(/\/$/, "");

  const fetchLocalKey = async () => {
    const res = await fetch(`${apiUrl}/sync/key`, {
      headers: { "X-WP-Nonce": nonce },
    });
    const data = await res.json();
    if (data.key) setLocalKey(data.key);
  };

  const fetchConnections = async () => {
    const res = await fetch(`${apiUrl}/sync/connections`, {
      headers: { "X-WP-Nonce": nonce },
    });
    const data = await res.json();
    if (data.connections) {
      setConnections(data.connections);
      if (data.connections.length > 0 && !activeConnectionId) {
        setActiveConnectionId(data.connections[0].id);
      }
    }
  };

  const fetchSchedules = async () => {
    const res = await fetch(`${apiUrl}/sync/schedules`, {
      headers: { "X-WP-Nonce": nonce },
    });
    const data = await res.json();
    if (data.schedules) setSchedules(data.schedules);
  };

  const fetchItems = async (): Promise<SyncItem[]> => {
    const [resAll, resTpl] = await Promise.allSettled([
      fetch(`${apiUrl}/content?type=all&limit=500`, {
        headers: { "X-WP-Nonce": nonce },
      }),
      fetch(`${apiUrl}/content?type=template&limit=100`, {
        headers: { "X-WP-Nonce": nonce },
      }),
    ]);

    const loaded: SyncItem[] = [];

    if (resAll.status === "fulfilled" && resAll.value.ok) {
      const data = await resAll.value.json();
      loaded.push(...(data.items ?? []));
    } else {
      toast.error("Failed to load posts and pages.");
    }

    if (resTpl.status === "fulfilled" && resTpl.value.ok) {
      const data = await resTpl.value.json();
      loaded.push(...(data.items ?? []));
    } else {
      // Templates are bonus content — warn but don't block
      toast.error("Failed to load FSE templates. Check plugin logs.");
    }

    setItems(loaded);
    return loaded;
  };

  // --- Actions ---

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const payload = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      url: (form.elements.namedItem("url") as HTMLInputElement).value,
      key: (form.elements.namedItem("key") as HTMLInputElement).value,
    };

    const res = await fetch(`${apiUrl}/sync/connections`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-WP-Nonce": nonce },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      setConnections([...connections, data.connection]);
      form.reset();
      toast.success("Connection Saved!");
    } else {
      toast.error(data.message || "Failed to save connection.");
    }
  };

  const doDeleteConnection = async (id: string) => {
    await fetch(`${apiUrl}/sync/connections/${id}`, {
      method: "DELETE",
      headers: { "X-WP-Nonce": nonce },
    });
    setConnections(connections.filter((c) => c.id !== id));
  };

  const handleDeleteConnection = (id: string) => {
    toast.warning("Are you sure?", {
      action: {
        label: "Delete",
        onClick: () => doDeleteConnection(id),
      },
    });
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    // Finding #7: Separate Products, Posts, and Pages into individual checkboxes.
    // Previously "Products" silently included posts, and pages were impossible to schedule.
    const scope: string[] = [];
    if ((form.elements.namedItem("scope_products") as HTMLInputElement).checked)
      scope.push("products");
    if ((form.elements.namedItem("scope_posts") as HTMLInputElement).checked)
      scope.push("posts");
    if ((form.elements.namedItem("scope_pages") as HTMLInputElement).checked)
      scope.push("pages");
    if ((form.elements.namedItem("scope_settings") as HTMLInputElement).checked)
      scope.push("settings");

    const payload = {
      connection_id: (
        form.elements.namedItem("connection_id") as HTMLSelectElement
      ).value,
      frequency: (form.elements.namedItem("frequency") as HTMLSelectElement)
        .value,
      scope,
    };

    const res = await fetch(`${apiUrl}/sync/schedules`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-WP-Nonce": nonce },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      setSchedules([...schedules, data.job]);
      form.reset();
      toast.success("Schedule Created!");
    }
  };

  const doDeleteSchedule = async (id: string) => {
    await fetch(`${apiUrl}/sync/schedules/${id}`, {
      method: "DELETE",
      headers: { "X-WP-Nonce": nonce },
    });
    setSchedules(schedules.filter((s) => s.id !== id));
  };

  const handleDeleteSchedule = (id: string) => {
    toast.warning("Stop this job?", {
      action: {
        label: "Stop",
        onClick: () => doDeleteSchedule(id),
      },
    });
  };

  const handleConnect = async () => {
    const conn = connections.find((c) => c.id === activeConnectionId);
    if (!conn) return;

    setLogs((prev) => [`Connecting to ${conn.name}...`, ...prev]);

    try {
      // SYNC-2: Send connection_id only — PHP resolves url + key server-side.
      // Key is no longer sent from the browser (was visible in DevTools, extractable via XSS).
      const res = await fetch(`${apiUrl}/sync/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-WP-Nonce": nonce },
        body: JSON.stringify({ connection_id: conn.id, url: conn.url }),
      });
      const data = await res.json();

      if (data.success) {
        setIsConnected(true);
        setLogs((prev) => [`✅ Connected to ${data.data.site_name}`, ...prev]);
        // Guard against stale closure: if items haven't loaded yet (race condition
        // where fetchConnections() resolved before fetchItems()), fetch them now.
        const effectiveItems = items.length > 0 ? items : await fetchItems();
        fetchDiff(conn, effectiveItems);
      } else {
        toast.error(data.message || "Connection failed.");
        setLogs((prev) => [`❌ Failed: ${data.message}`, ...prev]);
      }
    } catch (e) {
      toast.error("Network error — could not reach the remote site.");
      setLogs((prev) => [`❌ Network Error`, ...prev]);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setLogs((prev) => [`🔄 Refreshing...`, ...prev]);
    const loadedItems = await fetchItems();
    if (isConnected) {
      const conn = connections.find((c) => c.id === activeConnectionId);
      if (conn) await fetchDiff(conn, loadedItems);
    }
    setIsRefreshing(false);
    setLogs((prev) => [`✅ Refreshed`, ...prev]);
  };

  const fetchDiff = async (conn: any, itemList?: SyncItem[]) => {
    if (!conn) return;
    const toCompare = itemList ?? items;
    const diffItems = toCompare.map((i) => {
      const entry: Record<string, unknown> = {
        id: i.id,
        modified: i.modified ?? "1970-01-01 00:00:00",
        type: i.type,
      };
      if (i.type === "template" && i.slug) entry.slug = i.slug;
      return entry;
    });
    if (!diffItems.length) return;

    // Finding #9: Clear stale diff results before fetching new ones.
    setDiffResults({});

    try {
      // SYNC-2: Send connection_id only — PHP resolves key server-side.
      const res = await fetch(`${apiUrl}/sync/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-WP-Nonce": nonce },
        body: JSON.stringify({
          connection_id: conn.id,
          url: conn.url,
          items: diffItems,
        }),
      });
      // Finding #9: Check response status before parsing JSON.
      if (!res.ok) {
        toast.error(`Diff comparison failed (HTTP ${res.status}).`);
        return;
      }
      const data = await res.json();
      if (data.success && data.results) {
        setDiffResults(data.results);
        setLogs((prev) => [`Diff Updated`, ...prev]);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to compare content with the remote site.");
    }
  };

  const doPush = async () => {
    const conn = connections.find((c) => c.id === activeConnectionId);
    if (!conn || !isConnected) return;

    setIsPushing(true);
    setLogs((prev) => [`🚀 Starting push...`, ...prev]);

    let pushedCount = 0;
    for (const id of selectedIds) {
      try {
        // SYNC-2: Send connection_id only — PHP resolves key server-side.
        const res = await fetch(`${apiUrl}/sync/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-WP-Nonce": nonce },
          body: JSON.stringify({ connection_id: conn.id, url: conn.url, id }),
        });
        const data = await res.json();
        if (data.success) {
          pushedCount++;
          setLogs((prev) => [`✅ Pushed #${id}`, ...prev]);
        } else {
          setLogs((prev) => [`❌ Failed #${id}: ${data.message}`, ...prev]);
        }
      } catch (e) {
        setLogs((prev) => [`❌ Error #${id}`, ...prev]);
      }
    }
    setIsPushing(false);
    const failedCount = selectedIds.length - pushedCount;
    if (pushedCount > 0) {
      toast.success(
        `Pushed ${pushedCount} item${pushedCount !== 1 ? "s" : ""} successfully.${failedCount > 0 ? ` ${failedCount} failed.` : ""}`
      );
      // SYNC-6: Fetch fresh items first, then pass result to fetchDiff to avoid stale closure.
      // Previously fetchDiff(conn) read from the stale `items` closure — items created/deleted
      // during the push would be missed. Pattern mirrors handleRefresh() at lines 316-326.
      const freshItems = await fetchItems();
      fetchDiff(conn, freshItems);
    } else {
      toast.error(
        `All ${selectedIds.length} push attempts failed. Check the activity log for details.`
      );
    }
  };

  const handlePush = () => {
    const hasConflicts = selectedIds.some(
      (id) => diffResults[id] === "conflict"
    );
    toast.warning(
      `Send ${selectedIds.length} item${selectedIds.length !== 1 ? "s" : ""} to the other site?${hasConflicts ? " This includes conflicts — your local version will overwrite the remote." : ""}`,
      {
        action: {
          label: "Send",
          onClick: () => doPush(),
        },
      }
    );
  };

  const doPull = async () => {
    const conn = connections.find((c) => c.id === activeConnectionId);
    if (!conn || !isConnected || selectedPullIds.length === 0) return;

    setIsPulling(true);
    setLogs((prev) => [`⬇️ Starting pull...`, ...prev]);

    let pulledCount = 0;
    for (const id of selectedPullIds) {
      try {
        // SYNC-2: Send connection_id only — PHP resolves key server-side.
        const res = await fetch(`${apiUrl}/sync/pull`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-WP-Nonce": nonce },
          body: JSON.stringify({ connection_id: conn.id, url: conn.url, id }),
        });
        const data = await res.json();
        if (data.success) {
          pulledCount++;
          setLogs((prev) => [`✅ Pulled #${id}`, ...prev]);
        } else {
          setLogs((prev) => [
            `❌ Failed pull #${id}: ${data.message}`,
            ...prev,
          ]);
        }
      } catch (e) {
        setLogs((prev) => [`❌ Failed pull #${id}: Network error`, ...prev]);
      }
    }

    setIsPulling(false);
    const failedCount = selectedPullIds.length - pulledCount;
    if (pulledCount > 0) {
      toast.success(
        `Pulled ${pulledCount} item${pulledCount !== 1 ? "s" : ""} successfully.${failedCount > 0 ? ` ${failedCount} failed.` : ""}`
      );
    } else {
      toast.error(
        `All ${selectedPullIds.length} pull attempts failed. Check the activity log for details.`
      );
    }
    // SYNC-6: Fetch fresh items first, then pass result to fetchDiff to avoid stale closure.
    // Previously fetchDiff(conn) read stale `items` state — pulled posts would not appear.
    const freshItems = await fetchItems();
    fetchDiff(conn, freshItems);
  };

  const handlePull = () => {
    toast.warning(
      `Bring ${selectedPullIds.length} item${selectedPullIds.length !== 1 ? "s" : ""} from the other site? This will overwrite your local content.`,
      {
        action: {
          label: "Bring",
          onClick: () => doPull(),
        },
      }
    );
  };

  const generateLocalKey = async () => {
    const res = await fetch(`${apiUrl}/sync/key`, {
      method: "POST",
      headers: { "X-WP-Nonce": nonce },
    });
    const data = await res.json();
    if (data.key) setLocalKey(data.key);
  };

  const handleInspect = useCallback(
    async (item: SyncItem) => {
      const conn = connections.find((c) => c.id === activeConnectionId);
      if (!conn) return;

      // WCAG 2.4.3 — save the trigger so focus can return to it when the modal closes
      diffTriggerRef.current = document.activeElement as HTMLElement;

      setInspectItem(item);
      setInspectData(null);
      setIsInspecting(true);

      try {
        // SYNC-2: Send connection_id only — PHP resolves key server-side.
        const res = await fetch(`${apiUrl}/sync/inspect`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-WP-Nonce": nonce },
          body: JSON.stringify({
            connection_id: conn.id,
            url: conn.url,
            id: item.id,
          }),
        });
        const data: SyncInspectResult = await res.json();
        if (data.success) {
          setInspectData({ local: data.local, remote: data.remote });
        } else {
          toast.error("Failed to load diff data.");
          setInspectItem(null);
        }
      } catch {
        toast.error("Network error while loading diff.");
        setInspectItem(null);
      } finally {
        setIsInspecting(false);
      }
    },
    [connections, activeConnectionId, nonce]
  );

  const handleMetaDiff = useCallback(async () => {
    const conn = connections.find((c) => c.id === activeConnectionId);
    if (!conn || !inspectItem) return;
    setIsLoadingMetaDiff(true);
    setMetaDiff(null);
    try {
      // SYNC-2: Send connection_id only — PHP resolves key server-side.
      const res = await fetch(`${apiUrl}/sync/meta-diff`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-WP-Nonce": nonce },
        body: JSON.stringify({
          connection_id: conn.id,
          url: conn.url,
          id: inspectItem.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMetaDiff(data);
      } else {
        toast.error(data.message || "Raw meta diff failed.");
      }
    } catch {
      toast.error("Network error loading raw meta diff.");
    } finally {
      setIsLoadingMetaDiff(false);
    }
  }, [connections, activeConnectionId, inspectItem, nonce]);

  const getSentinelBadge = (status: SentinelJobStatus) => {
    switch (status) {
      case "running":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500"
            ></span>
            Running
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
            <Clock aria-hidden="true" size={10} />
            Pending
          </span>
        );
      case "stalled":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
            <AlertTriangle aria-hidden="true" size={10} />
            Stalled
          </span>
        );
      case "abandoned":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            <AlertTriangle aria-hidden="true" size={10} />
            Abandoned
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            Idle
          </span>
        );
    }
  };

  const filteredItems =
    typeFilter === "all" ? items : items.filter((i) => i.type === typeFilter);

  const TYPE_FILTER_OPTIONS: { label: string; value: SyncItemType | "all" }[] =
    [
      { label: "All", value: "all" },
      { label: "Posts", value: "post" },
      { label: "Pages", value: "page" },
      { label: "Products", value: "product" },
      { label: "Design Templates", value: "template" },
    ];

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "post":
        return (
          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700 capitalize">
            Post
          </span>
        );
      case "page":
        return (
          <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700 capitalize">
            Page
          </span>
        );
      case "product":
        return (
          <span className="rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-700 capitalize">
            Product
          </span>
        );
      case "template":
        return (
          <span className="rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-700 capitalize">
            Template
          </span>
        );
      default:
        return (
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 capitalize">
            {type}
          </span>
        );
    }
  };

  // --- Diff Modal ---

  const renderDiffModal = () => {
    const titleId = "diff-modal-title";

    const CORE_FIELDS: {
      key: keyof SyncCapsulePayload;
      label: string;
      format?: (v: string) => string;
    }[] = [
      { key: "post_title", label: "Title" },
      { key: "post_status", label: "Status" },
      { key: "post_name", label: "Slug" },
      { key: "post_modified_gmt", label: "Modified (GMT)" },
      { key: "post_excerpt", label: "Excerpt" },
      { key: "post_parent", label: "Parent ID" },
      { key: "menu_order", label: "Menu Order" },
      {
        key: "post_content",
        label: "Content",
        format: (v: string) => `${v.length.toLocaleString()} chars`,
      },
    ];

    const localCapsule = inspectData?.local;
    const remoteCapsule = inspectData?.remote;
    const local = localCapsule?.payload;
    const remote = remoteCapsule?.payload;

    const diffRows =
      local && remote
        ? CORE_FIELDS.map((f) => {
            const lv = String(local[f.key] ?? "");
            const rv = String(remote[f.key] ?? "");
            const differs = lv !== rv;
            const display = (v: string) =>
              f.format
                ? f.format(v)
                : v || <span className="text-muted-foreground italic">—</span>;
            return {
              label: f.label,
              local: display(lv),
              remote: display(rv),
              differs,
            };
          })
        : [];

    // Meta keys that differ
    const diffMetaRows: {
      key: string;
      local: React.ReactNode;
      remote: React.ReactNode;
    }[] = [];
    if (local && remote) {
      const allMetaKeys = new Set([
        ...Object.keys(local.meta_input ?? {}),
        ...Object.keys(remote.meta_input ?? {}),
      ]);
      allMetaKeys.forEach((k) => {
        const lv = JSON.stringify((local.meta_input ?? {})[k] ?? null);
        const rv = JSON.stringify((remote.meta_input ?? {})[k] ?? null);
        if (lv !== rv) {
          diffMetaRows.push({
            key: k,
            local: (local.meta_input ?? {})[k] ? (
              JSON.stringify((local.meta_input ?? {})[k])
            ) : (
              <span className="text-muted-foreground italic">(absent)</span>
            ),
            remote: (remote.meta_input ?? {})[k] ? (
              JSON.stringify((remote.meta_input ?? {})[k])
            ) : (
              <span className="text-muted-foreground italic">(absent)</span>
            ),
          });
        }
      });
    }

    // Taxonomy rows that differ
    const diffTaxRows: {
      key: string;
      local: React.ReactNode;
      remote: React.ReactNode;
    }[] = [];
    if (local && remote) {
      const allTaxKeys = new Set([
        ...Object.keys(local.tax_input ?? {}),
        ...Object.keys(remote.tax_input ?? {}),
      ]);
      allTaxKeys.forEach((k) => {
        const lv = JSON.stringify(
          ((local.tax_input ?? {})[k] ?? []).slice().sort()
        );
        const rv = JSON.stringify(
          ((remote.tax_input ?? {})[k] ?? []).slice().sort()
        );
        if (lv !== rv) {
          diffTaxRows.push({
            key: k,
            local: (local.tax_input ?? {})[k] ? (
              (local.tax_input ?? {})[k].join(", ")
            ) : (
              <span className="text-muted-foreground italic">(absent)</span>
            ),
            remote: (remote.tax_input ?? {})[k] ? (
              (remote.tax_input ?? {})[k].join(", ")
            ) : (
              <span className="text-muted-foreground italic">(absent)</span>
            ),
          });
        }
      });
    }

    const identicalCount =
      local && remote
        ? CORE_FIELDS.filter(
            (f) => String(local[f.key] ?? "") === String(remote[f.key] ?? "")
          ).length
        : 0;

    const closeModal = () => {
      setInspectItem(null);
      setInspectData(null);
      setMetaDiff(null);
    };

    // Backdrop is a visual scrim only. No aria-label — a plain div with no role
    // should not be labelled (WCAG 4.1.2). aria-hidden omitted because this element
    // is an ancestor of role="dialog" — hiding it would conceal the dialog from AT.
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeModal();
        }}
      >
        <div
          ref={diffModalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          // SYNC-A11Y-1 FIX: Add aria-describedby for screen reader context.
          aria-describedby={`${titleId}-desc`}
          tabIndex={-1}
          className="bg-card border-border mx-4 max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-xl border shadow-xl outline-none"
        >
          {/* Header */}
          <div className="border-border bg-card sticky top-0 z-10 flex items-center justify-between border-b p-4">
            <h2 id={titleId} className="text-base font-semibold text-gray-900">
              Diff: &ldquo;{inspectItem?.name}&rdquo; (#{inspectItem?.id})
            </h2>
            <button
              onClick={closeModal}
              aria-label="Close diff viewer"
              className="rounded p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          {/* SYNC-A11Y-1: Hidden description for aria-describedby */}
          <p id={`${titleId}-desc`} className="sr-only">
            Compare local and remote content versions side by side. Review
            differences before syncing.
          </p>

          {/* Loading */}
          {isInspecting && (
            <div className="text-muted-foreground flex items-center justify-center gap-3 py-16">
              <Loader2 size={20} className="animate-spin" aria-hidden="true" />
              <span>Loading diff…</span>
            </div>
          )}

          {/* Content */}
          {!isInspecting && inspectData && (
            <div className="space-y-4 p-4">
              {/* Hash comparison banner */}
              {(() => {
                const localHash = localCapsule?.content_hash ?? "";
                const remoteHash = remoteCapsule?.content_hash ?? "";
                const match = !!(
                  localHash &&
                  remoteHash &&
                  localHash === remoteHash
                );
                return (
                  <div
                    role="status"
                    aria-live="polite"
                    className={`flex items-center gap-2 rounded px-3 py-2 text-xs font-medium ${match ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
                  >
                    <span className="font-mono">
                      {match ? "✓ Hashes match" : "✗ Hash mismatch"}
                    </span>
                    {!match && (
                      <span className="ml-2 font-normal text-red-600">
                        Difference may be in plugin-managed meta fields excluded
                        from sync (e.g. LiteSpeed Cache, Google Site Kit).
                      </span>
                    )}
                  </div>
                );
              })()}

              {/* Modification date — always shown so user can judge which version to keep */}
              {local &&
                remote &&
                (() => {
                  const localDate = local.post_modified_gmt
                    ? new Date(
                        local.post_modified_gmt + " UTC"
                      ).toLocaleString()
                    : "—";
                  const remoteDate = remote.post_modified_gmt
                    ? new Date(
                        remote.post_modified_gmt + " UTC"
                      ).toLocaleString()
                    : "—";
                  const sameDate =
                    local.post_modified_gmt === remote.post_modified_gmt;
                  const localNewer =
                    !sameDate &&
                    local.post_modified_gmt > (remote.post_modified_gmt ?? "");
                  return (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div
                        className={`rounded border px-3 py-2 ${localNewer ? "border-indigo-400 bg-indigo-50" : "border-border bg-secondary/40"}`}
                      >
                        <p className="mb-0.5 font-semibold tracking-wide text-gray-500 uppercase">
                          Local — last modified
                        </p>
                        <p
                          className={`font-mono font-bold ${localNewer ? "text-indigo-700" : "text-gray-700"}`}
                        >
                          {localDate}
                        </p>
                        {localNewer && (
                          <p className="mt-0.5 text-indigo-500">← Newer</p>
                        )}
                      </div>
                      <div
                        className={`rounded border px-3 py-2 ${!sameDate && !localNewer ? "border-green-400 bg-green-50" : "border-border bg-secondary/40"}`}
                      >
                        <p className="mb-0.5 font-semibold tracking-wide text-gray-500 uppercase">
                          Remote — last modified
                        </p>
                        <p
                          className={`font-mono font-bold ${!sameDate && !localNewer ? "text-green-700" : "text-gray-700"}`}
                        >
                          {remoteDate}
                        </p>
                        {!sameDate && !localNewer && (
                          <p className="mt-0.5 text-green-600">← Newer</p>
                        )}
                      </div>
                      {sameDate && (
                        <p className="col-span-2 rounded bg-amber-50 px-3 py-1.5 text-amber-700">
                          ⚠ Same timestamp on both sites — content differs
                          despite equal modified date. This typically happens
                          when a plugin updates content without touching{" "}
                          <code className="font-mono">post_modified</code> (e.g.
                          LiteSpeed Cache, Google Site Kit meta).
                        </p>
                      )}
                    </div>
                  );
                })()}

              {/* Identical fields summary */}
              {identicalCount > 0 && (
                <p className="text-muted-foreground bg-secondary/50 rounded px-3 py-2 text-xs">
                  {identicalCount} core field{identicalCount !== 1 ? "s" : ""}{" "}
                  identical — showing differences only below.
                </p>
              )}

              {/* Core field diff table */}
              <table className="border-border w-full overflow-hidden rounded-lg border text-sm">
                <thead>
                  <tr className="bg-background text-left">
                    <th className="text-muted-foreground w-28 p-2.5 text-xs font-semibold tracking-wide uppercase">
                      Field
                    </th>
                    <th className="text-muted-foreground p-2.5 text-xs font-semibold tracking-wide uppercase">
                      Local
                    </th>
                    <th className="text-muted-foreground p-2.5 text-xs font-semibold tracking-wide uppercase">
                      Remote
                    </th>
                    <th className="w-6 p-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {diffRows
                    .filter((r) => r.differs)
                    .map((row) => (
                      <tr
                        key={row.label}
                        className="bg-amber-50 dark:bg-amber-950/20"
                      >
                        <td className="p-2.5 font-medium text-gray-700">
                          {row.label}
                        </td>
                        <td className="max-w-[200px] truncate p-2.5 font-mono text-xs text-gray-600">
                          {row.local}
                        </td>
                        <td className="max-w-[200px] truncate p-2.5 font-mono text-xs text-gray-600">
                          {row.remote}
                        </td>
                        <td className="p-2.5 text-center text-red-500">
                          &#9679;
                        </td>
                      </tr>
                    ))}
                  {diffRows.filter((r) => r.differs).length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="text-muted-foreground p-3 text-center text-xs italic"
                      >
                        No core field differences.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Meta changes */}
              {diffMetaRows.length > 0 && (
                <>
                  <p className="text-muted-foreground pt-2 text-xs font-bold tracking-widest uppercase">
                    Meta Changes ({diffMetaRows.length})
                  </p>
                  <table className="border-border w-full overflow-hidden rounded-lg border text-sm">
                    <thead>
                      <tr className="bg-background text-left">
                        <th className="text-muted-foreground w-40 p-2.5 text-xs font-semibold tracking-wide uppercase">
                          Key
                        </th>
                        <th className="text-muted-foreground p-2.5 text-xs font-semibold tracking-wide uppercase">
                          Local
                        </th>
                        <th className="text-muted-foreground p-2.5 text-xs font-semibold tracking-wide uppercase">
                          Remote
                        </th>
                        <th className="w-6 p-2.5"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-border divide-y">
                      {diffMetaRows.map((row) => (
                        <tr
                          key={row.key}
                          className="bg-amber-50 dark:bg-amber-950/20"
                        >
                          <td className="max-w-[140px] truncate p-2.5 font-mono text-xs text-gray-700">
                            {row.key}
                          </td>
                          <td className="max-w-[200px] truncate p-2.5 font-mono text-xs text-gray-600">
                            {row.local}
                          </td>
                          <td className="max-w-[200px] truncate p-2.5 font-mono text-xs text-gray-600">
                            {row.remote}
                          </td>
                          <td className="p-2.5 text-center text-red-500">
                            &#9679;
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {/* Taxonomy changes */}
              {diffTaxRows.length > 0 && (
                <>
                  <p className="text-muted-foreground pt-2 text-xs font-bold tracking-widest uppercase">
                    Taxonomy Changes ({diffTaxRows.length})
                  </p>
                  <table className="border-border w-full overflow-hidden rounded-lg border text-sm">
                    <thead>
                      <tr className="bg-background text-left">
                        <th className="text-muted-foreground w-40 p-2.5 text-xs font-semibold tracking-wide uppercase">
                          Taxonomy
                        </th>
                        <th className="text-muted-foreground p-2.5 text-xs font-semibold tracking-wide uppercase">
                          Local
                        </th>
                        <th className="text-muted-foreground p-2.5 text-xs font-semibold tracking-wide uppercase">
                          Remote
                        </th>
                        <th className="w-6 p-2.5"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-border divide-y">
                      {diffTaxRows.map((row) => (
                        <tr
                          key={row.key}
                          className="bg-amber-50 dark:bg-amber-950/20"
                        >
                          <td className="max-w-[140px] truncate p-2.5 font-mono text-xs text-gray-700">
                            {row.key}
                          </td>
                          <td className="p-2.5 text-xs text-gray-600">
                            {row.local}
                          </td>
                          <td className="p-2.5 text-xs text-gray-600">
                            {row.remote}
                          </td>
                          <td className="p-2.5 text-center text-red-500">
                            &#9679;
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {/* Raw Meta Diff — Sentinel deep scan */}
              <div className="pt-2">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
                    Raw Meta Diff (All Fields)
                  </p>
                  {!metaDiff && (
                    <button
                      onClick={handleMetaDiff}
                      disabled={isLoadingMetaDiff}
                      className="flex items-center gap-1.5 rounded bg-indigo-600 px-3 py-1 text-xs text-white hover:bg-indigo-700 disabled:opacity-50"
                      aria-busy={isLoadingMetaDiff}
                    >
                      {isLoadingMetaDiff ? (
                        <>
                          <Loader2
                            size={11}
                            className="animate-spin"
                            aria-hidden="true"
                          />{" "}
                          Loading…
                        </>
                      ) : (
                        <>
                          <Eye size={11} aria-hidden="true" /> Load Raw Meta
                        </>
                      )}
                    </button>
                  )}
                </div>

                {metaDiff &&
                  (() => {
                    // Recommendation logic — runs after raw meta is loaded
                    const hasCoreFieldDiffs =
                      diffRows.filter((r) => r.differs).length > 0;
                    const sameTimestamp =
                      local &&
                      remote &&
                      local.post_modified_gmt === remote.post_modified_gmt;
                    const hasElementorDiff = metaDiff.diff.some(
                      (d) => d.key === "_elementor_data"
                    );
                    const allDiffsOutOfScope =
                      metaDiff.diff_count > 0 &&
                      metaDiff.diff.every((d) => !d.in_sync_scope);

                    let recommendation: {
                      type: "info" | "success" | "warning";
                      title: string;
                      body: string;
                    } | null = null;

                    if (!hasCoreFieldDiffs && hasElementorDiff) {
                      recommendation = {
                        type: "info",
                        title: "Domain URL difference detected",
                        body: "The only difference is in Elementor layout data which contains domain-specific URLs (e.g. staging.site.com vs site.com). These URLs are automatically rewritten when content is pushed. If the page layout is otherwise identical, it is safe to push.",
                      };
                    } else if (!hasCoreFieldDiffs && allDiffsOutOfScope) {
                      recommendation = {
                        type: "success",
                        title: "Safe to leave as-is",
                        body: "All differences are in plugin-managed fields (caching, analytics, etc.) that are excluded from sync scope. A push will not modify these fields. Recommended: leave this conflict as-is.",
                      };
                    } else if (hasCoreFieldDiffs && sameTimestamp) {
                      recommendation = {
                        type: "warning",
                        title: "Manual resolution required",
                        body: "Core content differs despite the same modification timestamp. This may indicate the content was edited directly in the database. Review the field differences above and decide which version to keep before pushing.",
                      };
                    }

                    const recommendationColors = {
                      info: "border-blue-200 bg-blue-50 text-blue-800",
                      success: "border-green-200 bg-green-50 text-green-800",
                      warning: "border-amber-200 bg-amber-50 text-amber-800",
                    };

                    return (
                      <div className="space-y-2">
                        <p className="text-muted-foreground text-xs">
                          {metaDiff.diff_count} meta key
                          {metaDiff.diff_count !== 1 ? "s" : ""} differ ·{" "}
                          {metaDiff.identical_count} identical ·{" "}
                          {metaDiff.only_local.length} only local ·{" "}
                          {metaDiff.only_remote.length} only remote
                        </p>

                        {metaDiff.diff.length > 0 && (
                          <table className="border-border w-full overflow-hidden rounded-lg border text-sm">
                            <thead>
                              <tr className="bg-background text-left">
                                <th className="text-muted-foreground w-48 p-2.5 text-xs font-semibold tracking-wide uppercase">
                                  Meta Key
                                </th>
                                <th className="text-muted-foreground p-2.5 text-xs font-semibold tracking-wide uppercase">
                                  Local
                                </th>
                                <th className="text-muted-foreground p-2.5 text-xs font-semibold tracking-wide uppercase">
                                  Remote
                                </th>
                                <th className="text-muted-foreground w-24 p-2.5 text-xs font-semibold tracking-wide uppercase">
                                  Sync Scope
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-border divide-y">
                              {metaDiff.diff.map((row) => {
                                const isElementor =
                                  row.key === "_elementor_data";
                                return (
                                  <tr
                                    key={row.key}
                                    className="bg-amber-50 dark:bg-amber-950/20"
                                  >
                                    <td
                                      className="max-w-[180px] truncate p-2.5 font-mono text-xs text-gray-700"
                                      title={row.key}
                                    >
                                      {row.key}
                                    </td>
                                    <td className="max-w-[180px] truncate p-2.5 font-mono text-xs text-gray-600">
                                      {JSON.stringify(row.local)}
                                    </td>
                                    <td className="max-w-[180px] truncate p-2.5 font-mono text-xs text-gray-600">
                                      {JSON.stringify(row.remote)}
                                    </td>
                                    <td className="p-2.5 text-xs">
                                      {isElementor ? (
                                        <span className="rounded bg-blue-100 px-1.5 py-0.5 whitespace-nowrap text-blue-700">
                                          Contains URLs
                                        </span>
                                      ) : row.in_sync_scope ? (
                                        <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-indigo-700">
                                          Synced
                                        </span>
                                      ) : (
                                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-500">
                                          Plugin
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}

                        {(metaDiff.only_local.length > 0 ||
                          metaDiff.only_remote.length > 0) && (
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {metaDiff.only_local.length > 0 && (
                              <div className="bg-secondary/40 rounded p-2">
                                <p className="mb-1 font-semibold text-gray-500">
                                  Only on local ({metaDiff.only_local.length})
                                </p>
                                {metaDiff.only_local.map((k) => (
                                  <p
                                    key={k}
                                    className="truncate font-mono text-gray-600"
                                  >
                                    {k}
                                  </p>
                                ))}
                              </div>
                            )}
                            {metaDiff.only_remote.length > 0 && (
                              <div className="bg-secondary/40 rounded p-2">
                                <p className="mb-1 font-semibold text-gray-500">
                                  Only on remote ({metaDiff.only_remote.length})
                                </p>
                                {metaDiff.only_remote.map((k) => (
                                  <p
                                    key={k}
                                    className="truncate font-mono text-gray-600"
                                  >
                                    {k}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Recommendation callout — shown only after raw meta is loaded */}
                        {recommendation && (
                          <div
                            role="note"
                            aria-live="polite"
                            className={`mt-3 rounded-lg border px-4 py-3 text-xs ${recommendationColors[recommendation.type]}`}
                          >
                            <p className="mb-1 font-semibold">
                              {recommendation.title}
                            </p>
                            <p className="leading-relaxed">
                              {recommendation.body}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
              </div>

              {diffRows.filter((r) => r.differs).length === 0 &&
                diffMetaRows.length === 0 &&
                diffTaxRows.length === 0 && (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    No differences found between local and remote versions.
                  </p>
                )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- Renderers ---

  const renderTabs = () => (
    <div className="mb-6 flex w-fit flex-wrap gap-1 rounded-lg bg-gray-200 p-1">
      {[
        { id: "push", label: "Sync Content", icon: RefreshCw },
        { id: "connections", label: "Manage Connections", icon: LinkIcon },
        { id: "schedules", label: "Automatic Sync", icon: Clock },
        { id: "target", label: "Receive from Other Site", icon: CheckCircle },
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() => setView(tab.id as any)}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
            view === tab.id
              ? "bg-card text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <tab.icon size={16} />
          {tab.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="dark:text-foreground mb-2 text-2xl font-bold text-gray-800">
        Sync Two Sites
      </h1>
      <p className="text-muted-foreground mb-6 text-sm">
        Keep two WordPress sites in step with each other — for example, a
        staging site (where you test changes) and your live site (what visitors
        see).
      </p>
      {inspectItem !== null && renderDiffModal()}

      {/* Onboarding when no connections exist */}
      {connections.length === 0 && view === "push" && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50/30 p-6 dark:border-blue-800 dark:bg-blue-950/10">
          <h2 className="mb-2 font-semibold text-blue-800 dark:text-blue-300">
            Getting Started
          </h2>
          <p className="mb-3 text-sm text-blue-700 dark:text-blue-400">
            To sync content between two sites, you need two sites with
            SwissSuite AI installed. Add a connection below, then come back to
            this page to sync your content.
          </p>
          <button
            onClick={() => setView("connections")}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add Your First Connection
          </button>
        </div>
      )}

      {renderTabs()}

      {view === "target" && (
        <div className="bg-card border-border rounded-xl border p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">
            Receive Content from Another Site
          </h2>
          <p className="dark:text-muted-foreground mb-4 text-sm text-gray-600">
            Let a connected site send content to this one. Share the key below
            with the other site.
          </p>
          <div className="bg-background border-border rounded-lg border p-4">
            <label className="text-muted-foreground mb-2 block text-xs font-bold tracking-wide uppercase">
              Your Secret Sync Key
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={localKey}
                className="bg-card flex-1 rounded border p-2 font-mono text-sm text-gray-600"
                placeholder="No key generated"
              />
              <button
                onClick={() => {
                  if (!localKey) return;
                  navigator.clipboard.writeText(localKey);
                  toast.success("Key copied to clipboard!");
                }}
                disabled={!localKey}
                className="border-border rounded border bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200 disabled:opacity-40"
                title="Copy key"
                aria-label="Copy sync key"
              >
                <Copy size={16} />
              </button>
              <button
                onClick={generateLocalKey}
                className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
              >
                Create New Key
              </button>
            </div>
          </div>
        </div>
      )}

      {view === "connections" && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="bg-card border-border rounded-xl border p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Saved Connections</h2>
            <div className="space-y-3">
              {connections.length === 0 && (
                <p className="text-muted-foreground text-sm italic">
                  No connections saved.
                </p>
              )}
              {connections.map((c) => (
                <div
                  key={c.id}
                  className="bg-background border-border flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <div className="font-medium text-gray-900">{c.name}</div>
                    <div className="text-muted-foreground text-xs">{c.url}</div>
                  </div>
                  <button
                    onClick={() => handleDeleteConnection(c.id)}
                    className="p-2 text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-card border-border rounded-xl border p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Add Connection</h2>
            <form onSubmit={handleSaveConnection} className="space-y-4">
              <div>
                <label className="dark:text-foreground block text-sm font-medium text-gray-700">
                  Nickname for this site
                </label>
                <input
                  name="name"
                  required
                  className="bg-background dark:text-foreground mt-1 w-full rounded border p-2 text-gray-900"
                  placeholder="e.g. My Live Site"
                />
                <p className="text-muted-foreground mt-1 text-xs">
                  A name you'll recognize later
                </p>
              </div>
              <div>
                <label className="dark:text-foreground block text-sm font-medium text-gray-700">
                  {"Other site's address"}
                </label>
                <input
                  name="url"
                  required
                  className="bg-background dark:text-foreground mt-1 w-full rounded border p-2 text-gray-900"
                  placeholder="https://mysite.com"
                />
                <p className="text-muted-foreground mt-1 text-xs">
                  The full web address of the other WordPress site
                </p>
              </div>
              <div>
                <label className="dark:text-foreground block text-sm font-medium text-gray-700">
                  Secret sync key
                </label>
                <input
                  name="key"
                  required
                  className="bg-background dark:text-foreground mt-1 w-full rounded border p-2 text-gray-900"
                  type="password"
                />
                <p className="text-muted-foreground mt-1 text-xs">
                  {
                    'Copy this from the other site: go to "Receive from Other Site" tab and copy the key shown there'
                  }
                </p>
              </div>
              <button className="flex w-full items-center justify-center gap-2 rounded bg-green-600 py-2 text-white hover:bg-green-700">
                <Save size={16} /> Save Connection
              </button>
            </form>
          </div>
        </div>
      )}

      {view === "schedules" && (
        <div className="space-y-6">
          <div className="bg-card border-border rounded-xl border p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Active Schedules</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-background border-b">
                  <tr>
                    <th className="p-3">Target</th>
                    <th className="p-3">Frequency</th>
                    <th className="p-3">Scope</th>
                    <th className="p-3">Last Run</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {schedules.map((s) => (
                    <tr key={s.id}>
                      <td className="p-3 font-medium">
                        {connections.find((c) => c.id === s.connection_id)
                          ?.name || "Unknown"}
                      </td>
                      <td className="p-3 capitalize">{s.frequency}</td>
                      <td className="p-3">
                        {(s.scope ?? []).map((sc: string) => (
                          <span
                            key={sc}
                            className="mr-1 inline-block rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-700 capitalize"
                          >
                            {sc}
                          </span>
                        ))}
                      </td>
                      <td className="text-muted-foreground p-3">
                        {s.last_run}
                        {s.last_run_status &&
                          s.last_run_status !== "success" && (
                            <span
                              className={`ml-2 rounded px-1.5 py-0.5 text-xs ${s.last_run_status === "failed" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}
                            >
                              {s.last_run_status}
                            </span>
                          )}
                      </td>
                      <td className="p-3">
                        {getSentinelBadge(s.sentinel_status ?? "unknown")}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleDeleteSchedule(s.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-card border-border max-w-2xl rounded-xl border p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">
              Run Sync Automatically
            </h2>
            <form onSubmit={handleSaveSchedule} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Target Connection
                  </label>
                  <select
                    name="connection_id"
                    required
                    className="mt-1 w-full rounded border p-2"
                  >
                    <option value="">Select...</option>
                    {connections.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Frequency
                  </label>
                  <select
                    name="frequency"
                    required
                    className="mt-1 w-full rounded border p-2"
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="twicedaily">Twice Daily</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Sync Scope
                </label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="scope_products"
                      defaultChecked
                    />{" "}
                    Products
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="scope_posts" defaultChecked />{" "}
                    Posts
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="scope_pages" defaultChecked />{" "}
                    Pages
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="scope_settings" /> Settings
                    (Options)
                  </label>
                </div>
              </div>
              <button className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                <Plus size={16} /> Create Schedule
              </button>
            </form>
          </div>
        </div>
      )}

      {view === "push" && (
        <div className="space-y-6">
          <div className="bg-card border-border flex items-center gap-4 rounded-xl border p-4 shadow-sm">
            <select
              className="bg-background rounded border p-2 font-medium"
              value={activeConnectionId}
              onChange={(e) => {
                // State resets are handled by the useEffect on activeConnectionId.
                setActiveConnectionId(e.target.value);
              }}
            >
              <option value="">Choose a connected site...</option>
              {connections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {isConnected ? (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-sm font-medium text-green-700">
                  <CheckCircle size={14} aria-hidden="true" /> Connected
                </span>
                <button
                  onClick={() => {
                    setIsConnected(false);
                    setDiffResults({});
                    setSelectedPullIds([]);
                  }}
                  className="text-xs text-gray-400 underline hover:text-red-500"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                disabled={!activeConnectionId}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Connect
              </button>
            )}
          </div>

          <div className="bg-card border-border rounded-xl border p-6 shadow-sm">
            {/* Gate: show helpful message when not connected */}
            {!isConnected && connections.length > 0 && (
              <div className="py-8 text-center">
                <RefreshCw className="text-muted-foreground/40 mx-auto mb-3 h-8 w-8" />
                <p className="dark:text-foreground mb-1 text-sm font-semibold text-gray-900">
                  Connect to see what's in sync
                </p>
                <p className="text-muted-foreground mx-auto max-w-md text-sm">
                  Choose a site from the dropdown above and click Connect. We'll
                  compare your content and show you which items match and which
                  ones need updating.
                </p>
              </div>
            )}
            {(isConnected || connections.length === 0) && (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Sync Content</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      title={
                        isConnected
                          ? "Refresh items & re-check diff"
                          : "Refresh items"
                      }
                      aria-label="Refresh"
                      className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-40"
                    >
                      <RefreshCw
                        size={16}
                        aria-hidden="true"
                        className={isRefreshing ? "animate-spin" : ""}
                      />
                    </button>
                    <button
                      onClick={handlePull}
                      className={`rounded px-6 py-2 text-white ${isPulling ? "cursor-not-allowed bg-gray-400" : "bg-green-600 hover:bg-green-700"} disabled:opacity-50`}
                      disabled={
                        selectedPullIds.length === 0 ||
                        isPulling ||
                        !isConnected
                      }
                      aria-busy={isPulling}
                    >
                      {isPulling
                        ? "Receiving..."
                        : `Bring ${selectedPullIds.length} from other site`}
                    </button>
                    <button
                      onClick={handlePush}
                      className={`rounded px-6 py-2 text-white ${isPushing ? "cursor-not-allowed bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"} disabled:opacity-50`}
                      disabled={
                        selectedIds.length === 0 || isPushing || !isConnected
                      }
                      aria-busy={isPushing}
                      title={
                        selectedIds.some((id) => diffResults[id] === "conflict")
                          ? "Some selected items are conflicts — local version will overwrite remote"
                          : undefined
                      }
                    >
                      {isPushing
                        ? "Sending..."
                        : `Send ${selectedIds.length} to other site${selectedIds.some((id) => diffResults[id] === "conflict") ? " (includes conflicts)" : ""}`}
                    </button>
                  </div>
                </div>

                <div
                  className="mb-4 flex gap-2"
                  role="group"
                  aria-label="Filter by content type"
                >
                  {TYPE_FILTER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setTypeFilter(opt.value)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${typeFilter === opt.value ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                      aria-pressed={typeFilter === opt.value}
                    >
                      {opt.label}
                      {opt.value !== "all" && (
                        <span className="ml-1 opacity-70">
                          ({items.filter((i) => i.type === opt.value).length})
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="max-h-[500px] overflow-x-auto overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-background sticky top-0 border-b">
                      <tr>
                        <th className="w-10 p-3">
                          <input
                            type="checkbox"
                            aria-label="Select all push-eligible visible items"
                            checked={(() => {
                              const pushEligible = filteredItems.filter((i) => {
                                const s = diffResults[i.id] || "unknown";
                                // Templates with 'missing' status cannot be pushed — upsert_fse_template() rejects
                                // them with template_not_found (FSE templates are scaffolded by theme, not created by sync).
                                if (i.type === "template" && s === "missing")
                                  return false;
                                return (
                                  s === "outdated" ||
                                  s === "missing" ||
                                  s === "unknown" ||
                                  s === "conflict"
                                );
                              });
                              return (
                                pushEligible.length > 0 &&
                                pushEligible.every((i) =>
                                  selectedIds.includes(i.id)
                                )
                              );
                            })()}
                            onChange={(e) => {
                              const pushEligibleIds = filteredItems
                                .filter((i) => {
                                  const s = diffResults[i.id] || "unknown";
                                  if (i.type === "template" && s === "missing")
                                    return false;
                                  return (
                                    s === "outdated" ||
                                    s === "missing" ||
                                    s === "unknown" ||
                                    s === "conflict"
                                  );
                                })
                                .map((i) => i.id);
                              if (e.target.checked)
                                setSelectedIds((prev) =>
                                  Array.from(
                                    new Set([...prev, ...pushEligibleIds])
                                  )
                                );
                              else
                                setSelectedIds((prev) =>
                                  prev.filter(
                                    (id) => !pushEligibleIds.includes(id)
                                  )
                                );
                            }}
                          />
                        </th>
                        <th className="p-3">ID</th>
                        <th className="p-3">Name</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">
                          Status
                          {!isConnected && (
                            <span className="text-muted-foreground ml-1 text-xs font-normal">
                              (connect to check)
                            </span>
                          )}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredItems.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="text-muted-foreground p-6 text-center text-sm"
                          >
                            No {typeFilter === "all" ? "" : typeFilter + " "}
                            items found.
                          </td>
                        </tr>
                      )}
                      {filteredItems.map((item) => {
                        const status = diffResults[item.id] || "unknown";
                        let badge = (
                          <span className="bg-secondary text-muted-foreground rounded px-2 py-1 text-xs">
                            Unknown
                          </span>
                        );
                        if (status === "synced")
                          badge = (
                            <span className="flex items-center gap-1 rounded bg-green-100 px-2 py-1 text-xs text-green-700">
                              <CheckCircle size={10} aria-hidden="true" />{" "}
                              Synced
                            </span>
                          );
                        if (status === "outdated")
                          badge = (
                            <span className="flex items-center gap-1 rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-700">
                              <Clock size={10} aria-hidden="true" /> Outdated
                            </span>
                          );
                        if (status === "missing")
                          badge = (
                            <span className="flex items-center gap-1 rounded bg-blue-100 px-2 py-1 text-xs text-blue-700">
                              <Plus size={10} aria-hidden="true" /> Missing
                            </span>
                          );
                        if (status === "conflict")
                          badge = (
                            <span className="flex items-center gap-1 rounded bg-red-100 px-2 py-1 text-xs text-red-700">
                              <AlertTriangle size={10} aria-hidden="true" />{" "}
                              Conflict
                            </span>
                          );
                        if (status === "target_newer")
                          badge = (
                            <span className="flex items-center gap-1 rounded bg-orange-100 px-2 py-1 text-xs text-orange-700">
                              <AlertTriangle size={10} aria-hidden="true" />{" "}
                              Target Newer
                            </span>
                          );

                        // conflict rows: user chooses push OR pull
                        // target_newer rows: pull only
                        // outdated/missing/unknown: push only
                        // synced: disabled (nothing to do)
                        // template + missing: disabled — FSE templates must exist on target (theme scaffolds them)
                        const isTemplateMissing =
                          item.type === "template" && status === "missing";
                        const isConflict = status === "conflict";
                        const isPullRow = status === "target_newer";
                        const isDisabledRow =
                          status === "synced" || isTemplateMissing;

                        return (
                          <tr key={item.id} className="hover:bg-background">
                            <td className="p-3">
                              {isConflict ? (
                                // Conflict: show both Push and Pull checkboxes stacked
                                <div className="flex flex-col gap-1">
                                  <label
                                    className="flex cursor-pointer items-center gap-1"
                                    title="Force-push local version to remote (overwrites remote)"
                                  >
                                    <input
                                      type="checkbox"
                                      aria-label={`Force push ${item.name} (conflict)`}
                                      checked={selectedIds.includes(item.id)}
                                      className="accent-indigo-600"
                                      onChange={(e) => {
                                        // selecting push deselects pull for this item (mutually exclusive)
                                        if (e.target.checked) {
                                          setSelectedIds((prev) => [
                                            ...prev,
                                            item.id,
                                          ]);
                                          setSelectedPullIds((prev) =>
                                            prev.filter((id) => id !== item.id)
                                          );
                                        } else {
                                          setSelectedIds((prev) =>
                                            prev.filter((id) => id !== item.id)
                                          );
                                        }
                                      }}
                                    />
                                    <span className="text-xs font-medium text-indigo-700">
                                      Push
                                    </span>
                                  </label>
                                  <label
                                    className="flex cursor-pointer items-center gap-1"
                                    title="Pull remote version to local (overwrites local)"
                                  >
                                    <input
                                      type="checkbox"
                                      aria-label={`Pull ${item.name} from remote (conflict)`}
                                      checked={selectedPullIds.includes(
                                        item.id
                                      )}
                                      className="accent-green-600"
                                      onChange={(e) => {
                                        // selecting pull deselects push for this item (mutually exclusive)
                                        if (e.target.checked) {
                                          setSelectedPullIds((prev) => [
                                            ...prev,
                                            item.id,
                                          ]);
                                          setSelectedIds((prev) =>
                                            prev.filter((id) => id !== item.id)
                                          );
                                        } else {
                                          setSelectedPullIds((prev) =>
                                            prev.filter((id) => id !== item.id)
                                          );
                                        }
                                      }}
                                    />
                                    <span className="text-xs font-medium text-green-700">
                                      Pull
                                    </span>
                                  </label>
                                </div>
                              ) : isPullRow ? (
                                <input
                                  type="checkbox"
                                  aria-label={`Select ${item.name} for pull`}
                                  checked={selectedPullIds.includes(item.id)}
                                  className="accent-blue-600"
                                  onChange={(e) => {
                                    if (e.target.checked)
                                      setSelectedPullIds((prev) => [
                                        ...prev,
                                        item.id,
                                      ]);
                                    else
                                      setSelectedPullIds((prev) =>
                                        prev.filter((id) => id !== item.id)
                                      );
                                  }}
                                />
                              ) : (
                                <input
                                  type="checkbox"
                                  aria-label={`Select ${item.name}`}
                                  title={
                                    isTemplateMissing
                                      ? "Template not found on target — install the same theme first"
                                      : undefined
                                  }
                                  checked={selectedIds.includes(item.id)}
                                  disabled={isDisabledRow}
                                  onChange={(e) => {
                                    if (e.target.checked)
                                      setSelectedIds([...selectedIds, item.id]);
                                    else
                                      setSelectedIds(
                                        selectedIds.filter(
                                          (id) => id !== item.id
                                        )
                                      );
                                  }}
                                />
                              )}
                            </td>
                            <td className="text-muted-foreground p-3">
                              #{item.id}
                            </td>
                            <td className="p-3 font-medium">{item.name}</td>
                            <td className="p-3">{getTypeBadge(item.type)}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {badge}
                                {isConnected &&
                                  (status === "conflict" ||
                                    status === "target_newer") && (
                                    <button
                                      onClick={() => handleInspect(item)}
                                      title="View field-by-field diff"
                                      aria-label={`View diff for ${item.name}`}
                                      className="rounded p-1 text-gray-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                                    >
                                      <Eye size={13} aria-hidden="true" />
                                    </button>
                                  )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <details className="bg-background border-border rounded-xl border font-mono text-sm text-slate-600 shadow-inner">
            <summary className="flex cursor-pointer items-center justify-between px-4 py-3 select-none">
              <span className="dark:text-foreground text-xs font-bold tracking-wide text-neutral-700 uppercase">
                Recent Activity
              </span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setLogs([]);
                }}
                className="dark:hover:text-foreground text-xs hover:text-slate-900"
              >
                Clear
              </button>
            </summary>
            <div className="max-h-48 overflow-y-auto px-4 pb-4">
              {logs.length === 0 && (
                <p className="text-muted-foreground text-xs italic">
                  No activity yet.
                </p>
              )}
              {logs.map((log, i) => (
                <div key={i} className="mb-1 text-xs">
                  {log}
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default SyncManager;
