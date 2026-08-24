/**
 * Free-edition stub for BetaFeaturesToggleRow.tsx (ARS Round D, D-K-4
 * follow-up fix, lane-K verifier, 2026-08-24). Wired via
 * `plugin/vite.config.ts`'s `resolve.alias`, active only when
 * `EDITION === 'free'`. Renders nothing — `swisswpsuite_beta_features`
 * gates Sync/Migration, both fully Pro-only features physically absent
 * from the Free zip; a Free install has nothing for this toggle to
 * unlock, so the control (and the literal "Beta Features" string) must
 * be physically absent from the Free bundle too, not merely unreachable
 * at runtime.
 */
export interface BetaFeaturesToggleRowProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  isSaving?: boolean;
}

export function BetaFeaturesToggleRow(
  _props: BetaFeaturesToggleRowProps
): null {
  return null;
}
