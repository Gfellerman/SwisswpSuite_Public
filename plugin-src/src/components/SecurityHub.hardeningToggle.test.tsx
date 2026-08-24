/**
 * Vitest coverage for the LIVE hardening-toggle race fix (A-1, ARS Round C
 * Phase 1b / P1-24 re-derivation, 2026-08-23).
 *
 * Context: the original P1-24 fix (LiveQA-F3) was applied to
 * plugin/src/hooks/useHardening.ts's toggleOption() — a hook with ZERO
 * callers anywhere in the app (grep-verified: `useHardening(` matches only
 * its own definition and its own test file). The actual live handler wired
 * to <HardeningOptionsGrid onToggle={...}> is `toggleHardening()`, a local
 * closure inside SecurityHub.tsx — that is where the mutation-queue
 * serialisation now lives (see the ARS Round C P1-24 comment at its
 * declaration). This test drives that REAL production caller path: it
 * renders SecurityHub itself, switches to the "hardening" tab, and clicks
 * the actual on-screen toggle switch — not a reimplementation, not the
 * orphaned hook.
 *
 * Race being tested: two rapid clicks on the same option (enable, then
 * disable) must not let the second POST start before the first POST +
 * settle-refetch cycle has fully completed. Proven with a manually
 * controlled ("deferred") promise for /hardening/toggle — under the
 * pre-fix code both clicks fire their POST immediately (no queue), so the
 * mock is called twice before either resolves; under the fix, the second
 * call is only dispatched after the first is manually resolved.
 *
 * React-externalization workaround (read before editing): same rationale
 * as GeneralSettings.test.tsx / SeoSettings.test.tsx / HardeningOptionsGrid
 * .test.tsx — this codebase externalizes React (WP.org Guideline 13,
 * 2026-08-12); jsdom never loads window.React, so the real npm
 * react/react-dom is stamped onto those globals in beforeAll BEFORE any
 * aliased import runs. No JSX in this file, React.createElement only.
 *
 * Scope-narrowing mocks (both unrelated to hardening, both would otherwise
 * require infrastructure this test has no reason to set up):
 *   - "sonner" — avoid toast portal/DOM plumbing.
 *   - FeaturePointer — SecurityHub renders
 *     `{!isProEditionBuild && <FeaturePointer variant="edition" />}` in the
 *     default "dashboard" tab (mounted first, before this test switches to
 *     "hardening"), and that component renders a react-router-dom <Link>,
 *     which throws outside a Router. Mocking it out is the same choice
 *     already made in SeoManager.test.tsx for the identical component.
 * `wpApi` ("../services/api") is mocked at the network boundary only —
 * every hook/handler/state update inside SecurityHub.tsx runs for real.
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

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("./organisms/Upsell/FeaturePointer", () => ({
  FeaturePointer: () => null,
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

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  const RealReact = nodeRequire("react");
  const RealReactDOM = nodeRequire("react-dom");
  const RealReactDOMClient = nodeRequire("react-dom/client");
  window.React = RealReact;
  window.ReactDOM = { ...RealReactDOM, ...RealReactDOMClient };

  ({ default: SecurityHub } = await import("./SecurityHub"));
  ({ render, screen, cleanup, fireEvent, waitFor } = await import(
    "@testing-library/react"
  ));
  ({ QueryClient, QueryClientProvider } = await import(
    "@tanstack/react-query"
  ));
  ({ wpApi } = await import("../services/api"));
  React = await import("react");
});

// A single free/essential, non-confirmation-gated hardening option — enough
// to exercise the toggle without hitting the HardeningConfirmDialog branch.
const OPTION_KEY = "block_bad_bots";
function optionPayload(enabled: boolean) {
  return {
    [OPTION_KEY]: {
      key: OPTION_KEY,
      label: "Block Bad Bots",
      description: "Blocks known malicious bot user-agents.",
      enabled,
      pro: false,
      risk: "low",
      tier: "essential",
    },
  };
}

/** A promise plus its externally-callable resolve — lets the test control
 * exactly when a given /hardening/toggle POST "returns from the server". */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function setupWpApiMock() {
  // "Server truth" the test manipulates as each deferred POST resolves.
  let serverEnabled = false;
  const toggleDeferreds: Array<ReturnType<typeof deferred<any>>> = [];

  (wpApi as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (url: string, opts?: RequestInit) => {
      if (url === "/hardening/status") {
        return Promise.resolve({
          success: true,
          options: optionPayload(serverEnabled),
        });
      }
      if (url === "/hardening/toggle") {
        const body = JSON.parse((opts?.body as string) ?? "{}");
        const d = deferred<{ success: boolean }>();
        toggleDeferreds.push(d);
        // Resolving this promise is what simulates "the server responded" —
        // the test decides exactly when, and updates serverEnabled to match
        // the intent of THIS specific call at that moment.
        (d as any)._commit = () => {
          serverEnabled = !!body.enable;
        };
        return d.promise;
      }
      // Every other endpoint SecurityHub queries on mount — safe, inert
      // defaults so those unrelated useQuery calls don't throw or hang.
      if (url === "/security/status") {
        return Promise.resolve({
          firewall_enabled: false,
          spam_enabled: false,
          block_sqli: false,
          block_xss: false,
          simulation_mode: false,
          geo_enabled: false,
          global_geo_block: false,
          login_enabled: false,
          last_scan: "",
        });
      }
      if (url === "/security/logs") return Promise.resolve([]);
      if (url === "/security/sentinel/status")
        return Promise.resolve({ has_audit: false });
      if (url === "/security/banned-ips")
        return Promise.resolve({ ips: [] });
      if (url === "/security/sentinel/latest-scan")
        return Promise.resolve({ success: false, record: null });
      if (url === "/security/environment")
        return Promise.resolve({
          success: true,
          environment: { cloudflare: { detected: false } },
        });
      return Promise.resolve({ success: true });
    }
  );

  return {
    toggleDeferreds,
    resolveToggle: (index: number) => {
      const d = toggleDeferreds[index] as any;
      d._commit();
      d.resolve({ success: true });
    },
  };
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

describe("SecurityHub — live toggleHardening() race fix (A-1, ARS Round C Phase 1b)", () => {
  beforeEach(() => {
    (window as any).swisswpsuiteData = {};
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("serialises two rapid toggles: the second POST is not dispatched until the first has settled", async () => {
    const { toggleDeferreds } = setupWpApiMock();
    renderSecurityHub();

    fireEvent.click(screen.getByRole("button", { name: "hardening" }));

    const toggle = await screen.findByRole("switch", {
      name: /toggle block bad bots/i,
    });
    expect(toggle).toHaveAttribute("aria-checked", "false");

    // Click 1 (enable). toggleHardening()'s optimistic setHardeningOptions()
    // runs inside the queued `run()` closure, not synchronously in the click
    // handler, so wait for it to actually flush before reading opt.enabled
    // for click 2 — exactly like a real second click landing a beat later.
    fireEvent.click(toggle);
    await waitFor(() => {
      expect(toggle).toHaveAttribute("aria-checked", "true");
    });
    expect(toggleDeferreds.length).toBe(1);

    // Click 2 (disable — computed from the now-optimistic enabled=true),
    // fired WHILE click 1's POST is still pending (deferred, unresolved).
    fireEvent.click(toggle);

    // THE regression assertion: click 2's POST must NOT be dispatched until
    // click 1's full settle cycle (POST + invalidateQueries refetch)
    // completes. Pre-fix, toggleHardening() had no queue at all — both
    // clicks would fire wpApi("/hardening/toggle", ...) independently, and
    // this count would already be 2 here regardless of click 1's pending
    // promise. Give any stray microtasks a chance to run first so this
    // isn't a false negative from under-flushing.
    await Promise.resolve();
    await Promise.resolve();
    expect(toggleDeferreds.length).toBe(1);

    // Settle click 1 (server commits "enabled=true") — this also lets the
    // finally-block's `invalidateQueries` refetch resolve, which is what
    // unblocks the queue for click 2.
    (toggleDeferreds[0] as any)._commit();
    (toggleDeferreds[0] as any).resolve({ success: true });

    await waitFor(() => {
      expect(toggleDeferreds.length).toBe(2);
    });

    // Settle click 2 (server commits "enabled=false" — the LAST click's intent).
    (toggleDeferreds[1] as any)._commit();
    (toggleDeferreds[1] as any).resolve({ success: true });

    await waitFor(() => {
      expect(toggle).toHaveAttribute("aria-checked", "false");
    });

    expect(toggleDeferreds.length).toBe(2);
    // Confirms the request bodies actually diverged (enable then disable),
    // not two identical "enable" calls.
    const bodies = (wpApi as unknown as ReturnType<typeof vi.fn>).mock.calls
      .filter(([url]: [string]) => url === "/hardening/toggle")
      .map(([, opts]: [string, RequestInit]) => JSON.parse(opts.body as string));
    expect(bodies).toEqual([
      { option: OPTION_KEY, enable: true },
      { option: OPTION_KEY, enable: false },
    ]);
  });
});
