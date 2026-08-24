/**
 * Free-edition stub for SeoFixNonCompliantButton.tsx (ARS Round D, D-K-7,
 * WP.org R4 F-07). Wired via vite.config.ts's resolve.alias, active only
 * when EDITION === 'free'. Renders nothing — POST /seo/fix-noncompliant is
 * permanently Pro-only (class-swisswpsuite-api-seo-ai.php, physically
 * excluded from the Free zip), so this control has zero function in that
 * edition; per doctrine ("Free bundle must contain zero padlocked/dead
 * controls") it must be physically absent, not merely present-but-broken.
 */
interface SeoFixNonCompliantButtonProps {
  variant: "inline" | "primary";
  count?: number;
  onQueued: () => void;
}

export function SeoFixNonCompliantButton(
  _props: SeoFixNonCompliantButtonProps
) {
  return null;
}
