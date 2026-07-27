import React from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils'; // Assuming utils exists, standard in this project

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
    label?: string;
    error?: string;
    helperText?: string;
    options?: SelectOption[];
    fullWidth?: boolean;
    leftIcon?: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({
        className,
        label,
        error,
        helperText,
        options = [],
        fullWidth = false,
        leftIcon,
        children,
        disabled,
        ...props
    }, ref) => {

        // Determine input styles based on state
        const baseStyles = "w-full appearance-none rounded-xl border bg-card px-3 py-2 text-sm ring-offset-white transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 dark:border-border/10 dark:bg-secondary dark:text-foreground dark:ring-offset-neutral-950 dark:placeholder:text-neutral-700";

        const stateStyles = error
            ? "border-red-500 focus:ring-red-500 text-red-900 placeholder-red-300"
            : "border-border focus:border-border focus:ring-neutral-400 dark:focus:ring-white/20";

        const heightStyles = "h-11"; // 44px minimum

        return (
            <div className={cn("space-y-1.5", fullWidth && "w-full", className)}>
                {label && (
                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-700foreground ml-1">
                        {label}
                    </label>
                )}

                <div className="relative">
                    {leftIcon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-700 pointer-events-none">
                            {leftIcon}
                        </div>
                    )}

                    <select
                        ref={ref}
                        className={cn(
                            baseStyles,
                            stateStyles,
                            heightStyles,
                            leftIcon && "pl-10",
                            "pr-10" // Space for chevron
                        )}
                        disabled={disabled}
                        {...props}
                    >
                        {options.length > 0 ? (
                            options.map((opt) => (
                                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                                    {opt.label}
                                </option>
                            ))
                        ) : children}
                    </select>

                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-700">
                        <ChevronDown size={16} />
                    </div>
                </div>

                {helperText && !error && (
                    <p className="text-xs text-neutral-700foreground ml-1 font-medium">
                        {helperText}
                    </p>
                )}

                {error && (
                    <div className="flex items-center gap-1.5 ml-1 text-red-500 animate-in slide-in-from-left-1 fade-in duration-200">
                        <AlertCircle size={12} />
                        <span className="text-xs font-medium">{error}</span>
                    </div>
                )}
            </div>
        );
    }
);

Select.displayName = 'Select';
