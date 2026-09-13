/**
 * The Settings screen's panel list.
 *
 * SettingsPage.tsx renders whichever entries below match the tab the user
 * has selected, in the order they appear here. Keeping the list in its own
 * module means a panel is added or taken out in one place, next to the tab id
 * it belongs to.
 */

import React from "react";
import { GeneralSettings } from "../components/organisms/Settings/GeneralSettings";
import { SmtpSettings } from "../components/organisms/Settings/SmtpSettings";
import { MaintenanceSettings } from "../components/organisms/Settings/MaintenanceSettings";
import { SelfCheckPanel } from "../components/organisms/Settings/SelfCheckPanel";
import { SeoSettings } from "../components/organisms/Settings/SeoSettings";
import { EncryptionSettings } from "../components/organisms/Settings/EncryptionSettings";
import { ScanCoverageSettings } from "../components/organisms/Settings/ScanCoverageSettings";
import type {
  SettingsScreenContext,
  SettingsScreenPanel,
} from "../components/organisms/Settings/settingsScreenPanel";

export const settingsScreenPanels: SettingsScreenPanel[] = [
  {
    tab: "general",
    id: "general",
    render: (ctx: SettingsScreenContext) => (
      <GeneralSettings
        settings={ctx.settings!}
        onSave={ctx.onSave}
        isSaving={ctx.isSaving}
      />
    ),
  },
  {
    tab: "general",
    id: "smtp",
    render: () => <SmtpSettings />,
  },
  {
    tab: "security",
    id: "encryption",
    render: (ctx: SettingsScreenContext) => (
      <EncryptionSettings settings={ctx.settings!} onSave={ctx.onSave} />
    ),
  },
  {
    tab: "security",
    id: "scan-coverage",
    render: (ctx: SettingsScreenContext) => (
      <ScanCoverageSettings settings={ctx.settings!} onSave={ctx.onSave} />
    ),
  },
  {
    tab: "seo",
    id: "seo",
    render: (ctx: SettingsScreenContext) => (
      <SeoSettings settings={ctx.settings!} onSave={ctx.onSave} />
    ),
  },
  {
    tab: "maintenance",
    id: "maintenance",
    render: (ctx: SettingsScreenContext) => (
      <MaintenanceSettings
        settings={ctx.settings!}
        onSave={ctx.onSave}
        isSaving={ctx.isSaving}
      />
    ),
  },
  {
    tab: "diagnostics",
    id: "diagnostics",
    render: () => <SelfCheckPanel />,
  },
];
