/**
 * Pro-only text content used by SecurityHub.tsx's Log Advisor action-button
 * dispatcher (`getLogActionButton`), for the two recommendation types that
 * are genuinely Pro-local features (2FA setup guidance, geo-blocking):
 *   - P4 "Geo-blocking" → GEO_LOCK_ACTION_LABEL (button label)
 *   - P5 "Two-Factor Authentication" → TWO_FACTOR_GUIDE_CONTENT (manual
 *     setup guide shown in a modal, matches what the Pro API returns for
 *     the `two_factor_authentication` finding type)
 *
 * Extracted out of SecurityHub.tsx (2026-08-12, WP.org frontend
 * physical-exclusion sweep) so this content has a real file boundary to
 * alias away in the Free build. The Log Advisor modal that reaches both of
 * these is gated `isProEditionBuild && hasSecurity` at its one entry point
 * (the "Analyze Logs with AI" button, further down SecurityHub.tsx) —
 * genuinely unreachable in Free at runtime — but the literal strings
 * ("Scan the QR code with Google Authenticator...", "Save the backup
 * recovery codes...", "Enable Geo-Lock") were still compiled into the Free
 * SecurityPage bundle as inline string/object literals, because
 * SecurityHub.tsx itself is not aliasable (it is the always-present main
 * Security page in both editions). A WP.org reviewer's grep does not care
 * whether the code path is reachable — string presence alone is the
 * compliance concern (see docs/architecture/
 * FREEMIUM_DUAL_BUILD_ARCHITECTURE.md's 2026-07-26 amendment).
 *
 * The other Log Advisor branches (P1 IP ban, P2 WAF, P3 login, P6 spam, P7
 * SQLi, P8 XSS, P9 debug/perms/hardening, P10 updates) are NOT Pro-only —
 * they are generic labels for features that are free in both editions —
 * so they are intentionally left inline in SecurityHub.tsx; only the two
 * genuinely Pro-local branches were extracted.
 */
export interface TwoFactorGuideContent {
  what: string;
  why: string;
  how: string[];
}

export const TWO_FACTOR_GUIDE_CONTENT: TwoFactorGuideContent = {
  what: "One or more administrator accounts do not have Two-Factor Authentication enabled. A stolen password alone is sufficient to compromise your site.",
  why: "2FA must be set up individually by each user — it cannot be enabled automatically on their behalf.",
  how: [
    'Go to System Config → Security tab → click "Enable 2FA"',
    "Scan the QR code with Google Authenticator, Authy, or any TOTP app",
    "Enter the 6-digit code to verify setup",
    "Save the backup recovery codes in a secure location",
    "Once enrolled, 2FA will be required on every login",
  ],
};

export const GEO_LOCK_ACTION_LABEL = "Enable Geo-Lock";
