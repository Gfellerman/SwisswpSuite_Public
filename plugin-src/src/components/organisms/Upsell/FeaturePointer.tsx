/**
 * Authored by: Frontend Specialist
 * Skills: react-patterns, tailwind-patterns, typescript-expert
 * Date: 2026-08-04
 *
 * WP.org listing-compliance upsell redesign (docs/reports/
 * PROMPT_UPSELL_REDESIGN_SPRINT_2026-08-03.md). Replaces every per-page
 * `ProUpsellPlaceholder` panel (hero/compact card + bullets + "Upgrade to
 * Pro"/"Download Pro" CTA pair) with a single plain text line. The
 * reviewers' own checklist limits upselling to the plugin's settings screen
 * or a link on the plugin-list row (docs/wporg-compliance-kb/
 * 09-review-checklist.md:187) — this component carries NO selling at all,
 * it only points to where the real explanation lives.
 *
 * Rules (owner-approved, non-negotiable):
 *   - One line, text-only. No button styling, no border/card chrome.
 *   - Never contains "Pro", "Upgrade", or any pricing word.
 *   - Exactly two wording variants — truthfulness split, not a style choice:
 *     "ai"      — some of the hidden functionality is AI-backed (SEO
 *                 generation, Content Enhancer, AI security analysis).
 *     "edition" — the hidden functionality is a local Pro feature with no
 *                 AI involved (cloud backup, geo-blocking, sync/migration,
 *                 2FA, update-guard). NEVER use "ai" for one of these — a
 *                 non-AI feature mislabeled as AI-gated is a truthfulness
 *                 defect (WPORG_REAUDIT_B register F5 territory), not a
 *                 wording preference.
 *   - "details in Settings" is the ONLY link text and always navigates
 *     in-app (react-router `Link`, no page reload) to the Free-edition
 *     "Editions & AI" Settings section — never an external URL.
 *   - No `role`/`aria-*` attributes are added here — a plain paragraph with
 *     a plain link needs none, and adding them would trigger the a11y
 *     gate for a change that has nothing to review.
 */
import React from "react";
import { Link } from "react-router-dom";

export type FeaturePointerVariant = "ai" | "edition";

const COPY: Record<FeaturePointerVariant, string> = {
  ai: "Some options on this page require an AI connection",
  edition: "Some features are not included in this edition",
};

interface FeaturePointerProps {
  variant: FeaturePointerVariant;
  className?: string;
}

export function FeaturePointer({ variant, className = "" }: FeaturePointerProps) {
  return (
    <p className={`text-xs text-neutral-500 dark:text-neutral-400 ${className}`}>
      {COPY[variant]} &mdash;{" "}
      <Link
        to="/settings?tab=api"
        className="underline decoration-dotted hover:text-neutral-700 dark:hover:text-neutral-300"
      >
        details in Settings
      </Link>
      .
    </p>
  );
}

export default FeaturePointer;
