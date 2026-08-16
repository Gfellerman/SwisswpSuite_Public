import React from "react";
import { PRO_DOWNLOAD_URL, hasEditionMismatch } from "../../../lib/edition";

/**
 * EditionMismatchDownloadCta
 * -----------------------------------------------------------------------------
 * WP.org compliance (2026-08-13, v2.9.33.18 census closure, R2a): extracted
 * from ScanResultPanel.tsx's BulkAiConfirmModal Free-edition branch. The
 * "you already own SwissSuite AI Pro — download & install Pro" CTA only
 * ever shows when `hasEditionMismatch()` is true (a Free install with a
 * paid-tier license key already on file) — a real, reachable Free runtime
 * state — but per this project's string-presence doctrine it must not
 * compile into the Free bundle. The equivalent notice already exists in the
 * WP.org-sanctioned Settings > Editions & AI panel ("Our records show a
 * paid license already associated with this site." —
 * EditionsAiInfo.tsx, zone-A), so removing this duplicate from the scan
 * modal is not a net information loss for the affected user.
 */
export const EditionMismatchDownloadCta: React.FC = () => {
  if (!hasEditionMismatch()) return null;
  return (
    <>
      {" "}
      You already own SwissSuite AI Pro —{" "}
      <a
        href={PRO_DOWNLOAD_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-bold underline"
      >
        download &amp; install Pro
      </a>{" "}
      to use it.
    </>
  );
};
