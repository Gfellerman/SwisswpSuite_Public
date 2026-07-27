/**
 * Patchstack API Key Field
 *
 * Optional API key input for Patchstack vulnerability scanning integration.
 * Auto-saves on blur (no "Save Settings" button per UX rules).
 *
 * IMPORTANT: This component never seeds the input from the API value.
 * The API returns a masked string ("ABCD****WXYZ") for security. Reading
 * that value back into a controlled input would corrupt the real key on any
 * partial edit. Instead we use `hasPatchstackApiKey` to show a status badge
 * and context-aware placeholder text, and we only fire onSave when the user
 * has actually typed a new, non-empty value.
 */

import { useState } from "react";
import { Card } from "../../ui/Card";
import { Badge } from "../../ui/Badge";
import { toast } from "sonner";
import { SwissSettings } from "../../../hooks/useSettings";
import {
  Shield,
  Eye,
  EyeOff,
  Check,
  Loader2,
  CheckCircle2,
  Lock,
} from "lucide-react";

interface PatchstackApiKeyFieldProps {
  settings: SwissSettings;
  onSave: (settings: Partial<SwissSettings>) => Promise<any>;
  /** When false, the field is disabled with a Pro-required notice. Defaults to true. */
  isProUser?: boolean;
}

const INPUT_CLASS =
  "w-full px-4 py-3 min-h-[44px] rounded-lg border border-border bg-background text-neutral-900 dark:text-foreground placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm";

export function PatchstackApiKeyField({
  settings,
  onSave,
  isProUser = true,
}: PatchstackApiKeyFieldProps) {
  // Never seed from settings.patchstackApiKey — it returns a masked string.
  // The input starts empty; the user types a new key to replace the existing one.
  const [value, setValue] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );

  const hasKey = settings?.hasPatchstackApiKey ?? false;
  const placeholder = !isProUser
    ? "Available on Pro plan"
    : hasKey
      ? "Enter new key to replace existing"
      : "Not configured";

  const handleBlurSave = async () => {
    const trimmed = value.trim();
    // Empty blur = user made no change — leave existing key untouched.
    if (trimmed === "") return;

    setSaveState("saving");
    try {
      await onSave({ patchstackApiKey: trimmed });
      setSaveState("saved");
      toast.success("Patchstack API key saved");
      // Clear the field so it cannot re-submit a stale value on next blur.
      setValue("");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("idle");
      toast.error("Failed to save Patchstack API key");
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
            Patchstack API Key
          </h3>
          <p className="text-xs text-neutral-700">
            Get real-time alerts about newly discovered security flaws in
            WordPress plugins
          </p>
        </div>
        {isProUser ? (
          <Badge variant="neutral">Optional</Badge>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-[0.1em] border text-yellow-800 bg-yellow-50 border-yellow-200">
            <Lock size={11} aria-hidden="true" />
            Pro
          </span>
        )}
      </div>

      {/* Description */}
      <div className="space-y-3">
        <p className="text-sm text-neutral-700">
          Patchstack tracks newly discovered security flaws in WordPress plugins
          and themes and publishes alerts as soon as vulnerabilities are found —
          often before official patches are released. When you connect your API
          key, Patchstack data is added to your scan results alongside WPScan
          data, giving you broader coverage from two independent sources.
        </p>
        <ul className="space-y-1.5 text-sm text-neutral-700">
          <li className="flex items-start gap-2">
            <span className="mt-1 shrink-0 text-emerald-500 font-black">✓</span>
            <span>
              Enriches both Quick Scan and Full Scan results automatically
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 shrink-0 text-emerald-500 font-black">✓</span>
            <span>
              Free community key at{" "}
              <a
                href="https://patchstack.com/free"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                patchstack.com/free
              </a>{" "}
              — no credit card required
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 shrink-0 text-neutral-400 font-black">○</span>
            <span>
              Optional — works best when combined with a WPScan key for maximum
              coverage
            </span>
          </li>
        </ul>
      </div>

      {/* Pro-required notice — shown when user is not on Pro plan */}
      {!isProUser && (
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-yellow-50 border border-yellow-200"
          role="note"
          aria-label="Patchstack API key requires a Pro plan"
        >
          <Lock
            size={15}
            className="text-yellow-600 shrink-0"
            aria-hidden="true"
          />
          <span className="text-sm text-yellow-800">
            Available on Pro plan — upgrade to enable Patchstack vulnerability
            lookups.{" "}
            <a
              href="https://www.swisswpsecure.com/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline hover:text-yellow-900 transition-colors"
            >
              Upgrade
            </a>
          </span>
        </div>
      )}

      {/* "Key configured" status badge — shown when a key is stored */}
      {isProUser && hasKey && value === "" && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800"
          role="status"
          aria-label="Patchstack API key is configured"
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
          htmlFor="patchstack-api-key-input"
          className="text-sm font-medium text-neutral-900 dark:text-foreground"
        >
          {hasKey ? "Replace API Key" : "API Key"}
        </label>
        <div className="relative">
          <input
            id="patchstack-api-key-input"
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
            aria-describedby="patchstack-key-hint"
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
        <p id="patchstack-key-hint" className="text-xs text-neutral-500">
          {!isProUser
            ? "Upgrade to Pro to configure Patchstack vulnerability lookups."
            : hasKey
              ? "Leave blank to keep your existing key. A new key is saved automatically when you leave this field."
              : "The key is saved automatically when you leave this field."}
        </p>
      </div>
    </Card>
  );
}
