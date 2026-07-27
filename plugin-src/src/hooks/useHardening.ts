/**
 * useHardening — Custom hook for Hardening options management.
 * =============================================================================
 * Introduced in v2.9.30.118 (TD-1 refactor) to consolidate hardening list
 * refresh + toggle/apply-all handlers that previously lived inline in
 * SecurityHub.tsx. The hook reads + writes the hardening slice of
 * useSecurityStateStore so the HardeningOptionsGrid + CloudShieldPanel
 * stay in sync without prop-drilling.
 *
 * Data flow:
 *   - State is held in useSecurityStateStore.hardeningOptions.
 *   - refreshHardening() re-fetches /hardening/status and writes the result.
 *   - toggleOption() does an optimistic update first, then POSTs; on error
 *     it invalidates the cache to revert to the server's truth.
 *   - applyAll() calls /hardening/apply-all and refreshes the list.
 */
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { wpApi } from "../services/api";
import { useSecurityStateStore } from "../store/useSecurityStateStore";
import { useUiStore } from "../store/useUiStore";
import type { HardeningOption } from "../types";

interface HardeningResponse {
  success: boolean;
  options: Record<string, HardeningOption>;
}

export interface UseHardeningReturn {
  refreshHardening: () => Promise<void>;
  toggleOption: (key: string, enabled: boolean) => Promise<void>;
  applyAll: () => void;
}

const HARDENING_KEY = ["hardening-status"] as const;

export function useHardening(): UseHardeningReturn {
  const queryClient = useQueryClient();
  const setConfirmDialog = useUiStore((s) => s.setConfirmDialog);

  const setHardeningOptions = useSecurityStateStore(
    (s) => s.setHardeningOptions
  );
  const toggleHardeningOption = useSecurityStateStore(
    (s) => s.toggleHardeningOption
  );
  const setLoadingHardening = useSecurityStateStore(
    (s) => s.setLoadingHardening
  );

  const refreshHardening = useCallback(async () => {
    try {
      const data = await wpApi<HardeningResponse>("/hardening/status");
      if (data.success && data.options) {
        setHardeningOptions(Object.values(data.options));
      }
    } catch (e) {
      console.error("Failed to fetch hardening status:", e);
    }
  }, [setHardeningOptions]);

  const toggleOption = useCallback(
    async (key: string, enabled: boolean) => {
      // Optimistic update
      toggleHardeningOption(key, enabled);
      try {
        const data = await wpApi<{
          success: boolean;
          message?: string;
          upgrade_required?: boolean;
        }>("/hardening/toggle", {
          method: "POST",
          body: JSON.stringify({ option: key, enable: enabled }),
        });
        if (!data.success) {
          toast.error(
            "Failed to toggle: " + (data.message || "Unknown error")
          );
          queryClient.invalidateQueries({ queryKey: HARDENING_KEY });
        }
      } catch (e: unknown) {
        console.error(e);
        if (e instanceof Error) {
          toast.error(e.message || "Network error — could not save setting.");
        } else {
          toast.error("Network error — could not save setting.");
        }
        queryClient.invalidateQueries({ queryKey: HARDENING_KEY });
      }
    },
    [toggleHardeningOption, queryClient]
  );

  const applyAll = useCallback(() => {
    setConfirmDialog({
      message: "Enable all recommended security hardening options?",
      onConfirm: async () => {
        setLoadingHardening(true);
        try {
          const data = await wpApi<{
            success: boolean;
            message?: string;
          }>("/hardening/apply-all", { method: "POST" });
          if (data.success) {
            queryClient.invalidateQueries({ queryKey: HARDENING_KEY });
            toast.success("All recommended security options applied.");
          } else {
            toast.error("Failed: " + data.message);
          }
        } catch (e) {
          console.error(e);
          toast.error("Network error.");
        } finally {
          setLoadingHardening(false);
        }
      },
    });
  }, [queryClient, setConfirmDialog, setLoadingHardening]);

  return { refreshHardening, toggleOption, applyAll };
}
