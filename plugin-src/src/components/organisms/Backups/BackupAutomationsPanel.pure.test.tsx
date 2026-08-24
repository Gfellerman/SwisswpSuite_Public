/**
 * Vitest coverage for BackupAutomationsPanel's pure helper functions —
 * E2 fix (2026-08-20, FIX_PLAN_VALIDATION_BACKUP_SCHEDULER_2026-08-20 audit):
 * diffAutomationFormData() is the targeted-payload fix for the full-form
 * resubmission finding — only fields that changed vs. the automation being
 * edited are sent in a PATCH, so a rename-only or retention-only edit no
 * longer resends 'schedule' and triggers E4's forced cron re-register.
 *
 * This suite was the FIRST test coverage of ANY kind for this panel's pure
 * helpers (computeAvailableDestinations()/evaluateDestinationReset() were
 * already exported+documented as "unit-testable" but had no spec file in
 * this suite prior to this session — confirmed via a repo-wide grep for
 * "computeAvailableDestinations" across every test file returning nothing).
 * Included here for the same reason: they are pure, adjacent, and otherwise
 * still untested.
 *
 * React-externalization workaround (read before editing): identical to
 * PatchstackApiKeyField.test.tsx / LicenseManager.test.tsx — this codebase
 * externalizes React (WP.org Guideline 13), so "react"/"react-dom" are
 * Vite-aliased to shims reading a pre-existing `window.React`/`window.ReactDOM`
 * global. The pure functions under test don't render anything, but the
 * module they live in has top-level React-touching imports (icons, hooks),
 * so real npm react/react-dom are stamped onto those globals in `beforeAll`
 * BEFORE the dynamic import, matching the established convention — even
 * though nothing here calls React.createElement directly.
 */
import { createRequire } from "node:module";
import { describe, it, expect, beforeAll } from "vitest";
import type { BackupAutomation } from "../../../types";

type PanelModule = typeof import("./BackupAutomationsPanel");

let diffAutomationFormData: PanelModule["diffAutomationFormData"];
let computeAvailableDestinations: PanelModule["computeAvailableDestinations"];
let evaluateDestinationReset: PanelModule["evaluateDestinationReset"];

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  const RealReact = nodeRequire("react");
  const RealReactDOM = nodeRequire("react-dom");
  (globalThis as unknown as { window: typeof globalThis }).window ??=
    globalThis as unknown as typeof globalThis;
  (window as unknown as { React: unknown }).React = RealReact;
  (window as unknown as { ReactDOM: unknown }).ReactDOM = RealReactDOM;

  const mod = await import("./BackupAutomationsPanel");
  diffAutomationFormData = mod.diffAutomationFormData;
  computeAvailableDestinations = mod.computeAvailableDestinations;
  evaluateDestinationReset = mod.evaluateDestinationReset;
});

function makeAutomation(
  overrides: Partial<BackupAutomation> = {}
): BackupAutomation {
  return {
    id: "auto_test0001",
    name: "Daily Full",
    schedule: "daily",
    scope: "full",
    destination: "local",
    retention: 7,
    enabled: true,
    created_at: "2026-08-01 00:00:00",
    last_run_status: null,
    last_run_at: null,
    last_run_message: null,
    last_successful_at: null,
    next_run: "2026-08-21T00:00:00Z",
    start_time: null,
    start_day: null,
    ...overrides,
  };
}

describe("diffAutomationFormData — E2 targeted-payload fix", () => {
  it("returns an empty diff when nothing changed", () => {
    const original = makeAutomation();
    const form = {
      name: original.name,
      schedule: original.schedule,
      scope: original.scope,
      destination: original.destination,
      retention: original.retention,
      start_time: "",
      start_day: null,
    };
    expect(diffAutomationFormData(form, original)).toEqual({});
  });

  it("includes ONLY the changed field for a rename-only edit — schedule must NOT be present", () => {
    const original = makeAutomation();
    const form = {
      name: "Renamed Automation",
      schedule: original.schedule, // unchanged
      scope: original.scope,
      destination: original.destination,
      retention: original.retention,
      start_time: "",
      start_day: null,
    };
    const diff = diffAutomationFormData(form, original);
    expect(diff).toEqual({ name: "Renamed Automation" });
    expect(diff).not.toHaveProperty("schedule");
  });

  it("includes ONLY retention for a retention-only edit — schedule must NOT be present", () => {
    const original = makeAutomation();
    const form = {
      name: original.name,
      schedule: original.schedule,
      scope: original.scope,
      destination: original.destination,
      retention: 14,
      start_time: "",
      start_day: null,
    };
    const diff = diffAutomationFormData(form, original);
    expect(diff).toEqual({ retention: 14 });
    expect(diff).not.toHaveProperty("schedule");
  });

  it("includes schedule when the user genuinely changes it", () => {
    const original = makeAutomation({ schedule: "daily" });
    const form = {
      name: original.name,
      schedule: "weekly" as const,
      scope: original.scope,
      destination: original.destination,
      retention: original.retention,
      start_time: "",
      start_day: null,
    };
    expect(diffAutomationFormData(form, original)).toEqual({
      schedule: "weekly",
    });
  });

  it("does not spuriously diff start_time when the automation has never had one set (null vs empty-string normalization)", () => {
    const original = makeAutomation({ start_time: null, start_day: null });
    const form = {
      name: original.name,
      schedule: original.schedule,
      scope: original.scope,
      destination: original.destination,
      retention: original.retention,
      start_time: "", // form's "unset" representation
      start_day: null,
    };
    expect(diffAutomationFormData(form, original)).toEqual({});
  });

  it("includes start_time when the user sets one for the first time", () => {
    const original = makeAutomation({ start_time: null, start_day: null });
    const form = {
      name: original.name,
      schedule: original.schedule,
      scope: original.scope,
      destination: original.destination,
      retention: original.retention,
      start_time: "03:30",
      start_day: 0,
    };
    expect(diffAutomationFormData(form, original)).toEqual({
      start_time: "03:30",
      start_day: 0,
    });
  });

  it("includes multiple changed fields together, still omitting unchanged ones", () => {
    const original = makeAutomation({ name: "Old Name", retention: 5 });
    const form = {
      name: "New Name",
      schedule: original.schedule,
      scope: original.scope,
      destination: original.destination,
      retention: 10,
      start_time: "",
      start_day: null,
    };
    const diff = diffAutomationFormData(form, original);
    expect(diff).toEqual({ name: "New Name", retention: 10 });
  });
});

describe("computeAvailableDestinations (pre-existing, previously untested)", () => {
  it("always includes local, plus only connected providers", () => {
    expect(
      computeAvailableDestinations({
        gdrive: true,
        dropbox: false,
        s3: false,
        ftp: false,
        b2: false,
      })
    ).toEqual(["local", "gdrive"]);
  });
});

describe("evaluateDestinationReset (pre-existing, previously untested)", () => {
  it("never resets while providers are still loading", () => {
    expect(evaluateDestinationReset("gdrive", ["local"], true)).toEqual({
      shouldReset: false,
    });
  });

  it("resets once loading is done and the destination is unavailable", () => {
    expect(evaluateDestinationReset("gdrive", ["local"], false)).toEqual({
      shouldReset: true,
    });
  });
});
