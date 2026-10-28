/**
 * CF2 D-15 acceptance (validator-written; owner order 2026-10-04): one shared,
 * accessible "capability note" — a short factual sentence plus ONE link to the
 * Settings screen's General tab, where the plugin's only product pointer
 * (AiProductNote) lives. The note never names an edition, never pressures,
 * and is inline text (no dismiss state, no timer).
 *
 * Contract: src/lib/capabilityNoteCopy.ts exports CAPABILITY_NOTES (one string
 * per placement), SETTINGS_PRODUCT_HREF === "#/settings?tab=general" and
 * SETTINGS_LINK_TEXT; src/components/atoms/CapabilityNote.tsx exports
 * CapabilityNote({ text }).
 *
 * Ids: CF2-D15-1 .. D15-3. RED on d40767d0 (modules absent).
 */
import { createRequire } from "module";
import { describe, it, expect, beforeAll, afterEach } from "vitest";

type TL = typeof import("@testing-library/react");
let render: TL["render"];
let screen: TL["screen"];
let cleanup: TL["cleanup"];
let h: (typeof import("react"))["createElement"];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let copy: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let CapabilityNote: any;

/** Words Free-shipped text may not carry (edition words + TXT-1 step-6 substrings that read as tiers). */
export const EDITION_WORDS =
  /\b(pro|premium|free|upgrade|unlock|tier|edition|paid|license|licence|subscription)\b/i;

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
  copy = await import("../../lib/capabilityNoteCopy");
  ({ CapabilityNote } = await import("./CapabilityNote"));
});
afterEach(() => cleanup());

describe("CapabilityNote (CF2 D-15)", () => {
  it("CF2-D15-1: links to the Settings General tab with self-describing link text", () => {
    render(h(CapabilityNote, { text: copy.CAPABILITY_NOTES.waf }));
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(copy.SETTINGS_PRODUCT_HREF).toBe("#/settings?tab=general");
    expect(links[0].getAttribute("href")).toBe("#/settings?tab=general");
    expect(links[0].getAttribute("target")).toBeNull();
    const name = (links[0].textContent || "").trim();
    expect(name).toMatch(/settings/i);
    expect(name).not.toMatch(/^(here|click here|more|read more)$/i);
  });

  it("CF2-D15-2: every placement's copy is short, factual and carries no edition word", () => {
    const entries = Object.entries(copy.CAPABILITY_NOTES) as [string, string][];
    expect(entries.length).toBeGreaterThanOrEqual(2);
    for (const [, text] of entries.concat([["link", copy.SETTINGS_LINK_TEXT]])) {
      expect(text.length).toBeGreaterThan(10);
      expect(text.length).toBeLessThan(200);
      expect(text).not.toMatch(EDITION_WORDS);
      expect(text).not.toMatch(/!|now\b|today|limited|hurry|\d+\s*%/i);
    }
  });

  it("CF2-D15-3: renders as inline text (no dismiss control, no live region)", () => {
    const { container } = render(h(CapabilityNote, { text: copy.CAPABILITY_NOTES.serverRules }));
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(container.querySelector("[aria-live],[role=alert],[role=status]")).toBeNull();
    expect(container.textContent).toContain(copy.CAPABILITY_NOTES.serverRules);
  });
});
