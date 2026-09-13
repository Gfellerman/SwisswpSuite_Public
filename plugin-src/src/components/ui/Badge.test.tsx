/**
 * Vitest coverage for Badge.tsx (A11Y-BADGE-DARK-CONTRAST, v2.9.33.53).
 *
 * Regression lock for the fix documented inline in Badge.tsx: the
 * neutral/default/secondary/outline variants must use the theme-aware
 * `text-secondary-foreground` / `text-foreground` tokens (which invert
 * with `.dark` in plugin/src/index.css) rather than the fixed
 * `text-slate-700` that measured 1.54:1 / 1.65:1 against the real
 * `--secondary` / `--card` dark-mode tokens — see the a11y-engineer
 * agent-memory pattern note for the OKLCH-derived ratios. This is a
 * class-assertion regression lock, not a rendered-pixel contrast
 * computation — jsdom does not compute contrast, so a computed-style
 * check here would only re-assert the class list under another name.
 *
 * Also locks WCAG 4.1.2: the decorative `icon` prop must always render
 * with `aria-hidden="true"` — every current call site pairs the icon
 * with adjacent Badge text that already carries the full meaning
 * (SelfCheckPanel.tsx StatusBadge, TwoFactorSettings.tsx "PRO FEATURE"/
 * "Active"), so the icon has no accessible name of its own to preserve.
 *
 * React-externalization workaround (read before editing): this codebase
 * externalizes React (WP.org Guideline 13) — vite.config.ts's
 * resolve.alias redirects `react`/`react-dom`/`react/jsx-runtime` to a
 * proxy reading WordPress's already-loaded `window.React`/`window.ReactDOM`
 * global. jsdom never loads that global, so this file stamps the REAL npm
 * react/react-dom onto those globals in `beforeAll`, BEFORE any aliased
 * import runs (same pattern as HardeningOptionsGrid.test.tsx /
 * SelfCheckPanel.test.tsx).
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, beforeAll } from "vitest";

type BadgeModule = typeof import("./Badge");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");

let Badge: BadgeModule["Badge"];
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

  ({ Badge } = await import("./Badge"));
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  React = await import("react");
});

describe("Badge — dark-mode contrast tokens (WCAG 1.4.3, Zero Tolerance rule)", () => {
  afterEach(() => {
    cleanup();
  });

  it.each(["neutral", "default", "secondary"] as const)(
    "variant=%s uses text-secondary-foreground (theme-aware), never the fixed text-slate-700",
    (variant) => {
      render(React.createElement(Badge, { variant, children: "Label" }));
      const badge = screen.getByText("Label");
      expect(badge.className).toContain("text-secondary-foreground");
      expect(badge.className).toContain("bg-secondary");
      expect(badge.className).not.toContain("text-slate-700");
    }
  );

  it("variant=outline uses text-foreground (theme-aware), never the fixed text-slate-700", () => {
    render(
      React.createElement(Badge, { variant: "outline", children: "Label" })
    );
    const badge = screen.getByText("Label");
    expect(badge.className).toContain("text-foreground");
    expect(badge.className).not.toContain("text-slate-700");
  });

  it.each([
    "success",
    "warning",
    "danger",
    "high",
    "info",
    "destructive",
  ] as const)(
    "variant=%s keeps its fixed self-contained color pair (unaffected by this fix, both themes stay >=4.5:1)",
    (variant) => {
      render(React.createElement(Badge, { variant, children: "Label" }));
      const badge = screen.getByText("Label");
      expect(badge.className).not.toContain("text-slate-700");
    }
  );
});

describe("Badge — decorative icon aria-hidden (WCAG 4.1.2)", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the icon prop with aria-hidden=true so AT does not announce a redundant image role", () => {
    const DummyIcon = (props: React.SVGProps<SVGSVGElement>) =>
      React.createElement("svg", { ...props, "data-testid": "badge-icon" });

    render(
      React.createElement(Badge, {
        variant: "neutral",
        icon: DummyIcon,
        children: "PRO FEATURE",
      })
    );

    const icon = screen.getByTestId("badge-icon");
    expect(icon).toHaveAttribute("aria-hidden", "true");
    // The visible text is still the accessible name — aria-hidden on the
    // icon must not remove it from the accessibility tree.
    expect(screen.getByText("PRO FEATURE")).toBeVisible();
  });

  it("renders no icon element at all when the icon prop is omitted", () => {
    render(
      React.createElement(Badge, { variant: "success", children: "Active" })
    );
    expect(screen.queryByTestId("badge-icon")).not.toBeInTheDocument();
  });
});
