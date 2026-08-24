/**
 * Vitest coverage for LicenseManager (F6, 2026-08-18 — purchase-path links):
 *
 *   1. Unlicensed state ("Already paid? Manage subscription") pointed at
 *      `https://swisswpsecure.com/pricing` (validator-confirmed 404 live).
 *      Fixed to reuse the already-imported `PRO_UPGRADE_URL` constant
 *      (`https://swisswpsecure.com/products/`, validator-confirmed 200
 *      live) instead of a second hardcoded string.
 *   2. The unlicensed state had NO purchase entry point at all besides
 *      that one "already paid?" link — a real customer without a license
 *      yet had nowhere to click. Added a visible "Get a License" CTA,
 *      styled per the licensed state's existing "Upgrade your plan" idiom
 *      (text-brand-accent + Zap icon), linking the same PRO_UPGRADE_URL.
 *   3. The manually-managed-billing "contact support" link pointed at
 *      `https://swisswpsecure.com/contact` (validator-confirmed 404 live).
 *      Fixed to `mailto:support@swisswpsecure.com` — the address the
 *      plugin's own emails/legal docs already use (class-swisswpsuite-
 *      privacy.php, ToS, DPA).
 *
 * This file is Pro-edition-only at runtime (Free aliases the import to
 * LicenseManager.freeStub.tsx at build time via vite.config.ts's
 * resolve.alias — see .claude/agent-memory/frontend-specialist for the
 * mechanism), so `window.swisswpsuiteData.edition` is stamped "pro" below
 * to match the only edition this component actually ships in, and to keep
 * the (edition-independent, always-false-here-in-real-life)
 * `isFreeEdition()` promo block out of the rendered tree so these
 * assertions stay unambiguous.
 *
 * React-externalization workaround (read before editing): identical to
 * WafUpsellCard.test.tsx / ErrorBoundary.test.tsx — this codebase
 * externalizes React (WP.org Guideline 13), so "react"/"react-dom"/
 * "react/jsx-runtime" are Vite-aliased to shims that read a pre-existing
 * `window.React`/`window.ReactDOM` global. Real npm react/react-dom are
 * pulled in via Node's `createRequire` (bypassing Vite's resolver) and
 * stamped onto those globals in `beforeAll`, BEFORE any aliased import
 * runs; every subsequently-needed module is dynamically imported inside
 * that same `beforeAll`; this file never uses JSX (a JSX literal anywhere
 * in the file hoists a top-level "react/jsx-runtime" import ahead of the
 * stamp) — every element is built with `React.createElement`.
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";

// U3xU10 (gate report 2026-08-20): mocking "sonner" is the only way to
// observe which toast variant handleActivate() actually calls — a false
// "License Activated!" (toast.success) vs. the informational requiresPro
// explainer (toast.info) vs. a genuine failure (toast.error) are exactly the
// three outcomes this fix must keep distinct. vi.mock() calls are hoisted by
// vitest above all imports (including the dynamic `await import("./
// LicenseManager")` in beforeAll below), so this intercepts the component's
// own `import { toast } from "sonner"` correctly. Same pattern as
// SyncManager.test.tsx.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

type LicenseManagerModule = typeof import("./LicenseManager");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");
type EditionModule = typeof import("../../../lib/edition");
type ApiModule = typeof import("../../../services/api");

let LicenseManager: LicenseManagerModule["LicenseManager"];
let render: TestingLibraryModule["render"];
let screen: TestingLibraryModule["screen"];
let cleanup: TestingLibraryModule["cleanup"];
let fireEvent: TestingLibraryModule["fireEvent"];
let waitFor: TestingLibraryModule["waitFor"];
let React: ReactModule;
let PRO_UPGRADE_URL: EditionModule["PRO_UPGRADE_URL"];
let ApiError: ApiModule["ApiError"];
let toast: {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
  warning: ReturnType<typeof vi.fn>;
};

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  const RealReact = nodeRequire("react");
  const RealReactDOM = nodeRequire("react-dom");
  const RealReactDOMClient = nodeRequire("react-dom/client");
  window.React = RealReact;
  window.ReactDOM = { ...RealReactDOM, ...RealReactDOMClient };

  ({ LicenseManager } = await import("./LicenseManager"));
  ({ render, screen, cleanup, fireEvent, waitFor } =
    await import("@testing-library/react"));
  ({ PRO_UPGRADE_URL } = await import("../../../lib/edition"));
  ({ ApiError } = await import("../../../services/api"));
  React = await import("react");
  ({ toast } = (await import("sonner")) as unknown as { toast: typeof toast });
});

describe("LicenseManager — unlicensed state purchase path", () => {
  afterEach(() => {
    // See ErrorBoundary.test.tsx: @testing-library/react's automatic
    // afterEach(cleanup) needs `test.globals: true`, which this project's
    // vitest config does not set — clean up explicitly instead.
    cleanup();
    vi.restoreAllMocks();
    delete (window as { swisswpsuiteData?: unknown }).swisswpsuiteData;
  });

  function renderUnlicensed() {
    // Pro edition, no apiUrl/nonce: the on-mount POST /license/refresh
    // effect (fetchLicenseRefresh) short-circuits to `null` without any
    // network I/O when either is missing — no fetch mock required.
    window.swisswpsuiteData = { edition: "pro" } as never;

    return render(
      React.createElement(LicenseManager, {
        license: null,
        tokens: {},
        onActivate: vi.fn().mockResolvedValue(undefined),
        isActivating: false,
      })
    );
  }

  it("shows a visible 'Get a License' CTA pointing at the live products page", () => {
    renderUnlicensed();

    const cta = screen.getByRole("link", { name: /get a license/i });
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute("href", PRO_UPGRADE_URL);
    expect(cta).toHaveAttribute("href", "https://swisswpsecure.com/products/");
    expect(cta).toHaveAttribute("target", "_blank");
    expect(cta).toHaveAttribute("rel", "noopener noreferrer");

    // It's real, semantic, keyboard-reachable link markup — no custom
    // role or extra ARIA needed to satisfy the a11y gate.
    expect(cta.tagName).toBe("A");
  });

  it("points 'Already paid? Manage subscription' at the live products page, not the dead /pricing URL", () => {
    renderUnlicensed();

    const manageLink = screen.getByRole("link", {
      name: /manage subscription/i,
    });
    expect(manageLink).toBeInTheDocument();
    expect(manageLink).toHaveAttribute("href", PRO_UPGRADE_URL);
    expect(manageLink.getAttribute("href")).not.toBe(
      "https://swisswpsecure.com/pricing"
    );
  });

  it("never renders the Activate button's license-key input as active (sanity: this is genuinely the unlicensed branch)", () => {
    renderUnlicensed();

    expect(
      screen.getByRole("button", { name: /^activate$/i })
    ).toBeInTheDocument();
    expect(screen.queryByText(/deactivate license/i)).not.toBeInTheDocument();
  });
});

describe("LicenseManager — manually-managed billing support contact", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    delete (window as { swisswpsuiteData?: unknown }).swisswpsuiteData;
  });

  it("uses a mailto: link to the real support address instead of the dead /contact page", () => {
    window.swisswpsuiteData = { edition: "pro" } as never;

    render(
      React.createElement(LicenseManager, {
        license: {
          active: true,
          tier_name: "swisswpsuite_monthly",
          masked_key: "SWS-XXXX-XXXX-DEMO",
          is_stripe_managed: false,
          stripe_customer_id: null,
        },
        tokens: { balance: 0, token_limit: 0 },
        onActivate: vi.fn().mockResolvedValue(undefined),
        isActivating: false,
      })
    );

    const supportLink = screen.getByRole("link", { name: /contact support/i });
    expect(supportLink).toBeInTheDocument();
    expect(supportLink).toHaveAttribute(
      "href",
      "mailto:support@swisswpsecure.com"
    );
    expect(supportLink.getAttribute("href")).not.toBe(
      "https://swisswpsecure.com/contact"
    );
  });
});

describe("LicenseManager — handleActivate() catch-path truthfulness (U3xU10, gate report 2026-08-20)", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.clearAllMocks();
    delete (window as { swisswpsuiteData?: unknown }).swisswpsuiteData;
  });

  function renderUnlicensedWithActivate(
    onActivate: (key: string) => Promise<unknown>
  ) {
    window.swisswpsuiteData = { edition: "pro" } as never;
    return render(
      React.createElement(LicenseManager, {
        license: null,
        tokens: {},
        onActivate,
        isActivating: false,
      })
    );
  }

  async function typeKeyAndActivate(key: string) {
    const input = screen.getByLabelText(/license key/i);
    fireEvent.change(input, { target: { value: key } });
    fireEvent.click(screen.getByRole("button", { name: /^activate$/i }));
  }

  it("shows toast.info (never a false 'License Activated!', never a red error) when activate_license's requiresPro branch rejects as a 403 ApiError with upgrade_required", async () => {
    // Backend contract post-adaptation (class-swisswpsuite-api-settings.php
    // activate_license()): a genuinely valid Pro key on the Free edition now
    // throws via wpApi() (HTTP 403 + upgrade_required:true) instead of
    // resolving with success:false at HTTP 200 — this is the exact shape
    // ApiError carries once wpApi() rejects a non-2xx response.
    const upgradeError = new ApiError(
      "This license is valid — download SwissSuite AI Pro to use it.",
      403,
      {
        success: false,
        upgrade_required: true,
        message:
          "This license is valid — download SwissSuite AI Pro to use it.",
        downloadUrl: "https://swisswpsecure.com/resources/",
      }
    );
    const onActivate = vi.fn().mockRejectedValue(upgradeError);

    renderUnlicensedWithActivate(onActivate);
    await typeKeyAndActivate("SWS-PRO1-PROX-TEST");

    await waitFor(() => expect(toast.info).toHaveBeenCalled());
    expect(toast.info).toHaveBeenCalledWith(
      "This license is valid — download SwissSuite AI Pro to use it."
    );
    // The two false-display scenarios UI_TRUTH_AUDIT finding #3 (CRITICAL) and
    // the U3xU10 interference note this fix guards against, both explicitly:
    expect(toast.success).not.toHaveBeenCalled(); // no false "Activated!"
    expect(toast.error).not.toHaveBeenCalled(); // no misleading red error for an informational state
  });

  it("shows toast.error (never toast.info, never toast.success) for a genuine activation failure (invalid key, HTTP 400)", async () => {
    const genuineError = new ApiError("Invalid license key.", 400, {
      success: false,
      message: "Invalid license key.",
    });
    const onActivate = vi.fn().mockRejectedValue(genuineError);

    renderUnlicensedWithActivate(onActivate);
    await typeKeyAndActivate("NOT-A-REAL-KEY");

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Invalid license key.")
    );
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.info).not.toHaveBeenCalled();
  });

  it("shows toast.success only after onActivate genuinely resolves", async () => {
    const onActivate = vi.fn().mockResolvedValue({ success: true });

    renderUnlicensedWithActivate(onActivate);
    await typeKeyAndActivate("SWS-GOOD-GOOD-GOOD");

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "License Activated! Reloading..."
      )
    );
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.info).not.toHaveBeenCalled();
  });
});
