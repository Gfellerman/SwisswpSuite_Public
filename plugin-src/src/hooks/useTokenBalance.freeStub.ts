/**
 * Authored by: Frontend Specialist
 * Date: 2026-07-26
 *
 * Freemium Dual-Build — FREE-EDITION-ONLY BUILD-TIME REPLACEMENT for
 * hooks/useTokenBalance.ts.
 *
 * WP.org round-3 remediation (Sprint W2, register item A9 / addendum
 * finding V6): the real hook's MIN_COST map is a quota table for
 * AI/serviceware modules (sentinel_security, sentinel_seo,
 * content_enhancer, sentinel_migration) that are physically absent from
 * the Free zip. Free must not ship ANY token/quota literal, not even
 * inside a code path that would never execute there — Rollup bundles a
 * statically-imported module's source regardless of which branch actually
 * runs (the same class of problem documented at length in
 * vite.config.ts's alias comment and in this codebase's other
 * .freeStub.tsx files).
 *
 * `plugin/vite.config.ts` aliases the exact specifier
 * '../hooks/useTokenBalance' to THIS file only when built with
 * EDITION=free. All three real importers (SecurityHub.tsx,
 * ContentEnhancer.tsx, SeoManager.tsx) use that identical relative
 * specifier, so one alias entry covers all three — verified by grep
 * 2026-07-26. Pro builds never add the alias, so the real hook (and its
 * quota table) is completely unaffected there.
 *
 * Every consumer only ever calls this hook to decide whether to block an
 * AI-backed action (canAfford/tokensNeeded) or to reconcile a balance
 * display after one completes (setBalance/setPackBalance). None of those
 * actions exist in the Free edition — their backing PHP classes and REST
 * routes are absent — so this stub always affords (never blocks) and
 * reports a static zero balance; there is nothing to gate and nothing to
 * display. Return shape matches the real hook's exactly so every call
 * site keeps compiling unchanged.
 */
import { useCallback } from "react";

export function useTokenBalance() {
  const canAfford = useCallback((_module: string): boolean => true, []);
  const tokensNeeded = useCallback((_module: string): number => 0, []);
  const setBalance = useCallback((_newBalance: number): void => {}, []);
  const setPackBalance = useCallback((_newPack: number): void => {}, []);

  return {
    balance: 0,
    packBalance: 0,
    totalSpendable: 0,
    canAfford,
    tokensNeeded,
    setBalance,
    setPackBalance,
  };
}
