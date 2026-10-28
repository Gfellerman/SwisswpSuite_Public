/**
 * The SEO Health Check's advisory text and the controls it offers.
 *
 * SeoManager.tsx owns the Health Check layout; the wording that describes
 * what can be done about a finding, and any control that acts on one, come
 * from here so that the report never points at something that is not on
 * screen.
 */

import type React from "react";
import type { ContentType, SeoScanResult } from "../../../types";

// ── Group wording ────────────────────────────────────────────────────────────

/** Parenthetical after a category's thin-content count. */
export const SEO_THIN_COUNT_NOTE = "too little page text to describe";

/** Heading for the group whose page text is too thin to describe. */
export const SEO_THIN_CONTENT_HEADING = "Thin Content";

/** Note under the thin-content heading. */
export const SEO_THIN_CONTENT_NOTE =
  "These pages have a short description and very little page text. The Health Check reads descriptions from Yoast SEO or Rank Math; lengthen the description there, then run the Health Check again.";

/** Heading for the group whose descriptions are shorter than the target. */
export const SEO_SHORT_DESCRIPTION_HEADING = "Description Too Short";

/** Note under the short-description heading. */
export const SEO_SHORT_DESCRIPTION_NOTE =
  "These items have a description, or for images alt text, shorter than the target.";

// ── "What To Do Next" ────────────────────────────────────────────────────────

/** The Health Check's closing advice for the result on screen. */
export function buildSeoNextStep(scanResult: SeoScanResult): React.ReactNode {
  const nothingToDo =
    scanResult.non_compliant_items.length === 0 &&
    (scanResult.details?.post?.missing ?? 0) === 0 &&
    (scanResult.details?.page?.missing ?? 0) === 0 &&
    (scanResult.details?.image?.missing ?? 0) === 0;

  if (nothingToDo) {
    return "Everything looks great — no SEO issues found.";
  }

  const shortOrThin = scanResult.non_compliant_items.filter(
    (i) => i.reason === "below_threshold" || i.reason === "short_content"
  ).length;
  const missing = scanResult.non_compliant_items.filter(
    (i) => i.reason === "missing"
  ).length;

  const parts: string[] = [];
  if (missing > 0) {
    parts.push(
      `At least ${missing} item${missing === 1 ? " has" : "s have"} no description or image alt text. Descriptions are read from Yoast SEO or Rank Math, and alt text from the Media Library; add them there, then run the Health Check again.`
    );
  }
  if (shortOrThin > 0) {
    parts.push(
      `At least ${shortOrThin} item${shortOrThin === 1 ? " has" : "s have"} a description or image alt text that is shorter than the target.`
    );
  }
  return parts.join(" ");
}

// ── Controls ─────────────────────────────────────────────────────────────────

/** What a per-category Health Check control is given. */
export interface SeoCategoryActionProps {
  /** Content type the category covers. */
  targetType: ContentType;
  /** How many items in the category need attention. */
  actionableCount: number;
  /** The category's visible label. */
  categoryLabel: string;
  /** Called once the control has handed its work off. */
  onQueued: () => void;
}

/** Controls offered inside a Health Check category, in render order. */
export const seoCategoryActions: React.FC<SeoCategoryActionProps>[] = [];

/** What a Health Check control that acts on a whole group is given. */
export interface SeoBulkActionProps {
  /** `inline` sits next to a group heading; `primary` closes the report. */
  variant: "inline" | "primary";
  /** How many items the control would act on, when known. */
  count?: number;
  /** Called once the control has handed its work off. */
  onQueued: () => void;
}

/** Controls offered for a whole Health Check group, in render order. */
export const seoBulkActions: React.FC<SeoBulkActionProps>[] = [];

/** Panels the SEO page shows under its header, in render order. */
export const seoPagePanels: React.FC[] = [];
