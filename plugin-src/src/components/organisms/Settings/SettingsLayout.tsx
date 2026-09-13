/**
 * Authored by: Frontend Specialist
 * Skills: ui-ux-pro-max (Tab Patterns), tailwind-patterns
 * Date: 2026-02-17
 */

import { ReactNode } from "react";
import { Card } from "../../ui/Card";
import { SETTINGS_TABS } from "./settingsTabs";

interface SettingsLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function SettingsLayout({
  children,
  activeTab,
  onTabChange,
}: SettingsLayoutProps) {
  // The tab list comes from its own module (settingsTabs.ts).
  const tabs = SETTINGS_TABS;

  return (
    <div className="space-y-6">
      <Card className="mx-auto max-w-fit p-1 sm:mx-0">
        <div className="scrollbar-hide bg-secondary dark:bg-card/50 flex overflow-x-auto rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative min-h-[44px] shrink-0 rounded-md px-6 py-2.5 text-sm font-medium transition-all duration-200 focus:ring-2 focus:ring-blue-500/50 focus:outline-none ${
                activeTab === tab.id
                  ? "bg-card dark:bg-secondary dark:text-foreground text-neutral-900 shadow-sm"
                  : "dark:hover:text-foreground text-neutral-700 hover:text-neutral-700"
              } `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {children}
      </div>
    </div>
  );
}
