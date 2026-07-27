import React from 'react';
import { Loader } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ElementType;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center font-extrabold rounded-full transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-[0.15em] active:scale-95";

  const variants = {
    primary: "bg-swiss-navy text-white shadow-premium hover:shadow-[0_15px_30px_rgba(13,20,26,0.3)] border border-border/10",
    secondary: "bg-card dark:bg-secondary text-neutral-900 dark:text-foreground border border-border dark:border-border/10 shadow-soft hover:bg-background dark:hover:bg-card/10 hover:border-border dark:hover:border-border/20",
    danger: "bg-brand-accent/10 text-brand-accent border border-brand-accent/20 hover:bg-brand-accent hover:text-foreground dark:hover:text-foreground hover:shadow-glow-red",
    success: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-foreground dark:hover:text-foreground hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]",
    ghost: "bg-transparent dark:bg-transparent text-neutral-700 hover:text-neutral-900foreground dark:hover:text-foreground hover:bg-secondary dark:hover:bg-secondary",
    outline: "bg-transparent border border-border dark:border-border text-neutral-700  hover:bg-secondary dark:hover:bg-secondary"
  };

  const sizes = {
    sm: "px-4 py-2 text-xs",
    md: "px-6 py-3 text-[11px]",
    lg: "px-8 py-4 text-[12px]"
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        // WCAG 4.1.2: Loader is decorative — the button's visible text or
        // aria-label provides the accessible name. aria-hidden prevents NVDA
        // from enumerating an unnamed SVG inside the button.
        <Loader className="animate-spin mr-2" size={size === 'sm' ? 14 : 18} aria-hidden="true" />
      ) : Icon ? (
        // WCAG 4.1.2: All Button icons are decorative — the button label text
        // (or caller-provided aria-label) supplies the accessible name.
        <Icon className="mr-2" size={size === 'sm' ? 14 : 18} aria-hidden="true" />
      ) : null}
      {children}
    </button>
  );
};
