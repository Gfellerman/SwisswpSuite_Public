import React, { useState, useRef } from "react";
import {
  CheckCircle,
  X,
  ExternalLink,
  Sparkles,
  AlertTriangle,
  Zap,
  Loader2,
  Shield,
} from "lucide-react";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { toast } from "sonner";
import type { MigrationMode } from "../types";

interface PostMigrationChecklistProps {
  isOpen: boolean;
  onClose: () => void;
  /** Mode B adds a 6th step: verify receiver file was deleted. */
  migrationMode?: MigrationMode;
}

const PostMigrationChecklist: React.FC<PostMigrationChecklistProps> = ({
  isOpen,
  onClose,
  migrationMode,
}) => {
  // Mode B (receiver script) adds Step 6: verify receiver file was deleted
  const totalSteps = migrationMode === "receiver" ? 6 : 5;

  const completedStepsRef = useRef<number[]>([]);
  const [completedSteps, setCompletedSteps] = useState<number[]>(
    completedStepsRef.current,
  );
  const [scanTriggering, setScanTriggering] = useState(false);
  const [scanTriggered, setScanTriggered] = useState(false);

  // Persist completed steps across modal open/close cycles
  React.useEffect(() => {
    completedStepsRef.current = completedSteps;
  }, [completedSteps]);

  if (!isOpen) return null;

  const { apiUrl, nonce, homeUrl } = window.swisswpsuiteData || {};

  const toggleStep = (stepNumber: number) => {
    // Step 3 is handled exclusively by triggerSentinelScan — clicking the card
    // area should not toggle its completed state directly. Steps 1, 2, 4, 5 are
    // manual confirmation toggles. Step 6 (Mode B) is also a manual toggle.
    if (stepNumber === 3) return;
    setCompletedSteps((prev) =>
      prev.includes(stepNumber)
        ? prev.filter((s) => s !== stepNumber)
        : [...prev, stepNumber],
    );
  };

  const allStepsCompleted = completedSteps.length === totalSteps;

  const openPermalinks = () => {
    const adminUrl = window.swisswpsuiteData?.homeUrl || window.location.origin;
    window.open(`${adminUrl}/wp-admin/options-permalink.php`, "_blank");
  };

  /**
   * Trigger a Sentinel security scan via the REST API, then navigate to
   * the Security tab so the user can watch results come in.
   *
   * Endpoint: POST /swisswpsuite/v1/security/scan
   * Auth:     X-WP-Nonce header (WordPress REST nonce)
   */
  const triggerSentinelScan = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (scanTriggering || scanTriggered) return;

    setScanTriggering(true);

    try {
      // Guard: if running outside WP admin (no apiUrl), fall back to
      // navigation-only behaviour so dev mode doesn't hard-error.
      if (!apiUrl || !nonce) {
        toast.info("Running in standalone mode — navigating to Security tab.");
        onClose();
        window.location.hash = "#/security";
        setCompletedSteps((prev) => (prev.includes(3) ? prev : [...prev, 3]));
        setScanTriggered(true);
        return;
      }

      const isPro = window.swisswpsuiteData?.sentinelIsPro;
      const scanEndpoint = isPro
        ? `${apiUrl}/security/sentinel/audit`
        : `${apiUrl}/security/scan`;
      const res = await fetch(scanEndpoint, {
        method: "POST",
        headers: { "X-WP-Nonce": nonce },
      });

      if (res.ok) {
        setScanTriggered(true);
        setCompletedSteps((prev) => (prev.includes(3) ? prev : [...prev, 3]));
        toast.success(
          isPro
            ? "Sentinel deep audit initiated — check Security tab for results."
            : "Security scan initiated — check Security tab for results.",
        );
        // Close modal first, then navigate so the modal unmount animation
        // doesn't fight the route transition.
        onClose();
        window.location.hash = "#/security";
      } else {
        // Non-OK HTTP response — scan could not be started. The scan queue
        // may be busy (202 Accepted is still ok, but anything ≥ 400 is a
        // real error). Still navigate so the user can retry from SecurityHub.
        toast.error(
          "Scan could not be started — navigating to Security to retry manually.",
        );
        onClose();
        window.location.hash = "#/security";
      }
    } catch (err: unknown) {
      console.error("[PostMigrationChecklist] Scan trigger failed:", err);
      toast.error(
        "Connection error — navigating to Security so you can trigger the scan manually.",
      );
      onClose();
      window.location.hash = "#/security";
    } finally {
      setScanTriggering(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-swiss-navy/20 backdrop-blur-md flex items-center justify-center z-[100] animate-in fade-in duration-300 p-4">
      <div className="bg-card rounded-[2.5rem] max-w-2xl w-full shadow-premium border border-border transform animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-emerald-500 text-foreground dark:text-foreground p-10 relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-card/10 dark:bg-card/10 rounded-full -mr-24 -mt-24 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary dark:bg-secondary rounded-full -ml-16 -mb-16 blur-2xl"></div>

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="bg-card/20 dark:bg-card/20 p-4 rounded-2xl backdrop-blur-md border border-border/20 shadow-glow">
                <CheckCircle
                  size={32}
                  className="text-foreground dark:text-foreground"
                />
              </div>
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tight">
                  Mission Success
                </h2>
                <p className="text-emerald-100 text-xs font-black uppercase tracking-[0.2em] mt-1">
                  Final Deployment Protocol Required
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close checklist"
              className="text-foreground/80 hover:text-foreground dark:hover:text-foreground hover:bg-card/20 dark:hover:bg-card/20 p-3 rounded-xl transition border border-transparent hover:border-border/20"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-10 space-y-8 overflow-y-auto custom-scrollbar flex-1">
          {/* Critical Warning Banner */}
          <div className="bg-brand-accent/5 border border-brand-accent/20 rounded-2xl p-6 flex items-start gap-4">
            <AlertTriangle
              className="text-brand-accent flex-shrink-0"
              size={24}
            />
            <div>
              <h3 className="font-black text-brand-accent text-xs uppercase tracking-widest mb-1">
                CRITICAL_ACTION_REQUIRED
              </h3>
              <p className="text-slate-600 text-sm font-medium leading-relaxed">
                Skipping these finalization steps will result in{" "}
                <span className="text-brand-accent font-black">404 errors</span>{" "}
                and broken internal links.
              </p>
            </div>
          </div>

          {/* Step 1: Flush Permalinks */}
          <div
            className={`border rounded-2xl p-6 transition-all cursor-pointer shadow-soft group/step ${
              completedSteps.includes(1)
                ? "border-emerald-100 bg-emerald-50/30"
                : "border-border bg-card hover:border-brand-accent/50"
            }`}
            onClick={() => toggleStep(1)}
            role="button"
            aria-pressed={completedSteps.includes(1)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleStep(1);
              }
            }}
          >
            <div className="flex items-start gap-5">
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-all shadow-premium ${
                  completedSteps.includes(1)
                    ? "bg-emerald-500 text-foreground dark:text-foreground shadow-glow"
                    : "bg-swiss-navy text-foreground dark:text-foreground"
                }`}
              >
                {completedSteps.includes(1) ? "✓" : "01"}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-black text-swiss-navy uppercase tracking-tight text-lg">
                    Flush Permalinks
                  </h3>
                  <Badge variant="danger">Critical</Badge>
                </div>
                <p className="text-neutral-700 text-sm font-medium mb-4 leading-relaxed">
                  Save permalink structure twice to re-initialize the WordPress
                  router for the root domain.
                </p>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    openPermalinks();
                  }}
                  variant="primary"
                  size="sm"
                  className="gap-2"
                >
                  <ExternalLink size={14} />
                  ACCESS_PERMALINKS
                </Button>
              </div>
            </div>
          </div>

          {/* Step 2: Purge Cache */}
          <div
            className={`border rounded-2xl p-6 transition-all cursor-pointer shadow-soft group/step ${
              completedSteps.includes(2)
                ? "border-emerald-100 bg-emerald-50/30"
                : "border-border bg-card hover:border-brand-accent/50"
            }`}
            onClick={() => toggleStep(2)}
            role="button"
            aria-pressed={completedSteps.includes(2)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleStep(2);
              }
            }}
          >
            <div className="flex items-start gap-5">
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-all shadow-premium ${
                  completedSteps.includes(2)
                    ? "bg-emerald-500 text-foreground dark:text-foreground shadow-glow"
                    : "bg-swiss-navy text-foreground dark:text-foreground"
                }`}
              >
                {completedSteps.includes(2) ? "✓" : "02"}
              </div>
              <div className="flex-1">
                <h3 className="font-black text-swiss-navy uppercase tracking-tight text-lg mb-2 flex items-center gap-2">
                  Clear Cache
                  <Zap size={16} className="text-yellow-400" />
                </h3>
                <p className="text-neutral-700 text-sm font-medium leading-relaxed">
                  Caches were automatically cleared after migration. If stale
                  content persists, go to Settings &gt; Maintenance and click
                  "Clear Cache".
                </p>
              </div>
            </div>
          </div>

          {/* Step 3: Run Sentinel — triggers real API scan */}
          <div
            className={`border rounded-2xl p-6 transition-all shadow-soft group/step ${
              completedSteps.includes(3)
                ? "border-emerald-100 bg-emerald-50/30"
                : "border-border bg-card"
            }`}
            aria-busy={scanTriggering}
          >
            <div className="flex items-start gap-5">
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-all shadow-premium ${
                  completedSteps.includes(3)
                    ? "bg-emerald-500 text-foreground dark:text-foreground shadow-glow"
                    : scanTriggering
                      ? "bg-brand-accent text-foreground dark:text-foreground"
                      : "bg-swiss-navy text-foreground dark:text-foreground"
                }`}
              >
                {completedSteps.includes(3) ? (
                  "✓"
                ) : scanTriggering ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "03"
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-black text-swiss-navy uppercase tracking-tight text-lg mb-2 flex items-center gap-2">
                  {window.swisswpsuiteData?.sentinelIsPro
                    ? "Sentinel Deep Audit"
                    : "Sentinel Scan"}
                  <Sparkles
                    size={16}
                    className="text-brand-accent shadow-glow-red"
                  />
                </h3>
                <p className="text-neutral-700 text-sm font-medium mb-4 leading-relaxed">
                  {scanTriggered
                    ? "Scan initiated — navigate to the Security tab to monitor results in real-time."
                    : window.swisswpsuiteData?.sentinelIsPro
                      ? "Launch an AI-powered deep audit to verify site integrity and security posture post-migration."
                      : "Launch a security scan to verify site integrity post-migration."}
                </p>
                <Button
                  onClick={triggerSentinelScan}
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                  disabled={scanTriggering || scanTriggered}
                  aria-busy={scanTriggering}
                  aria-label={
                    scanTriggering
                      ? "Starting scan…"
                      : scanTriggered
                        ? "Scan already initiated"
                        : window.swisswpsuiteData?.sentinelIsPro
                          ? "Run Sentinel scan"
                          : "Run Sentinel scan"
                  }
                >
                  {scanTriggering ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      INITIATING_SCAN…
                    </>
                  ) : scanTriggered ? (
                    <>
                      <CheckCircle size={14} className="text-emerald-500" />
                      SCAN_INITIATED
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} className="text-brand-accent" />
                      {window.swisswpsuiteData?.sentinelIsPro
                        ? "RUN_SENTINEL_AUDIT"
                        : "RUN_SENTINEL_SCAN"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Step 4: Verify Admin Access — v2.9.6.38 */}
          <div
            className={`border rounded-2xl p-6 transition-all cursor-pointer shadow-soft group/step ${
              completedSteps.includes(4)
                ? "border-emerald-100 bg-emerald-50/30"
                : "border-border bg-card hover:border-brand-accent/50"
            }`}
            onClick={() => toggleStep(4)}
            role="button"
            aria-pressed={completedSteps.includes(4)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleStep(4);
              }
            }}
          >
            <div className="flex items-start gap-5">
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-all shadow-premium ${
                  completedSteps.includes(4)
                    ? "bg-emerald-500 text-foreground dark:text-foreground shadow-glow"
                    : "bg-swiss-navy text-foreground dark:text-foreground"
                }`}
              >
                {completedSteps.includes(4) ? "✓" : "04"}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-black text-swiss-navy uppercase tracking-tight text-lg">
                    Verify Admin Access
                  </h3>
                  <Badge variant="warning">Security</Badge>
                </div>
                <p className="text-neutral-700 text-sm font-medium mb-4 leading-relaxed">
                  Confirm your admin account works and all user accounts are
                  intact. If users were imported from the source site, log out
                  and verify access with each account before announcing the site
                  live.
                </p>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    const adminUsersUrl = `${homeUrl || window.location.origin}/wp-admin/users.php`;
                    window.open(adminUsersUrl, "_blank");
                  }}
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                >
                  <ExternalLink size={14} />
                  VIEW_USERS
                </Button>
              </div>
            </div>
          </div>

          {/* Step 5: Install Plugins — v2.9.7.71 */}
          <div
            className={`border rounded-2xl p-6 transition-all cursor-pointer shadow-soft group/step ${
              completedSteps.includes(5)
                ? "border-emerald-100 bg-emerald-50/30"
                : "border-border bg-card hover:border-brand-accent/50"
            }`}
            onClick={() => toggleStep(5)}
            role="button"
            aria-pressed={completedSteps.includes(5)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleStep(5);
              }
            }}
          >
            <div className="flex items-start gap-5">
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-all shadow-premium ${
                  completedSteps.includes(5)
                    ? "bg-emerald-500 text-foreground dark:text-foreground shadow-glow"
                    : "bg-swiss-navy text-foreground dark:text-foreground"
                }`}
              >
                {completedSteps.includes(5) ? "✓" : "05"}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-black text-swiss-navy uppercase tracking-tight text-lg">
                    Install Plugins
                  </h3>
                  <Badge variant="warning">Required</Badge>
                </div>
                <p className="text-neutral-700 text-sm font-medium mb-4 leading-relaxed">
                  Plugins are not transferred during migration for security
                  reasons. Install and activate all required plugins on this
                  site. Plugin settings and data were included in the database
                  migration.
                </p>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    const pluginsUrl = `${homeUrl || window.location.origin}/wp-admin/plugins.php`;
                    window.open(pluginsUrl, "_blank");
                  }}
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                >
                  <ExternalLink size={14} />
                  VIEW_PLUGINS
                </Button>
              </div>
            </div>
          </div>

          {/* Step 6: Verify Receiver File Deleted — Mode B only (v2.9.11.0) */}
          {migrationMode === "receiver" && (
            <div
              className={`border rounded-2xl p-6 transition-all cursor-pointer shadow-soft group/step ${
                completedSteps.includes(6)
                  ? "border-emerald-100 bg-emerald-50/30"
                  : "border-border bg-card hover:border-brand-accent/50"
              }`}
              onClick={() => toggleStep(6)}
              role="button"
              aria-pressed={completedSteps.includes(6)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleStep(6);
                }
              }}
            >
              <div className="flex items-start gap-5">
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-all shadow-premium ${
                    completedSteps.includes(6)
                      ? "bg-emerald-500 text-foreground dark:text-foreground shadow-glow"
                      : "bg-swiss-navy text-foreground dark:text-foreground"
                  }`}
                >
                  {completedSteps.includes(6) ? "✓" : "06"}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-black text-swiss-navy uppercase tracking-tight text-lg flex items-center gap-2">
                      Verify Receiver File Deleted
                      <Shield size={16} className="text-purple-500" />
                    </h3>
                    <Badge variant="danger">Security</Badge>
                  </div>
                  <p className="text-neutral-700 text-sm font-medium leading-relaxed">
                    Check that the migration helper file no longer exists on
                    your new server. If it is still present, delete it manually
                    through your hosting File Manager. The file deletes itself
                    automatically after a successful import — manual removal is
                    only needed if the import was interrupted.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Progress Indicator */}
          <div className="bg-background rounded-2xl p-6 border border-border shadow-inner">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-widest text-neutral-700">
                PROTOCOL_PROGRESS
              </span>
              <span className="text-xs font-black text-swiss-navy">
                {Math.round((completedSteps.length / totalSteps) * 100)}%
              </span>
            </div>
            <div className="w-full bg-slate-200/50 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 rounded-full ${
                  allStepsCompleted
                    ? "bg-emerald-500 shadow-glow"
                    : "bg-swiss-navy shadow-glow-navy"
                }`}
                style={{
                  width: `${(completedSteps.length / totalSteps) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Success Message */}
          {allStepsCompleted && (
            <div
              className="bg-emerald-500 text-foreground dark:text-foreground rounded-2xl p-6 animate-in slide-in-from-top-4 shadow-glow"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-4">
                <CheckCircle size={28} className="flex-shrink-0" />
                <div>
                  <h4 className="font-black uppercase tracking-tight text-lg">
                    Operational Ready
                  </h4>
                  <p className="text-xs uppercase font-black tracking-widest text-emerald-100">
                    Site migration validated. All routing protocols active.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-background p-8 shrink-0 border-t border-border">
          <div className="flex items-center justify-between">
            <p className="text-xs text-neutral-700 font-bold uppercase tracking-widest">
              {allStepsCompleted ? "SYSTEM_LOCKED" : "PENDING_ACTIONS"}
            </p>
            <Button
              onClick={onClose}
              variant={allStepsCompleted ? "primary" : "secondary"}
              size="md"
              className="px-10"
            >
              {allStepsCompleted ? "CONFIRM" : "DISMISS"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostMigrationChecklist;
