/**
 * WPScan API Key Field
 *
 * Optional API key input for WPScan vulnerability scanning integration.
 * Auto-saves on blur (no "Save Settings" button per UX rules).
 *
 * IMPORTANT: This component never seeds the input from the API value.
 * The API returns a masked string ("ABCD****WXYZ") for security. Reading
 * that value back into a controlled input would corrupt the real key on any
 * partial edit. Instead we use `hasWpscanApiKey` to show a status badge and
 * context-aware placeholder text, and we only fire onSave when the user has
 * actually typed a new, non-empty value.
 */

import { useState } from "react";
import { Card } from "../../ui/Card";
import { Badge } from "../../ui/Badge";
import { toast } from "sonner";
import { SwissSettings } from "../../../hooks/useSettings";
import { PRO_UPGRADE_URL } from "../../../lib/edition";
import {
  Shield,
  Eye,
  EyeOff,
  Check,
  Loader2,
  CheckCircle2,
  Lock,
} from "lucide-react";

interface WpscanApiKeyFieldProps {
  settings: SwissSettings;
  onSave: (settings: Partial<SwissSettings>) => Promise<any>;
  /** When false, the field is disabled with a Pro-required notice. Defaults to true. */
  isProUser?: boolean;
}

const INPUT_CLASS =
  "w-full px-4 py-3 min-h-[44px] rounded-lg border border-border bg-background text-neutral-900 dark:text-foreground placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm";

export function WpscanApiKeyField({
  settings,
  onSave,
  isProUser = true,
}: WpscanApiKeyFieldProps) {
  // Never seed from settings.wpscanApiKey — it returns a masked string.
  // The input starts empty; the user types a new key to replace the existing one.
  const [value, setValue] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );

  const hasKey = settings?.hasWpscanApiKey ?? false;
  const placeholder = !isProUser
    ? "Not available on this plan"
    : hasKey
      ? "Enter new key to replace existing"
      : "Not configured";

  const handleBlurSave = async () => {
    const trimmed = value.trim();
    // Empty blur = user made no change — leave existing key untouched.
    if (trimmed === "") return;

    setSaveState("saving");
    try {
      await onSave({ wpscanApiKey: trimmed });
      setSaveState("saved");
      toast.success("WPScan API key saved");
      // Clear the field so it cannot re-submit a stale value on next blur.
      setValue("");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("idle");
      toast.error("Failed to save WPScan API key");
    }
  };

  return (
    <Card className="max-w-3xl p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <Shield
            className="w-5 h-5 text-blue-600 dark:text-blue-400"
            aria-hidden="true"
          />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-neutral-900 dark:text-foreground">
            WPScan API Key
          </h3>
          <p className="text-xs text-neutral-700">
            Check your plugins and themes for known security vulnerabilities
          </p>
        </div>
        {isProUser ? (
          <Badge variant="neutral">Optional</Badge>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-[0.1em] border text-yellow-800 bg-yellow-50 border-yellow-200">
            <Lock size={11} aria-hidden="true" />
            Locked
          </span>
        )}
      </div>

      {/* Description */}
      <div className="space-y-3">
        <p className="text-sm text-neutral-700">
          WPScan maintains a database of known security issues found in
          WordPress plugins, themes, and WordPress core. When you connect your
          API key, every security scan automatically checks your installed
          plugins and themes against this database and alerts you to any known
          vulnerabilities.
        </p>
        <ul className="space-y-1.5 text-sm text-neutral-700">
          <li className="flex items-start gap-2">
            <span className="mt-1 shrink-0 text-emerald-500 font-black">✓</span>
            <span>Runs automatically on every Quick Scan and Full Scan</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 shrink-0 text-emerald-500 font-black">✓</span>
            <span>
              Free API key available at{" "}
              <a
                href="https://wpscan.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                wpscan.com
              </a>{" "}
              — no credit card required
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 shrink-0 text-neutral-400 font-black">○</span>
            <span>
              Optional but highly recommended — leave blank to skip
              vulnerability checks
            </span>
          </li>
        </ul>
      </div>

      {/* Upsell redesign (2026-08-04, T3): neutral-copy notice — no "Pro"/
          "Upgrade"/pricing words. Control stays disabled with a neutral
          explanation rather than rendering marketing copy in its place. */}
      {!isProUser && (
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-yellow-50 border border-yellow-200"
          role="note"
          aria-label="WPScan API key is not available on this plan"
        >
          <Lock
            size={15}
            className="text-yellow-600 shrink-0"
            aria-hidden="true"
          />
          <span className="text-sm text-yellow-800">
            Not available on this plan.{" "}
            <a
              href={PRO_UPGRADE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline hover:text-yellow-900 transition-colors"
            >
              Learn more
            </a>
          </span>
        </div>
      )}

      {/* "Key configured" status badge — shown when a key is stored */}
      {isProUser && hasKey && value === "" && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800"
          role="status"
          aria-label="WPScan API key is configured"
        >
          <CheckCircle2
            size={15}
            className="text-emerald-600 dark:text-emerald-400 shrink-0"
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Key configured
          </span>
          <span className="text-xs text-emerald-600 dark:text-emerald-400">
            — enter a new key below to replace it
          </span>
        </div>
      )}

      {/* Input field */}
      <div className="space-y-1.5">
        <label
          htmlFor="wpscan-api-key-input"
          className="text-sm font-medium text-neutral-900 dark:text-foreground"
        >
          {hasKey ? "Replace API Token" : "API Token"}
        </label>
        <div className="relative">
          <input
            id="wpscan-api-key-input"
            type={showKey ? "text" : "password"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleBlurSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder={placeholder}
            disabled={!isProUser}
            aria-disabled={!isProUser}
            className={
              INPUT_CLASS +
              " pr-20 font-mono" +
              (!isProUser ? " opacity-50 cursor-not-allowed" : "")
            }
            autoComplete="off"
            spellCheck={false}
            aria-describedby="wpscan-key-hint"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {/* Save state indicator */}
            {saveState === "saving" && (
              <Loader2
                size={16}
                className="text-blue-500 animate-spin"
                aria-label="Saving"
              />
            )}
            {saveState === "saved" && (
              <Check size={16} className="text-green-500" aria-label="Saved" />
            )}

            {/* Show/hide toggle */}
            {isProUser && (
              <button
                type="button"
                onClick={() => setShowKey((prev) => !prev)}
                className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                aria-label={showKey ? "Hide API key" : "Show API key"}
              >
                {showKey ? (
                  <EyeOff size={16} aria-hidden="true" />
                ) : (
                  <Eye size={16} aria-hidden="true" />
                )}
              </button>
            )}
          </div>
        </div>
        <p id="wpscan-key-hint" className="text-xs text-neutral-500">
          {!isProUser
            ? "Not available on this plan — see Settings for plan details."
            : hasKey
              ? "Leave blank to keep your existing key. A new key is saved automatically when you leave this field."
              : "The key is saved automatically when you leave this field."}
        </p>
      </div>
    </Card>
  );
}
