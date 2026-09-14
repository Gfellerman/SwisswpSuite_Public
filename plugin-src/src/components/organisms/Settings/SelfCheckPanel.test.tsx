/**
 * Vitest coverage for SelfCheckPanel.
 *
 * Covers:
 *   - absent/404 route (deployment skew)
 *   - each of the six SelfCheckStatus values renders distinctly
 *   - "Export diagnostics" triggers a download with the returned content
 *   - loading + generic-error states
 *
 * React-externalization workaround: identical rationale/technique as
 * SecurityHub.wafSelfTest.test.tsx / PatchstackApiKeyField.test.tsx — this
 * codebase externalizes React (WP.org Guideline 13), so "react"/
 * "react-dom"/"react/jsx-runtime" are Vite-aliased to shims reading a
 * pre-existing window.React/window.ReactDOM global. Real npm react/
 * react-dom are pulled via Node's createRequire and stamped onto those
 * globals in beforeAll, BEFORE any aliased import runs.
 *
 * TEST-VITEST-WINDOW-REACT (queue row, still open at write time, V-14 of
 * the validator gate): plugin/tests/setup.ts stamps no window.React on its
 * own — this file supplies its own stamp in beforeAll like every other
 * spec in this tree, so it does not depend on that row being fixed.
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

vi.mock("../../../lib/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("../../../services/api", () => ({
  wpApi: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    data?: any;
    constructor(message: string, status: number, data?: any) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.data = data;
    }
  },
}));

type PanelModule = typeof import("./SelfCheckPanel");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");
type ReactQueryModule = typeof import("@tanstack/react-query");
type ApiModule = typeof import("../../../services/api");
type SonnerModule = typeof import("../../../lib/toast");

let SelfCheckPanel: PanelModule["SelfCheckPanel"];
let render: TestingLibraryModule["render"];
let screen: TestingLibraryModule["screen"];
let cleanup: TestingLibraryModule["cleanup"];
let fireEvent: TestingLibraryModule["fireEvent"];
let waitFor: TestingLibraryModule["waitFor"];
let React: ReactModule;
let QueryClient: ReactQueryModule["QueryClient"];
let QueryClientProvider: ReactQueryModule["QueryClientProvider"];
let wpApi: ApiModule["wpApi"];
let ApiErrorCtor: ApiModule["ApiError"];
let toast: SonnerModule["toast"];

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  const RealReact = nodeRequire("react");
  const RealReactDOM = nodeRequire("react-dom");
  const RealReactDOMClient = nodeRequire("react-dom/client");
  window.React = RealReact;
  window.ReactDOM = { ...RealReactDOM, ...RealReactDOMClient };

  ({ SelfCheckPanel } = await import("./SelfCheckPanel"));
  ({ render, screen, cleanup, fireEvent, waitFor } =
    await import("@testing-library/react"));
  ({ QueryClient, QueryClientProvider } =
    await import("@tanstack/react-query"));
  ({ wpApi, ApiError: ApiErrorCtor } = await import("../../../services/api"));
  ({ toast } = await import("../../../lib/toast"));
  React = await import("react");
});

type WpApiMock = ReturnType<typeof vi.fn>;

const EMPTY_SUMMARY = { ok: 0, warn: 0, fail: 0, skip: 0, not_available: 0 };

/**
 * The shared never-run shape: the backend never sends a zeroed-out
 * general-purpose object — it sends this structurally different,
 * `groups`-less body from BOTH /selfcheck/last (`success:true`, 200) and
 * /selfcheck/export (`success:false, code:'never_run'`, still 200 — see
 * the `forExport` variant, consumed as an ApiError below since wpApi()
 * auto-throws on `success:false` at 2xx).
 */
function neverRunResult(options: { forExport?: boolean } = {}) {
  return {
    success: !options.forExport,
    ran_at: null as null,
    ...(options.forExport ? { code: "never_run" as const } : {}),
    message: "Run a self-check first, then export.",
  };
}

function sixStatusResult() {
  const statuses = [
    "ok",
    "warn",
    "fail",
    "skip",
    "not_available",
    "inconclusive",
  ] as const;
  return {
    ran_at: 1234567890,
    summary: { ok: 1, warn: 1, fail: 1, skip: 1, not_available: 1 },
    groups: [
      {
        id: "sample",
        label: "Sample Group",
        checks: statuses.map((status) => ({
          id: `check-${status}`,
          label: `Check for ${status}`,
          status,
          detail: `Detail for ${status}`,
          evidence: null,
        })),
      },
    ],
  };
}

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(SelfCheckPanel)
    )
  );
}

describe("SelfCheckPanel", () => {
  beforeEach(() => {
    (window as any).swisswpsuiteData = {
      homeUrl: "https://example.test",
    };
    (window.URL as any).createObjectURL = vi.fn(() => "blob:mock-url");
    (window.URL as any).revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("loading: shows a neutral 'Checking…' state before /selfcheck/last resolves", () => {
    (wpApi as unknown as WpApiMock).mockImplementation(
      () => new Promise(() => {}) // never resolves within this test
    );
    renderPanel();

    expect(screen.getByText(/checking…/i)).toBeInTheDocument();
  });

  it("never run: SelfCheckNeverRun (ran_at: null) shows the 'Never run' prompt, not a crash (H-1)", async () => {
    (wpApi as unknown as WpApiMock).mockResolvedValue(neverRunResult());
    renderPanel();

    expect(await screen.findByText(/never run/i)).toBeInTheDocument();
    const runButton = screen.getByRole("button", { name: /run self-check/i });
    expect(runButton).not.toBeDisabled();
    const exportButton = screen.getByRole("button", {
      name: /export diagnostics/i,
    });
    // a11y review fix: native `disabled` would remove Export from the tab
    // order, hiding its explanation from keyboard/AT users. aria-disabled
    // keeps it focusable; the onClick guard (tested below) blocks the action.
    expect(exportButton).not.toBeDisabled();
    expect(exportButton).toHaveAttribute("aria-disabled", "true");
  });

  it("404 on the initial load: falls back to ordinary error handling, never crashes, Run stays enabled", async () => {
    (wpApi as unknown as WpApiMock).mockRejectedValue(
      new ApiErrorCtor("Resource not found.", 404, {})
    );
    renderPanel();

    expect(await screen.findByText(/status unavailable/i)).toBeInTheDocument();
    const runButton = screen.getByRole("button", { name: /run self-check/i });
    expect(runButton).not.toBeDisabled();
  });

  it("generic error (non-404): shows 'Status unavailable — try again.'", async () => {
    (wpApi as unknown as WpApiMock).mockRejectedValue(
      new Error("network error")
    );
    renderPanel();

    expect(await screen.findByText(/status unavailable/i)).toBeInTheDocument();
  });

  it("renders all six statuses distinctly, none of them as a failure label for skip/not_available/inconclusive", async () => {
    (wpApi as unknown as WpApiMock).mockResolvedValue(sixStatusResult());
    renderPanel();

    expect(await screen.findByText(/check for ok/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^ok$/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/^warning$/i)).toBeInTheDocument();
    expect(screen.getByText(/^failed$/i)).toBeInTheDocument();
    expect(screen.getByText(/^skipped$/i)).toBeInTheDocument();
    expect(screen.getByText(/^not applicable$/i)).toBeInTheDocument();
    expect(screen.getByText(/could not determine/i)).toBeInTheDocument();

    // The structural guard: `skip` must never render as a problem, and
    // neither must `not_available` nor `inconclusive` — none of their
    // labels are "Failed", the only failure-shaped string in STATUS_META.
    expect(screen.queryAllByText(/^failed$/i)).toHaveLength(1); // only the real `fail` row
  });

  it("Run self-check: POST success updates the panel in place (no reload) and shows the new summary", async () => {
    (wpApi as unknown as WpApiMock).mockImplementation((url: string) => {
      if (url === "/selfcheck/last") return Promise.resolve(neverRunResult());
      if (url === "/selfcheck/run") return Promise.resolve(sixStatusResult());
      return Promise.reject(new Error(`unexpected url ${url}`));
    });
    renderPanel();

    const runButton = await screen.findByRole("button", {
      name: /run self-check/i,
    });
    fireEvent.click(runButton);

    expect(await screen.findByText(/check for ok/i)).toBeInTheDocument();
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("Export diagnostics: triggers a Blob download carrying the returned payload", async () => {
    const exportPayload = { redacted: true, sample: "diagnostics-value" };
    (wpApi as unknown as WpApiMock).mockImplementation((url: string) => {
      if (url === "/selfcheck/last") return Promise.resolve(sixStatusResult());
      if (url === "/selfcheck/export") return Promise.resolve(exportPayload);
      return Promise.reject(new Error(`unexpected url ${url}`));
    });
    renderPanel();

    // The export button exists in every render branch (loading included),
    // so findByRole alone would resolve before /selfcheck/last settles —
    // wait for a result-only element first, same technique as the
    // six-status test above.
    await screen.findByText(/check for ok/i);
    const exportButton = screen.getByRole("button", {
      name: /export diagnostics/i,
    });
    expect(exportButton).not.toBeDisabled();
    fireEvent.click(exportButton);

    await waitFor(() =>
      expect(window.URL.createObjectURL).toHaveBeenCalledTimes(1)
    );
    const blobArg = (window.URL.createObjectURL as unknown as WpApiMock).mock
      .calls[0][0] as Blob;
    expect(blobArg).toBeInstanceOf(Blob);
    expect(blobArg.type).toBe("application/json");

    if (typeof (blobArg as any).text === "function") {
      const text = await (blobArg as any).text();
      expect(JSON.parse(text)).toEqual(exportPayload);
    }

    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url")
    );
  });

  it("Export diagnostics is disabled until a self-check has run, with an explanatory title", async () => {
    (wpApi as unknown as WpApiMock).mockResolvedValue(neverRunResult());
    renderPanel();

    const exportButton = await screen.findByRole("button", {
      name: /export diagnostics/i,
    });
    // Same a11y fix as the "never run" test above: aria-disabled, not
    // native disabled, so the reason stays reachable by keyboard/AT.
    expect(exportButton).not.toBeDisabled();
    expect(exportButton).toHaveAttribute("aria-disabled", "true");
    expect(exportButton).toHaveAttribute("title", "Run a self-check first");

    // The onClick guard replaces native disabled's click-prevention.
    fireEvent.click(exportButton);
    expect(wpApi).not.toHaveBeenCalledWith("/selfcheck/export");
  });

  // ---------------------------------------------------------------------
  // H-2 — VALIDATOR_V53_SELFCHECK_FIXES.md §5-H-2: a missing template-
  // literal space concatenated `uppercase` and `cursor-not-allowed` into
  // one dead token. Token-wise assertion, not substring — a substring
  // match (`toContain("uppercase")`) would pass even on the broken
  // `"uppercasecursor-not-allowed opacity-50"` string.
  // ---------------------------------------------------------------------
  it("H-2: the blocked Export button's className carries 'uppercase', 'cursor-not-allowed' and 'opacity-50' as SEPARATE tokens", async () => {
    (wpApi as unknown as WpApiMock).mockResolvedValue(neverRunResult());
    renderPanel();

    const exportButton = await screen.findByRole("button", {
      name: /export diagnostics/i,
    });
    const classTokens = exportButton.className.split(/\s+/).filter(Boolean);
    expect(classTokens).toEqual(
      expect.arrayContaining(["uppercase", "cursor-not-allowed", "opacity-50"])
    );
  });

  // ---------------------------------------------------------------------
  // Export "never run" is a 200 with success:false, code:'never_run',
  // NOT a 404. The pair below is a fail-first + control: the first proves
  // the friendly message renders, the second proves the same code path
  // still tells a genuine route error apart from that friendly message.
  // ---------------------------------------------------------------------
  it("export never_run (200, success:false) shows the backend's friendly message, not a generic route-error message", async () => {
    const neverRun = neverRunResult({ forExport: true });
    (wpApi as unknown as WpApiMock).mockImplementation((url: string) => {
      if (url === "/selfcheck/last") return Promise.resolve(sixStatusResult());
      if (url === "/selfcheck/export")
        return Promise.reject(
          new ApiErrorCtor(neverRun.message, 200, neverRun)
        );
      return Promise.reject(new Error(`unexpected url ${url}`));
    });
    renderPanel();

    await screen.findByText(/check for ok/i);
    const exportButton = screen.getByRole("button", {
      name: /export diagnostics/i,
    });
    // Locally the panel believes a result exists (sixStatusResult), so the
    // aria-disabled precondition guard does NOT block this click — the
    // scenario this test drives is the backend disagreeing at request time
    // (e.g. a stale TanStack cache after a restore wiped the server-side
    // cached result, per REAUDIT_V53_SELFCHECK.md M-3).
    expect(exportButton).not.toHaveAttribute("aria-disabled", "true");
    fireEvent.click(exportButton);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(neverRun.message)
    );
    // Not the generic "Could not export diagnostics: ..." fallback either —
    // the never-run case gets its own friendly message (asserted above),
    // distinct from ordinary error handling.
    expect(toast.error).not.toHaveBeenCalledWith(
      expect.stringContaining("Could not export diagnostics")
    );
    expect(window.URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("control: a genuine route error on export uses ordinary error handling, not a special skew message", async () => {
    (wpApi as unknown as WpApiMock).mockImplementation((url: string) => {
      if (url === "/selfcheck/last") return Promise.resolve(sixStatusResult());
      if (url === "/selfcheck/export")
        return Promise.reject(new ApiErrorCtor("Resource not found.", 404, {}));
      return Promise.reject(new Error(`unexpected url ${url}`));
    });
    renderPanel();

    await screen.findByText(/check for ok/i);
    fireEvent.click(
      screen.getByRole("button", { name: /export diagnostics/i })
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Could not export diagnostics: Resource not found."
      )
    );
  });

  // ---------------------------------------------------------------------
  // M-1 — the new explicit "Send test email" action (POST
  // /selfcheck/mail-test), and the header copy that no longer makes an
  // unqualified "nothing is sent anywhere" claim.
  // ---------------------------------------------------------------------
  it("M-1: header copy makes no unqualified 'nothing is sent anywhere' claim, and names the mail-test button as the one exception", async () => {
    (wpApi as unknown as WpApiMock).mockResolvedValue(neverRunResult());
    renderPanel();

    await screen.findByRole("button", { name: /send test email/i });
    expect(
      screen.getByText(/is the only action here that sends anything/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/— all checked locally, nothing is sent\s+anywhere\./i)
    ).not.toBeInTheDocument();
  });

  it("Send test email posts /selfcheck/mail-test exactly once and renders an `ok` result", async () => {
    (wpApi as unknown as WpApiMock).mockImplementation((url: string) => {
      if (url === "/selfcheck/last") return Promise.resolve(sixStatusResult());
      if (url === "/selfcheck/mail-test")
        return Promise.resolve({
          success: true,
          check: {
            id: "mail_test",
            label: "Send a test email",
            status: "ok",
            detail: "A test email was accepted by the configured mailer.",
            evidence: null,
          },
        });
      return Promise.reject(new Error(`unexpected url ${url}`));
    });
    renderPanel();

    await screen.findByText(/check for ok/i);
    const sendButton = screen.getByRole("button", {
      name: /send test email/i,
    });
    fireEvent.click(sendButton);

    expect(
      await screen.findByText(
        /a test email was accepted by the configured mailer/i
      )
    ).toBeInTheDocument();
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(wpApi).toHaveBeenCalledTimes(2); // /selfcheck/last + one mail-test POST
    expect(wpApi).toHaveBeenCalledWith(
      "/selfcheck/mail-test",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("M-1: a `fail` mail-test result toasts the failure detail instead of a generic success", async () => {
    (wpApi as unknown as WpApiMock).mockImplementation((url: string) => {
      if (url === "/selfcheck/last") return Promise.resolve(sixStatusResult());
      if (url === "/selfcheck/mail-test")
        return Promise.resolve({
          success: true,
          check: {
            id: "mail_test",
            label: "Send a test email",
            status: "fail",
            detail: "The test email could not be sent: unknown error.",
            evidence: null,
          },
        });
      return Promise.reject(new Error(`unexpected url ${url}`));
    });
    renderPanel();

    await screen.findByText(/check for ok/i);
    fireEvent.click(screen.getByRole("button", { name: /send test email/i }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "The test email could not be sent: unknown error."
      )
    );
    expect(
      await screen.findByText(
        /the test email could not be sent: unknown error/i
      )
    ).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------
  // F-side-note (REAUDIT_V53_SELFCHECK_ROUND2.md, 2026-09-07): toast
  // SEVERITY must track the check's status, not just its text — a prior
  // revision routed every non-fail status through toast.success, so a
  // `warn` (mail intercepted by another plugin) rendered as a GREEN
  // success toast carrying warning text. One case per branch below.
  // ---------------------------------------------------------------------

  it("M-1: an `ok` mail-test result toasts success with the detail text", async () => {
    (wpApi as unknown as WpApiMock).mockImplementation((url: string) => {
      if (url === "/selfcheck/last") return Promise.resolve(sixStatusResult());
      if (url === "/selfcheck/mail-test")
        return Promise.resolve({
          success: true,
          check: {
            id: "mail_test",
            label: "Send a test email",
            status: "ok",
            detail: "A test email was accepted by the configured mailer.",
            evidence: null,
          },
        });
      return Promise.reject(new Error(`unexpected url ${url}`));
    });
    renderPanel();

    await screen.findByText(/check for ok/i);
    fireEvent.click(screen.getByRole("button", { name: /send test email/i }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "A test email was accepted by the configured mailer."
      )
    );
    expect(toast.warning).not.toHaveBeenCalled();
    expect(toast.info).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("M-1: a `warn` mail-test result toasts a WARNING (not success) with the detail text", async () => {
    (wpApi as unknown as WpApiMock).mockImplementation((url: string) => {
      if (url === "/selfcheck/last") return Promise.resolve(sixStatusResult());
      if (url === "/selfcheck/mail-test")
        return Promise.resolve({
          success: true,
          check: {
            id: "mail_test",
            label: "Send a test email",
            status: "warn",
            detail:
              "Mail delivery was intercepted by another plugin's pre_wp_mail filter before it reached the mailer.",
            evidence: null,
          },
        });
      return Promise.reject(new Error(`unexpected url ${url}`));
    });
    renderPanel();

    await screen.findByText(/check for ok/i);
    fireEvent.click(screen.getByRole("button", { name: /send test email/i }));

    await waitFor(() =>
      expect(toast.warning).toHaveBeenCalledWith(
        "Mail delivery was intercepted by another plugin's pre_wp_mail filter before it reached the mailer."
      )
    );
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("M-1: a `skip` mail-test result (no admin email configured) renders without being treated as a failure, toasts INFO not success", async () => {
    (wpApi as unknown as WpApiMock).mockImplementation((url: string) => {
      if (url === "/selfcheck/last") return Promise.resolve(sixStatusResult());
      if (url === "/selfcheck/mail-test")
        return Promise.resolve({
          success: true,
          check: {
            id: "mail_test",
            label: "Send a test email",
            status: "skip",
            detail: "No valid admin email address is configured.",
            evidence: null,
          },
        });
      return Promise.reject(new Error(`unexpected url ${url}`));
    });
    renderPanel();

    await screen.findByText(/check for ok/i);
    fireEvent.click(screen.getByRole("button", { name: /send test email/i }));

    expect(
      await screen.findByText(/no valid admin email address is configured/i)
    ).toBeInTheDocument();
    // a11y review fix: the toast is the ONLY channel that reaches screen
    // reader users for this action (the panel's dedicated `announce()`
    // live-region helper is never called for mail-test — see the
    // onSuccess comment in SelfCheckPanel.tsx). A hardcoded "Test email
    // request sent." string here would be actively wrong for `skip`
    // (nothing was sent) and would leave AT users without the real
    // reason sighted users see in the row. Assert the exact text, not
    // just "was called", so a regression to the generic string is caught.
    // F-side-note: `skip` means nothing was attempted — toast.info, not
    // toast.success (a prior revision routed this through success, which
    // reads as "it worked" for an action that never ran).
    await waitFor(() =>
      expect(toast.info).toHaveBeenCalledWith(
        "No valid admin email address is configured."
      )
    );
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("Send test email route error degrades to an ordinary message and does not crash the panel", async () => {
    (wpApi as unknown as WpApiMock).mockImplementation((url: string) => {
      if (url === "/selfcheck/last") return Promise.resolve(sixStatusResult());
      if (url === "/selfcheck/mail-test")
        return Promise.reject(new ApiErrorCtor("Resource not found.", 404, {}));
      return Promise.reject(new Error(`unexpected url ${url}`));
    });
    renderPanel();

    await screen.findByText(/check for ok/i);
    fireEvent.click(screen.getByRole("button", { name: /send test email/i }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Could not send the test email: Resource not found."
      )
    );
    // Does not crash: the panel's own results are still rendered.
    expect(screen.getByText(/check for ok/i)).toBeInTheDocument();
  });
});
