/**
 * Dashboard Page — Phase 3 Migration Complete
 * Agent: debugger + backend-specialist
 * Wired to: Dashboard (full live component with charts, stats, animated counters)
 * Features: SEO score, threats blocked, last backup, traffic chart, quick actions grid, cache refresh
 *
 * Adapter: maps router `useNavigate` to legacy `onNavigate(ViewState)` prop
 */
import React from "react";
import { useNavigate } from "react-router-dom";
import Dashboard from "../components/Dashboard";
import type { ViewState } from "../types";

// Route map: ViewState -> hash router path
const VIEW_ROUTE_MAP: Record<ViewState, string> = {
  dashboard: "/",
  security: "/security",
  seo: "/seo",
  backups: "/backups",
  settings: "/settings",
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const handleNavigate = (view: ViewState) => {
    const route = VIEW_ROUTE_MAP[view] ?? "/";
    navigate(route);
  };

  return <Dashboard onNavigate={handleNavigate} />;
};

export default DashboardPage;
