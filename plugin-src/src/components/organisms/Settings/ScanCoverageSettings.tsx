/**
 * ScanCoverageSettings — Settings > Security > Scan Coverage.
 *
 * Each switch saves on change (one-click AJAX); there is no Save button.
 */

import React, { useId } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "../../../lib/toast";
import { Card } from "../../ui/Card";
import type { SwissSettings } from "../../../hooks/useSettings";

type ToggleRowProps = {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
};

function ToggleRow({ label, desc, checked, onChange }: ToggleRowProps) {
  // WCAG 4.1.2: role="switch" is a plain div, not a native "labelable"
  // element — wrapping it in a <label> (or leaving it as a sibling of the
  // visible text) does NOT give it a programmatic name. Wire the existing
  // visible label/description via aria-labelledby/aria-describedby instead
  // of duplicating the string into aria-label (APG switch pattern).
  const labelId = useId();
  const descId = useId();
  return (
    <div className="border-border flex items-center justify-between border-b py-3 last:border-0">
      <div>
        <p
          id={labelId}
          className="dark:text-foreground text-sm font-medium text-neutral-900"
        >
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
        tabIndex={0}
        className={`ml-4 h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-300 ${checked ? "bg-green-500" : "bg-red-500"}`}
        onClick={() => onChange(!checked)}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") && onChange(!checked)
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

interface ScanCoverageSettingsProps {
  settings: SwissSettings;
  onSave: (settings: Partial<SwissSettings>) => Promise<unknown>;
}

export function ScanCoverageSettings({
  settings,
  onSave,
}: ScanCoverageSettingsProps) {
  const handleToggle = async (field: keyof SwissSettings, value: boolean) => {
    try {
      await onSave({ [field]: value });
      toast.success("Setting saved");
    } catch {
      toast.error("Failed to save setting");
    }
  };

  return (
    <Card className="max-w-3xl space-y-4 p-6">
      {/* Header */}
      <div className="border-border flex items-center gap-3 border-b pb-4">
        <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
          <ShieldCheck
            className="h-5 w-5 text-blue-600 dark:text-blue-400"
            aria-hidden="true"
          />
        </div>
        <div className="flex-1">
          <h3 className="dark:text-foreground text-lg font-semibold text-neutral-900">
            Scan Coverage
          </h3>
          <p className="text-xs text-neutral-700">
            Extra checks included in your daily security scan
          </p>
        </div>
      </div>

      <div className="space-y-0">
        <ToggleRow
          label="WordPress Core Integrity Check"
          desc="Verifies all WordPress core files match official checksums. Detects any tampering including novel malware injections."
          checked={settings?.coreIntegrityEnabled ?? true}
          onChange={(v) => handleToggle("coreIntegrityEnabled", v)}
        />
        <ToggleRow
          label="Abandoned Plugin Detection"
          desc="Daily check for plugins that WordPress.org has closed or removed — often indicates a security compromise or unpatched vulnerability."
          checked={settings?.abandonedPluginCheckEnabled ?? true}
          onChange={(v) => handleToggle("abandonedPluginCheckEnabled", v)}
        />
      </div>
    </Card>
  );
}
