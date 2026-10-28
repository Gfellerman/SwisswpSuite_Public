/**
 * Vitest coverage for applyAllHardening()'s M-2 client-half fix
 * (post-submission QA round 1, v2.9.33.59, Lane 6, Task 6.2).
 *
 * Backend contract (Lane 2, LANE_L2_REPORT.md, Task 2.3 — read at source
 * before writing this test): `POST /hardening/apply-all` -> HTTP 200
 * always, body:
 *   { success: boolean; applied: number; failed: string[];
 *     results: Record<string,string>; warnings?: Record<string,string>;
 *     message: string }
 * `success === true` iff `failed.length === 0`. `warnings` is present ONLY
 * when non-empty and is orthogonal to `failed` (a warning is not a
 * failure — see the PHP contract's own "Guarantees" list).
 *
 * Bug being fixed: before this lane, the frontend hardcoded
 * `data.success` reading a literal-`true` PHP response, so a partial
 * failure (Nginx's everyday `block_php_uploads` decline, or any other
 * toggle_option() WP_Error) was reported to the admin as a complete
 * success. This test drives the REAL production caller path: it renders
 * SecurityHub, switches to the "hardening" tab, clicks the actual
 * "Apply All Recommended Settings" button, confirms the ConfirmDialog, and
 * asserts on the resulting toast — not a reimplementation of
 * applyAllHardening().
 *
 * Acceptance scenario F2 (FIX_PLAN_ROUND1_V59_VALIDATED.md, LANE 6) is the
 * literal, binding test spec — its wording is followed exactly, including
 * where it reads as an "error toast" for the {success:false} case (the
 * lane's own Task 6.2 prose separately calls the Nginx
 * block_php_uploads-only case a "warning, not a red error"; F2's binding
 * acceptance text contradicts that specific sub-clause for the exact same
 * mocked shape it names — see LANE_L6_REPORT.md's discrepancy note. This
 * suite implements F2's literal three cases, which is the higher-priority,
 * non-replaceable spec).
 *
 * React-externalization workaround + wpApi/toast mocking: same pattern as
 * SecurityHub.hardeningToggle.test.tsx (read there for the full
 * rationale).
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
  if (url === "/security/banned-ips") return { ips: [] };
  if (url === "/security/sentinel/latest-scan")
    return { success: false, record: null };
  if (url === "/security/environment")
    return { success: true, environment: { cloudflare: { detected: false } } };
  return { success: true };
}

function setupWpApiMock(applyAllResponse: unknown) {
  (wpApi as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (url: string) => {
      if (url === "/hardening/apply-all") {
        return Promise.resolve(applyAllResponse);
      }
      return Promise.resolve(defaultMockFor(url));
    }
  );
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

describe("SecurityHub — applyAllHardening() M-2 client half (Task 6.2)", () => {
  beforeEach(() => {
    (window as any).swisswpsuiteData = {};
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("F2 case 1 (REWRITTEN, R1-RULING-5): Nginx everyday partial — {success:false, failed:['block_php_uploads'], manual_action:['block_php_uploads']} -> a WARNING toast carrying the PHP message, NOT an error", async () => {
    const message =
      "Applied 7 of 8 recommended hardening options. Could not apply: block_php_uploads.";
    setupWpApiMock({
      success: false,
      applied: 7,
      failed: ["block_php_uploads"],
      manual_action: ["block_php_uploads"],
      results: { block_php_uploads: "Nginx detected. ..." },
      message,
    });
    renderSecurityHub();

    await clickApplyAllAndConfirm();

    await waitFor(() => {
      expect(toast.warning).toHaveBeenCalledTimes(1);
    });
    expect(toast.warning).toHaveBeenCalledWith(message);
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("F2 case 1b (R1-RULING-5 control): a genuine write failure NOT in manual_action — {failed:['x'], manual_action:[]} -> an error toast", async () => {
    setupWpApiMock({
      success: false,
      applied: 7,
      failed: ["disable_xmlrpc"],
      manual_action: [],
      results: { disable_xmlrpc: "Could not write option." },
      message:
        "Applied 7 of 8 recommended hardening options. Could not apply: disable_xmlrpc.",
    });
    renderSecurityHub();

    await clickApplyAllAndConfirm();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledTimes(1);
    });
    expect((toast.error as any).mock.calls[0][0]).toContain("disable_xmlrpc");
    expect(toast.warning).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("F2 case 2: {success:true, warnings:{...}} -> a warning toast, not an error", async () => {
    setupWpApiMock({
      success: true,
      applied: 8,
      failed: [],
      results: {},
      warnings: { block_php_uploads: ".htaccess could not be written." },
      message:
        "All recommended hardening options applied. Note: some server-level (.htaccess) rules could not be applied — PHP-level protection is still active for those options.",
    });
    renderSecurityHub();

    await clickApplyAllAndConfirm();

    await waitFor(() => {
      expect(toast.warning).toHaveBeenCalledTimes(1);
    });
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("F2 control: {success:true} with no warnings -> the existing success toast, unchanged wording", async () => {
    setupWpApiMock({
      success: true,
      applied: 8,
      failed: [],
      results: {},
      message: "All recommended hardening options applied.",
    });
    renderSecurityHub();

    await clickApplyAllAndConfirm();

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "All recommended security options applied."
      );
    });
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.warning).not.toHaveBeenCalled();
  });
});
