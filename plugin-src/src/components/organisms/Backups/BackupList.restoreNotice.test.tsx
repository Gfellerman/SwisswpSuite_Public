/**
 * Vitest coverage for BackupList's restore-notice composition.
 *
 * Bug being fixed: a set-level restore that ran on a site with a missing-
 * plugins report ends up with TWO independent notice carriers holding
 * different text — `restoreSetNotice` (the database sentence plus this
 * restore's own plugins sentence) and `restoreNotice` (refilled from the
 * list endpoint's persisted `missing_plugins_report` the moment the
 * invalidated query refetches). The old selector, `restoreNotice ??
 * restoreSetNotice`, always prefers `restoreNotice` when it is non-null —
 * which it is here — so the database sentence never reaches the screen.
 * Dismissing that banner (X) only cleared `restoreNotice`, so the selector
 * then fell through to the still-populated `restoreSetNotice` and a second
 * banner reappeared with the same two sentences.
 *
 * Fix: `composeRestoreNotices()`
 * returns whichever notice exists; when both exist and one's text contains
 * the other's, it returns the containing (longer) one; otherwise it joins
 * both so no text is ever silently dropped. The dismiss handler now clears
 * both `restoreNotice` and `restoreSetNotice` together.
 *
 * "A fresh mount" below always means a brand-new render() call, mirroring
 * the real Backups page's `useBackups()` mounting up to three times
 * independently (BackupsPage, BackupList, BackupControl).
 *
 * React-externalization workaround (read before editing): same pattern as
 * BackupControl.completeToast.test.tsx / useBackups.test.ts — this codebase
 * externalizes React (WP.org Guideline 13); jsdom never loads window.React,
 * so the real npm react/react-dom is stamped onto those globals in
 * beforeAll BEFORE any aliased import runs. No JSX in this file,
 * React.createElement only.
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import {
  describe,
  it,
  expect,
  afterEach,
  beforeAll,
  beforeEach,
  vi,
} from "vitest";

vi.mock("../../../services/api", () => ({
  wpApi: vi.fn(),
}));

vi.mock("../../../lib/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

type BackupListModule = typeof import("./BackupList");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");
type ReactQueryModule = typeof import("@tanstack/react-query");
type ApiModule = typeof import("../../../services/api");
type ToastModule = typeof import("../../../lib/toast");
type BackupSetType = import("../../../types").BackupSet;
type BackupArchiveType = import("../../../types").BackupArchive;

let BackupList: BackupListModule["BackupList"];
let render: TestingLibraryModule["render"];
let cleanup: TestingLibraryModule["cleanup"];
let act: TestingLibraryModule["act"];
let waitFor: TestingLibraryModule["waitFor"];
let screen: TestingLibraryModule["screen"];
let React: ReactModule;
let QueryClient: ReactQueryModule["QueryClient"];
let QueryClientProvider: ReactQueryModule["QueryClientProvider"];
let wpApi: ApiModule["wpApi"];
let toast: ToastModule["toast"];

const STORAGE_KEY = "swisswpsuite_restore_summary";

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  const RealReact = nodeRequire("react");
  const RealReactDOM = nodeRequire("react-dom");
  const RealReactDOMClient = nodeRequire("react-dom/client");
  window.React = RealReact;
  window.ReactDOM = { ...RealReactDOM, ...RealReactDOMClient };

  ({ BackupList } = await import("./BackupList"));
  ({ render, cleanup, act, waitFor, screen } = await import(
    "@testing-library/react"
  ));
  ({ QueryClient, QueryClientProvider } = await import(
    "@tanstack/react-query"
  ));
  ({ wpApi } = await import("../../../services/api"));
  ({ toast } = await import("../../../lib/toast"));
  React = await import("react");
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  try {
    sessionStorage.clear();
  } catch {
    // best-effort, matches the hook's own try/catch discipline
  }
});

// ── Fixtures ─────────────────────────────────────────────────────────────────

const SET: BackupSetType = {
  id: "set_1",
  nonce: "nonce_1",
  trigger: "manual",
  scope: "full",
  created_at: 1700000000,
  status: "complete",
  files: [],
  total_size: 1024,
  tick_count: 1,
  elapsed: 1,
  human_size: "1 MB",
  human_elapsed: "1s",
  file_count: 1,
};

const BACKUP: BackupArchiveType = {
  name: "backup_1.zip",
  date: "2024-01-01",
  timestamp: 1700000000,
  size: "1 MB",
  type: "full",
  url: "",
};

/** Exactly the string useBackups.ts's formatMissingPluginsNotice() produces
 *  for a single-plugin report — kept in lockstep so containment checks in
 *  L13F-1/-2 are meaningful, not accidental. */
const PL =
  "Note: 1 plugin(s) in this site's list of active plugins are not installed: foo/foo.php. They were left untouched — review them on the Plugins screen.";

/** A differently-worded plugins sentence, as a translated PHP build would
 *  send in the restore response's plugins_notice (L13F-5: no containment). */
const PL_TRANSLATED =
  "Remarque : 1 module(s) référencé(s) par la base de données restaurée ne sont pas installés sur ce site.";

const DB =
  "The database in this backup was not imported — this restore only replaced files.";

const OLD =
  "OLD: Database restored with warnings from an earlier restore that has nothing to do with this one.";

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

function orphansResponse(): unknown {
  return {
    success: true,
    orphans: [],
    total_size: "0 B",
    total_count: 0,
  };
}

/**
 * Routes wpApi calls by (url, method). `listResponses` is consumed in
 * sequence, one entry per GET /backup/local/list call; the last entry
 * repeats for every call beyond the array's length (mirrors the plan's
 * "call 1 … call 2 on" wording).
 */
function setupApiMock(
  options: {
    listResponses?: unknown[];
    restoreResponse?: unknown;
    setRestoreResponse?: unknown;
  } = {}
) {
  const {
    listResponses = [defaultListResponse()],
    restoreResponse = { success: true },
    setRestoreResponse = restoreResponse,
  } = options;

  let listCallCount = 0;

  (wpApi as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (url: string, opts?: RequestInit) => {
      if (typeof url === "string" && url.startsWith("/backup/local/list")) {
        const idx = Math.min(listCallCount, listResponses.length - 1);
        listCallCount += 1;
        return Promise.resolve(listResponses[idx]);
      }
      if (url === "/backup/local/orphans") {
        return Promise.resolve(orphansResponse());
      }
      if (url === "/backup/local/restore" && opts?.method === "POST") {
        return Promise.resolve(restoreResponse);
      }
      if (
        typeof url === "string" &&
        /^\/backup\/sets\/.+\/restore$/.test(url) &&
        opts?.method === "POST"
      ) {
        return Promise.resolve(setRestoreResponse);
      }
      if (url === "/backup/dismiss-missing-plugins-notice") {
        return Promise.resolve({ success: true });
      }
      return Promise.resolve({ success: true });
    }
  );
}

function dismissCallCount(): number {
  return (wpApi as unknown as ReturnType<typeof vi.fn>).mock.calls.filter(
    ([url]: [string]) => url === "/backup/dismiss-missing-plugins-notice"
  ).length;
}

function newQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderBackupList() {
  const queryClient = newQueryClient();
  return render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(BackupList, null)
    )
  );
}

/** The dismiss (X) button's visual container — NOT document.body, because
 *  the always-mounted sr-only live region duplicates the banner's text and
 *  would make a body-wide text assertion pass for the wrong reason. */
function getBanner(): HTMLElement {
  const dismissButton = screen.getByRole("button", { name: "Dismiss notice" });
  return dismissButton.parentElement!.parentElement!;
}

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

beforeEach(() => {
  (toast.warning as unknown as ReturnType<typeof vi.fn>).mockClear();
});

describe("BackupList (Free) — restore notice composition", () => {
  it("L13F-1: a set restore in place with both notices shows the database sentence AND the plugins sentence exactly once, then dismiss clears both", async () => {
    setupApiMock({
      listResponses: [
        defaultListResponse({ sets: [SET] }),
        defaultListResponse({
          sets: [SET],
          missing_plugins_report: { plugins: ["foo/foo.php"], time: 2 },
        }),
      ],
      setRestoreResponse: {
        success: true,
        message: "Restoration complete!",
        db_restored: false,
        db_notice: DB,
        plugins_notice: PL,
      },
    });

    renderBackupList();

    const restoreButton = await screen.findByRole("button", {
      name: /Restore site from backup set created/,
    });
    await act(async () => {
      restoreButton.click();
    });

    expect(toast.warning).toHaveBeenCalled();
    const lastCall = (toast.warning as unknown as ReturnType<typeof vi.fn>)
      .mock.calls.at(-1) as [string, { action: { onClick: () => void } }];
    await act(async () => {
      lastCall[1].action.onClick();
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Dismiss notice" })).toBeInTheDocument();
    });

    const banner = getBanner();
    expect(banner.textContent).toContain(DB);
    expect(countOccurrences(banner.textContent ?? "", PL)).toBe(1);

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(DB);
    });

    expect(dismissCallCount()).toBe(0);

    const dismissButton = screen.getByRole("button", { name: "Dismiss notice" });
    await act(async () => {
      dismissButton.click();
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Dismiss notice" })
      ).not.toBeInTheDocument();
    });
    expect(dismissCallCount()).toBe(1);
  });

  it("L13F-2 (H-A): a stale persisted summary from an earlier restore is gone once the set restore's own notices land, and dismiss endpoint stays untouched during the restore", async () => {
    sessionStorage.setItem(STORAGE_KEY, OLD);

    setupApiMock({
      listResponses: [
        defaultListResponse({ sets: [SET] }),
        defaultListResponse({
          sets: [SET],
          missing_plugins_report: { plugins: ["foo/foo.php"], time: 2 },
        }),
      ],
      setRestoreResponse: {
        success: true,
        message: "Restoration complete!",
        db_restored: false,
        db_notice: DB,
        plugins_notice: PL,
      },
    });

    renderBackupList();

    // OLD is visible on mount (lazy init reads sessionStorage non-destructively).
    await waitFor(() => {
      expect(getBanner().textContent).toContain(OLD);
    });

    const restoreButton = await screen.findByRole("button", {
      name: /Restore site from backup set created/,
    });
    await act(async () => {
      restoreButton.click();
    });

    const lastCall = (toast.warning as unknown as ReturnType<typeof vi.fn>)
      .mock.calls.at(-1) as [string, { action: { onClick: () => void } }];
    await act(async () => {
      lastCall[1].action.onClick();
    });

    await waitFor(() => {
      expect(getBanner().textContent).not.toContain("OLD:");
      expect(getBanner().textContent).toContain(DB);
    });

    expect(dismissCallCount()).toBe(0);
  });

  it("L13F-3 LOCK: a single-file restore in place with both notices shows the database sentence and the plugins sentence", async () => {
    setupApiMock({
      listResponses: [defaultListResponse({ backups: [BACKUP] })],
      restoreResponse: {
        success: true,
        message: "Restoration complete!",
        db_restored: false,
        db_notice: DB,
        plugins_notice: PL,
      },
    });

    renderBackupList();

    const restoreButton = await screen.findByRole("button", {
      name: /^Restore from backup file /,
    });
    await act(async () => {
      restoreButton.click();
    });

    const lastCall = (toast.warning as unknown as ReturnType<typeof vi.fn>)
      .mock.calls.at(-1) as [string, { action: { onClick: () => void } }];
    await act(async () => {
      lastCall[1].action.onClick();
    });

    await waitFor(() => {
      const banner = getBanner();
      expect(banner.textContent).toContain(DB);
      expect(banner.textContent).toContain(PL);
    });
  });

  it("L13F-4 LOCK: mount with no restore and a pre-existing report shows the plugins sentence; dismiss clears it in one call", async () => {
    setupApiMock({
      listResponses: [
        defaultListResponse({
          missing_plugins_report: { plugins: ["foo/foo.php"], time: 2 },
        }),
      ],
    });

    renderBackupList();

    await waitFor(() => {
      expect(getBanner().textContent).toContain(PL);
    });

    const dismissButton = screen.getByRole("button", { name: "Dismiss notice" });
    await act(async () => {
      dismissButton.click();
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Dismiss notice" })
      ).not.toBeInTheDocument();
    });
    expect(dismissCallCount()).toBe(1);
  });

  it("L13F-5: a translated site's differently-worded plugins sentence is never lost — both sentences survive alongside the database sentence", async () => {
    setupApiMock({
      listResponses: [
        defaultListResponse({ sets: [SET] }),
        defaultListResponse({
          sets: [SET],
          missing_plugins_report: { plugins: ["foo/foo.php"], time: 2 },
        }),
      ],
      setRestoreResponse: {
        success: true,
        message: "Restoration complete!",
        db_restored: false,
        db_notice: DB,
        plugins_notice: PL_TRANSLATED,
      },
    });

    renderBackupList();

    const restoreButton = await screen.findByRole("button", {
      name: /Restore site from backup set created/,
    });
    await act(async () => {
      restoreButton.click();
    });

    const lastCall = (toast.warning as unknown as ReturnType<typeof vi.fn>)
      .mock.calls.at(-1) as [string, { action: { onClick: () => void } }];
    await act(async () => {
      lastCall[1].action.onClick();
    });

    await waitFor(() => {
      const banner = getBanner();
      expect(banner.textContent).toContain(DB);
      expect(banner.textContent).toContain(PL_TRANSLATED);
      expect(banner.textContent).toContain(PL);
    });
  });
});
