/**
 * FileIntegrityBadge — the File Integrity card's status badge.
 *
 * Background: without this component, the card would render a hardcoded
 * green "Secure" badge unconditionally — regardless
 * of whether a core-file-integrity check had ever actually run, and
 * regardless of what it found. `perform_core_scan()`
 * (class-swisswpsuite-security.php:2422-2500) computes real
 * `issues_found`/`informational_found`/`details` on every run (manual scan
 * or the `swisswpsuite_daily_integrity_check` cron), but that result is
 * only ever logged (SwissWPSuite_Diagnostics::log) — it is never persisted
 * to an option or returned by any GET endpoint this component calls.
 * `GET /security/status` (SecurityStatus, types.ts) exposes only
 * `last_scan` / `last_scan_source` (a timestamp/label), not a pass/fail
 * signal. `SecurityAuditResult.findings[].integrity_category` (types.ts)
 * exists but is imported and UNUSED in SecurityHub.tsx (dead import,
 * confirmed via `command grep -n "SecurityAuditResult"
 * src/components/SecurityHub.tsx` -> only the import line) — nothing wires
 * it to this card either.
 *
 * Deliberately no new fetch is added here: no data currently reaches this
 * component, and persisting perform_core_scan()'s result to a readable
 * option/endpoint is a separate, backend-side change out of scope for this
 * component.
 *
 * This component is therefore the honest, narrow fix available today: it
 * replaces the unconditional "Secure" literal with a real state machine
 * (clean / issues / not_run) so that (a) production, which has no real
 * signal yet, renders the neutral "not run" state instead of a false
 * "Secure" claim, and (b) the render logic for the other two states is
 * built, tested, and ready to wire up the moment a real signal exists
 * (ADR/backlog item, not invented here).
 */
import React from "react";
import { Badge } from "../../ui/Badge";

export type CoreIntegrityStatus = "clean" | "issues" | "not_run";

export interface FileIntegrityBadgeProps {
  status: CoreIntegrityStatus;
}

export const FileIntegrityBadge: React.FC<FileIntegrityBadgeProps> = ({
  status,
}) => {
  if (status === "issues") {
    return (
      <Badge className="rounded-full border-none bg-red-100 px-3 py-1 text-xs font-black tracking-widest text-red-700 uppercase">
        Issues Found
      </Badge>
    );
  }

  if (status === "clean") {
    return (
      <Badge className="rounded-full border-none bg-emerald-100 px-3 py-1 text-xs font-black tracking-widest text-emerald-700 uppercase">
        Secure
      </Badge>
    );
  }

  // "not_run" — the only state reachable in production today (no data
  // source exists yet). Neutral, WCAG-AA-safe (Badge.tsx's own "neutral"
  // variant, already contrast-verified — see Badge.tsx's docblock).
  return (
    <Badge
      variant="neutral"
      className="rounded-full px-3 py-1 text-xs font-black tracking-widest uppercase"
    >
      Not Yet Verified
    </Badge>
  );
};
