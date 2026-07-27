/**
 * AGENT: frontend-specialist
 * Skills: react-patterns, ui-ux-pro-max
 * Date: 2026-04-11
 *
 * DESIGN RULE: No "Save Settings" buttons (CLAUDE.md).
 * - Toggles and server profile cards auto-save on change via AJAX.
 * - alertEmail saves on blur (debounced text field).
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "../../ui/Card";
import { SwissSettings } from "../../../hooks/useSettings";
import { toast } from "sonner";
import { Settings, Zap, Server, Mail, Loader2 } from "lucide-react";

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
  return (
    <div className="border-border dark:border-border flex items-center justify-between border-b py-3 last:border-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs text-neutral-700">{desc}</p>
      </div>
      <div
        role="switch"
        aria-checked={checked}
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

const SERVER_PROFILES = [
  {
    id: "auto",
    label: "Auto-Detect (Recommended)",
    desc: "Automatically selects the best strategy based on available resources.",
  },
  {
    id: "standard",
    label: "Standard Hosting",
    desc: "Optimized for shared hosts (Hostinger, Bluehost). Uses PHP chunking.",
  },
  {
    id: "vps",
    label: "VPS / Dedicated",
    desc: "Best for VPS or dedicated servers with higher resource limits and longer execution windows.",
  },
];

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
  const prevAlertEmailRef = useRef<string>("");

  useEffect(() => {
    if (settings) {
      setConfig({
        autoUpdatePlugin: settings.autoUpdatePlugin,
        emailNotifications: settings.emailNotifications,
        betaFeatures: settings.betaFeatures,
        transferStrategy: settings.transferStrategy,
        serverProfile: settings.serverProfile,
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
   */
  const handleEmailBlur = useCallback(async () => {
    if (alertEmail === prevAlertEmailRef.current) return;
    setEmailSaving(true);
    try {
      await onSave({ alertEmail });
      prevAlertEmailRef.current = alertEmail;
      toast.success("Alert email saved");
    } catch {
      toast.error("Failed to save alert email");
      setAlertEmail(prevAlertEmailRef.current);
    } finally {
      setEmailSaving(false);
    }
  }, [alertEmail, onSave]);

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
          checked={config.emailNotifications ?? true}
          onChange={(v) => autoSave("emailNotifications", v)}
          isSaving={isSaving}
        />
        <ToggleRow
          label="Beta Features"
          desc="Access experimental features before public release"
          checked={config.betaFeatures ?? false}
          onChange={(v) => autoSave("betaFeatures", v)}
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
              onChange={(e) => setAlertEmail(e.target.value)}
              onBlur={handleEmailBlur}
              placeholder="admin@example.com"
              disabled={emailSaving}
              className="border-border bg-background dark:text-foreground w-full rounded-lg border px-3 py-2 text-sm text-neutral-900 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              aria-describedby="alertEmail-desc"
            />
            {emailSaving && (
              <Loader2
                className="absolute top-1/2 right-3 -translate-y-1/2 animate-spin text-blue-500"
                size={14}
                aria-hidden="true"
              />
            )}
          </div>
          <p id="alertEmail-desc" className="mt-1 text-xs text-neutral-700">
            Email address for security alerts and diagnostic notifications.
            Saved automatically when you leave the field.
          </p>
        </div>
      </Card>

      {/* Server Profile Card */}
      <Card className="space-y-4 p-6">
        <div className="border-border dark:border-border mb-2 flex items-center gap-2 border-b pb-3">
          <Server className="h-4 w-4 text-neutral-700" />
          <h3 className="text-base font-semibold">Server Profile</h3>
        </div>
        <p className="text-sm text-neutral-700">
          Define your hosting environment to optimize Backup &amp; Migration
          performance.
        </p>
        <div className="grid grid-cols-1 gap-3">
          {SERVER_PROFILES.map((profile) => {
            const isActive = (config.serverProfile || "auto") === profile.id;
            return (
              <div
                key={profile.id}
                role="radio"
                aria-checked={isActive}
                tabIndex={0}
                onClick={() => autoSave("serverProfile", profile.id)}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") &&
                  autoSave("serverProfile", profile.id)
                }
                className={`cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 ${
                  isActive
                    ? "border-blue-500 bg-blue-50/20"
                    : "border-border dark:border-border hover:border-blue-200 dark:hover:border-blue-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  {isActive && (
                    <Zap className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                  )}
                  <p className="dark:text-foreground text-sm font-semibold text-neutral-900">
                    {profile.label}
                  </p>
                </div>
                <p className="mt-1 ml-0 text-xs text-neutral-700">
                  {profile.desc}
                </p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
