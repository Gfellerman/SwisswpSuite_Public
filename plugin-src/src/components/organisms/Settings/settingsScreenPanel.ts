import type React from "react";
import type { SwissSettings } from "../../../hooks/useSettings";

/** What the Settings screen hands to each panel it renders. */
export interface SettingsScreenContext {
  /** Current settings payload; undefined only before the first fetch lands. */
  settings: SwissSettings | undefined;
  /** Persist a partial settings change. */
  onSave: (settings: Partial<SwissSettings>) => Promise<unknown>;
  /** True while a save is in flight. */
  isSaving: boolean;
  /** True while the settings fetch is failing. */
  isError: boolean;
  /** The tab id the user has selected. */
  activeTab: string;
}

/** One panel on the Settings screen. */
export interface SettingsScreenPanel {
  /** Tab id this panel belongs to. */
  tab: string;
  /** Stable key for the rendered element. */
  id: string;
  /** Render the panel for the given screen state. */
  render: (ctx: SettingsScreenContext) => React.ReactNode;
}
