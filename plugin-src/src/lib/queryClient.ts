/**
 * Authored by: Backend Specialist
 * Skills: typescript-expert, react-patterns
 * Date: 2026-02-17
 *
 * Query Client Configuration
 * Sets up global defaults for data fetching, caching, and retries.
 */

import { QueryCache, QueryClient, MutationCache } from '@tanstack/react-query';
import { isOwnScript, sendError } from './errorReporting';

// Time constants in milliseconds
const ONE_MINUTE = 60 * 1000;
const FIVE_MINUTES = 5 * ONE_MINUTE;

// ─── TANSTACK FAILED-CALL FORWARDING (audit gap: "failed API calls a ────────
// component doesn't render are logged nowhere") ─────────────────────────────
// QueryCache/MutationCache `onError` fire once a query/mutation has
// exhausted its configured retries and settled into a terminal error state
// (NOT once per individual retry attempt) — exactly the "TERMINAL failures
// (after retries)" this task asks for, with zero extra retry bookkeeping
// needed here.
//
// Same fail-closed attribution doctrine as index.tsx/errorReporting.ts:
// only forward when isOwnScript(error.stack) demonstrably matches this
// plugin's own asset URL. IMPORTANT residual: unlike window.onerror (which
// always carries a `source` script URL) or the ErrorBoundary (whose stack
// is guaranteed to originate in our bundle), a TanStack query/mutation
// error's `.stack` is whatever the underlying queryFn/mutationFn threw —
// for plain network failures (TypeError: Failed to fetch) or any error
// re-thrown without going through this plugin's own wpApi()/ApiError
// wrapper (services/api.ts), the stack may not reference our asset URL at
// all, or may be empty. The server (`log_js_error()` in
// class-swisswpsuite-api-settings.php) re-validates the same source/stack
// attribution independently and drops anything it can't attribute to this
// plugin's own SWISSWPSUITE_AI_URL — so a stackless or unattributable
// TanStack failure is *correctly* under-reported here rather than being
// forwarded with a fabricated source. This is the documented doctrine
// (under-reporting beats mislabeling), not a bug.

const MAX_FORWARDED_REPORTS_PER_LOAD = 5;
let forwardedReportCount = 0;
const seenSignatures = new Set<string>();

/**
 * Pure decision function: should this TanStack Query/Mutation terminal
 * failure be forwarded to the server error log?
 *
 * Four independent gates, ALL must pass:
 *  1. Self-reporting loop guard — never forward a failure of the
 *     `/debug/js-error` endpoint itself (checked against both the
 *     query/mutation key segment and the error message, since neither
 *     alone is guaranteed to carry the endpoint path).
 *  2. Per-page-load cap — at most MAX_FORWARDED_REPORTS_PER_LOAD reports,
 *     so an offline site or a flapping endpoint cannot spam POSTs.
 *  3. Dedupe — a (query-key-segment + message) signature already
 *     forwarded this page load is not forwarded again.
 *  4. Fail-closed attribution — isOwnScriptFn(stack) must pass (see the
 *     residual note above on why this under-reports for non-wpApi()
 *     failures by design).
 *
 * Factored out as a pure function (no I/O, does not itself mutate the cap
 * counter or dedupe set) so it is unit-testable in isolation — see
 * queryClient.test.ts.
 *
 * @param keySegment    First query-key/mutation-key segment (or a fallback
 *                      label when no key exists at all).
 * @param message       The error's message.
 * @param stack         The error's stack (empty string if unavailable).
 * @param isDuplicate   Whether (keySegment + message) was already
 *                      forwarded this page load.
 * @param countSoFar    Number of reports already forwarded this page load.
 * @param isOwnScriptFn Injected isOwnScript check (default: the real one),
 *                      exposed purely so tests can control the outcome
 *                      without faking window.swisswpsuiteData.
 * @return boolean
 */
export function shouldForwardTanStackError(
  keySegment: string,
  message: string,
  stack: string,
  isDuplicate: boolean,
  countSoFar: number,
  isOwnScriptFn: (source: string) => boolean = isOwnScript
): boolean {
  if (
    keySegment.toLowerCase().includes('js-error') ||
    message.includes('/debug/js-error')
  ) {
    return false;
  }

  if (countSoFar >= MAX_FORWARDED_REPORTS_PER_LOAD) return false;
  if (isDuplicate) return false;

  return isOwnScriptFn(stack);
}

// Extracts the first segment of a TanStack query/mutation key as a string
// label — used both for the endpoint self-exclusion check and the dedupe
// signature. Query keys in this codebase are string-array literals (e.g.
// ["security-status"]), but this defends against a non-string or missing
// first segment (e.g. an unkeyed mutation) rather than throwing.
function firstKeySegment(key: readonly unknown[] | undefined): string {
  if (!key || key.length === 0) return 'unknown';
  const first = key[0];
  return typeof first === 'string' ? first : String(first);
}

function forwardTanStackFailure(keySegment: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack || '' : '';
  const signature = `${keySegment}:${message}`;
  const isDuplicate = seenSignatures.has(signature);

  if (
    !shouldForwardTanStackError(
      keySegment,
      message,
      stack,
      isDuplicate,
      forwardedReportCount
    )
  ) {
    return;
  }

  seenSignatures.add(signature);
  forwardedReportCount += 1;

  sendError({
    type: 'tanstack-query',
    message: `${message} | key: ${keySegment}`,
    source: '',
    lineno: 0,
    colno: 0,
    stack,
  });
}

export const queryClient = new QueryClient({
    queryCache: new QueryCache({
        onError: (error, query) => {
            forwardTanStackFailure(firstKeySegment(query.queryKey), error);
        },
    }),
    mutationCache: new MutationCache({
        onError: (error, _variables, _context, mutation) => {
            const keySegment = mutation.options.mutationKey
                ? firstKeySegment(mutation.options.mutationKey)
                : 'mutation';
            forwardTanStackFailure(keySegment, error);
        },
    }),
    defaultOptions: {
        queries: {
            // Default caching strategy: 5 minutes for general data (settings, etc.)
            staleTime: FIVE_MINUTES,

            // Minimize refetches to save server resources
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,

            // Retry logic: 3 attempts with exponential backoff (handled by default)
            retry: 3,

            // Error handling: Could add global error boundary logic here if needed,
            // but usually better handled at the UI layer or via mutation callbacks.
        },
        mutations: {
            // Mutations usually shouldn't retry automatically unless idempotent
            retry: 1,
        },
    },
});
