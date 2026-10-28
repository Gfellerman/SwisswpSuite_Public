import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";

vi.mock("../../../services/api", () => ({
  wpApi: vi.fn(),
}));

vi.mock("../../../lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

type TL = typeof import("@testing-library/react");
let React: typeof import("react");
let render: TL["render"];
let screen: TL["screen"];
let cleanup: TL["cleanup"];
let act: TL["act"];
let waitFor: TL["waitFor"];
let QueryClient: (typeof import("@tanstack/react-query"))["QueryClient"];
let QueryClientProvider: (typeof import("@tanstack/react-query"))["QueryClientProvider"];
let BackupList: React.FC;
let wpApi: ReturnType<typeof vi.fn>;
let toast: Record<
  "success" | "error" | "warning" | "info",
  ReturnType<typeof vi.fn>
>;

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  window.React = nodeRequire("react");
  window.ReactDOM = {
    ...nodeRequire("react-dom"),
    ...nodeRequire("react-dom/client"),
  };
  ({ BackupList } = (await import("./BackupList")) as unknown as {
    BackupList: React.FC;
  });
  ({ render, screen, cleanup, act, waitFor } =
    await import("@testing-library/react"));
  ({ QueryClient, QueryClientProvider } =
    await import("@tanstack/react-query"));
  wpApi = (await import("../../../services/api"))
    .wpApi as unknown as ReturnType<typeof vi.fn>;
  toast = (await import("../../../lib/toast")).toast as unknown as typeof toast;
  React = await import("react");
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function archive(name: string, type = "full") {
  return {
    name,
    date: "2026-10-20",
    timestamp: 1_760_000_000,
    size: "1 MB",
    type,
    url: "",
    is_auto: false,
  };
}

function setRecord(id: string, filenames: string[]) {
  return {
    id,
    nonce: "n-" + id,
    trigger: "manual",
    scope: "full",
    created_at: 1_760_000_000,
    status: "complete",
    files: filenames.map((filename) => ({
      filename,
      category: "full",
      size: 1024,
      location: "local",
      human_size: "1 KB",
    })),
    total_size: 1024,
    tick_count: 1,
    elapsed: 1,
    human_size: "1 KB",
    human_elapsed: "1s",
    file_count: filenames.length,
  };
}

/** list: a function returning the list answer, or a rejection. */
function installApi(
  list: () => Promise<unknown>,
  extra: (
    url: string,
    opts?: RequestInit
  ) => Promise<unknown> | undefined = () => undefined
) {
  wpApi.mockImplementation((url: string, opts?: RequestInit) => {
    const path = String(url).split("?")[0];
    const handled = extra(path, opts);
    if (handled) return handled;
    if (path === "/backup/local/list") return list();
    if (path === "/backup/local/orphans") {
      return Promise.resolve({
        success: true,
        orphans: [],
        total_size: "0 B",
        total_count: 0,
        cloud_orphans: [],
      });
    }
    return Promise.resolve({ success: true });
  });
}

const listOf =
  (backups: unknown[], sets: unknown[] = []) =>
  () =>
    Promise.resolve({
      success: true,
      backups,
      sets,
      missing_plugins_report: null,
    });

function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    React.createElement(
      QueryClientProvider,
      { client },
      React.createElement(BackupList)
    )
  );
}

/**
 * L-2 (final .69 pass): every archive that no backup set lists keeps a row of
 * its own, whether or not some other set exists. A file copied into the backup
 * folder by hand is therefore always reachable from the list (Download,
 * Restore, Delete). Archives a set lists are shown inside that set only, in
 * both spellings (with and without ".enc").
 *
 * Production caller: the real BackupList with its real useBackups /
 * useBackupSets hooks over a mocked `wpApi`. No JSX.
 */
const OWN = "backup-full-aaaaaaaaaaaaaaaa.zip";
const OWN_PLAIN_TWIN = "backup-full-bbbbbbbbbbbbbbbb.zip";
const OWN_ENC_LISTED = "backup-full-bbbbbbbbbbbbbbbb.zip.enc";
const DR0 = "backup-full-0123456789abcdef.zip";
const DR1 = "backup-full-0123456789abcdef.001.zip";
const DRE = "backup-full-fedcba9876543210.zip.enc";

const restoreButtons = () =>
  screen.queryAllByRole("button", {
    name: /^Restore from backup file /,
  });

describe("BackupList — archives that belong to no set (L-2)", () => {
  it("AC-L2-4: with a set present, every archive the set does not list still has a row", async () => {
    installApi(
      listOf(
        [
          archive(OWN),
          archive(OWN_ENC_LISTED),
          archive(DR0),
          archive(DR1),
          archive(DRE),
        ],
        [setRecord("set-1", [OWN, OWN_PLAIN_TWIN])]
      )
    );
    mount();
    // the three copied-in files are listed (positive control for the query)
    expect(await screen.findByTitle(DR0)).toBeInTheDocument();
    expect(screen.getByTitle(DR1)).toBeInTheDocument();
    expect(screen.getByTitle(DRE)).toBeInTheDocument();
    // the set's own archives, in either spelling, are not repeated as rows
    expect(screen.queryByTitle(OWN)).not.toBeInTheDocument();
    expect(screen.queryByTitle(OWN_ENC_LISTED)).not.toBeInTheDocument();
    expect(restoreButtons()).toHaveLength(3);
  });

  it("AC-L2-5: with no set at all, every archive keeps its row", async () => {
    installApi(listOf([archive(DR0), archive(DR1)]));
    mount();
    expect(await screen.findByTitle(DR0)).toBeInTheDocument();
    expect(screen.getByTitle(DR1)).toBeInTheDocument();
    expect(restoreButtons()).toHaveLength(2);
  });

  it("an encrypted set file listed under its .enc name hides the plain twin", async () => {
    installApi(
      listOf(
        [archive("backup-full-cccccccccccccccc.zip"), archive(DR0)],
        [setRecord("set-2", ["backup-full-cccccccccccccccc.zip.enc"])]
      )
    );
    mount();
    expect(await screen.findByTitle(DR0)).toBeInTheDocument();
    expect(
      screen.queryByTitle("backup-full-cccccccccccccccc.zip")
    ).not.toBeInTheDocument();
    expect(restoreButtons()).toHaveLength(1);
  });

  it("L-2d: the three row buttons carry the file name, so rows made in the same minute have distinct names", async () => {
    installApi(listOf([archive(DR0), archive(DR1)]));
    mount();
    await screen.findByTitle(DR0);
    for (const name of [DR0, DR1]) {
      expect(
        screen.getByRole("button", { name: `Download ${name}` })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: `Restore from backup file ${name}` })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: `Delete backup file ${name}` })
      ).toBeInTheDocument();
    }
  });
});
