/**
 * scanResultProCopy — Pro-only locked-action copy for ScanResultPanel.tsx
 *
 * WP.org compliance (2026-08-13, v2.9.33.18 census closure, R2a): these
 * strings describe/gate the paid-plan remediation actions (Quarantine,
 * Delete, per-file "Analyze with AI") shown as locked buttons when
 * `canRemediate`/`hasSentinelPro` is false. That state IS reachable by
 * genuine Free users (canRemediate/hasSentinelPro are license-capability
 * checks, always false on an unlicensed Free install) — but per this
 * project's doctrine (docs/audit/FREE_BUNDLE_STRING_CENSUS_2026-08-13.md)
 * string PRESENCE in the Free bundle is the mechanism, not runtime
 * reachability. Extracted so vite.config.ts can alias this module away in
 * the Free build; the freeStub sibling supplies neutral/empty values so the
 * locked buttons keep rendering disabled with a Lock icon (no functional
 * regression — R6) but with no Pro-naming copy attached.
 */
export const REMEDIATION_LOCKED_TOOLTIP = "Requires a paid plan";
export const REMEDIATION_LOCKED_TOAST = "This action isn't available on your plan.";
export const AI_ANALYSIS_LOCKED_LABEL = "AI Analysis requires Pro license";
