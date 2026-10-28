/**
 * Sealed acceptance spec V63-V1-10b (validator-authored, Free + Pro build).
 *
 * Production caller path: SecurityHub renders, the user opens the quarantine
 * tab, and the Blocked IPs table lists what GET /security/banned-ips returned.
 * The route marks each entry with its origin (`type`); the row badge must show
 * that origin instead of a fixed "Auto".
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

vi.mock("../lib/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("./organisms/Security/TwoFactorNudgeLink", () => ({
  TwoFactorNudgeLink: () => null,
}));

vi.mock("../services/api", () => ({
  wpApi: vi.fn(),
  ApiError: class ApiError extends Error {
    status?: number;
  },
}));

type SecurityHubModule = typeof import("./SecurityHub");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");
type ReactQueryModule = typeof import("@tanstack/react-query");
type ApiModule = typeof import("../services/api");
type ToastModule = typeof import("../lib/toast");

let SecurityHub: SecurityHubModule["default"];
let render: TestingLibraryModule["render"];
let screen: TestingLibraryModule["screen"];
let cleanup: TestingLibraryModule["cleanup"];
let fireEvent: TestingLibraryModule["fireEvent"];
let waitFor: TestingLibraryModule["waitFor"];
let React: ReactModule;
let QueryClient: ReactQueryModule["QueryClient"];
let QueryClientProvider: ReactQueryModule["QueryClientProvider"];
let wpApi: ApiModule["wpApi"];
let toast: ToastModule["toast"];

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  const RealReact = nodeRequire("react");
  const RealReactDOM = nodeRequire("react-dom");
  const RealReactDOMClient = nodeRequire("react-dom/client");
  window.React = RealReact;
  window.ReactDOM = { ...RealReactDOM, ...RealReactDOMClient };

  ({ default: SecurityHub } = await import("./SecurityHub"));
  ({ render, screen, cleanup, fireEvent, waitFor } =
    await import("@testing-library/react"));
  ({ QueryClient, QueryClientProvider } =
    await import("@tanstack/react-query"));
  ({ wpApi } = await import("../services/api"));
  ({ toast } = await import("../lib/toast"));
  React = await import("react");
});

/** Safe defaults for every endpoint SecurityHub queries on mount, unrelated
 * to this fix — same catch-all approach as SecurityHub.hardeningToggle.test.tsx. */
function defaultMockFor(url: string): unknown {
  if (url === "/hardening/status") {
    return { success: true, options: {} };
  }
  if (url === "/security/status") {
    return {
      firewall_enabled: false,
      spam_enabled: false,
      block_sqli: false,
      block_xss: false,
      simulation_mode: false,
      login_enabled: false,
      last_scan: "",
    };
  }
  if (url === "/security/logs") return [];
  if (url === "/security/banned-ips")
    return {
      ips: [{ ip: "198.51.100.7", type: "manual" }],
      allowed_ips: [],
      current_ip: "203.0.113.5",
    };
  if (url === "/security/sentinel/latest-scan")
    return { success: false, record: null };
  if (url === "/security/environment")
    return { success: true, environment: { cloudflare: { detected: false } } };
  return { success: true };
}


describe("Blocked IPs badge follows the entry type (V63-V1-10b)", () => {
  beforeEach(() => {
    (window as any).swisswpsuiteData = {};
    (wpApi as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (url: string) => Promise.resolve(defaultMockFor(url))
    );
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("V63-V1-10b: a manual ban is badged Manual, never Auto", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(SecurityHub)
      )
    );
    fireEvent.click(screen.getByRole("button", { name: "quarantine" }));
    const cell = await screen.findByText("198.51.100.7", { exact: false });
    const row = cell.closest("tr") as HTMLElement;
    expect(row).not.toBeNull();
    await waitFor(() => expect(row.textContent).toMatch(/manual/i));
    expect(row.textContent).not.toMatch(/\bauto\b/i);
  });
});
