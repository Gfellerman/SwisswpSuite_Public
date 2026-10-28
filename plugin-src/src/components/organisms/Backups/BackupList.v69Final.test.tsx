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
 * Backup list (final .69 pass, Free): a failed list request is said (FC-1,
 * T35), the full-backup type reads "Full" (FC-7, T40), and deleting a set whose
 * files the server could not remove says so and stays on screen (FC-6, T39).
 * The real BackupList and hooks over a mocked `wpApi`. No JSX.
 */
describe("BackupList — list request failed (FC-1, T35)", () => {
  it("AC-8: a rejected list request shows the load-failure line, not 'No backups stored on this site'", async () => {
    installApi(() => Promise.reject(new Error("Forbidden")));
    mount();
    expect(
      await screen.findByText(
        "Your backups could not be loaded. Reload the page to try again."
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByText("No backups stored on this site")
    ).not.toBeInTheDocument();
  });

  it("AC-8 control: an empty answer still shows 'No backups stored on this site' and no failure line", async () => {
    installApi(listOf([]));
    mount();
    expect(
      await screen.findByText("No backups stored on this site")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Backups you create with "Save Backup Now" above are listed here.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/one click away/)).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "Your backups could not be loaded. Reload the page to try again."
      )
    ).not.toBeInTheDocument();
  });
});

describe("BackupList — full backup wording (FC-7, T40)", () => {
  it("names a full backup 'Full backup' with the badge 'Full', never 'Complete'", async () => {
    installApi(listOf([archive("backup-full-0123456789abcdef.zip", "full")]));
    const { container } = mount();
    await screen.findByTitle("backup-full-0123456789abcdef.zip");
    const text = (container.textContent ?? "").replace(/\s+/g, " ");
    expect(text).toContain("Full backup");
    expect(screen.getByText("Full")).toBeInTheDocument();
    expect(text).not.toContain("Complete");
  });
});

describe("BackupList — deleting a set (FC-6, T39, LC-1)", () => {
  const SET = setRecord("set-9", ["backup-full-9999999999999999.zip"]);

  async function deleteTheSet(answer: unknown) {
    installApi(listOf([], [SET]), (path, opts) =>
      path === "/backup/sets/set-9/delete" && opts?.method === "POST"
        ? Promise.resolve(answer)
        : undefined
    );
    mount();
    const del = await screen.findByRole("button", {
      name: /^Delete backup set from/,
    });
    await act(async () => {
      del.click();
    });
    // the confirmation is a warning notice with a confirm action
    const confirm = toast.warning.mock.calls.find(
      ([, options]) => options && (options as any).action
    ) as unknown as [string, { action: { onClick: () => void } }];
    expect(confirm).toBeTruthy();
    toast.warning.mockClear();
    await act(async () => {
      confirm[1].action.onClick();
    });
  }

  it("AC-7: a file the server could not delete turns the success notice into a lasting warning", async () => {
    await deleteTheSet({
      success: true,
      skipped: ["backup-full-9999999999999999.zip (delete failed)"],
    });
    await waitFor(() =>
      expect(toast.warning).toHaveBeenCalledWith(
        "Backup set deleted, but 1 file(s) could not be removed from the server: backup-full-9999999999999999.zip.",
        { duration: Infinity }
      )
    );
    expect(toast.success).not.toHaveBeenCalledWith("Backup set deleted.");
  });

  it("AC-7: only the failed names are counted; a file that was already gone is not a failure", async () => {
    await deleteTheSet({
      success: true,
      skipped: [
        "a.zip (delete failed)",
        "b.zip (missing on disk)",
        "c.zip (delete failed)",
      ],
    });
    await waitFor(() =>
      expect(toast.warning).toHaveBeenCalledWith(
        "Backup set deleted, but 2 file(s) could not be removed from the server: a.zip, c.zip.",
        { duration: Infinity }
      )
    );
  });

  it.each([
    ["a text instead of a list", "oops"],
    ["entries that are not texts", [null, 5, { name: "x" }]],
    ["no list at all", undefined],
  ])(
    "AC-7 inversion: skipped as %s keeps the plain success notice",
    async (_label, skipped) => {
      await deleteTheSet({ success: true, skipped });
      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith("Backup set deleted.")
      );
      expect(toast.warning).not.toHaveBeenCalled();
    }
  );

  it("AC-7 control: a file already missing on disk keeps the plain success notice", async () => {
    await deleteTheSet({ success: true, skipped: ["a.zip (missing on disk)"] });
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Backup set deleted.")
    );
    expect(toast.warning).not.toHaveBeenCalled();
  });
});
