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
    desc: "E-mails you right away about critical problems and sends a digest of other warnings. A failed backup or a failed restore is e-mailed even when this switch is off. The daily scan report has its own switch on the Security page.",
    fallback: false,
  },
  {
    field: "pageviewTrackingEnabled",
    label: "Dashboard Traffic Counter",
    desc: "Counts pageviews per day and page type to power the Dashboard traffic chart. Runs entirely on your server: no IP addresses, cookies, or personal data are collected or transmitted. Off by default.",
    fallback: false,
  },
];
