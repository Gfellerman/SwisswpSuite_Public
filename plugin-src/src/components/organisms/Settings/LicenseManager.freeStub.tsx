/**
 * Authored by: Frontend Specialist
 * Skills: react-patterns, typescript-expert
 * Date: 2026-07-26
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
 * Prop signature deliberately mirrors the real component's
 * (license/tokens/onActivate/isActivating) so SettingsPage.tsx needs no
 * change for either edition. Every prop is accepted; only `license` is
 * read, and only for hasEditionMismatch() below — everything else is
 * intentionally ignored, since there is nothing here to activate, refresh,
 * or cancel.
 */
import React from "react";
import { KeyRound } from "lucide-react";
import { ProUpsellPlaceholder } from "../Upsell/ProUpsellPlaceholder";
import { hasEditionMismatch } from "../../../lib/edition";

interface LicenseManagerProps {
  license?: any;
  tokens?: any;
  onActivate: (key: string) => Promise<any>;
  isActivating: boolean;
}

export function LicenseManager({ license }: LicenseManagerProps) {
  return (
    <ProUpsellPlaceholder
      feature="Pro Licensing"
      icon={KeyRound}
      // WCAG 1.3.1: default "h3" — this tab sits under SettingsPage's own
      // <h1>Settings</h1> with no intervening <h2>, same structural depth
      // as the "api" tab's ApiConfig/ProUpsellPlaceholder pair (see
      // SettingsPage.tsx's own comment on that call site), not the "h2"
      // used by routed pages (SyncPage/AIContentPage) that sit directly
      // under DashboardLayout's page heading.
      description="This Free edition works fully with no license key, no account, and no calls to our servers. Pro — AI content tools, cloud backup, site sync, two-factor auth, and advanced WAF — is a separate licensed download from swisswpsecure.com."
      bullets={[
        "Nothing in this Free edition requires a license or account",
        "Pro adds AI content, cloud backup, sync, 2FA & advanced WAF",
        "Pro is licensed and downloaded separately, not unlocked here",
      ]}
      editionMismatch={hasEditionMismatch(license)}
    />
  );
}
