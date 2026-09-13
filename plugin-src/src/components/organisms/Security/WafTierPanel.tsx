import React from "react";
import { CheckCircle } from "lucide-react";

/**
 * WafTierPanel — the firewall summary on the Security dashboard. This build
 * ships one WAF rule set and applies it unconditionally, so the panel takes
 * no props and lists what that rule set blocks.
 */
export const WafTierPanel: React.FC = () => (
  <div className="border-border relative z-10 mt-4 border-t pt-4">
    <p className="text-swiss-navy mb-2 text-xs font-black tracking-widest uppercase">
      Web Application Firewall
    </p>
    <ul className="mb-3 space-y-1">
      {[
        "SQL injection pattern blocking",
        "Cross-site scripting (XSS) pattern blocking",
        "Path traversal protection",
      ].map((f) => (
        <li
          key={f}
          className="flex items-start gap-1.5 text-xs text-neutral-600 dark:text-neutral-400"
        >
          <CheckCircle size={10} className="mt-0.5 shrink-0 text-emerald-500" />{" "}
          {f}
        </li>
      ))}
    </ul>
  </div>
);
