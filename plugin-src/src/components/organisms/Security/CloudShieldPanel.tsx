/**
 * CloudShieldPanel — Cloudflare header configuration guide (passive,
 * advisory-only)
 *
 * Explains, in plain factual terms, what this plugin does with the
 * CF-Connecting-IP header when a Cloudflare reverse proxy sits in front of
 * the site, that the header is only trusted when the request itself
 * originates from one of Cloudflare's published IP ranges, and how to
 * confirm the real visitor IP is being read. This is reference information
 * about this plugin's own request handling, not a product recommendation.
 *
 * IMPORTANT: This component makes ZERO API calls to Cloudflare.
 * It reads ONLY from props (existing environment/scan data).
 * No tokens stored, no settings changed, no legal liability.
 */
import React from "react";
import { ShieldCheck, ExternalLink, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { Badge } from "../../ui/Badge";

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

/** Cloudflare's own documentation page on restoring the real visitor IP. */
const CF_PROXIED_IP_DOC_URL =
  "https://developers.cloudflare.com/support/troubleshooting/restoring-visitor-ips/restoring-original-visitor-ips/";

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
 * What this plugin actually does with the proxy headers when a Cloudflare
 * reverse proxy is in front of the site. Each entry must describe behaviour
 * this build really has.
 */
function getHeaderHandlingFacts() {
  return [
    {
      label: "Real visitor IP resolution",
      description:
        "SwissSuite reads the visitor's IP from the CF-Connecting-IP header instead of the raw connection address, so IP bans and rate limiting act on the real visitor, not on Cloudflare's own address.",
    },
    {
      label: "Trusted proxy validation",
      description:
        "The CF-Connecting-IP header is only trusted when the request itself originates from one of Cloudflare's published IP ranges. A header claiming to be from Cloudflare is ignored if the connection did not come from one of those ranges.",
    },
  ];
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

/**
 * The plugin's own request-handling facts for the CF-Connecting-IP header,
 * plus how to confirm it is being read correctly. Shown regardless of
 * whether Cloudflare is currently detected, since it describes what this
 * build does whenever a Cloudflare reverse proxy is present.
 */
const HeaderHandlingSection: React.FC = () => (
  <div className="glass-panel rounded-2xl p-8">
    <h4 className="text-swiss-navy mb-6 text-xs font-black tracking-widest uppercase">
      Header Handling
    </h4>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {getHeaderHandlingFacts().map((fact) => (
        <div
          key={fact.label}
          className="bg-background border-border rounded-xl border p-4"
        >
          <div className="mb-2 flex items-center gap-2">
            <CheckCircle2
              size={14}
              className="shrink-0 text-emerald-500"
              aria-hidden="true"
            />
            <span className="text-foreground text-xs font-black tracking-widest uppercase">
              {fact.label}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-neutral-700">
            {fact.description}
          </p>
        </div>
      ))}
    </div>
    <div className="border-border mt-6 border-t pt-4">
      <p className="text-xs font-black tracking-widest text-neutral-700 uppercase">
        How to verify
      </p>
      <p className="mt-2 text-sm leading-relaxed text-neutral-700">
        The clearest check is whether IP addresses recorded elsewhere in
        Security (banned IPs, rate-limit entries) show real visitor
        addresses rather than one of Cloudflare's own edge IPs repeated for
        every request. If every entry shows the same address, the header is
        present but is not yet being trusted for this request.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-neutral-700">
        Reference:{" "}
        <a
          href={CF_PROXIED_IP_DOC_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-swiss-navy inline-flex items-center gap-1 font-black underline hover:no-underline"
        >
          Cloudflare's documentation on restoring the original visitor IP
          <ExternalLink size={12} aria-hidden="true" />
        </a>
      </p>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export const CloudShieldPanel: React.FC<CloudShieldPanelProps> = (props) => {
  // -----------------------------------------------------------------------
  // Cloudflare detected
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
              Cloudflare detected — your site has an extra layer of defense
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

        {/* Header Handling (what the plugin does + how to verify) */}
        <HeaderHandlingSection />

        {/* Security Score */}
        <SecurityScoreCard data={props} />

        {/* Recommended Settings — configuration reference for an active integration */}
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
                <span className="text-sm text-neutral-700">
                  {setting.why}
                </span>
              </div>
            ))}
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
            Cloudflare is an independent third-party service not affiliated
            with SwissSuite. This page is provided for reference only —
            SwissSuite does not manage your Cloudflare account or settings.
            Full application-level security protection works with or
            without it.
          </p>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Cloudflare not detected
  // -----------------------------------------------------------------------
  return (
    <div className="animate-in fade-in slide-in-from-right-4 space-y-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-swiss-navy text-xl font-black tracking-tight uppercase">
            Cloud Protection
          </h3>
          <p className="mt-1 text-sm font-black tracking-widest text-neutral-700 uppercase">
            Cloudflare not detected on this site
          </p>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-8">
        <p className="text-sm leading-relaxed text-neutral-700">
          SwissSuite did not find a Cloudflare CF-Connecting-IP or CF-Ray
          header on the request that loaded this page. SwissSuite protects
          this site at the application level (firewall, login protection,
          bot blocking) regardless of whether a reverse proxy is in front of
          it. The section below describes what this plugin does with the
          Cloudflare proxy headers whenever one is present.
        </p>
      </div>

      {/* Header Handling (what the plugin does + how to verify) */}
      <HeaderHandlingSection />

      {/* Security Score */}
      <SecurityScoreCard data={props} />

      {/* Disclaimer */}
      <div className="bg-background border-border flex items-start gap-3 rounded-xl border p-4">
        <Info
          size={16}
          className="mt-0.5 shrink-0 text-neutral-700"
          aria-hidden="true"
        />
        <p className="text-xs leading-relaxed text-neutral-700">
          Cloudflare is an independent third-party service not affiliated
          with SwissSuite. This page is provided for reference only —
          SwissSuite does not manage a Cloudflare account or settings on
          your behalf, and full application-level security protection works
          with or without a reverse proxy in front of the site.
        </p>
      </div>
    </div>
  );
};
