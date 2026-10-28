/**
 * V63-V3-3 follow-up (single-archive delete must never fail silently).
 * Placed identically in both builds:
 *   plugin/src/components/organisms/Backups/BackupList.deleteError.v63.test.tsx
 *   pro-overlay/src/components/organisms/Backups/BackupList.deleteError.v63.test.tsx
 *
 * Production flow: on the Backups page, "Delete" on an archive row asks
 * "Delete the backup from <date>? ..." in a notice; its "Yes, delete this
 * backup" action posts /backup/local/delete. The admin app runs every page in
 * the ONE QueryClient exported by lib/queryClient.ts, whose mutations are
 * sent once (no automatic retry). A failed delete (a proxy timeout, a 500, a
 * 200 body with success:false) therefore has to tell the person, otherwise
 * the row just stays and nothing explains why.
 * No JSX (React externalisation).
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
let React: typeof import("react");
let render: TL["render"];
let screen: TL["screen"];
let cleanup: TL["cleanup"];
let act: TL["act"];
let waitFor: TL["waitFor"];
let QueryClientProvider: (typeof import("@tanstack/react-query"))["QueryClientProvider"];
let productionClient: (typeof import("../../../lib/queryClient"))["queryClient"];
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
  ({ QueryClientProvider } = await import("@tanstack/react-query"));
  ({ queryClient: productionClient } =
    await import("../../../lib/queryClient"));
  wpApi = (await import("../../../services/api"))
    .wpApi as unknown as ReturnType<typeof vi.fn>;
  toast = (await import("../../../lib/toast")).toast as unknown as typeof toast;
  React = await import("react");
});

afterEach(() => {
  cleanup();
  productionClient.clear();
  vi.clearAllMocks();
});

// `is_auto` is read by the Pro list only; the Free list ignores it.
const BACKUP = {
  name: "backup_1.zip",
  date: "2024-01-01",
  timestamp: 1700000000,
  size: "1 MB",
  type: "full",
  url: "",
  is_auto: false,
};

function installApi(deleteResult: () => Promise<unknown>) {
  wpApi.mockImplementation((url: string, opts?: RequestInit) => {
    const path = String(url).split("?")[0];
    if (path === "/backup/local/list") {
      return Promise.resolve({
        success: true,
        backups: [BACKUP],
        sets: [],
        missing_plugins_report: null,
      });
    }
    if (path === "/backup/local/orphans") {
      return Promise.resolve({
        success: true,
        orphans: [],
        total_size: "0 B",
        total_count: 0,
        cloud_orphans: [],
      });
    }
    if (path === "/backup/local/delete" && opts?.method === "POST") {
      return deleteResult();
    }
    return Promise.resolve({ success: true });
  });
}

const callsTo = (path: string, method?: string) =>
  wpApi.mock.calls.filter(
    ([url, opts]) =>
      String(url).split("?")[0] === path &&
      (method === undefined ||
        (opts as RequestInit | undefined)?.method === method)
  );

function mount() {
  return render(
    React.createElement(
      QueryClientProvider,
      { client: productionClient },
      React.createElement(BackupList)
    )
  );
}

/** Click "Delete" on the archive row, then confirm in the notice it raises. */
async function deleteFirstArchive() {
  const del = await screen.findByRole(
    "button",
    { name: /^Delete backup file / },
    { timeout: 3000 }
  );
  await act(async () => {
    del.click();
  });
  expect(toast.warning).toHaveBeenCalled();
  const last = toast.warning.mock.calls.at(-1) as unknown as [
    string,
    { action: { onClick: () => void } },
  ];
  await act(async () => {
    last[1].action.onClick();
  });
}

const proxyTimeout = () =>
  Promise.reject(new Error("Request failed with status 524"));

describe("V63-V3-3 follow-up: a failed single-archive delete tells the person (production QueryClient)", () => {
  it("a proxy timeout produces exactly one POST and exactly one error notice with the reason", async () => {
    installApi(proxyTimeout);
    mount();
    await deleteFirstArchive();
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1), {
      timeout: 3000,
    });
    expect(toast.error).toHaveBeenCalledWith(
      "Delete failed: Request failed with status 524"
    );
    // Past the default retry delay: nothing was re-sent, no second notice.
    await new Promise((r) => setTimeout(r, 1300));
    expect(callsTo("/backup/local/delete", "POST")).toHaveLength(1);
    expect(toast.error).toHaveBeenCalledTimes(1);
    // The archive is still listed: the failure did not remove it from the screen.
    expect(
      screen.getByRole("button", { name: /^Delete backup file / })
    ).toBeInTheDocument();
  });

  it("a server refusal (success:false surfaced as an error) shows its own message", async () => {
    installApi(() =>
      Promise.reject(new Error("Backup file could not be deleted."))
    );
    mount();
    await deleteFirstArchive();
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1), {
      timeout: 3000,
    });
    expect(toast.error).toHaveBeenCalledWith(
      "Delete failed: Backup file could not be deleted."
    );
    expect(callsTo("/backup/local/delete", "POST")).toHaveLength(1);
  });

  it("a successful delete shows no error notice and refreshes the list", async () => {
    installApi(() => Promise.resolve({ success: true }));
    mount();
    await screen.findByRole(
      "button",
      { name: /^Delete backup file / },
      { timeout: 3000 }
    );
    const listBefore = callsTo("/backup/local/list").length;
    await deleteFirstArchive();
    await waitFor(
      () =>
        expect(callsTo("/backup/local/list").length).toBeGreaterThan(
          listBefore
        ),
      { timeout: 3000 }
    );
    expect(callsTo("/backup/local/delete", "POST")).toHaveLength(1);
    expect(toast.error).not.toHaveBeenCalled();
  });
});
