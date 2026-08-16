import React from "react";
import { Lock } from "lucide-react";

/**
 * AdditionalPlanRequiredNotice
 * -----------------------------------------------------------------------------
 * WP.org compliance (2026-08-13, v2.9.33.18 census closure, R4): extracted
 * from ScanHistoryTable.tsx. "Additional Plan Required" / "requires an
 * active plan" is Pro-descriptive copy naming a specific upgrade path.
 * `hasSentinelPro` is a paid-PLAN capability (not an edition gate — the
 * file's own pre-existing T3 upsell-redesign comment on the sibling
 * "N older scans hidden" notice already documents this: "hasSentinelPro is a
 * paid-plan capability reachable in either edition"), so this notice DOES
 * render for genuine Free users today. Physically extracted via
 * vite.config.ts's resolve.alias (same mechanism as GeoLockdownCard /
 * WafUpsellCard / etc.) rather than reworded in place, per the controller's
 * explicit R4 ruling — the table itself keeps its Free-legit portion (the
 * 1 free record); only this notice is removed from the Free bundle.
 *
 * REVERSIBLE: this decision silences the explanatory notice in Free
 * entirely (freeStub renders null) rather than replacing it with neutral
 * copy. Flagged to the owner per R4 — if a neutral (non-Pro-naming) notice
 * is preferred over silence, replace the freeStub's `null` with neutral JSX
 * text (no "Pro"/"Upgrade"/"plan" wording) instead of re-inlining this file.
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
        Additional Plan Required
      </p>
      <p className="text-xs font-medium text-amber-700">
        Viewing your full scan history and re-inspecting previous reports
        requires an active plan.{" "}
        <a
          href="https://swisswpsecure.com/products"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 font-black"
        >
          Learn more
        </a>
      </p>
    </div>
  </div>
);
