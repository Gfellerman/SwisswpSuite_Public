/**
 * settingsTabs — SettingsLayout.tsx's tab list.
 */
export interface SettingsTabDef {
  id: string;
  label: string;
}

export const SETTINGS_TABS: SettingsTabDef[] = [
  { id: "general", label: "General" },
  { id: "security", label: "Security" },
  { id: "seo", label: "SEO" },
  { id: "maintenance", label: "Maintenance" },
  { id: "diagnostics", label: "Diagnostics" },
];
