/**
 * File rows (an archive that no backup set lists, such as one copied in by hand)
 * name the file in their confirmations and say what their date is. A file row's
 * date is the file's own timestamp, which is not necessarily the day the backup
 * was made, so the Created cell says what it shows and the confirmations name
 * the file instead of a date.
 *
 * Drives the real BackupList with its real hooks over a mocked `wpApi` and a
 * mocked toast module. No JSX.
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
});

const TS = 1700000000;
const PART1 = "backup-full-0123456789abcdef.001.zip";
const PART0 = "backup-full-0123456789abcdef.zip";
const CREATED_NOTE = "The file's last-modified date";

function archive(name: string, type: string) {
  return {
    name,
    date: "2023-11-14",
    timestamp: TS,
    size: "1 MB",
    type,
    url: "",
  };
}

function backupSet() {
  return {
    id: "set_one",
    nonce: "n1",
    trigger: "manual",
    scope: "full",
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

async function clickAndReadToast(buttonName: RegExp) {
  const button = await screen.findByRole("button", { name: buttonName });
  await act(async () => {
    button.click();
  });
  expect(toast.warning).toHaveBeenCalledTimes(1);
  return (toast.warning as ReturnType<typeof vi.fn>).mock.calls[0] as [
    string,
    { action: { label: string; onClick: () => void } },
  ];
}

const RESTORE_CONFIRM = (name: string) =>
  `This will replace your current files with the files in the backup file ${name}. Your existing files will be overwritten. If it holds a database copy, that copy is not imported; your current database is not replaced. This cannot be undone.`;

describe("BackupList (Free) — file rows name the file (F-2)", () => {
  it("Delete on a file row asks about the file, not about a date", async () => {
    mountList({ backups: [archive(PART1, "files")] });
    const [text, options] = await clickAndReadToast(/^Delete backup file /);
    expect(text).toBe(
      `Delete the backup file ${PART1}? This cannot be undone.`
    );
    expect(text).not.toContain("backup from");
    expect(options.action.label).toBe("Yes, delete this file");
  });

  it("Restore on a file row of every type names the file", async () => {
    for (const type of ["files", "unknown", "full"]) {
      cleanup();
      vi.clearAllMocks();
      mountList({ backups: [archive(PART0, type)] });
      const [text] = await clickAndReadToast(/^Restore from backup file /);
      expect(text).toBe(RESTORE_CONFIRM(PART0));
      expect(text).not.toContain("backup from");
    }
  });

  it("a file name is shown as written, whatever characters it holds", async () => {
    const odd = "my backup (1) $& 'x' \"y\".zip";
    mountList({ backups: [archive(odd, "unknown")] });
    const [text] = await clickAndReadToast(/^Delete backup file /);
    expect(text).toBe(`Delete the backup file ${odd}? This cannot be undone.`);
  });

  it("a database-only file row keeps its signed restore text", async () => {
    mountList({ backups: [archive("backup-db-0123456789abcdef.zip", "db")] });
    const [text] = await clickAndReadToast(/^Restore from backup file /);
    expect(text).toBe(
      "This backup holds only a database copy, which this plugin does not import. Your posts, pages and files will not change."
    );
  });

  it("the Created cell of a file row shows, under the date, a line saying what the date is", async () => {
    const { container } = mountList({
      backups: [archive(PART0, "unknown"), archive(PART1, "files")],
      sets: [backupSet()],
    });
    await screen.findByTitle(PART0);
    const lines = screen.getAllByText(CREATED_NOTE);
    // one line per file row, none for the set row
    expect(lines).toHaveLength(2);
    lines.forEach((line) => {
      const cell = line.closest("td");
      expect(cell).not.toBeNull();
      expect(cell?.textContent).toContain("2023"); // the date itself is in the same cell
      expect(cell?.textContent?.endsWith(CREATED_NOTE)).toBe(true); // and the line comes after it
      expect(
        line
          .closest("tr")
          ?.querySelector(`[title="${PART0}"], [title="${PART1}"]`)
      ).not.toBeNull();
      // visible at every width: no responsive hiding and no screen-reader-only class
      expect(line.className).not.toMatch(/hidden|sr-only/);
      expect(line.className).toContain("text-xs");
    });
    // the text is in the page, not in a hover attribute
    expect(container.querySelectorAll("[title]").length).toBeGreaterThan(0);
    expect(screen.queryAllByTitle(CREATED_NOTE)).toHaveLength(0);
    expect(container.querySelector(`[title="${CREATED_NOTE}"]`)).toBeNull();
  });

  it("the set row's Created cell is unchanged", async () => {
    mountList({ sets: [backupSet()] });
    await screen.findByText(/Manual|Scheduled/);
    expect(screen.queryByText(CREATED_NOTE)).not.toBeInTheDocument();
  });

  it("the set delete confirm is unchanged", async () => {
    mountList({ sets: [backupSet()] });
    const [text, options] = await clickAndReadToast(/^Delete backup set from/);
    expect(text).toContain("Delete the backup set from ");
    expect(options.action.label).toBe("Yes, delete this set");
  });
});
