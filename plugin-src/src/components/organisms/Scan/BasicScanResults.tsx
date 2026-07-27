import React, { useState, useMemo } from "react";
import { ShieldCheck } from "lucide-react";
import { Badge } from "../../ui/Badge";

// ---------------------------------------------------------------------------
// Constants — moved from SecurityHub.tsx (only used by this component)
// ---------------------------------------------------------------------------

const BASIC_SCAN_KNOWN_SAFE = new Set([
  "readme.html",
  "readme.txt",
  "license.txt",
  "wp-config-sample.php",
  "xmlrpc.php",
  "wp-content/plugins/hello.php",
]);

/**
 * Classify a basic-scan file finding into a risk category.
 * Uses the `category` field from PHP when available (v2.9.27.11+),
 * otherwise infers from the file path for backward compatibility
 * with cached scan results from before the update.
 *
 * Mirrors SwissWPSuite_Security::classify_core_finding() in PHP.
 */
function classifyBasicScanFinding(
  file: string,
  status: string,
  category?: string,
): string {
  // Use PHP-supplied category when present (new scans).
  if (category) return category;

  // Backward compat: infer from path (cached results without category).
  if (status === "missing" && BASIC_SCAN_KNOWN_SAFE.has(file))
    return "known_safe_missing";
  if (file.startsWith("wp-content/plugins/")) return "bundled_plugin";
  if (file.startsWith("wp-content/themes/")) return "theme_modified";
  if (status === "missing") return "core_missing";
  return "core_modified";
}

/** Metadata for each basic scan category group. */
const BASIC_SCAN_GROUPS: {
  key: string;
  label: string;
  description: string;
  severity: "danger" | "warning" | "info";
  defaultExpanded: boolean;
}[] = [
  {
    key: "core_modified",
    label: "Modified Core Files",
    description:
      "These WordPress core files have been modified and no longer match official checksums. This may indicate tampering or a failed update.",
    severity: "danger",
    defaultExpanded: true,
  },
  {
    key: "core_missing",
    label: "Missing Core Files",
    description:
      "These WordPress core files are missing from the installation. This may indicate tampering or a failed update.",
    severity: "danger",
    defaultExpanded: true,
  },
  {
    key: "theme_modified",
    label: "Bundled Theme Changes",
    description:
      "These files belong to WordPress-bundled themes. Changes here are common when themes are updated or customized.",
    severity: "warning",
    defaultExpanded: false,
  },
  {
    key: "bundled_plugin",
    label: "Uninstalled Bundled Plugins",
    description:
      "These files belong to WordPress-bundled plugins (e.g. Akismet, Hello Dolly) that are not installed. This is expected and harmless.",
    severity: "info",
    defaultExpanded: false,
  },
  {
    key: "known_safe_missing",
    label: "Safely Removed Files",
    description:
      "These files (readme.html, license.txt, xmlrpc.php, etc.) are commonly removed as a security hardening measure. No action needed.",
    severity: "info",
    defaultExpanded: false,
  },
];

const SEVERITY_BORDER: Record<string, string> = {
  danger: "border-red-200",
  warning: "border-amber-200",
  info: "border-blue-200",
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface BasicScanResultsProps {
  scanResults: {
    issues_found: number;
    details: { file: string; status: string; category?: string }[];
  };
  expanded: boolean;
  onToggleExpanded: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * BasicScanResults — grouped display for core file integrity findings.
 * Replaces the old flat list. Groups findings into 5 risk categories
 * with collapsible sections and per-category explanations.
 */
export const BasicScanResults: React.FC<BasicScanResultsProps> = ({
  scanResults,
  expanded,
  onToggleExpanded,
}) => {
  // Group findings by category.
  const grouped = useMemo(() => {
    const groups: Record<string, { file: string; status: string }[]> = {};
    for (const g of BASIC_SCAN_GROUPS) {
      groups[g.key] = [];
    }
    for (const f of scanResults.details) {
      const cat = classifyBasicScanFinding(f.file, f.status, f.category);
      if (groups[cat]) {
        groups[cat].push(f);
      } else {
        // Unknown category fallback — treat as core_modified.
        groups["core_modified"].push(f);
      }
    }
    return groups;
  }, [scanResults.details]);

  // Count real issues (core_modified + core_missing).
  const realIssueCount =
    grouped["core_modified"].length + grouped["core_missing"].length;

  // Track which groups are expanded.
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    () => {
      const init: Record<string, boolean> = {};
      for (const g of BASIC_SCAN_GROUPS) {
        init[g.key] = g.defaultExpanded;
      }
      return init;
    },
  );

  if (scanResults.issues_found === 0) {
    return (
      <div className="rounded-2xl border p-4 text-xs font-bold bg-emerald-50 border-emerald-200 text-emerald-700">
        <p className="uppercase tracking-widest font-black">
          All core files intact
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border p-4 text-xs space-y-3">
      {/* Summary header */}
      <div className="flex items-center justify-between">
        <p className="uppercase tracking-widest font-black text-neutral-700">
          WordPress Core File Integrity
        </p>
        {realIssueCount > 0 ? (
          <Badge variant="danger">
            {realIssueCount} potential{" "}
            {realIssueCount === 1 ? "issue" : "issues"}
          </Badge>
        ) : (
          <Badge variant="info">{scanResults.issues_found} informational</Badge>
        )}
      </div>

      {/* No real issues banner */}
      {realIssueCount === 0 && (
        <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <ShieldCheck
            size={18}
            className="text-emerald-600 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-semibold text-emerald-800">
              No core file tampering detected
            </p>
            <p className="text-xs text-emerald-700 mt-1">
              {scanResults.issues_found} file{" "}
              {scanResults.issues_found === 1
                ? "difference was"
                : "differences were"}{" "}
              found, but all are expected (uninstalled plugins, removed files,
              or theme updates).
            </p>
          </div>
        </div>
      )}

      {/* Category groups */}
      {BASIC_SCAN_GROUPS.map((meta) => {
        const items = grouped[meta.key];
        if (!items || items.length === 0) return null;

        const isOpen = expandedGroups[meta.key] ?? false;
        const borderColor =
          SEVERITY_BORDER[meta.severity] ?? SEVERITY_BORDER.info;

        return (
          <div
            key={meta.key}
            className="border border-border rounded-xl overflow-hidden"
          >
            <button
              type="button"
              onClick={() =>
                setExpandedGroups((prev) => ({
                  ...prev,
                  [meta.key]: !prev[meta.key],
                }))
              }
              className="w-full flex items-center gap-3 p-3 bg-secondary hover:bg-secondary/80 transition-colors text-left"
              aria-expanded={isOpen}
            >
              <div className="flex-1 min-w-0">
                <span className="font-black text-xs uppercase tracking-widest text-neutral-700">
                  {meta.label}
                </span>
                <span className="ml-2 text-xs font-medium text-neutral-500">
                  ({items.length} {items.length === 1 ? "file" : "files"})
                </span>
              </div>
              <Badge
                variant={
                  meta.severity === "danger"
                    ? "danger"
                    : meta.severity === "warning"
                      ? "warning"
                      : "info"
                }
              >
                {items.length}
              </Badge>
              <span className="text-neutral-400 text-xs shrink-0">
                {isOpen ? "▼" : "▶"}
              </span>
            </button>

            {isOpen && (
              <div className="p-3 space-y-1">
                <p className="text-xs text-neutral-500 font-medium mb-2">
                  {meta.description}
                </p>
                {(expanded ? items : items.slice(0, 10)).map((f, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 py-1 border-b ${borderColor} last:border-b-0`}
                  >
                    <span
                      className={`shrink-0 text-xs font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                        f.status === "modified"
                          ? "bg-red-200 text-red-800"
                          : "bg-amber-200 text-amber-800"
                      }`}
                    >
                      {f.status === "modified" ? "MOD" : "MISS"}
                    </span>
                    <code className="text-xs font-mono truncate flex-1">
                      {f.file}
                    </code>
                  </div>
                ))}
                {!expanded && items.length > 10 && (
                  <button
                    onClick={onToggleExpanded}
                    className="mt-1 text-xs font-black uppercase tracking-widest text-brand-accent hover:underline"
                  >
                    Show all {items.length} files
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Global expand/collapse toggle */}
      {expanded && scanResults.details.length > 10 && (
        <button
          onClick={onToggleExpanded}
          className="text-xs font-black uppercase tracking-widest text-brand-accent hover:underline"
        >
          Show less
        </button>
      )}

      {/* Remediation advice */}
      {realIssueCount > 0 && (
        <p className="text-xs text-neutral-600 font-medium mt-2">
          Use Dashboard &gt; Updates &gt; &ldquo;Reinstall version&rdquo; to
          restore modified or missing core files.
        </p>
      )}
    </div>
  );
};
