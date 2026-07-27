/**
 * Neo-Swiss Input Component
 * Authored by: Frontend Specialist
 * Skills used: react-patterns, tailwind-patterns, ui-ux-pro-max
 * Date: 2026-02-16
 */

import * as React from "react"
import { cn } from "../../lib/utils"

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, label, error, ...props }, ref) => {
        // Generate stable ID if not provided, for label association
        const id = props.id || React.useId();

        return (
            <div className="flex flex-col gap-1.5">
                {label && (
                    <label htmlFor={id} className="text-sm font-medium text-foreground">
                        {label}
                    </label>
                )}
                <input
                    id={id}
                    type={type}
                    className={cn(
                        "flex h-11 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                        error && "border-semantic-danger focus-visible:ring-semantic-danger",
                        className
                    )}
                    ref={ref}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${id}-error` : undefined}
                    {...props}
                />
                {error && (
                    <span id={`${id}-error`} className="text-xs text-semantic-danger">
                        {error}
                    </span>
                )}
            </div>
        )
    }
)
Input.displayName = "Input"

export { Input }
