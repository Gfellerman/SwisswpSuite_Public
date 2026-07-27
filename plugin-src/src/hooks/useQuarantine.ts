/**
 * useQuarantine — Custom hook for Quarantine + IP allow/block management.
 * =============================================================================
 * Introduced in v2.9.30.118 (TD-1 refactor) to consolidate the IP ban / allow,
 * quarantine list, and ignored-paths handlers that previously lived inline in
 * SecurityHub.tsx. The hook owns:
 *   - Mutation handlers (handleBanIp, handleUnbanIp, handleAllowIp, ...)
 *   - List refresh functions (fetchQuarantine, fetchIgnored, fetchBannedIps)
 *   - Optimistic UI updates via useSecurityStateStore
 *
 * Data flow:
 *   - State is held in useSecurityStateStore (Zustand) so every consumer
 *     (Quarantine tab, Log Advisor modal, Firewall Advisor modal) sees the
 *     same data without prop-drilling.
 *   - The banned-ips list is read from the TanStack Query cache (queryKey
 *     ["security-banned-ips"]) when SecurityHub calls refreshBannedIps().
 *     After every mutation the matching query is invalidated so the next
 *     mount of the Quarantine tab reads fresh data.
 *   - The plain useEffect-driven fetches (fetchQuarantine, fetchIgnored) are
 *     kept here so consumers only need a single hook to wire the tab.
 *
 * The hook returns the handlers + refresh functions. State is read directly
 * from the store via selectors in the consumer (e.g. `const bannedIps =
 * useSecurityStateStore((s) => s.bannedIps)`).
 */
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { wpApi } from "../services/api";
import { useSecurityStateStore } from "../store/useSecurityStateStore";
import { useUiStore } from "../store/useUiStore";
import type { QuarantineFile } from "../types";

interface BannedIpsResponse {
  bannedIps: string[];
  bannedIpTypes: Record<string, string>;
  allowedIps: string[];
  currentIp: string;
}

interface IgnoreResponse {
  ignored: string[];
  ignored_findings?: string[];
}

interface QuarantineResponse {
  files?: QuarantineFile[];
}

export interface UseQuarantineReturn {
  // ── Refresh ───────────────────────────────────────────────────────────────
  refreshBannedIps: () => Promise<void>;
  refreshQuarantine: () => Promise<void>;
  refreshIgnored: () => Promise<void>;

  // ── Banned IP mutations ───────────────────────────────────────────────────
  banIp: (ip: string) => void;
  unbanIp: (ip: string) => void;

  // ── Allowed IP mutations ──────────────────────────────────────────────────
  allowIp: (ip: string) => void;
  removeAllowedIp: (ip: string) => void;

  // ── Quarantine mutations ──────────────────────────────────────────────────
  restoreQuarantine: (id: string) => Promise<void>;
  deleteQuarantine: (id: string) => void;

  // ── Ignored path mutations ────────────────────────────────────────────────
  unIgnore: (path: string) => Promise<void>;
}

const BAN_KEY = ["security-banned-ips"] as const;

export function useQuarantine(): UseQuarantineReturn {
  const queryClient = useQueryClient();
  const setConfirmDialog = useUiStore((s) => s.setConfirmDialog);

  const setBannedIps = useSecurityStateStore((s) => s.setBannedIps);
  const setBannedIpTypes = useSecurityStateStore((s) => s.setBannedIpTypes);
  const setAllowedIps = useSecurityStateStore((s) => s.setAllowedIps);
  const setCurrentIp = useSecurityStateStore((s) => s.setCurrentIp);
  const setManualIp = useSecurityStateStore((s) => s.setManualIp);
  const setManualAllowedIp = useSecurityStateStore(
    (s) => s.setManualAllowedIp
  );
  const setQuarantinedFiles = useSecurityStateStore(
    (s) => s.setQuarantinedFiles
  );
  const setIgnoredPaths = useSecurityStateStore((s) => s.setIgnoredPaths);
  const setIgnoredFindings = useSecurityStateStore(
    (s) => s.setIgnoredFindings
  );

  // ── Refresh handlers ──────────────────────────────────────────────────────
  const refreshBannedIps = useCallback(async () => {
    try {
      const data = await wpApi<BannedIpsResponse>("/security/banned-ips");
      setBannedIps(data.bannedIps);
      setBannedIpTypes(data.bannedIpTypes);
      setAllowedIps(data.allowedIps);
      if (data.currentIp) setCurrentIp(data.currentIp);
    } catch (e) {
      console.error("Failed to fetch banned IPs:", e);
    }
  }, [
    setBannedIps,
    setBannedIpTypes,
    setAllowedIps,
    setCurrentIp,
  ]);

  const refreshQuarantine = useCallback(async () => {
    try {
      const data = await wpApi<QuarantineResponse>("/security/quarantine");
      setQuarantinedFiles(data.files ?? []);
    } catch (e) {
      console.error("Failed to fetch quarantine:", e);
    }
  }, [setQuarantinedFiles]);

  const refreshIgnored = useCallback(async () => {
    try {
      const data = await wpApi<IgnoreResponse>("/security/ignore");
      setIgnoredPaths(data.ignored || []);
      setIgnoredFindings(
        Array.isArray(data.ignored_findings) ? data.ignored_findings : []
      );
    } catch (e) {
      console.error("Failed to fetch ignored paths:", e);
    }
  }, [setIgnoredPaths, setIgnoredFindings]);

  // ── Banned IP mutations ───────────────────────────────────────────────────
  const banIp = useCallback(
    (ip: string) => {
      if (!ip) return;
      setConfirmDialog({
        message: `Are you sure you want to permanently ban ${ip}?`,
        onConfirm: async () => {
          try {
            const data = await wpApi<{
              success: boolean;
              message?: string;
            }>("/security/ban-ip", {
              method: "POST",
              body: JSON.stringify({ ip }),
            });
            if (data.success) {
              toast.success("IP Banned successfully.");
              setManualIp("");
              queryClient.invalidateQueries({ queryKey: BAN_KEY });
            } else {
              toast.error(
                "Failed to ban IP: " + (data.message || "Unknown error")
              );
            }
          } catch (e) {
            console.error(e);
            toast.error("Network error during ban.");
          }
        },
      });
    },
    [queryClient, setConfirmDialog, setManualIp]
  );

  const unbanIp = useCallback(
    (ip: string) => {
      setConfirmDialog({
        message: `Unban ${ip}?`,
        onConfirm: async () => {
          try {
            await wpApi<{ success: boolean }>("/security/unban-ip", {
              method: "POST",
              body: JSON.stringify({ ip }),
            });
            queryClient.invalidateQueries({ queryKey: BAN_KEY });
            toast.success("IP unbanned.");
          } catch (e) {
            const msg =
              (e instanceof Error && e.message) ||
              "Could not unban IP. Please try again.";
            console.error("Unban IP failed:", e);
            toast.error(msg);
          }
        },
      });
    },
    [queryClient, setConfirmDialog]
  );

  // ── Allowed IP mutations ──────────────────────────────────────────────────
  const allowIp = useCallback(
    (ip: string) => {
      if (!ip) return;
      setConfirmDialog({
        message: `Add ${ip} to the permanent allowlist?`,
        onConfirm: async () => {
          try {
            const data = await wpApi<{
              success: boolean;
              message?: string;
              already_present?: boolean;
            }>("/security/allowed-ips", {
              method: "POST",
              body: JSON.stringify({ ip }),
            });
            if (data.success) {
              if (data.already_present) {
                toast.info("IP is already in the allowlist.");
              } else {
                toast.success("IP added to allowlist.");
              }
              setManualAllowedIp("");
              queryClient.invalidateQueries({ queryKey: BAN_KEY });
            } else {
              toast.error(
                "Failed to add IP: " + (data.message || "Unknown error")
              );
            }
          } catch (e) {
            console.error(e);
            toast.error("Network error while adding IP to allowlist.");
          }
        },
      });
    },
    [queryClient, setConfirmDialog, setManualAllowedIp]
  );

  const removeAllowedIp = useCallback(
    (ip: string) => {
      setConfirmDialog({
        message: `Remove ${ip} from the allowlist?`,
        onConfirm: async () => {
          try {
            const data = await wpApi<{
              success: boolean;
              message?: string;
            }>("/security/allowed-ips", {
              method: "DELETE",
              body: JSON.stringify({ ip }),
            });
            if (data.success) {
              toast.success("IP removed from allowlist.");
              queryClient.invalidateQueries({ queryKey: BAN_KEY });
            } else {
              toast.error(
                "Failed to remove IP: " + (data.message || "Unknown error")
              );
            }
          } catch (e) {
            console.error(e);
            toast.error("Network error while removing IP from allowlist.");
          }
        },
      });
    },
    [queryClient, setConfirmDialog]
  );

  // ── Quarantine mutations ──────────────────────────────────────────────────
  const restoreQuarantine = useCallback(
    async (id: string) => {
      try {
        await wpApi<{ success: boolean }>("/security/quarantine/restore", {
          method: "POST",
          body: JSON.stringify({ id }),
        });
        await refreshQuarantine();
        toast.success("File restored successfully.");
      } catch (e) {
        toast.error("Failed to restore.");
      }
    },
    [refreshQuarantine]
  );

  const deleteQuarantine = useCallback(
    (id: string) => {
      setConfirmDialog({
        message: "Permanently delete this file? This cannot be undone.",
        onConfirm: async () => {
          try {
            await wpApi<{ success: boolean }>(
              "/security/quarantine/delete",
              { method: "POST", body: JSON.stringify({ id }) }
            );
            await refreshQuarantine();
            toast.success("File permanently deleted.");
          } catch (e) {
            toast.error("Failed to delete.");
          }
        },
      });
    },
    [refreshQuarantine, setConfirmDialog]
  );

  // ── Ignored path mutations ────────────────────────────────────────────────
  const unIgnore = useCallback(
    async (path: string) => {
      try {
        await wpApi<{ success: boolean }>("/security/ignore/remove", {
          method: "POST",
          body: JSON.stringify({ path }),
        });
        await refreshIgnored();
      } catch (e) {
        toast.error("Failed to un-ignore.");
      }
    },
    [refreshIgnored]
  );

  return {
    refreshBannedIps,
    refreshQuarantine,
    refreshIgnored,
    banIp,
    unbanIp,
    allowIp,
    removeAllowedIp,
    restoreQuarantine,
    deleteQuarantine,
    unIgnore,
  };
}
