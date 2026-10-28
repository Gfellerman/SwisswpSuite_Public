/**
 * ServerRulesPanel — the server-level rule blocks a site owner pastes by hand.
 *
 * For each hardening option that has a server-level rule, GET /hardening/status
 * reports the exact block (`server_rules`) and whether that block is already in
 * the site-root .htaccess file. This panel lists the blocks that need a hand
 * edit, whoever is meant to change the file:
 *   - the option is on and its block is missing  -> add the block;
 *   - the option is off and its block is present -> remove the block.
 * Nothing to do (or no `server_rules` key, as on hosts that ignore .htaccess)
 * renders nothing at all. The intro sentence comes from ./serverRulesIntro, so
 * a build can word it to match what the plugin does with that file.
 *
 * The panel is inline content, not a notice: no dismiss control, no timer.
 * The only live region is the status inside a row: "Copied." after a copy, or
 * the instruction to copy by keyboard when the clipboard could not be used.
 */
import React, { useEffect, useState } from "react";
import { Button } from "../../ui/Button";
import { CapabilityNote } from "../../atoms/CapabilityNote";
import { CAPABILITY_NOTES } from "../../../lib/capabilityNoteCopy";
import { HardeningOption, HardeningServerRules } from "../../../types";
import { SERVER_RULES_INTRO } from "./serverRulesIntro";

const PANEL_HEADING = "Server rules to add by hand";
const ADD_SENTENCE = "Not found in your .htaccess file yet. Add this block:";
const COPIED_CONFIRMATION = "Copied.";
const COPY_FAILED_INSTRUCTION =
  "Copying did not work here. The block is now selected: press Ctrl+C (Cmd+C on a Mac) to copy it.";

const removeSentence = (marker: string): string =>
  `This block is still in your .htaccess file, but the option is off. Delete the lines from # BEGIN ${marker} to # END ${marker} to remove it.`;

interface RuleRow {
  key: string;
  label: string;
  rules: HardeningServerRules;
}

/** True for a well-formed `server_rules` entry; anything else is not listed. */
function isRulesEntry(value: unknown): value is HardeningServerRules {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.marker === "string" &&
    typeof entry.rules === "string" &&
    entry.rules !== "" &&
    typeof entry.present === "boolean"
  );
}

/** Options whose block needs a hand edit: on and missing, or off and present. */
function rowsToShow(options: HardeningOption[]): RuleRow[] {
  if (!Array.isArray(options)) return [];
  const rows: RuleRow[] = [];
  for (const opt of options) {
    const entry: unknown = opt?.server_rules;
    if (!isRulesEntry(entry)) continue;
    if (Boolean(opt.enabled) === entry.present) continue;
    rows.push({ key: opt.key, label: opt.label, rules: entry });
  }
  return rows;
}

/**
 * Identity of what a row shows: the option, which direction (add or remove)
 * and the block text. A copy status belongs to exactly one such identity.
 */
function rowIdentity(row: RuleRow): string {
  return JSON.stringify([row.key, row.rules.present, row.rules.rules]);
}

type CopyOutcome = "copied" | "failed";

interface CopyStatus {
  identity: string;
  outcome: CopyOutcome;
}

/** Element id for a row's block, safe to use in an id attribute. */
function blockId(key: string): string {
  return `server-rules-${String(key).replace(/[^A-Za-z0-9_-]/g, "-")}`;
}

/** Select the block's text so it can be copied with the keyboard. */
function selectBlock(id: string): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const el = document.getElementById(id);
  const selection = window.getSelection ? window.getSelection() : null;
  if (!el || !selection) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  selection.removeAllRanges();
  selection.addRange(range);
}

interface ServerRulesPanelProps {
  options: HardeningOption[];
}

export const ServerRulesPanel: React.FC<ServerRulesPanelProps> = ({
  options,
}) => {
  // The outcome of the last copy and the row it belongs to; at most one row
  // shows a status at a time. Declared above the early return so it is also
  // cleared while the panel renders nothing.
  const [status, setStatus] = useState<CopyStatus | null>(null);

  const rows = rowsToShow(options);
  const statusIsListed =
    status !== null && rows.some((row) => rowIdentity(row) === status.identity);

  // Drop a status once no listed row has its identity (the row is gone, its
  // direction flipped or its block changed), so a row that comes back later
  // starts empty.
  useEffect(() => {
    if (status !== null && !statusIsListed) setStatus(null);
  }, [status, statusIsListed]);

  if (rows.length === 0) return null;

  const statusTextFor = (row: RuleRow): string => {
    if (!statusIsListed || status === null) return "";
    if (status.identity !== rowIdentity(row)) return "";
    return status.outcome === "copied"
      ? COPIED_CONFIRMATION
      : COPY_FAILED_INSTRUCTION;
  };

  const handleCopy = (row: RuleRow) => {
    const identity = rowIdentity(row);
    setStatus(null);
    // The block is selected so the keyboard copy shortcut works; focus stays
    // on the pressed button.
    const fail = () => {
      selectBlock(blockId(row.key));
      setStatus({ identity, outcome: "failed" });
    };
    const clipboard =
      typeof navigator !== "undefined" ? navigator.clipboard : undefined;
    // A page served without a secure context has no clipboard API.
    if (!clipboard || typeof clipboard.writeText !== "function") {
      fail();
      return;
    }
    try {
      Promise.resolve(clipboard.writeText(row.rules.rules)).then(
        () => setStatus({ identity, outcome: "copied" }),
        fail
      );
    } catch {
      fail();
    }
  };

  return (
    <section
      aria-labelledby="server-rules-heading"
      className="glass-panel rounded-2xl p-6"
    >
      <h4
        id="server-rules-heading"
        className="text-foreground mb-2 text-xs font-black tracking-widest uppercase"
      >
        {PANEL_HEADING}
      </h4>
      <p className="mb-4 text-sm leading-relaxed font-medium text-neutral-700 dark:text-neutral-300">
        {SERVER_RULES_INTRO}
      </p>
      {rows.map((row) => (
        <div key={row.key} className="border-border mb-4 border-t pt-4">
          <h5 className="text-swiss-navy dark:text-foreground mb-1 text-xs font-black tracking-widest uppercase">
            {row.label}
          </h5>
          <p className="mb-2 text-sm text-neutral-700 dark:text-neutral-300">
            {row.rules.present
              ? removeSentence(row.rules.marker)
              : ADD_SENTENCE}
          </p>
          <pre
            id={blockId(row.key)}
            className="overflow-hidden rounded-lg bg-neutral-100 p-3 text-xs break-words whitespace-pre-wrap text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
          >
            {row.rules.rules}
          </pre>
          <div className="mt-2 flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleCopy(row)}
            >
              Copy the rules for {row.label}
            </Button>
            <span
              role="status"
              className="text-xs text-neutral-600 dark:text-neutral-400"
            >
              {statusTextFor(row)}
            </span>
          </div>
        </div>
      ))}
      <CapabilityNote text={CAPABILITY_NOTES.serverRules} />
    </section>
  );
};
