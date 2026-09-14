/**
 * AiProductNote — the Settings > General screen's one permitted pointer to
 * the company's separate paid product (WP.org Guideline 11 permits one
 * such pointer, used sparingly on the settings page, not a destination
 * in the settings navigation).
 *
 * This plugin runs entirely on the site's own server. It needs no key, no
 * account and no call to any of our systems to do everything it does. The
 * AI-assisted analysis and writing tools are a separate paid product; this
 * note is the single place in the plugin that says so, and it says it as
 * one sentence and one link on the plugin's own settings screen.
 *
 * Keep it that way. No card, no heading, no button, no icon, no feature
 * comparison, no call-to-action pair, no branch on any runtime signal — the
 * text below is the same for every install.
 */
import React from "react";

/** Product page for the paid AI tools. */
export const PRODUCT_PAGE_URL = "https://swisswpsecure.com/products/";

export function AiProductNote() {
  return (
    <p className="text-xs text-neutral-600 dark:text-neutral-400">
      AI-assisted security analysis and content tools are a separate product.
      Details and pricing are on the product page at{" "}
      <a
        href={PRODUCT_PAGE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-indigo-600! underline hover:text-indigo-800! dark:text-indigo-400! dark:hover:text-indigo-300!"
      >
        swisswpsecure.com
      </a>
      .
    </p>
  );
}
