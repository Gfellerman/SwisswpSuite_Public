/**
 * Authored by: Frontend Specialist
 * Skills: ui-ux-pro-max, app-builder
 * Date: 2026-02-17
 *
 * Settings screen. The tab bar comes from settingsTabs.ts and the panels
 * from settingsPanels.tsx; this file owns the page chrome and the shared
 * settings state the panels read and write.
 */

import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  const settingsFetching = useIsFetching({ queryKey: ["settings"] }) > 0;
  const headingRef = useRef<HTMLHeadingElement>(null);
  // True once a load has failed and until settings arrive. A retry of a query
  // that never held data reports "loading" again, so this keeps the error view
  // on screen while the retry runs: the panels that load their own data keep
  // what the user typed, and the retry button keeps keyboard focus.
  const [loadFailed, setLoadFailed] = useState(false);
  useEffect(() => {
    if (!settings) {
      if (isError) setLoadFailed(true);
      return;
    }
    if (!loadFailed) return;
    setLoadFailed(false);
    // The retry button left the page with the error message. Move focus to
    // the page heading, unless the user already moved it somewhere else.
    const active = document.activeElement;
    if (!active || active === document.body) headingRef.current?.focus();
  }, [settings, isError, loadFailed]);

  // Initial load — no cached data yet. Show spinner.
  if (isLoading && !settings && !loadFailed) {
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
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="dark:text-foreground text-3xl font-bold tracking-tight text-neutral-900 focus:outline-none"
        >
          Settings
        </h1>
        <p className="mt-2 text-neutral-700 dark:text-neutral-400">
          Manage your preferences, connections, and maintenance options.
        </p>
      </div>

      <SettingsLayout activeTab={activeTab} onTabChange={setActiveTab}>
        <div className="space-y-6">
          {!settings &&
            settingsScreenPanels.some(
              (panel) =>
                panel.tab === activeTab && panel.requiresSettings !== false
            ) && (
              <div
                role="alert"
                className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800"
              >
                <p className="font-semibold">Settings could not be loaded.</p>
                <p className="mt-1">
                  Check your connection, then try again. If this keeps
                  happening, reload the page.
                </p>
                <button
                  type="button"
                  className="mt-3 rounded border border-red-400 px-3 py-1 font-medium aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
                  aria-disabled={settingsFetching}
                  onClick={() => {
                    if (settingsFetching) return;
                    void queryClient.refetchQueries({ queryKey: ["settings"] });
                  }}
                >
                  Try again
                </button>
              </div>
            )}
          {settingsScreenPanels
            .filter((panel) => panel.tab === activeTab)
            .filter((panel) => settings || panel.requiresSettings === false)
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
