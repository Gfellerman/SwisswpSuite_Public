/**
 * Authored by: Frontend Specialist
 * Skills: react-patterns, typescript-expert
 * Date: 2026-07-18 (upsell redesign 2026-08-04)
 *
 * Freemium Dual-Build (Phase 4, A4 fix) — FREE-EDITION-ONLY BUILD-TIME
 * REPLACEMENT for AIContentPage.tsx.
 *
 * Why this file exists: AIContentPage.tsx gates its render on
 * `isProEdition()`, but the file still has a static
 * `import ContentEnhancer from "../components/ContentEnhancer"` at its top,
 * so Rollup would bundle the entire ContentEnhancer module (and everything
 * it imports) into the AIContentPage chunk regardless of which branch
 * actually executes — see AIContentPage.tsx's own comment and
 * `plugin/vite.config.ts` for the full mechanism writeup. This file is the
 * Free-only alias target for the exact specifier `'../pages/AIContentPage'`
 * (as written in router.tsx), so the real file (and ContentEnhancer) never
 * enters the Free module graph at all.
 *
 * Upsell redesign (2026-08-04, design point 1/2): content mirrors
 * AIContentPage.tsx's own Free branch verbatim — one neutral "ai"
 * FeaturePointer, no bullets, no CTA pair.
 */
import React from "react";
import { FeaturePointer } from "../components/organisms/Upsell/FeaturePointer";
import { PenTool } from "lucide-react";

export const AIContentPage: React.FC = () => (
  <div className="mx-auto max-w-2xl py-16 text-center">
    <PenTool
      size={40}
      className="mx-auto mb-4 text-neutral-400"
      aria-hidden="true"
    />
    {/* WCAG 1.3.1: sole top-level content directly under DashboardLayout's
        page <h1> (no intervening <h2>) — mirrors the real file's own
        comment. */}
    <h2 className="dark:text-foreground text-lg font-semibold text-neutral-900">
      AI Content
    </h2>
    <div className="mt-3">
      <FeaturePointer variant="ai" />
    </div>
  </div>
);

export default AIContentPage;
