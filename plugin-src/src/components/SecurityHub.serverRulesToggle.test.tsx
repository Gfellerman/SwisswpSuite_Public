/**
 * CF2 UX round 2, toggle write-timeline (validator-written, 2026-10-04;
 * review F-2). Drives the REAL production caller: SecurityHub's hardening
 * tab, the on-screen switch, toggleHardening() with its optimistic update,
 * the POST, and the finally-invalidate refetch of /hardening/status.
 * wpApi is mocked at the network boundary only (same harness as
 * SecurityHub.hardeningToggle.test.tsx).
 *
 * Production flow per option X (one of the five root .htaccess options):
 *   t1 optimistic: enabled flips, server_rules (read before the toggle) kept
 *   t2 POST /hardening/toggle: the server saves the flag; a registered writer
 *      (Pro) adds/removes the block, so `present` follows `enabled`; with no
 *      writer (Free) `present` does not change
 *   t3 finally: invalidate -> GET /hardening/status -> effect re-sets options
 *
 * Contract: no add/remove instruction is shown from a `present` value read
 * BEFORE the toggle while that toggle is unsettled; after settle the panel
 * shows exactly what the server's status says (Free: the add row appears).
 *
 * Ids: CF2-U2-6a (writer adds: no flash while pending, none after),
 * CF2-U2-6b (writer removes: no flash while pending), CF2-U2-6c (no writer:
 * the add row appears after settle), CF2-U2-6d (no writer, block pasted:
 * the remove row appears after switching off).
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, beforeAll, beforeEach, vi } from "vitest";

vi.mock("../lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
vi.mock("./organisms/Security/TwoFactorNudgeLink", () => ({ TwoFactorNudgeLink: () => null }));
vi.mock("../services/api", () => ({
  wpApi: vi.fn(),
  ApiError: class ApiError extends Error {
    status?: number;
  },
}));

type TL = typeof import("@testing-library/react");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SecurityHub: any;
let render: TL["render"];
let screen: TL["screen"];
let cleanup: TL["cleanup"];
let fireEvent: TL["fireEvent"];
let waitFor: TL["waitFor"];
let act: TL["act"];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let React: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let QueryClient: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let QueryClientProvider: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wpApi: any;

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  window.React = nodeRequire("react");
  window.ReactDOM = { ...nodeRequire("react-dom"), ...nodeRequire("react-dom/client") };
  ({ default: SecurityHub } = await import("./SecurityHub"));
  ({ render, screen, cleanup, fireEvent, waitFor, act } = await import("@testing-library/react"));
  ({ QueryClient, QueryClientProvider } = await import("@tanstack/react-query"));
  ({ wpApi } = await import("../services/api"));
  React = await import("react");
});

const KEY = "block_bad_bots";
const BLOCK = "# BEGIN SwissWPSuite-BadBots\nSetEnvIf User-Agent x bad\n# END SwissWPSuite-BadBots";
const PANEL = /server rules to add by hand/i;

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

/** writer=true: present follows enabled on commit (Pro). writer=false: present never changes (Free). */
function setupServer(start: { enabled: boolean; present: boolean }, writer: boolean) {
  const server = { ...start };
  const posts: Array<{ commit: () => void; resolve: (v: unknown) => void }> = [];
  let statusCalls = 0;
  wpApi.mockImplementation((url: string, opts?: RequestInit) => {
    if (url === "/hardening/status") {
      statusCalls++;
      return Promise.resolve({
        success: true,
        options: {
          [KEY]: {
            key: KEY,
            label: "Block Bad Bots",
            description: "d",
            enabled: server.enabled,
            pro: false,
            risk: "low",
            tier: "essential",
            server_rules: { marker: "SwissWPSuite-BadBots", rules: BLOCK, present: server.present },
          },
        },
      });
    }
    if (url === "/hardening/toggle") {
      const body = JSON.parse((opts?.body as string) ?? "{}");
      const d = deferred<unknown>();
      posts.push({
        commit: () => {
          server.enabled = !!body.enable;
          if (writer) server.present = !!body.enable;
        },
        resolve: d.resolve,
      });
      return d.promise;
    }
    if (url === "/security/status")
      return Promise.resolve({
        firewall_enabled: false, spam_enabled: false, block_sqli: false, block_xss: false,
        simulation_mode: false, geo_enabled: false, global_geo_block: false, login_enabled: false, last_scan: "",
      });
    if (url === "/security/logs") return Promise.resolve([]);
    if (url === "/security/banned-ips") return Promise.resolve({ ips: [] });
    if (url === "/security/sentinel/latest-scan") return Promise.resolve({ success: false, record: null });
    if (url === "/security/environment")
      return Promise.resolve({ success: true, environment: { cloudflare: { detected: false } } });
    return Promise.resolve({ success: true });
  });
  return { posts, statusCalls: () => statusCalls };
}

function renderHub() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(React.createElement(QueryClientProvider, { client }, React.createElement(SecurityHub)));
}

async function openSwitch(checked: boolean) {
  fireEvent.click(screen.getByRole("button", { name: "hardening" }));
  const sw = await screen.findByRole("switch", { name: /toggle block bad bots/i });
  expect(sw).toHaveAttribute("aria-checked", String(checked));
  return sw;
}

/** Let pending promises, query notifications (setTimeout 0) and effects run. */
async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 30));
  });
}

describe("SecurityHub hardening toggle and the server rules panel (CF2 UX round 2)", () => {
  beforeEach(() => {
    (window as unknown as { swisswpsuiteData: unknown }).swisswpsuiteData = {};
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("CF2-U2-6a: writer adds the block: no add row while the toggle is pending, none after it settles", async () => {
    const srv = setupServer({ enabled: false, present: false }, true);
    renderHub();
    const sw = await openSwitch(false);
    expect(screen.queryByRole("heading", { name: PANEL })).toBeNull();
    fireEvent.click(sw);
    await waitFor(() => expect(sw).toHaveAttribute("aria-checked", "true"));
    await waitFor(() => expect(srv.posts.length).toBe(1));
    await flush();
    expect(screen.queryByRole("heading", { name: PANEL })).toBeNull();
    const before = srv.statusCalls();
    srv.posts[0].commit();
    srv.posts[0].resolve({ success: true });
    await waitFor(() => expect(srv.statusCalls()).toBeGreaterThan(before));
    await flush();
    expect(sw).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByRole("heading", { name: PANEL })).toBeNull();
  });

  it("CF2-U2-6b: writer removes the block: no remove row while the toggle is pending", async () => {
    const srv = setupServer({ enabled: true, present: true }, true);
    renderHub();
    const sw = await openSwitch(true);
    expect(screen.queryByRole("heading", { name: PANEL })).toBeNull();
    fireEvent.click(sw);
    await waitFor(() => expect(sw).toHaveAttribute("aria-checked", "false"));
    await waitFor(() => expect(srv.posts.length).toBe(1));
    await flush();
    expect(screen.queryByRole("heading", { name: PANEL })).toBeNull();
    srv.posts[0].commit();
    srv.posts[0].resolve({ success: true });
    await flush();
    await flush();
    expect(screen.queryByRole("heading", { name: PANEL })).toBeNull();
  });

  it("CF2-U2-6c: no writer: after switching on, the add row appears once the toggle settles", async () => {
    const srv = setupServer({ enabled: false, present: false }, false);
    renderHub();
    const sw = await openSwitch(false);
    fireEvent.click(sw);
    await waitFor(() => expect(srv.posts.length).toBe(1));
    srv.posts[0].commit();
    srv.posts[0].resolve({ success: true, server_rules: [{ marker: "SwissWPSuite-BadBots", rules: BLOCK, present: false }] });
    await waitFor(() => expect(screen.getByRole("heading", { name: PANEL })).toBeInTheDocument());
    expect(screen.getByText(/Not found in your .htaccess file yet/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy the rules for block bad bots/i })).toBeInTheDocument();
  });

  it("CF2-U2-6d: no writer, block pasted earlier: after switching off, the remove row appears once settled", async () => {
    const srv = setupServer({ enabled: true, present: true }, false);
    renderHub();
    const sw = await openSwitch(true);
    fireEvent.click(sw);
    await waitFor(() => expect(srv.posts.length).toBe(1));
    srv.posts[0].commit();
    srv.posts[0].resolve({ success: true });
    await waitFor(() => expect(screen.getByRole("heading", { name: PANEL })).toBeInTheDocument());
    expect(screen.getByText(/This block is still in your .htaccess file, but the option is off/)).toBeInTheDocument();
  });
});
