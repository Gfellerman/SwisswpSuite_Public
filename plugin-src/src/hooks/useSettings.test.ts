/**
 * Vitest coverage for useSettings()'s SET-F1 client-half fix
 * (post-submission QA round 1, v2.9.33.59, Lane 6, Task 6.1).
 *
 * Backend contract (Lane 4, LANE_L4_REPORT.md, Task 4.1 — read at source
 * before writing this test): `POST /settings` 200 body changes from
 * `{success: true}` to `{success: true, settings_version: string}`. GET
 * /settings already returns `settings_version` (SET-031, pre-existing).
 *
 * Bug being fixed: before this lane, `onSuccess` only called
 * `queryClient.invalidateQueries({queryKey: ["settings"]})` — which
 * schedules an asynchronous background refetch. If a second
 * `updateSettings()` call fires before that refetch lands (a realistic
 * "type, blur, type, blur" or rapid-toggle sequence in the same tab), its
 * mutationFn reads the STALE `settings.settings_version` still sitting in
 * the query cache and sends it as `_settings_version` — the backend's
 * optimistic-concurrency check (SET-031) then legitimately rejects it as a
 * conflict with 409, even though no other session touched anything. The
 * fix writes the fresh `settings_version` from the mutation response
 * directly into the `["settings"]` cache via `queryClient.setQueryData`
 * BEFORE invalidating, so the very next mutationFn call already sees the
 * up-to-date version with no round trip needed.
 *
 * This test drives the REAL hook (`useSettings()`) through
 * `@testing-library/react`'s `renderHook`, against a mocked `wpApi` that
 * behaves like the real backend's optimistic-concurrency check: every
 * POST must carry the CURRENT server-side version in `_settings_version`,
 * or the mock returns 409, mirroring class-swisswpsuite-api-settings.php's
 * real behaviour (unchanged by this lane, read at :750-762 to confirm).
 *
 * React-externalization workaround (read before editing): same pattern as
 * queryClient.test.ts / GeneralSettings.test.tsx — this codebase
 * externalizes React (WP.org Guideline 13); jsdom never loads
 * window.React, so the real npm react/react-dom is stamped onto those
 * globals in beforeAll BEFORE any aliased import runs (react-dom/client
 * too, since @tanstack/react-query's QueryClientProvider needs it). No
 * JSX in this file, React.createElement only.
 */
import { createRequire } from "node:module";
import {
  describe,
  it,
  expect,
  afterEach,
  beforeAll,
  beforeEach,
  vi,
} from "vitest";

vi.mock("../lib/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("../services/api", () => ({
  wpApi: vi.fn(),
}));

type HooksModule = typeof import("./useSettings");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");
type ReactQueryModule = typeof import("@tanstack/react-query");
type ApiModule = typeof import("../services/api");
type ToastModule = typeof import("../lib/toast");

let useSettings: HooksModule["useSettings"];
let renderHook: TestingLibraryModule["renderHook"];
let cleanup: TestingLibraryModule["cleanup"];
let act: TestingLibraryModule["act"];
let waitFor: TestingLibraryModule["waitFor"];
let React: ReactModule;
let QueryClient: ReactQueryModule["QueryClient"];
let QueryClientProvider: ReactQueryModule["QueryClientProvider"];
let wpApi: ApiModule["wpApi"];
let toast: ToastModule["toast"];

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  const RealReact = nodeRequire("react");
  const RealReactDOM = nodeRequire("react-dom");
  const RealReactDOMClient = nodeRequire("react-dom/client");
  window.React = RealReact;
  window.ReactDOM = { ...RealReactDOM, ...RealReactDOMClient };

  ({ useSettings } = await import("./useSettings"));
  ({ renderHook, cleanup, act, waitFor } =
    await import("@testing-library/react"));
  ({ QueryClient, QueryClientProvider } =
    await import("@tanstack/react-query"));
  ({ wpApi } = await import("../services/api"));
  ({ toast } = await import("../lib/toast"));
  React = await import("react");
});

const BASE_FIELDS = {
  emailNotifications: true,
  loginMaxRetries: 5,
  coreIntegrityEnabled: true,
  abandonedPluginCheckEnabled: true,
  pageviewTrackingEnabled: false,
};

/**
 * A mock backend that enforces the SAME optimistic-concurrency rule the
 * real PHP endpoint does: a POST must carry the server's CURRENT version
 * in `_settings_version`, or it is rejected with 409 — regardless of
 * whether this test's hook instance sent it (mirrors "another tab").
 */
function setupServerMock() {
  let serverVersion = "v1";
  let versionCounter = 1;
  const postCalls: Array<{ body: Record<string, unknown> }> = [];

  (wpApi as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (url: string, opts?: RequestInit) => {
      if (url === "/settings" && (!opts || opts.method === undefined)) {
        return Promise.resolve({
          ...BASE_FIELDS,
          settings_version: serverVersion,
        });
      }
      if (url === "/settings" && opts?.method === "POST") {
        const body = JSON.parse((opts.body as string) ?? "{}");
        postCalls.push({ body });
        if (
          body._settings_version !== undefined &&
          body._settings_version !== serverVersion
        ) {
          const err: Error & { status?: number } = new Error(
            "Settings were modified by another session. Reloading latest settings..."
          );
          err.status = 409;
          return Promise.reject(err);
        }
        versionCounter += 1;
        serverVersion = `v${versionCounter}`;
        return Promise.resolve({
          success: true,
          settings_version: serverVersion,
        });
      }
      return Promise.resolve({ success: true });
    }
  );

  return {
    postCalls,
    /** Simulates a write from a SECOND tab/session that this hook never sees. */
    bumpServerVersionFromAnotherSession: () => {
      versionCounter += 1;
      serverVersion = `v${versionCounter}`;
    },
  };
}

function renderUseSettings() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return renderHook(() => useSettings(), {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children),
  });
}

describe("useSettings() — SET-F1 client half: settings_version written to cache before invalidate", () => {
  beforeEach(() => {
    (window as any).swisswpsuiteData = {};
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("F1: two updateSettings() mutations fired back to back both reach the server with the correct version and neither 409s", async () => {
    const { postCalls } = setupServerMock();
    const { result } = renderUseSettings();

    await waitFor(() => {
      expect((result.current.settings as any)?.settings_version).toBe("v1");
    });

    // Mutation 1 — fired and awaited to completion.
    await act(async () => {
      await result.current.updateSettings({ emailNotifications: false });
    });

    // THE regression assertion, part 1: the cache must already reflect the
    // fresh version the moment mutation 1's onSuccess has run — via the
    // synchronous setQueryData write, NOT via waiting out
    // invalidateQueries' background refetch round trip. waitFor here is a
    // tight React-commit-flush wait, not a network wait — it is not
    // testing "did a background refetch eventually complete".
    await waitFor(() => {
      expect((result.current.settings as any)?.settings_version).toBe("v2");
    });

    // Immediately fire mutation 2 — this is exactly the "type, blur, type,
    // blur" rapid-save sequence SET-F1 is about. If onSuccess only
    // invalidated (pre-fix), the cache would still read settings_version
    // "v1" here regardless of the wait above.
    await act(async () => {
      await result.current.updateSettings({ emailNotifications: true });
    });

    expect(postCalls).toHaveLength(2);
    expect(postCalls[0].body._settings_version).toBe("v1");
    // THE regression assertion: mutation 2 must carry "v2" (the version
    // mutation 1's response returned), not the stale "v1" it started with.
    expect(postCalls[1].body._settings_version).toBe("v2");

    // Neither call hit the conflict path.
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it("F1-control: a genuinely stale version (simulating a second tab) still 409s and still shows the conflict toast", async () => {
    const { postCalls, bumpServerVersionFromAnotherSession } =
      setupServerMock();
    const { result } = renderUseSettings();

    await waitFor(() => {
      expect((result.current.settings as any)?.settings_version).toBe("v1");
    });

    // A second tab/session saves independently — this hook's cache never
    // sees it, so its next save will carry a version the server no longer
    // recognises as current.
    bumpServerVersionFromAnotherSession();

    // mutateAsync() rejects (in addition to invoking onError) on a real
    // 409 — expected here; the assertions below are what matter.
    await act(async () => {
      await result.current
        .updateSettings({ emailNotifications: false })
        .catch(() => {});
    });

    expect(postCalls).toHaveLength(1);
    expect(postCalls[0].body._settings_version).toBe("v1"); // stale, as sent
    expect(toast.warning).toHaveBeenCalledTimes(1);
  });
});
