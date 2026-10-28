/**
 * Copy for the capability note: one short factual sentence that says what a
 * screen does not do by itself, followed by one link to the Settings screen's
 * General tab, which hosts the plugin's only product pointer.
 *
 * Every string a capability note shows lives here, so the wording is reviewed
 * in one place. The sentences describe a mechanism; they never name a build,
 * a price or a deadline, and they carry no urgency.
 */

/** Same-tab hash route; SettingsPage reads `?tab=` and "general" hosts the product pointer. */
export const SETTINGS_PRODUCT_HREF = "#/settings?tab=general";

/** Link text; it names its destination so it reads correctly out of context. */
export const SETTINGS_LINK_TEXT = "See the options in Settings";

/** One sentence per placement. */
export const CAPABILITY_NOTES = {
  /** Firewall summary on the Security dashboard. */
  waf: "A firewall that also inspects cookies, form submissions, uploads and request headers is available.",
  /** Server rules panel on the hardening screen. */
  serverRules:
    "Rules that are added to the .htaccess file for you are available.",
} as const;
