/**
 * Authored by: Frontend Specialist & Backend Specialist
 * Skills: react-patterns (Mutations), ui-ux-pro-max (Feedback)
 * Date: 2026-02-17
 */

import { useState, useEffect } from "react";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { Badge } from "../../ui/Badge";
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  Lock,
  LogOut,
  Coins,
  RefreshCw,
  Zap,
  Calendar,
  Info,
  CreditCard,
  Sparkles,
  Layers,
  Download,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { wpApi } from "../../../services/api";
import {
  isFreeEdition,
  PRO_UPGRADE_URL,
  PRO_DOWNLOAD_URL,
} from "../../../lib/edition";
import type {
  FeatureSubscription,
  TokenPortfolio,
  LicenseStatus,
  TokenStatus,
  LicenseRefreshResponse,
} from "../../../types";

/**
 * Safe percentage helper — guards against NaN/Infinity when total is 0 or
 * inputs are non-finite. Mirrors the SecurityHub.tsx calculatePercent contract.
 */
const calculatePercent = (value: number, total: number): number => {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)));
};

/**
 * Renewal-type action error surfacing (fix, 2026-07-02): every structured
 * {success:false, error:CODE} response from the feature-upgrade / cancel-feature
 * / resume endpoints must render a HUMAN-READABLE toast — never a raw enum string,
 * and never silence. Maps the known VPS (license_new_v2.js) + PHP proxy
 * (class-swisswpsuite-api-settings.php) error codes to actionable copy. Unknown
 * codes still get a message (code shown for support triage) instead of falling
 * through to a bare "Request failed".
 */
const LICENSE_ACTION_ERROR_MESSAGES: Record<string, string> = {
  NO_STRIPE_SUB:
    "This feature isn't billed through Stripe, so its renewal type can't be changed here.",
  NOT_STRIPE_MANAGED:
    "This subscription isn't billed through Stripe, so auto-renewal can't be changed here.",
  FEATURE_SUB_NOT_FOUND:
    "No active subscription was found for this feature. Refresh the page and try again.",
  LICENSE_NOT_FOUND: "Your license could not be found. Please re-activate.",
  NO_LICENSE_KEY: "No license key is linked to this site.",
  LICENSE_INACTIVE:
    "Your license isn't active, so this can't be changed right now.",
  DOMAIN_MISMATCH:
    "This license is bound to a different domain. Contact support if this seems wrong.",
  ALREADY_ON_TIER: "This feature is already on that billing plan.",
  INVALID_FEATURE:
    "Unrecognized feature — please refresh the page and try again.",
  MISSING_TIER: "Missing billing plan — please refresh the page and try again.",
  MISSING_PARAMS:
    "Missing required information — please refresh the page and try again.",
  INVALID_OR_UNPAID_TIER: "That billing plan isn't available for upgrade.",
  PRICE_ID_NOT_FOUND:
    "That billing plan is temporarily unavailable. Please try again shortly.",
  STRIPE_ITEM_NOT_FOUND:
    "Your billing subscription is in an unexpected state. Please contact support.",
  VPS_UNREACHABLE:
    "Couldn't reach the licensing server — your request was not applied. Please try again.",
  INVALID_VPS_RESPONSE:
    "Received an unexpected response while applying this change. Re-checking your current status…",
  SERVER_ERROR:
    "Something went wrong applying this change. It may have already applied — re-checking your current status…",
  NO_STRIPE_CUSTOMER:
    "No Stripe billing account is linked to this license yet.",
};

const mapLicenseActionError = (
  code?: string,
  fallbackMessage?: string
): string => {
  if (fallbackMessage) return fallbackMessage;
  if (code && LICENSE_ACTION_ERROR_MESSAGES[code])
    return LICENSE_ACTION_ERROR_MESSAGES[code];
  if (code) return `Request failed (${code}). Please try again.`;
  return "Request failed. Please try again.";
};

/**
 * Maps VPS capability flags to the feature label shown in the suite included-features list.
 * Suite licenses return subscriptions=null; features are derived from the capabilities array.
 * Ordered: Backup → Security → SEO → Content (matches the UI's "Your Plan Features" order).
 */
const SUITE_FEATURE_MAP: Array<{ key: string; caps: string[]; label: string }> =
  [
    { key: "backup", caps: ["backup_cloud"], label: "Backup" },
    {
      key: "security",
      caps: ["waf", "sentinel_pro", "ai_scan"],
      label: "Security",
    },
    { key: "seo", caps: ["seo_meta"], label: "SEO" },
    { key: "content", caps: ["content_rewrite"], label: "Content" },
  ];

interface LicenseManagerProps {
  license: any;
  tokens: any;
  onActivate: (key: string) => Promise<any>;
  isActivating: boolean;
}

export function LicenseManager({
  license,
  tokens,
  onActivate,
  isActivating,
}: LicenseManagerProps) {
  const [key, setKey] = useState("");

  // Freshness fix (Item 2a): populated by the on-mount + manual-refresh calls to
  // POST /license/refresh (see fetchLicenseRefresh/applyLicenseRefresh below).
  // Takes priority over the `license`/`tokens` props (TanStack Query, seeded once
  // at page load and never refetched) so the headline balance, per-feature bars,
  // and status update in place — no page reload required. null until the first
  // refresh resolves, so it never blocks the existing prop/window fallback chain.
  const [freshLicense, setFreshLicense] = useState<LicenseStatus | null>(null);
  const [freshTokens, setFreshTokens] = useState<TokenStatus | null>(null);

  // Prefer the fresh in-place refresh, then the live API response, then fall back
  // to the PHP-stamped window value (populated from wp_options cache at page load).
  // This means a transient fetch failure NEVER renders an unlicensed state — that
  // only happens when the API returns a successful 200 with active:false.
  const effectiveLicense =
    freshLicense ?? license ?? window.swisswpsuiteData?.license ?? null;

  const isActive = effectiveLicense?.active;
  const features = effectiveLicense?.features || [];
  const capabilities = effectiveLicense?.capabilities || [];

  // Display formatter: converts underscore plan IDs from the API (e.g. "swisswpsuite_monthly")
  // into human-readable names. Does NOT change the underlying API value.
  const formatPlanName = (raw: string | undefined): string => {
    if (!raw) return "Free";
    const map: Record<string, string> = {
      swisswpsuite_monthly: "SwissSuite Monthly",
      swisswpsuite_yearly: "SwissSuite Yearly",
      swisswpsuite_lifetime: "SwissSuite Lifetime",
      sentinel_free: "Sentinel Free",
      sentinel_pro: "Sentinel Pro",
      free: "Free",
      pro: "Pro",
      enterprise: "Enterprise",
    };
    const key = raw.toLowerCase().trim();
    if (map[key]) return map[key];
    // Generic fallback: replace underscores with spaces and title-case each word
    return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const tier = formatPlanName(effectiveLicense?.tier_name);

  // Suite license detection: swisswpsuite_monthly / _yearly / _lifetime carry the prefix.
  // For suite licenses the VPS returns subscriptions=null (one shared pool, no per-feature rows).
  const isSuiteLicense = !!effectiveLicense?.tier_name
    ?.toLowerCase()
    .includes("swisswpsuite");

  // Derive which suite features are included from the capabilities array.
  // This drives the "Included in your SwissSuite" read-only badge list (Task C-2).
  const suiteIncludedFeatures = SUITE_FEATURE_MAP.filter((f) =>
    f.caps.some((c) => Array.isArray(capabilities) && capabilities.includes(c))
  );

  // Stripe-managed gating (2026-07-05): not every license is Stripe-originated —
  // comped/InvoiceNinja/support-issued licenses have no Stripe customer or
  // subscription behind them, so the billing-portal link and the proration-based
  // upgrade button must never render for them (the VPS would return
  // NO_STRIPE_CUSTOMER / NO_STRIPE_SUB). Gate on the explicit backend flag, not
  // a client-side inference. `undefined` (pre-deploy cached responses that
  // predate this field) falls back to the presence of stripe_customer_id so
  // existing Stripe-managed licenses keep working unchanged until the backend
  // ships the flag.
  const isPaidTier = effectiveLicense?.tier_name?.toUpperCase() !== "FREE";
  const isLicenseStripeManaged =
    effectiveLicense?.is_stripe_managed ??
    !!effectiveLicense?.stripe_customer_id;
  const showManageBillingButton = isLicenseStripeManaged && isPaidTier;
  const showManualBillingNotice =
    !!isActive &&
    isPaidTier &&
    effectiveLicense?.is_stripe_managed === false &&
    !effectiveLicense?.stripe_customer_id;

  // Freemium Dual-Build (Phase 3, 2026-07-17): a key that activates a paid
  // tier on a Free-edition install is a real key, but this build physically
  // does not contain the code to serve any paid feature — the "Cloud Backup
  // & Sync: Active" style checkmarks below would be a fake unlock. Reuses
  // the existing isActive/isPaidTier derivations above (same guard pattern
  // as showManualBillingNotice) rather than re-deriving tier logic. The
  // effectiveLicense?.edition_mismatch OR-branch (Phase 4): now populated by
  // class-swisswpsuite-license.php::get_status() — kept as an OR alongside
  // the original client-side derivation so a not-yet-refreshed cached
  // response (predating this field) still works. See types.ts's LicenseStatus.
  const isProKeyInFreeBuild =
    isFreeEdition() &&
    ((!!isActive && isPaidTier) || effectiveLicense?.edition_mismatch === true);

  // Formatted renewal label used in the suite cancel toast and the renewal display line.
  const suiteRenewsLabel =
    effectiveLicense?.expires && effectiveLicense.expires !== "lifetime"
      ? new Date(effectiveLicense.expires).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "plan expiry";

  // Access trial status from global window object
  const trialStatus = window.swisswpsuiteData?.trial || {
    active: false,
    ends_at: null,
  };

  // Prefer the freshly-refreshed tokens (Item 2a), then the dynamic tokens prop,
  // then fall back to global if missing. Ensure numeric defaults to prevent crash (M2 fix).
  const rawTokens =
    freshTokens ?? tokens ?? window.swisswpsuiteData?.tokens ?? {};
  const tokenStatus = {
    balance: Number(rawTokens.balance) || 0,
    // Item 2b: token_limit backing the "Tokens Used (This Period)" computation
    // below. The legacy `usage` (Groq-completions-only counter) is no longer
    // read here — see tokensUsedThisPeriod for why.
    limit: Number((rawTokens as { token_limit?: number }).token_limit) || 0,
    // v32: purchased token-pack pool. Never reset by the monthly SET, never rolled
    // up — spent only after the monthly allowance is exhausted. Shown as
    // "Purchased: Y" alongside the balance when > 0.
    pack_balance:
      Number((rawTokens as { pack_balance?: number }).pack_balance) || 0,
  };

  // Item 2b: "Tokens Used" now reflects ALL spend this billing period — computed
  // from VPS-truth values (token_limit − token_balance) — instead of the local
  // `usage` counter, which is only incremented by primary Groq completions
  // (groq.php) and undercounts Sentinel L2 + batch spend. Relabeled "This Period"
  // (not "All Time") because it resets on the monthly SET-pattern reset.
  // Guarded like `calculatePercent`: an unknown/zero limit yields 0, never
  // NaN/negative. A true ALL-TIME cumulative would require a new VPS /check
  // usage field that persists across monthly resets — follow-up, not in scope.
  const tokensUsedThisPeriod =
    tokenStatus.limit > 0
      ? Math.max(0, tokenStatus.limit - tokenStatus.balance)
      : 0;

  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Cross-domain token pooling DISABLED (v2.9.30.135). The former GET /license/portfolio
  // fetch pooled balances across ALL of an owner's licenses regardless of which domain
  // each is bound to — so a different site's license (e.g. a yearly suite key) bled into
  // THIS site's "Total Across Licenses" card. Tokens are spent per-domain, so that pooled
  // total was misleading (BUG-1). `portfolio` is now permanently null: every pooled UI
  // block is guarded by `portfolio && …`, so they no longer render and no cross-domain
  // call is made. The per-site balance is the only token figure shown. (Correct per-feature
  // balances arrive with the VPS per-feature rollout.)
  const [portfolio] = useState<TokenPortfolio | null>(null);

  // Shared network call — used by both the on-mount freshness effect and the
  // manual Refresh button (handleRefreshLicense). Returns null when the WP
  // bridge globals aren't ready yet; throws on network/HTTP failure so each
  // caller can drive its own toast/loading UX.
  const fetchLicenseRefresh =
    async (): Promise<LicenseRefreshResponse | null> => {
      const data = window.swisswpsuiteData;
      if (!data?.apiUrl || !data?.nonce) return null;
      const res = await fetch(`${data.apiUrl}/license/refresh`, {
        method: "POST",
        headers: { "X-WP-Nonce": data.nonce },
      });
      return (await res.json()) as LicenseRefreshResponse;
    };

  // Applies a successful /license/refresh response to local state (Item 2a):
  // the headline balance, per-feature subscription bars, and status all
  // re-render from `freshLicense`/`freshTokens` — no page reload required.
  // Also mirrors token_balance onto window.swisswpsuiteData for legacy
  // non-React readers that still snapshot the global directly (e.g. a hook
  // seeding its own local state at its own mount time elsewhere).
  const applyLicenseRefresh = (json: LicenseRefreshResponse) => {
    if (json.license) setFreshLicense(json.license);
    // Guard against the PHP `{}` degraded-shape edge case (Token Manager
    // unavailable server-side) — an empty object is truthy but has no numeric
    // fields, which would otherwise silently override good prop/window data
    // with a shape that renders as all-zero.
    if (json.tokens && typeof json.tokens.balance === "number") {
      setFreshTokens(json.tokens);
    }
    if (typeof json.token_balance === "number" && window.swisswpsuiteData) {
      window.swisswpsuiteData.tokens = {
        balance: json.token_balance,
        usage: window.swisswpsuiteData.tokens?.usage ?? 0,
      };
    }
  };

  // Renewal-type action error surfacing (fix, 2026-07-02): after an AMBIGUOUS
  // server-side outcome (VPS 5xx, malformed body, unreachable) the change may
  // have actually applied — this is the documented feature-upgrade quirk. The
  // caller already showed the primary error toast; this silently re-syncs
  // license/token state in the background so the UI reflects the true
  // server-side result without a second toast or a forced page reload.
  const attemptBackgroundResync = () => {
    fetchLicenseRefresh()
      .then((refreshed) => {
        if (refreshed?.success) applyLicenseRefresh(refreshed);
      })
      .catch(() => {
        // Best-effort only — the primary error toast already informed the user.
      });
  };

  // Item 2a: one-shot freshness fetch on License-tab mount — intentionally NOT
  // a polling interval (avoid hammering the VPS heartbeat; the background
  // throttle in license.php is untouched — see maybe_recheck()'s 6h staleness
  // gate). Silent on failure: the component already has last-known-good data
  // via the `license`/`tokens` props (TanStack Query) and the PHP-stamped
  // window fallback, so a transient VPS blip should not show an alarming error
  // on every page load.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const json = await fetchLicenseRefresh();
        if (!cancelled && json?.success) {
          applyLicenseRefresh(json);
        }
      } catch {
        // Best-effort — see comment above.
      }
    })();
    return () => {
      cancelled = true;
    };
    // Empty deps: run once per mount only. fetchLicenseRefresh/applyLicenseRefresh
    // close over stable setState setters and window; safe to omit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefreshLicense = async () => {
    // Preserve original guard: silently no-op if the WP bridge globals aren't
    // ready yet (matches fetchLicenseRefresh's own check) — no false-negative
    // "Refresh failed" toast for a condition that isn't actually a failure.
    const data = window.swisswpsuiteData;
    if (!data?.apiUrl || !data?.nonce) return;
    setIsRefreshing(true);
    try {
      const json = await fetchLicenseRefresh();
      if (json?.success) {
        toast.success(
          `License refreshed — Balance: ${json.token_balance?.toLocaleString() ?? "?"} tokens`
        );
        applyLicenseRefresh(json);
      } else {
        toast.error("Refresh failed — check plugin log");
      }
    } catch {
      toast.error("Refresh failed — network error");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Option A: pro-rata upgrade of a single feature from monthly to annual.
  // Upgrade-only by design — there is no self-service mid-cycle downgrade;
  // the only way back to a lower tier is non-renewal at natural expiry
  // (drops to Free). Routes through the WordPress REST API (data.root), NOT
  // the VPS URL (data.apiUrl) — the PHP handler reads the license key
  // server-side and proxies to the VPS.
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleUpgradeToAnnual = async (feature: string, annualTier: string) => {
    const data = window.swisswpsuiteData;
    if (!data?.root || !data?.nonce) return;
    setIsUpgrading(true);
    try {
      const res = await fetch(
        `${data.root}swisswpsuite/v1/license/feature-upgrade`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-WP-Nonce": data.nonce,
          },
          body: JSON.stringify({ feature, new_tier: annualTier }),
        }
      );
      const json = await res.json().catch(() => null);

      // Defensive guard: an empty/non-JSON body (VPS crash before it could
      // write a response) must never be silently swallowed by a property
      // access on null — give a specific, actionable message every time.
      if (!json || typeof json !== "object") {
        toast.error(
          "Unexpected response from the server. Please refresh and try again."
        );
        if (res.status >= 500) attemptBackgroundResync();
        return;
      }

      if (json.success) {
        const proratedNote = json.prorated_amount_cents
          ? ` (you pay $${(json.prorated_amount_cents / 100).toFixed(2)} prorated)`
          : "";
        toast.success(`Upgraded to annual${proratedNote}! Refreshing...`);
        setTimeout(() => window.location.reload(), 1500);
        return;
      }

      // Structured non-success outcome — always a human-readable toast, never
      // a raw enum string and never silence.
      toast.error(mapLicenseActionError(json.error, json.message));

      // Known VPS quirk: a 500 (or an unparsed/unreachable response) can still
      // mean the upgrade applied server-side before the error was raised.
      // Re-sync in the background so the badge/expiry reflects reality.
      if (
        res.status >= 500 ||
        json.error === "INVALID_VPS_RESPONSE" ||
        json.error === "VPS_UNREACHABLE"
      ) {
        attemptBackgroundResync();
      }
    } catch {
      toast.error(
        "Couldn't reach the server — your request was not applied. Please check your connection and try again."
      );
    } finally {
      setIsUpgrading(false);
    }
  };

  // Manage Billing bug fix (2026-07-05): the Stripe customer portal requires a
  // server-generated portal-session URL, not a bare Stripe customer ID appended
  // to billing.stripe.com/p/login/ — that URL is invalid and 404s. Routes
  // through the WordPress REST API (data.root), mirroring handleUpgradeToAnnual's
  // guard/parse/error pattern. Unlike that handler, this endpoint never mutates
  // license/subscription state (it only mints a portal link), so an ambiguous
  // 5xx here does not warrant attemptBackgroundResync().
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  const handleManageBilling = async () => {
    const data = window.swisswpsuiteData;
    if (!data?.root || !data?.nonce) return;
    setIsOpeningPortal(true);
    try {
      const res = await fetch(
        `${data.root}swisswpsuite/v1/license/billing-portal`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-WP-Nonce": data.nonce,
          },
        }
      );
      const json = await res.json().catch(() => null);

      // Defensive guard: an empty/non-JSON body must never be silently
      // swallowed by a property access on null.
      if (!json || typeof json !== "object") {
        toast.error(
          "Unexpected response from the server. Please refresh and try again."
        );
        return;
      }

      if (json.success && json.url) {
        // Top-level redirect (NOT window.open) — the portal session has a
        // return_url configured to bring the user back to this site.
        window.location.href = json.url;
        return;
      }

      // Structured non-success outcome — always a human-readable toast, never
      // a raw enum string and never silence.
      toast.error(mapLicenseActionError(json.error, json.message));
    } catch {
      toast.error(
        "Couldn't reach the server — please check your connection and try again."
      );
    } finally {
      setIsOpeningPortal(false);
    }
  };

  // Feature A: cancel auto-renewal at period end (or resume). Routes through the
  // WordPress REST API (data.root) — the PHP handler reads the license key server-side
  // and proxies to the VPS. The VPS returns HTTP 200 with success:false + an error code
  // for non-exceptional outcomes (NOT_STRIPE_MANAGED, SHARED_SUBSCRIPTION), so we branch
  // on the JSON body, not res.ok.
  const [cancellingFeature, setCancellingFeature] = useState<string | null>(
    null
  );

  // Sentinel used for the WHOLE-SUITE cancel control. A pure full-suite license has
  // its Stripe subscription id on the LICENSE row (not in feature_subscriptions), so
  // the request must OMIT `feature` entirely — the VPS then resolves the license-level
  // sub (the suite path). We still track in-flight UI state under this sentinel so the
  // button's disabled/"Working…" state works (an empty-string feature would be falsy).
  const SUITE_CANCEL_SENTINEL = "__suite__";

  const callCancelFeature = async (
    feature: string,
    resume: boolean,
    confirmWholeSuite: boolean
  ): Promise<void> => {
    const data = window.swisswpsuiteData;
    if (!data?.root || !data?.nonce) return;
    setCancellingFeature(feature);
    const isSuiteWide = feature === SUITE_CANCEL_SENTINEL;
    try {
      // Suite-wide cancel OMITS `feature` so the VPS uses the license-level
      // subscription id (E2 fix). Per-feature cancels send the feature key as before.
      const requestBody: Record<string, unknown> = {
        resume,
        confirm_whole_suite: confirmWholeSuite,
      };
      if (!isSuiteWide) {
        requestBody.feature = feature;
      }
      const res = await fetch(
        `${data.root}swisswpsuite/v1/license/cancel-feature`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-WP-Nonce": data.nonce,
          },
          body: JSON.stringify(requestBody),
        }
      );
      const json = await res.json().catch(() => null);

      // Defensive guard: an empty/non-JSON body (VPS crash before it could
      // write a response) must never be silently swallowed by a property
      // access on null — give a specific, actionable message every time.
      if (!json || typeof json !== "object") {
        toast.error(
          "Unexpected response from the server. Please refresh and try again."
        );
        if (res.status >= 500) attemptBackgroundResync();
        return;
      }

      // Shared Stripe subscription: cancelling this one feature cancels every feature
      // on the same Stripe sub. Re-confirm with the full list, then re-call with
      // confirm_whole_suite:true.
      if (json.error === "SHARED_SUBSCRIPTION") {
        const affected: string[] = Array.isArray(json.affected_features)
          ? json.affected_features
          : [];
        const list = affected.join(", ");
        toast.warning(
          `This subscription covers ${affected.length} features (${list}). Cancelling auto-renewal stops renewal for ALL of them — they stay active until their expiry date.`,
          {
            duration: 12000,
            action: {
              label: `Cancel all ${affected.length}`,
              onClick: () => callCancelFeature(feature, resume, true),
            },
          }
        );
        return;
      }

      if (json.success) {
        if (resume) {
          toast.success("Auto-renewal resumed. Refreshing…");
        } else {
          const end = json.effective_end
            ? new Date(json.effective_end).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            : null;
          toast.success(
            end
              ? `Auto-renewal cancelled. Access continues until ${end}. Refreshing…`
              : "Auto-renewal cancelled. Refreshing…"
          );
        }
        setTimeout(() => window.location.reload(), 1500);
        return;
      }

      // Structured non-success outcome — always a human-readable toast, never
      // a raw enum string and never silence.
      toast.error(mapLicenseActionError(json.error, json.message));

      // Ambiguous server-side failures (500 / malformed VPS body) may have
      // still applied the change server-side — silently re-sync so the UI
      // reflects reality instead of leaving the user to guess.
      if (
        res.status >= 500 ||
        json.error === "INVALID_VPS_RESPONSE" ||
        json.error === "VPS_UNREACHABLE"
      ) {
        attemptBackgroundResync();
      }
    } catch {
      toast.error(
        "Couldn't reach the server — your request was not applied. Please check your connection and try again."
      );
    } finally {
      setCancellingFeature(null);
    }
  };

  // Entry point with a confirm step for the destructive cancel action (resume is safe,
  // so it skips the confirm). Uses the existing sonner toast.warning + action pattern —
  // consistent with handleDeactivate; no native alert()/confirm().
  const handleCancelAutoRenewal = (feature: string, expiryLabel: string) => {
    toast.warning(
      `Turn off auto-renewal for "${feature}"? It stays active until ${expiryLabel}, then won't renew.`,
      {
        duration: 10000,
        action: {
          label: "Cancel auto-renewal",
          onClick: () => callCancelFeature(feature, false, false),
        },
      }
    );
  };

  const handleResumeAutoRenewal = (feature: string) => {
    callCancelFeature(feature, true, false);
  };

  // Whole-suite cancel (E2 fix): confirms, then cancels the license-level subscription
  // by OMITTING `feature` (SUITE_CANCEL_SENTINEL). A pure full-suite license has no
  // feature_subscriptions rows, so a per-feature request would 404 (FEATURE_SUB_NOT_FOUND).
  const handleCancelSuiteRenewal = (expiryLabel: string) => {
    toast.warning(
      `Turn off auto-renewal for your SwissSuite plan? It stays active until ${expiryLabel}, then won't renew.`,
      {
        duration: 10000,
        action: {
          label: "Cancel auto-renewal",
          onClick: () => callCancelFeature(SUITE_CANCEL_SENTINEL, false, false),
        },
      }
    );
  };

  // A5: customer-initiated refund REQUEST. Proxies through WordPress (data.root) to the
  // VPS, which emails the customer a double-opt-in confirmation link — NO automated
  // refund happens here and NOTHING is charged/revoked by clicking this. The VPS is the
  // authority on eligibility (one-time goodwill cap / non-refundable) and returns a
  // human-readable `message` we surface verbatim.
  const [requestingRefund, setRequestingRefund] = useState(false);

  const callRefundRequest = async (): Promise<void> => {
    const data = window.swisswpsuiteData;
    if (!data?.root || !data?.nonce) return;
    setRequestingRefund(true);
    try {
      const res = await fetch(
        `${data.root}swisswpsuite/v1/license/refund-request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-WP-Nonce": data.nonce,
          },
          body: JSON.stringify({}),
        }
      );
      const json = await res.json().catch(() => null);
      if (!json || typeof json !== "object") {
        toast.error(
          "Unexpected response from the server. Please refresh and try again."
        );
        return;
      }
      if (json.success) {
        toast.success(
          json.message ||
            "Please check your email and click the confirmation link to complete your refund request.",
          { duration: 12000 }
        );
        return;
      }
      // Non-success: prefer the VPS's own human-readable message; fall back to the map.
      toast.error(json.message || mapLicenseActionError(json.error));
    } catch {
      toast.error(
        "Couldn't reach the server — your request was not sent. Please check your connection and try again."
      );
    } finally {
      setRequestingRefund(false);
    }
  };

  // Confirm step before sending the request (consistent with the cancel/deactivate flows).
  const handleRequestRefund = () => {
    toast.warning(
      "Request a refund? Refunds are a one-time goodwill gesture issued at our discretion under our Terms of Service. We'll email you a link to confirm. If a refund is issued, this license will be revoked and access will end. Your statutory rights are unaffected.",
      {
        duration: 14000,
        action: {
          label: "Request refund",
          onClick: () => callRefundRequest(),
        },
      }
    );
  };

  const [showNewKeyInput, setShowNewKeyInput] = useState(true);

  const doDeactivate = async () => {
    setIsDeactivating(true);
    try {
      const res = await fetch(
        `${window.swisswpsuiteData.root}swisswpsuite/v1/license/deactivate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-WP-Nonce": window.swisswpsuiteData.nonce,
          },
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Deactivation failed");
      }
      toast.success("License deactivated successfully. Reloading...");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      toast.error(err.message || "Deactivation failed");
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleDeactivate = () => {
    // handleDeactivate toast FIX: Add 10s duration for destructive action confirmation.
    toast.warning("Are you sure you want to deactivate this license?", {
      duration: 10000,
      action: {
        label: "Deactivate",
        onClick: () => doDeactivate(),
      },
    });
  };

  const handleActivate = async () => {
    if (!key.trim()) {
      toast.error("Please enter a license key");
      return;
    }

    try {
      await onActivate(key);
      toast.success("License Activated! Reloading...");
      // CRITICAL: Hard reload to refresh PHP globals/capabilities
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      toast.error(err.message || "Activation failed");
    }
  };

  // Freemium Dual-Build (Phase 3): a paid key activated on the Free edition
  // gets its own dedicated view — never the normal active-license layout.
  // Showing the Token Balance card or Feature Matrix checkmarks here would
  // claim paid features are usable when the code to run them isn't present
  // in this build. The user can still deactivate or try a different key.
  if (isProKeyInFreeBuild) {
    const unlockedLabels = suiteIncludedFeatures.map((f) => f.label);
    return (
      <div className="space-y-6">
        <Card noPadding className="overflow-hidden">
          <div className="bg-muted text-foreground border-border flex items-center justify-between border-b p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3 shadow-sm">
                <Sparkles
                  className="h-5 w-5 text-indigo-600"
                  aria-hidden="true"
                />
              </div>
              <div>
                <h3 className="text-foreground text-sm font-black tracking-[0.2em] uppercase">
                  License
                </h3>
                <p className="text-muted-foreground mt-1 text-xs">
                  Manage your SwissSuite subscription
                </p>
              </div>
            </div>
            <Badge variant="warning">Pro Key, Free Plugin</Badge>
          </div>

          <div className="space-y-6 p-8">
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-800/50 dark:bg-indigo-950/30">
              <p className="text-sm font-black tracking-widest text-indigo-900 uppercase dark:text-indigo-200">
                This key is for SwissSuite AI Pro
              </p>
              <p className="mt-2 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                Your license key ({tier}) is valid, but you&apos;re running the
                free SwissSuite AI plugin — it only includes local security
                &amp; backup features. Download &amp; install SwissSuite AI Pro
                to use everything included in your plan
                {unlockedLabels.length > 0
                  ? ` (${unlockedLabels.join(", ")})`
                  : ""}
                . Your key keeps working — nothing to reconfigure.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                {/* text-white!/text-indigo-700!/dark:text-indigo-300! hardened
                    against wp-admin's unlayered <a> color rule beating
                    Tailwind's layered utility (Cascade Layers spec) — same
                    bug already fixed in ProUpsellPlaceholder.tsx; this is a
                    separate hand-rolled CTA pair that needed the same fix. */}
                <a
                  href={PRO_DOWNLOAD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-black tracking-widest text-white! uppercase shadow-sm transition-colors hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500/60 focus:ring-offset-2 focus:outline-none"
                >
                  <Download size={14} aria-hidden="true" />
                  Download &amp; Install Pro
                </a>
                <a
                  href={PRO_UPGRADE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-indigo-300 px-5 py-2.5 text-xs font-black tracking-widest text-indigo-700! uppercase transition-colors hover:bg-indigo-100 focus:ring-2 focus:ring-indigo-500/60 focus:ring-offset-2 focus:outline-none dark:border-indigo-700 dark:text-indigo-300! dark:hover:bg-indigo-900/30"
                >
                  View Your Plan
                  <ArrowUpRight size={12} aria-hidden="true" />
                </a>
              </div>
            </div>

            <div className="border-border flex flex-col gap-3 border-t pt-6 sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                variant="outline"
                onClick={handleDeactivate}
                loading={isDeactivating}
                disabled={isDeactivating}
                className="w-full justify-center border-red-200/30 text-red-600 hover:bg-red-50 hover:text-red-700 sm:w-auto dark:hover:bg-red-900/20 dark:hover:text-red-300"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Deactivate License
              </Button>
            </div>

            <div>
              <label className="text-muted-foreground mb-3 block text-xs font-black tracking-widest uppercase">
                Try a Different Key
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Lock className="text-muted-foreground absolute top-3.5 left-4 h-4 w-4" />
                  <input
                    type="text"
                    aria-label="License key"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    className="border-border bg-background text-foreground focus:ring-primary h-[44px] w-full rounded-xl border pr-4 pl-11 font-mono text-sm uppercase shadow-sm transition-all outline-none placeholder:normal-case focus:ring-2"
                    placeholder="SWS-XXXX-XXXX-XXXX"
                  />
                </div>
                <Button
                  onClick={handleActivate}
                  loading={isActivating}
                  disabled={isActivating || !key}
                  variant="primary"
                  className="h-[44px] px-8 font-bold tracking-wider uppercase shadow-sm"
                >
                  Activate
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* License Card */}
        <Card noPadding className="group relative overflow-hidden">
          <div className="bg-muted text-foreground border-border flex items-center justify-between border-b p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 shadow-sm">
                <Shield className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-foreground text-sm font-black tracking-[0.2em] uppercase">
                  License
                </h3>
                <p className="text-muted-foreground mt-1 text-xs">
                  Manage your SwissSuite subscription
                </p>
              </div>
            </div>
            <Badge variant={isActive ? "success" : "secondary"}>
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>

          <div className="space-y-8 p-8">
            {effectiveLicense?.warning === "payment_failed" && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-800">
                <div className="flex items-center gap-2">
                  <svg
                    className="h-5 w-5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <p className="font-semibold">Payment Issue</p>
                    <p className="text-sm">
                      Your last payment could not be processed. Please update
                      your payment method to avoid service interruption.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div>
              <p className="text-muted-foreground mb-2 text-xs font-black tracking-widest uppercase">
                Plan
              </p>
              <h3 className="text-foreground text-3xl leading-tight font-black tracking-tight">
                {tier}
              </h3>
              {trialStatus.active && trialStatus.ends_at && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-1.5">
                  <AlertTriangle size={14} className="text-yellow-600" />
                  <span className="text-xs leading-none font-black tracking-widest text-yellow-600 uppercase">
                    Trial Ends:{" "}
                    {new Date(trialStatus.ends_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {/* License cache hint — always visible */}
            <div className="text-muted-foreground flex items-start gap-2 text-xs">
              <Info
                className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 opacity-60"
                aria-hidden="true"
              />
              <span>
                License status is cached locally and may take up to 24 hours to
                reflect changes. Click the refresh button to check for updates
                immediately.
              </span>
            </div>

            {/* Freemium Dual-Build (Phase 3): contextual, non-nagging Free
                edition promo — Guideline 11 compliant (own admin page only,
                not a site-wide notice). Never shown once isProKeyInFreeBuild
                is true (that case early-returns its own dedicated view above). */}
            {isFreeEdition() && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-5 dark:border-indigo-800/50 dark:bg-indigo-950/20">
                <div className="flex items-start gap-3">
                  <Sparkles
                    className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-xs font-black tracking-widest text-indigo-900 uppercase dark:text-indigo-200">
                      You&apos;re on SwissSuite AI Free
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
                      Cloud backup, 2FA, hardening, geo-blocking, AI security
                      scans, AI SEO &amp; AI content are available in SwissSuite
                      AI Pro.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                      {/* text-indigo-700!/dark:text-indigo-300! — same
                          wp-admin cascade-layer link-color bug as the CTA
                          pair above; see ProUpsellPlaceholder.tsx for detail. */}
                      <a
                        href={PRO_UPGRADE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700! hover:underline dark:text-indigo-300!"
                      >
                        Upgrade to Pro
                        <ArrowUpRight size={11} aria-hidden="true" />
                      </a>
                      <a
                        href={PRO_DOWNLOAD_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-indigo-700! hover:underline dark:text-indigo-300!"
                      >
                        Already Purchased? Download Pro
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!isActive ? (
              <div className="space-y-6">
                <div>
                  <label className="text-muted-foreground mb-3 block text-xs font-black tracking-widest uppercase">
                    License Key
                  </label>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                      <Lock className="text-muted-foreground absolute top-3.5 left-4 h-4 w-4" />
                      <input
                        type="text"
                        aria-label="License key"
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        className="border-border bg-background text-foreground focus:ring-primary h-[44px] w-full rounded-xl border pr-4 pl-11 font-mono text-sm uppercase shadow-sm transition-all outline-none placeholder:normal-case focus:ring-2"
                        placeholder="SWS-XXXX-XXXX-XXXX"
                      />
                    </div>
                    <Button
                      onClick={handleActivate}
                      loading={isActivating}
                      disabled={isActivating || !key}
                      variant="primary"
                      className="h-[44px] px-8 font-bold tracking-wider uppercase shadow-sm"
                    >
                      Activate
                    </Button>
                  </div>
                  <p className="text-muted-foreground mt-3 text-xs">
                    Already paid?{" "}
                    <a
                      href="https://swisswpsecure.com/pricing"
                      target="_blank"
                      rel="noopener"
                      className="text-blue-600 hover:underline"
                    >
                      Manage subscription
                    </a>
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="bg-muted/50 border-border group/key relative overflow-hidden rounded-2xl border p-6 transition-colors">
                  <p className="text-muted-foreground mb-3 text-xs font-black tracking-widest uppercase">
                    License Key
                  </p>
                  <code className="text-foreground relative z-10 font-mono text-xl font-black tracking-widest">
                    {effectiveLicense?.masked_key || "No key linked"}
                  </code>
                </div>

                {/* License expiry date */}
                {effectiveLicense?.expires &&
                effectiveLicense.expires !== "lifetime" ? (
                  <div className="flex items-center gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800/50 dark:bg-blue-950/30">
                    <Calendar
                      className="h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400"
                      aria-hidden="true"
                    />
                    <div>
                      <span className="text-xs font-black tracking-widest text-blue-700 uppercase dark:text-blue-300">
                        License expires:{" "}
                      </span>
                      <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                        {new Date(effectiveLicense.expires).toLocaleDateString(
                          undefined,
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </span>
                    </div>
                  </div>
                ) : effectiveLicense?.expires === "lifetime" ? (
                  <div className="flex items-center gap-2.5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800/50 dark:bg-green-950/30">
                    <Calendar
                      className="h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-400"
                      aria-hidden="true"
                    />
                    <span className="text-xs font-black tracking-widest text-green-700 uppercase dark:text-green-300">
                      Lifetime License — Never Expires
                    </span>
                  </div>
                ) : null}

                {/* Manage Billing — only for paid, Stripe-managed licenses (explicit
                    backend flag, not inferred). Manually-issued (comped/InvoiceNinja/
                    support) licenses get a non-Stripe support notice instead. */}
                {showManageBillingButton && (
                  <div className="flex items-center gap-2.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 dark:border-indigo-800/50 dark:bg-indigo-950/30">
                    <CreditCard
                      className="h-4 w-4 flex-shrink-0 text-indigo-600 dark:text-indigo-400"
                      aria-hidden="true"
                    />
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={handleManageBilling}
                        disabled={isOpeningPortal}
                        aria-busy={isOpeningPortal}
                        aria-label="Open Stripe billing portal to manage payment, cancel, or download invoices"
                        className="text-left text-xs font-black tracking-widest text-indigo-700 uppercase hover:underline disabled:no-underline disabled:opacity-50 dark:text-indigo-300"
                      >
                        {isOpeningPortal ? "Opening…" : "Manage Billing"}
                      </button>
                      <span className="text-muted-foreground text-xs">
                        Update payment, cancel, or download invoices
                      </span>
                    </div>
                  </div>
                )}

                {/* A5: customer-initiated refund request. Shown for paid, Stripe-managed
                    licenses. Clicking sends nothing until the user confirms via an
                    emailed link; the VPS enforces eligibility (one-time goodwill cap).
                    Nothing is charged or revoked by requesting — a refund, if issued, is
                    processed manually by our team. */}
                {showManageBillingButton && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/50 dark:bg-amber-950/30">
                    <Coins
                      className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400"
                      aria-hidden="true"
                    />
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={handleRequestRefund}
                        disabled={requestingRefund}
                        aria-busy={requestingRefund}
                        aria-label="Request a refund for your SwissSuite AI license"
                        className="text-left text-xs font-black tracking-widest text-amber-700 uppercase hover:underline disabled:no-underline disabled:opacity-50 dark:text-amber-300"
                      >
                        {requestingRefund ? "Sending…" : "Request a refund"}
                      </button>
                      <span className="text-muted-foreground text-xs">
                        One-time goodwill gesture, at our discretion under our
                        Terms of Service. We'll email you a link to confirm.
                        Your statutory rights are unaffected.
                      </span>
                    </div>
                  </div>
                )}

                {showManualBillingNotice && (
                  <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700/50 dark:bg-slate-800/30">
                    <Info
                      className="h-4 w-4 flex-shrink-0 text-slate-600 dark:text-slate-400"
                      aria-hidden="true"
                    />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-black tracking-widest text-slate-700 uppercase dark:text-slate-300">
                        Manually Managed License
                      </span>
                      <span className="text-muted-foreground text-xs">
                        This license is managed manually. To change your plan or
                        billing, please{" "}
                        <a
                          href="https://swisswpsecure.com/contact"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-slate-700 underline hover:no-underline dark:text-slate-300"
                        >
                          contact support
                        </a>
                        .
                      </span>
                    </div>
                  </div>
                )}

                {/* Option A: per-feature subscriptions with independent expiry + upgrade */}
                {effectiveLicense?.subscriptions &&
                  Object.keys(effectiveLicense.subscriptions).length > 0 && (
                    <div
                      className="mt-1 space-y-1"
                      aria-label="Feature subscriptions"
                    >
                      <p className="text-muted-foreground mb-1 text-xs font-black tracking-widest uppercase">
                        Feature Subscriptions
                      </p>
                      <ul role="list" className="space-y-1">
                        {(
                          Object.entries(
                            effectiveLicense.subscriptions
                          ) as Array<[string, FeatureSubscription]>
                        ).map(([feature, sub]) => {
                          const expired = !sub.active;
                          const expiryLabel = sub.expires_at
                            ? new Date(sub.expires_at).toLocaleDateString(
                                undefined,
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                }
                              )
                            : "N/A";
                          const annualTier = sub.tier?.includes("_monthly")
                            ? sub.tier.replace("_monthly", "_yearly")
                            : null;
                          // Stripe-managed gating (2026-07-05): a manually-granted
                          // feature (no real Stripe subscription behind it) can't
                          // go through proration — the VPS would return
                          // NO_STRIPE_SUB. `undefined` (pre-deploy cached subs)
                          // defaults to stripe-managed for back-compat; only an
                          // explicit `false` hides the buttons.
                          const featureIsStripeManaged =
                            sub.stripe_managed !== false;
                          // Feature A: auto-renewal off → "Cancels on", else "Renews on".
                          const cancelling = sub.cancel_at_period_end === true;
                          // Feature D: expiry-proximity badge. yellow ≤14 days, red ≤3 days.
                          const days = sub.days_remaining;
                          const showBadge =
                            !expired && typeof days === "number" && days <= 14;
                          const badgeRed =
                            typeof days === "number" && days <= 3;
                          const busy = cancellingFeature === feature;
                          return (
                            <li
                              key={feature}
                              className={`flex items-start justify-between rounded-lg border px-3 py-2 text-xs ${
                                expired
                                  ? "border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-950/30"
                                  : "border-green-200 bg-green-50 dark:border-green-800/50 dark:bg-green-950/30"
                              }`}
                            >
                              <div className="flex flex-col gap-0.5">
                                <span className="flex items-center gap-1.5 font-bold capitalize">
                                  {feature}
                                  {showBadge && (
                                    <span
                                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                        badgeRed
                                          ? "bg-red-600 text-white"
                                          : "bg-yellow-400 text-yellow-950"
                                      }`}
                                    >
                                      {days <= 0
                                        ? "Expires today"
                                        : `${days}d left`}
                                    </span>
                                  )}
                                </span>
                                <span
                                  className={
                                    expired
                                      ? "text-red-600 dark:text-red-400"
                                      : cancelling
                                        ? "text-orange-600 dark:text-orange-400"
                                        : "text-muted-foreground"
                                  }
                                >
                                  {expired
                                    ? "Expired"
                                    : cancelling
                                      ? `Cancels ${expiryLabel}`
                                      : `Renews ${expiryLabel}`}
                                </span>
                                {/* Per-feature isolated token balance bar (Phase 5).
                                    Only renders once migration v24 fields are present
                                    (token_limit > 0 guards against pre-v24 cached data). */}
                                {typeof sub.token_balance === "number" &&
                                  typeof sub.token_limit === "number" &&
                                  sub.token_limit > 0 && (
                                    <div className="mt-1.5 min-w-[120px]">
                                      <div className="mb-0.5 flex items-center justify-between gap-2">
                                        <span className="text-muted-foreground text-xs tabular-nums">
                                          {sub.token_balance.toLocaleString()} /{" "}
                                          {sub.token_limit.toLocaleString()}{" "}
                                          tokens
                                        </span>
                                        <span className="text-muted-foreground text-xs font-semibold tabular-nums">
                                          {calculatePercent(
                                            sub.token_balance,
                                            sub.token_limit
                                          )}
                                          %
                                        </span>
                                      </div>
                                      <div className="h-1 overflow-hidden rounded-full bg-black/10">
                                        <div
                                          className="h-full rounded-full bg-blue-500 transition-all duration-700"
                                          role="progressbar"
                                          aria-valuenow={calculatePercent(
                                            sub.token_balance,
                                            sub.token_limit
                                          )}
                                          aria-valuemin={0}
                                          aria-valuemax={100}
                                          aria-label={`${feature} token balance: ${sub.token_balance.toLocaleString()} of ${sub.token_limit.toLocaleString()} remaining`}
                                          style={{
                                            width: `${calculatePercent(sub.token_balance, sub.token_limit)}%`,
                                          }}
                                        />
                                      </div>
                                    </div>
                                  )}
                              </div>
                              <div className="ml-2 flex shrink-0 items-center gap-1.5">
                                {!expired &&
                                  annualTier &&
                                  !cancelling &&
                                  featureIsStripeManaged && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpgradeToAnnual(
                                          feature,
                                          annualTier
                                        )
                                      }
                                      disabled={isUpgrading}
                                      className="rounded bg-indigo-600 px-2 py-1 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                                      aria-label={`Upgrade ${feature} to annual billing`}
                                    >
                                      {isUpgrading
                                        ? "Upgrading…"
                                        : "Upgrade to Annual"}
                                    </button>
                                  )}
                                {!expired &&
                                  !cancelling &&
                                  !featureIsStripeManaged &&
                                  annualTier && (
                                    <span className="text-muted-foreground text-xs italic">
                                      Managed manually
                                    </span>
                                  )}
                                {!expired && cancelling && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleResumeAutoRenewal(feature)
                                    }
                                    disabled={busy}
                                    className="rounded bg-green-600 px-2 py-1 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50"
                                    aria-label={`Resume auto-renewal for ${feature}`}
                                  >
                                    {busy ? "Working…" : "Resume"}
                                  </button>
                                )}
                                {!expired && !cancelling && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleCancelAutoRenewal(
                                        feature,
                                        expiryLabel
                                      )
                                    }
                                    disabled={busy}
                                    className="rounded border border-red-300 px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
                                    aria-label={`Cancel auto-renewal for ${feature}`}
                                  >
                                    {busy ? "Working…" : "Cancel renewal"}
                                  </button>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                {/* Suite license: subscriptions is null (one shared pool). Show the
                    features included in the suite as read-only "Included in SwissSuite"
                    badges sharing a single renewal date — NOT 4 separate Cancel buttons. */}
                {isSuiteLicense && !effectiveLicense?.subscriptions && (
                  <div
                    className="mt-1 space-y-2"
                    aria-label="Suite included features"
                  >
                    <p className="text-muted-foreground mb-1 text-xs font-black tracking-widest uppercase">
                      Feature Subscriptions
                    </p>
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800/50 dark:bg-green-950/30">
                      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-y-1">
                        <span className="text-xs font-bold text-green-800 dark:text-green-300">
                          Included in your SwissSuite
                        </span>
                        {effectiveLicense?.expires &&
                          effectiveLicense.expires !== "lifetime" && (
                            <span className="text-muted-foreground text-xs">
                              Renews {suiteRenewsLabel}
                            </span>
                          )}
                        {effectiveLicense?.expires === "lifetime" && (
                          <span className="text-xs font-semibold text-green-700 dark:text-green-400">
                            Lifetime — Never Expires
                          </span>
                        )}
                      </div>
                      <ul
                        className="flex flex-wrap gap-1.5"
                        role="list"
                        aria-label="Included features"
                      >
                        {suiteIncludedFeatures.map((f) => (
                          <li key={f.key}>
                            <span className="inline-flex items-center gap-1 rounded-full border border-green-300 bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800 dark:border-green-700 dark:bg-green-900/40 dark:text-green-300">
                              <CheckCircle
                                className="h-3 w-3"
                                aria-hidden="true"
                              />
                              {f.label}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {/* One suite-level cancel button. Omits `feature` so the VPS
                          cancels the license-level subscription (E2 fix) — a pure
                          full-suite license has no per-feature rows, so a per-feature
                          request would 404 with FEATURE_SUB_NOT_FOUND. */}
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            handleCancelSuiteRenewal(suiteRenewsLabel)
                          }
                          disabled={!!cancellingFeature}
                          aria-label="Cancel auto-renewal for your SwissSuite plan"
                          className="rounded border border-red-300 px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
                        >
                          {cancellingFeature ? "Working…" : "Cancel renewal"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-border flex flex-col items-start gap-3 border-t border-b pt-6 pb-6 sm:flex-row sm:flex-wrap sm:items-center">
                  <Button
                    variant="outline"
                    onClick={handleDeactivate}
                    loading={isDeactivating}
                    disabled={isDeactivating}
                    className="w-full justify-center border-red-200/30 text-red-600 hover:bg-red-50 hover:text-red-700 sm:w-auto dark:hover:bg-red-900/20 dark:hover:text-red-300"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Deactivate License
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setShowNewKeyInput(!showNewKeyInput)}
                    aria-label={
                      showNewKeyInput
                        ? "Cancel entering a new license key"
                        : "Change license key"
                    }
                    aria-expanded={showNewKeyInput}
                    aria-controls="new-license-key-section"
                    className="w-full justify-center sm:w-auto"
                  >
                    <Lock className="mr-2 h-4 w-4" aria-hidden="true" />
                    {showNewKeyInput ? "Cancel" : "Change License Key"}
                  </Button>

                  <a
                    href="https://swisswpsecure.com/products/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-accent inline-flex items-center gap-2 px-1 text-xs font-black tracking-widest uppercase hover:underline"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    Upgrade your plan
                  </a>
                </div>

                {/* Collapsible New License Input */}
                {showNewKeyInput && (
                  <div
                    id="new-license-key-section"
                    className="animate-in fade-in slide-in-from-top-2 pt-2 duration-300"
                  >
                    <label className="text-muted-foreground mb-3 block text-xs font-black tracking-widest uppercase">
                      New License Key
                    </label>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <div className="relative flex-1">
                        <Lock className="text-muted-foreground absolute top-3.5 left-4 h-4 w-4" />
                        <input
                          type="text"
                          aria-label="New license key"
                          value={key}
                          onChange={(e) => setKey(e.target.value)}
                          className="border-border bg-background text-foreground focus:ring-primary h-[44px] w-full rounded-xl border pr-4 pl-11 font-mono text-sm uppercase shadow-sm transition-all outline-none placeholder:normal-case focus:ring-2"
                          placeholder="SWS-XXXX-XXXX-XXXX"
                        />
                      </div>
                      <Button
                        onClick={handleActivate}
                        loading={isActivating}
                        disabled={isActivating || !key}
                        variant="primary"
                        className="h-[44px] px-8 font-bold tracking-wider uppercase shadow-sm"
                      >
                        Activate New
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* AI Token Balance Card — Pro-only. AI/serviceware (the Groq calls
            that spend tokens) is physically absent from the Free edition,
            so a balance/"Depleted" display is never applicable there — Free
            is 0 tokens by design, not a used-up allowance, and showing this
            read as a false "your balance ran out" scare. */}
        {!isFreeEdition() && (
          <Card noPadding className="group relative overflow-hidden">
            <div className="bg-muted text-foreground border-border flex items-center justify-between border-b p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3 shadow-sm">
                  <Coins className="h-5 w-5 text-yellow-600" />
                </div>
                <h3 className="text-foreground text-sm font-black tracking-[0.2em] uppercase">
                  AI Token Balance
                </h3>
              </div>
            </div>

            <div className="space-y-10 p-8">
              <div className="bg-muted/50 border-border relative overflow-hidden rounded-[2rem] border p-8">
                {/* Item 3 (v2.9.30.13x): when the user owns >1 license, the big
                  headline is the POOLED total spendable across all their licenses
                  (from GET /license/portfolio). The per-site spendable balance is
                  kept as a clearly-labeled secondary line. Single-license users see
                  the per-site balance as the headline exactly as before. */}
                {portfolio && portfolio.license_count > 1 ? (
                  <>
                    <span className="text-muted-foreground text-xs font-black tracking-[0.2em] uppercase">
                      Total Tokens Remaining
                    </span>
                    <div className="text-foreground mt-3 mb-3 text-6xl leading-none font-black tracking-tighter">
                      {portfolio.total_balance.toLocaleString()}
                    </div>
                    <p className="text-muted-foreground mb-3 text-[0.65rem] font-bold tracking-widest uppercase">
                      Pooled across {portfolio.license_count.toLocaleString()}{" "}
                      licenses
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]"></div>
                      <p className="text-muted-foreground text-xs font-black tracking-widest uppercase">
                        {tokenStatus.balance.toLocaleString()} spent against
                        this site&apos;s license
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground text-xs font-black tracking-[0.2em] uppercase">
                      Tokens Remaining
                    </span>
                    <div className="text-foreground mt-3 mb-3 text-6xl leading-none font-black tracking-tighter">
                      {tokenStatus.balance.toLocaleString()}
                    </div>
                    {/* v32: purchased token-pack pool — only rendered when the user owns
                        a pack. "Monthly: X · Purchased: Y" makes the headline number's
                        meaning explicit once a second pool exists. AA contrast via
                        text-foreground for the values. */}
                    {tokenStatus.pack_balance > 0 && (
                      <div className="text-muted-foreground mb-3 flex flex-wrap items-baseline gap-x-2 text-xs font-black tracking-widest uppercase">
                        <span>
                          Monthly:{" "}
                          <span className="text-foreground">
                            {tokenStatus.balance.toLocaleString()}
                          </span>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          Purchased:{" "}
                          <span className="text-foreground">
                            {tokenStatus.pack_balance.toLocaleString()}
                          </span>
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]"></div>
                      <p className="text-muted-foreground text-xs font-black tracking-widest uppercase">
                        Tokens Used (This Period):{" "}
                        {tokensUsedThisPeriod.toLocaleString()}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-xs font-black tracking-[0.2em] uppercase">
                  <span className="text-muted-foreground">Sync Status</span>
                  <span
                    className={
                      tokenStatus.balance > 0
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {tokenStatus.balance > 0 ? "Active" : "Depleted"}
                  </span>
                </div>
                <div className="bg-muted border-border h-3 overflow-hidden rounded-full border p-0.5 shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${tokenStatus.balance > 0 ? "bg-green-500" : "bg-red-500"}`}
                    style={{ width: tokenStatus.balance > 0 ? "85%" : "100%" }}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="h-[44px] flex-1 gap-3 text-xs font-bold tracking-wider uppercase"
                  onClick={() =>
                    window.open("https://swisswpsecure.com/products/", "_blank")
                  }
                >
                  <Coins className="h-4 w-4 text-yellow-600" />
                  Buy More Tokens
                </Button>
                <Button
                  variant="secondary"
                  className="h-[44px] px-3 text-xs font-bold tracking-wider uppercase"
                  onClick={handleRefreshLicense}
                  loading={isRefreshing}
                  title="Sync token balance from server"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Token Portfolio — total available across ALL of the user's licenses.
            Informational supplement; only rendered when the user owns >1 license. */}
        {portfolio && portfolio.license_count > 1 && (
          <Card noPadding className="overflow-hidden">
            <div className="bg-muted text-foreground border-border flex items-center justify-between border-b p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3 shadow-sm">
                  <Layers className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="text-foreground text-sm font-black tracking-[0.2em] uppercase">
                  Total Across Licenses
                </h3>
              </div>
            </div>

            <div className="space-y-8 p-8">
              <div className="bg-muted/50 border-border relative overflow-hidden rounded-[2rem] border p-8">
                <span className="text-muted-foreground text-xs font-black tracking-[0.2em] uppercase">
                  Available Across All Licenses
                </span>
                <div className="text-foreground mt-3 mb-3 text-6xl leading-none font-black tracking-tighter">
                  {portfolio.total_balance.toLocaleString()}
                </div>
                <p className="text-muted-foreground text-xs font-black tracking-widest uppercase">
                  {portfolio.total_balance.toLocaleString()} tokens available
                  across {portfolio.license_count.toLocaleString()} licenses
                </p>
              </div>

              {/* Aggregate remaining-vs-limit bar (safe percent, never NaN) */}
              <div className="space-y-4">
                <div className="flex justify-between text-xs font-black tracking-[0.2em] uppercase">
                  <span className="text-muted-foreground">
                    Pooled Remaining
                  </span>
                  <span className="text-indigo-600">
                    {calculatePercent(
                      portfolio.total_balance,
                      portfolio.total_limit
                    )}
                    %
                  </span>
                </div>
                <div className="bg-muted border-border h-3 overflow-hidden rounded-full border p-0.5 shadow-inner">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all duration-1000"
                    style={{
                      width: `${calculatePercent(
                        portfolio.total_balance,
                        portfolio.total_limit
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Per-license breakdown (keys masked to last-4) */}
              <ul className="divide-border divide-y">
                {portfolio.licenses.map((lic, i) => (
                  <li
                    key={`${lic.key_masked}-${i}`}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground font-mono text-xs">
                        {lic.key_masked}
                      </span>
                      <span className="text-foreground text-xs font-bold tracking-wide uppercase">
                        {formatPlanName(lic.plan)}
                      </span>
                    </div>
                    <span className="text-foreground text-sm font-black tabular-nums">
                      {lic.balance.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="text-muted-foreground flex items-start gap-2 text-xs">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Each license has its own per-site balance. This total is shown
                  for reference only — tokens are spent against the license
                  active on this site.
                </span>
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Feature Matrix */}
      <Card noPadding className="overflow-hidden">
        <div className="bg-muted border-border flex items-center justify-between border-b p-5">
          <h3 className="text-foreground text-xs font-black tracking-[0.3em] uppercase">
            Your Plan Features
          </h3>
          <Badge variant="secondary" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" aria-hidden="true" />
            Verified
          </Badge>
        </div>
        <div className="divide-border grid grid-cols-1 divide-y md:grid-cols-2 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          <FeatureItem title="Daily Malware Scan" active={true} />
          <FeatureItem
            title="Smart WAF Firewall"
            // Factual fix: basic WAF (firewall_basic — 5 SQLi + 4 XSS + path
            // traversal rules) ships in every edition, including Free — see
            // SwissWPSuite_License::get_free_capabilities() in
            // class-swisswpsuite-license.php. Checking only "waf" (the
            // advanced/AI-tier capability) showed this row locked for every
            // Free-edition user even though basic WAF is genuinely active.
            active={
              Array.isArray(capabilities) &&
              (capabilities.includes("waf") ||
                capabilities.includes("firewall_basic"))
            }
          />
          <FeatureItem
            title="AI Deep Audit"
            active={
              Array.isArray(capabilities) && capabilities.includes("ai_scan")
            }
          />
          <FeatureItem
            title="SEO Automation"
            active={
              Array.isArray(capabilities) && capabilities.includes("seo_meta")
            }
          />
          <FeatureItem
            title="Content Rewriter"
            active={
              Array.isArray(capabilities) &&
              capabilities.includes("content_rewrite")
            }
          />
          <FeatureItem
            title="Cloud Backup & Sync"
            active={
              Array.isArray(capabilities) &&
              capabilities.includes("backup_cloud")
            }
          />
        </div>
      </Card>
    </div>
  );
}

const FeatureItem = ({ title, active }: { title: string; active: boolean }) => (
  <div
    className={`flex items-center gap-3 p-5 ${active ? "bg-background" : "bg-muted/30 opacity-60"} border-border border-b lg:border-b-0`}
  >
    {active ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <Lock className="text-muted-foreground h-4 w-4" />
    )}
    <span
      className={`text-xs font-bold tracking-wide uppercase ${active ? "text-foreground" : "text-muted-foreground"}`}
    >
      {title}
    </span>
  </div>
);
