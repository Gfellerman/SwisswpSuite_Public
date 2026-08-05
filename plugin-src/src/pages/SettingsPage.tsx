/**
 * Authored by: Frontend Specialist
 * Skills: ui-ux-pro-max, app-builder
 * Date: 2026-02-17
 */

import { useId, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "../components/templates/DashboardLayout";
import { SettingsLayout } from "../components/organisms/Settings/SettingsLayout";
import { GeneralSettings } from "../components/organisms/Settings/GeneralSettings";
import { SmtpSettings } from "../components/organisms/Settings/SmtpSettings";
import { ApiConfig } from "../components/organisms/Settings/ApiConfig";
import { LicenseManager } from "../components/organisms/Settings/LicenseManager";
import { MaintenanceSettings } from "../components/organisms/Settings/MaintenanceSettings";
import { TwoFactorSettings } from "../components/organisms/Settings/TwoFactorSettings";
import { SeoSettings } from "../components/organisms/Settings/SeoSettings";
import { WpscanApiKeyField } from "../components/organisms/Settings/WpscanApiKeyField";
import { PatchstackApiKeyField } from "../components/organisms/Settings/PatchstackApiKeyField";
import { EncryptionSettings } from "../components/organisms/Settings/EncryptionSettings";
import { useSettings, SwissSettings } from "../hooks/useSettings";
import { Card } from "../components/ui/Card";
import { Loader2, ShieldCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { EditionsAiInfo } from "../components/organisms/Settings/EditionsAiInfo";
import { isProEdition } from "../lib/edition";

// ── Security Scan Toggles ────────────────────────────────────────────────────

interface SecurityScanTogglesProps {
  settings: SwissSettings;
  onSave: (settings: Partial<SwissSettings>) => Promise<any>;
}

type ToggleRowProps = {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
};

function ToggleRow({ label, desc, checked, onChange }: ToggleRowProps) {
  // WCAG 4.1.2: role="switch" is a plain div, not a native "labelable"
  // element — wrapping it in a <label> (or leaving it as a sibling of the
  // visible text, as before) does NOT give it a programmatic name. Wire the
  // existing visible label/description via aria-labelledby/aria-describedby
  // instead of duplicating the string into aria-label (APG switch pattern).
  const labelId = useId();
  const descId = useId();
  return (
    <div className="border-border flex items-center justify-between border-b py-3 last:border-0">
      <div>
        <p
          id={labelId}
          className="dark:text-foreground text-sm font-medium text-neutral-900"
        >
          {label}
        </p>
        <p id={descId} className="mt-0.5 text-xs text-neutral-700">
          {desc}
        </p>
      </div>
      <div
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={descId}
        tabIndex={0}
        className={`ml-4 h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-300 ${checked ? "bg-green-500" : "bg-red-500"}`}
        onClick={() => onChange(!checked)}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") && onChange(!checked)
        }
      >
        <div
          className="h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300"
          style={{
            transform: checked ? "translateX(1.25rem)" : "translateX(0)",
          }}
        />
      </div>
    </div>
  );
}

function SecurityScanToggles({ settings, onSave }: SecurityScanTogglesProps) {
  const handleToggle = async (field: keyof SwissSettings, value: boolean) => {
    try {
      await onSave({ [field]: value });
      toast.success("Setting saved");
    } catch {
      toast.error("Failed to save setting");
    }
  };

  return (
    <Card className="max-w-3xl space-y-4 p-6">
      {/* Header */}
      <div className="border-border flex items-center gap-3 border-b pb-4">
        <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
          <ShieldCheck
            className="h-5 w-5 text-blue-600 dark:text-blue-400"
            aria-hidden="true"
          />
        </div>
        <div className="flex-1">
          <h3 className="dark:text-foreground text-lg font-semibold text-neutral-900">
            Scan Capabilities
          </h3>
          <p className="text-xs text-neutral-700">
            Extra checks included in your daily security scan
          </p>
        </div>
      </div>

      <div className="space-y-0">
        <ToggleRow
          label="WordPress Core Integrity Check"
          desc="Verifies all WordPress core files match official checksums. Detects any tampering including novel malware injections."
          checked={settings?.coreIntegrityEnabled ?? true}
          onChange={(v) => handleToggle("coreIntegrityEnabled", v)}
        />
        <ToggleRow
          label="Abandoned Plugin Detection"
          desc="Daily check for plugins that WordPress.org has closed or removed — often indicates a security compromise or unpatched vulnerability."
          checked={settings?.abandonedPluginCheckEnabled ?? true}
          onChange={(v) => handleToggle("abandonedPluginCheckEnabled", v)}
        />
      </div>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") || "general"
  );
  const {
    settings,
    isLoading,
    isError,
    updateSettings,
    isUpdating,
    activateLicense,
    isActivating,
  } = useSettings();

  // Initial load — no cached data yet. Show spinner.
  if (isLoading && !settings) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
          Settings
        </h1>
        <p className="mt-2 text-neutral-700">
          Manage your preferences, API connections, and license activation.
        </p>
      </div>

      <SettingsLayout activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === "general" && (
          <div className="space-y-6">
            <GeneralSettings
              settings={settings!} // non-null assertion as passed !isLoading check
              onSave={updateSettings}
              isSaving={isUpdating}
            />
            <SmtpSettings />
          </div>
        )}
        {activeTab === "api" && (
          <>
            {isProEdition() ? (
              <ApiConfig
                settings={settings!}
                onSave={updateSettings}
                isSaving={isUpdating}
              />
            ) : (
              // Upsell redesign (2026-08-04, design point 3): the old
              // per-tab ProUpsellPlaceholder (Upgrade/Download CTA pair) is
              // replaced by the one sanctioned informational section — see
              // EditionsAiInfo.tsx's own docblock. This is now also where
              // the removed License-tab and 2FA-card placeholders' "what's
              // included" information lives, consolidated into one place.
              <EditionsAiInfo />
            )}
          </>
        )}
        {activeTab === "security" && (
          <div className="space-y-6">
            {isProEdition() && <TwoFactorSettings />}
            <EncryptionSettings settings={settings!} onSave={updateSettings} />
            <WpscanApiKeyField
              settings={settings!}
              onSave={updateSettings}
              isProUser={!!window.swisswpsuiteData?.sentinelIsPro}
            />
            <PatchstackApiKeyField
              settings={settings!}
              onSave={updateSettings}
              isProUser={!!window.swisswpsuiteData?.sentinelIsPro}
            />
            <SecurityScanToggles settings={settings!} onSave={updateSettings} />
          </div>
        )}
        {activeTab === "seo" && (
          <SeoSettings settings={settings!} onSave={updateSettings} />
        )}
        {activeTab === "license" && (
          <>
            {/* Non-alarming reconnecting indicator — only shown when the status
                fetch is failing (VPS restart, network blip). The LicenseManager
                below still renders with last-known-good data (keepPreviousData)
                or the PHP-stamped window.swisswpsuiteData.license fallback.
                Never shown on a successful response. */}
            {isError && (
              <div
                role="status"
                aria-live="polite"
                className="text-muted-foreground bg-muted border-border mb-4 flex items-center gap-2 rounded-lg border px-4 py-2 text-xs"
              >
                <RefreshCw
                  className="h-3.5 w-3.5 animate-spin opacity-60"
                  aria-hidden="true"
                />
                <span>Checking license status&hellip;</span>
              </div>
            )}
            <LicenseManager
              license={settings?.license}
              tokens={settings?.tokens}
              onActivate={activateLicense}
              isActivating={isActivating}
            />
          </>
        )}
        {activeTab === "maintenance" && (
          <MaintenanceSettings
            settings={settings!}
            onSave={updateSettings}
            isSaving={isUpdating}
          />
        )}
      </SettingsLayout>
    </div>
  );
}
