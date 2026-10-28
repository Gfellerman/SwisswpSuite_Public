/**
 * CF2 Q3 + D-15 acceptance for the Free firewall summary (validator-written;
 * owner rulings 2026-10-04): the Free request check no longer inspects
 * cookies, so the panel must not claim it does, must name cookies among what
 * is not inspected, and ends with the shared capability note (CAPABILITY_NOTES.waf,
 * link to the Settings General tab). The Pro overlay's own WafTierPanel is untouched.
 *
 * Ids: CF2-Q3U-1 .. Q3U-3. RED on d40767d0: Q3U-1, Q3U-2, Q3U-3.
 */
import { createRequire } from "module";
import { describe, it, expect, beforeAll, afterEach } from "vitest";

type TL = typeof import("@testing-library/react");
let render: TL["render"];
let screen: TL["screen"];
let cleanup: TL["cleanup"];
let h: (typeof import("react"))["createElement"];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let WafTierPanel: any;

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  const RealReact = nodeRequire("react");
  (window as unknown as { React: unknown }).React = RealReact;
  (window as unknown as { ReactDOM: unknown }).ReactDOM = {
    ...nodeRequire("react-dom"),
    ...nodeRequire("react-dom/client"),
  };
  h = RealReact.createElement;
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  ({ WafTierPanel } = await import("./WafTierPanel"));
});
afterEach(() => cleanup());

describe("WafTierPanel (Free) after CF2", () => {
  it("CF2-Q3U-1: no inspected item mentions cookies", () => {
    render(h(WafTierPanel));
    const items = screen.getAllByRole("listitem").map((li) => li.textContent || "");
    expect(items.length).toBe(3);
    for (const t of items) expect(t).not.toMatch(/cookie/i);
  });

  it("CF2-Q3U-2: the not-inspected sentence names cookies", () => {
    const { container } = render(h(WafTierPanel));
    const ps = Array.from(container.querySelectorAll("p")).map((p) => p.textContent || "");
    expect(ps.some((t) => /not inspected/i.test(t) && /cookies/i.test(t))).toBe(true);
  });

  it("CF2-Q3U-3: ends with the capability note linking to the Settings General tab", () => {
    render(h(WafTierPanel));
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("#/settings?tab=general");
  });
});
