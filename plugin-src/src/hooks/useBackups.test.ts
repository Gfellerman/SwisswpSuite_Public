/**
 * Vitest coverage for useBackups()/useBackupSets()'s R15 F3 fix
 * (FIX_PLAN_RESTORER_R2_VALIDATED.md §4 "F3", condition C-F3-1; review
 * finding M-B in REVIEW_L13BC_2026-09-22.md).
 *
 * Bug being fixed: `restoreBackupMutation`'s and `restoreSetMutation`'s
 * onSuccess both call `window.location.reload()` when `data.db_restored` is
 * true, BEFORE the `db_notice`/`plugins_notice` branch a few lines below can
 * ever run. Any DB-import warning or repair sentence in `db_notice`,
 * `plugins_notice`, or the REST headline (`message`) reached the REST JSON,
 * the WP-CLI output, and the Diagnostics log — but never the web UI, because
 * the reload destroys this hook's React state before it renders anything.
 *
 * Fix (design option A from the plan, sessionStorage): before the reload,
 * when either notice is non-empty, `[message, db_notice, plugins_notice]`
 * (joined) is written to `sessionStorage['swisswpsuite_restore_summary']`.
 * `useBackups()`'s `restoreNotice` state gets a lazy, NON-DESTRUCTIVE
 * initializer that reads the key back — non-destructive because
 * `useBackups()` mounts up to three times on the real Backups page
 * (BackupsPage, BackupList, BackupControl) and a destructive read would only
 * let the first-mounted instance ever see the summary. The key is cleared on
 * `clearRestoreNotice()` (dismiss) and at the start of every restore mutation
 * (`onMutate`), so a stale summary from an earlier restore never resurfaces
 * after a later, clean one.
 *
 * "A fresh mount" below always means a brand new `renderHook(useBackups)`
 * call — the real-world equivalent of the full-page reload that
 * `window.location.reload()` performs (a fresh module/component tree reading
 * sessionStorage for the first time), not a re-render of an existing one.
 *
 * React-externalization workaround (read before editing): same pattern as
 * useSettings.test.ts / queryClient.test.ts / GeneralSettings.test.tsx — this
 * codebase externalizes React (WP.org Guideline 13); jsdom never loads
 * window.React, so the real npm react/react-dom is stamped onto those
 * globals in beforeAll BEFORE any aliased import runs (react-dom/client too,
 * since @tanstack/react-query's QueryClientProvider needs it). No JSX in this
 * file, React.createElement only.
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

type HooksModule = typeof import("./useBackups");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");
type ReactQueryModule = typeof import("@tanstack/react-query");
type ApiModule = typeof import("../services/api");

let useBackups: HooksModule["useBackups"];
let useBackupSets: HooksModule["useBackupSets"];
let renderHook: TestingLibraryModule["renderHook"];
let cleanup: TestingLibraryModule["cleanup"];
let act: TestingLibraryModule["act"];
let waitFor: TestingLibraryModule["waitFor"];
let React: ReactModule;
let QueryClient: ReactQueryModule["QueryClient"];
let QueryClientProvider: ReactQueryModule["QueryClientProvider"];
let wpApi: ApiModule["wpApi"];

const STORAGE_KEY = "swisswpsuite_restore_summary";

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  const RealReact = nodeRequire("react");
  const RealReactDOM = nodeRequire("react-dom");
  const RealReactDOMClient = nodeRequire("react-dom/client");
  window.React = RealReact;
  window.ReactDOM = { ...RealReactDOM, ...RealReactDOMClient };

  ({ useBackups, useBackupSets } = await import("./useBackups"));
  ({ renderHook, cleanup, act, waitFor } =
    await import("@testing-library/react"));
  ({ QueryClient, QueryClientProvider } =
    await import("@tanstack/react-query"));
  ({ wpApi } = await import("../services/api"));
  React = await import("react");
});

/** Default list-endpoint response — no missing-plugins report, empty list. */
function defaultListResponse(
  overrides: Record<string, unknown> = {}
): unknown {
  return {
    success: true,
    backups: [],
    sets: [],
    missing_plugins_report: null,
    ...overrides,
  };
}

/**
 * Routes wpApi calls by (url, method). `restoreResponse` is returned for
 * both the single-file restore endpoint and the set-restore endpoint, since
 * every test in this file exercises exactly one of them.
 */
function setupApiMock(options: {
  listResponse?: unknown;
  restoreResponse?: unknown;
} = {}) {
  const {
    listResponse = defaultListResponse(),
    restoreResponse = { success: true },
  } = options;

  (wpApi as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (url: string, opts?: RequestInit) => {
      if (url.startsWith("/backup/local/list")) {
        return Promise.resolve(listResponse);
      }
      if (url === "/backup/local/restore" && opts?.method === "POST") {
        return Promise.resolve(restoreResponse);
      }
      if (
        typeof url === "string" &&
        /^\/backup\/sets\/.+\/restore$/.test(url) &&
        opts?.method === "POST"
      ) {
        return Promise.resolve(restoreResponse);
      }
      if (url === "/backup/dismiss-missing-plugins-notice") {
        return Promise.resolve({ success: true });
      }
      return Promise.resolve({ success: true });
    }
  );
}

function newQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderUseBackups(queryClient = newQueryClient()) {
  return renderHook(() => useBackups(), {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children),
  });
}

function renderUseBackupSets(queryClient = newQueryClient()) {
  return renderHook(() => useBackupSets(), {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children),
  });
}

describe("useBackups()/useBackupSets() — R15 F3: restore summary survives the post-restore reload", () => {
  const reloadMock = vi.fn();
  // Snapshot of sessionStorage taken AT THE MOMENT reload() is called — the
  // only way to assert persist-then-reload ordering, since a mutant that
  // reorders the two statements would still leave storage populated by the
  // time the test's own assertions run after the mutation settles.
  let atReloadSnapshot: string | null | undefined;

  beforeAll(() => {
    // jsdom's window.location.reload() throws "Not implemented: navigation"
    // unless replaced. This hook's own contract is "call reload" — the
    // assertion is on the mock being invoked, not on any navigation actually
    // happening.
    Object.defineProperty(window, "location", {
      value: { ...window.location, reload: reloadMock },
      writable: true,
      configurable: true,
    });
    reloadMock.mockImplementation(() => {
      atReloadSnapshot = sessionStorage.getItem(STORAGE_KEY);
    });
  });

  beforeEach(() => {
    (window as any).swisswpsuiteData = {};
    sessionStorage.clear();
    reloadMock.mockClear();
    atReloadSnapshot = undefined;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("F3-1: a single-file restore with db_restored:true and a non-empty db_notice persists the summary BEFORE reload, and a fresh mount shows it", async () => {
    setupApiMock({
      restoreResponse: {
        success: true,
        db_restored: true,
        message: "Restoration complete!",
        db_notice: "4 values…",
        plugins_notice: "",
      },
    });

    const { result } = renderUseBackups();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.restoreBackup({ filename: "backup-1.zip" });
    });

    await waitFor(() => expect(reloadMock).toHaveBeenCalledTimes(1));
    // Ordering: storage already held the composed text AT THE MOMENT
    // reload() was invoked, not merely by the time this assertion runs.
    expect(atReloadSnapshot).toBe("Restoration complete! 4 values…");
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe(
      "Restoration complete! 4 values…"
    );

    // A fresh mount = the real-world equivalent of the reload's new page load.
    cleanup();
    const fresh = renderUseBackups();
    await waitFor(() => expect(fresh.result.current.isLoading).toBe(false));
    expect(fresh.result.current.restoreNotice).toBe(
      "Restoration complete! 4 values…"
    );
  });

  it("F3-2: a set restore (useBackupSets) with a notice persists the summary, and a fresh useBackups() mount shows it", async () => {
    setupApiMock({
      restoreResponse: {
        success: true,
        db_restored: true,
        message: "Restoration complete!",
        db_notice: "2 values…",
        plugins_notice: "",
      },
    });

    const { result } = renderUseBackupSets();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.restoreSet("set-1");
    });

    await waitFor(() => expect(reloadMock).toHaveBeenCalledTimes(1));
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe(
      "Restoration complete! 2 values…"
    );

    const fresh = renderUseBackups();
    await waitFor(() => expect(fresh.result.current.isLoading).toBe(false));
    expect(fresh.result.current.restoreNotice).toBe(
      "Restoration complete! 2 values…"
    );
  });

  it("F3-3: db_restored:true with both notices empty — reload happens, nothing is persisted, a fresh mount is null (clean restore, no banner)", async () => {
    setupApiMock({
      restoreResponse: {
        success: true,
        db_restored: true,
        message: "Restoration complete!",
        db_notice: "",
        plugins_notice: "",
      },
    });

    const { result } = renderUseBackups();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.restoreBackup({ filename: "backup-1.zip" });
    });

    await waitFor(() => expect(reloadMock).toHaveBeenCalledTimes(1));
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();

    const fresh = renderUseBackups();
    await waitFor(() => expect(fresh.result.current.isLoading).toBe(false));
    expect(fresh.result.current.restoreNotice).toBeNull();
  });

  it("F3-4: a stale summary from a PRIOR restore is removed by onMutate, so a later clean restore leaves a fresh mount null", async () => {
    sessionStorage.setItem(STORAGE_KEY, "OLD stale summary from before");

    setupApiMock({
      restoreResponse: {
        success: true,
        db_restored: true,
        message: "Restoration complete!",
        db_notice: "",
        plugins_notice: "",
      },
    });

    const { result } = renderUseBackups();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.restoreBackup({ filename: "backup-1.zip" });
    });

    // onMutate fires synchronously before the network call resolves.
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();

    await waitFor(() => expect(reloadMock).toHaveBeenCalledTimes(1));
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();

    const fresh = renderUseBackups();
    await waitFor(() => expect(fresh.result.current.isLoading).toBe(false));
    expect(fresh.result.current.restoreNotice).toBeNull();
  });

  it("F3-5: multiple mounted useBackups() instances (BackupsPage + BackupList shape) — a non-destructive read is seen by BOTH; clearRestoreNotice on one removes the key for a THIRD fresh mount", async () => {
    sessionStorage.setItem(STORAGE_KEY, "Restoration complete! seeded summary");
    setupApiMock();

    const queryClient = newQueryClient();
    const first = renderUseBackups(queryClient);
    const second = renderUseBackups(queryClient);

    await waitFor(() => expect(first.result.current.isLoading).toBe(false));
    await waitFor(() => expect(second.result.current.isLoading).toBe(false));

    // Both instances see the persisted summary — the read did not delete it.
    expect(first.result.current.restoreNotice).toBe(
      "Restoration complete! seeded summary"
    );
    expect(second.result.current.restoreNotice).toBe(
      "Restoration complete! seeded summary"
    );
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe(
      "Restoration complete! seeded summary"
    );

    act(() => {
      first.result.current.clearRestoreNotice();
    });

    await waitFor(() => expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull());

    const third = renderUseBackups(queryClient);
    await waitFor(() => expect(third.result.current.isLoading).toBe(false));
    expect(third.result.current.restoreNotice).toBeNull();
  });

  it("F3-6: sessionStorage.setItem throwing does not crash onSuccess — reload still fires, no persisted text", async () => {
    setupApiMock({
      restoreResponse: {
        success: true,
        db_restored: true,
        message: "Restoration complete!",
        db_notice: "4 values…",
        plugins_notice: "",
      },
    });

    const setItemSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new DOMException("blocked", "SecurityError");
      });

    const { result } = renderUseBackups();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(
      act(async () => {
        result.current.restoreBackup({ filename: "backup-1.zip" });
        await waitFor(() => expect(reloadMock).toHaveBeenCalledTimes(1));
      })
    ).resolves.not.toThrow();

    setItemSpy.mockRestore();
    // getItem still resolves through the real Storage — nothing was written.
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("F3-7: db_restored:false with a db_notice — unchanged in-place behaviour: no reload, notice text exactly as today, nothing persisted", async () => {
    setupApiMock({
      restoreResponse: {
        success: true,
        db_restored: false,
        message: "Files restored.",
        db_notice: "Database was not touched (files-only restore).",
        plugins_notice: "",
      },
    });

    const { result } = renderUseBackups();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.restoreBackup({ filename: "backup-1.zip" });
    });

    await waitFor(() =>
      expect(result.current.restoreNotice).toBe(
        "Database was not touched (files-only restore)."
      )
    );
    expect(reloadMock).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("F3-8: a persisted summary that includes plugins_notice is not duplicated by the missing_plugins_report effect (the `prev ?? …` guard at the effect)", async () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      "Restoration complete! 1 value… Note: 2 plugin(s) in this site's list of active plugins are not installed: foo, bar. They were left untouched — review them on the Plugins screen."
    );
    setupApiMock({
      listResponse: defaultListResponse({
        missing_plugins_report: {
          plugins: ["foo", "bar"],
          time: 1234567890,
        },
      }),
    });

    const { result } = renderUseBackups();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // The persisted summary is preserved verbatim — the effect's `prev ?? …`
    // guard sees a non-null prev (the persisted string) and does not
    // overwrite/duplicate it with a second copy of the missing-plugins text.
    expect(result.current.restoreNotice).toBe(
      "Restoration complete! 1 value… Note: 2 plugin(s) in this site's list of active plugins are not installed: foo, bar. They were left untouched — review them on the Plugins screen."
    );
  });

  it("U2: with no persisted summary, the missing_plugins_report effect builds the plugins sentence from the active-plugins list wording", async () => {
    setupApiMock({
      listResponse: defaultListResponse({
        missing_plugins_report: {
          plugins: ["foo", "bar"],
          time: 1234567890,
        },
      }),
    });

    const { result } = renderUseBackups();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.restoreNotice).toBe(
      "Note: 2 plugin(s) in this site's list of active plugins are not installed: foo, bar. They were left untouched — review them on the Plugins screen."
    );
  });

  it("F3-9: the wider class (review M-B) — a warnings-status restore's headline AND db_notice both reach the post-reload banner", async () => {
    setupApiMock({
      restoreResponse: {
        success: true,
        db_restored: true,
        message:
          "Database restored with warnings: 3 statement(s) may not have been applied. A safety copy of the pre-restore database was kept.",
        db_notice:
          "3 statement(s) targeting a table that does not exist in this backup were rejected.",
        plugins_notice: "",
      },
    });

    const { result } = renderUseBackups();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.restoreBackup({ filename: "backup-1.zip" });
    });

    await waitFor(() => expect(reloadMock).toHaveBeenCalledTimes(1));

    const fresh = renderUseBackups();
    await waitFor(() => expect(fresh.result.current.isLoading).toBe(false));
    expect(fresh.result.current.restoreNotice).toBe(
      "Database restored with warnings: 3 statement(s) may not have been applied. A safety copy of the pre-restore database was kept. 3 statement(s) targeting a table that does not exist in this backup were rejected."
    );
  });

  it("F3-11: a stale summary from a PRIOR restore is removed by the SET restore's onMutate too, so a later clean set restore leaves a fresh mount null", async () => {
    sessionStorage.setItem(STORAGE_KEY, "OLD stale summary from before");

    setupApiMock({
      restoreResponse: {
        success: true,
        db_restored: true,
        message: "Restoration complete!",
        db_notice: "",
        plugins_notice: "",
      },
    });

    const { result } = renderUseBackupSets();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.restoreSet("set-1");
    });

    // onMutate fires synchronously before the network call resolves.
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();

    await waitFor(() => expect(reloadMock).toHaveBeenCalledTimes(1));
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();

    const fresh = renderUseBackups();
    await waitFor(() => expect(fresh.result.current.isLoading).toBe(false));
    expect(fresh.result.current.restoreNotice).toBeNull();
  });

  it("F3-12: a set restore with db_restored:true and both notices empty persists nothing, matching the clean-reload behaviour", async () => {
    setupApiMock({
      restoreResponse: {
        success: true,
        db_restored: true,
        message: "Restoration complete!",
        db_notice: "",
        plugins_notice: "",
      },
    });

    const { result } = renderUseBackupSets();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.restoreSet("set-1");
    });

    await waitFor(() => expect(reloadMock).toHaveBeenCalledTimes(1));
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();

    const fresh = renderUseBackups();
    await waitFor(() => expect(fresh.result.current.isLoading).toBe(false));
    expect(fresh.result.current.restoreNotice).toBeNull();
  });

  it("F3-13: a single-file restore with db_restored:true, an empty db_notice, but a non-empty plugins_notice still persists the composed summary (plugins_notice is not dropped)", async () => {
    setupApiMock({
      restoreResponse: {
        success: true,
        db_restored: true,
        message: "Restoration complete!",
        db_notice: "",
        plugins_notice:
          "Note: 1 plugin(s) in this site's list of active plugins are not installed: foo. They were left untouched — review them on the Plugins screen.",
      },
    });

    const { result } = renderUseBackups();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.restoreBackup({ filename: "backup-1.zip" });
    });

    await waitFor(() => expect(reloadMock).toHaveBeenCalledTimes(1));
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe(
      "Restoration complete! Note: 1 plugin(s) in this site's list of active plugins are not installed: foo. They were left untouched — review them on the Plugins screen."
    );

    const fresh = renderUseBackups();
    await waitFor(() => expect(fresh.result.current.isLoading).toBe(false));
    expect(fresh.result.current.restoreNotice).toBe(
      "Restoration complete! Note: 1 plugin(s) in this site's list of active plugins are not installed: foo. They were left untouched — review them on the Plugins screen."
    );
  });

  it("F3-10: starting a set restore resets the sibling single-file notice, so a persisted OLD summary cannot mask this restore's own NEW in-place result (M-1)", async () => {
    // A DB-import restore left this persisted, and this mount's lazy
    // initializer picked it up — exactly what a real BackupList mount sees
    // after the reload from an earlier, warned restore.
    sessionStorage.setItem(
      STORAGE_KEY,
      "OLD: Database restored with warnings: 3 statement(s) may not have been applied."
    );

    setupApiMock({
      restoreResponse: {
        success: true,
        db_restored: false,
        message: "Files restored.",
        db_notice:
          "NEW: The database in this backup was not imported, so your existing database is unchanged.",
        plugins_notice: "",
      },
    });

    const queryClient = newQueryClient();
    const backups = renderUseBackups(queryClient);
    const sets = renderUseBackupSets(queryClient);

    await waitFor(() => expect(backups.result.current.isLoading).toBe(false));
    await waitFor(() => expect(sets.result.current.isLoading).toBe(false));

    expect(backups.result.current.restoreNotice).toBe(
      "OLD: Database restored with warnings: 3 statement(s) may not have been applied."
    );

    // Mirrors BackupList.tsx's handleRestoreSet onClick: reset the sibling
    // single-file notice before starting the set restore. Optional chaining
    // so this test fails honestly (activeBanner stays OLD) rather than
    // crashing when run against code that lacks resetRestoreNotice.
    await act(async () => {
      (
        backups.result.current as { resetRestoreNotice?: () => void }
      ).resetRestoreNotice?.();
      sets.result.current.restoreSet("set-1");
    });

    await waitFor(() =>
      expect(sets.result.current.restoreSetNotice).toBe(
        "NEW: The database in this backup was not imported, so your existing database is unchanged."
      )
    );

    // The composed banner BackupList.tsx renders: restoreNotice ?? restoreSetNotice.
    const activeBanner =
      backups.result.current.restoreNotice ?? sets.result.current.restoreSetNotice;
    expect(activeBanner).toBe(
      "NEW: The database in this backup was not imported, so your existing database is unchanged."
    );
    expect(reloadMock).not.toHaveBeenCalled();
  });
});
