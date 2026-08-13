/**
 * Authored by: Frontend Specialist
 * Date: 2026-08-12
 *
 * WP.org round-3 remediation (frontend physical-exclusion sweep) —
 * FREE-EDITION-ONLY BUILD-TIME REPLACEMENT for
 * components/organisms/Seo/SeoCategoryQuickFixButton.tsx (Pro-only AI
 * bulk-generate quick-fix button shown inside the free SEO Health Check
 * modal).
 *
 * `plugin/vite.config.ts` aliases the exact specifier
 * "../../organisms/Seo/SeoCategoryQuickFixButton" (as written at
 * SeoManager.tsx's one call site) to THIS file only when built with
 * EDITION=free.
 *
 * SeoManager.tsx's call site is
 * `{isProEditionBuild && <SeoCategoryQuickFixButton .../>}` — renders
 * nothing rather than a placeholder, matching the existing pattern for
 * small inline Pro-only controls (see GeoLockdownCard.freeStub.tsx).
 */
interface SeoCategoryQuickFixButtonStubProps {
  targetType: unknown;
  actionableCount: number;
  categoryLabel: string;
  onQueued: () => void;
}

export function SeoCategoryQuickFixButton(
  _props: SeoCategoryQuickFixButtonStubProps
) {
  return null;
}
