/**
 * Restore confirmation chosen by backup type (U43).
 *
 * The backup list's Restore button raises a confirmation through the toast
 * module. A backup that holds only a database copy must not claim that files
 * will be replaced (restore writes files only and the database copy is never
 * imported); a full or files backup keeps the existing confirmation
 * byte-for-byte.
 *
 * Drives the real BackupList with its real useBackups/useBackupSets hooks
 * over a mocked `wpApi`, for both a legacy single archive (type "db") and a
 * backup set (scope "db"). No JSX.
 */
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
let BackupList: any;
let render: TL["render"];
let cleanup: TL["cleanup"];
let screen: TL["screen"];
let act: TL["act"];
let React: typeof import("react");
let QueryClient: any;
let QueryClientProvider: any;
let wpApi: any;
let toast: any;

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  window.React = nodeRequire("react");
  window.ReactDOM = {
    ...nodeRequire("react-dom"),
    ...nodeRequire("react-dom/client"),
  };
  ({ BackupList } = await import("./BackupList"));
  ({ render, cleanup, screen, act } = await import("@testing-library/react"));
  ({ QueryClient, QueryClientProvider } =
    await import("@tanstack/react-query"));
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
    // best-effort
  }
});

const TS = 1700000000;

const DB_ONLY =
  "This backup holds only a database copy, which this plugin does not import. Your posts, pages and files will not change.";

const FILES_CONFIRM_SINGLE = (name: string) =>
  `This will replace your current files with the files in the backup file ${name}. Your existing files will be overwritten. If it holds a database copy, that copy is not imported; your current database is not replaced. This cannot be undone.`;

const FILES_CONFIRM_SET = (when: string, n: number) =>
  `Restore the backup created ${when}? This backup set has ${n} archive file${n !== 1 ? "s" : ""}; the site files in it will be restored to disk. If it also holds a database copy, that copy is not imported; your current database is not replaced. This cannot be undone.`;

function archive(type: "full" | "files" | "db") {
  return {
    name: `backup_${type}.zip`,
    date: "2023-11-14",
    timestamp: TS,
    size: "1 MB",
    type,
    url: "",
  };
}

function backupSet(scope: "full" | "files" | "db") {
  return {
    id: `set_${scope}`,
    nonce: "n1",
    trigger: "manual",
    scope,
    created_at: TS,
    status: "complete",
    files: [],
    total_size: 1024,
    tick_count: 1,
    elapsed: 1,
    human_size: "1 MB",
    human_elapsed: "1s",
    file_count: 1,
  };
}

function mountList(listBody: Record<string, unknown>) {
  (wpApi as any).mockImplementation((url: string) => {
    if (typeof url === "string" && url.startsWith("/backup/local/list")) {
      return Promise.resolve({
        success: true,
        backups: [],
        sets: [],
        missing_plugins_report: null,
        ...listBody,
      });
    }
    if (url === "/backup/local/orphans") {
      return Promise.resolve({
        success: true,
        orphans: [],
        total_size: "0 B",
        total_count: 0,
      });
    }
    return Promise.resolve({ success: true });
  });
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(BackupList, null)
    )
  );
}

async function clickRestoreAndReadConfirm(buttonName: RegExp): Promise<string> {
  const button = await screen.findByRole("button", { name: buttonName });
  await act(async () => {
    button.click();
  });
  expect(toast.warning).toHaveBeenCalledTimes(1);
  return (toast.warning as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
}

const formatWhen = (ts: number) =>
  new Date(ts * 1000).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

describe("BackupList (Free) — restore confirmation by backup type (U43)", () => {
  it("single archive, type 'db': the confirmation is the signed database-only text", async () => {
    mountList({ backups: [archive("db")] });
    const text = await clickRestoreAndReadConfirm(/^Restore from backup file /);
    expect(text).toBe(DB_ONLY);
    expect(text).not.toContain("replace your current files");
  });

  it("single archive, type 'full': the signed files confirmation (L5), byte for byte", async () => {
    mountList({ backups: [archive("full")] });
    const text = await clickRestoreAndReadConfirm(/^Restore from backup file /);
    expect(text).toBe(FILES_CONFIRM_SINGLE("backup_full.zip"));
  });

  it("single archive, type 'files': the signed files confirmation (L5), byte for byte", async () => {
    mountList({ backups: [archive("files")] });
    const text = await clickRestoreAndReadConfirm(/^Restore from backup file /);
    expect(text).toBe(FILES_CONFIRM_SINGLE("backup_files.zip"));
  });

  it("backup set, scope 'db': the confirmation is the signed database-only text", async () => {
    mountList({ sets: [backupSet("db")] });
    const text = await clickRestoreAndReadConfirm(
      /Restore site from backup set created/
    );
    expect(text).toBe(DB_ONLY);
    expect(text).not.toContain("will be restored to disk");
  });

  it("backup set, scope 'full': the signed set confirmation (S31), byte for byte", async () => {
    mountList({ sets: [backupSet("full")] });
    const text = await clickRestoreAndReadConfirm(
      /Restore site from backup set created/
    );
    expect(text).toBe(FILES_CONFIRM_SET(formatWhen(TS), 1));
  });

  it("backup set, scope 'files': the signed set confirmation (S31), byte for byte", async () => {
    mountList({ sets: [backupSet("files")] });
    const text = await clickRestoreAndReadConfirm(
      /Restore site from backup set created/
    );
    expect(text).toBe(FILES_CONFIRM_SET(formatWhen(TS), 1));
  });

  it("backup set with 3 archive files: the signed set confirmation counts archive files in the plural (S31)", async () => {
    mountList({ sets: [{ ...backupSet("full"), file_count: 3 }] });
    const text = await clickRestoreAndReadConfirm(
      /Restore site from backup set created/
    );
    expect(text).toBe(FILES_CONFIRM_SET(formatWhen(TS), 3));
    expect(text).toContain("This backup set has 3 archive files;");
    expect(text).not.toContain("All 3 files");
  });
});
