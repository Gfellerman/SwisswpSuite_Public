/**
 * TwoFactorNudgeLink — the small "Set up Two-Factor Authentication (2FA)"
 * link shown under the Login Safeguard card once Pro's 2FA feature is
 * available (Pro-local, physically excluded from the Free zip).
 *
 * Extracted from components/SecurityHub.tsx (2026-08-13, WP.org round-3
 * re-audit — B12a fingerprint scan / regression-analyzer + security-auditor
 * finding) so it can be aliased to TwoFactorNudgeLink.freeStub.tsx in the
 * Free Vite build — see plugin/vite.config.ts's resolve.alias block for the
 * exclusion mechanism. Prior to this extraction the link was written
 * directly inline inside the SecurityHub.tsx monolith, gated only by a
 * runtime `isProEditionBuild && (...)` conditional — a real physical file
 * boundary is needed for a Vite alias to redirect, which inline JSX cannot
 * provide. Same pattern, same root cause, and same fix shape as
 * GeoLockdownCard.tsx's 2026-08-13 revision (see that file's docblock).
 *
 * This is presentation-only (a `<Link>` + icon + label, no state, no API
 * calls) — nothing to move besides the JSX itself, unlike GeoLockdownCard.
 */
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

export function TwoFactorNudgeLink() {
  return (
    <Link
      to="/settings?tab=security"
      className="relative z-10 mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 transition-colors hover:text-blue-800"
    >
      <ShieldCheck size={14} />
      Set up Two-Factor Authentication (2FA)
    </Link>
  );
}
