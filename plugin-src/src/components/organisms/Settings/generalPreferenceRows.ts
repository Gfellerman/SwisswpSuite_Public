import type { SwissSettings } from "../../../hooks/useSettings";

/** One switch in Settings > General > General Preferences. */
export interface GeneralPreferenceRow {
  /** Settings field this switch reads and writes. */
  field: keyof SwissSettings;
  /** Visible label. */
  label: string;
  /** Visible one-line description under the label. */
  desc: string;
  /** Value shown while the field is absent from the settings payload. */
  fallback: boolean;
}

/** The General Preferences switches, in render order. */
export const generalPreferenceRows: GeneralPreferenceRow[] = [
  {
    field: "emailNotifications",
    label: "Email Notifications",
    desc: "Receive security digests and backup reports",
    fallback: false,
  },
  {
    field: "pageviewTrackingEnabled",
    label: "Dashboard Traffic Counter",
    desc: "Counts pageviews per day and page type to power the Dashboard traffic chart. Runs entirely on your server: no IP addresses, cookies, or personal data are collected or transmitted. Off by default.",
    fallback: false,
  },
];
