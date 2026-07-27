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
 */
import React from "react";
import ContentEnhancer from "../components/ContentEnhancer";
import { ProUpsellPlaceholder } from "../components/organisms/Upsell/ProUpsellPlaceholder";
import { isProEdition, hasEditionMismatch } from "../lib/edition";
import { PenTool } from "lucide-react";

export const AIContentPage: React.FC = () => {
  if (!isProEdition()) {
    return (
      <ProUpsellPlaceholder
        feature="AI Content"
        description="AI rewrites your WooCommerce product titles, descriptions, and short descriptions — with tone control, bulk rewrite, and editable proposals you can apply or undo."
        icon={PenTool}
        // WCAG 1.3.1: this placeholder is the sole top-level content directly
        // under DashboardLayout's page <h1> (no intervening <h2>, unlike the
        // Pro-edition ContentEnhancer it replaces, whose first heading is an
        // <h2> at ContentEnhancer.tsx:403) — h3 default would skip a level.
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
  }
  return <ContentEnhancer />;
};

export default AIContentPage;
