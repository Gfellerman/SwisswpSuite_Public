/**
 * Authored by: Frontend Specialist
 * Skills: react-patterns, frontend-design, typescript-expert
 * Date: 2026-02-17
 *
 * React Router v7 Configuration
 * Uses HashRouter for WordPress admin compatibility
 *
 * Pages are statically imported. `vite.config.ts` builds this bundle as a
 * single JS file (`build.rollupOptions.output.inlineDynamicImports`), and a
 * static import keeps every route's module inside that one file with no
 * runtime loader involved at all — every enqueued script comes from
 * `wp_enqueue_script()` alone.
 */

import { createHashRouter, Navigate } from "react-router-dom";
import DashboardPage from "../pages/DashboardPage";
import SecurityPage from "../pages/SecurityPage";
import SeoPage from "../pages/SeoPage";
import BackupsPage from "../pages/BackupsPage";
import SettingsPage from "../pages/SettingsPage";

import { DashboardLayout } from "../components/templates/DashboardLayout";
import { EXTRA_ROUTES } from "./extraRoutes";

// Router configuration with HashRouter strategy
export const router = createHashRouter([
  {
    path: "/",
    element: <DashboardLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: "dashboard",
        element: <Navigate to="/" replace />,
      },
      {
        path: "security",
        element: <SecurityPage />,
      },
      {
        path: "seo",
        element: <SeoPage />,
      },
      {
        path: "backups",
        element: <BackupsPage />,
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
      ...EXTRA_ROUTES,
    ],
  },
]);
