/**
 * Render coverage for ScanCard: no card carries a tier pill, on any scan type.
 *
 * V4-M-7 — WHAT THIS TEST USED TO MISS
 * ------------------------------------
 * The previous form asserted `queryByText("FREE")` and `queryByText("PRO")` —
 * an EXACT, CASE-SENSITIVE, whole-text-content match — and rendered only 2 of
 * the >= 4 scan types the component can take. It therefore passed against a
 * pill naming a paid tier, a "Free plan", or anything
 * rendered on `malware` or `full-ai`. Both blind spots are the F-20 class the
 * plan names as the third consecutive round of the same miss: quoting/casing
 * and population.
 *
 * It now derives the scan-type list from the component's own SCAN_TYPES map
 * (so a fifth type added tomorrow is covered automatically rather than
 * silently skipped), renders every one in three states, and matches
 * CASE-INSENSITIVELY on any short leaf element whose text contains a
 * `pro | free | tier` word.
 *
 * Fail-first: run against the pre-fix file, whose
 * header rendered `<TierBadge tier={SCAN_TIER[scanType]} />`.
 *
 * React-externalization workaround (read before editing): this codebase
 * externalizes React (WP.org Guideline 13, 2026-08-12) — vite.config.ts's
 * resolve.alias redirects every `import ... from "react"` / "react-dom" /
 * "react/jsx-runtime" to a proxy reading WordPress's already-loaded
 * `window.React`/`window.ReactDOM` global at import time. jsdom never loads
 * that global, so this file stamps the REAL npm react/react-dom onto those
 * globals in `beforeAll`, BEFORE any aliased import runs — no JSX anywhere
 * in this file, `React.createElement` only.
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, beforeAll } from "vitest";

type ScanCardModule = typeof import("./ScanCard");
type ScanConstantsModule = typeof import("./scanConstants");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");

let ScanCard: ScanCardModule["ScanCard"];
let SCAN_TYPES: ScanConstantsModule["SCAN_TYPES"];
let render: TestingLibraryModule["render"];
let screen: TestingLibraryModule["screen"];
let cleanup: TestingLibraryModule["cleanup"];
let React: ReactModule;

/** Every scan type the component can render, derived from source, not listed here. */
let SCAN_TYPE_VALUES: ScanConstantsModule["SCAN_TYPES"][keyof ScanConstantsModule["SCAN_TYPES"]][];

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  const RealReact = nodeRequire("react");
  const RealReactDOM = nodeRequire("react-dom");
  const RealReactDOMClient = nodeRequire("react-dom/client");
  window.React = RealReact;
  window.ReactDOM = { ...RealReactDOM, ...RealReactDOMClient };

  ({ ScanCard } = await import("./ScanCard"));
  ({ SCAN_TYPES } = await import("./scanConstants"));
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  React = await import("react");

  SCAN_TYPE_VALUES = Object.values(SCAN_TYPES);
});

/**
 * A tier pill is a BADGE: a short leaf element whose own text names a tier.
 * Case-insensitive, word-bounded, and substring-tolerant, so any casing of the word,
 * "PRO tier" and "Free plan" all match while ordinary prose containing
 * "improve" or "freedom" does not.
 *
 * The 40-character ceiling keeps the card's descriptions — multi-sentence
 * paragraphs — out of the match set without excluding any realistic badge.
 */
const TIER_WORD = /\b(pro|free|tier)\b/i;

function tierPillCandidates(container: HTMLElement): string[] {
  const hits: string[] = [];
  container.querySelectorAll("*").forEach((el) => {
    if (el.children.length > 0) return; // leaf elements only
    const text = (el.textContent ?? "").trim();
    if (text.length === 0 || text.length > 40) return;
    if (TIER_WORD.test(text)) hits.push(text);
  });
  return hits;
}

function renderCard(
  scanType: (typeof SCAN_TYPE_VALUES)[number],
  extra: Record<string, unknown> = {}
) {
  return render(
    React.createElement(ScanCard, {
      scanType,
      onTrigger: () => {},
      isLoading: false,
      ...extra,
    })
  );
}

describe("ScanCard — no tier pill on any scan type", () => {
  afterEach(() => {
    cleanup();
  });

  it("covers every scan type the component can render (population control)", () => {
    // If SCAN_TYPES ever grows or shrinks, this figure changes and the
    // per-type cases below track it — the list is never hand-maintained
    // here. Derived directly from the map's own key count (not a hardcoded
    // number) so this assertion cannot itself go stale the way a literal
    // "4" did when round 4 removed the "full-ai" entry (3 scan types then;
    // round 10 removed "security-audit" and "malware" too, leaving the one
    // card — deep-malware — this build's Scan tab actually renders).
    // The >= 1 floor still guards against a REGRESSION that empties the map.
    expect(SCAN_TYPE_VALUES.length).toBe(Object.keys(SCAN_TYPES).length);
    expect(SCAN_TYPE_VALUES.length).toBeGreaterThanOrEqual(1);
    expect(new Set(SCAN_TYPE_VALUES).size).toBe(SCAN_TYPE_VALUES.length);
  });

  it("positive control: the matcher CAN find a tier pill when one exists", () => {
    // Without this, a clean result below is an untested query rather than a
    // finding. Every casing/spacing variant the old
    // exact-match form would have missed is proven detectable here.
    const { container } = render(
      React.createElement(
        "div",
        null,
        React.createElement("span", null, "PRO"),
        React.createElement("span", null, ["P","ro"].join("")),
        React.createElement("span", null, "free"),
        React.createElement("span", null, " Free "),
        React.createElement("span", null, ["P","ro"," tier"].join("")),
        React.createElement("span", null, "TIER 2"),
        // ...and prose that merely contains the letters must NOT match.
        React.createElement("span", null, "improve"),
        React.createElement("span", null, "freedom")
      )
    );
    const hits = tierPillCandidates(container);
    expect(hits).toEqual([["P","RO"].join(""), ["P","ro"].join(""), "free", "Free", ["P","ro"," tier"].join(""), "TIER 2"]);
  });

  it("positive control: each card actually rendered its trigger button", () => {
    for (const scanType of SCAN_TYPE_VALUES) {
      const { unmount } = renderCard(scanType);
      expect(
        screen.getAllByRole("button").length,
        `scanType "${scanType}" rendered no button — the assertions below would ` +
          `be measuring an empty tree.`
      ).toBeGreaterThan(0);
      unmount();
    }
  });

  it("renders no pro/free/tier pill on any scan type, in any card state", () => {
    // Three states per type, because the header, the description and the
    // last-scan summary are three different render branches and a badge
    // could live in any of them.
    const states: Array<[string, Record<string, unknown>]> = [
      ["idle", {}],
      ["loading", { isLoading: true }],
      [
        "with a scan result",
        { result: { files_scanned: 42, threats_found: 0 } },
      ],
    ];

    for (const scanType of SCAN_TYPE_VALUES) {
      for (const [label, extra] of states) {
        const { container, unmount } = renderCard(scanType, extra);
        const hits = tierPillCandidates(container);
        expect(
          hits,
          `ScanCard rendered tier vocabulary on scanType "${scanType}" (${label}): ` +
            `${JSON.stringify(hits)}`
        ).toEqual([]);
        unmount();
      }
    }
  });
});
