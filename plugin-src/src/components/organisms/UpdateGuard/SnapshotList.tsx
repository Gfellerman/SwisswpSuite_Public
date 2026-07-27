/**
 * SnapshotList — Phase 2 component displaying the full snapshot table.
 *
 * Provides Restore (two-step confirmation) and Delete actions per snapshot row.
 *
 * ARIA:
 *  - Table: native <table> + aria-label
 *  - <th scope="col"> — implicit columnheader role (no override)
 *  - Restore/Delete buttons: aria-label includes slug
 *  - Loading state per button: aria-busy="true"
 *  - Inline error: role="alert" span
 */

import React, { useState, useRef } from "react";
import { wpApi } from "../../../services/api";
import type { UpdateSnapshot } from "../../../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export function formatIsoDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatTimestampDate(ts: number): string {
  return formatIsoDate(new Date(ts * 1000).toISOString());
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface RowActionsProps {
  snap: UpdateSnapshot;
  onRestoreComplete: () => void;
  onDeleteComplete: () => void;
}

const RowActions: React.FC<RowActionsProps> = ({
  snap,
  onRestoreComplete,
  onDeleteComplete,
}) => {
  // Restore two-step state
  const [restoreState, setRestoreState] = useState<
    "idle" | "loading" | "confirm" | "restoring"
  >("idle");
  const [restoreToken, setRestoreToken] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // Delete state
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  /*
    WCAG 4.1.3 / A-8 fix: Error alert re-announcement on repeated failures.
    role="alert" fires when the node MOUNTS with content. If the same error
    message occurs twice (e.g., two consecutive failed restores with identical
    text), React reuses the existing span (same text = same virtual DOM node)
    — no DOM mutation occurs — and NVDA/JAWS do not re-announce.

    Fix: maintain monotonically-incrementing counters. The `key` on the alert
    span is `${errorSeq}-${errorMessage}`, so even a repeat error at a new seq
    forces React to unmount and remount the span — firing the alert again.
  */
  const restoreErrorSeq = useRef(0);
  const deleteErrorSeq = useRef(0);

  const handleRestoreStep1 = async () => {
    setRestoreError(null);
    setRestoreState("loading");
    try {
      const res = await wpApi<{
        requires_confirmation: boolean;
        token: string;
      }>("/update-guard/snapshots/restore", {
        method: "POST",
        body: JSON.stringify({
          slug: snap.slug,
          snapshot_path: snap.path,
          // Use plugin_file (e.g. "folder/file.php") when available.
          // snap.slug alone was stripped of '/' by sanitize_file_name() — see snapshot bug fix.
          plugin_file: snap.plugin_file ?? snap.slug,
        }),
      });
      if (res.requires_confirmation) {
        setRestoreToken(res.token);
        setRestoreState("confirm");
      } else {
        // No confirmation needed — treat as done
        setRestoreState("idle");
        onRestoreComplete();
      }
    } catch (err) {
      restoreErrorSeq.current += 1;
      setRestoreError(err instanceof Error ? err.message : "Restore failed.");
      setRestoreState("idle");
    }
  };

  const handleRestoreConfirm = async () => {
    if (!restoreToken) return;
    setRestoreError(null);
    setRestoreState("restoring");
    try {
      await wpApi("/update-guard/snapshots/restore", {
        method: "POST",
        body: JSON.stringify({
          slug: snap.slug,
          snapshot_path: snap.path,
          // Use plugin_file (e.g. "folder/file.php") when available.
          // snap.slug alone was stripped of '/' by sanitize_file_name() — see snapshot bug fix.
          plugin_file: snap.plugin_file ?? snap.slug,
          token: restoreToken,
          confirmed: true,
        }),
      });
      setRestoreState("idle");
      setRestoreToken(null);
      onRestoreComplete();
    } catch (err) {
      restoreErrorSeq.current += 1;
      setRestoreError(err instanceof Error ? err.message : "Restore failed.");
      setRestoreState("idle");
      setRestoreToken(null);
    }
  };

  const handleRestoreCancel = () => {
    setRestoreState("idle");
    setRestoreToken(null);
    setRestoreError(null);
  };

  const handleDelete = async () => {
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      await wpApi("/update-guard/snapshots/delete", {
        method: "DELETE",
        body: JSON.stringify({ snapshot_path: snap.path }),
      });
      onDeleteComplete();
    } catch (err) {
      deleteErrorSeq.current += 1;
      setDeleteError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const isRestoreLoading =
    restoreState === "loading" || restoreState === "restoring";

  return (
    <div className="flex flex-col gap-1.5">
      {/* Inline confirmation row */}
      {restoreState === "confirm" && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-amber-700 font-medium">
            Confirm restore?
          </span>
          <button
            type="button"
            onClick={handleRestoreConfirm}
            className="inline-flex items-center px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 text-xs font-black text-amber-700 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-swiss-navy transition-colors"
            aria-label={`Confirm restore of ${snap.slug}`}
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={handleRestoreCancel}
            className="inline-flex items-center px-2.5 py-1 rounded-lg border border-border bg-secondary text-xs font-black text-neutral-600 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-swiss-navy transition-colors"
            aria-label={`Cancel restore of ${snap.slug}`}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Action buttons row */}
      {restoreState !== "confirm" && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={handleRestoreStep1}
            disabled={isRestoreLoading}
            aria-label={`Restore ${snap.slug} from snapshot`}
            aria-busy={isRestoreLoading}
            className="inline-flex items-center px-2.5 py-1 rounded-lg border border-blue-300 bg-white text-xs font-black text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-swiss-navy disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRestoreLoading ? "Restoring…" : "Restore"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteLoading}
            aria-label={`Delete snapshot for ${snap.slug}`}
            aria-busy={deleteLoading}
            className="inline-flex items-center px-2.5 py-1 rounded-lg border border-red-200 bg-white text-xs font-black text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-swiss-navy disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {deleteLoading ? "Deleting…" : "Delete"}
          </button>
        </div>
      )}

      {/* Inline errors */}
      {restoreError && (
        /*
          WCAG 4.1.3 / A-8 fix: key includes the error sequence counter.
          When the same error message occurs twice in a row, restoreErrorSeq.current
          increments, producing a new key — React unmounts and remounts this span,
          firing a fresh role="alert" DOM mutation that NVDA/JAWS will announce.
        */
        <span
          key={`restore-err-${restoreErrorSeq.current}`}
          role="alert"
          className="text-xs text-red-600 font-medium"
        >
          {restoreError}
        </span>
      )}
      {deleteError && (
        <span
          key={`delete-err-${deleteErrorSeq.current}`}
          role="alert"
          className="text-xs text-red-600 font-medium"
        >
          {deleteError}
        </span>
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export interface SnapshotListProps {
  snapshots: UpdateSnapshot[];
  onRestoreComplete: () => void;
  onDeleteComplete: () => void;
}

const SnapshotList: React.FC<SnapshotListProps> = ({
  snapshots,
  onRestoreComplete,
  onDeleteComplete,
}) => {
  if (snapshots.length === 0) {
    return (
      <p className="text-xs text-neutral-600 font-medium py-4 text-center">
        No snapshots yet. Snapshots are created automatically before each plugin
        update.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-xs" aria-label="Update snapshots">
        <thead>
          <tr className="border-b border-border bg-secondary/60">
            <th
              scope="col"
              className="px-3 py-2 text-left font-black text-neutral-600 uppercase tracking-[0.06em] whitespace-nowrap"
            >
              Plugin
            </th>
            <th
              scope="col"
              className="px-3 py-2 text-left font-black text-neutral-600 uppercase tracking-[0.06em] whitespace-nowrap"
            >
              Version
            </th>
            <th
              scope="col"
              className="px-3 py-2 text-left font-black text-neutral-600 uppercase tracking-[0.06em] whitespace-nowrap"
            >
              Date
            </th>
            <th
              scope="col"
              className="px-3 py-2 text-left font-black text-neutral-600 uppercase tracking-[0.06em] whitespace-nowrap"
            >
              Size
            </th>
            <th
              scope="col"
              className="px-3 py-2 text-left font-black text-neutral-600 uppercase tracking-[0.06em] whitespace-nowrap"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {snapshots.map((snap, idx) => (
            <tr
              key={snap.path}
              className={`border-b border-border last:border-b-0 ${
                idx % 2 === 0 ? "bg-card" : "bg-secondary/30"
              }`}
            >
              <td className="px-3 py-2 font-medium text-neutral-800 whitespace-nowrap">
                <code className="font-mono text-xs">{snap.slug}</code>
                {(!snap.plugin_file || !snap.plugin_file.includes('/')) && (
                  <span
                    className="ml-1.5 inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200"
                    title="Created before v2.9.28.52 — restore path recovered via disk scan"
                    aria-label={`${snap.slug} legacy snapshot — restore reliability slightly reduced`}
                  >
                    Legacy
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-neutral-600 whitespace-nowrap">
                {snap.version}
              </td>
              <td className="px-3 py-2 text-neutral-600 whitespace-nowrap">
                {formatTimestampDate(snap.timestamp)}
              </td>
              <td className="px-3 py-2 text-neutral-600 whitespace-nowrap">
                {formatBytes(snap.size_bytes)}
              </td>
              <td className="px-3 py-2">
                <RowActions
                  snap={snap}
                  onRestoreComplete={onRestoreComplete}
                  onDeleteComplete={onDeleteComplete}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SnapshotList;
