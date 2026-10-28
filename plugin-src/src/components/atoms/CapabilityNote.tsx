import React from "react";
import {
  SETTINGS_LINK_TEXT,
  SETTINGS_PRODUCT_HREF,
} from "../../lib/capabilityNoteCopy";

interface CapabilityNoteProps {
  /** One sentence from CAPABILITY_NOTES. */
  text: string;
}

/**
 * CapabilityNote — one factual sentence and one same-tab link to the
 * Settings screen's General tab.
 *
 * The note is inline text. It has no dismiss control, no live region, no
 * timer and no icon, so it never competes with the content it sits under.
 */
export const CapabilityNote: React.FC<CapabilityNoteProps> = ({ text }) => (
  <p className="text-xs text-neutral-600 dark:text-neutral-400">
    {text}{" "}
    <a
      href={SETTINGS_PRODUCT_HREF}
      className="text-indigo-600! underline hover:text-indigo-800! dark:text-indigo-400! dark:hover:text-indigo-300!"
    >
      {SETTINGS_LINK_TEXT}
    </a>
  </p>
);
