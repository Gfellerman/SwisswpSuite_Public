/**
 * V63-V3-3 (sealed spec, lane V3 BACKUP, .63 sweep).
 * Target path: plugin/src/hooks/useBackups.noAutoRetry.v63.test.ts
 *
 * Production flow: the admin app wraps every page in the ONE QueryClient
 * exported by lib/queryClient.ts (index.tsx). A backup create, a restore or a
 * set restore that fails (a proxy timeout, a 500, or a 200 body with
 * success:false, which wpApi also throws on) must be sent to the server once.
 * The user decides whether to try again; the browser never re-sends a
 * destructive request by itself.
 *
 * Runs in both builds: with SWISSWPSUITE_OVERLAY=../pro-overlay/src the
 * `./useBackups` import resolves to the Pro copy of the hook.
 */
import { createRequire } from "node:module";
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";

vi.mock("../lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock("../lib/errorReporting", () => ({
  isOwnScript: () => false,
  sendError: vi.fn(),
}));

vi.mock("../services/api", () => ({
  wpApi: vi.fn(),
}));

type HooksModule = typeof import("./useBackups");
type TL = typeof import("@testing-library/react");

let useBackups: HooksModule["useBackups"];
let useBackupSets: HooksModule["useBackupSets"];
let renderHook: TL["renderHook"];
let cleanup: TL["cleanup"];
let act: TL["act"];
let waitFor: TL["waitFor"];
let React: typeof import("react");
let QueryClientProvider: typeof import("@tanstack/react-query")["QueryClientProvider"];
let productionClient: typeof import("../lib/queryClient")["queryClient"];
let wpApi: ReturnType<typeof vi.fn>;

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  window.React = nodeRequire("react");
  window.ReactDOM = {
    ...nodeRequire("react-dom"),
    ...nodeRequire("react-dom/client"),
  };
  ({ useBackups, useBackupSets } = await import("./useBackups"));
  ({ renderHook, cleanup, act, waitFor } = await import("@testing-library/react"));
  ({ QueryClientProvider } = await import("@tanstack/react-query"));
  ({ queryClient: productionClient } = await import("../lib/queryClient"));
  wpApi = (await import("../services/api")).wpApi as unknown as ReturnType<typeof vi.fn>;
  React = await import("react");
});

afterEach(() => {
  cleanup();
  productionClient.clear();
  vi.clearAllMocks();
});

const FAILING = new Set([
  "/backup/local/create",
  "/backup/local/restore",
  "/backup/sets/set_0123456789ab/restore",
]);

function installApi(failure: () => Promise<never>) {
  wpApi.mockImplementation((url: string, opts?: RequestInit) => {
    const path = String(url).split("?")[0];
    if (path === "/backup/local/list") {
      return Promise.resolve({ success: true, backups: [], sets: [], missing_plugins_report: null });
    }
    if (FAILING.has(path) && opts?.method === "POST") {
      return failure();
    }
    return Promise.resolve({ success: true });
  });
}

function postsTo(path: string): number {
  return wpApi.mock.calls.filter(
    ([url, opts]) => String(url).split("?")[0] === path && (opts as RequestInit | undefined)?.method === "POST",
  ).length;
}

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: productionClient }, children);

const proxyTimeout = () => Promise.reject(new Error("Request failed with status 524"));
const serverRefusal = () => Promise.reject(new Error("Restore failed: archive could not be read."));

describe("V63-V3-3: destructive backup requests are sent once (production QueryClient)", () => {
  it.each([
    ["proxy timeout", proxyTimeout],
    ["server refusal", serverRefusal],
  ])("restore of one archive (%s): one POST", async (_label, failure) => {
    installApi(failure);
    const { result } = renderHook(() => useBackups(), { wrapper });
    act(() => {
      result.current.restoreBackup({ filename: "backup-full-2026-10-01.zip" } as never);
    });
    await waitFor(() => expect(result.current.restoreError).toBeTruthy(), { timeout: 5000 });
    await new Promise((r) => setTimeout(r, 1300));
    expect(postsTo("/backup/local/restore")).toBe(1);
  });

  it("backup create (proxy timeout): one POST, so no second backup job is started", async () => {
    installApi(proxyTimeout);
    const { result } = renderHook(() => useBackups(), { wrapper });
    act(() => {
      result.current.createBackup({ scope: "full" } as never);
    });
    await waitFor(() => expect(result.current.createError).toBeTruthy(), { timeout: 5000 });
    await new Promise((r) => setTimeout(r, 1300));
    expect(postsTo("/backup/local/create")).toBe(1);
  });

  it("set restore (proxy timeout): one POST", async () => {
    installApi(proxyTimeout);
    const { result } = renderHook(() => useBackupSets(), { wrapper });
    act(() => {
      result.current.restoreSet("set_0123456789ab");
    });
    await waitFor(
      () => expect(postsTo("/backup/sets/set_0123456789ab/restore")).toBeGreaterThanOrEqual(1),
      { timeout: 5000 },
    );
    await waitFor(() => expect(result.current.isRestoringSet).toBe(false), { timeout: 5000 });
    await new Promise((r) => setTimeout(r, 1300));
    expect(postsTo("/backup/sets/set_0123456789ab/restore")).toBe(1);
  });
});

describe("V63-V3-3 lock: the production client never re-sends a mutation by default", () => {
  it("mutations default to no automatic retry", () => {
    const retry = productionClient.getDefaultOptions().mutations?.retry;
    expect(retry === 0 || retry === false).toBe(true);
  });
});
