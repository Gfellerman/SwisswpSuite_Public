import type { ElementType } from "react";

/**
 * One sidebar destination contributed on top of the built-in ones in
 * `templates/DashboardLayout.tsx`.
 */
export interface ExtraNavItem {
  id: string;
  label: string;
  path: string;
  icon: ElementType;
}

/**
 * Extension point for sidebar entries, the counterpart of `EXTRA_ROUTES`.
 * This build ships no additional entries.
 */
export const EXTRA_NAV_ITEMS: ExtraNavItem[] = [];
