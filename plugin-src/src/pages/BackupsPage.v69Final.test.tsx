import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";

/**
 * Backups page callout (final .69 pass, FC-1 / AC-8, FC-3 / T37): the "no
 * stored backup" callout appears only after the list request has settled with
 * an empty list; not while it is pending, not after it failed. The real page
 * and the real useBackups hook over a mocked `wpApi`; the two data-heavy
 * children are replaced. No JSX.
 */
vi.mock("../components/organisms/Backups/BackupControl", () => ({
  BackupControl: () => null,
}));
vi.mock("../components/organisms/Backups/BackupList", () => ({
  BackupList: () => null,
}));
vi.mock("../services/api", () => ({ wpApi: vi.fn() }));
vi.mock("../lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

type TL = typeof import("@testing-library/react");
let BackupsPage: React.ComponentType;
let render: TL["render"];
let screen: TL["screen"];
let cleanup: TL["cleanup"];
let waitFor: TL["waitFor"];
let QueryClient: any;
let QueryClientProvider: any;
let wpApi: ReturnType<typeof vi.fn>;
let React: typeof import("react");

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  window.React = nodeRequire("react");
  window.ReactDOM = {
    ...nodeRequire("react-dom"),
    ...nodeRequire("react-dom/client"),
  };
  ({ default: BackupsPage } = await import("./BackupsPage"));
  ({ render, screen, cleanup, waitFor } =
    await import("@testing-library/react"));
  ({ QueryClient, QueryClientProvider } =
    await import("@tanstack/react-query"));
  wpApi = (await import("../services/api")).wpApi as unknown as ReturnType<
    typeof vi.fn
  >;
  React = await import("react");
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const ANY_CALLOUT = /has no (stored )?backup/;
const CALLOUT = "This site has no stored backup.";

function mount(list: () => Promise<unknown>) {
  wpApi.mockImplementation((url: string) =>
    String(url).startsWith("/backup/local/list")
      ? list()
      : Promise.resolve({ success: true })
  );
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    React.createElement(
      QueryClientProvider,
      { client },
      React.createElement(BackupsPage)
    )
  );
}

const listCalled = () =>
  wpApi.mock.calls.some(([url]) =>
    String(url).startsWith("/backup/local/list")
  );

describe("BackupsPage — first-time callout", () => {
  it("AC-8: no callout while the list request is pending", async () => {
    mount(() => new Promise(() => {}));
    await waitFor(() => expect(listCalled()).toBe(true));
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText(ANY_CALLOUT)).not.toBeInTheDocument();
  });

  it("AC-8: no callout after the list request failed", async () => {
    mount(() => Promise.reject(new Error("Forbidden")));
    await waitFor(() => expect(listCalled()).toBe(true));
    await new Promise((r) => setTimeout(r, 100));
    expect(screen.queryByText(ANY_CALLOUT)).not.toBeInTheDocument();
  });

  it("T37: an empty list that arrived says the site has no stored backup", async () => {
    mount(() =>
      Promise.resolve({
        success: true,
        backups: [],
        sets: [],
        missing_plugins_report: null,
      })
    );
    expect(await screen.findByText(CALLOUT)).toBeInTheDocument();
    expect(
      screen.queryByText("Your site has no backup yet.")
    ).not.toBeInTheDocument();
  });

  it("control: a list with a backup shows no callout", async () => {
    mount(() =>
      Promise.resolve({
        success: true,
        backups: [
          {
            name: "backup-full-0123456789abcdef.zip",
            date: "2026-10-20",
            timestamp: 1_760_000_000,
            size: "1 MB",
            type: "full",
            url: "",
          },
        ],
        sets: [],
        missing_plugins_report: null,
      })
    );
    await waitFor(() => expect(listCalled()).toBe(true));
    await new Promise((r) => setTimeout(r, 100));
    expect(screen.queryByText(ANY_CALLOUT)).not.toBeInTheDocument();
  });
});
