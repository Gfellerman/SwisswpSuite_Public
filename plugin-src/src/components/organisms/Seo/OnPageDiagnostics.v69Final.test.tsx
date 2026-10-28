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

/**
 * On-page diagnostics (final .69 pass, FD-6 / AC-18): the first "Run Full Scan"
 * click asks the server for a fresh audit (force=1), not the cached one. The
 * real component with its real query; only `fetch` is replaced. No JSX.
 */
type TL = typeof import("@testing-library/react");
let OnPageDiagnostics: any;
let render: TL["render"];
let screen: TL["screen"];
let cleanup: TL["cleanup"];
let fireEvent: TL["fireEvent"];
let waitFor: TL["waitFor"];
let QueryClient: any;
let QueryClientProvider: any;
let React: typeof import("react");

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  window.React = nodeRequire("react");
  window.ReactDOM = {
    ...nodeRequire("react-dom"),
    ...nodeRequire("react-dom/client"),
  };
  ({ default: OnPageDiagnostics } = await import("./OnPageDiagnostics"));
  ({ render, screen, cleanup, fireEvent, waitFor } =
    await import("@testing-library/react"));
  ({ QueryClient, QueryClientProvider } =
    await import("@tanstack/react-query"));
  React = await import("react");
});

const AUDIT = {
  status: "complete",
  score: 70,
  factors: {},
  quick_wins: [],
  scanned_at: "2026-10-25T10:00:00Z",
  post_count: 10,
  is_sample: false,
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  (window as any).swisswpsuiteData = {
    apiUrl: "http://localhost/wp-json/swisswpsuite/v1",
    nonce: "test-nonce",
  };
  fetchMock = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(AUDIT) })
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("OnPageDiagnostics — Run Full Scan", () => {
  it("AC-18: the first click requests a fresh audit (force=1)", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      React.createElement(
        QueryClientProvider,
        { client },
        React.createElement(OnPageDiagnostics, {
          seoBreakdown: { on_page: 50, technical: 50, content: 50 },
        })
      )
    );
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /run full scan/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "http://localhost/wp-json/swisswpsuite/v1/seo/onpage-audit?force=1"
    );
  });
});
