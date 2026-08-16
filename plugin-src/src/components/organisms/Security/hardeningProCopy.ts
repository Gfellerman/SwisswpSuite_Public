/**
 * hardeningProCopy — Pro-only locked-toggle aria-label copy for
 * HardeningOptionsGrid.tsx
 *
 * WP.org compliance (2026-08-13, v2.9.33.18 census closure, R2a): the
 * "${label} — Pro required" aria-label template describes a Pro-gated
 * hardening toggle. Per the file's own header comment, this `!canInteract`
 * disabled-switch branch is currently provably dead in BOTH editions
 * (the backend no longer has a PRO_ONLY_OPTIONS concept — every option
 * reports `pro: false`, so `isEssential`/`canInteract` is always true) and
 * is kept only as a defensive fallback for a malformed `opt.pro` value.
 * Extracted anyway per string-presence doctrine, not reachability.
 */
export function lockedToggleAriaLabel(label: string): string {
  return `${label} — Pro required`;
}
