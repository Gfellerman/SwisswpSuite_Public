/**
 * S34 (truth-sweep lane SW-B), Free build: a backup set row shows how long the
 * backup was processed, not when it "completed" (the number adds up the time
 * of the engine's runs and leaves out the waits between them).
 *
 * Drives the real BackupList with its real data hooks over a mocked `wpApi`.
 * React.createElement only.
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
let React: typeof import("react");
let QueryClient: any;
let QueryClientProvider: any;
let wpApi: any;

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  window.React = nodeRequire("react");
  window.ReactDOM = {
    ...nodeRequire("react-dom"),
    ...nodeRequire("react-dom/client"),
  };
  ({ BackupList } = await import("./BackupList"));
  ({ render, cleanup, screen } = await import("@testing-library/react"));
  ({ QueryClient, QueryClientProvider } =
    await import("@tanstack/react-query"));
  ({ wpApi } = await import("../../../services/api"));
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

const SET = {
  id: "set_full",
  nonce: "n1",
  trigger: "manual",
  scope: "full",
  created_at: 1700000000,
  status: "complete",
  files: [],
  total_size: 1024,
  tick_count: 1,
  elapsed: 83,
  human_size: "1 MB",
  human_elapsed: "1m 23s",
  file_count: 3,
};

describe("BackupList (Free) — set row duration label (S34)", () => {
  it("reads 'Processing time 1m 23s', not 'Completed in'", async () => {
    (wpApi as any).mockImplementation((url: string) => {
      if (typeof url === "string" && url.startsWith("/backup/local/list")) {
        return Promise.resolve({
          success: true,
          backups: [],
          sets: [SET],
          missing_plugins_report: null,
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
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const { container } = render(
      React.createElement(
        QueryClientProvider,
        { client: qc },
        React.createElement(BackupList, null)
      )
    );

    // positive control: the set row rendered (its Restore button is there)
    await screen.findByRole("button", { name: /restore/i });
    const text = (container.textContent ?? "").replace(/\s+/g, " ");
    expect(text).toContain("Processing time 1m 23s");
    expect(text).not.toContain("Completed in");
  });
});
