import React, { useMemo, useRef, useState } from "react";
import {
  Sparkles,
  ShieldCheck,
  EyeOff,
  Archive,
  ChevronDown,
  ChevronRight,
  Trash2,
  FolderOpen,
  Package,
  Shield,
  Wrench,
  ShieldOff,
  ArrowRight,
  BookOpen,
  AlertTriangle,
  Puzzle,
  Paintbrush,
  CheckCircle,
  FileQuestion,
  Monitor,
  Settings,
} from "lucide-react";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import type { SentinelLayer1Finding } from "../../../types";
import {
  FINDING_SEVERITY_ORDER,
  FINDING_SEVERITY_BORDER,
} from "./sentinelConstants";

interface SentinelLayer1FindingsProps {
  findings: SentinelLayer1Finding[];
  isPro: boolean;
  onRunAIAudit: () => void;
  /** Called when user marks a finding as safe (whitelist via evidence path). */
  onMarkSafe?: (finding: SentinelLayer1Finding) => void;
  /** Called when user quarantines a finding's evidence file. */
  onQuarantine?: (finding: SentinelLayer1Finding) => void;
  /** Called when user deletes a finding's evidence file. */
  onDelete?: (finding: SentinelLayer1Finding) => void;
  /** Called for bulk operations on multiple findings. */
  onBulkAction?: (
    action: "ignore" | "quarantine" | "delete",
    findings: SentinelLayer1Finding[]
  ) => void;
  /** Called when a fix action should be applied (async — handles API + state update). */
  onFix?: (finding: SentinelLayer1Finding) => Promise<void>;
  /** Called when the user should navigate to the Hardening tab. */
  onNavigateHardening?: () => void;
}

// Maps severity to Badge variant
const SEVERITY_BADGE_VARIANT: Record<
  SentinelLayer1Finding["severity"],
  "danger" | "high" | "warning" | "neutral" | "info"
> = {
  critical: "danger",
  high: "high",
  medium: "warning",
  low: "neutral",
  info: "info",
};

type FindingGroup =
  | "environment"
  | "configuration"
  | "known_safe"
  | "vendor"
  | "external";

/**
 * Categorise a finding into a visual group.
 * Module/category checks run FIRST so that environment (M4) and configuration
 * (M3) findings never fall through to the evidence-based file classification.
 */
function classifyFinding(finding: SentinelLayer1Finding): FindingGroup {
  // Module-based classification takes priority over evidence path.
  if (finding.module === "M4" || finding.category === "Environment") {
    return "environment";
  }
  if (finding.module === "M3" || finding.category === "Configuration") {
    return "configuration";
  }

  const evidence = (finding.evidence || "").toLowerCase();

  // Our own plugin upload subdirectories only — match the PHP is_own_upload_dir() prefixes.
  // Must be in the uploads path (not plugins/themes) to avoid misclassifying a third-party
  // plugin that happens to have "swisswpsuite-" or "woosuite-" in its name.
  if (
    (evidence.includes("/uploads/swisswpsuite-") ||
      evidence.startsWith("uploads/swisswpsuite-")) &&
    !evidence.includes("wp-content/plugins/")
  ) {
    return "known_safe";
  }
  if (
    (evidence.includes("/uploads/woosuite-") ||
      evidence.startsWith("uploads/woosuite-")) &&
    !evidence.includes("wp-content/plugins/")
  ) {
    return "known_safe";
  }

  // Vendor directories
  if (evidence.includes("/vendor/")) {
    return "vendor";
  }

  return "external";
}

const GROUP_META: Record<
  FindingGroup,
  {
    label: string;
    description: string;
    icon: React.ElementType;
    defaultExpanded: boolean;
  }
> = {
  environment: {
    label: "Environment",
    description:
      "Server environment observations — WordPress version, PHP version, server headers, plugin inventory, and cloud protection status.",
    icon: Monitor,
    defaultExpanded: true,
  },
  configuration: {
    label: "Configuration",
    description:
      "WordPress configuration findings — debug settings, sensitive files, and wp-config analysis.",
    icon: Settings,
    defaultExpanded: true,
  },
  known_safe: {
    label: "Known Safe (Plugin Files)",
    description:
      "Files from SwissSuite directories -- these are legitimate security stubs and can be safely ignored.",
    icon: Shield,
    defaultExpanded: false,
  },
  vendor: {
    label: "Vendor Libraries",
    description:
      "Third-party library files from plugin/theme vendor directories. These commonly trigger false positives from crypto and encoding patterns.",
    icon: Package,
    defaultExpanded: false,
  },
  external: {
    label: "External Files",
    description:
      "Files outside known-safe directories that require manual review.",
    icon: FolderOpen,
    defaultExpanded: true,
  },
};

const GROUP_ORDER: FindingGroup[] = [
  "environment",
  "configuration",
  "external",
  "vendor",
  "known_safe",
];

// ---------------------------------------------------------------------------
// Core integrity finding categories — groups M1 checksum findings by risk
// ---------------------------------------------------------------------------

type IntegrityCategory =
  | "core_modified"
  | "core_missing"
  | "theme_modified"
  | "bundled_plugin"
  | "known_safe_missing";

const INTEGRITY_GROUP_META: Record<
  IntegrityCategory,
  {
    label: string;
    description: string;
    icon: React.ElementType;
    defaultExpanded: boolean;
    badgeVariant: "danger" | "high" | "warning" | "neutral" | "info";
  }
> = {
  core_modified: {
    label: "Modified Core Files",
    description:
      "These WordPress core files have been modified and no longer match official checksums. This may indicate tampering or a failed update.",
    icon: AlertTriangle,
    defaultExpanded: true,
    badgeVariant: "danger",
  },
  core_missing: {
    label: "Missing Core Files",
    description:
      "These WordPress core files are missing from the installation. This may indicate tampering or a failed update.",
    icon: FileQuestion,
    defaultExpanded: true,
    badgeVariant: "high",
  },
  bundled_plugin: {
    label: "Uninstalled Bundled Plugins",
    description:
      "These files are missing because the plugin was uninstalled. WordPress ships with Akismet and Hello Dolly, but most users remove them. This is expected and safe.",
    icon: Puzzle,
    defaultExpanded: false,
    badgeVariant: "info",
  },
  known_safe_missing: {
    label: "Commonly Removed Files",
    description:
      "These files are often deliberately removed for security hardening (e.g., readme.html exposes WordPress version, xmlrpc.php is an attack target). No action needed.",
    icon: CheckCircle,
    defaultExpanded: false,
    badgeVariant: "neutral",
  },
  theme_modified: {
    label: "Bundled Theme Files",
    description:
      "These bundled theme files differ from the original WordPress release. Theme differences are usually caused by theme updates from your hosting provider or by deleting unused themes.",
    icon: Paintbrush,
    defaultExpanded: false,
    badgeVariant: "info",
  },
};

/** Display order: concerning groups first, informational groups last. */
const INTEGRITY_GROUP_ORDER: IntegrityCategory[] = [
  "core_modified",
  "core_missing",
  "theme_modified",
  "bundled_plugin",
  "known_safe_missing",
];

// ---------------------------------------------------------------------------
// Valid fix_type values — must match the allowlist in fix_security_finding() (api.php).
// Any fix_type not in this set will NOT render a FixItButton.
// ---------------------------------------------------------------------------

const VALID_FIX_TYPES = new Set([
  "chmod_file",
  "chmod_dir",
  "chmod_special",
  "disable_wp_debug",
  "delete_file",
  "delete_sensitive_file",
  "navigate_hardening",
  "manual",
]);

// ---------------------------------------------------------------------------
// Manual fix guides (module-scope constant — not recalculated on render)
// ---------------------------------------------------------------------------

const MANUAL_FIX_GUIDES: Record<string, { title: string; steps: string[] }> = {
  "Modified WP Core Files": {
    title: "How to restore WordPress core files",
    steps: [
      "Log in to your hosting control panel (cPanel, Hostinger hPanel, or Plesk).",
      'Find the WordPress or Auto Installer section and look for a "Reinstall WordPress" or "Reset core files" option. This replaces only the system files — it does NOT touch your content, themes, plugins, or database.',
      "If your host doesn't offer this: download a fresh WordPress copy from wordpress.org/download, unzip it, and upload ONLY the wp-admin/ and wp-includes/ folders via FTP, replacing the existing ones.",
      "After restoring, run a new scan to confirm files match official checksums.",
      "⚠️ Never replace wp-config.php or wp-content/ — these contain your site configuration and content.",
    ],
  },
  "PHP Version Outdated": {
    title: "How to upgrade your PHP version",
    steps: [
      "Log in to your hosting control panel.",
      'Find "PHP Version" or "PHP Configuration" (in cPanel: "Select PHP Version", in Hostinger: "PHP Configuration" under Advanced).',
      "Select PHP 8.1 or newer from the dropdown and click Apply.",
      "Visit your site to confirm it still loads correctly. If you see errors, switch back to the previous version from the same panel.",
      "Tip: Test on a staging site first if you have plugins that may not be compatible with PHP 8.x.",
    ],
  },
  "Admin Username Exists": {
    title: "How to change the default admin username",
    steps: [
      "Go to Users → Add New User in your WordPress admin.",
      "Create a new user with a unique username and set the role to Administrator.",
      "Log out and log back in with the new administrator account.",
      'Go to Users → All Users, hover over the "admin" account, and click Delete.',
      'When prompted, choose "Attribute all content to" your new administrator account.',
      "Click Confirm Deletion.",
      "⚠️ Never delete the admin account before creating a replacement. You could lock yourself out.",
    ],
  },
  "Directory Listing Enabled": {
    title: "How to disable directory listing",
    steps: [
      "Open your site's .htaccess file (in the WordPress root folder) and add this line at the very top: Options -Indexes",
      "Save the file and visit https://yoursite.com/wp-includes/images/ in your browser. If you see a 403 Forbidden error instead of a file listing, the fix worked.",
      "On Nginx (if you use a VPS): ask your hosting provider to add autoindex off; to your server block. This cannot be changed from WordPress.",
      "On Hostinger: go to hPanel → Advanced → Folder Index Manager and set the directory to No index.",
    ],
  },
  "Custom Debug Log Accessible": {
    title: "How to move your debug log outside the web root",
    steps: [
      "Open your wp-config.php file.",
      "Find the line that sets WP_DEBUG_LOG to a file path.",
      "Change the path to a location OUTSIDE your public web directory, for example: define('WP_DEBUG_LOG', '/home/youraccount/logs/debug.log');",
      "Make sure the target directory exists and is writable by your web server.",
      "Run a new scan to confirm the log is no longer accessible via HTTP.",
    ],
  },
  "XML-RPC Partially Mitigated": {
    title: "How to fully block XML-RPC at the server level",
    steps: [
      "SwissSuite's WordPress-level hardening is already active, but your server still responds to XML-RPC requests. This is a server-level gap.",
      "On Apache/LiteSpeed: add this block to your .htaccess file: <Files xmlrpc.php> deny from all </Files>",
      "On Nginx: ask your hosting provider to add: location = /xmlrpc.php { deny all; } to your server block.",
      "On Hostinger: contact support and ask them to block access to xmlrpc.php at the web server level.",
    ],
  },
  "Excessive Admin Accounts": {
    title: "How to audit administrator accounts",
    steps: [
      "Go to Users → All Users in your WordPress admin.",
      "Click the Administrator filter to see only admin accounts.",
      "Review each account. If you don't recognize one or it's no longer in use, delete it (attributing its content to a known admin).",
      "If you find accounts you didn't create, this may indicate a breach — change all administrator passwords immediately.",
    ],
  },
  "Orphaned Database Tables": {
    title: "How to clean up orphaned database tables",
    steps: [
      "Orphaned tables are left behind when plugins or themes are uninstalled without proper cleanup. They waste disk space but are not a direct security threat.",
      "Go to SwissSuite → Settings → Maintenance and use the 'Drop Orphaned Tables' action. This will list the detected tables and let you remove them safely.",
      "Alternatively, log into phpMyAdmin via your hosting panel (Hostinger hPanel → Databases → phpMyAdmin).",
      "Select your WordPress database and look for tables that don't belong to any active plugin (the scan results list the specific table names).",
      "IMPORTANT: Back up your database before dropping any tables. Some tables may contain data you still need.",
      "Note: SwissSuite's Database Cleanup section (clear revisions, clean orphaned meta, etc.) handles row-level cleanup within existing tables — it is a different feature.",
    ],
  },
};

// ---------------------------------------------------------------------------
// FixItButton sub-component
// ---------------------------------------------------------------------------

interface FixItButtonProps {
  finding: SentinelLayer1Finding;
  onFix?: (finding: SentinelLayer1Finding) => Promise<void>;
  onNavigateHardening?: () => void;
  isExpanded: boolean;
  onToggleGuide: () => void;
}

const FixItButton: React.FC<FixItButtonProps> = ({
  finding,
  onFix,
  onNavigateHardening,
  isExpanded,
  onToggleGuide,
}) => {
  const [isFixing, setIsFixing] = useState(false);
  // WCAG 4.1.2 / Screen reader live region: announced politely after fix completes.
  // The node is always in the DOM (NVDA requires this) — content is injected after mount.
  const [liveMessage, setLiveMessage] = useState("");

  const handleFix = async () => {
    if (!onFix) return;
    setIsFixing(true);
    setLiveMessage("");
    try {
      await onFix(finding);
      setLiveMessage(`Fix applied for: ${finding.title}`);
    } finally {
      setIsFixing(false);
    }
  };

  const fixType = finding.fix_type;

  if (!fixType) return null;

  // Navigate to Hardening tab — link style, no fill
  if (fixType === "navigate_hardening") {
    return (
      <Button
        size="sm"
        variant="ghost"
        // WCAG 1.4.3: amber-600 (#D97706) on white = 2.4:1 — fails 4.5:1.
        // amber-800 (#92400E) on white = 5.0:1 — passes.
        className="h-7 rounded-lg px-2 text-amber-800 hover:text-amber-800"
        onClick={() => onNavigateHardening?.()}
        aria-label={`Go to Hardening tab for: ${finding.title}`}
      >
        <ArrowRight size={14} aria-hidden="true" />
        <span className="ml-1 text-xs">Go to Hardening</span>
      </Button>
    );
  }

  // Manual guide — toggle inline expansion
  if (fixType === "manual") {
    return (
      <Button
        size="sm"
        variant="ghost"
        className="h-7 rounded-lg px-2 text-blue-600 hover:text-blue-600"
        onClick={onToggleGuide}
        aria-expanded={isExpanded}
        // WCAG 4.1.2: aria-controls links this button to the controlled region so
        // AT can announce the relationship and offer "jump to controlled element" (JAWS).
        aria-controls={`fix-guide-${finding.id}`}
        aria-label={
          isExpanded
            ? `Collapse fix guide for: ${finding.title}`
            : `Expand fix guide for: ${finding.title}`
        }
      >
        <BookOpen size={14} aria-hidden="true" />
        <span className="ml-1 text-xs">How to Fix</span>
      </Button>
    );
  }

  // Shared polite live region for all async-fix branches.
  // WCAG 4.1.2 / NVDA requirement: node must be in the DOM before content is injected.
  // Rendered as a visually-hidden span; content is set after the fix promise resolves.
  const fixStatusRegion = (
    <span
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {liveMessage}
    </span>
  );

  // Permissions fixes — blue/indigo
  if (
    fixType === "chmod_file" ||
    fixType === "chmod_dir" ||
    fixType === "chmod_special"
  ) {
    return (
      <>
        {fixStatusRegion}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 rounded-lg px-2 text-indigo-600 hover:text-indigo-600"
          onClick={handleFix}
          disabled={isFixing}
          aria-busy={isFixing}
          // WCAG 4.1.2: aria-label reflects current action state so AT users
          // who return focus to the button after clicking hear the updated label.
          aria-label={
            isFixing
              ? `Fixing permissions, please wait…`
              : `Fix permissions for: ${finding.evidence || finding.title}`
          }
        >
          <Wrench size={14} aria-hidden="true" />
          <span className="ml-1 text-xs">
            {isFixing ? "Fixing…" : "Fix Permissions"}
          </span>
        </Button>
      </>
    );
  }

  // Disable WP_DEBUG — blue
  if (fixType === "disable_wp_debug") {
    return (
      <>
        {fixStatusRegion}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 rounded-lg px-2 text-blue-600 hover:text-blue-600"
          onClick={handleFix}
          disabled={isFixing}
          aria-busy={isFixing}
          aria-label={
            isFixing
              ? `Disabling WP_DEBUG, please wait…`
              : `Disable WP_DEBUG for: ${finding.title}`
          }
        >
          <ShieldOff size={14} aria-hidden="true" />
          <span className="ml-1 text-xs">
            {isFixing ? "Disabling…" : "Disable Debug Mode"}
          </span>
        </Button>
      </>
    );
  }

  // Delete file — orange (safe removal, not destructive in the irreversible sense)
  if (fixType === "delete_file") {
    return (
      <>
        {fixStatusRegion}
        <Button
          size="sm"
          variant="ghost"
          // WCAG 1.4.3: orange-600 (#EA580C) on white = 3.0:1 — fails 4.5:1 minimum.
          // orange-700 (#C2410C) on white = 4.6:1 — passes.
          className="h-7 rounded-lg px-2 text-orange-700 hover:text-orange-700"
          onClick={handleFix}
          disabled={isFixing}
          aria-busy={isFixing}
          aria-label={
            isFixing
              ? `Removing file, please wait…`
              : `Remove file: ${finding.evidence || finding.title}`
          }
        >
          <Trash2 size={14} aria-hidden="true" />
          <span className="ml-1 text-xs">
            {isFixing ? "Removing…" : "Remove File"}
          </span>
        </Button>
      </>
    );
  }

  // Delete sensitive file → quarantine — orange
  if (fixType === "delete_sensitive_file") {
    return (
      <>
        {fixStatusRegion}
        <Button
          size="sm"
          variant="ghost"
          // WCAG 1.4.3: same orange-700 fix applied here.
          className="h-7 rounded-lg px-2 text-orange-700 hover:text-orange-700"
          onClick={handleFix}
          disabled={isFixing}
          aria-busy={isFixing}
          aria-label={
            isFixing
              ? `Quarantining file, please wait…`
              : `Quarantine sensitive file: ${finding.evidence || finding.title}`
          }
        >
          <Package size={14} aria-hidden="true" />
          <span className="ml-1 text-xs">
            {isFixing ? "Quarantining…" : "Quarantine File"}
          </span>
        </Button>
      </>
    );
  }

  return null;
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const SentinelLayer1Findings: React.FC<SentinelLayer1FindingsProps> = ({
  findings,
  isPro,
  onRunAIAudit,
  onMarkSafe,
  onQuarantine,
  onDelete,
  onBulkAction,
  onFix,
  onNavigateHardening,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<
    Record<FindingGroup, boolean>
  >({
    environment: GROUP_META.environment.defaultExpanded,
    configuration: GROUP_META.configuration.defaultExpanded,
    known_safe: GROUP_META.known_safe.defaultExpanded,
    vendor: GROUP_META.vendor.defaultExpanded,
    external: GROUP_META.external.defaultExpanded,
  });
  const [expandedGuides, setExpandedGuides] = useState<Set<string>>(new Set());

  // WCAG 2.4.3: After a finding card is removed via "Fix it", focus must move to
  // the next sibling card rather than dropping to <body>. We keep a Map of card
  // DOM nodes keyed by finding.id so we can call .focus() without triggering
  // a re-render. tabIndex={-1} on each card div makes them programmatically
  // focusable while keeping them out of the natural tab order.
  const cardRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());

  // WCAG 2.4.3: When the last finding is fixed, focus the "No threats detected"
  // status div (role="status", tabIndex={-1}) as the logical focus destination.
  const emptyStateRef = useRef<HTMLDivElement>(null);

  /**
   * Sort findings by severity and group them by category.
   * SEC-4 FIX: Filter out status === 'fixed' before sorting/grouping so that
   * findings marked fixed in handleL1Fix() disappear from the rendered list
   * immediately, and don't reappear when SEC-3 loads them from stored history.
   *
   * Core integrity findings (M1 with integrity_category) are separated into
   * their own grouped structure so the UI can render them in risk-based sections
   * (e.g., "Modified Core Files" vs "Uninstalled Bundled Plugins").
   */
  const { sortedFindings, groupedFindings, integrityFindings, realIssueCount } =
    useMemo(() => {
      const sorted = [...findings]
        .filter((f) => f.status !== "fixed")
        .sort(
          // Use ?? 99 so unknown severity values sort last instead of producing NaN.
          (a, b) =>
            (FINDING_SEVERITY_ORDER[a.severity] ?? 99) -
            (FINDING_SEVERITY_ORDER[b.severity] ?? 99)
        );

      const grouped: Record<FindingGroup, SentinelLayer1Finding[]> = {
        environment: [],
        configuration: [],
        known_safe: [],
        vendor: [],
        external: [],
      };

      // Separate integrity findings from regular findings.
      const integrity: Record<IntegrityCategory, SentinelLayer1Finding[]> = {
        core_modified: [],
        core_missing: [],
        theme_modified: [],
        bundled_plugin: [],
        known_safe_missing: [],
      };

      let coreIssueCount = 0;

      for (const f of sorted) {
        if (f.integrity_category) {
          const cat = f.integrity_category as IntegrityCategory;
          if (integrity[cat]) {
            integrity[cat].push(f);
            // Only core_modified and core_missing count as real security issues.
            if (cat === "core_modified" || cat === "core_missing") {
              coreIssueCount++;
            }
          } else {
            // Unknown category — fall through to regular grouping.
            grouped[classifyFinding(f)].push(f);
          }
        } else {
          grouped[classifyFinding(f)].push(f);
        }
      }

      return {
        sortedFindings: sorted,
        groupedFindings: grouped,
        integrityFindings: integrity,
        realIssueCount: coreIssueCount,
      };
    }, [findings]);

  /** Whether any integrity findings exist (across all categories). */
  const hasIntegrityFindings = useMemo(
    () =>
      INTEGRITY_GROUP_ORDER.some((cat) => integrityFindings[cat].length > 0),
    [integrityFindings]
  );

  /** Total count of informational integrity findings (not real issues). */
  const informationalIntegrityCount = useMemo(() => {
    return (
      integrityFindings.bundled_plugin.length +
      integrityFindings.known_safe_missing.length +
      integrityFindings.theme_modified.length
    );
  }, [integrityFindings]);

  // Track expanded state for integrity groups separately.
  const [expandedIntegrityGroups, setExpandedIntegrityGroups] = useState<
    Record<IntegrityCategory, boolean>
  >(() => {
    const initial: Record<IntegrityCategory, boolean> = {} as Record<
      IntegrityCategory,
      boolean
    >;
    for (const cat of INTEGRITY_GROUP_ORDER) {
      initial[cat] = INTEGRITY_GROUP_META[cat].defaultExpanded;
    }
    return initial;
  });

  const toggleIntegrityGroup = (cat: IntegrityCategory) => {
    setExpandedIntegrityGroups((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const hasActions = !!(onMarkSafe || onQuarantine || onDelete);

  const toggleGroup = (group: FindingGroup) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllInGroup = (group: FindingGroup) => {
    const groupIds = groupedFindings[group].map((f) => f.id);
    const allSelected = groupIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        groupIds.forEach((id) => next.delete(id));
      } else {
        groupIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const selectedFindings = sortedFindings.filter((f) => selectedIds.has(f.id));

  const handleBulk = (action: "ignore" | "quarantine" | "delete") => {
    if (onBulkAction && selectedFindings.length > 0) {
      onBulkAction(action, selectedFindings);
      setSelectedIds(new Set());
    }
  };

  const toggleGuide = (id: string) => {
    setExpandedGuides((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // WCAG 2.4.3: Wraps the onFix prop to move focus after the card is removed.
  // We compute the next sibling index from sortedFindings BEFORE the async call
  // so the pre-removal order is captured in the closure. After onFix resolves,
  // the finding has been removed from state and the card is unmounted. We then
  // focus the card that occupied the next position, or the empty-state element
  // if the list is now empty.
  const handleFixWithFocus = async (
    finding: SentinelLayer1Finding
  ): Promise<void> => {
    if (!onFix) return;

    const currentIndex = sortedFindings.findIndex((f) => f.id === finding.id);
    // Next sibling: prefer the item after the removed one; fall back to the
    // item before it (covers fixing the last item in a non-empty list).
    const nextSibling =
      sortedFindings[currentIndex + 1] ?? sortedFindings[currentIndex - 1];

    await onFix(finding);

    // onFix has resolved — state update removing the card has been dispatched.
    // React may not have committed the DOM update yet, so we defer focus to
    // the next microtask tick (Promise.resolve()) to let the commit happen.
    await Promise.resolve();

    if (nextSibling) {
      cardRefsMap.current.get(nextSibling.id)?.focus();
    } else {
      // Last finding was fixed — list is now empty.
      emptyStateRef.current?.focus();
    }
  };

  /** Check if a finding has a file system evidence path (needed for quarantine/delete). */
  const hasFilePath = (finding: SentinelLayer1Finding): boolean => {
    if (!finding.evidence) return false;
    // Environment (M4) and Configuration (M3) findings are NOT files — never show
    // file-action buttons (Quarantine/Delete) for them. Bug 17 fix.
    if (finding.module === "M4" || finding.module === "M3") return false;
    if (
      finding.category === "Environment" ||
      finding.category === "Configuration"
    )
      return false;
    const ev = finding.evidence;
    // Reject URLs (contain "://") and permission-annotated strings (contain spaces or parentheses)
    if (ev.includes("://") || ev.includes(" ") || ev.includes("("))
      return false;
    // Reject WP core directory findings — these should be reinstalled, not quarantined.
    // M1-D (WP core integrity) evidence is relative paths like "wp-admin/..." or "wp-includes/..."
    if (ev.startsWith("wp-admin/") || ev.startsWith("wp-includes/"))
      return false;
    // File system path (with directory) OR root-level filename (e.g. "readme.html")
    if (ev.includes("/")) return true;
    // Root-level WordPress files: just a filename like "readme.html", "license.txt"
    return /^[a-zA-Z0-9_\-\.]+\.[a-zA-Z]{2,4}$/.test(ev);
  };

  const renderFindingCard = (finding: SentinelLayer1Finding) => {
    const guideKey = Object.keys(MANUAL_FIX_GUIDES).find((key) =>
      finding.title.includes(key)
    );
    const guide = guideKey ? MANUAL_FIX_GUIDES[guideKey] : null;
    const isGuideExpanded = expandedGuides.has(finding.id);

    return (
      <div key={finding.id}>
        <div
          role="listitem"
          // WCAG 2.4.3: tabIndex={-1} makes the card programmatically focusable
          // without inserting it into the natural tab order. Focus lands here
          // only when handleFixWithFocus calls .focus() on the next sibling.
          tabIndex={-1}
          // ref callback: register node on mount, deregister on unmount.
          // Using a callback ref (not useRef) avoids a separate effect.
          ref={(node) => {
            if (node) {
              cardRefsMap.current.set(finding.id, node);
            } else {
              cardRefsMap.current.delete(finding.id);
            }
          }}
          className={`border-border bg-card focus-visible:outline-swiss-navy rounded-xl border border-l-4 p-4 focus-visible:outline-2 focus-visible:outline-offset-2 ${FINDING_SEVERITY_BORDER[finding.severity] ?? "border-l-slate-300"}`}
        >
          {/* Header row */}
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {hasActions && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(finding.id)}
                  onChange={() => toggleSelection(finding.id)}
                  className="border-border text-swiss-navy focus:ring-swiss-navy h-4 w-4 shrink-0 rounded focus:ring-1"
                  aria-label={`Select finding: ${finding.title}`}
                />
              )}
              <Badge
                variant={SEVERITY_BADGE_VARIANT[finding.severity] ?? "neutral"}
              >
                {finding.severity}
              </Badge>
              <span className="text-xs font-black tracking-widest text-neutral-500 uppercase">
                {finding.category}
              </span>
            </div>

            {/* Per-finding action buttons */}
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
              {hasActions &&
                hasFilePath(finding) &&
                (() => {
                  // Quarantine only makes sense for files that exist on disk.
                  // Skip for missing-file categories (bundled_plugin, known_safe_missing, core_missing).
                  const MISSING_FILE_CATEGORIES = new Set([
                    "bundled_plugin",
                    "known_safe_missing",
                    "core_missing",
                  ]);
                  const canQuarantine =
                    !finding.integrity_category ||
                    !MISSING_FILE_CATEGORIES.has(finding.integrity_category);

                  return (
                    <>
                      {onMarkSafe && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 rounded-lg px-2 hover:text-emerald-600"
                          onClick={() => onMarkSafe(finding)}
                          title="Mark as Safe (will not appear on future scans)"
                          aria-label={`Mark ${finding.evidence || finding.title} as safe`}
                        >
                          <EyeOff size={14} />
                          <span className="ml-1 hidden text-xs sm:inline">
                            Safe
                          </span>
                        </Button>
                      )}
                      {onQuarantine && isPro && canQuarantine && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 rounded-lg px-2 hover:text-amber-600"
                          onClick={() => onQuarantine(finding)}
                          title="Quarantine this file"
                          aria-label={`Quarantine ${finding.evidence || finding.title}`}
                        >
                          <Archive size={14} />
                        </Button>
                      )}
                      {onDelete && isPro && canQuarantine && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 rounded-lg px-2 hover:text-red-600"
                          onClick={() => onDelete(finding)}
                          title="Permanently delete this file"
                          aria-label={`Delete ${finding.evidence || finding.title}`}
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </>
                  );
                })()}

              {/* Fix it button — only for known, handleable fix_type values */}
              {finding.fix_type && VALID_FIX_TYPES.has(finding.fix_type) && (
                <FixItButton
                  finding={finding}
                  // WCAG 2.4.3: use the focus-managing wrapper instead of raw onFix
                  // so focus moves to the next card after the API call completes.
                  onFix={onFix ? handleFixWithFocus : undefined}
                  onNavigateHardening={onNavigateHardening}
                  isExpanded={isGuideExpanded}
                  onToggleGuide={() => toggleGuide(finding.id)}
                />
              )}
            </div>
          </div>

          {/* Title */}
          <h4 className="text-swiss-navy mb-2 text-sm font-black">
            {finding.title}
          </h4>

          {/* Evidence */}
          {finding.evidence && (
            <div className="bg-secondary border-border mb-3 rounded-lg border p-3">
              <p className="mb-1 text-xs font-black tracking-widest text-neutral-500 uppercase">
                Evidence
              </p>
              <code className="font-mono text-xs leading-relaxed break-all text-neutral-800">
                {finding.evidence}
              </code>
            </div>
          )}

          {/* Details */}
          {finding.details && (
            <p className="mb-2 text-sm leading-relaxed font-medium text-neutral-700">
              {finding.details}
            </p>
          )}

          {/* Remediation */}
          {finding.remediation && (
            <div className="border-border/60 border-t pt-2">
              <p className="mb-1 text-xs font-black tracking-widest text-emerald-700 uppercase">
                Remediation
              </p>
              <p className="text-xs leading-relaxed font-medium text-neutral-700">
                {finding.remediation}
              </p>
            </div>
          )}
        </div>

        {/* Inline manual fix guide — shown when fix_type === "manual" and expanded */}
        {finding.fix_type === "manual" && isGuideExpanded && guide && (
          <div
            className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm"
            role="region"
            // WCAG 1.3.1: role="region" requires an accessible name to be exposed
            // as a named landmark. aria-labelledby references the visible heading
            // inside the panel — preferred over aria-label when text is already visible.
            aria-labelledby={`fix-guide-title-${finding.id}`}
            id={`fix-guide-${finding.id}`}
          >
            <p
              id={`fix-guide-title-${finding.id}`}
              className="mb-3 font-semibold text-blue-900"
            >
              {guide.title}
            </p>
            <ol className="list-inside list-decimal space-y-2 text-blue-800">
              {guide.steps.map((step, i) => (
                <li key={i} className="leading-relaxed">
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    );
  };

  const renderIntegrityGroup = (cat: IntegrityCategory) => {
    const catFindings = integrityFindings[cat];
    if (catFindings.length === 0) return null;

    const meta = INTEGRITY_GROUP_META[cat];
    const isExpanded = expandedIntegrityGroups[cat];
    const Icon = meta.icon;

    // Benign categories where "Mark All as Safe" is appropriate
    const BENIGN_CATEGORIES = new Set<IntegrityCategory>([
      "bundled_plugin",
      "known_safe_missing",
      "theme_modified",
    ]);
    const showMarkAllSafe = onBulkAction && BENIGN_CATEGORIES.has(cat);

    return (
      <div
        key={cat}
        className="border-border overflow-hidden rounded-xl border"
      >
        {/* Integrity group header */}
        <button
          type="button"
          onClick={() => toggleIntegrityGroup(cat)}
          className="bg-secondary hover:bg-secondary/80 flex w-full items-center gap-3 p-4 text-left transition-colors"
          aria-expanded={isExpanded}
          aria-controls={`integrity-group-${cat}`}
        >
          <Icon
            size={18}
            className="shrink-0 text-neutral-500"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <span className="text-xs font-black tracking-widest text-neutral-700 uppercase">
              {meta.label}
            </span>
            <span className="ml-2 text-xs font-medium text-neutral-500">
              ({catFindings.length}{" "}
              {catFindings.length === 1 ? "file" : "files"})
            </span>
          </div>
          <Badge variant={meta.badgeVariant}>{catFindings.length}</Badge>
          {isExpanded ? (
            <ChevronDown
              size={16}
              className="shrink-0 text-neutral-400"
              aria-hidden="true"
            />
          ) : (
            <ChevronRight
              size={16}
              className="shrink-0 text-neutral-400"
              aria-hidden="true"
            />
          )}
        </button>

        {/* Integrity group body */}
        {isExpanded && (
          <div id={`integrity-group-${cat}`} className="space-y-3 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-neutral-500">
                {meta.description}
              </p>
              {showMarkAllSafe && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-3 h-7 shrink-0 rounded-lg px-2 hover:text-emerald-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBulkAction("ignore", catFindings);
                  }}
                  title={`Mark all ${catFindings.length} files in this group as safe`}
                  aria-label={`Mark all ${meta.label} as safe`}
                >
                  <EyeOff size={14} />
                  <span className="ml-1 text-xs">
                    Mark All Safe ({catFindings.length})
                  </span>
                </Button>
              )}
            </div>
            <div
              role="list"
              aria-label={`${meta.label} findings`}
              className="space-y-3"
            >
              {catFindings.map(renderFindingCard)}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderGroup = (group: FindingGroup) => {
    const groupFindings = groupedFindings[group];
    if (groupFindings.length === 0) return null;

    const meta = GROUP_META[group];
    const isExpanded = expandedGroups[group];
    const Icon = meta.icon;
    const allGroupSelected = groupFindings.every((f) => selectedIds.has(f.id));

    return (
      <div
        key={group}
        className="border-border overflow-hidden rounded-xl border"
      >
        {/* Group header -- clickable to expand/collapse */}
        <button
          type="button"
          onClick={() => toggleGroup(group)}
          className="bg-secondary hover:bg-secondary/80 flex w-full items-center gap-3 p-4 text-left transition-colors"
          aria-expanded={isExpanded}
          aria-controls={`sentinel-group-${group}`}
        >
          {hasActions && (
            <input
              type="checkbox"
              checked={allGroupSelected}
              onChange={(e) => {
                e.stopPropagation();
                toggleSelectAllInGroup(group);
              }}
              onClick={(e) => e.stopPropagation()}
              className="border-border text-swiss-navy focus:ring-swiss-navy h-4 w-4 shrink-0 rounded focus:ring-1"
              aria-label={`Select all ${meta.label} findings`}
            />
          )}
          <Icon
            size={18}
            className="shrink-0 text-neutral-500"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <span className="text-xs font-black tracking-widest text-neutral-700 uppercase">
              {meta.label}
            </span>
            <span className="ml-2 text-xs font-medium text-neutral-500">
              ({groupFindings.length}{" "}
              {groupFindings.length === 1 ? "finding" : "findings"})
            </span>
          </div>
          {isExpanded ? (
            <ChevronDown
              size={16}
              className="shrink-0 text-neutral-400"
              aria-hidden="true"
            />
          ) : (
            <ChevronRight
              size={16}
              className="shrink-0 text-neutral-400"
              aria-hidden="true"
            />
          )}
        </button>

        {/* Group body */}
        {isExpanded && (
          <div id={`sentinel-group-${group}`} className="space-y-3 p-4">
            <p className="mb-2 text-xs font-medium text-neutral-500">
              {meta.description}
            </p>
            <div
              role="list"
              aria-label={`${meta.label} findings`}
              className="space-y-3"
            >
              {groupFindings.map(renderFindingCard)}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* AI Audit CTA */}
      <div className="from-swiss-navy to-swiss-navy/80 flex flex-col items-start justify-between gap-4 rounded-2xl bg-gradient-to-r p-6 sm:flex-row sm:items-center">
        <div className="flex items-start gap-4">
          <div className="bg-brand-accent/20 shrink-0 rounded-xl p-3">
            <Sparkles
              size={22}
              className="text-brand-accent"
              aria-hidden="true"
            />
          </div>
          <div>
            <h3 className="text-foreground text-sm font-black tracking-widest uppercase">
              Get Your Security Grade
            </h3>
            <p className="text-foreground/70 mt-1 max-w-sm text-xs leading-relaxed font-medium">
              Run an AI-powered deep analysis to receive a letter grade, attack
              chain mapping, executive summary, and a prioritised remediation
              plan.
            </p>
          </div>
        </div>
        <Button
          onClick={onRunAIAudit}
          variant="danger"
          icon={Sparkles}
          className="bg-brand-accent hover:bg-brand-accent/80 text-foreground shadow-brand-accent/30 shrink-0 rounded-xl border-none shadow-lg"
          aria-label="Run AI audit to receive security grade"
        >
          Run AI Audit
        </Button>
      </div>

      {/* Bulk actions toolbar -- appears when findings are selected */}
      {selectedFindings.length > 0 && hasActions && (
        <div
          className="bg-swiss-navy/5 border-swiss-navy/20 flex items-center gap-3 rounded-xl border p-3"
          role="toolbar"
          aria-label="Bulk actions for selected findings"
        >
          <span className="text-swiss-navy text-xs font-black tracking-widest uppercase">
            {selectedFindings.length} selected
          </span>
          <div className="flex-1" />
          {onMarkSafe && (
            <Button
              size="sm"
              variant="ghost"
              className="rounded-lg text-xs font-black tracking-widest uppercase hover:bg-emerald-50 hover:text-emerald-700"
              onClick={() => handleBulk("ignore")}
              icon={EyeOff}
            >
              Mark Safe ({selectedFindings.length})
            </Button>
          )}
          {onQuarantine && isPro && (
            <Button
              size="sm"
              className="rounded-lg bg-amber-600 text-xs font-black tracking-widest text-white uppercase hover:bg-amber-700"
              onClick={() => handleBulk("quarantine")}
              icon={Archive}
            >
              Quarantine ({selectedFindings.length})
            </Button>
          )}
          {onDelete && isPro && (
            <Button
              size="sm"
              className="rounded-lg bg-red-600 text-xs font-black tracking-widest text-white uppercase hover:bg-red-700"
              onClick={() => handleBulk("delete")}
              icon={Trash2}
            >
              Delete ({selectedFindings.length})
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="rounded-lg text-xs"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Findings list or empty state */}
      {sortedFindings.length === 0 ? (
        <div
          role="status"
          // WCAG 2.4.3: tabIndex={-1} allows programmatic focus when the last
          // finding is fixed. The ref is populated even when the element is not
          // yet visible — React mounts this branch only when findings is empty,
          // which is exactly when we need to focus it.
          tabIndex={-1}
          ref={emptyStateRef}
          className="focus-visible:outline-swiss-navy flex flex-col items-center justify-center py-14 text-center focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <ShieldCheck
            size={48}
            className="mb-4 text-emerald-500"
            aria-hidden="true"
          />
          <p className="text-sm font-black tracking-widest text-emerald-700 uppercase">
            No threats detected
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Your site is clean. Run an AI Audit to get a full security grade.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Core File Integrity section — shown only when integrity findings exist */}
          {hasIntegrityFindings && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black tracking-widest text-neutral-700 uppercase">
                  WordPress Core File Integrity
                </h3>
                {realIssueCount > 0 ? (
                  <Badge variant="danger">
                    {realIssueCount} potential{" "}
                    {realIssueCount === 1 ? "issue" : "issues"}
                  </Badge>
                ) : (
                  <Badge variant="info">
                    {informationalIntegrityCount} informational
                  </Badge>
                )}
              </div>

              {/* Summary banner when no real issues exist */}
              {realIssueCount === 0 && informationalIntegrityCount > 0 && (
                <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <ShieldCheck
                    size={20}
                    className="mt-0.5 shrink-0 text-emerald-600"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">
                      No core file tampering detected
                    </p>
                    <p className="mt-1 text-xs text-emerald-700">
                      {informationalIntegrityCount} file{" "}
                      {informationalIntegrityCount === 1
                        ? "difference was"
                        : "differences were"}{" "}
                      found, but all are expected (uninstalled plugins, removed
                      files, or theme updates).
                    </p>
                  </div>
                </div>
              )}

              {/* Integrity sub-groups */}
              {INTEGRITY_GROUP_ORDER.map(renderIntegrityGroup)}
            </div>
          )}

          {/* Non-integrity findings — existing grouped display */}
          {GROUP_ORDER.some((g) => groupedFindings[g].length > 0) && (
            <div className="space-y-4">
              {hasIntegrityFindings && (
                <h3 className="text-xs font-black tracking-widest text-neutral-700 uppercase">
                  Other Security Findings
                </h3>
              )}
              {GROUP_ORDER.map(renderGroup)}
            </div>
          )}
        </div>
      )}

      {/* Footer note for free users */}
      {!isPro && sortedFindings.length > 0 && (
        <p className="text-center text-xs font-medium text-neutral-500">
          Showing Layer 1 findings only.{" "}
          <button
            onClick={onRunAIAudit}
            className="text-brand-accent hover:text-swiss-navy font-black underline underline-offset-2 transition-colors"
            aria-label="Run AI Audit for full attack chain analysis"
          >
            Run AI Audit
          </button>{" "}
          for full attack chain analysis and a security grade.
        </p>
      )}
    </div>
  );
};

export default SentinelLayer1Findings;
