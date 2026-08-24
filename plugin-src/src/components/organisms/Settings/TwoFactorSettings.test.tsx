/**
 * Vitest coverage for TwoFactorSettings' handleVerifySetup() (a11y Serious F5,
 * ADDENDUM-4, 2026-08-20 — UI-Truth Sprint round-5 gate).
 *
 * Bug under test: after a successful /2fa/verify-setup call, the code did
 * `const freshStatus = await fetchStatus(); if (freshStatus?.enabled) { ... }
 * else { toast.error("Setup did not complete...") }` — optional chaining
 * collapsed `freshStatus === null` (the INDEPENDENT status re-fetch blipped
 * on the network) and `freshStatus.enabled === false` (genuinely not
 * enabled) into the same false-negative branch, even when the backend had
 * actually succeeded. Fix: three explicit branches — true / null / false.
 *
 * No pre-existing test file for this component existed before this addendum
 * (confirmed via `find plugin -iname "*TwoFactorSettings*test*"`, zero hits).
 *
 * Driven via real rendered button clicks (fireEvent), not direct function
 * calls, per the addendum's own acceptance-scenario instruction — this
 * exercises the actual component tree: mount -> GET /2fa/status (not_set_up)
 * -> click "Enable 2FA" -> POST /2fa/setup (setup phase) -> type code, click
 * "Verify & Enable" -> POST /2fa/verify-setup -> internal fetchStatus() ->
 * GET /2fa/status (the call this suite varies per scenario).
 *
 * React-externalization workaround (read before editing): identical
 * rationale to LicenseManager.test.tsx / useHardening.test.ts — this
 * codebase externalizes React (WP.org Guideline 13), so "react"/"react-dom"/
 * "react/jsx-runtime" are Vite-aliased to shims reading a pre-existing
 * window.React/window.ReactDOM global. Real npm react/react-dom are pulled
 * in via Node's createRequire (bypassing Vite's resolver) and stamped onto
 * those globals in beforeAll, BEFORE any aliased import runs; every
 * subsequently-needed module is dynamically imported inside that same
 * beforeAll; this file never uses JSX (a JSX literal anywhere hoists a
 * top-level "react/jsx-runtime" import ahead of the stamp) — every element
 * is built with React.createElement.
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

// qrcode.react's QRCodeSVG is unrelated to the fix under test; stubbing it
// avoids depending on canvas/SVG rendering fidelity in jsdom for a component
// this suite never asserts against.
vi.mock("qrcode.react", () => ({
  QRCodeSVG: () => null,
}));

type TwoFactorSettingsModule = typeof import("./TwoFactorSettings");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");

let TwoFactorSettings: TwoFactorSettingsModule["TwoFactorSettings"];
let render: TestingLibraryModule["render"];
let screen: TestingLibraryModule["screen"];
let cleanup: TestingLibraryModule["cleanup"];
let fireEvent: TestingLibraryModule["fireEvent"];
let waitFor: TestingLibraryModule["waitFor"];
let React: ReactModule;
let toast: {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  warning: ReturnType<typeof vi.fn>;
};

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  const RealReact = nodeRequire("react");
  const RealReactDOM = nodeRequire("react-dom");
  const RealReactDOMClient = nodeRequire("react-dom/client");
  window.React = RealReact;
  window.ReactDOM = { ...RealReactDOM, ...RealReactDOMClient };

  ({ TwoFactorSettings } = await import("./TwoFactorSettings"));
  ({ render, screen, cleanup, fireEvent, waitFor } =
    await import("@testing-library/react"));
  React = await import("react");
  ({ toast } = (await import("sonner")) as unknown as { toast: typeof toast });
});

type FetchStep =
  | {
      success: true;
      status?: unknown;
      setup?: unknown;
      backup_codes?: string[];
      backup_codes_warning?: string;
      message?: string;
    }
  | "reject";

/**
 * Stubs the global fetch with a fixed, ordered sequence of responses — each
 * call to fetch() consumes the next entry. The last entry ("reject" or a
 * status payload) is what this suite varies per scenario; the first three
 * (initial status GET, setup POST, verify-setup POST) are identical across
 * every test — the fixed path to reach and submit the Verify screen.
 */
function stubFetchSequence(steps: FetchStep[]) {
  const fn = vi.fn();
  for (const step of steps) {
    if (step === "reject") {
      fn.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    } else {
      fn.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => step,
      });
    }
  }
  vi.stubGlobal("fetch", fn);
  return fn;
}

const NOT_ENABLED_STATUS = {
  enabled: false,
  setup_date: null,
  last_used: null,
  backup_codes_remaining: 0,
};

const ENABLED_STATUS = {
  enabled: true,
  setup_date: 1700000000,
  last_used: null,
  backup_codes_remaining: 10,
};

const SETUP_DATA = {
  secret: "JBSWY3DPEHPK3PXP",
  secret_formatted: "JBSW Y3DP EHPK 3PXP",
  qr_code_url: "",
  provisioning_uri: "otpauth://totp/x?secret=JBSWY3DPEHPK3PXP",
  issuer: "SwissSuite",
  account: "example.com",
};

/**
 * Renders the component, waits through mount (not_set_up) -> "Enable 2FA"
 * click (setup phase) -> types a valid 6-digit code -> returns the "Verify &
 * Enable" button, ready to be clicked by each test. The FOURTH fetch call
 * (the internal fetchStatus() re-fetch triggered by handleVerifySetup()) is
 * left unconsumed here — each test supplies it via `finalStep`.
 */
async function renderReadyToVerify(finalStep: FetchStep) {
  window.swisswpsuiteData = {
    apiUrl: "https://example.test/wp-json/swisswpsuite/v1",
    nonce: "test-nonce",
    sentinelIsPro: true,
  } as never;

  stubFetchSequence([
    { success: true, status: NOT_ENABLED_STATUS }, // mount GET /2fa/status
    { success: true, setup: SETUP_DATA }, // POST /2fa/setup
    {
      success: true,
      message: "Two-factor authentication is now enabled!",
      backup_codes: ["ABCD-1234"],
      backup_codes_warning: "Save these codes.",
    }, // POST /2fa/verify-setup
    finalStep, // GET /2fa/status (the re-fetch under test)
  ]);

  render(React.createElement(TwoFactorSettings));

  const enableButton = await screen.findByRole("button", {
    name: /enable 2fa/i,
  });
  fireEvent.click(enableButton);

  const codeInput = await screen.findByLabelText(/6-digit verification code/i);
  fireEvent.change(codeInput, { target: { value: "123456" } });

  const verifyButton = await screen.findByRole("button", {
    name: /verify & enable/i,
  });
  expect(verifyButton).not.toBeDisabled();

  return verifyButton;
}

describe("TwoFactorSettings — handleVerifySetup() status re-fetch truthfulness (F5, ADDENDUM-4)", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    delete (window as { swisswpsuiteData?: unknown }).swisswpsuiteData;
  });

  it("shows the NEUTRAL copy — not the false failure copy — when the status re-fetch blips (freshStatus === null)", async () => {
    const verifyButton = await renderReadyToVerify("reject");

    fireEvent.click(verifyButton);

    await waitFor(() =>
      expect(toast.warning).toHaveBeenCalledWith(
        "Could not confirm setup status — please refresh the page and check before retrying."
      )
    );

    // THE regression this test guards: pre-fix, this exact scenario produced
    // the false "Setup did not complete" error instead.
    expect(toast.error).not.toHaveBeenCalledWith(
      "Setup did not complete — 2FA is not active yet. Please try again."
    );
    expect(toast.success).not.toHaveBeenCalledWith(
      "Two-factor authentication enabled"
    );

    // Phase must not have moved to "active" — the QR/verify screen (or at
    // minimum, NOT the "2FA is active" screen) is still what's rendered.
    expect(
      screen.queryByRole("button", { name: /verify & enable/i })
    ).toBeInTheDocument();
  });

  it("still shows the success path when the status re-fetch genuinely confirms enabled:true (regression guard, unchanged)", async () => {
    const verifyButton = await renderReadyToVerify({
      success: true,
      status: ENABLED_STATUS,
    });

    fireEvent.click(verifyButton);

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "Two-factor authentication enabled"
      )
    );
    expect(toast.warning).not.toHaveBeenCalledWith(
      "Could not confirm setup status — please refresh the page and check before retrying."
    );
    expect(toast.error).not.toHaveBeenCalledWith(
      "Setup did not complete — 2FA is not active yet. Please try again."
    );

    // Phase moved to "active" — the Verify screen is gone, replaced by the
    // enabled-state UI (Disable control now present).
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /verify & enable/i })
      ).not.toBeInTheDocument()
    );
  });

  it("still shows the failure copy when the status re-fetch genuinely confirms enabled:false (regression guard, unchanged)", async () => {
    const verifyButton = await renderReadyToVerify({
      success: true,
      status: NOT_ENABLED_STATUS,
    });

    fireEvent.click(verifyButton);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Setup did not complete — 2FA is not active yet. Please try again."
      )
    );
    expect(toast.warning).not.toHaveBeenCalledWith(
      "Could not confirm setup status — please refresh the page and check before retrying."
    );
    expect(toast.success).not.toHaveBeenCalledWith(
      "Two-factor authentication enabled"
    );

    // Note: fetchStatus() itself (unrelated to this fix) unconditionally
    // moves phase from its OWN reading of the re-fetched status
    // (`setPhase(res.status.enabled ? "active" : "not_set_up")`) -- so a
    // genuine enabled:false re-fetch lands on "not_set_up" (the "Enable
    // 2FA" screen), not a frozen "setup" screen. handleVerifySetup()'s own
    // `else` branch only shows the toast; it does not additionally move
    // phase. Assert the Verify screen is gone and the not_set_up screen is
    // back, matching this real (pre-existing, unmodified) behavior.
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /verify & enable/i })
      ).not.toBeInTheDocument()
    );
    expect(
      screen.getByRole("button", { name: /enable 2fa/i })
    ).toBeInTheDocument();
  });
});
