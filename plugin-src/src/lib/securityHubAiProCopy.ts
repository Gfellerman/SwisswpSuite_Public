/**
 * securityHubAiProCopy — Pro-only AI-analysis toast/error copy for
 * SecurityHub.tsx
 *
 * WP.org compliance (2026-08-13, v2.9.33.18 census closure, R2a): token-gate
 * and failure-message strings from SecurityHub.tsx's AI-analysis handlers
 * (handleTriggerScan's deep-malware pre-flight check, handleAiAnalyze,
 * handleAnalyzeLogs, handleAnalyzeFirewall). Extracted so vite.config.ts can
 * alias this module away in the Free build — same mechanism as
 * lib/logAdvisorGuideContent.ts (2026-08-12). These handlers are themselves
 * largely unreachable in Free at runtime (gated by isProEditionBuild/
 * hasSecurity at their button call sites, or by useTokenBalance's Free stub
 * always returning canAfford()=true so the token-gate branches never fire)
 * but SecurityHub.tsx is a shared, always-compiled file, so the literal
 * strings shipped into the Free bundle regardless.
 */
export function tokenNeededMessage(
  tokensStr: string,
  balanceStr: string,
  action?: string
): string {
  const actionPart = action ? ` ${action}` : "";
  return `Need ~${tokensStr} tokens${actionPart} (balance: ${balanceStr}). Purchase more tokens or upgrade your plan.`;
}

export const TOKEN_EXHAUSTED_MESSAGE =
  "Token balance exhausted. Purchase more tokens or upgrade your plan.";

export const LOG_ANALYSIS_FAILED_MESSAGE =
  "Log analysis failed — ensure you have security logs and a Pro license.";

export const FIREWALL_ANALYSIS_FAILED_MESSAGE =
  "Firewall analysis failed — ensure you have blocked requests and a Pro license.";
