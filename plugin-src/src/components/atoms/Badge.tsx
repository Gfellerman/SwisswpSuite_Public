/**
 * Neo-Swiss Badge Component
 * Authored by: Frontend Specialist
 * Skills used: react-patterns, tailwind-patterns
 * Date: 2026-02-16
 */

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default: "border-transparent bg-brand text-foreground dark:text-foreground hover:bg-brand/80",
                secondary:
                    "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
                destructive:
                    "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",

                // Semantic Variants (from tokens)
                success: "border-transparent bg-semantic-success text-foreground dark:text-foreground hover:bg-semantic-success/80",
                warning: "border-transparent bg-semantic-warning text-neutral-900 hover:bg-semantic-warning/80",
                danger: "border-transparent bg-semantic-danger text-foreground dark:text-foreground hover:bg-semantic-danger/80",
                info: "border-transparent bg-semantic-info text-foreground dark:text-foreground hover:bg-semantic-info/80",

                outline: "text-foreground border-border",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
