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
  wpscanApiKey?: string; // Optional WPScan API key for vulnerability scanning
  patchstackApiKey?: string; // Optional Patchstack API key for second CVE source
  coreIntegrityEnabled?: boolean; // WordPress core file integrity check
  abandonedPluginCheckEnabled?: boolean; // Daily abandoned plugin detection
  // F-09 Option A (ARS Round B2, D4-2): off-by-default local pageview
  // counter that powers the Dashboard traffic chart. No IP/UA/URL/cookie
  // is ever stored or transmitted — see api-settings.php get_settings().
  pageviewTrackingEnabled?: boolean;
  alertEmail?: string; // Email address for security alerts and diagnostic notifications
  seoDefaultOgImage?: number; // Attachment ID for default social sharing image
  // P1-03/F-08 fix: real toggle for the /sitemap.xml endpoint (previously
  // seeded 'no' at activation with no UI/REST path to ever turn it on).
  // BACKEND NOTE: PHP-side read/write for this field is a handoff to the
  // owner of class-swisswpsuite-api-settings.php — see
  // scratchpad/c/handoff/lane4_api_settings.md. Until that lands, saving
  // this field is a silent no-op server-side (PHP does not read it yet).
  sitemapEnabled?: boolean;
  // P1-06/F-11 fix: real toggle for the /llms.txt endpoint (previously
  // always-on with no setting at all). Same backend handoff as above.
  llmsTxtEnabled?: boolean;
  // ARS Round D delta (M6, handoff/DX1_seo-meta-ui-contract.md): opt-in
  // toggle for basic on-page meta injection (title/description/OG/
  // canonical/schema via PHP filters — class-swisswpsuite-frontend.php's
  // META_INJECTION_OPTION gate). Deliberately distinct from the Pro AI
  // Workbench's separate `swisswpsuite_seo_rewrite_titles` title-rewrite
  // toggle — do not conflate the two. Default off.
  seoMetaInjectionEnabled?: boolean;
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
  pageviewTrackingEnabled: boolean; // F-09 Option A (D4-2) — off-by-default
  alertEmail?: string;
  seoDefaultOgImage?: number;
  sitemapEnabled?: boolean; // P1-03/F-08 — see SwissSettings.sitemapEnabled
  llmsTxtEnabled?: boolean; // P1-06/F-11 — see SwissSettings.llmsTxtEnabled
  seoMetaInjectionEnabled?: boolean; // M6 — see SwissSettings.seoMetaInjectionEnabled
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
