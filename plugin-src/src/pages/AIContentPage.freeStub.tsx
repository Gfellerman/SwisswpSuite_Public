/**
 * Authored by: Frontend Specialist
 * Skills: react-patterns, typescript-expert
 * Date: 2026-07-18
 *
 * Freemium Dual-Build (Phase 4, A4 fix) — FREE-EDITION-ONLY BUILD-TIME
 * REPLACEMENT for AIContentPage.tsx.
 *
 * Why this file exists: AIContentPage.tsx already gates its render on
 * `isProEdition()` and shows a ProUpsellPlaceholder in Free — but that is a
 * RUNTIME check. The file still has a static `import ContentEnhancer from
 * "../components/ContentEnhancer"` at its top, so Rollup bundles the entire
 * ContentEnhancer module (and everything it imports) into the AIContentPage
 * chunk regardless of which branch actually executes. Because
 * `React.lazy(() => import('../pages/AIContentPage'))` in router.tsx creates
 * a dynamic-import chunk boundary, Rollup discovers and emits that chunk by
 * static AST analysis of the `import()` call — it does not evaluate whether
 * the code reachable through it is "dead" at runtime, so the ~18KB
 * AIContentPage chunk (with ContentEnhancer inside it) still shipped inside
 * the Free zip even though it could only ever render the placeholder there.
 *
 * The fix: `plugin/vite.config.ts` aliases the exact specifier
 * `'../pages/AIContentPage'` (as written in router.tsx) to THIS file only
 * when built with `EDITION=free`. Vite's alias resolution happens at
 * module-resolve time, before Rollup ever parses the real AIContentPage.tsx
 * — so in a Free build, the real file (and ContentEnhancer, and everything
 * ContentEnhancer imports) never enters the module graph at all. Pro builds
 * never add the alias, so this file is never used there.
 *
 * No `isProEdition()` check is needed here (unlike the real file) — this
 * module is only ever selected by the Free-only alias, so hard-coding the
 * upsell content is safe and keeps the bundle minimal. Content mirrors
 * AIContentPage.tsx's own Free branch verbatim for UX consistency.
 */
import React from "react";
import { ProUpsellPlaceholder } from "../components/organisms/Upsell/ProUpsellPlaceholder";
import { hasEditionMismatch } from "../lib/edition";
import { PenTool } from "lucide-react";

export const AIContentPage: React.FC = () => (
  <ProUpsellPlaceholder
    feature="AI Content"
    description="AI rewrites your WooCommerce product titles, descriptions, and short descriptions — with tone control, bulk rewrite, and editable proposals you can apply or undo."
    icon={PenTool}
    // WCAG 1.3.1: sole top-level content directly under DashboardLayout's
    // page <h1> (no intervening <h2>) — mirrors the real file's own comment.
    headingLevel="h2"
    bullets={[
      "AI-generated titles, descriptions & short descriptions",
      "Tone control (Professional, Playful, Persuasive & more)",
      "Bulk rewrite across your whole catalog",
      "Editable proposals with one-click apply / undo",
    ]}
    editionMismatch={hasEditionMismatch()}
  />
);

export default AIContentPage;
