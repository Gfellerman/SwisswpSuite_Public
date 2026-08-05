/**
 * Authored by: Frontend Specialist
 * Skills: ui-ux-pro-max (Tab Patterns), tailwind-patterns
 * Date: 2026-02-17
 */

import { ReactNode } from "react";
import { Card } from "../../ui/Card";
import { isProEdition } from "../../../lib/edition";

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
  // Upsell redesign (2026-08-04): the "api" tab is Pro's real AI-connection
  // panel (ApiConfig.tsx) but, in Free, is now the consolidated "Editions &
  // AI" informational section (EditionsAiInfo.tsx) — label reflects which
  // one actually renders. See SettingsPage.tsx's "api" tab branch.
  const tabs = [
    { id: "general", label: "General" },
    { id: "api", label: isProEdition() ? "AI Configuration" : "Editions & AI" },
    { id: "security", label: "Security" },
    { id: "seo", label: "SEO" },
    { id: "license", label: "License" },
    { id: "maintenance", label: "Maintenance" },
  ];

  return (
    <div className="space-y-6">
      <Card className="p-1 max-w-fit mx-auto sm:mx-0">
        <div className="flex overflow-x-auto scrollbar-hide p-1 bg-secondary dark:bg-card/50 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                                shrink-0 relative px-6 py-2.5 text-sm font-medium rounded-md transition-all duration-200
                                min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500/50
                                ${
                                  activeTab === tab.id
                                    ? "bg-card dark:bg-secondary text-neutral-900 dark:text-foreground shadow-sm"
                                    : "text-neutral-700 hover:text-neutral-700 dark:hover:text-foreground"
                                }
                            `}
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
