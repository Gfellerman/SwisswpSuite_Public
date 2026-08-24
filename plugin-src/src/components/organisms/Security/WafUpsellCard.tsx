import React from "react";
import { Lock } from "lucide-react";

/**
 * WafUpsellCard
 * -----------------------------------------------------------------------------
 * WP.org compliance (2026-08-13, v2.9.33.18 census closure, R2a): "Upgrade
 * for Full Protection" / "Upgrade to Security Plan" WAF-tier upsell box,
 * extracted from SecurityHub.tsx so vite.config.ts can alias it away in the
 * Free build. This box only ever renders when `isProEditionBuild` is true —
 * unreachable in a genuine Free install at runtime (isProEditionBuild reads
 * window.swisswpsuiteData.edition, which is never 'pro' in a Free zip) —
 * but SecurityHub.tsx is a shared, always-compiled file, so the literal
 * strings shipped into the Free bundle regardless (same violation class as
 * the GeoLockdownCard sibling extraction, 2026-08-12).
 */
export const WafUpsellCard: React.FC = () => (
  <div className="bg-swiss-navy/5 border-swiss-navy/10 rounded-xl border p-3">
    <p className="text-swiss-navy mb-1 text-xs font-black tracking-widest uppercase">
      Upgrade for Full Protection
    </p>
    <ul className="mb-2 space-y-0.5">
      {[
        "28+ SQLi + comment injection bypass",
        "40+ XSS + all event handler attacks",
        "Multi-layer encoding bypass detection",
      ].map((f) => (
        <li
          key={f}
          className="flex items-start gap-1.5 text-xs text-neutral-500"
        >
          <Lock size={9} className="text-swiss-navy/40 mt-0.5 shrink-0" />{" "}
          {f}
        </li>
      ))}
    </ul>
    <a
      href="https://swisswpsecure.com/products/"
      target="_blank"
      rel="noopener noreferrer"
      className="text-swiss-navy inline-flex items-center gap-1 text-xs font-black tracking-widest uppercase hover:underline"
    >
      Upgrade to Security Plan →
    </a>
  </div>
);
