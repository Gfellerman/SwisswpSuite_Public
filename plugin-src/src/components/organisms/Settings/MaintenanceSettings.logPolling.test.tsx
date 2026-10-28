/**
 * Vitest coverage for MaintenanceSettings' SET-F3 fix (post-submission QA
 * round 1, v2.9.33.59, Lane 6, Task 6.5).
 *
 * Bug being fixed (FINDINGS_REGISTER.md SET-F3, MaintenanceSettings.tsx:341):
 * `/system-logs` was polled unconditionally every 5 seconds, forever —
 * including while the browser tab is hidden/backgrounded, where the
 * result is never seen. Each call deserialises two 500-entry log rings on
 * the PHP side. This fix (a) raises the interval to 15s and (b) gates the
 * poll on `document.visibilityState === "visible"`, resuming immediately
 * on `visibilitychange` back to visible rather than waiting out the rest
 * of the interval.
 *
 * This test drives the REAL production component (`MaintenanceSettings`)
 * mounted directly — its own `useEffect` polling loop, not a
 * reimplementation. Fake timers are used (precedented in this codebase —
 * see src/lib/toast.test.tsx) because this fix's assertions are about
 * exact interval timing (15000ms) and visibility gating, which real
 * timers would make slow and flaky.
 *
 * React-externalization workaround (read before editing): same pattern as
 * MaintenanceSettings.warnRegex.test.tsx.
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
let cleanup: TestingLibraryModule["cleanup"];
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
  ({ render, cleanup } = await import("@testing-library/react"));
  ({ wpApi } = await import("../../../services/api"));
  React = await import("react");
});

function setupWpApiMock() {
  (wpApi as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (url: string) => {
      if (url === "/system-logs") {
        return Promise.resolve({ logs: [] });
      }
      if (url === "/cache/status") {
        return Promise.resolve({ detected: [], active: false });
      }
      return Promise.resolve({});
    }
  );
}

function systemLogsCallCount() {
  return (wpApi as unknown as ReturnType<typeof vi.fn>).mock.calls.filter(
    ([url]: [string]) => url === "/system-logs"
  ).length;
}

/** jsdom's `document.visibilityState` is a read-only getter; override it. */
function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
}

describe("MaintenanceSettings — /system-logs polling SET-F3 (Task 6.5)", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
    setVisibility("visible");
  });

  it("F5a: polls /system-logs every 15s, not 5s", async () => {
    vi.useFakeTimers();
    setupWpApiMock();
    render(React.createElement(MaintenanceSettings));

    expect(systemLogsCallCount()).toBe(1); // mount-time fetch

    await vi.advanceTimersByTimeAsync(5000);
    expect(systemLogsCallCount()).toBe(1); // NOT at the old 5s mark

    await vi.advanceTimersByTimeAsync(9999); // total 14999ms
    expect(systemLogsCallCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(1); // total 15000ms
    expect(systemLogsCallCount()).toBe(2);
  });

  it("F5b: no fetch fires while document.visibilityState is 'hidden'", async () => {
    vi.useFakeTimers();
    setupWpApiMock();
    render(React.createElement(MaintenanceSettings));
    expect(systemLogsCallCount()).toBe(1);

    setVisibility("hidden");
    // Two full interval periods elapse while hidden.
    await vi.advanceTimersByTimeAsync(30000);
    expect(systemLogsCallCount()).toBe(1);
  });

  it("F5c: fetching resumes immediately on visibilitychange back to visible", async () => {
    vi.useFakeTimers();
    setupWpApiMock();
    render(React.createElement(MaintenanceSettings));
    expect(systemLogsCallCount()).toBe(1);

    setVisibility("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(100);
    expect(systemLogsCallCount()).toBe(1); // going hidden must not itself fetch

    setVisibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(0);
    // Resumed immediately — did not wait out the remainder of the 15s tick.
    expect(systemLogsCallCount()).toBe(2);
  });
});
