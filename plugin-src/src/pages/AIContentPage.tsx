/**
 * AI Content Page — Phase 3 Migration Complete
 * Agent: debugger + backend-specialist
 * Wired to: ContentEnhancer (full live component)
 * Features: AI rewrite (title/desc/short_desc), tone control, bulk rewrite, editable proposals, apply/undo, category filter
 *
 * Freemium Dual-Build (Phase 3, 2026-07-17): AI Content is entirely
 * serviceware (Groq) and is physically absent from the Free zip — gated at
 * this call site rather than inside ContentEnhancer so the component itself
 * needs no changes. Free edition never mounts ContentEnhancer (its wpApi
 * calls would hit dead REST routes).
 *
 * Upsell redesign (2026-08-04, design point 1/2): the Free branch used to
 * render a full ProUpsellPlaceholder (bullets + "Upgrade to Pro"/"Download
 * Pro" CTA pair). Per the owner-approved redesign, every per-page
 * placeholder is removed — this page is entirely AI-backed, so it carries
 * one neutral "ai" FeaturePointer instead, pointing in-app to Settings.
 */
import React from "react";
import ContentEnhancer from "../components/ContentEnhancer";
import { FeaturePointer } from "../components/organisms/Upsell/FeaturePointer";
import { isProEdition } from "../lib/edition";
import { PenTool } from "lucide-react";

export const AIContentPage: React.FC = () => {
  if (!isProEdition()) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <PenTool
          size={40}
          className="mx-auto mb-4 text-neutral-400"
          aria-hidden="true"
        />
        {/* WCAG 1.3.1: sole top-level content directly under DashboardLayout's
            page <h1> (no intervening <h2>, unlike the Pro-edition
            ContentEnhancer it replaces) — h2 avoids a heading-level skip. */}
        <h2 className="dark:text-foreground text-lg font-semibold text-neutral-900">
          AI Content
        </h2>
        <div className="mt-3">
          <FeaturePointer variant="ai" />
        </div>
      </div>
    );
  }
  return <ContentEnhancer />;
};

export default AIContentPage;
