/**
 * Authored by: Frontend Specialist
 * Skills: react-patterns, tailwind-patterns, ui-ux-pro-max
 * Date: 2026-08-04
 *
 * WP.org listing-compliance upsell redesign (docs/reports/
 * PROMPT_UPSELL_REDESIGN_SPRINT_2026-08-03.md, design point 3) — the ONE
 * sanctioned selling surface left in the Free build, per the reviewers' own
 * checklist ("Upselling is permitted from plugin settings screen or a link
 * on their entry on the plugin list page." —
 * docs/wporg-compliance-kb/09-review-checklist.md:187).
 *
 * This REPLACES the old per-tab `ProUpsellPlaceholder` that used to sit in
 * SettingsPage.tsx's "api" tab (and its dead-code mirror,
 * ApiConfig.freeStub.tsx). It also absorbs what the removed License-tab and
 * 2FA-card placeholders used to say — there is now exactly one place in the
 * Free build that explains edition/module status, matching the sprint's
 * "invert the structure" directive (all selling collapses to one Settings
 * surface; every other page gets, at most, a plain-text pointer here).
 *
 * Deliberately NOT a `ProUpsellPlaceholder`: informational only, no
 * "Upgrade"/"Download" CTA pair, no bullets-as-marketing-copy framing — a
 * plain per-module table plus exactly ONE link to the product page, per
 * the design spec ("No connect button, no test button, no input fields in
 * Free — a control that exists only to fail is the exact trialware shape
 * of rejected register row #1"). The Pro build's real AI-connection UI
 * (ApiConfig.tsx) is untouched by this file.
 */
import React from "react";
import { Zap, Lock, CheckCircle2 } from "lucide-react";
import { Card } from "../../ui/Card";
import { PRO_UPGRADE_URL, PRO_DOWNLOAD_URL, hasEditionMismatch } from "../../../lib/edition";

interface ModuleRow {
  name: string;
  free: boolean;
  note?: string;
}

// Source: docs/architecture/FREEMIUM_DUAL_BUILD_ARCHITECTURE.md §2 (owner-
// confirmed feature matrix). Kept as a flat, honest list rather than a
// marketing "what you get" bullet list — this is a reference table, not a
// pitch.
const MODULES: ModuleRow[] = [
  { name: "Malware scanner & quarantine", free: true },
  // WP.org R4 (owner ruling OD-3, 2026-08-22, docs/reports/
  // WPORG_REJECTION_R4_ANALYSIS_2026-08-22.md): Deep Malware Scan's local +
  // threat-database phases (enumerate, hashing, VPS hash-database lookup,
  // local signature scan, WPScan/Patchstack CVE lookup) are now Free — only
  // the final AI-grading phase stays genuinely Pro-only serviceware (see
  // docs/capabilities/SECURITY_CAPABILITIES_REFERENCE.md's "Deep Malware
  // Scan" section for the full mechanism).
  {
    name: "Deep Malware Scan (Layer 2) — local + threat-database phases",
    free: true,
    note: "AI grading is Pro",
  },
  { name: "Basic firewall (WAF)", free: true },
  { name: "Hardening (all 12 one-click options)", free: true },
  { name: "Login protection & IP allow/ban lists", free: true },
  { name: "Local backup & restore", free: true },
  { name: "On-page SEO audit, XML sitemap & AI-guide file", free: true },
  { name: "Two-factor authentication (2FA)", free: false },
  { name: "Geo-blocking", free: false },
  { name: "Advanced WAF rule sets", free: false },
  { name: "Cloud backup destinations & schedules", free: false },
  { name: "Site sync & migration", free: false },
  { name: "Update Guard (snapshot / rollback)", free: false },
  {
    name: "AI security analysis, AI SEO meta generation & AI content rewriting",
    free: false,
    note: "AI connection",
  },
];

export function EditionsAiInfo() {
  const mismatch = hasEditionMismatch();
  return (
    <Card className="max-w-3xl space-y-5 p-6">
      <div className="border-border flex items-center gap-3 border-b pb-4">
        <div className="rounded-lg bg-indigo-100 p-2 dark:bg-indigo-900/30">
          <Zap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h3 className="dark:text-foreground text-lg font-semibold text-neutral-900">
            Editions &amp; AI Connection
          </h3>
          <p className="text-xs text-neutral-700 dark:text-neutral-400">
            What this Free edition includes, and what the Pro edition adds
          </p>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
        This Free edition works fully with no license key, no account, and
        no calls to our servers. AI-powered features are only available in
        the Pro edition, where they are routed through the SwissSuite AI
        service and authenticated automatically by your Pro license key —
        there is no separate AI API key to configure here.
      </p>

      <ul className="divide-border divide-y">
        {MODULES.map((m) => (
          <li key={m.name} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="text-neutral-800 dark:text-neutral-200">
              {m.name}
              {m.note && (
                <span className="ml-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                  ({m.note})
                </span>
              )}
            </span>
            {m.free ? (
              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={13} aria-hidden="true" />
                Included
              </span>
            ) : (
              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                <Lock size={12} aria-hidden="true" />
                Pro edition
              </span>
            )}
          </li>
        ))}
      </ul>

      <p className="border-border border-t pt-4 text-xs text-neutral-600 dark:text-neutral-400">
        {mismatch ? (
          <>
            Our records show a paid license already associated with this
            site.{" "}
            <a
              href={PRO_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600! underline hover:text-indigo-800! dark:text-indigo-400! dark:hover:text-indigo-300!"
            >
              Download the Pro edition
            </a>{" "}
            to use it on this install.
          </>
        ) : (
          <>
            Full module and pricing details are on the product page at{" "}
            <a
              href={PRO_UPGRADE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600! underline hover:text-indigo-800! dark:text-indigo-400! dark:hover:text-indigo-300!"
            >
              swisswpsecure.com
            </a>
            .
          </>
        )}
      </p>
    </Card>
  );
}

export default EditionsAiInfo;
