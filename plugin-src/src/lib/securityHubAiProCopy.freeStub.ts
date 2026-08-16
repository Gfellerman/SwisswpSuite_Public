/**
 * Free-edition stub for securityHubAiProCopy.ts (WP.org string census
 * closure, 2026-08-13, R2a). Wired via vite.config.ts's resolve.alias,
 * active only when EDITION === 'free'.
 *
 * Neutral copy — no "Pro"/"upgrade"/"plan"/"license" wording — matching the
 * controller's example neutral rewording ("Not enough AI tokens for this
 * action."). These handlers are unreachable in a genuine Free install at
 * runtime (useTokenBalance's Free stub always returns canAfford()=true, and
 * the AI Log Advisor buttons are gated isProEditionBuild && hasSecurity), so
 * these values are never actually shown to a real Free user — but must not
 * compile in as Pro-descriptive text regardless (string-presence doctrine).
 */
export function tokenNeededMessage(
  _tokensStr: string,
  _balanceStr: string,
  _action?: string
): string {
  return "Not enough AI tokens for this action.";
}

export const TOKEN_EXHAUSTED_MESSAGE = "Not enough AI tokens for this action.";

export const LOG_ANALYSIS_FAILED_MESSAGE = "Log analysis failed.";

export const FIREWALL_ANALYSIS_FAILED_MESSAGE = "Firewall analysis failed.";
