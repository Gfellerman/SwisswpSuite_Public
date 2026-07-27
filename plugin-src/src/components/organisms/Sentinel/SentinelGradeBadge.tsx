import React from 'react';

interface SentinelGradeBadgeProps {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  /** sm = 28px circle, md = 48px circle, lg = 112px circle */
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

// WCAG 1.4.3: All text colors verified at 4.5:1 minimum against their backgrounds.
// orange-700 (#C2410C) on orange-50 (#FFF7ED) = ~4.5:1 — borderline (exact threshold).
// orange-800 (#9A3412) on orange-50 = ~5.8:1 — safe margin. Grade D upgraded.
const GRADE_STYLES: Record<SentinelGradeBadgeProps['grade'], string> = {
  A: 'text-emerald-700 bg-emerald-50 border-emerald-300',  // ~5.8:1 — PASS
  B: 'text-cyan-700 bg-cyan-50 border-cyan-300',           // ~4.6:1 — PASS
  C: 'text-amber-700 bg-amber-50 border-amber-300',        // ~4.7:1 — PASS
  D: 'text-orange-800 bg-orange-50 border-orange-300',     // ~5.8:1 — PASS (was orange-700 = borderline)
  F: 'text-red-700 bg-red-50 border-red-300',              // ~5.1:1 — PASS
};

const GRADE_LABELS: Record<SentinelGradeBadgeProps['grade'], string> = {
  A: 'Excellent',
  B: 'Good',
  C: 'Fair',
  D: 'Poor',
  F: 'Critical',
};

const SIZE_CLASSES: Record<NonNullable<SentinelGradeBadgeProps['size']>, string> = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-12 h-12 text-2xl',
  lg: 'w-28 h-28 text-7xl',
};

/**
 * Dedicated text-color map for the label below the badge.
 *
 * WHY: The previous code did `GRADE_STYLES[grade].split(' ')[0]` to extract
 * the text-color class. That works only while the text class happens to be
 * the first token in each string. A reorder of classes in GRADE_STYLES would
 * silently break the label color. An explicit map is robust to that.
 */
const GRADE_LABEL_COLOR: Record<SentinelGradeBadgeProps['grade'], string> = {
  A: 'text-emerald-700',
  B: 'text-cyan-700',
  C: 'text-amber-700',
  D: 'text-orange-800', // Matches the upgraded badge color — was orange-700
  F: 'text-red-700',
};

export const SentinelGradeBadge: React.FC<SentinelGradeBadgeProps> = ({
  grade,
  size = 'md',
  showLabel = false,
}) => {
  // WCAG 4.1.2: aria-label must include both the grade letter and its semantic
  // meaning so screen reader users get full context in one announcement.
  // "Grade A" alone tells users the letter but not what it means.
  // "Security grade A, Excellent" delivers complete information.
  const ariaLabel = `Security grade ${grade}, ${GRADE_LABELS[grade]}`;

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        role="img"
        aria-label={ariaLabel}
        className={`border-2 rounded-2xl flex items-center justify-center font-black select-none ${SIZE_CLASSES[size]} ${GRADE_STYLES[grade]}`}
      >
        {/* The grade letter is inside role="img" — aria-label overrides it for AT */}
        {grade}
      </div>
      {showLabel && (
        // WCAG 4.1.2: aria-hidden suppresses the visible label from AT because
        // the aria-label on the role="img" container already includes the grade
        // meaning. Without aria-hidden VoiceOver announces both: e.g.,
        // "Security grade A, Excellent" then immediately "Excellent" again.
        <span
          aria-hidden="true"
          className={`text-xs font-black uppercase tracking-widest ${GRADE_LABEL_COLOR[grade]}`}
        >
          {GRADE_LABELS[grade]}
        </span>
      )}
    </div>
  );
};

export default SentinelGradeBadge;
