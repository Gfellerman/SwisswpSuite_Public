/**
 * Authored by: Frontend Specialist
 * Skills: react-patterns, typescript-expert
 * Date: 2026-07-27
 *
 * WP.org round-3 remediation, Sprint W2c (Free JS-bundle hygiene) —
 * FREE-EDITION-ONLY BUILD-TIME REPLACEMENT for
 * components/organisms/Settings/TwoFactorSettings.tsx (~29KB — TOTP 2FA
 * setup, QR code, backup codes; Pro-only).
 *
 * `SettingsPage.tsx` already gates the real component's RENDER behind
 * `isProEdition()` (a Free visitor always sees the "Two-Factor
 * Authentication" ProUpsellPlaceholder instead — see SettingsPage.tsx's
 * "security" tab ternary), but per the same Rollup static-analysis
 * reasoning documented in AIContentPage.freeStub.tsx, a runtime-only gate
 * does not stop Rollup from still emitting TwoFactorSettings' ~29KB of code
 * (plus its `qrcode.react` dependency) inside the shipped SettingsPage
 * chunk — it's a plain top-level
 * `import { TwoFactorSettings } from
 * "../components/organisms/Settings/TwoFactorSettings"` (static, not
 * React.lazy).
 *
 * `plugin/vite.config.ts` aliases the exact specifier
 * "../components/organisms/Settings/TwoFactorSettings" (as written at
 * SettingsPage.tsx's one call site) to THIS file only when built with
 * EDITION=free. Vite's alias resolution happens at module-resolve time,
 * before Rollup ever parses the real TwoFactorSettings.tsx — so in a Free
 * build the real file, and everything it transitively imports (including
 * `qrcode.react`), never enters the module graph at all. Pro builds never
 * add the alias.
 *
 * This component is never actually mounted at runtime in Free
 * (SettingsPage's own `isProEdition()` ternary never reaches the branch
 * that renders it), so its content is inert — but it renders a real
 * (compact) upsell rather than `null`, matching this codebase's "graceful
 * degradation" convention (see SyncManager.freeStub.tsx) in case a future
 * refactor of SettingsPage.tsx ever reaches this branch directly. Copy/
 * props below mirror SettingsPage.tsx's own already-shipped 2FA placeholder
 * verbatim (feature/description/bullets/icon, "compact" variant — this
 * sits among sibling cards in the "security" tab, not as sole tab content —
 * default "h3" heading, unchanged from that call site). TwoFactorSettings
 * takes no props, so this stub takes none either. Real file has ONLY a
 * named export (no default) — mirrored exactly below.
 */
import React from "react";
import { ProUpsellPlaceholder } from "../Upsell/ProUpsellPlaceholder";
import { hasEditionMismatch } from "../../../lib/edition";
import { KeyRound } from "lucide-react";

export function TwoFactorSettings() {
  return (
    <ProUpsellPlaceholder
      feature="Two-Factor Authentication"
      variant="compact"
      icon={KeyRound}
      description="Require a time-based one-time code (TOTP) at login, in addition to your password — with backup codes for account recovery."
      bullets={[
        "Authenticator-app TOTP (Google Authenticator, Authy, etc.)",
        "QR-code setup with backup recovery codes",
      ]}
      editionMismatch={hasEditionMismatch()}
    />
  );
}
