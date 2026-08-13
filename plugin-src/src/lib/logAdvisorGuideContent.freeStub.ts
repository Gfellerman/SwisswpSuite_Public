/**
 * FREE-EDITION-ONLY BUILD-TIME REPLACEMENT for lib/logAdvisorGuideContent.ts
 * (2FA setup guide text + the "Enable Geo-Lock" button label — both Pro-only
 * Log Advisor content; see the real file's docblock).
 *
 * `plugin/vite.config.ts` aliases the exact specifier
 * "../lib/logAdvisorGuideContent" (as written at SecurityHub.tsx's one call
 * site) to THIS file only when built with EDITION=free.
 *
 * The Log Advisor modal that reaches this content is gated
 * `isProEditionBuild && hasSecurity` and is therefore unreachable in the
 * Free build — this stub exists only to keep the real strings out of the
 * Free bundle's module graph, matching the shapes so SecurityHub.tsx's
 * call sites still typecheck.
 *
 * The TwoFactorGuideContent shape is intentionally re-declared here rather
 * than imported from "./logAdvisorGuideContent" — even a type-only import
 * is a same-directory relative specifier ("./logAdvisorGuideContent") that
 * is DIFFERENT from the exact string aliased in vite.config.ts
 * ("../lib/logAdvisorGuideContent", as written at SecurityHub.tsx's call
 * site), so it would not be caught by that alias and would resolve
 * straight to the real file. Matches the existing convention in
 * ApiConfig.freeStub.tsx / GeoLockdownCard.freeStub.tsx.
 */
interface TwoFactorGuideContent {
  what: string;
  why: string;
  how: string[];
}

export const TWO_FACTOR_GUIDE_CONTENT: TwoFactorGuideContent = {
  what: "",
  why: "",
  how: [],
};

export const GEO_LOCK_ACTION_LABEL = "";
