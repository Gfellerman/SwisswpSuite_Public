/**
 * QuarantineTab — Security Hub > Quarantine tab organism.
 * =============================================================================
 * Extracted in v2.9.30.118 (TD-1 refactor) from the inline JSX in
 * SecurityHub.tsx. The tab groups four sub-tables:
 *   1. Allowed IPs        (admin self-safelist — must render first)
 *   2. Blocked IPs        (banned by firewall or manual)
 *   3. Quarantined Files  (files moved out of wp-content)
 *   4. Ignored Paths      (path-based scan exclusion list)
 *
 * Controlled-component design: the organism receives all state + handlers as
 * props from the parent (SecurityHub.tsx). This avoids a dual source of
 * truth during the TD-1 incremental refactor. Once SecurityHub.tsx itself
 * migrates fully to the new stores (follow-up task), the props can be
 * removed and the organism can read from useSecurityStateStore directly.
 *
 * WP.org round-3 remediation (Sprint W2/T7, 2026-07-26): IP allowlist
 * add/remove and ban/unban were gated on `hasSecurity` (the Security-plan
 * capability) with a disabled input, an upgrade-prompt onClick swap, a Lock
 * icon, and a "Requires Pro" tooltip — trialware, since Sprint W1 already
 * de-gated these PHP endpoints (pure local wp_options writes, free for
 * everyone). That gating is REMOVED below; `hasSecurity` is gone from this
 * file entirely as a result.
 *
 * WP.org round-3 remediation (follow-up, 2026-07-27): the Quarantined Files
 * restore/delete sub-component had the SAME trialware bug — gated on
 * `hasSentinelPro` (any paid plan) with a disabled button, an
 * upgrade-prompt onClick swap, and a "Requires Pro" tooltip. This was based
 * on a mistaken assumption that quarantine restore/delete was Pro-only; in
 * fact `SwissWPSuite_License::get_free_capabilities()` has always listed
 * `quarantine` (move/restore/delete) as a FREE tier capability, and both
 * REST routes (`/security/quarantine/restore`, `/security/quarantine/delete`)
 * register with the general `check_permission` callback, never a Pro-gated
 * one. That false lock is REMOVED below too; `hasSentinelPro` and
 * `onUpgradePrompt` are gone from this file entirely as a result.
 */
import React, { useEffect } from "react";
import { ExternalLink, EyeOff } from "lucide-react";
import { Button } from "../../ui/Button";
import { Badge } from "../../ui/Badge";

export interface QuarantineFile {
  id: string;
  original_path: string;
  date?: string;
}

export interface QuarantineTabProps {
  // ── State (read-only) ────────────────────────────────────────────────────
  bannedIps: string[];
  bannedIpTypes: Record<string, string>;
  manualIp: string;
  allowedIps: string[];
  currentIp: string;
  manualAllowedIp: string;
  quarantinedFiles: QuarantineFile[];
  ignoredPaths: string[];

  // ── Capability flags ─────────────────────────────────────────────────────
  // hasSecurity (Security-plan capability) was removed here — Sprint W2/T7,
  // 2026-07-26 — since IP allowlist/ban/unban are free/functional in every
  // edition now. hasSentinelPro (any paid plan) was removed here too —
  // follow-up, 2026-07-27 — quarantine restore/delete is also a free
  // capability (`SwissWPSuite_License::get_free_capabilities()`); the
  // Quarantined Files restore/delete sub-component below is unconditionally
  // enabled now.

  // ── Setters (form input round-trip) ──────────────────────────────────────
  onChangeManualIp: (s: string) => void;
  onChangeManualAllowedIp: (s: string) => void;

  // ── Action handlers ──────────────────────────────────────────────────────
  onBanIp: (ip: string) => void;
  onUnbanIp: (ip: string) => void;
  onAllowIp: (ip: string) => void;
  onRemoveAllowedIp: (ip: string) => void;
  onRestoreQuarantine: (id: string) => Promise<void> | void;
  onDeleteQuarantine: (id: string) => void;
  onUnIgnore: (path: string) => Promise<void> | void;

  // ── Lifecycle (optional) ─────────────────────────────────────────────────
  /** Called once when the tab mounts. Used to refresh stale data. */
  onMount?: () => void;
}

export const QuarantineTab: React.FC<QuarantineTabProps> = ({
  bannedIps,
  bannedIpTypes,
  manualIp,
  allowedIps,
  currentIp,
  manualAllowedIp,
  quarantinedFiles,
  ignoredPaths,
  onChangeManualIp,
  onChangeManualAllowedIp,
  onBanIp,
  onUnbanIp,
  onAllowIp,
  onRemoveAllowedIp,
  onRestoreQuarantine,
  onDeleteQuarantine,
  onUnIgnore,
  onMount,
}) => {
  useEffect(() => {
    onMount?.();
    // Intentionally run once on mount only. `onMount` is a fresh inline closure
    // on every SecurityHub render — depending on it here caused an infinite
    // fetch loop (mount -> onMount() -> setState -> re-render -> new onMount
    // reference -> effect re-fires -> repeat), live-QA-confirmed 2026-08-02.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="animate-in fade-in slide-in-from-right-4 space-y-12 pb-20">
      <AllowedIpsTable
        allowedIps={allowedIps}
        currentIp={currentIp}
        manualAllowedIp={manualAllowedIp}
        onChangeManual={onChangeManualAllowedIp}
        onAllow={onAllowIp}
        onRemove={onRemoveAllowedIp}
      />

      <BlockedIpsTable
        bannedIps={bannedIps}
        bannedIpTypes={bannedIpTypes}
        manualIp={manualIp}
        onChangeManual={onChangeManualIp}
        onBan={onBanIp}
        onUnban={onUnbanIp}
      />

      <QuarantinedFilesTable
        files={quarantinedFiles}
        onRestore={onRestoreQuarantine}
        onDelete={onDeleteQuarantine}
      />

      <IgnoredPathsTable paths={ignoredPaths} onUnIgnore={onUnIgnore} />
    </div>
  );
};

// ─── Sub-tables ────────────────────────────────────────────────────────────

interface AllowedIpsTableProps {
  allowedIps: string[];
  currentIp: string;
  manualAllowedIp: string;
  onChangeManual: (s: string) => void;
  onAllow: (ip: string) => void;
  onRemove: (ip: string) => void;
}

const AllowedIpsTable: React.FC<AllowedIpsTableProps> = ({
  allowedIps,
  currentIp,
  manualAllowedIp,
  onChangeManual,
  onAllow,
  onRemove,
}) => (
  <div className="glass-panel rounded-3xl p-8">
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h3 className="text-swiss-navy text-xl font-black tracking-tight uppercase">
          Allowed IPs
        </h3>
        <p className="mt-1 text-sm font-black tracking-widest text-neutral-700 uppercase">
          IPs permanently trusted — never auto-blocked by login protection
        </p>
        {currentIp ? (
          <p className="mt-2 text-xs font-bold text-neutral-700">
            Your current IP:{" "}
            <code className="bg-secondary rounded-md px-2 py-0.5 font-mono">
              {currentIp}
            </code>
            {!allowedIps.includes(currentIp) ? (
              <button
                type="button"
                onClick={() => onAllow(currentIp)}
                className="text-swiss-navy hover:text-brand-accent ml-3 underline transition-colors"
              >
                Allow this IP
              </button>
            ) : null}
          </p>
        ) : null}
      </div>
      <div className="flex gap-4">
        <label htmlFor="quarantine-allow-ip" className="sr-only">
          IP address to allow
        </label>
        <input
          type="text"
          id="quarantine-allow-ip"
          name="allowIp"
          placeholder="Enter IP address to allow..."
          value={manualAllowedIp}
          onChange={(e) => onChangeManual(e.target.value)}
          className="bg-background border-border focus:ring-swiss-navy w-48 rounded-xl border px-4 py-2 text-sm font-black tracking-widest uppercase"
        />
        <Button
          variant="primary"
          onClick={() => onAllow(manualAllowedIp)}
          disabled={!manualAllowedIp}
          className="bg-swiss-navy rounded-xl border-none text-white"
        >
          Allow IP
        </Button>
      </div>
    </div>

    <div className="border-border dark:border-border/10 bg-card dark:bg-secondary overflow-hidden rounded-2xl border">
      <table className="w-full text-left">
        <thead className="bg-background/50">
          <tr>
            <th className="px-6 py-4 text-xs font-black tracking-widest text-neutral-700 uppercase">
              IP Address
            </th>
            <th className="px-6 py-4 text-right text-xs font-black tracking-widest text-neutral-700 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {allowedIps.length === 0 ? (
            <tr>
              <td
                colSpan={2}
                className="px-6 py-16 text-center text-sm font-black tracking-widest text-neutral-700 uppercase backdrop-blur-sm"
              >
                No IPs allowlisted yet
              </td>
            </tr>
          ) : (
            allowedIps.map((ip) => (
              <tr key={ip} className="hover:bg-background/50 transition-all">
                <td className="text-swiss-navy px-6 py-4 text-sm font-black">
                  {ip}
                  {currentIp === ip ? (
                    <Badge className="ml-3 border-emerald-200 bg-emerald-50 text-xs font-black tracking-widest text-emerald-700 uppercase">
                      YOU
                    </Badge>
                  ) : null}
                </td>
                <td className="px-6 py-4 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hover:text-brand-accent rounded-lg text-neutral-700"
                    onClick={() => onRemove(ip)}
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
);

interface BlockedIpsTableProps {
  bannedIps: string[];
  bannedIpTypes: Record<string, string>;
  manualIp: string;
  onChangeManual: (s: string) => void;
  onBan: (ip: string) => void;
  onUnban: (ip: string) => void;
}

const BlockedIpsTable: React.FC<BlockedIpsTableProps> = ({
  bannedIps,
  bannedIpTypes,
  manualIp,
  onChangeManual,
  onBan,
  onUnban,
}) => (
  <div className="glass-panel rounded-3xl p-8">
    <div className="mb-10 flex items-center justify-between">
      <div>
        <h3 className="text-swiss-navy text-xl font-black tracking-tight uppercase">
          Blocked IPs
        </h3>
        <p className="mt-1 text-sm font-black tracking-widest text-neutral-700 uppercase">
          IP addresses currently blocked from accessing your site
        </p>
      </div>
      <div className="flex gap-4">
        <label htmlFor="quarantine-block-ip" className="sr-only">
          IP address to block
        </label>
        <input
          type="text"
          id="quarantine-block-ip"
          name="blockIp"
          placeholder="Enter IP address to block..."
          value={manualIp}
          onChange={(e) => onChangeManual(e.target.value)}
          className="bg-background border-border focus:ring-swiss-navy w-48 rounded-xl border px-4 py-2 text-sm font-black tracking-widest uppercase"
        />
        <Button
          variant="primary"
          onClick={() => onBan(manualIp)}
          disabled={!manualIp}
          className="bg-swiss-navy rounded-xl border-none text-white"
        >
          Block IP
        </Button>
      </div>
    </div>

    <div className="border-border dark:border-border/10 bg-card dark:bg-secondary overflow-hidden rounded-2xl border">
      <table className="w-full text-left">
        <thead className="bg-background/50">
          <tr>
            <th className="px-6 py-4 text-xs font-black tracking-widest text-neutral-700 uppercase">
              IP Address
            </th>
            <th className="px-6 py-4 text-right text-xs font-black tracking-widest text-neutral-700 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {bannedIps.length === 0 ? (
            <tr>
              <td
                colSpan={2}
                className="px-6 py-20 text-center text-sm font-black tracking-widest text-neutral-700 uppercase backdrop-blur-sm"
              >
                No blocked IPs yet
              </td>
            </tr>
          ) : (
            bannedIps.map((ip) => {
              const banType = bannedIpTypes[ip] || "auto";
              return (
                <tr key={ip} className="hover:bg-background/50 transition-all">
                  <td className="text-swiss-navy px-6 py-4 text-sm font-black">
                    {ip}
                    <Badge
                      className={`ml-3 text-xs font-black tracking-widest uppercase ${banType === "manual" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}
                    >
                      {banType === "manual" ? "Manual" : "Auto"}
                    </Badge>
                    <a
                      href={`https://who.is/whois/${ip}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-swiss-navy ml-4 inline-flex items-center gap-1 text-neutral-700 transition-colors"
                    >
                      <ExternalLink size={10} /> Whois
                    </a>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:text-brand-accent rounded-lg text-neutral-700"
                      onClick={() => onUnban(ip)}
                    >
                      Release
                    </Button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  </div>
);

interface QuarantinedFilesTableProps {
  files: QuarantineFile[];
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}

const QuarantinedFilesTable: React.FC<QuarantinedFilesTableProps> = ({
  files,
  onRestore,
  onDelete,
}) => (
  <div className="glass-panel rounded-3xl p-8">
    <h3 className="text-swiss-navy mb-2 text-xl font-black tracking-tight uppercase">
      Quarantined Files
    </h3>
    <p className="mb-10 text-sm font-black tracking-widest text-neutral-700 uppercase">
      Files moved to a safe, isolated location — not deleted
    </p>

    <div className="border-border dark:border-border/10 bg-card dark:bg-secondary overflow-auto rounded-2xl border">
      <table className="w-full text-left">
        <thead className="bg-background/50 text-xs font-black tracking-widest text-neutral-700 uppercase">
          <tr>
            <th className="px-6 py-4">ID</th>
            <th className="px-6 py-4">File Path</th>
            <th className="px-6 py-4">Reason</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {files.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="px-6 py-20 text-center text-sm font-black tracking-widest text-neutral-700 uppercase backdrop-blur-sm"
              >
                No files in quarantine.
              </td>
            </tr>
          ) : (
            files.map((file) => (
              <tr
                key={file.id}
                className="hover:bg-background/50 border-border border-t"
              >
                <td className="text-swiss-navy px-6 py-4 text-sm font-black">
                  #{file.id}
                </td>
                <td className="px-6 py-4">
                  <div className="text-swiss-navy max-w-xs truncate text-sm font-black">
                    {file.original_path}
                  </div>
                  <div className="mt-1 text-xs font-medium tracking-widest text-neutral-700 uppercase">
                    {file.date}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge className="rounded-xl border-none bg-orange-50 text-xs font-black text-orange-600 uppercase">
                    POTENTIAL SHELL
                  </Badge>
                </td>
                <td className="space-x-2 px-6 py-4 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-lg text-xs font-black tracking-widest text-emerald-600 uppercase hover:bg-emerald-50"
                    onClick={() => onRestore(file.id)}
                  >
                    Restore
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-brand-accent rounded-lg text-xs font-black tracking-widest uppercase hover:bg-red-50"
                    onClick={() => onDelete(file.id)}
                  >
                    Purge
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
);

interface IgnoredPathsTableProps {
  paths: string[];
  onUnIgnore: (path: string) => void;
}

const IgnoredPathsTable: React.FC<IgnoredPathsTableProps> = ({
  paths,
  onUnIgnore,
}) => (
  <div className="glass-panel rounded-3xl p-8">
    <h3 className="text-swiss-navy mb-2 text-xl font-black tracking-tight uppercase">
      Ignored Paths
    </h3>
    <p className="mb-10 text-sm font-black tracking-widest text-neutral-700 uppercase">
      Paths excluded from automated scans
    </p>

    <div className="grid gap-4">
      {paths.length === 0 ? (
        <div className="border-border rounded-2xl border p-12 text-center text-sm font-black tracking-widest text-neutral-700 uppercase backdrop-blur-sm">
          No paths excluded yet
        </div>
      ) : (
        paths.map((path, idx) => (
          <div
            key={idx}
            className="bg-card border-border hover:bg-background group flex items-center justify-between rounded-2xl border p-5 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="bg-secondary group-hover:bg-swiss-navy rounded-xl p-2 text-neutral-700 transition-all group-hover:text-white">
                <EyeOff size={14} />
              </div>
              <span className="text-swiss-navy max-w-2xl truncate font-mono text-sm font-bold">
                {path}
              </span>
            </div>
            <Button
              onClick={() => onUnIgnore(path)}
              variant="ghost"
              className="text-brand-accent rounded-xl text-xs font-black tracking-widest uppercase hover:bg-red-50"
            >
              Remove
            </Button>
          </div>
        ))
      )}
    </div>
  </div>
);

export default QuarantineTab;
