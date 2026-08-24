import { useState, useEffect, useCallback } from "react";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { Badge } from "../../ui/Badge";
import { toast } from "sonner";
import { wpApi } from "../../../services/api";
import { QRCodeSVG } from "qrcode.react";
import {
  ShieldCheck,
  Lock,
  QrCode,
  KeyRound,
  Copy,
  RefreshCw,
  ShieldOff,
  CheckCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TwoFactorStatus {
  enabled: boolean;
  setup_date: number | null;
  last_used: number | null;
  backup_codes_remaining: number;
}

interface TwoFactorSetupData {
  secret: string;
  secret_formatted: string;
  qr_code_url: string;
  provisioning_uri: string;
  issuer: string;
  account: string;
}

type Phase = "not_set_up" | "setup" | "active";

// ─── Input styling constant ───────────────────────────────────────────────────

const INPUT_CLASS =
  "w-full px-4 py-3 min-h-[44px] rounded-lg border border-border bg-background text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm";

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * Monospace grid of backup codes with a "Copy All" button.
 * Announced to screen readers via role="region" + aria-label.
 */
function BackupCodesPanel({ codes }: { codes: string[] }) {
  const handleCopyAll = () => {
    navigator.clipboard
      .writeText(codes.join("\n"))
      .then(() => {
        toast.success("Backup codes copied to clipboard");
      })
      .catch(() => {
        toast.error("Failed to copy — please select and copy manually");
      });
  };

  return (
    <div
      role="region"
      aria-label="Backup recovery codes"
      className="mt-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle
            size={16}
            className="shrink-0 text-amber-600"
            aria-hidden="true"
          />
          <span className="text-sm font-semibold text-amber-800">
            Save your backup codes now
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          icon={Copy}
          onClick={handleCopyAll}
          className="min-h-[36px]"
          aria-label="Copy all backup codes to clipboard"
        >
          Copy All
        </Button>
      </div>

      <div
        className="grid grid-cols-2 gap-2"
        role="list"
        aria-label="List of backup codes"
      >
        {codes.map((code) => (
          <span
            key={code}
            role="listitem"
            className="rounded border border-amber-200 bg-white px-3 py-1.5 text-center font-mono text-sm tracking-widest text-amber-900"
          >
            {code}
          </span>
        ))}
      </div>

      <p className="text-xs text-amber-700">
        Save these codes in a secure location. Each code can only be used once.
        These codes will not be shown again.
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TwoFactorSettings() {
  const license = window.swisswpsuiteData?.license;
  // Check multiple pro signals: capabilities array, tier field, or the dedicated sentinelIsPro flag.
  // sentinelIsPro is injected separately by PHP and is the most reliable source; use it as
  // a fallback so that capability-array mismatches do not accidentally lock out Pro users.
  const hasPro =
    !!license?.capabilities?.includes("sentinel_pro") ||
    !!window.swisswpsuiteData?.sentinelIsPro ||
    license?.tier === "pro";

  // Phase state
  const [phase, setPhase] = useState<Phase>("not_set_up");
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);

  // Setup phase state
  const [setupData, setSetupData] = useState<TwoFactorSetupData | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  // Active phase state
  const [disableCode, setDisableCode] = useState("");
  const [regenCode, setRegenCode] = useState("");
  const [showRegenCodes, setShowRegenCodes] = useState(false);
  const [newBackupCodes, setNewBackupCodes] = useState<string[]>([]);

  // Loading states
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isStartingSetup, setIsStartingSetup] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // ── Fetch status on mount ──────────────────────────────────────────────

  const fetchStatus = useCallback(async (): Promise<TwoFactorStatus | null> => {
    setIsLoadingStatus(true);
    try {
      const res = await wpApi<{ success: boolean; status: TwoFactorStatus }>(
        "/2fa/status"
      );
      if (res.success) {
        setStatus(res.status);
        setPhase(res.status.enabled ? "active" : "not_set_up");
        // UI-Truth Sprint (2026-08-20, U6): return the freshly-fetched status so
        // callers can gate UI decisions on the genuine live read instead of the
        // (async, not-yet-committed) `status` state variable.
        return res.status;
      }
      return null;
    } catch (err: any) {
      toast.error(
        "Could not load 2FA status — " + (err.message || "network error")
      );
      return null;
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    if (hasPro) {
      fetchStatus();
    } else {
      setIsLoadingStatus(false);
    }
  }, [hasPro, fetchStatus]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleStartSetup = async () => {
    setIsStartingSetup(true);
    try {
      const res = await wpApi<{ success: boolean; setup: TwoFactorSetupData }>(
        "/2fa/setup",
        {
          method: "POST",
        }
      );
      if (res.success) {
        setSetupData(res.setup);
        setVerifyCode("");
        setBackupCodes([]);
        setPhase("setup");
      }
    } catch (err: any) {
      if (err?.data?.upgrade_required) {
        toast.error(
          "2FA requires a Pro license — upgrade at swisswpsecure.com/products"
        );
      } else {
        toast.error(
          "Failed to start 2FA setup — " + (err.message || "try again")
        );
      }
    } finally {
      setIsStartingSetup(false);
    }
  };

  const handleVerifySetup = async () => {
    if (verifyCode.length !== 6) {
      toast.error("Enter your 6-digit code from the authenticator app");
      return;
    }
    setIsVerifying(true);
    try {
      const res = await wpApi<{
        success: boolean;
        message: string;
        backup_codes: string[];
        backup_codes_warning: string;
      }>("/2fa/verify-setup", {
        method: "POST",
        body: JSON.stringify({ code: verifyCode }),
      });
      if (res.success) {
        setBackupCodes(res.backup_codes || []);
        // UI-Truth Sprint (2026-08-20, U6): the backend can now genuinely fail
        // to persist (500, see complete_setup()'s new read-backs) — but even on
        // a reported success, don't force the UI to "active" from res.success
        // alone. Read back the live status fetchStatus() just fetched and gate
        // the phase transition on THAT, not on the response envelope, so this
        // line can never paper over a persistence failure the backend
        // (correctly) reported honestly.
        const freshStatus = await fetchStatus();
        // a11y Serious F5 (ADDENDUM-4, 2026-08-20): `freshStatus?.enabled`
        // alone collapsed two semantically different outcomes into one
        // branch — fetchStatus()'s own catch path resolves `null` on a
        // network blip on THIS independent re-fetch, which is
        // indistinguishable from a genuine `{enabled: false}` under optional
        // chaining, even though the backend may have genuinely succeeded
        // (complete_setup()'s U6 read-back gate already confirmed it). A
        // screen-reader user has no way to sanity-check the still-visible
        // QR/backup-codes screen against devtools the way a sighted user
        // might, so the false "Setup did not complete" was a real
        // truthfulness regression, not just noise. Three explicit branches:
        if (freshStatus?.enabled === true) {
          toast.success("Two-factor authentication enabled");
          // Stay showing backup codes — user must see them before continuing
          setPhase("active");
          setVerifyCode("");
          setSetupData(null);
        } else if (freshStatus === null) {
          // Re-fetch blipped — make no claim either way, don't move phase.
          // Traced conclusively (ADDENDUM-4): no re-enrollment hazard from a
          // retry here — complete_setup()'s single-use pending-secret
          // transient is already consumed, and start_2fa_setup() separately
          // refuses to regenerate a secret once is_2fa_enabled() is true.
          toast.warning(
            "Could not confirm setup status — please refresh the page and check before retrying."
          );
        } else {
          // freshStatus.enabled === false — genuinely not enabled.
          toast.error(
            "Setup did not complete — 2FA is not active yet. Please try again."
          );
        }
      }
    } catch (err: any) {
      toast.error(
        "Verification failed — " +
          (err.message || "check the code and try again")
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisable = async () => {
    if (!disableCode.trim()) {
      toast.error("Enter your 6-digit authenticator code to confirm");
      return;
    }
    setIsDisabling(true);
    try {
      const res = await wpApi<{ success: boolean; message: string }>(
        "/2fa/disable",
        {
          method: "POST",
          body: JSON.stringify({ code: disableCode }),
        }
      );
      if (res.success) {
        toast.success(res.message || "2FA has been disabled");
        setDisableCode("");
        setBackupCodes([]);
        setNewBackupCodes([]);
        setShowRegenCodes(false);
        await fetchStatus();
      }
    } catch (err: any) {
      toast.error("Failed to disable 2FA — " + (err.message || "invalid code"));
    } finally {
      setIsDisabling(false);
    }
  };

  const handleRegenerateBackup = async () => {
    if (!regenCode.trim()) {
      toast.error("Enter your 6-digit authenticator code to confirm");
      return;
    }
    setIsRegenerating(true);
    try {
      const res = await wpApi<{
        success: boolean;
        message: string;
        backup_codes: string[];
      }>("/2fa/regenerate-backup", {
        method: "POST",
        body: JSON.stringify({ code: regenCode }),
      });
      if (res.success) {
        toast.success(res.message || "Backup codes regenerated");
        setNewBackupCodes(res.backup_codes || []);
        setShowRegenCodes(true);
        setRegenCode("");
        await fetchStatus();
      }
    } catch (err: any) {
      toast.error(
        "Failed to regenerate backup codes — " + (err.message || "invalid code")
      );
    } finally {
      setIsRegenerating(false);
    }
  };

  // ── Formatters ─────────────────────────────────────────────────────────

  const formatDate = (ts: number | null): string => {
    if (!ts) return "Never";
    return new Date(ts * 1000).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ── Pro Gate ───────────────────────────────────────────────────────────

  if (!hasPro) {
    return (
      <Card className="max-w-3xl p-6">
        <div className="border-border flex items-center gap-3 border-b pb-4">
          <div className="rounded-lg bg-neutral-100 p-2">
            <ShieldCheck
              className="h-5 w-5 text-neutral-400"
              aria-hidden="true"
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Two-Factor Authentication</h3>
            <p className="text-xs text-neutral-700">
              Protect your account with a second layer of verification
            </p>
          </div>
        </div>

        <div
          className="flex flex-col items-center justify-center py-10 opacity-70"
          role="region"
          aria-label="Pro feature locked"
        >
          <Lock
            size={32}
            className="mb-3 text-neutral-400"
            aria-hidden="true"
          />
          <Badge variant="neutral" icon={Lock}>
            PRO FEATURE
          </Badge>
          <p className="mt-3 max-w-xs text-center text-sm text-neutral-500">
            Upgrade to Pro to enable Two-Factor Authentication and protect your
            WordPress admin account.
          </p>
          <a
            href="https://swisswpsecure.com/products"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-green-600 px-5 py-2.5 text-xs font-black tracking-widest text-white uppercase transition-colors hover:bg-green-700 focus:ring-2 focus:ring-green-500/50 focus:outline-none"
            aria-label="Upgrade to Pro to unlock Two-Factor Authentication"
          >
            Upgrade to Pro
          </a>
        </div>
      </Card>
    );
  }

  // ── Loading skeleton ────────────────────────────────────────────────────

  if (isLoadingStatus) {
    return (
      <Card className="max-w-3xl p-6">
        <div className="border-border flex items-center gap-3 border-b pb-4">
          <div className="rounded-lg bg-green-100 p-2">
            <ShieldCheck
              className="h-5 w-5 text-green-600"
              aria-hidden="true"
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Two-Factor Authentication</h3>
            <p className="text-xs text-neutral-700">Loading status…</p>
          </div>
        </div>
        <div
          className="flex justify-center py-10"
          aria-live="polite"
          aria-busy="true"
        >
          <div
            className="h-6 w-6 animate-spin rounded-full border-2 border-green-500 border-t-transparent"
            role="status"
            aria-label="Loading"
          />
        </div>
      </Card>
    );
  }

  // ── Phase: NOT SET UP ───────────────────────────────────────────────────

  if (phase === "not_set_up") {
    return (
      <Card className="max-w-3xl space-y-6 p-6">
        {/* Header */}
        <div className="border-border flex items-center gap-3 border-b pb-4">
          <div className="rounded-lg bg-green-100 p-2">
            <ShieldCheck
              className="h-5 w-5 text-green-600"
              aria-hidden="true"
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Two-Factor Authentication</h3>
            <p className="text-xs text-neutral-700">
              Add a second layer of security to your WordPress admin account
            </p>
          </div>
        </div>

        {/* Status banner */}
        <div
          className="bg-background border-border rounded-lg border p-4"
          role="status"
        >
          <div className="flex items-start gap-3">
            <ShieldOff
              className="mt-0.5 h-5 w-5 shrink-0 text-neutral-500"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-medium">2FA is not active</p>
              <p className="mt-1 text-xs text-neutral-700">
                Two-factor authentication is currently disabled. Enable it to
                require a verification code each time you sign in, in addition
                to your password.
              </p>
            </div>
            <Badge variant="warning">Disabled</Badge>
          </div>
        </div>

        {/* How it works */}
        <div className="space-y-2">
          <p className="text-sm font-medium">How it works</p>
          <ol className="list-inside list-decimal space-y-1 pl-1 text-sm text-neutral-700">
            <li>
              Scan the QR code with an authenticator app (Google Authenticator,
              Authy, etc.)
            </li>
            <li>Enter the 6-digit code from the app to verify setup</li>
            <li>Save the one-time backup codes in a secure location</li>
            <li>
              Each future login will require your password + a 6-digit code
            </li>
          </ol>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="success"
            icon={ShieldCheck}
            onClick={handleStartSetup}
            loading={isStartingSetup}
            className="min-h-[44px]"
            aria-busy={isStartingSetup}
          >
            Enable 2FA
          </Button>
        </div>
      </Card>
    );
  }

  // ── Phase: SETUP IN PROGRESS ────────────────────────────────────────────

  if (phase === "setup" && setupData) {
    return (
      <Card className="max-w-3xl space-y-6 p-6">
        {/* Header */}
        <div className="border-border flex items-center gap-3 border-b pb-4">
          <div className="rounded-lg bg-blue-100 p-2">
            <QrCode className="h-5 w-5 text-blue-600" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">
              Set Up Two-Factor Authentication
            </h3>
            <p className="text-xs text-neutral-700">
              Scan the QR code and verify your setup
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Step 1: QR Code */}
          <section aria-labelledby="step1-heading">
            <p id="step1-heading" className="mb-3 text-sm font-semibold">
              Step 1 — Scan with your authenticator app
            </p>
            <div className="flex flex-col items-start gap-6 sm:flex-row">
              <div className="shrink-0">
                {/* A-01 FIX: Add aria-label for screen readers */}
                <QRCodeSVG
                  value={setupData.provisioning_uri}
                  size={200}
                  level="M"
                  className="border-border rounded-lg border bg-white p-1"
                  aria-label="QR code for authenticator app setup"
                />
              </div>
              <div className="flex-1 space-y-3">
                <p className="text-sm text-neutral-700">
                  Open <strong>Google Authenticator</strong>,{" "}
                  <strong>Authy</strong>, or any TOTP-compatible app, then scan
                  the QR code on the left.
                </p>
                <div>
                  <p className="mb-1 text-xs font-semibold tracking-wider text-neutral-700 uppercase">
                    Account
                  </p>
                  <p className="bg-secondary border-border rounded border px-3 py-2 font-mono text-sm">
                    {setupData.account}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold tracking-wider text-neutral-700 uppercase">
                    Issuer
                  </p>
                  <p className="bg-secondary border-border rounded border px-3 py-2 font-mono text-sm">
                    {setupData.issuer}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Step 2: Manual entry */}
          <section aria-labelledby="step2-heading">
            <p id="step2-heading" className="mb-2 text-sm font-semibold">
              Step 2 — Or enter the secret key manually
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <KeyRound
                size={16}
                className="shrink-0 text-neutral-500"
                aria-hidden="true"
              />
              <code className="bg-secondary border-border rounded border px-3 py-2 font-mono text-sm tracking-widest break-all">
                {setupData.secret_formatted}
              </code>
            </div>
            <p className="mt-2 text-xs text-neutral-600">
              If you cannot scan the QR code, add the account manually in your
              app using the secret key above. Select TOTP (time-based) as the
              type.
            </p>
          </section>

          {/* Step 3: Verify */}
          <section aria-labelledby="step3-heading">
            <p id="step3-heading" className="mb-2 text-sm font-semibold">
              Step 3 — Enter the 6-digit code to confirm
            </p>
            <div className="flex flex-wrap items-start gap-3">
              <div className="max-w-[220px] min-w-[180px] flex-1">
                <label htmlFor="verify-code-input" className="sr-only">
                  6-digit verification code from authenticator app
                </label>
                <input
                  id="verify-code-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) =>
                    setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="123456"
                  className={
                    INPUT_CLASS + " text-center font-mono tracking-[0.4em]"
                  }
                  aria-label="6-digit verification code"
                  aria-required="true"
                  autoComplete="one-time-code"
                  onKeyDown={(e) => e.key === "Enter" && handleVerifySetup()}
                />
              </div>
              <Button
                variant="primary"
                icon={CheckCircle}
                onClick={handleVerifySetup}
                loading={isVerifying}
                disabled={verifyCode.length !== 6}
                className="min-h-[44px]"
                aria-busy={isVerifying}
              >
                Verify &amp; Enable
              </Button>
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              The code refreshes every 30 seconds. Enter it exactly as shown in
              your app.
            </p>
          </section>

          {/* Cancel */}
          <div className="border-border border-t pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setPhase("not_set_up");
                setSetupData(null);
                setVerifyCode("");
              }}
              className="min-h-[44px] text-neutral-600"
            >
              Cancel setup
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // ── Phase: ACTIVE ───────────────────────────────────────────────────────

  return (
    <Card className="max-w-3xl space-y-6 p-6">
      {/* Header */}
      <div className="border-border flex items-center gap-3 border-b pb-4">
        <div className="rounded-lg bg-green-100 p-2">
          <ShieldCheck className="h-5 w-5 text-green-600" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold">Two-Factor Authentication</h3>
          <p className="text-xs text-neutral-700">
            Your account is protected with 2FA
          </p>
        </div>
        <Badge variant="success" icon={CheckCircle}>
          Active
        </Badge>
      </div>

      <div className="space-y-6">
        {/* Status card */}
        <div
          className="bg-background border-border rounded-lg border p-4"
          role="status"
          aria-live="polite"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="mb-1 text-xs font-semibold tracking-wider text-neutral-500 uppercase">
                Status
              </p>
              <div className="flex items-center gap-2">
                <CheckCircle
                  size={16}
                  className="text-green-500"
                  aria-hidden="true"
                />
                <span className="text-sm font-medium text-green-700">
                  Enabled
                </span>
              </div>
            </div>
            {status?.setup_date && (
              <div>
                <p className="mb-1 text-xs font-semibold tracking-wider text-neutral-500 uppercase">
                  Enabled on
                </p>
                <div className="flex items-center gap-2">
                  <Clock
                    size={14}
                    className="shrink-0 text-neutral-400"
                    aria-hidden="true"
                  />
                  <span className="text-sm text-neutral-700">
                    {formatDate(status.setup_date)}
                  </span>
                </div>
              </div>
            )}
            <div>
              <p className="mb-1 text-xs font-semibold tracking-wider text-neutral-500 uppercase">
                Backup codes left
              </p>
              <span
                className={`text-sm font-semibold ${(status?.backup_codes_remaining ?? 0) <= 2 ? "text-amber-600" : "text-neutral-900"}`}
                aria-label={`${status?.backup_codes_remaining ?? 0} backup codes remaining`}
              >
                {status?.backup_codes_remaining ?? 0}
              </span>
              {(status?.backup_codes_remaining ?? 0) <= 2 && (
                <span className="ml-2 text-xs font-medium text-amber-600">
                  — regenerate soon
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Show initial backup codes if just enrolled */}
        {backupCodes.length > 0 && <BackupCodesPanel codes={backupCodes} />}

        {/* Regenerate Backup Codes section */}
        <section aria-labelledby="regen-heading" className="space-y-3">
          <div>
            <h4 id="regen-heading" className="text-sm font-semibold">
              Regenerate Backup Codes
            </h4>
            <p className="mt-0.5 text-xs text-neutral-700">
              Generate a new set of backup codes. All existing backup codes will
              be invalidated.
            </p>
          </div>

          <div className="flex flex-wrap items-start gap-3">
            <div className="max-w-[220px] min-w-[180px] flex-1">
              <label htmlFor="regen-code-input" className="sr-only">
                6-digit authenticator code to confirm regeneration
              </label>
              <input
                id="regen-code-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={regenCode}
                onChange={(e) =>
                  setRegenCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="Your code"
                className={
                  INPUT_CLASS + " text-center font-mono tracking-[0.4em]"
                }
                aria-label="6-digit authenticator code to confirm"
                aria-required="true"
                autoComplete="one-time-code"
                onKeyDown={(e) => e.key === "Enter" && handleRegenerateBackup()}
              />
            </div>
            <Button
              variant="outline"
              icon={RefreshCw}
              onClick={handleRegenerateBackup}
              loading={isRegenerating}
              disabled={regenCode.length !== 6}
              className="min-h-[44px]"
              aria-busy={isRegenerating}
            >
              Regenerate Backup Codes
            </Button>
          </div>

          {/* New codes after regeneration */}
          {showRegenCodes && newBackupCodes.length > 0 && (
            <BackupCodesPanel codes={newBackupCodes} />
          )}
        </section>

        {/* Divider */}
        <hr className="border-border" />

        {/* Disable 2FA section */}
        <section aria-labelledby="disable-heading" className="space-y-3">
          <div>
            <h4
              id="disable-heading"
              className="text-sm font-semibold text-red-700"
            >
              Disable Two-Factor Authentication
            </h4>
            <p className="mt-0.5 text-xs text-neutral-700">
              Removing 2FA will make your account less secure. Enter your
              current authenticator code to confirm.
            </p>
          </div>

          <div className="flex flex-wrap items-start gap-3">
            <div className="max-w-[220px] min-w-[180px] flex-1">
              <label htmlFor="disable-code-input" className="sr-only">
                6-digit authenticator code to confirm disabling 2FA
              </label>
              <input
                id="disable-code-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={disableCode}
                onChange={(e) =>
                  setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="Your code"
                className={
                  INPUT_CLASS + " text-center font-mono tracking-[0.4em]"
                }
                aria-label="6-digit authenticator code to confirm disabling 2FA"
                aria-required="true"
                autoComplete="one-time-code"
                onKeyDown={(e) => e.key === "Enter" && handleDisable()}
              />
            </div>
            <Button
              variant="danger"
              icon={ShieldOff}
              onClick={handleDisable}
              loading={isDisabling}
              disabled={disableCode.length !== 6}
              className="min-h-[44px]"
              aria-busy={isDisabling}
            >
              Disable 2FA
            </Button>
          </div>
        </section>
      </div>
    </Card>
  );
}
