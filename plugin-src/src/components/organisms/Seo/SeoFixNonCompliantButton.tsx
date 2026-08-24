/**
 * SeoFixNonCompliantButton — "Re-Generate All" (inline link, per-section)
 * and "Re-Generate Descriptions (N)" (primary button, modal footer)
 * controls shown inside the (fully-free) SEO Health Check modal.
 *
 * Extracted out of SeoManager.tsx (ARS Round D, D-K-7, WP.org R4 F-07,
 * 2026-08-2x) — same rationale as the sibling extraction one directory
 * over, SeoCategoryQuickFixButton.tsx (2026-08-12): SeoManager.tsx itself
 * is NOT aliasable (it also carries the genuinely-free SEO Health Check /
 * Sitemap / llms.txt features), so a Pro-only fetch call written inline
 * there — unlike this button's siblings gated at :376 — was NOT even
 * runtime-gated by `isProEditionBuild`, meaning every genuine Free user
 * could click it and hit a 404 (POST /seo/fix-noncompliant is registered
 * only in class-swisswpsuite-api-seo-ai.php, a Pro-only file physically
 * excluded from the Free zip — see class-swisswpsuite-api-seo.php's own
 * docblock, D-I-1). Self-contained, own fetch/toast/loading state.
 *
 * Two call sites in the parent previously shared one `fixingNonCompliant`
 * boolean and one handler so both buttons' loading state stayed in sync.
 * As two separate instances of this component they now manage that state
 * independently — a minor, deliberate UX trade-off (each still correctly
 * queues the same backend action; the only change is that clicking one no
 * longer visually disables the other while in flight).
 */
import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "../../ui/Button";

interface SeoFixNonCompliantButtonProps {
  /** "inline" — small text link (per-section, next to "Description Too
   *  Short — Can Be Improved"). "primary" — full CTA button (modal
   *  footer summary). */
  variant: "inline" | "primary";
  /** Item count shown in the "primary" variant's label only. */
  count?: number;
  /** Called after a successful, non-empty queue submission (parent closes
   *  the Health Check modal so the user sees the background queue). */
  onQueued: () => void;
}

export function SeoFixNonCompliantButton({
  variant,
  count,
  onQueued,
}: SeoFixNonCompliantButtonProps) {
  const [fixing, setFixing] = useState(false);
  const { apiUrl, nonce } = window.swisswpsuiteData || {};

  const handleClick = async () => {
    if (!apiUrl || fixing) return;
    setFixing(true);
    try {
      const res = await fetch(`${apiUrl}/seo/fix-noncompliant`, {
        method: "POST",
        headers: {
          "X-WP-Nonce": nonce,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.count === 0) {
          toast.info(data.message);
        } else {
          toast.success(
            `${data.count} items queued for re-generation. New SEO descriptions will appear within ~${data.estimated_minutes} minutes.`
          );
          onQueued();
        }
      } else {
        toast.error(data.message || "Failed to start non-compliant fix.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to fix non-compliant items. Please try again.");
    } finally {
      setFixing(false);
    }
  };

  if (variant === "inline") {
    return (
      <button
        onClick={handleClick}
        disabled={fixing}
        className="hover:text-brand-accent flex items-center gap-1 text-xs font-black tracking-widest text-orange-700 uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      >
        <RefreshCw size={10} className={fixing ? "animate-spin" : ""} />
        {fixing ? "Queuing..." : "Re-Generate All"}
      </button>
    );
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleClick}
      loading={fixing}
      disabled={fixing}
      className="bg-brand-accent hover:bg-brand-accent/90 mt-3 rounded-xl border-none px-5 py-2 text-xs font-black tracking-widest text-white uppercase transition-all"
      icon={RefreshCw}
    >
      {fixing ? "Queuing..." : `Re-Generate Descriptions (${count ?? 0})`}
    </Button>
  );
}
