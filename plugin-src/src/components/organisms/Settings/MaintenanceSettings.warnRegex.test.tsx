/**
 * Vitest coverage for the [WARN]/[WARNING] tolerant level-filter fix (A-22,
 * DIAG-EMAIL E-1, VALIDATOR_DIAG_EMAIL.md §4 D1 / D3 note 2 / §10 A-22).
 *
 * Backend context (not touched by this file — a concurrent PHP executor
 * lane owns it): `SwissWPSuite_Diagnostics::normalize_level()` starts
 * writing new ring entries as `[WARNING]` instead of `[WARN]`. Historical
 * entries already in `swisswpsuite_debug_log` keep the old `[WARN]` tag
 * forever (§6.1 write-timeline — W3-W6 hand-build `[ERROR]` strings and
 * bypass normalize_level() entirely; nothing rewrites the ring in place).
 * `getLogLineClass()` in MaintenanceSettings.tsx previously matched only
 * `/\[WARNING\]/`, so every pre-existing `[WARN]` entry rendered with the
 * default emerald "info" color instead of the amber "warning" color —
 * exactly the N3 fix (2026-08-12) this component's own docblock describes,
 * silently regressed for one of the two live spellings.
 *
 * This test drives the REAL production render path — MaintenanceSettings
 * fetches `/system-logs` on mount and colors whatever it gets back — not a
 * reimplementation of getLogLineClass() (which is not exported).
 *
 * React-externalization workaround + wpApi mock: same pattern as
 * MaintenanceSettings.dropOrphanedTables.test.tsx (read there for the full
 * rationale). `/cache/status` is given a safe inert default because
 * fetchCacheStatus() also runs on mount.
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";

vi.mock("../../../lib/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("../../../services/api", () => ({
  wpApi: vi.fn(),
}));

type MaintenanceSettingsModule = typeof import("./MaintenanceSettings");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");
type ApiModule = typeof import("../../../services/api");

let MaintenanceSettings: MaintenanceSettingsModule["MaintenanceSettings"];
let render: TestingLibraryModule["render"];
let screen: TestingLibraryModule["screen"];
let cleanup: TestingLibraryModule["cleanup"];
let waitFor: TestingLibraryModule["waitFor"];
let React: ReactModule;
let wpApi: ApiModule["wpApi"];

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  const RealReact = nodeRequire("react");
  const RealReactDOM = nodeRequire("react-dom");
  const RealReactDOMClient = nodeRequire("react-dom/client");
  window.React = RealReact;
  window.ReactDOM = { ...RealReactDOM, ...RealReactDOMClient };

  ({ MaintenanceSettings } = await import("./MaintenanceSettings"));
  ({ render, screen, cleanup, waitFor } =
    await import("@testing-library/react"));
  ({ wpApi } = await import("../../../services/api"));
  React = await import("react");
});

const WARN_LEGACY_LINE =
  "[2026-09-01 10:00:00] [WARN] [LICENSE] VPS unreachable — within 72h grace period (10.0h remaining). License stays active.";
const WARNING_NEW_LINE =
  "[2026-09-04 10:00:00] [WARNING] [LICENSE] VPS unreachable — within 72h grace period (5.0h remaining). License stays active.";
const ERROR_LINE = "[2026-09-04 10:01:00] [ERROR] [BACKUP] Snapshot failed.";

function setupWpApiMock() {
  (wpApi as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (url: string) => {
      if (url === "/system-logs") {
        return Promise.resolve({
          logs: [WARN_LEGACY_LINE, WARNING_NEW_LINE, ERROR_LINE],
        });
      }
      if (url === "/cache/status") {
        return Promise.resolve({ detected: [], active: false });
      }
      return Promise.resolve({});
    }
  );
}

describe("MaintenanceSettings — System Logs [WARN]/[WARNING] tolerant color (A-22)", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    delete (window as any).swisswpsuiteData;
  });

  it("colors a historical [WARN] entry identically to a new [WARNING] entry (amber, not the default emerald info color)", async () => {
    setupWpApiMock();
    render(React.createElement(MaintenanceSettings));

    const warnLine = await waitFor(() => screen.getByText(WARN_LEGACY_LINE));
    const warningLine = await waitFor(() => screen.getByText(WARNING_NEW_LINE));

    // Class lives on the line's parent row (see MaintenanceSettings.tsx —
    // the message <span> is a plain sibling inside the classed row <div>).
    const warnRow = warnLine.closest("div")!;
    const warningRow = warningLine.closest("div")!;

    expect(warnRow.className).toContain("text-amber-800");
    expect(warnRow.className).toContain("dark:text-amber-400");
    expect(warnRow.className).toBe(warningRow.className);
    // Never the default "no level matched" info color.
    expect(warnRow.className).not.toContain("text-emerald-400/80");
  });

  it("still colors [ERROR] red — the tolerant WARN(ING) change must not swallow ERROR", async () => {
    setupWpApiMock();
    render(React.createElement(MaintenanceSettings));

    const errorLine = await waitFor(() => screen.getByText(ERROR_LINE));
    const errorRow = errorLine.closest("div")!;

    expect(errorRow.className).toContain("text-red-700");
    expect(errorRow.className).not.toContain("text-amber-800");
  });
});
