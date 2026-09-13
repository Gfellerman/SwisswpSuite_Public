/**
 * Encryption Settings
 *
 * Lets the user set / clear / inspect the backup-archive encryption password.
 *
 * Backend contract (existing GET /settings response):
 *   - hasEncryptionPassword: boolean — a password is currently stored
 *   - encryptionPasswordCorrupted: boolean — the stored ciphertext cannot be
 *     decrypted (likely AUTH_KEY/SECURE_AUTH_KEY rotation since it was set)
 *
 * Backend contract (POST /settings):
 *   - { encryptionPassword, encryptionPasswordConfirm }   — set a new password
 *   - { clearEncryptionPassword: true }                   — remove existing
 *
 * IMPORTANT: This component never seeds the input from the API. The password is
 * never returned to the frontend (only presence + corruption flags are). Reading
 * a stored value back into a controlled input would corrupt the real secret on
 * any partial edit.
 */

import { useState } from "react";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { Badge } from "../../ui/Badge";
import { toast } from "../../../lib/toast";
import { SwissSettings } from "../../../hooks/useSettings";
import { ENCRYPTION_DESCRIPTION_TAIL } from "./encryptionSettingsCopy";
import {
  Lock,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
} from "lucide-react";

interface EncryptionSettingsProps {
  settings: SwissSettings;
  onSave: (settings: Partial<SwissSettings>) => Promise<unknown>;
}

const INPUT_CLASS =
  "w-full px-4 py-3 min-h-[44px] rounded-lg border border-border bg-background text-neutral-900 dark:text-foreground placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm";

export function EncryptionSettings({
  settings,
  onSave,
}: EncryptionSettingsProps) {
  const hasPassword = settings?.hasEncryptionPassword ?? false;
  const corrupted = settings?.encryptionPasswordCorrupted ?? false;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const passwordsMismatch =
    password !== "" && confirm !== "" && password !== confirm;
  const canSubmit =
    password.length >= 8 && confirm === password && !isSaving && !isClearing;

  const handleSet = async () => {
    if (!canSubmit) {
      if (password.length < 8) {
        toast.error("Password must be at least 8 characters");
      } else if (password !== confirm) {
        toast.error("Password and confirmation do not match");
      }
      return;
    }
    setIsSaving(true);
    try {
      await onSave({
        // SwissSettings does not declare these payload-only fields, but
        // updateSettings accepts an arbitrary Partial<SwissSettings>; the cast
        // narrows just for the in-flight payload (server validates).
        encryptionPassword: password,
        encryptionPasswordConfirm: confirm,
      } as unknown as Partial<SwissSettings>);
      toast.success(
        hasPassword
          ? "Encryption password updated"
          : "Encryption enabled — future backups will be encrypted"
      );
      setPassword("");
      setConfirm("");
    } catch {
      toast.error("Failed to save encryption password");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    if (
      !window.confirm(
        "Remove the encryption password? Future backups will be created as plain ZIPs. Existing encrypted backups will still require this password to restore."
      )
    ) {
      return;
    }
    setIsClearing(true);
    try {
      await onSave({
        clearEncryptionPassword: true,
      } as unknown as Partial<SwissSettings>);
      toast.success("Encryption disabled — future backups will be plain ZIPs");
      setPassword("");
      setConfirm("");
    } catch {
      toast.error("Failed to clear encryption password");
    } finally {
      setIsClearing(false);
    }
  };

  // Status badge: corrupted (red) > active (green) > not configured (neutral).
  const renderStatusBadge = () => {
    if (corrupted) {
      return (
        <div
          className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-800 dark:bg-red-900/20"
          role="status"
          aria-label="Encryption key corrupted"
        >
          <AlertTriangle
            size={15}
            className="shrink-0 text-red-600 dark:text-red-400"
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-red-700 dark:text-red-300">
            Encryption key corrupted
          </span>
          <span className="text-xs text-red-600 dark:text-red-400">
            — re-enter password to fix
          </span>
        </div>
      );
    }
    if (hasPassword) {
      return (
        <div
          className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-800 dark:bg-emerald-900/20"
          role="status"
          aria-label="Encryption is active"
        >
          <CheckCircle2
            size={15}
            className="shrink-0 text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Encryption active
          </span>
          <span className="text-xs text-emerald-600 dark:text-emerald-400">
            — backups stored as .zip.enc files
          </span>
        </div>
      );
    }
    return (
      <div
        className="border-border flex items-center gap-2 rounded-lg border bg-neutral-100 px-3 py-2 dark:bg-neutral-800/40"
        role="status"
        aria-label="Encryption not configured"
      >
        <Lock
          size={15}
          className="shrink-0 text-neutral-500"
          aria-hidden="true"
        />
        <span className="dark:text-foreground text-sm font-medium text-neutral-700">
          Not configured
        </span>
        <span className="text-xs text-neutral-500">
          — backups are stored as plain ZIPs
        </span>
      </div>
    );
  };

  return (
    <Card className="max-w-3xl space-y-4 p-6">
      {/* Header */}
      <div className="border-border flex items-center gap-3 border-b pb-4">
        <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
          <Lock
            className="h-5 w-5 text-blue-600 dark:text-blue-400"
            aria-hidden="true"
          />
        </div>
        <div className="flex-1">
          <h3 className="dark:text-foreground text-lg font-semibold text-neutral-900">
            Backup Encryption
          </h3>
          <p className="text-xs text-neutral-700">
            Encrypt every backup archive at rest with a password only you know
          </p>
        </div>
        <Badge variant="neutral">Optional</Badge>
      </div>

      {/* Description */}
      <div className="space-y-3">
        <p className="text-sm text-neutral-700">
          When enabled, every new backup ZIP is encrypted with your password
          using AES-256-CBC (or XChaCha20-Poly1305 when Sodium is available) and
          saved with a <code className="font-mono text-xs">.zip.enc</code>{" "}
          {ENCRYPTION_DESCRIPTION_TAIL}
        </p>
        <ul className="space-y-1.5 text-sm text-neutral-700">
          <li className="flex items-start gap-2">
            <span className="mt-1 shrink-0 font-black text-emerald-500">✓</span>
            <span>
              Strong key derivation: PBKDF2-SHA256 with 310,000 iterations
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 shrink-0 font-black text-emerald-500">✓</span>
            <span>
              Password is stored encrypted at rest using your WordPress salts
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 shrink-0 font-black text-amber-500">!</span>
            <span>
              <strong>Save your password somewhere safe</strong> — encrypted
              backups <em>cannot</em> be recovered without it
            </span>
          </li>
        </ul>
      </div>

      {/* Status badge */}
      {renderStatusBadge()}

      {/* Set / replace password */}
      <div className="space-y-3">
        <h4 className="dark:text-foreground text-sm font-medium text-neutral-900">
          {hasPassword ? "Replace password" : "Set password"}
        </h4>

        {/* New password */}
        <div className="space-y-1.5">
          <label
            htmlFor="encryption-password-input"
            className="dark:text-foreground text-sm font-medium text-neutral-900"
          >
            New password
          </label>
          <div className="relative">
            <input
              id="encryption-password-input"
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                hasPassword ? "Enter a new password" : "At least 8 characters"
              }
              className={INPUT_CLASS + " pr-12"}
              autoComplete="new-password"
              spellCheck={false}
              aria-describedby="encryption-password-hint"
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="dark:hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-2 text-neutral-500 hover:text-neutral-700 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
              aria-label={showPwd ? "Hide password" : "Show password"}
            >
              {showPwd ? (
                <EyeOff size={16} aria-hidden="true" />
              ) : (
                <Eye size={16} aria-hidden="true" />
              )}
            </button>
          </div>
          <p id="encryption-password-hint" className="text-xs text-neutral-500">
            Use a long, memorable phrase. Minimum 8 characters.
          </p>
        </div>

        {/* Confirm password */}
        <div className="space-y-1.5">
          <label
            htmlFor="encryption-password-confirm-input"
            className="dark:text-foreground text-sm font-medium text-neutral-900"
          >
            Confirm password
          </label>
          <input
            id="encryption-password-confirm-input"
            type={showPwd ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter the same password"
            className={INPUT_CLASS}
            autoComplete="new-password"
            spellCheck={false}
            aria-invalid={passwordsMismatch}
            aria-describedby={
              passwordsMismatch ? "encryption-password-mismatch" : undefined
            }
          />
          {passwordsMismatch && (
            <p
              id="encryption-password-mismatch"
              className="text-xs text-red-600 dark:text-red-400"
              role="alert"
            >
              Passwords do not match
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            variant="primary"
            onClick={handleSet}
            disabled={!canSubmit}
            aria-label={
              hasPassword
                ? "Replace encryption password"
                : "Set encryption password"
            }
          >
            {isSaving ? (
              <span className="inline-flex items-center gap-2">
                <Loader2
                  size={16}
                  className="animate-spin"
                  aria-hidden="true"
                />
                Saving...
              </span>
            ) : hasPassword ? (
              "Replace password"
            ) : (
              "Set password"
            )}
          </Button>

          {hasPassword && (
            <Button
              variant="secondary"
              onClick={handleClear}
              disabled={isSaving || isClearing}
              aria-label="Clear encryption password and disable encryption"
            >
              {isClearing ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2
                    size={16}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                  Clearing...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Trash2 size={16} aria-hidden="true" />
                  Disable encryption
                </span>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Footer note */}
      <p className="border-border border-t pt-3 text-xs text-neutral-500">
        Existing plain-ZIP backups stay as-is. Only NEW backups created after
        you save a password will be encrypted.
      </p>
    </Card>
  );
}
