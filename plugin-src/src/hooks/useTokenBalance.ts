import { useState, useCallback } from "react";

/**
 * Hook to read and update the AI token balance with React state.
 *
 * N-2: Rewritten from a pure window.* snapshot to useState so that balance
 * changes (e.g. after a scan completes) trigger re-renders. The setBalance
 * callback also syncs back to window.swisswpsuiteData for consistency with
 * components that still read the global directly.
 *
 * H-2B: Exposes setBalance() so callers can update balance from API responses
 * that include balance_remaining.
 */

const MIN_COST = {
  sentinel_security: 1500,
  sentinel_seo: 500,
  content_enhancer: 1500,
  sentinel_migration: 2000,
} as const;

type Module = keyof typeof MIN_COST;

export function useTokenBalance() {
  const [balance, setBalanceState] = useState<number>(() => {
    return ((window as any).swisswpsuiteData?.tokens?.balance as number) ?? 0;
  });

  // v32: purchased token-pack pool. Spend is ALLOWANCE-FIRST (the monthly balance is
  // drained before the pack), so an action is affordable when balance + packBalance
  // covers it — canAfford() and totalSpendable use the sum, not `balance` alone.
  const [packBalance, setPackBalanceState] = useState<number>(() => {
    return (
      ((window as any).swisswpsuiteData?.tokens?.pack_balance as number) ?? 0
    );
  });

  const totalSpendable = balance + packBalance;

  const canAfford = useCallback(
    (module: Module): boolean => balance + packBalance >= MIN_COST[module],
    [balance, packBalance]
  );

  const tokensNeeded = (module: Module): number => MIN_COST[module];

  const setBalance = useCallback((newBalance: number) => {
    // Also update window.swisswpsuiteData for consistency with non-React readers
    if ((window as any).swisswpsuiteData?.tokens) {
      (window as any).swisswpsuiteData.tokens.balance = newBalance;
    }
    setBalanceState(newBalance);
  }, []);

  const setPackBalance = useCallback((newPack: number) => {
    if ((window as any).swisswpsuiteData?.tokens) {
      (window as any).swisswpsuiteData.tokens.pack_balance = newPack;
    }
    setPackBalanceState(newPack);
  }, []);

  return {
    balance,
    packBalance,
    totalSpendable,
    canAfford,
    tokensNeeded,
    setBalance,
    setPackBalance,
  };
}
