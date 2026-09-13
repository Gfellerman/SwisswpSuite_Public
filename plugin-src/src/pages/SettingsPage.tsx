/**
 * Authored by: Frontend Specialist
 * Skills: ui-ux-pro-max, app-builder
 * Date: 2026-02-17
 *
 * Settings screen. The tab bar comes from settingsTabs.ts and the panels
 * from settingsPanels.tsx; this file owns the page chrome and the shared
 * settings state the panels read and write.
 */

import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SettingsLayout } from "../components/organisms/Settings/SettingsLayout";
import { useSettings } from "../hooks/useSettings";
import { settingsScreenPanels } from "./settingsPanels";
import type { SettingsScreenContext } from "../components/organisms/Settings/settingsScreenPanel";
import { Loader2 } from "lucide-react";

export default function SettingsPage() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") || "general"
  );
  const { settings, isLoading, isError, updateSettings, isUpdating } =
    useSettings();
  // Initial load — no cached data yet. Show spinner.
  if (isLoading && !settings) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const context: SettingsScreenContext = {
    settings,
    onSave: updateSettings,
    isSaving: isUpdating,
    isError,
    activeTab,
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
          Settings
        </h1>
        <p className="mt-2 text-neutral-700">
          Manage your preferences, connections, and maintenance options.
        </p>
      </div>

      <SettingsLayout activeTab={activeTab} onTabChange={setActiveTab}>
        <div className="space-y-6">
          {settingsScreenPanels
            .filter((panel) => panel.tab === activeTab)
            .map((panel) => (
              <React.Fragment key={panel.id}>
                {panel.render(context)}
              </React.Fragment>
            ))}
        </div>
      </SettingsLayout>
    </div>
  );
}
