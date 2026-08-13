/**
 * Authored by: Frontend Specialist
 * Skills: react-patterns, typescript-expert
 * Date: 2026-08-12, revised 2026-08-13
 *
 * WP.org round-3 remediation (frontend physical-exclusion sweep) —
 * FREE-EDITION-ONLY BUILD-TIME REPLACEMENT for
 * components/organisms/Security/GeoLockdownCard.tsx (geo-blocking
 * toggle, mode selector, country picker; Pro-only local feature — see
 * docs/architecture/FREEMIUM_DUAL_BUILD_ARCHITECTURE.md §2).
 *
 * `plugin/vite.config.ts` aliases the exact specifier
 * "./organisms/Security/GeoLockdownCard" (as written at
 * SecurityHub.tsx's one call site) to THIS file only when built with
 * EDITION=free. See TwoFactorSettings.freeStub.tsx / ApiConfig.freeStub.tsx
 * for the full Rollup static-import-elision writeup (identical mechanism).
 *
 * REVISED 2026-08-13: the real component now owns its geo-settings state
 * and API calls internally (fetchGeoSettings/saveGeoCountries moved out of
 * SecurityHub.tsx, see the real file's docblock) — this stub's prop shape
 * shrank to match (geoEnabled/hasSecurity/globalGeoBlock + 2 callbacks,
 * no more state/actions object). Re-declared here rather than imported
 * from "./GeoLockdownCard" for the same reason as before: importing from
 * that path — even a type-only import — creates a module-graph edge to
 * the real file, and Vite's alias only rewrites the exact specifier string
 * SecurityHub.tsx uses ("./organisms/Security/GeoLockdownCard"), not a
 * same-directory relative import written here.
 *
 * SecurityHub.tsx's call site is `{isProEditionBuild && (<GeoLockdownCard
 * .../>)}` — the page already carries one neutral FeaturePointer
 * (upsell redesign, 2026-08-04) covering the Free/no-edition case for this
 * card (see the "Upsell redesign" comment directly above the call site),
 * so this stub renders nothing rather than a second, redundant placeholder.
 */
interface GeoLockdownCardStubProps {
  geoEnabled: boolean;
  hasSecurity: boolean;
  globalGeoBlock: boolean;
  onToggleGeo: () => void;
  onToggleGlobalBlock: (checked: boolean) => void;
}

export function GeoLockdownCard(_props: GeoLockdownCardStubProps) {
  return null;
}
