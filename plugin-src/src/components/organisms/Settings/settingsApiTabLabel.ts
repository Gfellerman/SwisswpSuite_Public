/**
 * settingsApiTabLabel — Settings "api" tab label
 *
 * WP.org compliance (2026-08-13, v2.9.33.18 census closure, R5): the
 * Settings "api" tab's label used to be a runtime
 * `isProEdition() ? "AI Configuration" : "Editions & AI"` ternary in
 * SettingsLayout.tsx. Because isProEdition() is a runtime check (reads
 * window.swisswpsuiteData.edition — see lib/edition.ts), BOTH string
 * literals compiled into BOTH editions' bundles regardless of which branch
 * actually renders: "AI Configuration" is Pro-descriptive copy that was
 * dead-but-present in the Free JS bundle (Free's isProEdition() always
 * resolves false per lib/edition.ts's documented fail-safe contract, so
 * that branch never rendered in a genuine Free install, but the literal
 * still shipped — two-proof: (1) the PHP bootstrap only ever stamps
 * `edition` from the zip actually being built/installed, never 'pro' in a
 * wordpress.org Free zip; (2) this was the ternary's only call site, grep-
 * confirmed).
 *
 * Fixed by moving the label itself behind the SAME vite.config.ts
 * build-time alias mechanism already used for ApiConfig.tsx (this tab's
 * actual panel component) — the label and the component it describes now
 * travel together and can never drift out of sync.
 */
export const SETTINGS_API_TAB_LABEL = "AI Configuration";
