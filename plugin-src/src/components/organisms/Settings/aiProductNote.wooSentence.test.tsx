/**
 * V63-V5-8 (CR-R3-137): the Settings > General note names the WooCommerce
 * benefit (AI rewriting of product descriptions) in ONE sentence with ONE
 * link, names the separate product as "SwissSuite AI Plus" exactly once,
 * and never says "Pro". Text-agnostic on purpose: it holds for every
 * candidate sentence in the plan, so the owner's verbatim choice is locked
 * by the exact-sentence assertion in aiProductNote.wporgWording.test.ts,
 * which the executor updates to the chosen text.
 *
 * Drives the rendered component (what the site owner reads), not the
 * source file.
 *
 * Executor: place at
 * plugin/src/components/organisms/Settings/aiProductNote.wooSentence.test.tsx
 * (the overlay copy renders nothing and is out of scope).
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, beforeAll, afterEach } from "vitest";

type NoteModule = typeof import("./aiProductNote");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");

let AiProductNote: NoteModule["AiProductNote"];
let PRODUCT_PAGE_URL: string;
let render: TestingLibraryModule["render"];
let cleanup: TestingLibraryModule["cleanup"];
let React: ReactModule;

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  window.React = nodeRequire("react");
  window.ReactDOM = {
    ...nodeRequire("react-dom"),
    ...nodeRequire("react-dom/client"),
  };
  ({ AiProductNote, PRODUCT_PAGE_URL } = await import("./aiProductNote"));
  ({ render, cleanup } = await import("@testing-library/react"));
  React = await import("react");
});

afterEach(() => cleanup());

function renderedText() {
  const { container } = render(React.createElement(AiProductNote));
  return {
    container,
    text: (container.textContent || "").replace(/\s+/g, " ").trim(),
  };
}

describe("AiProductNote — one sentence naming the WooCommerce benefit", () => {
  it("positive control: the note renders text", () => {
    expect(renderedText().text.length).toBeGreaterThan(40);
  });

  it("is exactly one sentence", () => {
    // A sentence end is . ! or ? followed by a space or the end of the
    // text. ".htaccess" and "swisswpsecure.com" are not sentence ends.
    const ends = renderedText().text.match(/[.!?](?=\s|$)/g) || [];
    expect(ends).toHaveLength(1);
  });

  it("has exactly one link, to the product page", () => {
    const links = renderedText().container.querySelectorAll("a");
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute("href")).toBe(PRODUCT_PAGE_URL);
  });

  it("names the WooCommerce product-description benefit", () => {
    const { text } = renderedText();
    expect(text).toMatch(/WooCommerce/);
    expect(text).toMatch(/product descriptions/i);
  });

  it('says "SwissSuite AI Plus" once and never "Pro"', () => {
    const { text } = renderedText();
    expect(text.match(/SwissSuite AI Plus/g) || []).toHaveLength(1);
    expect(text).not.toMatch(/\bPro\b/);
    expect(text.toLowerCase()).not.toMatch(
      /\b(edition|upgrade|unlock|subscription|tier|trial|premium|paid|locked)\b/
    );
  });
});
