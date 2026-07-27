import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'high' | 'info' | 'neutral' | 'destructive' | 'default' | 'outline' | 'secondary';
  className?: string;
  icon?: React.ElementType;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', className = '', icon: Icon }) => {
  /**
   * WHY: `shadow-sm` is applied once in the base className below, so variant
   * strings no longer duplicate it. Previously success/warning/danger/high/info
   * all included `shadow-sm` redundantly — Tailwind merged them correctly but
   * it was misleading noise in every variant definition.
   */
  const variants: Record<NonNullable<BadgeProps['variant']>, string> = {
    success:     'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning:     'bg-amber-50 text-amber-700 border-amber-200',
    danger:      'bg-red-50 text-red-700 border-red-200',
    high:        'bg-orange-50 text-orange-700 border-orange-200',
    info:        'bg-blue-50 text-blue-700 border-blue-200',
    neutral:     'bg-secondary text-slate-700 border-border',
    // Aliases for compatibility
    destructive: 'bg-red-50 text-red-700 border-red-200',
    default:     'bg-secondary text-slate-700 border-border',
    secondary:   'bg-secondary text-slate-700 border-border',
    outline:     'bg-transparent border border-border text-slate-700',
  };

  return (
    <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-[0.1em] border shadow-sm ${variants[variant]} ${className}`}>
      {Icon && <Icon size={12} className="mr-1.5" />}
      {children}
    </span>
  );
};
