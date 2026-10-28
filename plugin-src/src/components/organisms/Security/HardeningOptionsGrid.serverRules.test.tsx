/**
 * CF2 UX round 2, grid wiring (validator-written, 2026-10-04; review F-4).
 * Deleting the grid's <ServerRulesPanel /> left every Security test green.
 * This drives the real HardeningOptionsGrid, the component SecurityHub renders
 * on the hardening tab, and fails when the panel is not rendered from it.
 *
 * Ids: CF2-U2-7a (panel rendered with its block), CF2-U2-7b (control: no
 * server_rules -> no panel, so 7a cannot pass on some unrelated heading).
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, beforeAll } from "vitest";

type TL = typeof import("@testing-library/react");
let render: TL["render"];
let screen: TL["screen"];
let cleanup: TL["cleanup"];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let HardeningOptionsGrid: any;
let h: (typeof import("react"))["createElement"];

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  const RealReact = nodeRequire("react");
  window.React = RealReact;
  window.ReactDOM = { ...nodeRequire("react-dom"), ...nodeRequire("react-dom/client") };
  h = RealReact.createElement;
  ({ HardeningOptionsGrid } = await import("./HardeningOptionsGrid"));
  ({ render, screen, cleanup } = await import("@testing-library/react"));
});
afterEach(() => cleanup());

const BLOCK = "# BEGIN SwissWPSuite-BadBots\nSetEnvIf User-Agent x bad\n# END SwissWPSuite-BadBots";
function option(withRules: boolean) {
  return {
    key: "block_bad_bots",
    label: "Block Aggressive Web Crawlers",
    description: "d",
    enabled: true,
    pro: false,
    risk: "low",
    tier: "essential",
    requires_confirmation: false,
    ...(withRules ? { server_rules: { marker: "SwissWPSuite-BadBots", rules: BLOCK, present: false } } : {}),
  };
}
function renderGrid(withRules: boolean) {
  return render(
    h(HardeningOptionsGrid, { options: [option(withRules)], isLoading: false, onToggle: () => {}, onApplyAll: () => {} })
  );
}

describe("HardeningOptionsGrid renders the server rules panel (CF2 UX round 2)", () => {
  it("CF2-U2-7a: an enabled option whose block is missing shows the panel, its block and its copy button", () => {
    const { container } = renderGrid(true);
    expect(screen.getByRole("heading", { name: /server rules to add by hand/i })).toBeInTheDocument();
    expect(Array.from(container.querySelectorAll("pre")).some((p) => p.textContent === BLOCK)).toBe(true);
    expect(screen.getByRole("button", { name: /copy the rules for block aggressive web crawlers/i })).toBeInTheDocument();
  });

  it("CF2-U2-7b: control: without server_rules the grid shows no panel", () => {
    renderGrid(false);
    expect(screen.getByRole("switch", { name: /toggle block aggressive web crawlers/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /server rules to add by hand/i })).toBeNull();
  });
});
