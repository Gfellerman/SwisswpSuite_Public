/**
 * Authored by: Frontend Specialist
 * Skills: react-patterns, typescript-expert
 * Date: 2026-08-12
 *
 * WP.org round-3 remediation (frontend physical-exclusion sweep) —
 * FREE-EDITION-ONLY BUILD-TIME REPLACEMENT for
 * components/organisms/Settings/EncryptionSettings.tsx (~380 lines —
 * backup-archive encryption password set/clear UI; Pro-only, see
 * docs/TECHNICAL_DEBT.md TD-60: the Free restorer hard-rejects any
 * .zip.enc file, so a Free user allowed to SET a password here would
 * create backups they can never restore in-product).
 *
 * `plugin/vite.config.ts` aliases the exact specifier
 * "../components/organisms/Settings/EncryptionSettings" (as written at
 * SettingsPage.tsx's one call site) to THIS file only when built with
 * EDITION=free. See TwoFactorSettings.freeStub.tsx / AIContentPage.freeStub.tsx
 * for the full Rollup static-import-elision writeup (identical mechanism:
 * a plain `import { EncryptionSettings } from "..."` is resolved by Vite's
 * alias BEFORE Rollup ever parses the real file, so the real file — and its
 * "Backup Encryption" password-set/clear UI, input fields, and validation
 * logic — never enters the Free build's module graph at all).
 *
 * SettingsPage.tsx already gates the call site on `isProEdition()` (a
 * runtime check) — that alone left the real component's compiled JS/text
 * physically present in the Free bundle even though it never rendered.
 * This alias makes the exclusion physical, matching the binding doctrine in
 * docs/architecture/FREEMIUM_DUAL_BUILD_ARCHITECTURE.md's 2026-07-26
 * amendment: "In the Free build a feature is either fully working with no
 * gate, or physically absent... There is no third state."
 *
 * Renders nothing — SettingsPage.tsx's call site is
 * `{isProEdition() && <EncryptionSettings ... />}`, so this stub is not
 * actually reachable in the Free build's render tree either; it exists only
 * to satisfy the module graph.
 */
export function EncryptionSettings() {
  return null;
}
