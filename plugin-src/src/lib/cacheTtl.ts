/**
 * Named cache TTL constants for TanStack Query staleTime and refetchInterval.
 *
 * These represent display-only reads of server-side state. Enforcement runs
 * server-side regardless of how often the admin view fetches. Every matching
 * mutation calls queryClient.invalidateQueries(...) so actions always reflect
 * immediately even when TTLs are long.
 *
 * v2.9.30.117 — introduced to eliminate per-tab raw fetch() re-fires.
 */

/** Security status reads — WAF, spam, geo, login toggles. 30 seconds. */
export const STATUS_TTL = 30_000;

/** Hardening options and environment (Cloudflare detection). 60 seconds. */
export const HARDENING_TTL = 60_000;

/** Security logs list. 20 seconds. */
export const LOGS_TTL = 20_000;

/** Dashboard site stats. 60 seconds. */
export const STATS_TTL = 60_000;

/** SMTP settings and environment. 120 seconds. */
export const SMTP_TTL = 120_000;

/** Cloud backup provider status. 120 seconds. */
export const CLOUD_TTL = 120_000;

/** UpdateGuard poll (snapshots + reviews change rarely). 5 minutes. */
export const UPDATE_GUARD_POLL = 300_000;
