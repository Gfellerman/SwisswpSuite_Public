/**
 * Contrast specs for the Blocked IPs table text (executor-authored; the sealed
 * SecurityHub.bannedIpBadge.v63.test.tsx is not edited).
 *
 * The heading, the explanatory paragraph and the "Manual" badge each measure at
 * least 4.5:1 against their surface in light and dark mode (WCAG 1.4.3),
 * computed from the OKLCH tokens in src/index.css and tailwindcss/theme.css.
 * The badge must also resolve to exactly one text colour: ui/Badge.tsx
 * concatenates the variant classes with the caller's classes without a merge
 * step, so two text colour classes on one badge would leave the winner to
 * stylesheet order.
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, beforeAll } from "vitest";

type QuarantineModule = typeof import("./QuarantineTab");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");

let QuarantineTab: QuarantineModule["QuarantineTab"];
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

  ({ QuarantineTab } = await import("./QuarantineTab"));
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  React = await import("react");
});

// ── Contrast, computed the way the a11y consult computed it ─────────────────

type Lch = [number, number, number];

function parseOklch(text: string): Lch {
  const m = text.match(
    /oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+(none|[\d.]+)\s*\)/
  );
  if (!m) throw new Error(`not an oklch value: ${text}`);
  const l = m[2] === "%" ? parseFloat(m[1]) / 100 : parseFloat(m[1]);
  return [l, parseFloat(m[3]), m[4] === "none" ? 0 : parseFloat(m[4])];
}

function toLinearRgb([L, C, h]: Lch): number[] {
  const hr = (h * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((v) => Math.min(1, Math.max(0, v)));
}

function luminance(color: Lch): number {
  const [r, g, b] = toLinearRgb(color);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(fg: Lch, bg: Lch): number {
  const a = luminance(fg);
  const b = luminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

const INDEX_CSS = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");

function tokenBlock(selector: ":root" | ".dark"): Record<string, Lch> {
  const escaped = selector.replace(".", "\\.");
  const block = INDEX_CSS.match(
    new RegExp(`^${escaped}\\s*\\{([\\s\\S]*?)^\\}`, "m")
  );
  if (!block) throw new Error(`no ${selector} block in index.css`);
  const out: Record<string, Lch> = {};
  const re = /--([a-z-]+):\s*(oklch\([^)]*\))/g;
  for (const m of block[1].matchAll(re)) out[m[1]] = parseOklch(m[2]);
  return out;
}

function palette(): Record<string, Lch> {
  const out: Record<string, Lch> = {};
  const re = /--color-([a-z]+-\d+):\s*(oklch\([^)]*\))/g;
  const css = readFileSync(
    createRequire(import.meta.url).resolve("tailwindcss/theme.css"),
    "utf8"
  );
  for (const m of css.matchAll(re)) out[m[1]] = parseOklch(m[2]);
  return out;
}

type Theme = "light" | "dark";
const SEMANTIC_TEXT = [
  "foreground",
  "muted-foreground",
  "secondary-foreground",
  "card-foreground",
];

function colourOf(name: string, theme: Theme): Lch | null {
  const tokens = tokenBlock(theme === "light" ? ":root" : ".dark");
  if (SEMANTIC_TEXT.includes(name)) return tokens[name];
  return palette()[name] ?? null;
}

function effectiveText(el: Element, theme: Theme): Lch {
  const classes = el.className.toString().split(/\s+/).filter(Boolean);
  const base = classes
    .filter((c) => c.startsWith("text-"))
    .map((c) => ({ c, v: colourOf(c.slice(5), theme) }))
    .filter((x) => x.v !== null);
  const dark = classes
    .filter((c) => c.startsWith("dark:text-"))
    .map((c) => ({ c, v: colourOf(c.slice(10), theme) }))
    .filter((x) => x.v !== null);
  if (theme === "dark" && dark.length > 0) return dark[dark.length - 1].v!;
  if (base.length !== 1) {
    throw new Error(
      `expected exactly one text colour class on <${el.tagName.toLowerCase()} class="${el.className}">, found ${base.length}`
    );
  }
  return base[0].v!;
}

function surface(name: "background" | "card" | "secondary", theme: Theme) {
  return tokenBlock(theme === "light" ? ":root" : ".dark")[name];
}

function assertReadable(
  el: Element,
  surfaces: Array<"background" | "card" | "secondary">
) {
  for (const theme of ["light", "dark"] as const) {
    for (const s of surfaces) {
      const r = ratio(effectiveText(el, theme), surface(s, theme));
      expect(
        r,
        `${theme} mode on ${s}: ${r.toFixed(2)}:1 for class "${el.className}"`
      ).toBeGreaterThanOrEqual(4.5);
    }
  }
}

// ── Fixture ─────────────────────────────────────────────────────────────────

function renderTab() {
  const noop = () => undefined;
  return render(
    React.createElement(QuarantineTab, {
      bannedIps: ["198.51.100.7", "198.51.100.8"],
      bannedIpTypes: { "198.51.100.7": "manual", "198.51.100.8": "auto" },
      manualIp: "",
      allowedIps: [],
      currentIp: "203.0.113.5",
      manualAllowedIp: "",
      quarantinedFiles: [],
      ignoredPaths: [],
      onChangeManualIp: noop,
      onChangeManualAllowedIp: noop,
      onBanIp: noop,
      onUnbanIp: noop,
      onAllowIp: noop,
      onRemoveAllowedIp: noop,
      onRestoreQuarantine: noop,
      onDeleteQuarantine: noop,
      onUnIgnore: noop,
    })
  );
}

describe("Blocked IPs table contrast (V63-V1 r2)", () => {
  afterEach(() => {
    cleanup();
  });

  it("A11Y-0 (control): the contrast helper reproduces the consult's numbers", () => {
    const dark = tokenBlock(".dark");
    expect(ratio(palette()["neutral-700"], dark.background)).toBeCloseTo(
      1.77,
      1
    );
    expect(ratio(palette()["neutral-700"], dark.secondary)).toBeCloseTo(
      1.53,
      1
    );
    expect(ratio(dark["secondary-foreground"], dark.secondary)).toBeCloseTo(
      10.15,
      1
    );
  });

  it("A11Y-8: the sub-heading and the explanatory paragraph measure 4.5:1 in both themes", () => {
    renderTab();
    assertReadable(screen.getByText("IP addresses you have blocked by hand"), [
      "background",
    ]);
    assertReadable(
      screen.getByText(/The firewall also blocks an address by itself/),
      ["background"]
    );
  });

  it("A11Y-9: the Manual badge has one text colour and measures 4.5:1 on its own surface in both themes", () => {
    renderTab();
    const badge = screen.getByText("Manual");
    assertReadable(badge, ["secondary"]);
  });
});
