/**
 * Utility: ClassName Merger
 * Authored by: Frontend Specialist
 * Skills used: react-patterns, tailwind-patterns
 * Date: 2026-02-16
 */

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}
