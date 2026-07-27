/**
 * Authored by: Backend Specialist
 * Skills: api-patterns (Data Fetching), react-patterns (Custom Hooks)
 * Date: 2026-02-17
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { wpApi } from "../services/api";

export interface SwissSettings {
  /**
   * @deprecated SET-002/SET-024: Dead state — never used by any component.
   * Retained for API response compatibility (PHP returns masked key string).
   * Use `hasApiKey` boolean to check if a key is configured.
   */
  apiKey: string;
  useCustomApi: boolean;
  customApiUrl: string;
  customModelId: string;
  autoUpdatePlugin: boolean;
  emailNotifications: boolean;
  betaFeatures: boolean;
  loginMaxRetries: number;
  transferStrategy?: string; // Auto, Chunked, Stream
  serverProfile?: string; // Auto, LiteSpeed, Apache, Nginx
  wpscanApiKey?: string; // Optional WPScan API key for vulnerability scanning
  patchstackApiKey?: string; // Optional Patchstack API key for second CVE source
  coreIntegrityEnabled?: boolean; // WordPress core file integrity check
  abandonedPluginCheckEnabled?: boolean; // Daily abandoned plugin detection
  alertEmail?: string; // Email address for security alerts and diagnostic notifications
  seoDefaultOgImage?: number; // Attachment ID for default social sharing image
  brandVoice?: string; // Optional one-line tone hint injected into content-facing AI prompts (≤200 chars)
  // Presence indicators — use these instead of reading the masked key strings
  // hasApiKey gap FIX: Missing from SwissSettings but present in SettingsResponse.
  hasApiKey?: boolean;
  hasWpscanApiKey?: boolean;
  hasPatchstackApiKey?: boolean;
  // C-01 partial: Encryption password state — PHP returns these in GET /settings
  hasEncryptionPassword?: boolean;
  encryptionPasswordCorrupted?: boolean;
}

interface SettingsResponse {
  apiKey: string;
  useCustomApi: boolean;
  customApiUrl: string;
  customModelId: string;
  license: any;
  tokens: any;
  transferStrategy: string;
  serverProfile: string;
  hasEncryptionPassword?: boolean;
  encryptionPasswordCorrupted?: boolean;
  autoUpdatePlugin: boolean;
  emailNotifications: boolean;
  betaFeatures: boolean;
  loginMaxRetries: number;
  wpscanApiKey: string;
  patchstackApiKey: string;
  coreIntegrityEnabled: boolean;
  abandonedPluginCheckEnabled: boolean;
  alertEmail?: string;
  seoDefaultOgImage?: number;
  brandVoice?: string; // Optional tone hint for content-facing AI prompts
  // Presence indicators — apiKey/wpscanApiKey/patchstackApiKey are now masked strings, use has*Key to determine if set
  hasApiKey?: boolean;
  hasWpscanApiKey?: boolean;
  hasPatchstackApiKey?: boolean;
  // SET-031: Optimistic-concurrency token echoed on POST to detect two-tab conflicts.
  settings_version?: string;
}

export function useSettings() {
  const queryClient = useQueryClient();

  const {
    data: settings,
    isLoading,
    isError,
    error,
    refetch: refetchSettings,
  } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      return wpApi<SettingsResponse>("/settings");
    },
    staleTime: 60000, // 1 minute
    // Retain last successful response during error / background-refetch states so
    // the license UI never drops to "unlicensed" because of a transient VPS blip.
    placeholderData: keepPreviousData,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<SwissSettings>) => {
      // SET-031: Attach the server-issued settings_version so the backend can
      // detect two-tab / stale-session overwrites. Field is optional server-side,
      // so first-mount (no settings yet loaded) still saves normally.
      // _settings_version is optional; older cached responses without it bypass the conflict check.
      const payload: Record<string, unknown> = { ...newSettings };
      if (settings && (settings as SettingsResponse).settings_version) {
        payload._settings_version = (
          settings as SettingsResponse
        ).settings_version;
      }
      return wpApi<{ success: boolean }>("/settings", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (err: any) => {
      // SET-031: Surface concurrent-edit conflicts with a specific warning so the
      // user knows to reload rather than retry blindly. Other errors fall through
      // to the per-caller catch blocks which show generic "Failed to save" toasts.
      if (err?.status === 409) {
        toast.warning(
          err?.message ||
            "Settings were modified by another session. Reloading latest settings..."
        );
        // Invalidate and immediately refetch so the form auto-reloads with the
        // latest server state — the user does NOT need to manually reload.
        queryClient.invalidateQueries({ queryKey: ["settings"] });
        void refetchSettings();
      }
    },
  });

  const activateLicenseMutation = useMutation({
    mutationFn: async (licenseKey: string) => {
      return wpApi<{ success: boolean; message: string }>("/activate-license", {
        method: "POST",
        body: JSON.stringify({ licenseKey }), // Matches API expected param
      });
    },
    // IMPORTANT: No onSuccess invalidation here.
    // We MUST trigger a hard reload in the component to refresh PHP globals.
  });

  return {
    settings,
    isLoading,
    isError,
    error,
    updateSettings: updateSettingsMutation.mutateAsync,
    isUpdating: updateSettingsMutation.isPending,
    activateLicense: activateLicenseMutation.mutateAsync,
    isActivating: activateLicenseMutation.isPending,
  };
}
