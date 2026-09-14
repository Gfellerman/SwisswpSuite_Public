/**
 * GeneralSettings — Settings > General.
 *
 * Every control here saves on change (one-click AJAX); there is no Save
 * button. The General Preferences switches come from
 * generalPreferenceRows.ts.
 */

import { useState, useEffect, useRef, useCallback, useId } from "react";
import { Card } from "../../ui/Card";
import { SwissSettings } from "../../../hooks/useSettings";
import { ApiError } from "../../../services/api";
import { toast } from "../../../lib/toast";
import { Settings, Mail, Loader2 } from "lucide-react";
import { generalPreferenceRows } from "./generalPreferenceRows";
import { AiProductNote } from "./aiProductNote";

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
        emailNotifications: settings.emailNotifications,
        pageviewTrackingEnabled: settings.pageviewTrackingEnabled,
        alertDigestFrequency: settings.alertDigestFrequency,
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
        {generalPreferenceRows.map((row) => (
          <ToggleRow
            key={row.field as string}
            label={row.label}
            desc={row.desc}
            checked={(config[row.field] as boolean | undefined) ?? row.fallback}
            onChange={(v) => autoSave(row.field, v)}
            isSaving={isSaving}
          />
        ))}
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

        {/* DIAG-EMAIL E-5 (VALIDATOR_DIAG_EMAIL.md §4 D6): cadence for the
            ERROR/WARNING alert digest. Saves immediately on change — no
            Save button. Server default is 'daily' (owner gate
            G2), mirrored here so the control never renders blank before
            the settings response loads. */}
        <div>
          <label
            htmlFor="alertDigestFrequency"
            className="dark:text-foreground mb-1 block text-sm font-medium text-neutral-900"
          >
            Alert Digest Frequency
          </label>
          <select
            id="alertDigestFrequency"
            value={config.alertDigestFrequency ?? "daily"}
            onChange={(e) =>
              autoSave(
                "alertDigestFrequency",
                e.target.value as SwissSettings["alertDigestFrequency"]
              )
            }
            disabled={isSaving}
            className="border-border bg-background dark:text-foreground w-full rounded-lg border px-3 py-2 text-sm text-neutral-900 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="off">Off</option>
            <option value="daily">Once a day</option>
            <option value="twicedaily">Twice a day</option>
          </select>
          <p
            id="alertDigestFrequency-desc"
            className="mt-1 text-xs text-neutral-700"
          >
            Critical alerts are sent immediately when alert e-mails are switched
            on (at most 5 per day). Everything else is bundled into this summary
            — turning the summary off also discards any events still waiting to
            be summarised.
          </p>
        </div>
      </Card>

      <AiProductNote />
    </div>
  );
}
