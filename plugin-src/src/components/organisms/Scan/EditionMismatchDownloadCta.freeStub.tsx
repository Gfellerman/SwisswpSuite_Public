import React from "react";
import { hasEditionMismatch } from "../../../lib/edition";

/**
 * Free-edition stub for EditionMismatchDownloadCta.tsx (WP.org string census
 * closure, 2026-08-13, R2a). Wired via vite.config.ts's resolve.alias,
 * active only when EDITION === 'free'.
 *
 * REVISED (owner directive, mid-task 2026-08-13): `hasEditionMismatch()` is
 * a real, data-driven runtime state — genuinely reachable and useful for a
 * Free user who already has a paid license on file — so this element must
 * NOT vanish. KEEP-BUT-RENAME: neutral copy, no "Pro"/"download" wording,
 * pointing to Settings (where the full sanctioned messaging already lives
 * in EditionsAiInfo.tsx) instead of duplicating a download CTA here.
 */
export const EditionMismatchDownloadCta: React.FC = () => {
  if (!hasEditionMismatch()) return null;
  return (
    <>
      {" "}
      This site already has an active license on file — check Settings for
      details.
    </>
  );
};
