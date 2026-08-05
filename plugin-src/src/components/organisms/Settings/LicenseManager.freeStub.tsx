/**
 * Authored by: Frontend Specialist
 * Skills: react-patterns, typescript-expert
 * Date: 2026-07-26 (upsell redesign 2026-08-04)
 *
 * Freemium Dual-Build — FREE-EDITION-ONLY BUILD-TIME REPLACEMENT for
 * organisms/Settings/LicenseManager.tsx.
 *
 * WP.org round-3 remediation (Sprint W2, decision D6): after Sprint W1
 * de-gated every locally-implemented feature (hardening, IP management,
 * deep-scan local phases, etc.), the Free edition has nothing left for a
 * license key to unlock — everything included already works, no gate, no
 * account. Guideline 6 forbids a license/key-check system that exists
 * "while all functional aspects of the plugin are included locally," so
 * the License tab renders this honest static stub in Free instead of the
 * real ~1,900-line component: no license-key input, no free-license email
 * form, no account of any kind, and — critically — zero network calls
 * (the real component's on-mount POST /license/refresh, Stripe billing
 * portal, cancel/renewal-type actions, etc. never load here at all).
 *
 * `plugin/vite.config.ts` aliases the exact specifier
 * '../components/organisms/Settings/LicenseManager' (as written in
 * SettingsPage.tsx, its one call site) to THIS file only when built with
 * EDITION=free. Vite's alias resolution happens at module-resolve time,
 * before Rollup ever parses the real LicenseManager.tsx — so in a Free
 * build the real file, and everything it transitively imports, never
 * enters the module graph at all. Pro builds never add the alias.
 *
 * Upsell redesign (2026-08-04, design point 1): the old ProUpsellPlaceholder
 * (bullets + "Upgrade to Pro"/"Download Pro" CTA pair) is replaced with a
 * plain, non-styled-as-a-panel statement — the full per-module edition
 * breakdown now lives once in the "Editions & AI" Settings section
 * (`EditionsAiInfo.tsx`, reached via the "api" tab), not duplicated here.
 *
 * Prop signature deliberately mirrors the real component's
 * (license/tokens/onActivate/isActivating) so SettingsPage.tsx needs no
 * change for either edition. Every prop is accepted; none are read — there
 * is nothing here to activate, refresh, or cancel.
 */
import React from "react";
import { Link } from "react-router-dom";

interface LicenseManagerProps {
  license?: any;
  tokens?: any;
  onActivate: (key: string) => Promise<any>;
  isActivating: boolean;
}

export function LicenseManager(_props: LicenseManagerProps) {
  return (
    <div className="max-w-3xl space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
      <p>
        This Free edition works fully with no license key, no account, and
        no calls to our servers — there is nothing to activate here.
      </p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        See{" "}
        <Link
          to="/settings?tab=api"
          className="underline decoration-dotted hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          Editions &amp; AI
        </Link>{" "}
        for what the Pro edition adds.
      </p>
    </div>
  );
}
