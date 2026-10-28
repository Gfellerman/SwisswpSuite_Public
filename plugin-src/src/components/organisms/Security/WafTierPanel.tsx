import React from "react";
import { CheckCircle } from "lucide-react";
import { CapabilityNote } from "../../atoms/CapabilityNote";
import { CAPABILITY_NOTES } from "../../../lib/capabilityNoteCopy";

/**
 * WafTierPanel — the firewall summary on the Security dashboard. The panel
 * takes no props: it lists what the request check inspects, says what it does
 * not inspect, and ends with one capability note.
 */
export const WafTierPanel: React.FC = () => (
  <div className="border-border relative z-10 mt-4 border-t pt-4">
    <p className="text-swiss-navy dark:text-foreground mb-2 text-xs font-black tracking-widest uppercase">
      Web Application Firewall
    </p>
    <ul className="mb-3 space-y-1">
      {[
        "SQL-injection patterns in the page address",
        "Basic script-injection patterns (javascript: links, inline event handlers) in the page address",
        "Path traversal in the page address",
      ].map((f) => (
        <li
          key={f}
          className="flex items-start gap-1.5 text-xs text-neutral-600 dark:text-neutral-400"
        >
          <CheckCircle
            size={10}
            className="mt-0.5 shrink-0 text-emerald-700 dark:text-emerald-500"
          />{" "}
          {f}
        </li>
      ))}
    </ul>
    <p className="mb-2 text-xs text-neutral-600 dark:text-neutral-400">
      Form submissions, file uploads, request bodies, request headers and
      cookies are not inspected.
    </p>
    <CapabilityNote text={CAPABILITY_NOTES.waf} />
  </div>
);
