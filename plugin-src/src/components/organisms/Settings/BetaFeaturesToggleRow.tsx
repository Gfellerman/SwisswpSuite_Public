import { useId } from "react";

/**
 * BetaFeaturesToggleRow — the "Beta Features" toggle, extracted out of
 * GeneralSettings.tsx.
 *
 * ARS Round D (D-K-4, WP.org R4 F-11) FOLLOW-UP FIX (lane-K verifier
 * D-K-4, 2026-08-24): the original D-K-4 pass deleted this control
 * unconditionally, on the premise that its backend write-gate
 * (`class-swisswpsuite-api-settings.php` `save_settings()`,
 * `class_exists('SwissWPSuite_Api_Sync', false)`) never fires in Free —
 * that premise is correct, but it does not follow that the control
 * should vanish from BOTH editions. `swisswpsuite_beta_features` is a
 * real, actively-consumed PRO option: `BackupsPage.tsx` reads
 * `settings.betaFeatures` (`betaEnabled`) to gate its Sync/Migration
 * sections (`BETA_SECTIONS` / `isBetaLocked`), and this ToggleRow was its
 * ONLY UI writer anywhere in the codebase (confirmed by tree-wide grep —
 * `class-swisswpsuite-api-settings.php:1033-1034` is the only writer of
 * `swisswpsuite_beta_features`, gated on the same POST field this control
 * sends). Deleting it left every Pro install with no way to ever flip
 * `betaFeatures` to `true` (short of a raw DB edit) — a functional
 * regression, not a dead-code removal.
 *
 * Extracted to its own module (same pattern as `LicenseTierBadge.tsx`,
 * D-K-3) so it can be aliased to a null-rendering stub in the Free build
 * (`plugin/vite.config.ts`, specifier `"./BetaFeaturesToggleRow"`)
 * instead of a runtime-only gate — `GeneralSettings.tsx` is the
 * always-present Settings > General shell (never aliasable), so a plain
 * `isProEditionBuild && <ToggleRow label="Beta Features" .../>` would
 * still compile the "Beta Features" string into the Free bundle even
 * though it never renders there. The write-gate being Pro-only in Free
 * is exactly why Free must not even show a control for it — the feature
 * it unlocks (Sync/Migration) is physically absent in Free, not merely
 * disabled, so the toggle is absent too.
 */
export interface BetaFeaturesToggleRowProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  isSaving?: boolean;
}

export function BetaFeaturesToggleRow({
  checked,
  onChange,
  isSaving,
}: BetaFeaturesToggleRowProps) {
  // WCAG 4.1.2: same pattern as GeneralSettings.tsx's local ToggleRow —
  // role="switch" is a plain div, not a native "labelable" element, so
  // the visible label/description are wired via
  // aria-labelledby/aria-describedby (APG switch pattern).
  const labelId = useId();
  const descId = useId();
  return (
    <div className="border-border dark:border-border flex items-center justify-between border-b py-3 last:border-0">
      <div>
        <p id={labelId} className="text-sm font-medium">
          Beta Features
        </p>
        <p id={descId} className="mt-0.5 text-xs text-neutral-700">
          Access experimental features before public release
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
