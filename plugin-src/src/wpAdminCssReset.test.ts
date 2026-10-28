/**
 * Source lock for the WordPress-admin CSS reset in index.css.
 *
 * WordPress core's admin stylesheets are not in a cascade layer; the app's
 * Tailwind utilities are. An unlayered rule beats a layered one whatever its
 * specificity, so on a wp-admin page core's rules for `a`, `h1`-`h6`, `p`,
 * `input`, `select`, `button`, `label`, `code` and the placeholder pseudo
 * elements would win over the app's own classes inside the app root.
 * index.css therefore ends with one unlayered rule that reverts every
 * unlayered declaration inside the root (`all: revert-layer`), and the base
 * layer carries a legible default placeholder colour, because the revert
 * also removes the core placeholder colour that fields rely on today.
 *
 * This test pins the source text of those two rules. The behaviour (computed
 * styles identical to a page without WordPress CSS) is measured by the
 * browser harness, not here: a text check cannot see a cascade.
 *
 * Mutants this test must fail: rule deleted; `revert-layer` replaced by
 * another keyword; a selector dropped; another unlayered rule placed after
 * the reset; the placeholder default moved out of `@layer base`.
 */
import { readFileSync } from "fs";
import path from "path";
import postcss, {
  type AtRule,
  type Node as PostcssNode,
  type Rule,
} from "postcss";
import { describe, expect, it } from "vitest";

// process.cwd() is the plugin/ package root under Vitest; a
// `new URL(..., import.meta.url)` expression would be rewritten to an asset
// URL by Vite.
const CSS = readFileSync(path.join(process.cwd(), "src/index.css"), "utf-8");
const ROOT = postcss.parse(CSS);

const APP_ROOT = "#swisswpsuite-app-root";
const RESET_SELECTORS = [
  APP_ROOT,
  `${APP_ROOT} :not(svg, svg *)`,
  `${APP_ROOT} :not(svg, svg *)::before`,
  `${APP_ROOT} :not(svg, svg *)::after`,
  `${APP_ROOT} ::placeholder`,
];

const normalise = (selector: string): string =>
  selector.replace(/\s+/g, " ").trim();

const insideLayer = (rule: Rule): boolean => {
  let node: PostcssNode | undefined = rule.parent;
  while (node) {
    if (node.type === "atrule" && (node as AtRule).name === "layer") {
      return true;
    }
    node = node.parent;
  }
  return false;
};

const unlayeredRules: Rule[] = [];
ROOT.walkRules((rule) => {
  if (!insideLayer(rule)) unlayeredRules.push(rule);
});

describe("index.css — WordPress admin CSS reset", () => {
  it("has an unlayered rule that reverts every unlayered declaration inside the app root", () => {
    const reset = unlayeredRules.find(
      (rule) =>
        rule.selectors.some((s) => normalise(s) === APP_ROOT) &&
        rule.nodes.some(
          (n) => n.type === "decl" && (n as { prop: string }).prop === "all"
        )
    );
    expect(
      reset,
      "no unlayered `#swisswpsuite-app-root … { all: … }` rule"
    ).toBeDefined();
    expect(reset!.selectors.map(normalise)).toEqual(RESET_SELECTORS);
    const decls = reset!.nodes.map((n) => {
      const d = n as {
        type: string;
        prop?: string;
        value?: string;
        important?: boolean;
      };
      return [d.type, d.prop, d.value, d.important === true];
    });
    expect(decls).toEqual([["decl", "all", "revert-layer", false]]);
  });

  it("keeps the reset at the top level of the stylesheet, not inside a conditional block", () => {
    const reset = unlayeredRules.find(
      (rule) =>
        rule.selectors.some((s) => normalise(s) === APP_ROOT) &&
        rule.nodes.some(
          (n) => n.type === "decl" && (n as { prop: string }).prop === "all"
        )
    );
    expect(reset).toBeDefined();
    expect(reset!.parent).toBe(ROOT);
  });

  it("makes the reset the last unlayered rule, so no later unlayered rule can undo it", () => {
    const last = unlayeredRules[unlayeredRules.length - 1];
    expect(last.selectors.map(normalise)).toEqual(RESET_SELECTORS);
  });

  it("sets the default placeholder colour inside @layer base, so a placeholder:* utility still wins", () => {
    const base = ROOT.nodes.filter(
      (n): n is AtRule =>
        n.type === "atrule" &&
        (n as AtRule).name === "layer" &&
        (n as AtRule).params.trim() === "base"
    );
    expect(base.length).toBeGreaterThan(0);
    const found: Rule[] = [];
    base.forEach((layer) =>
      layer.walkRules((rule) => {
        if (
          rule.selectors.map(normalise).join("|") ===
          `${APP_ROOT} ::placeholder`
        ) {
          found.push(rule);
        }
      })
    );
    expect(found).toHaveLength(1);
    const colour = found[0].nodes.filter(
      (n) => n.type === "decl" && (n as { prop: string }).prop === "color"
    ) as unknown as Array<{ value: string; important?: boolean }>;
    expect(colour).toHaveLength(1);
    expect(colour[0].value).toBe("var(--muted-foreground)");
    expect(colour[0].important).toBeFalsy();
  });

  it("declares no other unlayered rule that targets the app root's placeholder", () => {
    const stray = unlayeredRules.filter(
      (rule) =>
        rule.selectors.some((s) =>
          /::?(-webkit-|-moz-)?(input-)?placeholder/.test(s)
        ) &&
        rule.selectors.map(normalise).join("|") !== RESET_SELECTORS.join("|")
    );
    expect(stray.map((r) => r.selector)).toEqual([]);
  });
});
