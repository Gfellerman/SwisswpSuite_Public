// Static WCAG 1.4.3 audit of every text colour class in the React sources of the v2.9.33.69 text/label patches.
// Test support only: reads sources, index.css and tailwindcss/theme.css; never imported by the product build.
// For each JSX element (and each stray class string) it resolves the text colour and the surface under it
// (own bg, else the nearest ancestor bg, else the page background) in the light and the dark theme and
// computes the contrast ratio. Method and limits: .claude/audit-reports/wporg-r15-2026-09-21/LANE_SW_B_REPORT.md (section 8c).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

export function makeAuditor(repo) {
  const require = createRequire(import.meta.url);
  const ts = require("typescript");
  // ---------------------------------------------------------------- colours
  function clamp01(x) {
    return Math.min(1, Math.max(0, x));
  }
  function oklchToLinear(L, C, h) {
    const a = C * Math.cos((h * Math.PI) / 180),
      b = C * Math.sin((h * Math.PI) / 180);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ].map(clamp01);
  }
  const enc = (x) =>
    x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
  const dec = (x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
  function parseColor(v) {
    v = v.trim().replace(/\s+/g, " ");
    let m = v.match(
      /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+(none|[\d.]+)\s*(?:\/\s*([\d.]+%?))?\s*\)$/
    );
    if (m) {
      const L = m[2] ? parseFloat(m[1]) / 100 : parseFloat(m[1]);
      const rgb = oklchToLinear(
        L,
        parseFloat(m[3]),
        m[4] === "none" ? 0 : parseFloat(m[4])
      ).map(enc);
      let a = 1;
      if (m[5])
        a = m[5].endsWith("%") ? parseFloat(m[5]) / 100 : parseFloat(m[5]);
      return { rgb, a };
    }
    m = v.match(/^#([0-9a-f]{3,8})$/i);
    if (m) {
      let h = m[1];
      if (h.length === 3 || h.length === 4)
        h = [...h].map((c) => c + c).join("");
      const n = (i) => parseInt(h.slice(i, i + 2), 16) / 255;
      return { rgb: [n(0), n(2), n(4)], a: h.length === 8 ? n(6) : 1 };
    }
    m = v.match(
      /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/
    );
    if (m) {
      let a = 1;
      if (m[4])
        a = m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
      return { rgb: [m[1], m[2], m[3]].map((x) => parseFloat(x) / 255), a };
    }
    return null;
  }
  const lum = (rgb) => {
    const [r, g, b] = rgb.map(dec);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (fg, bg) => {
    const a = lum(fg),
      b = lum(bg);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };
  const comp = (fg, bg) => ({
    rgb: fg.rgb.map((c, i) => c * fg.a + bg.rgb[i] * (1 - fg.a)),
    a: 1,
  });
  const hex = (rgb) =>
    "#" +
    rgb
      .map((c) =>
        Math.round(255 * clamp01(c))
          .toString(16)
          .padStart(2, "0")
      )
      .join("");

  // ---------------------------------------------------------------- theme tables
  const indexCss = fs.readFileSync(
    path.join(repo, "plugin/src/index.css"),
    "utf8"
  );
  function block(selectorRe) {
    const m = indexCss.match(selectorRe);
    if (!m) return "";
    let i = m.index + m[0].length,
      depth = 1,
      out = "";
    while (i < indexCss.length && depth > 0) {
      const c = indexCss[i++];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      if (depth > 0) out += c;
    }
    return out;
  }
  function decls(text) {
    const o = {};
    const re = /--([\w-]+)\s*:\s*((?:[^;()]|\([^)]*\))+);/g;
    let m;
    while ((m = re.exec(text.replace(/\/\*[\s\S]*?\*\//g, ""))))
      o[m[1]] = m[2].trim();
    return o;
  }
  const rootVars = decls(block(/^:root\s*\{/m));
  const darkVars = decls(block(/^\.dark\s*\{/m));
  const themeVars = {
    ...decls(block(/^@theme\s*\{/m)),
    ...decls(block(/^@theme inline\s*\{/m)),
  };
  const twTheme = fs.readFileSync(
    path.join(repo, "node_modules/tailwindcss/theme.css"),
    "utf8"
  );
  const palette = {};
  {
    const re = /--color-([a-z]+-\d+):\s*([^;]+);/g;
    let m;
    while ((m = re.exec(twTheme))) palette[m[1]] = m[2];
  }
  palette.white = "#ffffff";
  palette.black = "#000000";
  function resolveVar(val, vars, depth = 0) {
    if (depth > 6) return null;
    const m = val.match(/^var\(--([\w-]+)\)$/);
    if (m) {
      const nv = vars[m[1]];
      return nv === undefined ? null : resolveVar(nv, vars, depth + 1);
    }
    return val;
  }
  function semantic(name, theme) {
    const vars =
      theme === "dark"
        ? { ...rootVars, ...themeVars, ...darkVars }
        : { ...rootVars, ...themeVars };
    const key = "color-" + name;
    // :root / .dark declare --color-* directly for brand tokens; @theme inline maps the rest to var(--x)
    let v =
      (theme === "dark" ? darkVars[key] : undefined) ??
      rootVars[key] ??
      themeVars[key];
    if (v === undefined) return null;
    const r = resolveVar(v, vars);
    return r ? parseColor(r) : null;
  }
  const unresolved = new Map();
  function colourByName(name, theme) {
    if (name === "transparent") return { rgb: [0, 0, 0], a: 0 };
    if (name === "current" || name === "inherit") return null;
    if (palette[name]) return parseColor(palette[name]);
    return semantic(name, theme);
  }
  function colourFromRest(rest, theme) {
    // rest like "emerald-700/50", "foreground", "[#fff]"
    let alpha = 1,
      name = rest;
    const sl = rest.match(/^(.*)\/(\d+|\[[^\]]+\])$/);
    if (sl) {
      name = sl[1];
      alpha = sl[2].startsWith("[")
        ? parseFloat(sl[2].slice(1, -1))
        : parseInt(sl[2], 10) / 100;
      if (Number.isNaN(alpha)) alpha = 1;
    }
    let c;
    const ar = name.match(/^\[(.+)\]$/);
    if (ar) {
      c = parseColor(ar[1].replace(/^color:/, ""));
    } else c = colourByName(name, theme);
    if (!c) return undefined; // unresolved
    return { rgb: c.rgb, a: c.a * alpha };
  }
  const SIZE = {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 30,
    "4xl": 36,
    "5xl": 48,
    "6xl": 60,
    "7xl": 72,
    "8xl": 96,
    "9xl": 128,
  };
  const NONCOLOUR_TEXT = new Set([
    "left",
    "center",
    "right",
    "justify",
    "start",
    "end",
    "wrap",
    "nowrap",
    "balance",
    "pretty",
    "ellipsis",
    "clip",
    "shadow",
    "inherit",
  ]);

  // token -> {variants[], util, rest}
  function splitVariants(tok) {
    const parts = [];
    let depth = 0,
      cur = "";
    for (const ch of tok) {
      if (ch === "[" || ch === "(") depth++;
      if (ch === "]" || ch === ")") depth--;
      if (ch === ":" && depth === 0) {
        parts.push(cur);
        cur = "";
      } else cur += ch;
    }
    parts.push(cur);
    return {
      variants: parts.slice(0, -1),
      base: parts[parts.length - 1].replace(/^!/, ""),
    };
  }
  function classify(tok) {
    const { variants, base } = splitVariants(tok);
    let m = base.match(/^text-(.+)$/);
    if (m) {
      const rest = m[1];
      if (SIZE[rest] !== undefined)
        return { kind: "size", variants, px: SIZE[rest] };
      let am = rest.match(/^\[(?:length:)?([\d.]+)(px|rem|em)\]$/);
      if (am)
        return {
          kind: "size",
          variants,
          px: parseFloat(am[1]) * (am[2] === "px" ? 1 : 16),
        };
      if (NONCOLOUR_TEXT.has(rest) || /^(shadow|opacity)/.test(rest))
        return { kind: "other", variants };
      return { kind: "textcolour", variants, rest, text: tok };
    }
    m = base.match(/^bg-(.+)$/);
    if (m) {
      const rest = m[1];
      if (
        /^(none|cover|contain|center|top|bottom|left|right|repeat|no-repeat|fixed|local|scroll|clip|origin|blend|size)/.test(
          rest
        ) ||
        /^(gradient|linear|radial|conic)/.test(rest) ||
        /^\[url/.test(rest)
      ) {
        return /^(gradient|linear|radial|conic)/.test(rest)
          ? { kind: "bggradient", variants }
          : { kind: "other", variants };
      }
      return { kind: "bgcolour", variants, rest };
    }
    m = base.match(
      /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/
    );
    if (m)
      return {
        kind: "weight",
        variants,
        w: {
          thin: 100,
          extralight: 200,
          light: 300,
          normal: 400,
          medium: 500,
          semibold: 600,
          bold: 700,
          extrabold: 800,
          black: 900,
        }[m[1]],
      };
    return { kind: "other", variants };
  }

  // ---------------------------------------------------------------- component defaults (ui wrappers)
  const readIf = (p) => (fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "");
  function variantMap(file, constName) {
    const src = readIf(path.join(repo, file));
    const o = {};
    const bm = src.match(
      new RegExp(`const ${constName}[^=]*=\\s*\\{([\\s\\S]*?)\\n\\s*\\};`)
    );
    if (!bm) return o;
    const re = /(\w+):\s*\n?\s*"([^"]+)"/g;
    let m;
    while ((m = re.exec(bm[1]))) o[m[1]] = m[2];
    return o;
  }
  const BADGE = variantMap("plugin/src/components/ui/Badge.tsx", "variants");
  const BUTTON = variantMap("plugin/src/components/ui/Button.tsx", "variants");
  const CARD_DEFAULT =
    "bg-card dark:bg-secondary text-neutral-900 dark:text-foreground";

  // ---------------------------------------------------------------- AST helpers
  function lineOf(sf, pos) {
    const lc = sf.getLineAndCharacterOfPosition(pos);
    return lc.line + 1;
  }
  function collectConsts(sf) {
    const map = new Map();
    (function walk(n) {
      if (
        ts.isVariableDeclaration(n) &&
        ts.isIdentifier(n.name) &&
        n.initializer
      )
        map.set(n.name.text, n.initializer);
      ts.forEachChild(n, walk);
    })(sf);
    return map;
  }
  // expand an expression to an array of {text, node?, off?}. alternatives -> array of arrays of fragments
  function expand(expr, consts, ctx, depth = 0) {
    if (!expr || depth > 8) return [[]];
    if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) {
      ctx.processed.add(expr.pos);
      return [[{ text: expr.text, node: expr }]];
    }
    if (
      ts.isParenthesizedExpression(expr) ||
      ts.isAsExpression(expr) ||
      ts.isNonNullExpression(expr) ||
      (ts.isSatisfiesExpression && ts.isSatisfiesExpression(expr))
    )
      return expand(expr.expression, consts, ctx, depth + 1);
    if (ts.isTemplateExpression(expr)) {
      ctx.processed.add(expr.head.pos);
      let alts = [[{ text: expr.head.text, node: expr.head }]];
      for (const span of expr.templateSpans) {
        const inner = expand(span.expression, consts, ctx, depth + 1);
        ctx.processed.add(span.literal.pos);
        const next = [];
        for (const a of alts)
          for (const b of inner)
            next.push([
              ...a,
              { text: " " },
              ...b,
              { text: " " },
              { text: span.literal.text, node: span.literal },
            ]);
        alts = next.slice(0, 64);
      }
      return alts;
    }
    if (ts.isConditionalExpression(expr))
      return [
        ...expand(expr.whenTrue, consts, ctx, depth + 1),
        ...expand(expr.whenFalse, consts, ctx, depth + 1),
      ].slice(0, 64);
    if (ts.isBinaryExpression(expr)) {
      const op = expr.operatorToken.kind;
      if (op === ts.SyntaxKind.AmpersandAmpersandToken)
        return [[], ...expand(expr.right, consts, ctx, depth + 1)];
      if (
        op === ts.SyntaxKind.BarBarToken ||
        op === ts.SyntaxKind.QuestionQuestionToken
      )
        return [
          ...expand(expr.left, consts, ctx, depth + 1),
          ...expand(expr.right, consts, ctx, depth + 1),
        ];
      if (op === ts.SyntaxKind.PlusToken) {
        const L = expand(expr.left, consts, ctx, depth + 1),
          R = expand(expr.right, consts, ctx, depth + 1);
        const out = [];
        for (const a of L) for (const b of R) out.push([...a, ...b]);
        return out.slice(0, 64);
      }
    }
    if (ts.isIdentifier(expr)) {
      const init = consts.get(expr.text);
      if (init && !ctx.visiting.has(expr.text)) {
        ctx.visiting.add(expr.text);
        const r = expand(init, consts, ctx, depth + 1);
        ctx.visiting.delete(expr.text);
        return r;
      }
      ctx.partial = true;
      return [[]];
    }
    if (
      ts.isElementAccessExpression(expr) ||
      ts.isPropertyAccessExpression(expr)
    ) {
      let base = expr.expression;
      if (ts.isIdentifier(base)) {
        const init = consts.get(base.text);
        if (init && ts.isObjectLiteralExpression(init)) {
          const out = [];
          for (const p of init.properties)
            if (ts.isPropertyAssignment(p))
              out.push(...expand(p.initializer, consts, ctx, depth + 1));
          return out.length ? out.slice(0, 64) : [[]];
        }
      }
      ctx.partial = true;
      return [[]];
    }
    if (ts.isCallExpression(expr)) {
      // cn(...), clsx(...), [..].join(" ")
      let alts = [[]];
      for (const arg of expr.arguments) {
        const inner = expand(arg, consts, ctx, depth + 1);
        const next = [];
        for (const a of alts)
          for (const b of inner) next.push([...a, { text: " " }, ...b]);
        alts = next.slice(0, 64);
      }
      return alts;
    }
    if (ts.isArrayLiteralExpression(expr)) {
      let alts = [[]];
      for (const e of expr.elements) {
        const inner = expand(e, consts, ctx, depth + 1);
        const next = [];
        for (const a of alts)
          for (const b of inner) next.push([...a, { text: " " }, ...b]);
        alts = next.slice(0, 64);
      }
      return alts;
    }
    if (ts.isJsxExpression(expr))
      return expand(expr.expression, consts, ctx, depth + 1);
    ctx.partial = true;
    return [[]];
  }

  // ---------------------------------------------------------------- per-file analysis
  let ROOTS = ["background"];
  // opts.roots: the page-level surfaces a shared component may sit on (default: the page background only)
  function analyse(file, opts) {
    ROOTS = (opts && opts.roots) || ["background"];
    try {
      return analyseText(file, fs.readFileSync(path.join(repo, file), "utf8"));
    } finally {
      ROOTS = ["background"];
    }
  }
  function analyseText(file, text) {
    const sf = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );
    const consts = collectConsts(sf);
    const iconNames = new Set();
    for (const st of sf.statements)
      if (
        ts.isImportDeclaration(st) &&
        st.moduleSpecifier.text === "lucide-react" &&
        st.importClause?.namedBindings &&
        ts.isNamedImports(st.importClause.namedBindings)
      )
        for (const el of st.importClause.namedBindings.elements)
          iconNames.add(el.name.text);
    const results = [];
    const ctx = { processed: new Set(), visiting: new Set(), partial: false };
    const parentOf = new Map();

    function tagName(node) {
      const o = ts.isJsxElement(node) ? node.openingElement : node;
      return o.tagName.getText(sf);
    }
    function openingOf(node) {
      return ts.isJsxElement(node) ? node.openingElement : node;
    }
    function attrs(node) {
      return openingOf(node).attributes.properties.filter(ts.isJsxAttribute);
    }
    function classAlts(node) {
      const tag = tagName(node);
      const alts = [];
      let own = [[]];
      for (const a of attrs(node)) {
        if (a.name.text === "className" || a.name.text === "classNameInner") {
          const cctx = {
            processed: ctx.processed,
            visiting: new Set(),
            partial: false,
          };
          const init = a.initializer;
          const ex = init && ts.isJsxExpression(init) ? init.expression : init;
          own = expand(ex, consts, cctx);
        }
      }
      // variant defaults of known ui wrappers
      let defaults = "";
      if (tag === "Card") defaults = CARD_DEFAULT;
      else if (tag === "Badge" || tag === "Button") {
        let v = tag === "Badge" ? "neutral" : "primary";
        for (const a of attrs(node))
          if (
            a.name.text === "variant" &&
            a.initializer &&
            ts.isStringLiteral(a.initializer)
          )
            v = a.initializer.text;
        defaults = (tag === "Badge" ? BADGE : BUTTON)[v] ?? "";
      }
      return own.slice(0, 64).map((frags) => {
        const full = frags.map((f) => f.text).join("");
        const toks = []; // token + position
        for (const f of frags) {
          if (!f.node) {
            continue;
          }
          const lit = f.text;
          const re = /\S+/g;
          let m;
          const baseOff = f.node.getStart(sf) + 1; // after the opening quote/backtick/brace (template head: `... -> +1)
          while ((m = re.exec(lit)))
            toks.push({
              tok: m[0],
              pos: baseOff + m.index,
              node: f.node,
              idx: m.index,
            });
        }
        const dtoks = defaults
          ? defaults
              .split(/\s+/)
              .filter(Boolean)
              .map((t) => ({
                tok: t,
                pos: -1,
                node: null,
                idx: -1,
                fromDefault: true,
              }))
          : [];
        return { toks, dtoks, partial: false };
      });
    }
    function bgOf(altToks, dark, state) {
      // effective bg token: last wins among matching variants
      let best = null;
      for (const t of altToks) {
        const c = classify(t.tok);
        if (c.kind !== "bgcolour" && c.kind !== "bggradient") continue;
        const vs = c.variants.filter((v) => !/^(sm|md|lg|xl|2xl)$/.test(v));
        const hasDark = vs.includes("dark");
        const rest = vs.filter((v) => v !== "dark");
        const wantState = state ? [state] : [];
        if (JSON.stringify(rest.sort()) !== JSON.stringify(wantState.sort()))
          continue;
        if (dark) {
          best = hasDark || !best || !best.hasDark ? { c, hasDark, t } : best;
          if (hasDark) best = { c, hasDark, t };
        } else {
          if (hasDark) continue;
          best = { c, hasDark, t };
        }
      }
      return best;
    }
    const resolveCache = new Map();
    function surfaces(node, dark, state) {
      const key = node.pos + ":" + dark + ":" + (state || "");
      if (resolveCache.has(key)) return resolveCache.get(key);
      resolveCache.set(key, []); // cycle guard
      const out = new Map();
      const alts = classAlts(node);
      const par = parentOf.get(node);
      if (!alts.length)
        for (const s of par ? surfaces(par, dark, null) : rootCandidates(dark))
          out.set(hex(s.rgb), s);
      for (const alt of alts)
        for (const s of surfacesAlt(node, alt, dark, state).list) {
          const k = hex(s.rgb);
          if (!out.has(k)) out.set(k, s);
          else if (s.srcs)
            out.get(k).srcs = [...(out.get(k).srcs || []), ...s.srcs];
        }
      const arr = [...out.values()].slice(0, 12);
      resolveCache.set(key, arr);
      return arr;
    }
    function surfacesAlt(node, alt, dark, state) {
      const par = parentOf.get(node);
      const parentS = () =>
        par ? surfaces(par, dark, null) : rootCandidates(dark);
      const all = [...alt.dtoks, ...alt.toks];
      let b = bgOf(all, dark, state);
      if (!b && state) b = bgOf(all, dark, null);
      if (!b) return { list: parentS(), own: null };
      if (b.c.kind === "bggradient") {
        if (all.some((t) => splitVariants(t.tok).base === "bg-clip-text"))
          return { list: parentS(), own: null }; // the gradient is the text fill
        return {
          list: [{ rgb: [0.5, 0.5, 0.5], a: 1, gradient: true, srcs: [] }],
          own: b,
        };
      }
      const c = colourFromRest(b.c.rest, dark ? "dark" : "light");
      if (c === undefined) {
        unresolved.set(b.t.tok, (unresolved.get(b.t.tok) || 0) + 1);
        return { list: parentS(), own: null };
      }
      const src = {
        tok: b.t.tok,
        pos: b.t.pos,
        fromDefault: !!b.t.fromDefault,
        hasDark: !!b.hasDark,
        litStart: b.t.node ? b.t.node.getStart(sf) : -1,
        idx: b.t.idx,
      };
      if (c.a >= 0.999)
        return { list: [{ rgb: c.rgb, a: 1, srcs: [src] }], own: b };
      if (c.a <= 0.001) return { list: parentS(), own: null };
      return {
        list: parentS().map((s) => ({
          ...comp(c, s),
          srcs: [src, ...(s.srcs || [])],
        })),
        own: b,
      };
    }
    function rootCandidates(dark) {
      return ROOTS.map((n) => ({
        rgb: colourByName(n, dark ? "dark" : "light").rgb,
        a: 1,
        root: n,
      }));
    }

    // pass 1: parents
    (function walk(n, parent) {
      if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) {
        parentOf.set(n, parent);
        parent = n;
      }
      ts.forEachChild(n, (c) => walk(c, parent));
    })(sf, null);

    // pass 2: evaluate each JSX element's own className alternatives
    function inheritedType(node) {
      let px = null,
        w = null;
      let p = parentOf.get(node);
      while (p && (px === null || w === null)) {
        for (const alt of classAlts(p).slice(0, 1))
          for (const t of [...alt.dtoks, ...alt.toks]) {
            const c = classify(t.tok);
            if (c.variants.length) continue;
            if (c.kind === "size" && px === null) px = c.px;
            if (c.kind === "weight" && w === null) w = c.w;
          }
        p = parentOf.get(p);
      }
      return { px, w };
    }
    function evalElement(node, alts, isIcon, labelPos) {
      for (const alt of alts) {
        const all = [...alt.dtoks, ...alt.toks];
        // gradient text: text-transparent + bg-clip-text + from-/via-/to- stops -> check every stop
        if (
          all.some((t) => splitVariants(t.tok).base === "text-transparent") &&
          all.some((t) => splitVariants(t.tok).base === "bg-clip-text")
        ) {
          const ttok = all.find(
            (t) => splitVariants(t.tok).base === "text-transparent"
          );
          for (const dark of [false, true]) {
            const stops = {};
            for (const t of all) {
              const { variants, base } = splitVariants(t.tok);
              const m = base.match(/^(from|via|to)-(.+)$/);
              if (!m || variants.some((v) => v !== "dark")) continue;
              const hasDark = variants.includes("dark");
              if (!dark && hasDark) continue;
              if (!stops[m[1]] || (dark && hasDark)) stops[m[1]] = m[2];
            }
            const cols = Object.values(stops)
              .map((r) => colourFromRest(r, dark ? "dark" : "light"))
              .filter(Boolean);
            if (!cols.length) continue;
            const sa = surfacesAlt(node, alt, dark, null);
            const sset = sa.list.length ? sa.list : rootCandidates(dark);
            let min = Infinity,
              minS = null;
            for (const sf2 of sset)
              for (const c of cols) {
                const eff = comp(c, sf2);
                const r = ratio(eff.rgb, sf2.rgb);
                if (r < min) {
                  min = r;
                  minS = sf2;
                }
              }
            let gpx = null,
              gw = null;
            for (const t of all) {
              const c = classify(t.tok);
              if (c.kind === "size" && !c.variants.length) gpx = c.px;
              if (c.kind === "weight" && !c.variants.length) gw = c.w;
              {
                const inh = inheritedType(node);
                if (gpx === null) gpx = inh.px;
                if (gw === null) gw = inh.w;
              }
            }
            const large =
              gpx !== null &&
              (gpx >= 24 || (gpx >= 18.66 && gw !== null && gw >= 700));
            results.push({
              file,
              line: lineOf(sf, ttok.pos >= 0 ? ttok.pos : node.getStart(sf)),
              tag: tagName(node),
              token: ttok.tok,
              state: "gradient",
              theme: dark ? "dark" : "light",
              ratio: +min.toFixed(2),
              req: large ? 3 : 4.5,
              kind: isIcon ? "icon" : "text",
              px: gpx,
              w: gw,
              fg: "gradient",
              a: 1,
              bg: minS ? hex(minS.rgb) : null,
              root: minS?.root || null,
              surfaceCount: sset.length,
              surfs: sset.map((x) => hex(x.rgb)),
              minSrcs: [],
              ownBg: null,
              fromDefault: false,
              pos: -1,
              litStart: -1,
              idx: -1,
              gradient: Object.values(stops).join(" > "),
            });
          }
        }
        // font size / weight
        let px = null,
          w = null;
        for (const t of all) {
          const c = classify(t.tok);
          if (c.kind === "size" && c.variants.length === 0) px = c.px;
          if (c.kind === "weight" && c.variants.length === 0) w = c.w;
        }
        {
          const inh = inheritedType(node);
          if (px === null) px = inh.px;
          if (w === null) w = inh.w;
        }
        // text colour tokens by (state, theme)
        const tcs = all
          .map((t) => ({ t, c: classify(t.tok) }))
          .filter((x) => x.c.kind === "textcolour");
        const states = new Set();
        for (const x of tcs)
          for (const v of x.c.variants) if (v !== "dark") states.add(v);
        const statesList = ["", ...[...states]];
        for (const state of statesList) {
          if (state === "disabled") continue;
          for (const dark of [false, true]) {
            const cand = tcs.filter((x) => {
              const vs = x.c.variants.filter(
                (v) => !/^(sm|md|lg|xl|2xl)$/.test(v)
              );
              const hasDark = vs.includes("dark");
              const rest = vs.filter((v) => v !== "dark");
              const stateOK =
                state === ""
                  ? rest.length === 0
                  : rest.length === 1 && rest[0] === state;
              if (!stateOK) return false;
              return dark ? true : !hasDark;
            });
            if (!cand.length) continue;
            // last dark one wins in dark mode, else last base one
            let pick = null;
            if (dark) {
              const d = cand.filter((x) => x.c.variants.includes("dark"));
              pick = d.length ? d[d.length - 1] : cand[cand.length - 1];
            } else pick = cand[cand.length - 1];
            if (!pick) continue;
            if (
              pick.c.rest === "transparent" &&
              all.some((t) => splitVariants(t.tok).base === "bg-clip-text")
            )
              continue; // gradient text, evaluated above
            const fgc = colourFromRest(pick.c.rest, dark ? "dark" : "light");
            if (fgc === undefined) {
              unresolved.set(pick.t.tok, (unresolved.get(pick.t.tok) || 0) + 1);
              continue;
            }
            if (fgc === null) continue;
            const sa = surfacesAlt(
              node,
              alt,
              dark,
              state === "" ? null : state
            );
            const sset = sa.list.length ? sa.list : rootCandidates(dark);
            let min = Infinity,
              minS = null;
            for (const s of sset) {
              if (s.gradient) continue;
              const eff = comp(fgc, s);
              const r = ratio(eff.rgb, s.rgb);
              if (r < min) {
                min = r;
                minS = s;
              }
            }
            const large =
              px !== null &&
              (px >= 24 || (px >= 18.66 && w !== null && w >= 700));
            const req = isIcon ? 3 : large ? 3 : 4.5;
            const pos = pick.t.pos;
            results.push({
              file,
              line: lineOf(sf, pos >= 0 ? pos : node.getStart(sf)),
              tag: tagName(node),
              token: pick.t.tok,
              state: state || "base",
              theme: dark ? "dark" : "light",
              ratio: min === Infinity ? null : +min.toFixed(2),
              req,
              kind: isIcon ? "icon" : "text",
              px,
              w,
              fg: hex(fgc.rgb),
              a: fgc.a,
              bg: minS ? hex(minS.rgb) : null,
              root: minS?.root || null,
              surfaceCount: sset.length,
              surfs: sset.map((x) => hex(x.rgb)),
              minSrcs: minS?.srcs || [],
              ownBg: sa.own ? sa.own.t.tok : null,
              ownBgPos: sa.own && sa.own.t.node ? sa.own.t.pos : -1,
              ownBgFromDefault: sa.own ? !!sa.own.t.fromDefault : false,
              fromDefault: !!pick.t.fromDefault,
              pos,
              litStart: pick.t.node ? pick.t.node.getStart(sf) : -1,
              idx: pick.t.idx,
            });
          }
        }
      }
    }
    (function walk(n) {
      if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) {
        const tag = tagName(n);
        const isIcon = tag === "svg" || iconNames.has(tag);
        const alts = classAlts(n);
        if (alts.length) evalElement(n, alts, isIcon);
      }
      ts.forEachChild(n, walk);
    })(sf);
    // pass 3: orphan class strings (not consumed as a className of a JSX element): constants, helpers, other props
    (function walk(n) {
      if (
        (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) &&
        !ctx.processed.has(n.pos) &&
        /(^|\s)(?:[\w-]+:)*(text|bg)-[a-z\[]/.test(n.text) &&
        !ts.isImportDeclaration(n.parent) &&
        !(
          ts.isJsxAttribute(n.parent) &&
          n.parent.name.text !== "className" &&
          n.parent.name.text !== "colorClass"
        )
      ) {
        if (
          /(^|\s)(?:[\w-]+:)*text-(?!xs|sm|base|lg|xl|[2-9]xl|left|center|right|justify|start|end|wrap|nowrap|balance|pretty|ellipsis|clip|\[)/.test(
            n.text
          )
        ) {
          // find enclosing JSX element for surface context
          let p = n.parent,
            el = null;
          while (p) {
            if (ts.isJsxElement(p) || ts.isJsxSelfClosingElement(p)) {
              el = p;
              break;
            }
            p = p.parent;
          }
          const toks = [];
          const re = /\S+/g;
          let m;
          while ((m = re.exec(n.text)))
            toks.push({
              tok: m[0],
              pos: n.getStart(sf) + 1 + m.index,
              node: n,
              idx: m.index,
            });
          const fake = { pos: n.pos + 1000000, __orphan: true };
          // orphan surface: own bg token if any else enclosing element chain else roots
          const alt = { toks, dtoks: [] };
          const saveSurfaces = surfaces;
          const node2 = el;
          // evaluate with a synthetic node: reuse evalElement by temporarily registering classAlts
          const synth = { pos: n.pos + 5000000, kind: -1 };
          parentOf.set(synth, el);
          const origClassAlts = classAlts;
          // minimal inline evaluation (own bg else parent chain)
          const evalAlt = () => {
            const tcs = toks
              .map((t) => ({ t, c: classify(t.tok) }))
              .filter((x) => x.c.kind === "textcolour");
            let px = null,
              w = null;
            for (const t of toks) {
              const c = classify(t.tok);
              if (c.kind === "size" && !c.variants.length) px = c.px;
              if (c.kind === "weight" && !c.variants.length) w = c.w;
            }
            if (
              ts.isJsxAttribute(n.parent) &&
              n.parent.name.text === "colorClass"
            ) {
              px = 48;
              w = 900;
            } // DataTile renders this class on its text-5xl value
            const states = new Set();
            for (const x of tcs)
              for (const v of x.c.variants) if (v !== "dark") states.add(v);
            for (const state of ["", ...states]) {
              if (state === "disabled") continue;
              for (const dark of [false, true]) {
                const cand = tcs.filter((x) => {
                  const vs = x.c.variants.filter(
                    (v) => !/^(sm|md|lg|xl|2xl)$/.test(v)
                  );
                  const hasDark = vs.includes("dark");
                  const rest = vs.filter((v) => v !== "dark");
                  const ok =
                    state === ""
                      ? rest.length === 0
                      : rest.length === 1 && rest[0] === state;
                  return ok && (dark ? true : !hasDark);
                });
                if (!cand.length) continue;
                let pick;
                if (dark) {
                  const d = cand.filter((x) => x.c.variants.includes("dark"));
                  pick = d.length ? d[d.length - 1] : cand[cand.length - 1];
                } else pick = cand[cand.length - 1];
                const fgc = colourFromRest(
                  pick.c.rest,
                  dark ? "dark" : "light"
                );
                if (fgc === undefined) {
                  unresolved.set(
                    pick.t.tok,
                    (unresolved.get(pick.t.tok) || 0) + 1
                  );
                  continue;
                }
                if (fgc === null) continue;
                const b =
                  bgOf(toks, dark, state === "" ? null : state) ||
                  (state ? bgOf(toks, dark, null) : null);
                let sset;
                if (b && b.c.kind === "bgcolour") {
                  const c = colourFromRest(b.c.rest, dark ? "dark" : "light");
                  const parentS = el
                    ? surfaces(el, dark, null)
                    : rootCandidates(dark);
                  if (c && c.a >= 0.999) sset = [{ rgb: c.rgb, a: 1 }];
                  else if (c && c.a > 0.001)
                    sset = parentS.map((s) => comp(c, s));
                  else sset = parentS;
                } else
                  sset = el ? surfaces(el, dark, null) : rootCandidates(dark);
                if (!sset.length) sset = rootCandidates(dark);
                let min = Infinity,
                  minS = null;
                for (const s of sset) {
                  if (s.gradient) continue;
                  const eff = comp(fgc, s);
                  const r = ratio(eff.rgb, s.rgb);
                  if (r < min) {
                    min = r;
                    minS = s;
                  }
                }
                const large =
                  px !== null &&
                  (px >= 24 || (px >= 18.66 && w !== null && w >= 700));
                results.push({
                  file,
                  line: lineOf(sf, pick.t.pos),
                  tag: "(string)",
                  token: pick.t.tok,
                  state: state || "base",
                  theme: dark ? "dark" : "light",
                  ratio: min === Infinity ? null : +min.toFixed(2),
                  req: large ? 3 : 4.5,
                  kind: "text",
                  px,
                  w,
                  fg: hex(fgc.rgb),
                  a: fgc.a,
                  bg: minS ? hex(minS.rgb) : null,
                  root: minS?.root || null,
                  surfaceCount: sset.length,
                  surfs: sset.map((x) => hex(x.rgb)),
                  orphan: true,
                  pos: pick.t.pos,
                  litStart: n.getStart(sf),
                  idx: pick.t.idx,
                });
              }
            }
          };
          evalAlt();
        }
      }
      ts.forEachChild(n, walk);
    })(sf);
    return results;
  }

  return { analyse, analyseText, unresolved };
}
