/**
 * Authored by: Frontend Specialist
 * Skills: react-patterns, tailwind-patterns, ui-ux-pro-max
 * Date: 2026-07-17
 *
 * Freemium Dual-Build (Phase 3) — the single reusable "this is a Pro
 * feature" placeholder used everywhere a premium surface would render in
 * the Free edition. Modeled on BackupsPage.tsx's existing BetaGate pattern
 * for visual/structural consistency with an already-shipped, reviewed
 * pattern in this codebase.
 *
 * Guideline 11 (upsell/nag rules — see
 * docs/architecture/FREEMIUM_DUAL_BUILD_ARCHITECTURE.md §5): this renders
 * INSIDE our own admin pages only, is not a site-wide notice, dashboard-wide
 * banner, or modal interrupt, and is never shown more than once per surface
 * (it replaces the locked content in place — it does not stack on top of
 * working UI). Never use this to nag on a page the user did not navigate to
 * for that feature.
 *
 * Both CTA URLs are exported constants — every call site must import them
 * from here (or from lib/edition.ts, which re-exports the same values)
 * rather than hardcoding the strings, so there is exactly one place to
 * change them.
 */
import React, { useId } from "react";
import {
  Sparkles,
  Download,
  ArrowUpRight,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { PRO_UPGRADE_URL, PRO_DOWNLOAD_URL } from "../../../lib/edition";

export { PRO_UPGRADE_URL, PRO_DOWNLOAD_URL };

export interface ProUpsellPlaceholderProps {
  /** Human-readable feature name, e.g. "Two-Factor Authentication". */
  feature: string;
  /** One or two sentences explaining what the feature does. */
  description: string;
  /** Optional "what you get" list — 2-5 short items read best. */
  bullets?: string[];
  /** 'page' = large centered hero (full-tab placeholder). 'compact' = fits inside a grid cell or a mixed-tab section. */
  variant?: "page" | "compact";
  /** Lucide icon component. Defaults to Lock. */
  icon?: React.ElementType;
  className?: string;
  /**
   * Heading level for the feature title (WCAG 1.3.1). Defaults to "h3",
   * which is correct for every grid/card placement where this sits beside
   * sibling h3 cards (e.g. SecurityHub.tsx's Update Guard / Geo-Blocking
   * cards, whose titles are h3). Pass "h2" only when this placeholder is
   * the sole top-level content of a route rendered directly under
   * DashboardLayout's <h1> with no intervening <h2> — e.g. AIContentPage.tsx,
   * SyncPage.tsx — to avoid an h1->h3 heading-level skip. Pass "h4" when
   * nested one level deeper than the default case, i.e. the placeholder
   * sits beside sibling h4 content instead of h3 — e.g.
   * HardeningOptionsGrid.tsx's Advanced Controls section, where the parent
   * panel title is already h3 ("System Hardening") and both the sibling
   * "Protect My Site" section label and every HardeningOptionCard's
   * opt.label are h4.
   */
  headingLevel?: "h2" | "h3" | "h4";
  /**
   * Freemium Dual-Build (Phase 4, C2.2): true when the backend detected a
   * paid-tier license key active on this Free-edition install
   * (`edition_mismatch` — see lib/edition.ts's `hasEditionMismatch()`, the
   * canonical way to compute this at a call site). When true, the CTA
   * pair below swaps from the generic "buy or download" pair to an
   * ownership-aware primary CTA — a customer who already paid should never
   * be shown a purchase link as the primary action. Defaults to false
   * (generic CTAs), matching every call site written before this field
   * existed.
   */
  editionMismatch?: boolean;
}

/**
 * Renders a non-nagging "this is a Pro feature" panel with both mandated
 * CTAs (purchase / download-if-already-purchased). Use in place of the real
 * premium UI whenever `isFreeEdition()` is true — never alongside it.
 */
export function ProUpsellPlaceholder({
  feature,
  description,
  bullets,
  variant = "page",
  icon: Icon = Lock,
  className = "",
  headingLevel = "h3",
  editionMismatch = false,
}: ProUpsellPlaceholderProps) {
  const compact = variant === "compact";
  const headingId = useId();
  const HeadingTag = headingLevel;

  return (
    <div
      // WCAG 1.3.1 / landmark hygiene: only the full-panel ("page") variant is
      // substantial, page-level content worth its own landmark. The "compact"
      // variant sits inline among sibling cards that are NOT landmarks
      // themselves (e.g. the WAF/Login cards next to the Geo-Blocking upsell) —
      // making it a region would land AT users on this small upsell card while
      // skipping functionally more important siblings right next to it, an
      // arbitrary/inconsistent landmark map. Plain container for compact.
      {...(compact ? {} : { role: "region", "aria-labelledby": headingId })}
      className={`relative overflow-hidden rounded-2xl border border-indigo-200 bg-indigo-50/60 dark:border-indigo-800/50 dark:bg-indigo-950/20 ${compact ? "p-6" : "p-10 sm:p-16"} ${className}`}
    >
      <div
        className={`relative z-10 mx-auto flex flex-col items-center text-center ${compact ? "max-w-sm gap-3" : "max-w-xl gap-5"}`}
      >
        <div
          className={`flex shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300 ${compact ? "h-11 w-11" : "h-16 w-16"}`}
        >
          <Icon size={compact ? 20 : 30} aria-hidden="true" />
        </div>

        <div>
          <HeadingTag
            id={headingId}
            className={`font-black tracking-widest text-indigo-900 uppercase dark:text-indigo-200 ${compact ? "text-xs" : "text-sm"}`}
          >
            {feature}
            <span
              className="mx-1.5 text-indigo-400 dark:text-indigo-600"
              aria-hidden="true"
            >
              &middot;
            </span>
            Pro Feature
          </HeadingTag>
          <p
            className={`mt-2 leading-relaxed font-medium text-neutral-700 dark:text-neutral-300 ${compact ? "text-xs" : "text-sm"}`}
          >
            {description}
          </p>
        </div>

        {bullets && bullets.length > 0 && (
          <ul
            role="list"
            className="flex w-full flex-col gap-1.5 text-left"
            aria-label={`What ${feature} unlocks in Pro`}
          >
            {bullets.map((b) => (
              <li
                key={b}
                className="flex items-start gap-2 text-xs text-neutral-600 dark:text-neutral-400"
              >
                <CheckCircle2
                  size={13}
                  className="mt-0.5 shrink-0 text-indigo-500"
                  aria-hidden="true"
                />
                {b}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-1 flex flex-col items-center gap-3 sm:flex-row">
          {/* text-white!/text-indigo-700!/dark:text-indigo-300! are hardened
              with Tailwind v4's trailing `!` important-modifier. WordPress
              admin's own link CSS is unlayered, while Tailwind v4 utilities
              live inside `@layer utilities` — per the CSS Cascade Layers
              spec, an unlayered author style beats a layered one regardless
              of selector specificity, so wp-admin's link color can silently
              win over a plain `text-white` on this <a>. Same failure class
              already hit once and fixed for `.swps-cta-dark` in index.css
              ("beats WP admin button resets"); this is the same fix applied
              locally instead of via a new global class. Computed contrast
              once the intended color actually renders: white/indigo-600 =
              6.3:1; indigo-700/card background ≈ 7.4:1 — both clear WCAG AA
              (4.5:1 normal text). */}
          {editionMismatch ? (
            // Ownership-aware pair (C2.2): this visitor's license already
            // paid for the feature this placeholder is standing in for — the
            // primary action must be "go install what you own", never a
            // second purchase link. Mirrors LicenseManager.tsx's dedicated
            // isProKeyInFreeBuild view (same CTA pair, same URL choices).
            <>
              <a
                href={PRO_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-black tracking-widest text-white! uppercase shadow-sm transition-colors hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500/60 focus:ring-offset-2 focus:outline-none"
              >
                <Download size={14} aria-hidden="true" />
                You Already Own This — Download &amp; Install Pro
              </a>
              <a
                href={PRO_UPGRADE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-indigo-300 px-5 py-2.5 text-xs font-black tracking-widest text-indigo-700! uppercase transition-colors hover:bg-indigo-100 focus:ring-2 focus:ring-indigo-500/60 focus:ring-offset-2 focus:outline-none dark:border-indigo-700 dark:text-indigo-300! dark:hover:bg-indigo-900/30"
              >
                View Your Plan
                <ArrowUpRight size={12} aria-hidden="true" />
              </a>
            </>
          ) : (
            <>
              <a
                href={PRO_UPGRADE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-black tracking-widest text-white! uppercase shadow-sm transition-colors hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500/60 focus:ring-offset-2 focus:outline-none"
              >
                <Sparkles size={14} aria-hidden="true" />
                Upgrade to Pro
                <ArrowUpRight size={12} aria-hidden="true" />
              </a>
              <a
                href={PRO_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-indigo-300 px-5 py-2.5 text-xs font-black tracking-widest text-indigo-700! uppercase transition-colors hover:bg-indigo-100 focus:ring-2 focus:ring-indigo-500/60 focus:ring-offset-2 focus:outline-none dark:border-indigo-700 dark:text-indigo-300! dark:hover:bg-indigo-900/30"
              >
                <Download size={14} aria-hidden="true" />
                Already Purchased? Download Pro
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProUpsellPlaceholder;
