/**
 * Free-edition stub for hardeningProCopy.ts (WP.org string census closure,
 * 2026-08-13, R2a). Wired via vite.config.ts's resolve.alias, active only
 * when EDITION === 'free'.
 *
 * Returns the option's own label unchanged — no "Pro required" suffix. The
 * disabled/aria-disabled/aria-checked=false attributes already on this
 * switch (see HardeningOptionsGrid.tsx) convey the locked state to
 * assistive tech without naming Pro.
 */
export function lockedToggleAriaLabel(label: string): string {
  return label;
}
