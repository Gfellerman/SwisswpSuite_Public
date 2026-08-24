/**
 * settingsTabs — SettingsLayout.tsx's tab list.
 *
 * ARS Round C P1-21 (F-41, 2026-08-23): the Free build showed a "License"
 * tab next to the working General/Security/SEO/Maintenance tabs even
 * though the Free edition needs no license key at all — LicenseManager's
 * own freeStub docblock states it plainly: "the Free edition has nothing
 * left for a license key to unlock — everything included already works,
 * no gate, no account." A tab that opens a static "nothing to activate"
 * panel is the same locked-control-shaped surface guidelines/01 §5 flags
 * for the Backup page (F-41's other half — see backupsPageProCopy.ts).
 * Extracted per this project's string-presence doctrine so vite.config.ts
 * can alias this module away in the Free build; the freeStub sibling
 * drops the "license" entry.
 */
import { SETTINGS_API_TAB_LABEL } from "./settingsApiTabLabel";

export interface SettingsTabDef {
  id: string;
  label: string;
}

export const SETTINGS_TABS: SettingsTabDef[] = [
  { id: "general", label: "General" },
  { id: "api", label: SETTINGS_API_TAB_LABEL },
  { id: "security", label: "Security" },
  { id: "seo", label: "SEO" },
  { id: "license", label: "License" },
  { id: "maintenance", label: "Maintenance" },
];
