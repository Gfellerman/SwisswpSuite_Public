/**
 * Sealed acceptance spec V63-V1-8a/8b (validator-authored, Free + Pro build).
 *
 * Production caller path: SecurityHub renders, the user opens the hardening
 * tab, clicks "Apply All Recommended Settings" and confirms. The apply-all
 * request goes through the REAL wpApi() (only fetch is stubbed), so the rule
 * that turns an HTTP 200 + success:false body into a thrown error is the one
 * the shipped bundle runs. The server answers success:false whenever any
 * option is not applied (block_php_uploads on Nginx/OpenLiteSpeed every time):
 * the user must see the server's message as a warning and an up-to-date grid,
 * never "Network error.".
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

// Keep the REAL wpApi module (ApiError, the success:false throw rule) and
// only wrap wpApi so other routes can be answered with defaults.
vi.mock("../services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/api")>();
  return { ...actual, wpApi: vi.fn() };
});

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
  if (url === "/security/banned-ips") return { ips: [] };
  if (url === "/security/sentinel/latest-scan")
    return { success: false, record: null };
  if (url === "/security/environment")
    return { success: true, environment: { cloudflare: { detected: false } } };
  return { success: true };
}


let actualWpApi: ApiModule["wpApi"];

function stubFetchJson(body: unknown) {
  globalThis.fetch = vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  ) as unknown as typeof fetch;
}

function setupApi() {
  (wpApi as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (url: string, init?: unknown) => {
      if (url === "/hardening/apply-all") {
        return actualWpApi(url, init as never);
      }
      return Promise.resolve(defaultMockFor(url));
    }
  );
}

function hardeningStatusReads(): number {
  return (wpApi as unknown as ReturnType<typeof vi.fn>).mock.calls.filter(
    ([u]: [string]) => u === "/hardening/status"
  ).length;
}

function renderSecurityHub() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(SecurityHub)
    )
  );
}

async function clickApplyAllAndConfirm() {
  fireEvent.click(screen.getByRole("button", { name: "hardening" }));
  const applyAllButton = await screen.findByRole("button", {
    name: /apply all recommended settings/i,
  });
  fireEvent.click(applyAllButton);
  const confirmButton = await screen.findByRole("button", { name: "Confirm" });
  fireEvent.click(confirmButton);
}

describe("SecurityHub apply-all through the real wpApi (V63-V1-8)", () => {
  const savedFetch = globalThis.fetch;

  beforeAll(async () => {
    const actual = await vi.importActual<typeof import("../services/api")>(
      "../services/api"
    );
    actualWpApi = actual.wpApi;
  });

  beforeEach(() => {
    (window as any).swisswpsuiteData = {
      nonce: "n",
      apiUrl: "http://example.test/wp-json/swisswpsuite/v1",
    };
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    globalThis.fetch = savedFetch;
  });

  it("V63-V1-8a: a partial apply on Nginx shows the server message as a warning, not 'Network error.'", async () => {
    const message =
      "Applied 7 of 8 recommended hardening options. Could not apply: block_php_uploads.";
    stubFetchJson({
      success: false,
      applied: 7,
      failed: ["block_php_uploads"],
      manual_action: ["block_php_uploads"],
      results: { block_php_uploads: "Nginx detected." },
      message,
    });
    setupApi();
    renderSecurityHub();
    await clickApplyAllAndConfirm();

    await waitFor(() => {
      expect(toast.warning).toHaveBeenCalledWith(message);
    });
    expect(toast.error).not.toHaveBeenCalledWith("Network error.");
  });

  it("V63-V1-8b: after a partial apply the hardening grid is re-read from the server", async () => {
    stubFetchJson({
      success: false,
      applied: 7,
      failed: ["block_php_uploads"],
      manual_action: ["block_php_uploads"],
      results: { block_php_uploads: "Nginx detected." },
      message: "Applied 7 of 8 recommended hardening options. Could not apply: block_php_uploads.",
    });
    setupApi();
    renderSecurityHub();
    await waitFor(() => expect(hardeningStatusReads()).toBeGreaterThan(0));
    const before = hardeningStatusReads();
    await clickApplyAllAndConfirm();

    await waitFor(() => {
      expect(hardeningStatusReads()).toBeGreaterThan(before);
    });
  });
});
