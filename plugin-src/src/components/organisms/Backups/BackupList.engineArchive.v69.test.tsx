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
let QueryClient: (typeof import("@tanstack/react-query"))["QueryClient"];
let QueryClientProvider: (typeof import("@tanstack/react-query"))["QueryClientProvider"];
let BackupList: React.FC;
let wpApi: ReturnType<typeof vi.fn>;

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
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  ({ QueryClient, QueryClientProvider } =
    await import("@tanstack/react-query"));
  wpApi = (await import("../../../services/api"))
    .wpApi as unknown as ReturnType<typeof vi.fn>;
  React = await import("react");
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function archive(name: string, type: string) {
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

function installApi(list: () => Promise<unknown>) {
  wpApi.mockImplementation((url: string) => {
    const path = String(url).split("?")[0];
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

const listOf = (backups: unknown[]) => () =>
  Promise.resolve({
    success: true,
    backups,
    sets: [],
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

const PART0 = "backup-full-0123456789abcdef.zip";
const PART1 = "backup-full-0123456789abcdef.001.zip";

/**
 * Engine-named archives copied into the backup folder (AC-L2C-6): the list route
 * cannot tell what a part 0 holds, so its row says so in plain words and never
 * prints the raw type word. The real BackupList with its real hooks over a
 * mocked `wpApi`. No JSX.
 */
describe("BackupList — rows of engine-named archives (AC-L2C-6)", () => {
  it("a part 0 whose contents were not read reads 'Backup file' with the badge 'Contents not checked'", async () => {
    installApi(listOf([archive(PART0, "unknown")]));
    const { container } = mount();
    await screen.findByTitle(PART0);
    const text = (container.textContent ?? "").replace(/\s+/g, " ");
    expect(text).toContain("Backup file");
    expect(text).toContain("Contents not checked");
    expect(text.toLowerCase()).not.toContain("unknown");
    expect(text).not.toContain("Full backup");
    expect(text).not.toContain("Complete");
  });

  it("a continuation part reads 'Files only' with the badge 'Files Only'", async () => {
    installApi(listOf([archive(PART1, "files")]));
    const { container } = mount();
    await screen.findByTitle(PART1);
    const text = (container.textContent ?? "").replace(/\s+/g, " ");
    expect(text).toContain("Files only");
    expect(text).toContain("Files Only");
    expect(text).not.toContain("Contents not checked");
  });

  it("both kinds of row keep Download, Restore and Delete", async () => {
    installApi(listOf([archive(PART0, "unknown"), archive(PART1, "files")]));
    mount();
    await screen.findByTitle(PART0);
    expect(screen.getAllByRole("button", { name: /^Download/ })).toHaveLength(
      2
    );
    expect(screen.getAllByRole("button", { name: /^Restore/ })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /^Delete/ })).toHaveLength(2);
  });
});

/**
 * A3 (WCAG 4.1.3): when the list request fails and there is nothing to show, the
 * failure sentence is announced. The role sits on a span inside the table cell,
 * not on the cell.
 */
describe("BackupList — the load-failure line is announced (A3)", () => {
  const MESSAGE =
    "Your backups could not be loaded. Reload the page to try again.";

  it("the failure text sits inside role=alert, inside a table cell that keeps its own role", async () => {
    installApi(() => Promise.reject(new Error("Forbidden")));
    mount();
    const alert = await screen.findByRole("alert");
    expect((alert.textContent ?? "").replace(/\s+/g, " ").trim()).toBe(MESSAGE);
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    const cell = alert.closest("td");
    expect(cell).not.toBeNull();
    expect(cell).not.toBe(alert);
    expect(cell?.getAttribute("role")).toBeNull();
  });

  it("control: an empty answer is not announced as a failure", async () => {
    installApi(listOf([]));
    mount();
    expect(
      await screen.findByText("No backups stored on this site")
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
