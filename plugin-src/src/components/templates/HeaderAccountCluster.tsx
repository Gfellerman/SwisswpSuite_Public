import React from "react";

/**
 * The admin header's right-hand account cluster.
 *
 * Sits to the right of the core-integrity indicator and holds the account
 * avatar plus anything this build shows alongside it.
 */
export const HeaderAccountCluster: React.FC = () => (
  <div className="border-border dark:border-border/10 flex items-center gap-4 border-l pl-4">
    <div className="bg-secondary dark:bg-card/10 dark:text-foreground hover:ring-swiss-red/50 flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-xs font-bold text-neutral-600 ring-2 ring-transparent transition-all">
      AD
    </div>
  </div>
);

export default HeaderAccountCluster;
