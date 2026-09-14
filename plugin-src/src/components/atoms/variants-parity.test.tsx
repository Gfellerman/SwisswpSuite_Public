/**
 * Byte-identical className parity lock for Button/Badge/Card across the
 * class-variance-authority → local lib/variants.ts swap (WP.org licence
 * compliance, 2026-09-14 — see plugin/src/lib/variants.ts header).
 *
 * Renders every declared variant (and, for Button, every variant x size
 * combination) and snapshots the resulting `className`. Run BEFORE the
 * swap against the original cva-based atoms to capture the ground-truth
 * snapshot file, then run again UNCHANGED after the swap — a snapshot
 * mismatch fails the run, proving the rendered class strings did not move
 * by a single character.
 *
 * React-externalization workaround (read before editing): this codebase
 * externalizes React (WP.org Guideline 13) — vite.config.ts's
 * resolve.alias redirects `react`/`react-dom`/`react/jsx-runtime` to a
 * proxy reading WordPress's already-loaded `window.React`/`window.ReactDOM`
 * global. jsdom never loads that global, so this file stamps the REAL npm
 * react/react-dom onto those globals in `beforeAll`, BEFORE any aliased
 * import runs (same pattern as ui/Badge.test.tsx).
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, beforeAll } from "vitest";

type ButtonModule = typeof import("./Button");
type BadgeModule = typeof import("./Badge");
type CardModule = typeof import("./Card");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");

let Button: ButtonModule["Button"];
let Badge: BadgeModule["Badge"];
let Card: CardModule["Card"];
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

  ({ Button } = await import("./Button"));
  ({ Badge } = await import("./Badge"));
  ({ Card } = await import("./Card"));
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  React = await import("react");
});

afterEach(() => {
  cleanup();
});

const BUTTON_VARIANTS = [
  "default",
  "destructive",
  "outline",
  "secondary",
  "ghost",
  "link",
] as const;
const BUTTON_SIZES = ["default", "sm", "lg", "icon"] as const;

describe("Button — variant class parity", () => {
  for (const variant of BUTTON_VARIANTS) {
    for (const size of BUTTON_SIZES) {
      it(`variant=${variant} size=${size}`, () => {
        render(
          React.createElement(Button, { variant, size }, "Label")
        );
        const btn = screen.getByText("Label");
        expect(btn.className).toMatchSnapshot();
      });
    }
  }

  it("no props (defaultVariants: variant=default size=default)", () => {
    render(React.createElement(Button, {}, "Label"));
    expect(screen.getByText("Label").className).toMatchSnapshot();
  });

  it("merges a caller className after the variant classes", () => {
    render(
      React.createElement(
        Button,
        { variant: "outline", size: "lg", className: "custom-extra" },
        "Label"
      )
    );
    expect(screen.getByText("Label").className).toMatchSnapshot();
  });
});

const BADGE_VARIANTS = [
  "default",
  "secondary",
  "destructive",
  "success",
  "warning",
  "danger",
  "info",
  "outline",
] as const;

describe("Badge — variant class parity", () => {
  for (const variant of BADGE_VARIANTS) {
    it(`variant=${variant}`, () => {
      render(React.createElement(Badge, { variant }, "Label"));
      expect(screen.getByText("Label").className).toMatchSnapshot();
    });
  }

  it("no props (defaultVariants: variant=default)", () => {
    render(React.createElement(Badge, {}, "Label"));
    expect(screen.getByText("Label").className).toMatchSnapshot();
  });

  it("merges a caller className after the variant class", () => {
    render(
      React.createElement(Badge, { variant: "success", className: "custom-extra" }, "Label")
    );
    expect(screen.getByText("Label").className).toMatchSnapshot();
  });
});

const CARD_VARIANTS = ["flat", "elevated"] as const;

describe("Card — variant class parity", () => {
  for (const variant of CARD_VARIANTS) {
    it(`variant=${variant}`, () => {
      const { container } = render(
        React.createElement(Card, { variant }, "Body")
      );
      expect((container.firstElementChild as HTMLElement).className).toMatchSnapshot();
    });
  }

  it("no props (defaultVariants: variant=flat)", () => {
    const { container } = render(React.createElement(Card, {}, "Body"));
    expect((container.firstElementChild as HTMLElement).className).toMatchSnapshot();
  });

  it("merges a caller className after the variant class", () => {
    const { container } = render(
      React.createElement(
        Card,
        { variant: "elevated", className: "custom-extra" },
        "Body"
      )
    );
    expect((container.firstElementChild as HTMLElement).className).toMatchSnapshot();
  });
});
