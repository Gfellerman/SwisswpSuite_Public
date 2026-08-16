/**
 * HardeningOptionsGrid — extracted from SecurityHub.tsx (HIGH-36)
 *
 * v2.9.14.0 redesign:
 *   - Three-tier layout: "Protect My Site" (essential) + "Advanced Controls" (collapsed)
 *   - Three-way risk color: low=green / medium=amber / high=red
 *   - Risk label text: "Safe for all sites" / "Check compatibility" / "Read before enabling"
 *   - Confirmation dialog integration: intercepts toggle before calling onToggle
 *     when the option has requires_confirmation===true and the user is enabling it.
 *   - Backward-compat: uses `opt.tier ?? 'essential'` fallback when server omits tier
 *
 * Owner decision #4 (2026-07-17): this component now also renders in the
 * FREE edition (previously the whole panel was swapped for a
 * ProUpsellPlaceholder at the SecurityHub.tsx call site). Note: the
 * "essential vs advanced" SECTION grouping (opt.tier, below) is a separate
 * axis from the free/Pro-locked INTERACTIVITY gate (isEssential) — they
 * usually agree but are not guaranteed to.
 *
 * WP.org round-3 remediation (Sprint W2/T7, 2026-07-26): the 2026-07-17
 * "6 free / 7 Pro-locked" split was itself flagged as trialware — the
 * backend (class-swisswpsuite-hardening.php) no longer has a
 * PRO_ONLY_OPTIONS concept at all; every option now reports `pro: false`.
 * Section 2 ("Advanced Controls") used to swap to a `ProUpsellPlaceholder`
 * whenever the caller lacked `hasSentinelPro` — that swap is REMOVED here:
 * per-card gating (`isEssential`, below) already auto-unlocks every option
 * now that `opt.pro` is uniformly false, so showing an upgrade placeholder
 * over a section that works for everyone would itself be the "still
 * locked" misrepresentation Guideline 9 flags in reverse. The `hasSentinelPro`
 * prop is kept (not removed) purely as the pre-existing defensive fallback
 * inside `isEssential` for the rare case a caller's `opt.pro` is missing
 * (not a boolean) — see that logic below.
 */
import React, { useState } from "react";
import { ChevronDown, ChevronUp, Lock } from "lucide-react";
import { Button } from "../../ui/Button";
import { HardeningOption, PreToggleCheckResult } from "../../../types";
import { HardeningConfirmDialog } from "./HardeningConfirmDialog";
import { FREE_HARDENING_KEYS } from "../../../constants/hardening";
import { lockedToggleAriaLabel } from "./hardeningProCopy";

// ---------------------------------------------------------------------------
// Risk helpers
// ---------------------------------------------------------------------------
function getRiskColor(risk: string | undefined): string {
  if (risk === "high") return "text-red-600";
  if (risk === "medium") return "text-amber-700";
  return "text-emerald-600";
}

function getRiskLabel(risk: string | undefined): string {
  if (risk === "high") return "Read before enabling";
  if (risk === "medium") return "Check compatibility";
  return "Safe for all sites";
}

// ---------------------------------------------------------------------------
// HardeningOptionCard (internal)
// ---------------------------------------------------------------------------
interface HardeningOptionCardProps {
  opt: HardeningOption;
  isPro: boolean;
  isLoading: boolean;
  /** Called by the card when it determines the toggle is safe to apply immediately. */
  onToggleImmediate: (key: string, value: boolean) => void;
  /** Called by the card when it needs the parent to run a pre-toggle check first. */
  onToggleWithCheck: (key: string, value: boolean) => void;
}

const HardeningOptionCard: React.FC<HardeningOptionCardProps> = ({
  opt,
  isPro,
  isLoading,
  onToggleImmediate,
  onToggleWithCheck,
}) => {
  // Prefer the API's per-option `pro` flag once the backend populates it
  // (owner decision #4, 2026-07-17); fall back to the static free-tier key
  // list until then. Same backward-compat idiom as the `tier` fallback above.
  const isEssential =
    typeof opt.pro === "boolean"
      ? !opt.pro
      : FREE_HARDENING_KEYS.includes(opt.key);
  const canInteract = isEssential || isPro;
  const riskColor = getRiskColor(opt.risk);
  const riskLabel = getRiskLabel(opt.risk);

  const handleToggle = () => {
    if (isLoading) return;
    // Upsell redesign (2026-08-04, T4): the `!canInteract` defensive
    // toast.error("...requires SwissSuite AI Pro.", {action: "Upgrade to
    // Pro"}) fallback that used to live here is REMOVED — provably dead in
    // both editions. The backend (class-swisswpsuite-hardening.php) no
    // longer has a PRO_ONLY_OPTIONS concept; every option reports
    // `pro: false` uniformly (see the Sprint W2/T7 note in this file's
    // header comment), so `isEssential` (and therefore `canInteract`) is
    // always true and this branch never executed. `canInteract` itself is
    // kept (styling/rendering below still reference it as a defensive
    // fallback for a malformed `opt.pro`), only the marketing-copy toast
    // branch is removed.
    const nextValue = !opt.enabled;
    // Only intercept ENABLING a requires_confirmation option.
    // Disabling is always safe — no confirmation needed.
    if (nextValue && opt.requires_confirmation) {
      onToggleWithCheck(opt.key, nextValue);
    } else {
      onToggleImmediate(opt.key, nextValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <div
      className={`glass-panel premium-card group relative overflow-hidden rounded-2xl p-6 ${!canInteract ? "opacity-60" : ""}`}
    >
      <div className="mb-6 flex items-start justify-between">
        <div
          className={`rounded-2xl p-3 ${opt.enabled && canInteract ? "bg-swiss-navy/10 text-swiss-navy" : "bg-background text-neutral-700"}`}
        >
          <Lock size={20} aria-hidden="true" />
        </div>
        {canInteract ? (
          <div
            role="switch"
            aria-checked={opt.enabled}
            aria-label={`Toggle ${opt.label}`}
            aria-busy={isLoading}
            tabIndex={0}
            className={`h-6 w-12 cursor-pointer rounded-full p-1 ring-1 transition-all duration-300 ring-inset ${opt.enabled ? "bg-green-500 ring-green-600" : "bg-red-500 ring-red-600"}`}
            onClick={handleToggle}
            onKeyDown={handleKeyDown}
          >
            <div
              className="h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-300"
              style={{
                transform: opt.enabled ? "translateX(1.5rem)" : "translateX(0)",
              }}
            />
          </div>
        ) : (
          <div
            role="switch"
            aria-checked={false}
            aria-label={lockedToggleAriaLabel(opt.label)}
            aria-disabled="true"
            tabIndex={0}
            className="h-6 w-12 cursor-not-allowed rounded-full bg-neutral-300 p-1 ring-1 ring-neutral-400 transition-all duration-300 ring-inset"
            onClick={handleToggle}
            onKeyDown={handleKeyDown}
          >
            <div
              className="h-4 w-4 rounded-full bg-white shadow-sm"
              style={{ transform: "translateX(0)" }}
            />
          </div>
        )}
      </div>
      <h4 className="text-swiss-navy mb-2 flex items-center gap-2 text-xs font-black tracking-widest uppercase">
        {opt.label}
        {!canInteract && (
          <Lock
            size={10}
            className="shrink-0 text-neutral-400"
            aria-hidden="true"
          />
        )}
      </h4>
      <p className="mb-4 text-sm leading-relaxed font-medium text-neutral-700">
        {opt.description}
      </p>
      <div className="border-border mt-auto flex items-center justify-between border-t pt-4">
        <span className="text-xs font-black tracking-widest text-neutral-700 uppercase">
          Risk Mitigation
        </span>
        <span
          className={`text-xs font-black tracking-widest uppercase ${riskColor}`}
        >
          {riskLabel}
        </span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// HardeningOptionsGrid (public)
// ---------------------------------------------------------------------------
interface HardeningOptionsGridProps {
  options: HardeningOption[];
  hasSentinelPro: boolean;
  isLoading: boolean;
  onToggle: (key: string, value: boolean) => void;
  onApplyAll: () => void;
}

export const HardeningOptionsGrid: React.FC<HardeningOptionsGridProps> = ({
  options,
  hasSentinelPro,
  isLoading,
  onToggle,
  onApplyAll,
}) => {
  // -------------------------------------------------------------------------
  // Advanced section collapse state — collapsed by default per spec (5a)
  // -------------------------------------------------------------------------
  const [showAdvanced, setShowAdvanced] = useState(false);

  // -------------------------------------------------------------------------
  // Pending toggle state — holds the option + pre-check result that needs
  // user confirmation before onToggle is called. null = no dialog open.
  // -------------------------------------------------------------------------
  const [pendingToggle, setPendingToggle] = useState<{
    option: HardeningOption;
    preToggleData: PreToggleCheckResult;
  } | null>(null);

  // -------------------------------------------------------------------------
  // Three-tier split:
  //   tier === 'essential'   → "Protect My Site" (always visible)
  //   tier === 'advanced'    → "Advanced Controls" (collapsible)
  //   tier undefined         → fall back to FREE_HARDENING_KEYS membership
  //                            (backward-compat — W3 from plan audit)
  // -------------------------------------------------------------------------
  const essentialOptions = options.filter((opt) => {
    const tier =
      opt.tier ??
      (FREE_HARDENING_KEYS.includes(opt.key) ? "essential" : "advanced");
    return tier === "essential";
  });

  const advancedOptions = options.filter((opt) => {
    const tier =
      opt.tier ??
      (FREE_HARDENING_KEYS.includes(opt.key) ? "essential" : "advanced");
    return tier === "advanced";
  });

  // -------------------------------------------------------------------------
  // handleToggleWithCheck — fires a pre-toggle check against the API and
  // either opens the confirmation dialog or falls through to onToggle.
  // Called by a card that has requires_confirmation===true.
  // -------------------------------------------------------------------------
  const handleToggleWithCheck = async (key: string, value: boolean) => {
    const opt = options.find((o) => o.key === key);
    if (!opt) return;

    try {
      const apiUrl =
        window.swisswpsuiteData?.apiUrl || "/wp-json/swisswpsuite/v1";
      const nonce = window.swisswpsuiteData?.nonce || "";

      const res = await fetch(`${apiUrl}/hardening/pre-toggle-check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": nonce,
        },
        body: JSON.stringify({ option: key }),
      });

      if (!res.ok) {
        // Server error — fall through and allow toggle without confirmation
        // (fail-open: better to let user proceed than silently block)
        onToggle(key, value);
        return;
      }

      const checkResult: PreToggleCheckResult = await res.json();

      if (checkResult.requires_confirmation) {
        setPendingToggle({ option: opt, preToggleData: checkResult });
        // Do NOT call onToggle here — wait for dialog confirm
        return;
      }
    } catch {
      // Network or parse error — fail-open: allow toggle without confirmation
    }

    // Pre-check completed and no confirmation needed (or failed safely)
    onToggle(key, value);
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 space-y-8">
      {/* -------------------------------------------------------------------- */}
      {/* Header row                                                             */}
      {/* -------------------------------------------------------------------- */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-swiss-navy text-xl font-black tracking-tight uppercase">
            System Hardening
          </h3>
          <p className="mt-1 text-sm font-black tracking-widest text-neutral-700 uppercase">
            Strengthen your WordPress security settings
          </p>
        </div>
        <Button
          variant="primary"
          onClick={onApplyAll}
          disabled={isLoading}
          className="bg-swiss-navy text-foreground dark:text-foreground hover:bg-brand-accent rounded-xl border-none px-6 text-sm font-black tracking-widest uppercase"
        >
          {/* WP.org round-3 (Sprint W2/T7): the label used to vary by
              hasSentinelPro, but /hardening/apply-all always applies every
              option — all 13 are free/functional now, so the copy must say
              what actually happens for every caller, not just Pro. */}
          Apply All Recommended Settings
        </Button>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Section 1: Protect My Site (essential options, always visible)         */}
      {/* -------------------------------------------------------------------- */}
      <div className="mb-8">
        <h4 className="text-foreground mb-4 text-xs font-black tracking-widest uppercase">
          Protect My Site
        </h4>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {essentialOptions.map((opt) => (
            <HardeningOptionCard
              key={opt.key}
              opt={opt}
              isPro={hasSentinelPro}
              isLoading={isLoading}
              onToggleImmediate={onToggle}
              onToggleWithCheck={handleToggleWithCheck}
            />
          ))}
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Section 2: Advanced Controls (collapsed by default)                   */}
      {/* -------------------------------------------------------------------- */}
      {advancedOptions.length > 0 && (
        <div className="pb-20">
          {/* Collapsible header — acts as a toggle trigger */}
          <button
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
            aria-expanded={showAdvanced}
            aria-controls="hardening-advanced-section"
            className="text-foreground hover:text-swiss-navy group mb-4 flex w-full items-center justify-between text-xs font-black tracking-widest uppercase transition-colors"
          >
            <span className="flex items-center gap-2">Advanced Controls</span>
            <span className="group-hover:text-swiss-navy text-neutral-400 transition-colors">
              {showAdvanced ? (
                <ChevronUp size={16} aria-hidden="true" />
              ) : (
                <ChevronDown size={16} aria-hidden="true" />
              )}
            </span>
          </button>

          {showAdvanced && (
            <div
              id="hardening-advanced-section"
              role="region"
              aria-label="Advanced hardening controls"
              className="animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {advancedOptions.map((opt) => (
                  <HardeningOptionCard
                    key={opt.key}
                    opt={opt}
                    isPro={hasSentinelPro}
                    isLoading={isLoading}
                    onToggleImmediate={onToggle}
                    onToggleWithCheck={handleToggleWithCheck}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* Confirmation dialog — rendered at grid root so it shows regardless    */}
      {/* of which section triggered it.                                        */}
      {/* -------------------------------------------------------------------- */}
      <HardeningConfirmDialog
        isOpen={pendingToggle !== null}
        option={pendingToggle?.option ?? null}
        preToggleData={pendingToggle?.preToggleData ?? null}
        onConfirm={() => {
          if (pendingToggle) {
            onToggle(pendingToggle.option.key, true);
          }
          setPendingToggle(null);
        }}
        onCancel={() => setPendingToggle(null)}
      />
    </div>
  );
};
