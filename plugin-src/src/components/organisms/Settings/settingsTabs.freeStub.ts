/**
 * Free-edition stub for settingsTabs.ts (ARS Round C P1-21 / F-41,
 * 2026-08-23). Wired via vite.config.ts's resolve.alias, active only when
 * EDITION === 'free'.
 *
 * Same tab list minus "license" — there is nothing behind that tab for a
 * Free user to activate. The "./settingsApiTabLabel" specifier below is
 * itself aliased to settingsApiTabLabel.freeStub.ts by the same
 * EDITION === 'free' block in vite.config.ts, so this file automatically
 * picks up "Editions & AI" without needing its own copy of that string.
 */
import { SETTINGS_API_TAB_LABEL } from "./settingsApiTabLabel";
import type { SettingsTabDef } from "./settingsTabs";

export const SETTINGS_TABS: SettingsTabDef[] = [
  { id: "general", label: "General" },
  { id: "api", label: SETTINGS_API_TAB_LABEL },
  { id: "security", label: "Security" },
  { id: "seo", label: "SEO" },
  { id: "maintenance", label: "Maintenance" },
];
