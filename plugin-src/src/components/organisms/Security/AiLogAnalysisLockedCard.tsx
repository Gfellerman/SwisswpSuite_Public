import React from "react";
import { Badge } from "../../ui/Badge";

/**
 * AiLogAnalysisLockedCard
 * -----------------------------------------------------------------------------
 * WP.org compliance (2026-08-13, v2.9.33.18 census closure, R2a): the
 * "AI Log Analysis" locked card, shown when `isProEditionBuild && !hasSecurity`
 * (a Pro build without the Security plan). "Analyzes your existing log data
 * with AI — no new scan" alone is already sanctioned FREE-LEGIT copy (it
 * appears verbatim elsewhere in this file's Pro-reachable branches), but the
 * tail sentence here — "Requires a plan that includes Security." — names a
 * specific paid-plan requirement, so the WHOLE card (not just the tail) was
 * extracted as a unit to keep the source simple. Extracted from
 * SecurityHub.tsx so vite.config.ts can alias it away in the Free build.
 * Unreachable in a genuine Free install at runtime (isProEditionBuild is
 * always false there) but SecurityHub.tsx is a shared, always-compiled
 * file, so the literal strings shipped into the Free bundle regardless.
 */
export const AiLogAnalysisLockedCard: React.FC = () => (
  <div className="glass-panel premium-card mt-4 p-6 opacity-60 transition-all">
    <div className="mb-4">
      <h3 className="text-swiss-navy mb-1 flex items-center gap-2 text-xs font-black tracking-widest uppercase">
        AI Log Analysis
        <Badge className="bg-muted text-muted-foreground border-border text-xs font-black tracking-widest uppercase">
          PRO
        </Badge>
      </h3>
      <p className="text-sm font-medium text-neutral-500">
        Analyzes your existing log data with AI — no new scan. Requires a
        plan that includes Security.
      </p>
    </div>
  </div>
);
