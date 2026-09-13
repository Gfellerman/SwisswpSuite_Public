/**
 * Vitest coverage — Settings tab list (DIAG-EXPORT-SELFCHECK Phase 1,
 * VALIDATOR_V53_DIAG_EXPORT.md V-11 / A-8 lock, v2.9.33.53).
 *
 * A plain source assertion (no React render needed) that the Settings tab
 * list contains the tabs this build's screens rely on. "general" is the
 * positive control: a tab known to exist, proving the assertion technique
 * can find something.
 */
import { describe, it, expect } from "vitest";
import { SETTINGS_TABS } from "./settingsTabs";

function ids(tabs: { id: string }[]): string[] {
  return tabs.map((t) => t.id);
}

describe("settingsTabs", () => {
  it("positive control: 'general' is listed (proves the assertion technique works)", () => {
    expect(ids(SETTINGS_TABS)).toContain("general");
  });

  it("'diagnostics' is listed — the Self-Check panel's tab", () => {
    expect(ids(SETTINGS_TABS)).toContain("diagnostics");
  });

  it("every listed tab has a non-empty label", () => {
    for (const tab of SETTINGS_TABS) {
      expect(tab.label.length).toBeGreaterThan(0);
    }
  });
});
