/**
 * Authored by: Frontend Specialist
 * Skills: ui-ux-pro-max, tailwind-patterns, react-patterns, mobile-design
 * Date: 2026-02-17
 *
 * DashboardLayout Component
 * Responsive layout with collapsible sidebar and header.
 * Replaces legacy App.tsx layout.
 */

import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { ThemeToggle } from "../ThemeToggle";
import { isProEdition } from "../../lib/edition";
import {
  LayoutDashboard,
  Shield,
  Search,
  Database,
  PenTool,
  Settings as SettingsIcon,
  Menu,
  X,
  RefreshCw,
  PanelLeftClose,
  Key,
  Lock,
} from "lucide-react";

interface NavItemConfig {
  id: string;
  label: string;
  path: string;
  icon: React.ElementType;
  locked?: boolean;
}

export function DashboardLayout() {
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Gesture State
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchEndY, setTouchEndY] = useState<number | null>(null);

  // Load sidebar state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("swisswpsuite-sidebar-collapsed");
    if (saved) {
      setIsSidebarCollapsed(saved === "true");
    }
  }, []);

  // Persist sidebar state
  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem("swisswpsuite-sidebar-collapsed", String(newState));
  };

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Get capabilities from window context
  const license = window.swisswpsuiteData?.license;
  // Defensive: caps must be a flat string array. If PHP ever sends an object, degrade gracefully.
  const rawCaps = license?.capabilities;
  const caps: string[] = Array.isArray(rawCaps) ? rawCaps : [];
  const tierName = license?.tier_name || "FREE EDITION";
  const isTrial = window.swisswpsuiteData?.trial?.active;
  const isStandalone = !!window.swisswpsuiteData?.isStandalone;
  // Freemium Dual-Build (Phase 3): SEO and AI Content are MIXED/premium tabs
  // respectively. In the Free edition they must be reachable (never a
  // disabled-but-present nav item) so the page itself can show the free
  // content (SEO) or the upsell placeholder (AI Content) — see SeoManager.tsx
  // and AIContentPage.tsx. Capability-based locking (Pro edition, plan
  // lacks the feature) is unchanged.
  const isProEditionBuild = isProEdition();

  const allNavItems: NavItemConfig[] = [
    { id: "dashboard", label: "Dashboard", path: "/", icon: LayoutDashboard },
    { id: "security", label: "Security", path: "/security", icon: Shield },
    {
      id: "seo",
      label: "SEO",
      path: "/seo",
      icon: Search,
      locked: isProEditionBuild && !caps.includes("seo_meta"),
    },
    {
      id: "content-enhancer",
      label: "AI Content",
      path: "/ai-content",
      icon: PenTool,
      locked: isProEditionBuild && !caps.includes("content_rewrite"),
    },
    { id: "backups", label: "Backup", path: "/backups", icon: Database },
    {
      id: "settings",
      label: "Settings",
      path: "/settings",
      icon: SettingsIcon,
    },
  ];

  // When standalone mode is active, hide SEO and AI Content tabs (TD-4 fix)
  const navItems = isStandalone
    ? allNavItems.filter(
        (item) => item.id !== "seo" && item.id !== "content-enhancer"
      )
    : allNavItems;

  return (
    <div className="bg-bg-deep dark:text-foreground dark:bg-card selection:bg-swiss-red/20 selection:text-foreground flex min-h-screen overflow-hidden font-sans text-neutral-900 transition-colors duration-300">
      {/* Background Mesh Overlay - Visual Flair from Foundation */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="bg-brand-accent/5 absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full opacity-50 blur-[120px] dark:opacity-100" />
        <div className="absolute right-[-10%] bottom-[-10%] h-[40%] w-[40%] rounded-full bg-blue-500/5 opacity-50 blur-[120px] dark:opacity-100" />
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div
          className="bg-card/50 fixed inset-0 z-40 backdrop-blur-sm transition-opacity duration-300 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`bg-card dark:bg-card border-border dark:border-border/5 cubic-bezier(0.16, 1, 0.3, 1) fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r shadow-2xl transition-all duration-300 md:sticky md:top-0 md:h-screen ${isMobileMenuOpen ? "w-80 translate-x-0" : "-translate-x-full md:translate-x-0"} ${!isMobileMenuOpen && (isSidebarCollapsed ? "md:w-20" : "md:w-72 lg:w-80")} `}
        // Neo-Swiss Mobile Gesture: Swipe Left to Close
        onTouchStart={(e) => {
          const touch = e.touches[0];
          setTouchStart(touch.clientX);
          setTouchStartY(touch.clientY);
        }}
        onTouchMove={(e) => {
          // Optional: could add 'prevent default' logic here if we wanted to lock scroll,
          // but for a passive listener we just track end position.
          const touch = e.touches[0];
          setTouchEnd(touch.clientX);
          setTouchEndY(touch.clientY);
        }}
        onTouchEnd={() => {
          if (!touchStart || !touchEnd || !touchStartY || !touchEndY) return;

          const distanceX = touchStart - touchEnd;
          const distanceY = touchStartY - touchEndY;
          const isLeftSwipe = distanceX > 50; // Threshold 50px
          const isScroll = Math.abs(distanceY) > Math.abs(distanceX); // Vertical scroll protection

          if (isLeftSwipe && !isScroll && isMobileMenuOpen) {
            setIsMobileMenuOpen(false);
          }
          // Reset
          setTouchStart(null);
          setTouchEnd(null);
          setTouchStartY(null);
          setTouchEndY(null);
        }}
      >
        {/* Logo Area */}
        <div
          className={`flex h-24 items-center ${isSidebarCollapsed ? "justify-center" : "justify-between px-8"} border-border dark:border-border/5 bg-background/50 dark:bg-secondary border-b`}
        >
          <div className="flex items-center gap-4 overflow-hidden">
            <div className="bg-swiss-red/10 text-swiss-red border-swiss-red/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border">
              <Shield
                size={20}
                className="drop-shadow-sm"
                fill="currentColor"
              />
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col">
                <span className="dark:text-foreground text-lg leading-none font-extrabold tracking-tight text-neutral-900">
                  SWISS<span className="text-swiss-red">WP</span>
                </span>
                <span className="mt-1 items-center text-xs font-bold tracking-[0.2em] text-neutral-700 uppercase">
                  SECURE SUITE
                </span>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="dark:hover:text-foreground p-2 text-neutral-700 transition-colors hover:text-neutral-900 md:hidden"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="scrollbar-hide flex-1 space-y-1 overflow-y-auto px-4 py-8">
          {navItems.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === "/"} // Only match exact root for Dashboard
              onClick={() => setIsMobileMenuOpen(false)} // Close drawer on mobile
              className={({ isActive }) =>
                `group relative flex min-h-[44px] items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 ${
                  isActive
                    ? "bg-swiss-red/10 text-swiss-redred dark:text-foreground shadow-sm"
                    : "hover:bg-secondaryforeground dark:hover:text-foreground dark:hover:bg-secondary text-neutral-600 hover:text-neutral-900 dark:bg-transparent"
                } ${isSidebarCollapsed ? "justify-center px-2" : ""} ${item.locked ? "pointer-events-none cursor-not-allowed opacity-50 grayscale" : ""} `
              }
              title={isSidebarCollapsed ? item.label : ""}
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    size={20}
                    className={`shrink-0 transition-transform duration-300 ${isActive && !isSidebarCollapsed ? "scale-110" : "group-hover:scale-110"}`}
                  />

                  {!isSidebarCollapsed && (
                    <span className="text-sm font-semibold tracking-wide whitespace-nowrap">
                      {item.label}
                    </span>
                  )}

                  {!isSidebarCollapsed && item.locked && (
                    <Lock size={14} className="ml-auto opacity-50" />
                  )}

                  {/* Collapsed Tooltip */}
                  {isSidebarCollapsed && (
                    <div className="bg-card text-foreground dark:text-foreground pointer-events-none absolute left-full z-50 ml-4 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                      {item.label}
                    </div>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer / Collapse Toggle */}
        <div className="border-border dark:border-border/5 bg-background/50 dark:bg-secondary border-t p-4">
          <button
            onClick={toggleSidebar}
            className={`hover:bg-card dark:hover:text-foreground dark:hover:bg-secondary flex min-h-[44px] w-full items-center gap-3 rounded-xl px-4 py-3 text-neutral-700 transition-all duration-200 hover:text-neutral-900 dark:bg-transparent ${isSidebarCollapsed ? "justify-center" : ""}`}
          >
            <PanelLeftClose
              size={18}
              className={
                isSidebarCollapsed
                  ? "rotate-180 transition-transform duration-300"
                  : ""
              }
            />
            {!isSidebarCollapsed && (
              <span className="text-xs font-bold tracking-wider uppercase">
                Collapse
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="bg-background relative z-10 flex min-h-screen min-w-0 flex-1 flex-col overflow-hidden transition-colors duration-300">
        {/* Header */}
        <header className="bg-card/80 dark:bg-card/80 border-border dark:border-border/5 sticky top-0 z-30 flex h-20 items-center justify-between border-b px-6 backdrop-blur-md transition-all duration-300 lg:h-24 lg:px-12">
          {/* Left: Mobile Toggle & Title */}
          <div className="flex items-center gap-4 lg:gap-8">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="dark:hover:text-foreground -ml-2 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-neutral-700 transition-colors hover:text-neutral-900 md:hidden"
              aria-label="Open menu"
            >
              <Menu size={24} />
            </button>

            <div className="flex items-center gap-4">
              <div className="bg-swiss-red hidden h-8 w-1.5 rounded-full md:block" />
              <h1 className="dark:text-foreground text-xl font-bold tracking-tight text-neutral-900 uppercase lg:text-2xl">
                {navItems.find((item) => item.path === location.pathname)
                  ?.label || "SwissSuite"}
              </h1>
            </div>
          </div>

          {/* Right: Actions & Profile */}
          <div className="flex items-center gap-4 lg:gap-8">
            <ThemeToggle />

            {/* Core Integrity Indicator (Desktop) */}
            <div className="bg-card dark:bg-secondary border-border dark:border-border/10 hidden items-center gap-3 rounded-xl border px-4 py-2 lg:flex">
              <div className="relative flex h-3 w-3 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </div>
              <div className="flex flex-col">
                <span className="text-neutral-700foreground text-xs leading-none font-bold tracking-wider uppercase">
                  System Active
                </span>
              </div>
            </div>

            {/* Trial Badge */}
            {isTrial && (
              <div className="bg-swiss-red/10 text-swiss-red border-swiss-red/20 hidden rounded-lg border px-3 py-1 text-xs font-black tracking-wide uppercase sm:flex">
                Trial
              </div>
            )}

            {/* User Profile */}
            <div className="border-border dark:border-border/10 flex items-center gap-4 border-l pl-4">
              <div className="hidden flex-col items-end lg:flex">
                <span className="text-xs font-bold tracking-wider text-neutral-700 uppercase">
                  License Tier
                </span>
                <span className="dark:text-foreground text-xs font-black tracking-wide text-neutral-900 uppercase">
                  {tierName}
                </span>
              </div>

              <div className="bg-secondary dark:bg-card/10 dark:text-foreground hover:ring-swiss-red/50 flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-xs font-bold text-neutral-600 ring-2 ring-transparent transition-all">
                AD
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto scroll-smooth p-4 md:p-8 lg:p-12">
          <div className="animate-in fade-in slide-in-from-bottom-2 mx-auto max-w-7xl duration-500">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Global Toast Notifications — must live inside the layout, not index.tsx, to avoid chunk TDZ */}
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
