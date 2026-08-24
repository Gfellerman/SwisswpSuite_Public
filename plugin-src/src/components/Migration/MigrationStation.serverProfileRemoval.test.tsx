/**
 * Vitest coverage for the D-B-4/F-11 dead-control removal (ARS Round D,
 * DX-4b, 2026-08-24): the "Server Profile" picker in MigrationStation.tsx's
 * Advanced Settings panel wrote `settings.serverProfile` via
 * `updateSettings()` — a backend field REMOVED this round
 * (`class-swisswpsuite-api-settings.php`'s D-B-4 fix: GET /settings no
 * longer returns `serverProfile`, POST /settings no longer accepts it —
 * confirmed live in source, see handoff/L-B_auto-update-manifest.md). The
 * picker was a silent no-op ("dead control" anti-pattern, R4 F-11 class)
 * and has been removed entirely from this file, along with its
 * `useSettings()` call, `savingProfile` state, and
 * `handleServerProfileChange` handler — all three were consumed ONLY by
 * this picker (confirmed via tree-wide grep of this file before removal;
 * zero other usages of `settings`/`updateSettings` existed here).
 *
 * React-externalization workaround (read before editing): same rationale
 * as GeneralSettings.test.tsx / SecurityHub.hardeningToggle.test.tsx — this
 * codebase externalizes React (WP.org Guideline 13, 2026-08-12); jsdom
 * never loads window.React, so the real npm react/react-dom is stamped
 * onto those globals in beforeAll BEFORE any aliased import runs. No JSX
 * in this file, React.createElement only.
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

type MigrationModule = typeof import("./MigrationStation");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");

let MigrationStation: MigrationModule["MigrationStation"];
let render: TestingLibraryModule["render"];
let screen: TestingLibraryModule["screen"];
let cleanup: TestingLibraryModule["cleanup"];
let fireEvent: TestingLibraryModule["fireEvent"];
let React: ReactModule;

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  const RealReact = nodeRequire("react");
  const RealReactDOM = nodeRequire("react-dom");
  const RealReactDOMClient = nodeRequire("react-dom/client");
  window.React = RealReact;
  window.ReactDOM = { ...RealReactDOM, ...RealReactDOMClient };

  ({ MigrationStation } = await import("./MigrationStation"));
  ({ render, screen, cleanup, fireEvent } = await import(
    "@testing-library/react"
  ));
  React = await import("react");
});

describe("MigrationStation — Server Profile dead-control removal (D-B-4/F-11, ARS Round D DX-4b)", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // isMock=true (no apiUrl/nonce) — matches "this UI needs no network to
    // render" contract; the picker being tested never required a real
    // backend to be visible in the pre-fix code either.
    (window as any).swisswpsuiteData = {};
    fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    (global as any).fetch = fetchSpy;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("does not render a Server Profile picker even with Advanced Settings expanded", () => {
    render(React.createElement(MigrationStation, { onCancel: () => {} }));

    // Expand the "Advanced Settings" <details> — the picker used to live inside it.
    fireEvent.click(screen.getByText("Advanced Settings"));

    expect(screen.queryByText("Server Profile")).not.toBeInTheDocument();
    expect(screen.queryByText("Shared Hosting")).not.toBeInTheDocument();
    expect(
      screen.queryByText("VPS or Dedicated Server")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Let the plugin figure out the best settings/i)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /automatic.*recommended/i })
    ).not.toBeInTheDocument();

    // The rest of Advanced Settings (Stuck? Clear migration data) still
    // renders — proves this removal took out only the dead picker, not the
    // whole panel.
    expect(
      screen.getByText("Stuck? Clear migration data")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Environment reset and diagnostic tools/i)
    ).toBeInTheDocument();
  });

  it("never fires a fetch/network call carrying serverProfile, on mount or after interacting with Advanced Settings", () => {
    render(React.createElement(MigrationStation, { onCancel: () => {} }));
    fireEvent.click(screen.getByText("Advanced Settings"));

    const calls = fetchSpy.mock.calls;
    for (const [, opts] of calls) {
      const body = (opts as RequestInit | undefined)?.body;
      if (typeof body === "string") {
        expect(body).not.toContain("serverProfile");
      }
    }

    // Structural guard: no clickable control offering the removed profiles
    // exists anywhere in the reachable tree, not just visually hidden.
    expect(
      screen.queryByRole("button", { name: /shared hosting/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /vps or dedicated server/i })
    ).not.toBeInTheDocument();
  });
});
