/**
 * CloudShieldPanel — Cloud Protection Advisor (passive, advisory-only)
 *
 * Three states:
 *   A: Cloudflare NOT detected — shows intro, setup guide, recommended settings
 *   B: Cloudflare detected — green status, active optimizations, security score
 *   C: Setup in progress — waiting state (localStorage flag)
 *
 * IMPORTANT: This component makes ZERO API calls to Cloudflare.
 * It reads ONLY from props (existing environment/scan data).
 * No tokens stored, no settings changed, no legal liability.
 */
import React, { useState, useEffect } from "react";
import {
  Shield,
  ShieldCheck,
  Globe,
  ExternalLink,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Badge } from "../../ui/Badge";
import { isProEdition } from "../../../lib/edition";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CloudShieldPanelProps {
  /** Whether Cloudflare headers were detected in the environment */
  cloudflareDetected: boolean;
  /** Whether CF-Connecting-IP header is present */
  cloudflareConnectingIp: boolean;
  /** Whether CF-IPCountry header is present */
  cloudflareCountryHeader: boolean;
  /** Current hardening options status */
  headersActive: boolean;
  wafActive: boolean;
  botBlockingActive: boolean;
  versionHidingActive: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SETUP_FLAG_KEY = "swisswpsuite_cf_setup_pending";

const RECOMMENDED_SETTINGS = [
  {
    title: "SSL/TLS Mode",
    value: "Full (Strict)",
    why: "Encrypts traffic end-to-end between visitors, Cloudflare, and your server.",
  },
  {
    title: "Always Use HTTPS",
    value: "On",
    why: "Redirects all HTTP requests to HTTPS automatically.",
  },
  {
    title: "Browser Integrity Check",
    value: "On",
    why: "Blocks visitors with suspicious browser signatures (common in bots).",
  },
  {
    title: "Bot Fight Mode",
    value: "On",
    why: "Challenges automated traffic that does not come from verified bots like Google.",
  },
  {
    title: "Security Level",
    value: "Medium or High",
    why: "Sets the threshold for Cloudflare to challenge suspicious visitors.",
  },
  {
    title: "Under Attack Mode",
    value: "Off (enable during attacks)",
    why: "Shows a challenge page to all visitors. Only enable when actively under attack.",
  },
];

/**
 * Tier 2 fix: geo-blocking is Pro-only and physically absent from the Free
 * zip, so "Country detection" (whose entire value proposition is powering
 * geo-blocking) and the geo-blocking clause in "Real visitor tracking" are
 * factually wrong advisory copy in Free — this panel renders unconditionally
 * in both editions (SecurityHub.tsx has no isProEditionBuild gate on it).
 * Returned as a function (rather than a static const) so the component can
 * filter/adjust per edition at render time.
 */
function getActiveOptimizations(isPro: boolean) {
  const items = [
    {
      label: "Real visitor tracking",
      description: isPro
        ? "Your firewall sees the real visitor IP, not the Cloudflare proxy IP. Geo-blocking and IP bans work accurately."
        : "Your firewall sees the real visitor IP, not the Cloudflare proxy IP, so IP bans and rate limiting work accurately.",
    },
    {
      label: "Country detection",
      description:
        "Instant country lookup from Cloudflare headers. No external API calls needed for geo-blocking.",
    },
    {
      label: "DDoS protection at edge",
      description:
        "Volumetric attacks are absorbed by Cloudflare before they reach your server.",
    },
    {
      label: "Trusted proxy recognition",
      description:
        "SwissSuite recognizes all 16 Cloudflare IP ranges as trusted proxies for accurate rate limiting.",
    },
  ];
  // "Country detection" only matters for geo-blocking, which is Pro-only —
  // drop it entirely in Free rather than describe a feature that doesn't run.
  return isPro ? items : items.filter((i) => i.label !== "Country detection");
}

// ---------------------------------------------------------------------------
// Security Score Helper
// ---------------------------------------------------------------------------

function computeSecurityScore(props: CloudShieldPanelProps): {
  grade: string;
  score: number;
  breakdown: { label: string; active: boolean }[];
} {
  const checks = [
    { label: "Security Headers", active: props.headersActive },
    { label: "Application Firewall", active: props.wafActive },
    { label: "Cloud Protection", active: props.cloudflareDetected },
    { label: "Bot Blocking", active: props.botBlockingActive },
    { label: "Version Hiding", active: props.versionHidingActive },
  ];

  const activeCount = checks.filter((c) => c.active).length;
  const total = checks.length;
  const pct = total > 0 ? Math.round((activeCount / total) * 100) : 0;

  let grade = "D";
  if (pct >= 90) grade = "A";
  else if (pct >= 70) grade = "B";
  else if (pct >= 50) grade = "C";

  return { grade, score: pct, breakdown: checks };
}

const GRADE_RUBRIC: Record<string, string> = {
  A: "Excellent — all major protections active",
  B: "Good — most protections active, minor gaps",
  C: "Fair — some protections missing",
  D: "Needs attention — significant gaps in protection",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const SetupGuide: React.FC = () => (
  <div className="glass-panel rounded-2xl p-8">
    <h4 className="text-swiss-navy mb-6 flex items-center gap-2 text-xs font-black tracking-widest uppercase">
      <ChevronRight size={14} aria-hidden="true" />
      4-Step Setup Guide
    </h4>
    <ol className="space-y-6">
      {[
        {
          step: "Create a free Cloudflare account",
          detail:
            "Go to cloudflare.com and sign up. The free plan includes cloud protection, DDoS defense, and a global CDN.",
        },
        {
          step: "Add your domain to Cloudflare",
          detail:
            "Enter your website address. Cloudflare will scan your existing DNS records and import them automatically.",
        },
        {
          step: "Change your nameservers",
          detail:
            "Cloudflare will give you two nameserver addresses (e.g., ada.ns.cloudflare.com). Log into your domain registrar (where you bought your domain) and replace the current nameservers with Cloudflare's. This tells the internet to route your traffic through Cloudflare first.",
        },
        {
          step: "Wait for activation (up to 24 hours)",
          detail:
            "DNS changes can take a few hours to propagate worldwide. Once active, SwissSuite will automatically detect Cloudflare and optimize its settings.",
        },
      ].map((item, idx) => (
        <li key={idx} className="flex items-start gap-4">
          <span className="text-swiss-navy bg-card border-border flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border text-sm font-black shadow-sm">
            {idx + 1}
          </span>
          <div>
            <p className="text-foreground text-sm font-black">{item.step}</p>
            <p className="mt-1 text-sm leading-relaxed text-neutral-700">
              {item.detail}
            </p>
          </div>
        </li>
      ))}
    </ol>
  </div>
);

const SecurityScoreCard: React.FC<{ data: CloudShieldPanelProps }> = ({
  data,
}) => {
  const { grade, score, breakdown } = computeSecurityScore(data);

  return (
    <div className="glass-panel rounded-2xl p-8">
      <h4 className="text-swiss-navy mb-6 text-xs font-black tracking-widest uppercase">
        Security Score
      </h4>
      <div className="mb-6 flex items-center gap-6">
        <div
          className={`text-foreground flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-black ${
            grade === "A"
              ? "bg-emerald-500"
              : grade === "B"
                ? "bg-green-500"
                : grade === "C"
                  ? "bg-amber-500"
                  : "bg-red-500"
          }`}
        >
          {grade}
        </div>
        <div>
          <p className="text-foreground text-lg font-black">{score}%</p>
          <p className="text-sm text-neutral-700">
            {GRADE_RUBRIC[grade] || ""}
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {breakdown.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between text-sm"
          >
            <span className="font-medium text-neutral-700">{item.label}</span>
            {item.active ? (
              <span className="flex items-center gap-1 text-xs font-black tracking-widest text-emerald-600 uppercase">
                <CheckCircle2 size={14} aria-hidden="true" />
                Active
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-black tracking-widest text-amber-600 uppercase">
                <AlertTriangle size={14} aria-hidden="true" />
                Not detected
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="border-border mt-6 border-t pt-4">
        <p className="text-xs font-black tracking-widest text-neutral-700 uppercase">
          Score Rubric
        </p>
        <div className="mt-2 space-y-1">
          {Object.entries(GRADE_RUBRIC).map(([g, desc]) => (
            <p key={g} className="text-xs text-neutral-700">
              <span className="font-black">{g}:</span> {desc}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export const CloudShieldPanel: React.FC<CloudShieldPanelProps> = (props) => {
  const [setupPending, setSetupPending] = useState(false);
  // Tier 2 fix: geo-blocking is Pro-only — this advisory panel has no
  // isProEditionBuild gate of its own (renders identically in both editions
  // from SecurityHub.tsx), so it must not claim geo-blocking works in Free.
  const isProEditionBuild = isProEdition();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SETUP_FLAG_KEY);
      if (stored === "true") {
        setSetupPending(true);
      }
    } catch {
      // localStorage may be unavailable in some browser contexts
    }
  }, []);

  const handleSetupPending = () => {
    try {
      localStorage.setItem(SETUP_FLAG_KEY, "true");
    } catch {
      // Silently fail if localStorage is unavailable
    }
    setSetupPending(true);
  };

  const handleCancelSetup = () => {
    try {
      localStorage.removeItem(SETUP_FLAG_KEY);
    } catch {
      // Silently fail if localStorage is unavailable
    }
    setSetupPending(false);
  };

  // -----------------------------------------------------------------------
  // State C: Setup in progress
  // -----------------------------------------------------------------------
  if (setupPending && !props.cloudflareDetected) {
    return (
      <div className="animate-in fade-in slide-in-from-right-4 space-y-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-swiss-navy text-xl font-black tracking-tight uppercase">
              Cloud Protection
            </h3>
            <p className="mt-1 text-sm font-black tracking-widest text-neutral-700 uppercase">
              Waiting for Cloudflare activation
            </p>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-10 text-center">
          <div className="mb-6 inline-flex rounded-2xl bg-amber-50 p-4 dark:bg-amber-950/20">
            <Clock size={32} className="text-amber-500" aria-hidden="true" />
          </div>
          <h4 className="text-foreground mb-3 text-lg font-black">
            Waiting for Cloudflare...
          </h4>
          <p className="mx-auto mb-6 max-w-lg text-sm leading-relaxed text-neutral-700">
            DNS changes typically take 1 to 24 hours to propagate worldwide.
            Once Cloudflare is active, SwissSuite will automatically detect it
            and show your optimized status here.
          </p>
          <p className="mx-auto mb-8 max-w-lg text-sm leading-relaxed text-neutral-700">
            You can check your activation status in the{" "}
            <a
              href="https://dash.cloudflare.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-swiss-navy inline-flex items-center gap-1 font-black underline hover:no-underline"
            >
              Cloudflare Dashboard
              <ExternalLink size={12} aria-hidden="true" />
            </a>
          </p>
          <button
            onClick={handleCancelSetup}
            className="hover:text-foreground text-sm text-neutral-700 underline transition-colors hover:no-underline"
          >
            Cancel — I have not changed my nameservers yet
          </button>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // State B: Cloudflare detected
  // -----------------------------------------------------------------------
  if (props.cloudflareDetected) {
    return (
      <div className="animate-in fade-in slide-in-from-right-4 space-y-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-swiss-navy text-xl font-black tracking-tight uppercase">
              Cloud Protection
            </h3>
            <p className="mt-1 text-sm font-black tracking-widest text-neutral-700 uppercase">
              Cloudflare active — your site has an extra layer of defense
            </p>
          </div>
          <Badge className="border-emerald-200 bg-emerald-100 text-xs font-black tracking-widest text-emerald-700 uppercase">
            Active
          </Badge>
        </div>

        {/* Status Card */}
        <div className="glass-panel rounded-2xl p-8">
          <div className="mb-6 flex items-center gap-4">
            <div className="rounded-2xl bg-emerald-100 p-3 dark:bg-emerald-950/30">
              <ShieldCheck
                size={24}
                className="text-emerald-600"
                aria-hidden="true"
              />
            </div>
            <div>
              <h4 className="text-foreground text-sm font-black">
                Cloud Protection Active
              </h4>
              <p className="text-sm text-neutral-700">
                Traffic is filtered through Cloudflare before reaching your
                server.
              </p>
            </div>
          </div>
        </div>

        {/* Active Optimizations */}
        <div className="glass-panel rounded-2xl p-8">
          <h4 className="text-swiss-navy mb-6 text-xs font-black tracking-widest uppercase">
            Active Optimizations
          </h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {getActiveOptimizations(isProEditionBuild).map((opt) => (
              <div
                key={opt.label}
                className="bg-background border-border rounded-xl border p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <CheckCircle2
                    size={14}
                    className="shrink-0 text-emerald-500"
                    aria-hidden="true"
                  />
                  <span className="text-foreground text-xs font-black tracking-widest uppercase">
                    {opt.label}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-neutral-700">
                  {opt.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Security Score */}
        <SecurityScoreCard data={props} />

        {/* Manage in Cloudflare */}
        <div className="glass-panel flex items-center justify-between rounded-2xl p-6">
          <p className="text-sm text-neutral-700">
            Manage your Cloudflare settings, WAF rules, and caching directly in
            the Cloudflare dashboard.
          </p>
          <a
            href="https://dash.cloudflare.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-swiss-navy text-foreground dark:text-foreground hover:bg-brand-accent flex shrink-0 items-center gap-2 rounded-xl px-6 py-3 text-sm font-black tracking-widest uppercase transition-colors"
          >
            Cloudflare Dashboard
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // State A: Cloudflare NOT detected
  // -----------------------------------------------------------------------
  return (
    <div className="animate-in fade-in slide-in-from-right-4 space-y-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-swiss-navy text-xl font-black tracking-tight uppercase">
            Cloud Protection
          </h3>
          <p className="mt-1 text-sm font-black tracking-widest text-neutral-700 uppercase">
            Add an extra layer of defense in front of your server
          </p>
        </div>
      </div>

      {/* What is Cloudflare? */}
      <div className="glass-panel rounded-2xl p-8">
        <div className="mb-6 flex items-center gap-4">
          <div className="bg-swiss-navy/10 rounded-2xl p-3">
            <Globe size={24} className="text-swiss-navy" aria-hidden="true" />
          </div>
          <h4 className="text-foreground text-sm font-black">
            What is Cloudflare?
          </h4>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-neutral-700">
          Think of Cloudflare as a security guard standing between the internet
          and your website. Every visitor passes through Cloudflare first, where
          known attackers, bots, and malicious traffic are blocked{" "}
          <strong>before they ever reach your server</strong>.
        </p>
        <p className="mb-4 text-sm leading-relaxed text-neutral-700">
          Right now, your site handles all threats directly. SwissSuite protects
          you at the application level (firewall, login protection, bot
          blocking), but adding Cloudflare gives you an{" "}
          <strong>additional layer of cloud-based protection</strong> that stops
          attacks at the network edge — before they use your server resources.
        </p>
        <p className="text-sm leading-relaxed text-neutral-700">
          Cloudflare offers a <strong>free plan</strong> that includes DDoS
          protection, a global CDN, and basic security features. No credit card
          required.
        </p>
      </div>

      {/* Benefits */}
      <div className="glass-panel rounded-2xl p-8">
        <h4 className="text-swiss-navy mb-6 text-xs font-black tracking-widest uppercase">
          What You Get With Cloudflare
        </h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[
            {
              title: "DDoS Protection",
              desc: "Large-scale attacks are absorbed by Cloudflare's global network before reaching your server.",
            },
            {
              title: "Faster Page Loads",
              desc: "Static content is cached on servers worldwide, so visitors load from the nearest location.",
            },
            {
              title: "Automatic Integration",
              desc: isProEditionBuild
                ? "SwissSuite detects Cloudflare automatically and optimizes IP detection, geo-blocking, and rate limiting."
                : "SwissSuite detects Cloudflare automatically and optimizes IP detection and rate limiting.",
            },
            {
              title: "Free SSL Certificate",
              desc: "Cloudflare provides a free SSL certificate and enforces HTTPS for all visitors.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="bg-background border-border rounded-xl border p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <Shield
                  size={14}
                  className="text-swiss-navy shrink-0"
                  aria-hidden="true"
                />
                <span className="text-foreground text-xs font-black tracking-widest uppercase">
                  {item.title}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-neutral-700">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Setup Guide */}
      <SetupGuide />

      {/* Recommended Settings */}
      <div className="glass-panel rounded-2xl p-8">
        <h4 className="text-swiss-navy mb-6 text-xs font-black tracking-widest uppercase">
          Recommended Cloudflare Settings
        </h4>
        <div className="space-y-4">
          {RECOMMENDED_SETTINGS.map((setting) => (
            <div
              key={setting.title}
              className="bg-background border-border flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center sm:gap-4"
            >
              <span className="text-foreground w-48 shrink-0 text-xs font-black tracking-widest uppercase">
                {setting.title}
              </span>
              <Badge className="bg-swiss-navy/10 text-swiss-navy border-swiss-navy/20 shrink-0 text-xs font-black tracking-widest uppercase">
                {setting.value}
              </Badge>
              <span className="text-sm text-neutral-700">{setting.why}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Security Score */}
      <SecurityScoreCard data={props} />

      {/* CTA */}
      <div className="glass-panel flex flex-col items-center gap-6 rounded-2xl p-8 sm:flex-row">
        <div className="flex-1">
          <p className="text-sm leading-relaxed text-neutral-700">
            Ready to add cloud protection? Create a free Cloudflare account and
            follow the setup guide above.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <a
            href="https://dash.cloudflare.com/sign-up"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-swiss-navy text-foreground dark:text-foreground hover:bg-brand-accent flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-black tracking-widest uppercase transition-colors"
          >
            Get Started Free
            <ExternalLink size={14} aria-hidden="true" />
          </a>
          <button
            onClick={handleSetupPending}
            className="bg-secondary text-foreground hover:bg-swiss-navy hover:text-foreground dark:hover:text-foreground border-border flex items-center gap-2 rounded-xl border px-6 py-3 text-sm font-black tracking-widest uppercase transition-colors"
          >
            I have changed my nameservers
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-background border-border flex items-start gap-3 rounded-xl border p-4">
        <Info
          size={16}
          className="mt-0.5 shrink-0 text-neutral-700"
          aria-hidden="true"
        />
        <p className="text-xs leading-relaxed text-neutral-700">
          Cloudflare is an independent third-party service. SwissSuite
          recommends it as a complementary security layer but does not manage
          your Cloudflare account or settings. You are responsible for your own
          Cloudflare configuration. Adding Cloudflare is optional — SwissSuite
          provides full application-level security protection with or without
          it.
        </p>
      </div>
    </div>
  );
};
