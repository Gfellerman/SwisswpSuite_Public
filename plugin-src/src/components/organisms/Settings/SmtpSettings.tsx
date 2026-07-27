/**
 * Authored by: Frontend Specialist (inline, A2 execution)
 * Skills: react-patterns, ui-ux-pro-max
 * Date: 2026-04-20
 *
 * Change F (v2.9.27.84): Built-in SMTP settings panel.
 *
 * Design rules:
 *  - Password field is write-only. If the server says `hasPassword: true`,
 *    we prefill the input with SMTP_MASKED_PLACEHOLDER (`••••••••`) and clear
 *    it on first focus to force explicit re-entry. We never transmit the
 *    placeholder back to the server.
 *  - Provider preset dropdown auto-fills host/port/encryption. Selecting
 *    "Custom" leaves those fields editable.
 *  - Save is an explicit AJAX action (not auto-save on toggle) because SMTP
 *    creds are easy to half-type — saving on blur would be dangerous.
 *  - "Send Test Email" is a separate action that uses the *currently saved*
 *    config; tell the user to Save first if they have unsaved changes.
 */

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { wpApi } from "../../../services/api";
import { SMTP_TTL } from "../../../lib/cacheTtl";
import { toast } from "sonner";
import {
  Mail,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Clock,
  ShieldAlert,
} from "lucide-react";
import {
  SmtpSettings as SmtpSettingsData,
  SmtpSettingsSavePayload,
  SmtpSettingsSaveResponse,
  SmtpTestResponse,
  SmtpTestDiagnostics,
  SmtpTestRootCause,
  SmtpEnvironmentResponse,
  SendDailyReportNowResponse,
} from "../../../types";

const MASKED_PLACEHOLDER = "••••••••";

type PresetId =
  | "hostinger"
  | "siteground"
  | "bluehost"
  | "godaddy"
  | "dreamhost"
  | "ionos"
  | "ovh"
  | "namecheap"
  | "gmail"
  | "outlook"
  | "brevo"
  | "sendgrid"
  | "custom";

interface PresetSpec {
  id: PresetId;
  label: string;
  host?: string;
  port?: number;
  encryption?: "tls" | "ssl" | "none";
  editable?: boolean;
}

const PRESETS: PresetSpec[] = [
  {
    id: "hostinger",
    label: "Hostinger",
    host: "smtp.hostinger.com",
    port: 587,
    encryption: "tls",
  },
  {
    id: "siteground",
    label: "SiteGround",
    host: "mail.yourdomain.com",
    port: 587,
    encryption: "tls",
  },
  {
    id: "bluehost",
    label: "Bluehost",
    host: "mail.yourdomain.com",
    port: 587,
    encryption: "tls",
  },
  {
    id: "godaddy",
    label: "GoDaddy",
    host: "smtpout.secureserver.net",
    port: 465,
    encryption: "ssl",
  },
  {
    id: "dreamhost",
    label: "DreamHost",
    host: "smtp.dreamhost.com",
    port: 465,
    encryption: "ssl",
  },
  {
    id: "ionos",
    label: "IONOS",
    host: "smtp.ionos.com",
    port: 587,
    encryption: "tls",
  },
  {
    id: "ovh",
    label: "OVH",
    host: "ssl0.ovh.net",
    port: 465,
    encryption: "ssl",
  },
  {
    id: "namecheap",
    label: "Namecheap",
    host: "mail.privateemail.com",
    port: 587,
    encryption: "tls",
  },
  {
    id: "gmail",
    label: "Gmail / Workspace",
    host: "smtp.gmail.com",
    port: 587,
    encryption: "tls",
  },
  {
    id: "outlook",
    label: "Outlook / Microsoft 365",
    host: "smtp.office365.com",
    port: 587,
    encryption: "tls",
  },
  {
    id: "brevo",
    label: "Brevo (Sendinblue)",
    host: "smtp-relay.brevo.com",
    port: 587,
    encryption: "tls",
  },
  {
    id: "sendgrid",
    label: "SendGrid",
    host: "smtp.sendgrid.net",
    port: 587,
    encryption: "tls",
  },
  { id: "custom", label: "Custom / Other", editable: true },
];

type FormState = {
  preset: PresetId;
  host: string;
  port: number;
  encryption: "tls" | "ssl" | "none";
  username: string;
  password: string; // form value — may be MASKED_PLACEHOLDER
  fromEmail: string;
  fromName: string;
  hasPassword: boolean; // reflects server state
  passwordTouched: boolean; // has the user typed anything new?
};

// A compact snapshot of the last-saved server state. We compare the current
// form against this to compute `isDirty` for the unsaved-changes banner. We
// exclude password entirely (the field is write-only — we know whether a
// password is saved via `hasPassword` but can't tell if the user changed it
// except via `passwordTouched`, which we track separately).
type SavedBaseline = {
  host: string;
  port: number;
  encryption: "tls" | "ssl" | "none";
  username: string;
  fromEmail: string;
  fromName: string;
};

const emptyForm: FormState = {
  preset: "custom",
  host: "",
  port: 587,
  encryption: "tls",
  username: "",
  password: "",
  fromEmail: "",
  fromName: "",
  hasPassword: false,
  passwordTouched: false,
};

const emptyBaseline: SavedBaseline = {
  host: "",
  port: 587,
  encryption: "tls",
  username: "",
  fromEmail: "",
  fromName: "",
};

function matchPreset(host: string, port: number, enc: string): PresetId {
  for (const p of PRESETS) {
    if (p.id === "custom") continue;
    if (p.host === host && p.port === port && p.encryption === enc) return p.id;
  }
  return "custom";
}

// Format a unix ts as a "X minutes ago" / "in X hours" relative string, using
// the server-provided "now" to avoid client clock drift. For Scenario 7's
// wp-cron status indicator.
function formatRelativeTime(targetTs: number, serverNowTs: number): string {
  if (!targetTs) return "never";
  const delta = targetTs - serverNowTs;
  const abs = Math.abs(delta);
  const future = delta > 0;
  if (abs < 60) return future ? "in less than a minute" : "just now";
  if (abs < 3600) {
    const m = Math.round(abs / 60);
    return future ? `in ${m} min` : `${m} min ago`;
  }
  if (abs < 86400) {
    const h = Math.round(abs / 3600);
    return future ? `in ${h} h` : `${h} h ago`;
  }
  const d = Math.round(abs / 86400);
  return future ? `in ${d} d` : `${d} d ago`;
}

export function SmtpSettings() {
  const [form, setForm] = useState<FormState>(emptyForm);
  // Last-saved baseline (from server) — used to compute isDirty for the
  // unsaved-changes banner so users cannot miss that they still need to Save.
  const [baseline, setBaseline] = useState<SavedBaseline>(emptyBaseline);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    msg: string;
    rootCause?: SmtpTestRootCause;
    diagnostics?: SmtpTestDiagnostics;
  } | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  // Cross-hosting hardening (v2.9.27.90): environment probe data — drives
  // banners for competing SMTP plugins, PHP mail() availability, wp-cron
  // reliability and encryption strength. null while loading.
  const [env, setEnv] = useState<SmtpEnvironmentResponse | null>(null);
  const [isSendingReport, setIsSendingReport] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const mountedRef = useRef(true);

  // Dirty detection: any non-password field differs from last-saved baseline,
  // OR the user has typed a new password value. Using useMemo so we don't
  // recompute on every render unrelated to form/baseline.
  const isDirty = useMemo(() => {
    if (form.passwordTouched && form.password !== "") return true;
    return (
      form.host !== baseline.host ||
      form.port !== baseline.port ||
      form.encryption !== baseline.encryption ||
      form.username !== baseline.username ||
      form.fromEmail !== baseline.fromEmail ||
      form.fromName !== baseline.fromName
    );
  }, [form, baseline]);

  // Has the user ever saved an SMTP host? If not, the Test button is disabled
  // because wp_mail() would fall back to PHP mail() (blocked on most shared
  // hosts) and silently return success, misleading the user.
  const hostIsSaved = baseline.host.trim() !== "";

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // v2.9.30.117: /smtp/settings — cached for SMTP_TTL (120 s).
  // Static config rarely changes; re-saves go through the explicit Save button
  // which triggers a form reset, so stale cache is not a concern here.
  const { data: smtpSettingsData, isLoading: smtpSettingsLoading } =
    useQuery<SmtpSettingsData>({
      queryKey: ["smtp-settings"],
      queryFn: () => wpApi<SmtpSettingsData>("/smtp/settings"),
      staleTime: SMTP_TTL,
    });

  useEffect(() => {
    const data = smtpSettingsData;
    if (!data) return;
    const preset = matchPreset(data.host, data.port, data.encryption);
    const enc = data.encryption as "tls" | "ssl" | "none";
    setForm({
      preset,
      host: data.host,
      port: data.port,
      encryption: enc,
      username: data.username,
      password: data.hasPassword ? MASKED_PLACEHOLDER : "",
      fromEmail: data.fromEmail,
      fromName: data.fromName,
      hasPassword: data.hasPassword,
      passwordTouched: false,
    });
    setBaseline({
      host: data.host,
      port: data.port,
      encryption: enc,
      username: data.username,
      fromEmail: data.fromEmail,
      fromName: data.fromName,
    });
  }, [smtpSettingsData]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!smtpSettingsLoading && !smtpSettingsData) {
      // Query settled with no data — surface error same as before
      toast.error("Failed to load SMTP settings");
      setIsLoading(false);
    } else if (!smtpSettingsLoading) {
      setIsLoading(false);
    }
  }, [smtpSettingsLoading, smtpSettingsData]);

  // v2.9.30.117: /smtp/environment — cached for SMTP_TTL (120 s).
  // The cache-bust ?_nocache param was there to defeat proxy caches, but
  // TanStack Query's own cache (client-side only) is not affected by proxies,
  // so we drop the nocache param. The Cache-Control header was belt-and-braces
  // and is also no longer needed with client-side caching.
  const { data: smtpEnvData, refetch: refetchSmtpEnv } =
    useQuery<SmtpEnvironmentResponse>({
      queryKey: ["smtp-environment"],
      queryFn: () => wpApi<SmtpEnvironmentResponse>("/smtp/environment"),
      staleTime: SMTP_TTL,
    });

  useEffect(() => {
    if (smtpEnvData && mountedRef.current) setEnv(smtpEnvData);
  }, [smtpEnvData]);

  // Kept for callers that need to force a fresh env probe after save/send-report.
  const loadEnvironment = useCallback(async () => {
    await refetchSmtpEnv();
  }, [refetchSmtpEnv]);

  const updateField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handlePresetChange = useCallback((id: PresetId) => {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setForm((prev) => ({
      ...prev,
      preset: id,
      host: preset.host ?? (id === "custom" ? prev.host : ""),
      port: preset.port ?? (id === "custom" ? prev.port : 587),
      encryption:
        preset.encryption ?? (id === "custom" ? prev.encryption : "tls"),
    }));
  }, []);

  const handlePasswordFocus = useCallback(() => {
    // If the current value is the masked placeholder, clear it on focus so
    // the user is forced to re-enter the full password (prevents "edit the
    // bullets" confusion).
    setForm((prev) => {
      if (prev.password === MASKED_PLACEHOLDER) {
        return { ...prev, password: "", passwordTouched: false };
      }
      return prev;
    });
  }, []);

  const handlePasswordBlur = useCallback(() => {
    // If the user focused-then-blurred without typing anything AND a password
    // is still saved on the server, restore the masked placeholder so the
    // field does not look empty (which would suggest "no password saved").
    setForm((prev) => {
      if (!prev.passwordTouched && prev.password === "" && prev.hasPassword) {
        return { ...prev, password: MASKED_PLACEHOLDER };
      }
      return prev;
    });
  }, []);

  const handlePasswordChange = useCallback((value: string) => {
    setForm((prev) => ({ ...prev, password: value, passwordTouched: true }));
  }, []);

  // Explicit "Change password" affordance — clears the field and focuses the
  // input so the user can type a new password without the mask-then-focus dance.
  const handleChangePassword = useCallback(() => {
    setForm((prev) => ({ ...prev, password: "", passwordTouched: false }));
    // Focus in a microtask so React has flushed the value change first.
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 0);
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setTestResult(null);
    try {
      const payload: SmtpSettingsSavePayload = {
        host: form.host.trim(),
        port: form.port,
        encryption: form.encryption,
        username: form.username.trim(),
        fromEmail: form.fromEmail.trim(),
        fromName: form.fromName.trim(),
      };
      // Password send logic: only include if the user explicitly edited the field.
      // We key on `passwordTouched` (set true on any keystroke after focus) rather than
      // comparing to MASKED_PLACEHOLDER, so that a real password that happens to equal
      // the bullet string is still sent.
      if (form.passwordTouched && form.password !== "") {
        payload.password = form.password;
      }

      const res = await wpApi<SmtpSettingsSaveResponse>("/smtp/settings", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.success) {
        toast.error(res.message ?? "Failed to save SMTP settings");
        return;
      }
      toast.success("SMTP settings saved");
      // Sync hasPassword from server response; reset touched state and mask the field again.
      setForm((prev) => ({
        ...prev,
        hasPassword: !!res.hasPassword,
        password: res.hasPassword ? MASKED_PLACEHOLDER : "",
        passwordTouched: false,
      }));
      // Update baseline to the just-saved values so isDirty drops back to false.
      setBaseline({
        host: payload.host,
        port: payload.port,
        encryption: payload.encryption,
        username: payload.username,
        fromEmail: payload.fromEmail,
        fromName: payload.fromName,
      });
      // Refresh env after save so any host-level changes (e.g. encryption
      // strength, competing plugins) are reflected in the banners.
      loadEnvironment();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save SMTP settings");
    } finally {
      if (mountedRef.current) setIsSaving(false);
    }
  }, [form, loadEnvironment]);

  const handleClearPassword = useCallback(async () => {
    if (
      !confirm(
        "Delete the saved SMTP password? Other SMTP fields will not be affected."
      )
    ) {
      return;
    }
    setIsSaving(true);
    try {
      // Re-fetch the current server state for the non-password fields so we don't
      // clobber anything the user has edited-but-not-saved in this session.
      const current = await wpApi<SmtpSettingsData>("/smtp/settings");
      const payload: SmtpSettingsSavePayload = {
        host: current.host,
        port: current.port,
        encryption: current.encryption as "tls" | "ssl" | "none",
        username: current.username,
        fromEmail: current.fromEmail,
        fromName: current.fromName,
        clearPassword: true,
      };
      const res = await wpApi<SmtpSettingsSaveResponse>("/smtp/settings", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.success) {
        toast.error(res.message ?? "Failed to clear password");
        return;
      }
      toast.success("SMTP password cleared");
      setForm((prev) => ({
        ...prev,
        hasPassword: false,
        password: "",
        passwordTouched: false,
      }));
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to clear password");
    } finally {
      if (mountedRef.current) setIsSaving(false);
    }
  }, []);

  const handleTest = useCallback(async () => {
    // Client-side guard: if the user has unsaved changes, the backend would
    // use the OLD saved config (or no config at all), which has confused users
    // into thinking Test verifies what they see in the form. Block with a
    // clear message instead of sending.
    if (isDirty) {
      const msg =
        "You have unsaved changes. Click Save SMTP Settings first — Send Test Email always uses the saved config, not what's currently in the form.";
      setTestResult({ ok: false, msg });
      toast.error(msg);
      return;
    }
    if (!hostIsSaved) {
      const msg =
        "No SMTP host is saved. Fill in the SMTP fields (host, port, username, password, From email) and click Save SMTP Settings before testing.";
      setTestResult({ ok: false, msg });
      toast.error(msg);
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setShowDiagnostics(false);
    try {
      // Scenario 8 (v2.9.27.90): explicit cache-bust on the URL plus
      // Cache-Control: no-cache on the request, so intermediary proxies
      // (LiteSpeed, Cloudflare, nginx) cannot serve a stale result from a
      // previous test run on the same origin.
      const res = await wpApi<SmtpTestResponse>(
        `/smtp/test?_nocache=${Date.now()}`,
        { method: "POST", headers: { "Cache-Control": "no-cache" } }
      );
      setTestResult({
        ok: res.success,
        msg: res.message,
        rootCause: res.rootCause,
        diagnostics: res.diagnostics,
      });
      if (res.success) toast.success("Test email sent");
      else toast.error("Test failed — see details below");
      // v2.9.27.91: if the saved SMTP password can't be decrypted (salt
      // rotation), auto-focus the "Change" button so the user is guided
      // directly to the remediation without having to hunt for it.
      if (res.rootCause === "password_decrypt_failed") {
        setTimeout(() => {
          const btn = document.getElementById("smtp-change-password-btn");
          if (btn instanceof HTMLElement) btn.focus();
        }, 0);
      }
      // Refresh environment after a test — if the test surfaced a competing
      // plugin the user may have deactivated, we want the banner to clear.
      loadEnvironment();
    } catch (err: any) {
      const msg = err?.message ?? "Network error sending test email";
      setTestResult({ ok: false, msg });
      toast.error(msg);
    } finally {
      if (mountedRef.current) setIsTesting(false);
    }
  }, [isDirty, hostIsSaved, loadEnvironment]);

  // Scenario 7: "Send Daily Report Now" — triggers the daily security report
  // email immediately, bypassing wp-cron. Lets the user verify end-to-end
  // delivery without waiting hours for a cron tick on low-traffic sites.
  const handleSendDailyReportNow = useCallback(async () => {
    setIsSendingReport(true);
    try {
      const res = await wpApi<SendDailyReportNowResponse>(
        `/reports/send-now?_nocache=${Date.now()}`,
        { method: "POST", headers: { "Cache-Control": "no-cache" } }
      );
      if (res.success) {
        toast.success(res.message || "Daily report sent");
      } else {
        toast.error(res.message || "Could not send daily report");
      }
    } catch (err: any) {
      toast.error(err?.message || "Network error sending daily report");
    } finally {
      if (mountedRef.current) setIsSendingReport(false);
    }
  }, []);

  const hostPortReadOnly = form.preset !== "custom";

  return (
    <Card className="max-w-3xl space-y-4 p-6">
      <div className="border-border dark:border-border flex items-center gap-2 border-b pb-3">
        <Mail className="h-4 w-4 text-neutral-700" aria-hidden="true" />
        <h3 className="text-base font-semibold">Email Delivery (SMTP)</h3>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-neutral-700">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading SMTP configuration…
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-neutral-700">
            Configure a custom SMTP server so WordPress emails (security alerts,
            password resets, backup reports) are delivered reliably. Leave blank
            to use the server's default mailer.
          </p>

          {/* Preset dropdown */}
          <div>
            <label
              htmlFor="smtp-preset"
              className="mb-1 block text-sm font-medium"
            >
              Provider preset
            </label>
            <select
              id="smtp-preset"
              value={form.preset}
              onChange={(e) => handlePresetChange(e.target.value as PresetId)}
              className="border-border bg-background dark:text-foreground w-full rounded-lg border px-3 py-2 text-sm text-neutral-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-neutral-700">
              Selecting a preset fills in the host, port, and encryption for
              you. Choose “Custom” to edit them manually.
            </p>
          </div>

          {/* Host + Port + Encryption */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <div className="md:col-span-4">
              <label
                htmlFor="smtp-host"
                className="mb-1 block text-sm font-medium"
              >
                SMTP host
              </label>
              <input
                id="smtp-host"
                type="text"
                value={form.host}
                readOnly={hostPortReadOnly}
                onChange={(e) => updateField("host", e.target.value)}
                placeholder="smtp.example.com"
                className={`border-border bg-background dark:text-foreground w-full rounded-lg border px-3 py-2 text-sm text-neutral-900 focus:ring-2 focus:ring-blue-500 focus:outline-none ${hostPortReadOnly ? "cursor-not-allowed opacity-70" : ""}`}
              />
            </div>
            <div>
              <label
                htmlFor="smtp-port"
                className="mb-1 block text-sm font-medium"
              >
                Port
              </label>
              <input
                id="smtp-port"
                type="number"
                min={1}
                max={65535}
                value={form.port}
                readOnly={hostPortReadOnly}
                onChange={(e) =>
                  updateField("port", Number(e.target.value) || 0)
                }
                className={`border-border bg-background dark:text-foreground w-full rounded-lg border px-3 py-2 text-sm text-neutral-900 focus:ring-2 focus:ring-blue-500 focus:outline-none ${hostPortReadOnly ? "cursor-not-allowed opacity-70" : ""}`}
              />
            </div>
            <div>
              <label
                htmlFor="smtp-encryption"
                className="mb-1 block text-sm font-medium"
              >
                Encryption
              </label>
              <select
                id="smtp-encryption"
                value={form.encryption}
                disabled={hostPortReadOnly}
                onChange={(e) =>
                  updateField(
                    "encryption",
                    e.target.value as FormState["encryption"]
                  )
                }
                className={`border-border bg-background dark:text-foreground w-full rounded-lg border px-3 py-2 text-sm text-neutral-900 focus:ring-2 focus:ring-blue-500 focus:outline-none ${hostPortReadOnly ? "cursor-not-allowed opacity-70" : ""}`}
              >
                <option value="tls">TLS</option>
                <option value="ssl">SSL</option>
                <option value="none">None</option>
              </select>
            </div>
          </div>

          {/* Username + Password */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label
                htmlFor="smtp-username"
                className="mb-1 block text-sm font-medium"
              >
                Username
              </label>
              <input
                id="smtp-username"
                type="text"
                autoComplete="off"
                value={form.username}
                onChange={(e) => updateField("username", e.target.value)}
                placeholder="user@example.com"
                className="border-border bg-background dark:text-foreground w-full rounded-lg border px-3 py-2 text-sm text-neutral-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="smtp-password"
                className="mb-1 block text-sm font-medium"
              >
                Password
              </label>
              <div className="flex gap-2">
                <input
                  id="smtp-password"
                  ref={passwordInputRef}
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onFocus={handlePasswordFocus}
                  onBlur={handlePasswordBlur}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder={
                    form.hasPassword
                      ? MASKED_PLACEHOLDER
                      : "Enter SMTP password"
                  }
                  className="border-border bg-background dark:text-foreground flex-1 rounded-lg border px-3 py-2 text-sm text-neutral-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                {form.hasPassword && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleChangePassword}
                      disabled={isSaving}
                      title="Clear the field and enter a new password"
                      id="smtp-change-password-btn"
                    >
                      Change
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClearPassword}
                      disabled={isSaving}
                      title="Delete the saved SMTP password"
                    >
                      Clear
                    </Button>
                  </>
                )}
              </div>
              <p className="mt-1 text-xs text-neutral-700">
                {form.hasPassword
                  ? 'A password is currently saved. Click "Change" to enter a new one, or "Clear" to remove it entirely.'
                  : "Leave blank if your SMTP server does not require authentication."}
              </p>
            </div>
          </div>

          {/* From Email + From Name */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label
                htmlFor="smtp-from-email"
                className="mb-1 block text-sm font-medium"
              >
                From email (sender address)
              </label>
              <input
                id="smtp-from-email"
                type="email"
                autoComplete="off"
                value={form.fromEmail}
                onChange={(e) => updateField("fromEmail", e.target.value)}
                placeholder={form.username || "noreply@yourdomain.com"}
                aria-describedby="smtp-from-email-help"
                className="border-border bg-background dark:text-foreground w-full rounded-lg border px-3 py-2 text-sm text-neutral-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <p
                id="smtp-from-email-help"
                className="mt-1 text-xs text-neutral-700"
              >
                This is only the display sender address — it does{" "}
                <strong>not</strong> need its own SMTP account. Leave blank to
                automatically use your SMTP username as the From address.
              </p>
            </div>
            <div>
              <label
                htmlFor="smtp-from-name"
                className="mb-1 block text-sm font-medium"
              >
                From name
              </label>
              <input
                id="smtp-from-name"
                type="text"
                autoComplete="off"
                value={form.fromName}
                onChange={(e) => updateField("fromName", e.target.value)}
                placeholder="Example Site"
                className="border-border bg-background dark:text-foreground w-full rounded-lg border px-3 py-2 text-sm text-neutral-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-neutral-700">
                Friendly name shown alongside the From email (e.g. "My
                Website").
              </p>
            </div>
          </div>

          {/* Provider policy notice — explains why From often must match the SMTP account. */}
          <div
            className="dark:text-foreground flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-neutral-900 dark:border-blue-900 dark:bg-blue-950/30"
            role="note"
          >
            <Info
              className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400"
              aria-hidden="true"
            />
            <div>
              <p className="mb-0.5 font-medium">
                Tip: many SMTP providers require the From address to match the
                authenticated account.
              </p>
              <p className="leading-relaxed text-neutral-700">
                Hostinger, Gmail, Microsoft 365 and most shared hosts will
                silently drop (or mark as spam) any message whose <em>From</em>{" "}
                does not match the SMTP username you authenticate with. If your
                test email sends "successfully" but never arrives, make sure the
                From email and SMTP username are the same mailbox — or leave
                From email blank to let the plugin use the username
                automatically.
              </p>
            </div>
          </div>

          {/* Environment-aware warnings (v2.9.27.90 cross-hosting hardening).
              These banners surface the 3 most common non-obvious failure modes
              that cause emails to silently vanish on user installations:
                1. A competing SMTP plugin is about to override our config.
                2. PHP mail() is disabled AND no SMTP is configured.
                3. Encryption is degraded (XOR fallback) — user should know. */}

          {/* Scenario 2 — competing SMTP plugin detection. */}
          {env && env.competing_plugins.length > 0 && (
            <div
              className="dark:text-foreground flex items-start gap-2 rounded-lg border-2 border-amber-400 bg-amber-50 p-3 text-sm text-neutral-900 dark:border-amber-700 dark:bg-amber-950/30"
              role="alert"
            >
              <ShieldAlert
                className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold">
                  Warning: {env.competing_plugins.join(", ")} is active.
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-neutral-700">
                  This plugin may override SwissSuite's SMTP configuration.
                  Either <strong>deactivate it</strong>, or configure your SMTP
                  credentials through that plugin instead of here. Running two
                  SMTP plugins in parallel is the #1 cause of "test sent but
                  never arrived" on production sites.
                </p>
              </div>
            </div>
          )}

          {/* Scenario 4 — PHP mail() disabled AND no SMTP configured. */}
          {env && !env.has_smtp_host && !env.php_mail.mail_is_usable && (
            <div
              className="dark:text-foreground flex items-start gap-2 rounded-lg border-2 border-red-400 bg-red-50 p-3 text-sm text-neutral-900 dark:border-red-700 dark:bg-red-950/30"
              role="alert"
            >
              <AlertTriangle
                className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold">
                  PHP mail() is disabled on this server.
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-neutral-700">
                  Email features (daily security reports, test emails, password
                  resets) will <strong>not work</strong> without SMTP
                  credentials. Configure the fields above and click Save SMTP
                  Settings. This is common on WP Engine, Kinsta, and some
                  hardened VPS installations.
                </p>
              </div>
            </div>
          )}

          {/* Scenario 1 — encryption strength degraded to XOR. */}
          {env && env.encryption_strength === "xor" && (
            <div
              className="dark:text-foreground flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50/60 p-3 text-xs text-neutral-900 dark:border-amber-800 dark:bg-amber-950/20"
              role="note"
            >
              <Info
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
              <div>
                <p className="font-medium">
                  Reduced encryption — your SMTP password is obfuscated, not
                  encrypted.
                </p>
                <p className="mt-0.5 leading-relaxed text-neutral-700">
                  Your server does not have the <code>sodium</code> or
                  <code> openssl</code> PHP extensions enabled, so SwissSuite is
                  using an XOR obfuscation fallback. Your password is still
                  hidden from casual inspection of the database, but for real
                  encryption please ask your hosting provider to enable
                  <code> php_sodium</code> or <code>php_openssl</code>.
                </p>
              </div>
            </div>
          )}

          {/* v2.9.27.92 (log-report Issue #6 permanent fix) — persistent SMTP
              health badge. Shown whenever the server has a recorded send
              outcome (success or failure). Green bar on OK, red on FAIL.
              Null when no send has ever been attempted — in that case we
              render nothing so the panel stays clean on fresh installs. */}
          {env && env.smtp_health && (
            <div
              className={
                "rounded-lg border p-3 text-xs " +
                (env.smtp_health.status === "ok"
                  ? "dark:text-foreground border-emerald-300 bg-emerald-50 text-neutral-900 dark:border-emerald-700 dark:bg-emerald-950/30"
                  : "dark:text-foreground border-red-300 bg-red-50 text-neutral-900 dark:border-red-700 dark:bg-red-950/30")
              }
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-2">
                {env.smtp_health.status === "ok" ? (
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                    aria-hidden="true"
                  />
                ) : (
                  <XCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400"
                    aria-hidden="true"
                  />
                )}
                <div className="flex-1">
                  <p className="mb-1 text-sm font-medium">
                    Last email send:{" "}
                    {env.smtp_health.status === "ok" ? "succeeded" : "FAILED"}
                  </p>
                  <div className="space-y-0.5">
                    <div>
                      <strong>When:</strong>{" "}
                      {formatRelativeTime(
                        env.smtp_health.timestamp,
                        env.server_time_ts
                      )}
                    </div>
                    <div>
                      <strong>Context:</strong>{" "}
                      {env.smtp_health.context === "daily_security_report"
                        ? "daily security report (automated)"
                        : env.smtp_health.context === "test_email"
                          ? "diagnostic test email"
                          : env.smtp_health.context}
                    </div>
                    {env.smtp_health.status === "fail" &&
                      env.smtp_health.reason && (
                        <div className="mt-1">
                          <strong>Reason:</strong>{" "}
                          <span className="text-red-700 dark:text-red-300">
                            {env.smtp_health.reason}
                          </span>
                        </div>
                      )}
                  </div>
                  {env.smtp_health.status === "fail" && (
                    <p className="mt-2 text-red-700 dark:text-red-300">
                      The last outgoing email did not reach its destination. Run{" "}
                      <strong>Send Test Email</strong> below to diagnose, or
                      review the SMTP settings above.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Scenario 7 — wp-cron status + "Send Daily Report Now" action. */}
          {env && (
            <div className="border-border dark:text-foreground rounded-lg border bg-neutral-50 p-3 text-xs text-neutral-900 dark:bg-neutral-900/40">
              <div className="flex items-start gap-2">
                <Clock
                  className="mt-0.5 h-4 w-4 shrink-0 text-neutral-700"
                  aria-hidden="true"
                />
                <div className="flex-1">
                  <p className="mb-1 text-sm font-medium">
                    Daily security report
                  </p>
                  <div className="space-y-0.5">
                    <div>
                      <strong>Last scan:</strong>{" "}
                      {env.wp_cron.last_scan_run_ts
                        ? formatRelativeTime(
                            env.wp_cron.last_scan_run_ts,
                            env.server_time_ts
                          )
                        : "never run yet"}
                    </div>
                    <div>
                      <strong>Next scheduled:</strong>{" "}
                      {env.wp_cron.next_daily_report_ts
                        ? formatRelativeTime(
                            env.wp_cron.next_daily_report_ts,
                            env.server_time_ts
                          )
                        : "not scheduled"}
                    </div>
                    <div>
                      <strong>Cron mode:</strong>{" "}
                      {env.wp_cron.disable_wp_cron
                        ? "external (DISABLE_WP_CRON is set — report fires on a real system cron)"
                        : env.wp_cron.alternate_wp_cron
                          ? "alternate (non-blocking request on page load)"
                          : "standard (fires on page visits — low-traffic sites may see delays)"}
                    </div>
                  </div>
                  {!env.wp_cron.disable_wp_cron &&
                    env.wp_cron.last_scan_run_ts > 0 &&
                    env.server_time_ts - env.wp_cron.last_scan_run_ts >
                      172800 && (
                      <p className="mt-1 text-amber-700 dark:text-amber-300">
                        The last scan is more than 48 hours old. Your site may
                        have too little traffic for wp-cron to fire reliably.
                        Consider setting up a real system cron, or click the
                        button below to send a report now.
                      </p>
                    )}
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSendDailyReportNow}
                      disabled={isSendingReport}
                      aria-label="Send daily security report now"
                      title="Dispatches the daily security report immediately, bypassing wp-cron. Useful for verifying delivery end-to-end."
                    >
                      {isSendingReport ? (
                        <>
                          <Loader2
                            className="mr-2 h-4 w-4 animate-spin"
                            aria-hidden="true"
                          />
                          Sending…
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                          Send Daily Report Now
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Unsaved-changes banner — always visible above the action bar when
              the form differs from the last-saved server state. This is the
              single most important cue to drive the user to the Save button. */}
          {isDirty && (
            <div
              className="dark:text-foreground flex items-start gap-2 rounded-lg border-2 border-amber-400 bg-amber-50 p-3 text-sm text-neutral-900 dark:border-amber-700 dark:bg-amber-950/30"
              role="status"
              aria-live="polite"
            >
              <AlertTriangle
                className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold">You have unsaved SMTP changes.</p>
                <p className="mt-0.5 text-xs text-neutral-700">
                  Click <strong>Save SMTP Settings</strong> below to persist
                  your changes. Until you save, nothing is applied and "Send
                  Test Email" will not use your current edits.
                </p>
              </div>
            </div>
          )}

          {/* Action bar — visually separated with a top border and larger Save button
              so it cannot be missed. Save is always the primary CTA. */}
          <div className="border-border dark:border-border mt-2 border-t pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                size="lg"
                onClick={handleSave}
                disabled={isSaving}
                aria-label="Save SMTP settings"
              >
                {isSaving ? (
                  <>
                    <Loader2
                      className="mr-2 h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    Saving…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
                    Save SMTP Settings
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handleTest}
                disabled={isTesting || isSaving || isDirty || !hostIsSaved}
                title={
                  isDirty
                    ? "Save your changes first — test always uses the saved config."
                    : !hostIsSaved
                      ? "Fill in the SMTP fields and click Save SMTP Settings before testing."
                      : "Send a diagnostic test email to the site admin address using your saved SMTP config."
                }
                aria-label="Send test email"
              >
                {isTesting ? (
                  <>
                    <Loader2
                      className="mr-2 h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                    Send Test Email
                  </>
                )}
              </Button>
              {testResult && (
                <div
                  className={`flex items-start gap-2 text-sm ${
                    testResult.ok ? "text-green-600" : "text-red-600"
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  {testResult.ok ? (
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                  ) : (
                    <XCircle
                      className="mt-0.5 h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  <span className="max-w-md leading-relaxed">
                    {testResult.msg}
                  </span>
                </div>
              )}
            </div>

            {/* Root-cause callout cards (v2.9.27.91). These appear BELOW the
                inline test result to expand on specific recoverable failure
                modes with an explicit CTA. */}
            {testResult &&
              testResult.rootCause === "password_decrypt_failed" && (
                <div
                  className="dark:text-foreground mt-3 flex items-start gap-2 rounded-lg border-2 border-amber-400 bg-amber-50 p-3 text-sm text-neutral-900 dark:border-amber-700 dark:bg-amber-950/30"
                  role="alert"
                >
                  <AlertTriangle
                    className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-semibold">
                      Your saved password can&apos;t be read.
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-neutral-700">
                      This happens when WordPress security keys (salts in
                      wp-config.php) change — for example, during a site
                      migration or restore. Click <strong>Change</strong> in the
                      Password field above and re-enter your SMTP password, then
                      Save.
                    </p>
                  </div>
                </div>
              )}

            {testResult && testResult.rootCause === "no_smtp_credentials" && (
              <div
                className="dark:text-foreground mt-3 flex items-start gap-2 rounded-lg border-2 border-amber-400 bg-amber-50 p-3 text-sm text-neutral-900 dark:border-amber-700 dark:bg-amber-950/30"
                role="alert"
              >
                <AlertTriangle
                  className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-semibold">
                    SMTP host is set but no username is entered.
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-neutral-700">
                    Your server is falling back to PHP mail() instead of SMTP.
                    Enter your SMTP <strong>Username</strong> and{" "}
                    <strong>Password</strong> above and save — or clear the{" "}
                    <strong>SMTP Host</strong> field to keep using the
                    server&apos;s default mailer.
                  </p>
                </div>
              </div>
            )}

            {testResult &&
              testResult.ok &&
              testResult.rootCause === "no_smtp_server_mail_ok" && (
                <div
                  className="dark:text-foreground mt-3 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-neutral-900 dark:border-blue-900 dark:bg-blue-950/30"
                  role="note"
                >
                  <Info
                    className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="mb-0.5 font-medium">
                      Using your server&apos;s default mail (no SMTP credentials
                      configured).
                    </p>
                    <p className="leading-relaxed text-neutral-700">
                      If emails don&apos;t reach the inbox, configure SMTP
                      credentials above — or verify that your domain&apos;s SPF
                      and DMARC records authorize the server&apos;s outgoing IP.
                      Server-relayed mail is often silently discarded or sent to
                      spam by the major providers (Gmail, Outlook, etc.).
                    </p>
                  </div>
                </div>
              )}

            {/* Technical details — collapsible, only shown after a test, only
                useful when diagnosing a failure. Displays every field the
                backend probed on PHPMailer so the user (or support) can
                compare what WAS saved against what PHPMailer actually used. */}
            {testResult && testResult.diagnostics && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setShowDiagnostics((v) => !v)}
                  className="rounded text-xs font-medium text-neutral-700 underline decoration-dotted hover:text-neutral-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  aria-expanded={showDiagnostics}
                  aria-controls="smtp-test-diagnostics"
                >
                  {showDiagnostics
                    ? "Hide technical details"
                    : "Show technical details"}
                </button>
                {showDiagnostics && (
                  <div
                    id="smtp-test-diagnostics"
                    className="border-border dark:text-foreground mt-2 space-y-1 rounded-lg border bg-neutral-50 p-3 font-mono text-xs text-neutral-900 dark:bg-neutral-900/40"
                  >
                    <div>
                      <strong>Saved config</strong> — host:{" "}
                      {testResult.diagnostics.smtp_host || "(empty)"} · port:{" "}
                      {testResult.diagnostics.smtp_port} · enc:{" "}
                      {testResult.diagnostics.smtp_encryption} · user:{" "}
                      {testResult.diagnostics.smtp_username || "(empty)"} ·
                      from: {testResult.diagnostics.smtp_from || "(unset)"} ·
                      password saved:{" "}
                      {testResult.diagnostics.password_saved ? "yes" : "no"}
                    </div>
                    <div>
                      <strong>PHPMailer effective</strong> — smtp mode:{" "}
                      {testResult.diagnostics.phpmailer_is_smtp ? "yes" : "no"}{" "}
                      · host:{" "}
                      {testResult.diagnostics.phpmailer_host || "(unset)"} ·
                      port: {testResult.diagnostics.phpmailer_port || "(unset)"}{" "}
                      · secure:{" "}
                      {testResult.diagnostics.phpmailer_smtp_secure || "(none)"}{" "}
                      · auth:{" "}
                      {testResult.diagnostics.phpmailer_smtp_auth
                        ? "yes"
                        : "no"}{" "}
                      · from:{" "}
                      {testResult.diagnostics.phpmailer_from || "(unset)"} ·
                      password bytes applied:{" "}
                      {testResult.diagnostics.phpmailer_password_length}
                    </div>
                    {testResult.diagnostics.wp_error_messages.length > 0 && (
                      <div>
                        <strong>WP mail errors</strong> —{" "}
                        {testResult.diagnostics.wp_error_messages.join(" | ")}
                      </div>
                    )}
                    {testResult.diagnostics.throw_message && (
                      <div>
                        <strong>Exception</strong> —{" "}
                        {testResult.diagnostics.throw_message}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Contextual helper text under the action bar explains the current state
                so the user always understands what Test would do right now. */}
            <p className="mt-3 text-xs text-neutral-700">
              {isDirty ? (
                <>
                  <strong>Test disabled:</strong> you have unsaved changes.
                  Click <strong>Save SMTP Settings</strong> first — the test
                  email always uses whatever is currently saved on the server.
                </>
              ) : !hostIsSaved ? (
                <>
                  <strong>Test disabled:</strong> no SMTP host is saved. Fill in
                  the fields above (host, port, username, password, From email)
                  and click <strong>Save SMTP Settings</strong> to enable
                  testing.
                </>
              ) : (
                <>
                  Ready to test. Click <strong>Send Test Email</strong> to
                  dispatch a diagnostic message to the site admin address using
                  your saved SMTP config.
                </>
              )}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
