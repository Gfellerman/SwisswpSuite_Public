/**
 * Shared display constants for Sentinel UI components.
 *
 * Both SentinelAttackChains and SentinelLayer1Findings need the same
 * severity-sort order and border-color mappings. Centralising them here
 * eliminates the DRY violation and ensures any future severity additions
 * are reflected everywhere at once.
 */

import type { SentinelAttackChain, SentinelLayer1Finding } from '../../../types';

// ─── Shared severity types ────────────────────────────────────────────────────

/** Severities used by SentinelAttackChain (no "info" level). */
type ChainSeverity = SentinelAttackChain['severity'];

/** Severities used by SentinelLayer1Finding (adds "info"). */
type FindingSeverity = SentinelLayer1Finding['severity'];

// ─── Sort orders ─────────────────────────────────────────────────────────────

/**
 * Numeric sort weight for chain severities.
 * Lower = sorted first (most severe first).
 */
export const CHAIN_SEVERITY_ORDER: Record<ChainSeverity, number> = {
  critical: 0,
  high:     1,
  medium:   2,
  low:      3,
};

/**
 * Numeric sort weight for finding severities (superset of chain severities).
 * Lower = sorted first (most severe first).
 */
export const FINDING_SEVERITY_ORDER: Record<FindingSeverity, number> = {
  critical: 0,
  high:     1,
  medium:   2,
  low:      3,
  info:     4,
};

// ─── Left border Tailwind classes ─────────────────────────────────────────────

/** `border-l-*` color class for each chain severity. */
export const CHAIN_SEVERITY_BORDER: Record<ChainSeverity, string> = {
  critical: 'border-l-red-500',
  high:     'border-l-orange-500',
  medium:   'border-l-amber-400',
  low:      'border-l-slate-300',
};

/**
 * `border-l-*` color class for each finding severity.
 * Adds `info` level which attack chains do not have.
 */
export const FINDING_SEVERITY_BORDER: Record<FindingSeverity, string> = {
  critical: 'border-l-red-500',
  high:     'border-l-orange-500',
  medium:   'border-l-amber-400',
  low:      'border-l-slate-300',
  info:     'border-l-blue-300',
};

// ─── Severity dot colors (chain-only) ─────────────────────────────────────────

/** Filled-dot background class for each chain severity (used in accordion headers). */
export const CHAIN_SEVERITY_DOT: Record<ChainSeverity, string> = {
  critical: 'bg-red-500',
  high:     'bg-orange-500',
  medium:   'bg-amber-400',
  low:      'bg-slate-300',
};
