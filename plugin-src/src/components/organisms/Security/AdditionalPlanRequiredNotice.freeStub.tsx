import React from "react";
import { Lock } from "lucide-react";

/**
 * Free-edition stub for AdditionalPlanRequiredNotice.tsx (WP.org string
 * census closure, 2026-08-13, R4). Wired via vite.config.ts's resolve.alias,
 * active only when EDITION === 'free'.
 *
 * REVISED (owner directive, mid-task 2026-08-13): `hasSentinelPro` is a
 * paid-plan capability, always false on an unlicensed Free install, so this
 * notice DOES genuinely render for every real Free user viewing scan
 * history — it must not vanish. KEEP-BUT-RENAME: neutral copy explaining
 * that only the most recent scan is shown, no "Pro"/"Upgrade"/"plan"
 * wording and no outbound purchase link (the real component's link to
 * swisswpsecure.com/products is the one piece that IS an upsell CTA and is
 * dropped here).
 */
export const AdditionalPlanRequiredNotice: React.FC = () => (
  <div className="mb-6 flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
    <Lock
      size={16}
      className="text-amber-600 shrink-0 mt-0.5"
      aria-hidden="true"
    />
    <div>
      <p className="text-xs font-black uppercase tracking-widest text-amber-700 mb-1">
        Limited History Shown
      </p>
      <p className="text-xs font-medium text-amber-700">
        Only your most recent scan is shown here. Additional scan history is
        not included in this edition.
      </p>
    </div>
  </div>
);
