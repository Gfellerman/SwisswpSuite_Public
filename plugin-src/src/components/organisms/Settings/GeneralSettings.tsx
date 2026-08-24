/**
 * AGENT: frontend-specialist
 * Skills: react-patterns, ui-ux-pro-max
 * Date: 2026-04-11
 *
 * DESIGN RULE: No "Save Settings" buttons (CLAUDE.md).
 * - Toggles and server profile cards auto-save on change via AJAX.
 * - alertEmail saves on blur (debounced text field).
 *
 * ARS Round D (D-K-4, WP.org R4 F-11, 2026-08-2x): "Server Profile"
 * control REMOVED — it had zero readers anywhere in the codebase
 * (confirmed by L-B's tree-wide grep, handoff/L-B_auto-update-manifest.md)
 * and its option write handler was removed backend-side this round, so
 * the control would now silently do nothing at all. "Automatic Updates"
 * is UNCHANGED and stays — it now has a real consumer
 * (auto_update_plugin filter, same hand-off).
 *
 * FOLLOW-UP FIX (lane-K verifier D-K-4, 2026-08-24): the original D-K-4
 * pass also deleted the "Beta Features" toggle outright, on the premise
 * that its write gate (api-settings.php save_settings(),
 * class_exists('SwissWPSuite_Api_Sync')) never fires in Free. That is
 * true, but `swisswpsuite_beta_features` is a real, actively-consumed
 * PRO option — BackupsPage.tsx reads settings.betaFeatures to gate its
 * Sync/Migration sections, and this was its ONLY UI writer anywhere in
 * the codebase. Outright deletion broke Pro (no way left to ever enable
 * beta features). RESTORED below via BetaFeaturesToggleRow.tsx, extracted
 * the same way LicenseTierBadge.tsx was (D-K-3) so it can be aliased to a
 * null-rendering stub in the Free build instead of just runtime-gated —
 * this file is the always-present Settings > General shell (never
 * aliasable), so a plain `isProEditionBuild && <ToggleRow .../>` would
 * still compile the "Beta Features" string into the Free bundle even
 * though it never renders there. See BetaFeaturesToggleRow.tsx's own
 * docblock for the full rationale.
 */

import { useState, useEffect, useRef, useCallback, useId } from "react";
import { Card } from "../../ui/Card";
import { SwissSettings } from "../../../hooks/useSettings";
import { ApiError } from "../../../services/api";
import { toast } from "sonner";
import { Settings, Mail, Loader2 } from "lucide-react";
import { isProEdition } from "../../../lib/edition";
import { BetaFeaturesToggleRow } from "./BetaFeaturesToggleRow";

/**
 * SET-04 FIX: client-side pre-flight format check for the Alert Email field.
 * Mirrors the server's is_email() gate (class-swisswpsuite-api-settings.php
 * save_settings()) closely enough to catch the common typo/garbage-input case
 * before a network round-trip — the server remains the source of truth (a
 * syntactically valid-but-nonexistent domain like "nicolaiapp.comx" will pass
 * both this check and PHP's is_email(), since neither performs DNS/mailbox
 * verification; that class of error is not detectable from format alone).
 */
const EMAIL_FORMAT_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmailFormat(value: string): boolean {
  return EMAIL_FORMAT_RE.test(value.trim());
}

interface GeneralSettingsProps {
  settings: SwissSettings;
  onSave: (settings: Partial<SwissSettings>) => Promise<any>;
  isSaving: boolean;
}

type ToggleRowProps = {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  isSaving?: boolean;
};

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
  isSaving,
}: ToggleRowProps) {
  // WCAG 4.1.2: role="switch" is a plain div, not a native "labelable"
  // element — wrapping it in a <label> (or leaving it as a sibling of the
  // visible text, as before) does NOT give it a programmatic name. Wire the
  // existing visible label/description via aria-labelledby/aria-describedby
  // instead of duplicating the string into aria-label (APG switch pattern).
  const labelId = useId();
  const descId = useId();
  return (
    <div className="border-border dark:border-border flex items-center justify-between border-b py-3 last:border-0">
      <div>
        <p id={labelId} className="text-sm font-medium">
          {label}
        </p>
        <p id={descId} className="mt-0.5 text-xs text-neutral-700">
          {desc}
        </p>
      </div>
      <div
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={descId}
        aria-busy={isSaving}
        tabIndex={0}
        className={`ml-4 h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-300 ${
          isSaving ? "pointer-events-none opacity-60" : ""
        } ${checked ? "bg-green-500" : "bg-red-500"}`}
        onClick={() => !isSaving && onChange(!checked)}
        onKeyDown={(e) =>
          !isSaving &&
          (e.key === "Enter" || e.key === " ") &&
          onChange(!checked)
        }
      >
        <div
          className="h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300"
          style={{
            transform: checked ? "translateX(1.25rem)" : "translateX(0)",
          }}
        />
      </div>
    </div>
  );
}

export function GeneralSettings({
  settings,
  onSave,
  isSaving,
}: GeneralSettingsProps) {
  // ARS Round D (D-K-4 follow-up, lane-K verifier, 2026-08-24): Beta
  // Features gates Sync/Migration (BackupsPage.tsx), both fully Pro-only
  // — see BetaFeaturesToggleRow.tsx's docblock. Redundant with the
  // build-time alias (which already renders null in Free) the same way
  // DashboardLayout.tsx's `isProEditionBuild && <LicenseTierBadge .../>`
  // is redundant with its own stub — belt-and-suspenders, matches this
  // codebase's established convention for extracted/aliased controls.
  const isProEditionBuild = isProEdition();
  const [config, setConfig] = useState<Partial<SwissSettings>>({});
  // C-03 FIX: Initialize from adminEmail to match backend default (get_option('admin_email')).
  const [alertEmail, setAlertEmail] = useState<string>(
    (window as any).swisswpsuiteData?.adminEmail ?? ""
  );
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const prevAlertEmailRef = useRef<string>("");
  const emailErrorId = useId();

  useEffect(() => {
    if (settings) {
      setConfig({
        autoUpdatePlugin: settings.autoUpdatePlugin,
        emailNotifications: settings.emailNotifications,
        betaFeatures: settings.betaFeatures,
        transferStrategy: settings.transferStrategy,
        pageviewTrackingEnabled: settings.pageviewTrackingEnabled,
      });
      const initialEmail = settings.alertEmail ?? "";
      setAlertEmail(initialEmail);
      prevAlertEmailRef.current = initialEmail;
    }
  }, [settings]);

  /**
   * Auto-save a single field immediately (used by toggles and profile cards).
   */
  const autoSave = useCallback(
    async (
      field: keyof SwissSettings,
      value: SwissSettings[keyof SwissSettings]
    ) => {
      setConfig((prev) => ({ ...prev, [field]: value }));
      try {
        await onSave({ [field]: value });
        toast.success("Setting saved");
      } catch {
        toast.error("Failed to save setting");
        // Revert local state on failure
        setConfig((prev) => ({ ...prev, [field]: settings[field] }));
      }
    },
    [onSave, settings]
  );

  /**
   * Save alertEmail on blur — only if the value actually changed.
   * SET-04 FIX: validates format client-side before saving (an empty value is
   * valid — it clears the alert email, matching the server's delete_option
   * branch), and surfaces the server's actual rejection message on failure
   * instead of a generic string (the server's {success,message} shape is
   * read via ApiError.message — see api-settings.php save_settings()).
   */
  const handleEmailBlur = useCallback(async () => {
    const trimmed = alertEmail.trim();
    if (trimmed !== "" && !isValidEmailFormat(trimmed)) {
      setEmailError("Enter a valid email address, e.g. admin@example.com");
      return;
    }
    setEmailError(null);
    if (alertEmail === prevAlertEmailRef.current) return;
    setEmailSaving(true);
    try {
      await onSave({ alertEmail });
      prevAlertEmailRef.current = alertEmail;
      toast.success("Alert email saved");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to save alert email";
      toast.error(message);
      setEmailError(message);
      setAlertEmail(prevAlertEmailRef.current);
    } finally {
      setEmailSaving(false);
    }
  }, [alertEmail, onSave]);

  const handleEmailChange = useCallback(
    (value: string) => {
      setAlertEmail(value);
      if (emailError) setEmailError(null);
    },
    [emailError]
  );

  return (
    <div className="max-w-3xl space-y-6">
      {/* Preferences Card */}
      <Card className="space-y-2 p-6">
        <div className="border-border dark:border-border mb-4 flex items-center gap-2 border-b pb-3">
          <Settings className="h-4 w-4 text-neutral-700" />
          <h3 className="text-base font-semibold">General Preferences</h3>
        </div>
        <ToggleRow
          label="Automatic Updates"
          desc="Keep the plugin updated automatically"
          checked={config.autoUpdatePlugin ?? true}
          onChange={(v) => autoSave("autoUpdatePlugin", v)}
          isSaving={isSaving}
        />
        <ToggleRow
          label="Email Notifications"
          desc="Receive security digests and backup reports"
          checked={config.emailNotifications ?? false}
          onChange={(v) => autoSave("emailNotifications", v)}
          isSaving={isSaving}
        />
        {isProEditionBuild && (
          <BetaFeaturesToggleRow
            checked={config.betaFeatures ?? false}
            onChange={(v) => autoSave("betaFeatures", v)}
            isSaving={isSaving}
          />
        )}
        <ToggleRow
          label="Dashboard Traffic Counter"
          desc="Counts pageviews per day and page type to power the Dashboard traffic chart. Runs entirely on your server: no IP addresses, cookies, or personal data are collected or transmitted. Off by default."
          checked={config.pageviewTrackingEnabled ?? false}
          onChange={(v) => autoSave("pageviewTrackingEnabled", v)}
          isSaving={isSaving}
        />
      </Card>

      {/* Alert Email Card */}
      <Card className="space-y-4 p-6">
        <div className="border-border dark:border-border mb-2 flex items-center gap-2 border-b pb-3">
          <Mail className="h-4 w-4 text-neutral-700" />
          <h3 className="text-base font-semibold">Notifications</h3>
        </div>
        <div>
          <label
            htmlFor="alertEmail"
            className="dark:text-foreground mb-1 block text-sm font-medium text-neutral-900"
          >
            Alert Email
          </label>
          <div className="relative">
            <input
              id="alertEmail"
              type="email"
              value={alertEmail}
              onChange={(e) => handleEmailChange(e.target.value)}
              onBlur={handleEmailBlur}
              placeholder="admin@example.com"
              disabled={emailSaving}
              className={`border-border bg-background dark:text-foreground w-full rounded-lg border px-3 py-2 text-sm text-neutral-900 focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                emailError
                  ? "border-red-500 focus:ring-red-500"
                  : "focus:ring-blue-500"
              }`}
              aria-invalid={emailError ? true : undefined}
              aria-describedby={
                emailError
                  ? `${emailErrorId} alertEmail-desc`
                  : "alertEmail-desc"
              }
            />
            {emailSaving && (
              <Loader2
                className="absolute top-1/2 right-3 -translate-y-1/2 animate-spin text-blue-500"
                size={14}
                aria-hidden="true"
              />
            )}
          </div>
          {emailError && (
            <p
              id={emailErrorId}
              role="alert"
              className="mt-1 text-xs text-red-600"
            >
              {emailError}
            </p>
          )}
          <p id="alertEmail-desc" className="mt-1 text-xs text-neutral-700">
            Email address for security alerts and diagnostic notifications.
            Saved automatically when you leave the field.
          </p>
        </div>
      </Card>
    </div>
  );
}
