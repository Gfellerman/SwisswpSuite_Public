import React, { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { wpApi } from "../services/api";
import { STATS_TTL } from "../lib/cacheTtl";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ShieldCheck,
  HardDrive,
  TrendingUp,
  Activity,
  Zap,
  Globe,
  Terminal,
} from "lucide-react";
import { ViewState } from "../types";
import OnPageDiagnostics from "./organisms/Seo/OnPageDiagnostics";
import { useSettings } from "../hooks/useSettings";
import { DASHBOARD_EMPTY_STATE_DESCRIPTION } from "./dashboardProCopy";

interface DashboardProps {
  onNavigate: (view: ViewState) => void;
}

interface TrafficPoint {
  name: string;
  visits: number;
  blocked: number;
}

interface SeoBreakdown {
  on_page: number;
  technical: number;
  backlinks?: number;
  content: number;
}

interface Stats {
  seo_score: number;
  threats_blocked: number;
  last_backup: string;
  traffic_data: TrafficPoint[];
  seo_breakdown: SeoBreakdown;
  php_version?: string;
  memory_limit?: string;
}

// Animated counter hook
const useAnimatedCounter = (end: number, duration: number = 1000) => {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (end === 0) return;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min(
        (timestamp - startTimeRef.current) / duration,
        1
      );
      // Linear tech feel instead of easeOut for Obsidian
      const ease = progress;
      countRef.current = Math.floor(end * ease);
      setCount(countRef.current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
    return () => {
      startTimeRef.current = null;
    };
  }, [end, duration]);

  return count;
};

// Data Tile Component (Cyber-Swiss Style)
const DataTile = ({
  icon: Icon,
  label,
  value,
  loading,
  trend,
  colorClass = "text-foreground dark:text-foreground",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  loading: boolean;
  trend?: string;
  colorClass?: string;
}) => (
  <div className="glass-panel group border-border hover:border-swiss-navy/10 relative overflow-hidden border p-8">
    {/* Decorative Neon Glimmer */}
    <div className="bg-swiss-navy group-hover:bg-swiss-navy/10 absolute -top-10 -right-10 h-40 w-40 rounded-full blur-[80px] transition-all duration-700"></div>

    <div className="relative z-10 mb-6 flex items-start justify-between">
      <h3 className="group-hover:text-foreground dark:group-hover:text-foreground dark:hover:text-foreground text-xs font-black tracking-[0.4em] text-neutral-700 uppercase transition-colors">
        {label}
      </h3>
      <div className="bg-card dark:bg-secondary border-border dark:border-border/10 group-hover:bg-swiss-navy group-hover:text-foreground dark:group-hover:text-foreground dark:hover:text-foreground dark:text-foreground rounded-2xl border p-4 text-neutral-900 transition-all duration-500 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]">
        <Icon size={20} />
      </div>
    </div>

    <div
      className={`relative z-10 text-5xl font-black tracking-tighter ${colorClass}`}
    >
      {loading ? <span className="animate-pulse opacity-20">...</span> : value}
    </div>

    {trend && (
      <div className="relative z-10 mt-5 flex items-center gap-2">
        <span className="text-swiss-red bg-swiss-red/5 border-swiss-red/10 rounded-full border px-3 py-1 text-xs font-black tracking-[0.2em] uppercase">
          {trend}
        </span>
      </div>
    )}
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<Stats>({
    seo_score: 0,
    threats_blocked: 0,
    last_backup: "Never",
    traffic_data: [],
    seo_breakdown: { on_page: 0, technical: 0, content: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  // F-09 Option A (ARS Round B2, D4-2): distinguish "off by default" from
  // "on but no data yet" in the empty state below.
  const { settings } = useSettings();

  const animatedThreats = useAnimatedCounter(stats.threats_blocked, 1000);
  const animatedSeo = useAnimatedCounter(stats.seo_score, 1000);

  // v2.9.30.117: replaced raw fetch() useEffect with useQuery so repeated
  // tab-switches serve from cache (staleTime: STATS_TTL = 60 s) instead of
  // re-fetching on every mount.
  const { data: statsData, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["stats"],
    queryFn: () => wpApi<Stats>("/stats"),
    staleTime: STATS_TTL,
    enabled: !!window.swisswpsuiteData?.apiUrl,
  });

  useEffect(() => {
    if (statsData) {
      setStats(statsData);
      setHasData(true);
      setLoading(false);
    } else if (!statsLoading) {
      setLoading(false);
    }
  }, [statsData, statsLoading]);

  return (
    <div className="animate-in fade-in space-y-8 duration-700">
      {/* Welcome Banner - Cyber-Swiss Layout */}
      <div className="border-border flex flex-col justify-between gap-8 border-b pb-12 md:flex-row md:items-end">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <div className="bg-swiss-red h-1 w-12 shadow-[0_0_20px_rgba(213,43,30,0.2)]"></div>
            {/* ARS Round D (D-K-8, WP.org R4 N-05, 2026-08-2x): the "|| "
                fallback below was 27 versions stale ("2.9.6.4"); the real
                version always comes from window.swisswpsuiteData
                (server-injected on every page load) — the fallback is
                used only in the edge case where that global is missing or
                malformed, and must be re-bumped on future releases same
                as this fix bumped it now (a hardcoded fallback version
                drifts by construction — there is no mechanism keeping it
                in sync). */}
            <span className="text-swiss-red text-[12px] font-black tracking-[0.5em] uppercase">
              SwissSuite v{window.swisswpsuiteData?.version || "2.9.33.37"}
            </span>
          </div>
          <h2 className="text-foreground dark:text-foreground mb-6 text-7xl leading-none font-black tracking-tighter">
            SITE{" "}
            <span className="from-swiss-navy to-swiss-navy/40 bg-gradient-to-r bg-clip-text text-transparent">
              OVERVIEW
            </span>
          </h2>
          <p className="max-w-2xl text-lg leading-relaxed font-medium text-neutral-700">
            Your site health at a glance — security, backups, and SEO in one
            place.
          </p>
        </div>
        <div className="bg-background/50 border-border flex items-center gap-6 rounded-2xl border px-10 py-5 backdrop-blur-xl">
          <div className="relative">
            <div className="absolute inset-0 h-3 w-3 animate-ping rounded-full bg-emerald-500 opacity-75"></div>
            <div className="relative h-3 w-3 rounded-full bg-emerald-500"></div>
          </div>
          <span className="text-swiss-navy text-[12px] font-black tracking-[0.3em] uppercase">
            Plugin Active
          </span>
        </div>
      </div>

      {/* Primary Data Tiles */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <DataTile
          icon={ShieldCheck}
          label="Threats Blocked"
          value={
            loading ? "-" : hasData ? animatedThreats.toLocaleString() : "—"
          }
          loading={loading}
          trend={hasData ? "Based on last scan" : undefined}
          colorClass="text-swiss-navy"
        />
        <DataTile
          icon={HardDrive}
          label="Last Backup"
          value={loading ? "-" : hasData ? stats.last_backup : "No backup yet"}
          loading={loading}
          colorClass="text-swiss-navy"
        />
        <DataTile
          icon={TrendingUp}
          label="Overall SEO Score"
          value={loading ? "-" : hasData ? `${animatedSeo}%` : "—"}
          loading={loading}
          trend={hasData ? "Mean of on-page, technical & content" : undefined}
          colorClass="text-swiss-red"
        />
      </div>

      {/* Empty state — shown when no scan data is available yet */}
      {!loading && !hasData && (
        <div
          className="border-border bg-background/30 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-8 py-10"
          role="status"
          aria-label="No site data available"
        >
          <Activity size={32} className="text-neutral-400" />
          <p className="text-sm font-semibold text-neutral-500">
            No data yet — run your first scan to see results here.
          </p>
          <p className="max-w-md text-center text-xs text-neutral-400">
            {DASHBOARD_EMPTY_STATE_DESCRIPTION}
          </p>
        </div>
      )}

      {/* Upsell redesign (2026-08-04, design point 1): the dashboard-wide
          "SwissSuite AI Pro" ProUpsellPlaceholder card is removed — the
          dashboard is a mixed page with no single gated surface to point
          at, and the reviewers' checklist confines selling to the Settings
          screen. Full edition/module detail lives in Settings > Editions &
          AI (EditionsAiInfo.tsx), reachable from the sidebar at any time. */}

      {/* Action Grid */}
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {[
          {
            id: "security",
            label: "Run Security Scan",
            desc: "Scan for malware, blocked threats, and site vulnerabilities",
            icon: Zap,
          },
          {
            id: "seo",
            label: "Improve SEO",
            // ARS Round D (D-K-2, WP.org R4 F-01/F-07, 2026-08-2x): this
            // tile is unconditional (no edition gate) and used to say
            // "...with AI" — a promise the SEO page's matching action
            // cannot keep in Free (its AI-generation controls are Pro-only
            // and now physically absent there, see D-K-7). Reworded to
            // describe the genuinely-free SEO Health Check feature this
            // tile actually links to, in both editions.
            desc: "Check and improve titles, descriptions & alt text",
            icon: Globe,
          },
          {
            id: "backups",
            label: "Back Up Site",
            desc: "Save a copy of your site — restore it any time",
            icon: HardDrive,
          },
          {
            id: "settings",
            label: "View Logs",
            desc: "Activity logs, plugin settings & diagnostics",
            icon: Terminal,
          },
        ].map((action) => (
          <button
            key={action.id}
            onClick={() => onNavigate(action.id as ViewState)}
            className="group bg-background/50 border-border hover:border-swiss-navy/20 hover:bg-background relative flex flex-col items-center overflow-hidden rounded-[32px] border p-10 transition-all duration-500"
          >
            <div className="via-swiss-navy/10 absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>
            <div className="bg-card dark:bg-secondary border-border dark:border-border/10 group-hover:bg-swiss-navy group-hover:text-foreground dark:group-hover:text-foreground dark:hover:text-foreground dark:text-foreground mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border text-neutral-900 shadow-sm transition-all duration-500">
              <action.icon size={24} />
            </div>
            <span className="dark:text-foreground mb-2 text-[12px] font-black tracking-[0.2em] text-neutral-900 uppercase">
              {action.label}
            </span>
            <span className="text-center text-xs font-bold tracking-widest text-neutral-700">
              {action.desc}
            </span>
          </button>
        ))}
      </div>

      {/* Main Charts & Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Traffic chart */}
        <div className="glass-panel border-border relative rounded-3xl border p-10 lg:col-span-2">
          <div className="border-border mb-10 flex items-center justify-between border-b pb-6">
            <h3 className="text-swiss-navy text-[12px] font-black tracking-[0.4em] uppercase">
              Traffic This Week
            </h3>
            <div className="flex gap-6 text-xs font-black tracking-widest">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.2)]"></div>{" "}
                <span className="text-neutral-700">Visits</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]"></div>{" "}
                <span className="text-neutral-700">Blocked</span>
              </div>
            </div>
          </div>
          <div className="h-72 w-full">
            {stats.traffic_data.length === 0 ? (
              <div
                className="border-border flex h-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed"
                role="status"
                aria-label="No traffic data available"
              >
                <Activity size={28} className="text-neutral-300" />
                <p className="text-xs font-semibold text-neutral-400">
                  No traffic data yet
                </p>
                <p className="max-w-xs text-center text-xs text-neutral-300">
                  {settings?.pageviewTrackingEnabled === false
                    ? "Turn on Dashboard Traffic Counter in Settings to start counting visits."
                    : "Traffic data will appear here once the plugin has been monitoring your site for a few days."}
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={stats.traffic_data}>
                  <defs>
                    <linearGradient
                      id="colorVisits"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--color-swiss-cyan)"
                        stopOpacity={0.2}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-swiss-cyan)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient
                      id="colorBlocked"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--color-swiss-red)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-swiss-red)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="name"
                    stroke="rgba(13,20,26,0.1)"
                    fontSize={11}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "rgba(13,20,26,0.4)", fontWeight: 800 }}
                  />
                  <YAxis
                    stroke="rgba(13,20,26,0.1)"
                    fontSize={11}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "rgba(13,20,26,0.4)", fontWeight: 800 }}
                  />
                  <CartesianGrid
                    stroke="rgba(13,20,26,0.03)"
                    vertical={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid rgba(13,20,26,0.1)",
                      borderRadius: "20px",
                      padding: "20px",
                      color: "#0D141A",
                      boxShadow: "0 25px 50px rgba(13,20,26,0.1)",
                    }}
                    itemStyle={{
                      fontSize: "11px",
                      fontWeight: "900",
                      textTransform: "uppercase",
                      letterSpacing: "0.2em",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="visits"
                    stroke="#06B6D4"
                    strokeWidth={3}
                    fill="url(#colorVisits)"
                    dot={false}
                    strokeDasharray="3 3"
                  />
                  <Area
                    type="monotone"
                    dataKey="blocked"
                    stroke="#D52B1E"
                    strokeWidth={3}
                    fill="url(#colorBlocked)"
                    dot={{ r: 6, fill: "#D52B1E", strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* SEO Breakdown — On-Page Diagnostic */}
        {/* LiveQA §3.9 fix (DSH-07, 2026-08-04): was `tier !== "free"`, a
            case-sensitive compare against the live tier string "Free"
            (capital F) — always true, so the lock never rendered for
            anyone, Free included. This wasn't just a casing bug: the
            backend's actual gate for /seo/onpage-audit is the `seo_audit`
            capability, which is unconditionally granted to Free too (see
            SwissWPSuite_License::get_free_capabilities() and
            FREEMIUM_DUAL_BUILD_ARCHITECTURE.md §2) — a case-correct
            `tier.toLowerCase() !== "free"` would have wrongly RE-LOCKED a
            control the backend already permits for Free. Deriving from the
            capabilities array instead keeps this control's visible lock
            state permanently in sync with whatever the backend actually
            grants, free or paid. `?? true` preserves the prior fallback
            (unlocked) for the pre-bootstrap render when license data isn't
            loaded yet. */}
        <OnPageDiagnostics
          seoBreakdown={stats.seo_breakdown}
          isPro={
            window.swisswpsuiteData?.license?.capabilities?.includes(
              "seo_audit"
            ) ?? true
          }
        />
      </div>
    </div>
  );
};

export default Dashboard;
