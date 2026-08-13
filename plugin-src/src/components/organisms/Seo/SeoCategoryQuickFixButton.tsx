/**
 * SeoCategoryQuickFixButton — the "Generate SEO for All (N)" /
 * "Generate Alt Text for All (N)" per-category quick-fix button shown
 * inside the (fully-free) SEO Health Check modal's category breakdown.
 *
 * Extracted out of SeoManager.tsx (2026-08-12, WP.org frontend
 * physical-exclusion sweep) so this Pro-only AI-generation action has a
 * real file boundary to alias away in the Free build. Even though its
 * parent (SeoManager.tsx) already gates this button on
 * `isProEditionBuild &&`, SeoManager.tsx itself is NOT aliasable — the
 * free, local SEO Health Check / Sitemap / llms.txt features must ship in
 * Free — so any Pro-only JSX/logic written inline there is still compiled
 * into the Free bundle regardless of the runtime gate (Rollup bundles a
 * statically-imported module's source whether or not a given branch ever
 * executes — see plugin/vite.config.ts's alias comment block).
 *
 * Self-contained: does its own fetch (list unoptimized ids for one content
 * type, then submit them to the background AI queue) rather than reusing
 * SeoAiWorkbench's internal `handleFastOptimizeAll`/`handleBackgroundQueue`
 * — those are private to that component and, being unrelated to a modal
 * that ships free-side, deliberately not shared across the Free/Pro
 * boundary this button sits on. Mirrors the same 2-step request shape
 * (`GET /content?...fields=ids` -> `POST /seo/submit-background`).
 *
 * Note: this replaces the previous behavior of calling
 * `handleFastOptimizeAll(targetType, { skipConfirm: true })`, which also
 * pre-selected the matching tab in the (now Pro-only, self-contained)
 * items table via `setActiveTab`. That tab pre-selection is not
 * reproduced here (SeoAiWorkbench's `activeTab` is now private/internal
 * state, not reachable from this modal) — a minor, deliberate UX trade-off
 * documented in docs/capabilities/SEO_CAPABILITIES_REFERENCE.md. The
 * queued items are still generated and still show up in
 * SeoAiWorkbench's background-queue banner regardless of which tab is
 * selected when the user next looks at it.
 */
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { ContentType } from "../../../types";

interface SeoCategoryQuickFixButtonProps {
  targetType: ContentType;
  actionableCount: number;
  /** Generic display name for the category ("Products", "Posts", ...) — also
   *  used unconditionally elsewhere in the (free) Health Check modal, so
   *  this alone carries no AI-specific meaning. */
  categoryLabel: string;
  /** Called after a successful queue submission (parent closes the Health Check modal). */
  onQueued: () => void;
}

export function SeoCategoryQuickFixButton({
  targetType,
  actionableCount,
  categoryLabel,
  onQueued,
}: SeoCategoryQuickFixButtonProps) {
  // Computed HERE (inside this aliased-away component), not by the caller —
  // SeoManager.tsx (which ships in Free) must never construct or hold this
  // AI-specific button copy itself, even as a prop value being passed to an
  // aliased child. Rollup still bundles a computed string literal at its
  // construction site regardless of what the receiving component does with
  // it (see this file's docblock / vite.config.ts's alias comment for the
  // general rule — this was found and fixed during this same extraction
  // after the first verification grep caught it in the Free build).
  const label =
    targetType === "image"
      ? `Generate Alt Text for All (${actionableCount})`
      : `Generate SEO for All ${categoryLabel} (${actionableCount})`;
  const ariaLabel = `Generate SEO for all ${categoryLabel} with missing metadata`;
  const [submitting, setSubmitting] = useState(false);
  const { apiUrl, nonce } = window.swisswpsuiteData || {};

  const handleClick = async () => {
    if (submitting || !apiUrl) return;
    setSubmitting(true);
    try {
      const idsRes = await fetch(
        `${apiUrl}/content?type=${targetType}&filter=unoptimized&fields=ids&limit=10000`,
        { headers: { "X-WP-Nonce": nonce } }
      );
      if (!idsRes.ok) throw new Error("Server error");
      const idsData = await idsRes.json();
      const ids: number[] = idsData.ids ?? [];
      if (ids.length === 0) {
        toast.error(
          targetType === "image"
            ? "No unoptimized items found."
            : "No unoptimized posts, pages, or products found."
        );
        return;
      }

      const res = await fetch(`${apiUrl}/seo/submit-background`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-WP-Nonce": nonce },
        body: JSON.stringify({
          ids,
          type: targetType,
          generate_faq: targetType !== "image",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          toast.error(data.message || "A background job is already running.");
        } else {
          throw new Error(data.message || "Server error");
        }
        return;
      }
      if (data.success) {
        toast.success(
          `Started! ${data.total} items are being processed. SEO titles, descriptions, and FAQs will be generated automatically. You can close this tab.`
        );
        if (data.dropped_count && data.dropped_count > 0) {
          toast.warning(
            `${data.dropped_count} items were not queued (per-batch limit is 500). They remain unoptimized — please run "Queue All" again to process them.`,
            { duration: 8000 }
          );
        }
        onQueued();
      } else {
        throw new Error(data.message || "Queue failed.");
      }
    } catch (e) {
      console.error(e);
      toast.error(
        (e instanceof Error ? e.message : null) ||
          "Failed to queue items. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={submitting}
      className="bg-brand-accent hover:bg-brand-accent/90 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-black tracking-widest text-white uppercase transition-all disabled:cursor-not-allowed disabled:opacity-50"
      aria-label={ariaLabel}
    >
      <Sparkles size={12} />
      {submitting ? "Queuing..." : label}
    </button>
  );
}
