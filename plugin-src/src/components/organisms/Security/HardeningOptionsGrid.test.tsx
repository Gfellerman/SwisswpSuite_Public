/**
 * Vitest coverage for HardeningOptionsGrid's htaccess_warning badge
 * (ADDENDUM-2 F-U9, 2026-08-20 — condition (5)).
 *
 * The badge is purely informational: it must render when opt.htaccess_warning
 * is present, must NOT flip the toggle's visual state (aria-checked / the
 * green/red switch color) — the switch continues to reflect the real,
 * PHP-enforced `enabled` value from the corrected tri-state backend fix — and
 * must not render at all when htaccess_warning is absent (including the
 * common "everything is fine" and "option is off" cases).
 *
 * React-externalization workaround (read before editing): this codebase
 * externalizes React (WP.org Guideline 13, 2026-08-12) — vite.config.ts's
 * resolve.alias redirects every `import ... from "react"` / "react-dom" /
 * "react/jsx-runtime" to a proxy reading WordPress's already-loaded
 * `window.React`/`window.ReactDOM` global at import time. jsdom never loads
 * that global, so this file stamps the REAL npm react/react-dom onto those
 * globals in `beforeAll`, BEFORE any aliased import runs (same pattern as
 * WafUpsellCard.test.tsx / ErrorBoundary.test.tsx) — no JSX anywhere in this
 * file, `React.createElement` only.
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, beforeAll } from "vitest";

type GridModule = typeof import("./HardeningOptionsGrid");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");
type TypesModule = typeof import("../../../types");

let HardeningOptionsGrid: GridModule["HardeningOptionsGrid"];
let render: TestingLibraryModule["render"];
let screen: TestingLibraryModule["screen"];
let cleanup: TestingLibraryModule["cleanup"];
let React: ReactModule;

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  const RealReact = nodeRequire("react");
  const RealReactDOM = nodeRequire("react-dom");
  const RealReactDOMClient = nodeRequire("react-dom/client");
  window.React = RealReact;
  window.ReactDOM = { ...RealReactDOM, ...RealReactDOMClient };

  ({ HardeningOptionsGrid } = await import("./HardeningOptionsGrid"));
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  React = await import("react");
});

function baseOption(
  overrides: Partial<import("../../../types").HardeningOption> = {}
): import("../../../types").HardeningOption {
  return {
    key: "force_security_headers",
    label: "Security Headers",
    description: "Sends hardened HTTP security headers on every response.",
    enabled: true,
    pro: false,
    risk: "low",
    tier: "essential",
    requires_confirmation: false,
    ...overrides,
  };
}

describe("HardeningOptionsGrid — htaccess_warning badge (ADDENDUM-2 F-U9)", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a warning affordance with the backend message when htaccess_warning is present, WITHOUT flipping the toggle to off", () => {
    const warningText =
      "Server-level rule not present — PHP-level protection is still active.";
    const options = [
      baseOption({ enabled: true, htaccess_warning: warningText }),
    ];

    render(
      React.createElement(HardeningOptionsGrid, {
        options,
        hasSentinelPro: true,
        isLoading: false,
        onToggle: () => {},
        onApplyAll: () => {},
      })
    );

    // The switch must still show ON — the warning must not downgrade it.
    const toggle = screen.getByRole("switch", {
      name: /toggle security headers/i,
    });
    expect(toggle).toHaveAttribute("aria-checked", "true");

    // The warning text is reachable by an assistive technology (sr-only
    // span) and via the native title tooltip — both carry the real message.
    expect(screen.getByText(warningText)).toBeInTheDocument();
  });

  it("does not render any warning affordance when htaccess_warning is absent (the common case)", () => {
    const options = [
      baseOption({ enabled: true, htaccess_warning: undefined }),
    ];

    render(
      React.createElement(HardeningOptionsGrid, {
        options,
        hasSentinelPro: true,
        isLoading: false,
        onToggle: () => {},
        onApplyAll: () => {},
      })
    );

    const toggle = screen.getByRole("switch", {
      name: /toggle security headers/i,
    });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(
      screen.queryByText(/server-level rule not present/i)
    ).not.toBeInTheDocument();
  });

  it("does not render a warning affordance for an option that is off, even if htaccess_warning were somehow set", () => {
    // Defensive case: the backend never sets htaccess_warning on a
    // DB-false option (get_full_status()'s `continue` on empty enabled),
    // but the component must not render stale/impossible warning state
    // regardless — the switch's own off/red rendering must not gain a
    // warning badge next to it.
    const options = [
      baseOption({
        enabled: false,
        htaccess_warning: "stale warning that should never appear",
      }),
    ];

    render(
      React.createElement(HardeningOptionsGrid, {
        options,
        hasSentinelPro: true,
        isLoading: false,
        onToggle: () => {},
        onApplyAll: () => {},
      })
    );

    const toggle = screen.getByRole("switch", {
      name: /toggle security headers/i,
    });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(
      screen.queryByText("stale warning that should never appear")
    ).not.toBeInTheDocument();
  });
});
