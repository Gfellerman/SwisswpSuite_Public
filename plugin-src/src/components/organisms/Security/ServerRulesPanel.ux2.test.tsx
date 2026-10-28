/**
 * CF2 UX round 2 acceptance, panel level (validator-written, 2026-10-04).
 * Drives the real exported ServerRulesPanel. Sources of truth:
 * - owner ruling: the copy-failure status text (both builds), verbatim below;
 * - owner ruling: the Pro-only intro lives in a copy module that the Pro
 *   overlay shadows; this tree keeps the approved S-5 intro;
 * - a11y consult F1 (dark-mode heading contrast) and F2 (silent copy failure);
 * - review F-3 (stale "Copied.") and C8 (a synchronous writeText throw).
 *
 * Contract:
 * - src/components/organisms/Security/serverRulesIntro.ts exports
 *   SERVER_RULES_INTRO (this tree: the S-5 intro), and the panel renders it.
 * - A copy that cannot use the clipboard (no API, a rejected promise, or a
 *   synchronous throw) selects the row's block and puts COPY_FAILED in that
 *   row's polite status. Success puts "Copied." there. One non-empty status
 *   at a time.
 * - A row's status is empty again once that row is no longer listed or its
 *   block/direction changed; it is never cleared or set by a timer.
 *
 * Ids: CF2-U2-1a, 1b, 2, 3a, 3b, 3c, 4a, 4b, 4c, 5.
 */
import { createRequire } from "module";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";

// vite-node defines __dirname for every test module.
declare const __dirname: string;

type TL = typeof import("@testing-library/react");
let render: TL["render"];
let screen: TL["screen"];
let cleanup: TL["cleanup"];
let fireEvent: TL["fireEvent"];
let waitFor: TL["waitFor"];
let act: TL["act"];
let h: (typeof import("react"))["createElement"];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ServerRulesPanel: any;

const FREE_INTRO =
  "This plugin does not edit your site's .htaccess file. To add server-level protection for the options below, copy each block into the .htaccess file in your site's root folder (for example with your host's file manager), above the line # BEGIN WordPress.";
const PRO_INTRO_PHRASE = "could not bring your site's .htaccess file in line";
const COPY_FAILED =
  "Copying did not work here. The block is now selected: press Ctrl+C (Cmd+C on a Mac) to copy it.";

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  const RealReact = nodeRequire("react");
  (window as unknown as { React: unknown }).React = RealReact;
  (window as unknown as { ReactDOM: unknown }).ReactDOM = {
    ...nodeRequire("react-dom"),
    ...nodeRequire("react-dom/client"),
  };
  h = RealReact.createElement;
  ({ render, screen, cleanup, fireEvent, waitFor, act } = await import("@testing-library/react"));
  ({ ServerRulesPanel } = await import("./ServerRulesPanel"));
});
afterEach(() => {
  cleanup();
  window.getSelection()?.removeAllRanges();
  Object.assign(navigator, { clipboard: undefined });
});

const BLOCK_X = "# BEGIN SwissWPSuite-XMLRPC\n<Files xmlrpc.php>\nRequire all denied\n</Files>\n# END SwissWPSuite-XMLRPC";
const BLOCK_B = "# BEGIN SwissWPSuite-BadBots\nSetEnvIf User-Agent x bad\n# END SwissWPSuite-BadBots";
function opt(key: string, label: string, enabled: boolean, present: boolean, rules: string) {
  return { key, label, description: "d", enabled, server_rules: { marker: "M-" + key, rules, present } };
}
const X_ADD = () => opt("disable_xmlrpc", "Turn Off Remote Access", true, false, BLOCK_X);
const X_REMOVE = () => opt("disable_xmlrpc", "Turn Off Remote Access", false, true, BLOCK_X);
const X_DONE = () => opt("disable_xmlrpc", "Turn Off Remote Access", true, true, BLOCK_X);
const B_ADD = () => opt("block_bad_bots", "Block Aggressive Web Crawlers", true, false, BLOCK_B);

/** The polite status that sits in the same row as the named copy button. */
function statusFor(label: RegExp): HTMLElement {
  const btn = screen.getByRole("button", { name: label });
  // Nearest ancestor that holds exactly one polite status = this row's status.
  for (let el: HTMLElement | null = btn.parentElement; el; el = el.parentElement) {
    const found = el.querySelectorAll('[role="status"]');
    if (found.length === 1) return found[0] as HTMLElement;
    if (found.length > 1) break;
  }
  throw new Error("no single role=status in the row of " + String(label));
}
const selected = () => window.getSelection()?.toString() ?? "";

/** Click and record anything that escapes the handler (thrown or reported). */
function clickCapturing(el: HTMLElement): unknown[] {
  const escaped: unknown[] = [];
  const onError = (e: ErrorEvent) => {
    escaped.push(e.error ?? e.message);
    e.preventDefault();
  };
  window.addEventListener("error", onError);
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    fireEvent.click(el);
  } catch (e) {
    escaped.push(e);
  } finally {
    window.removeEventListener("error", onError);
    spy.mockRestore();
  }
  return escaped;
}

function filesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...filesUnder(p));
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

describe("ServerRulesPanel, CF2 UX round 2", () => {
  it("CF2-U2-1a: the intro comes from serverRulesIntro.ts and this tree keeps the approved S-5 text", async () => {
    const introModule = "./serverRulesIntro";
    const mod = await import(/* @vite-ignore */ introModule);
    expect(Object.keys(mod)).toEqual(["SERVER_RULES_INTRO"]);
    expect(mod.SERVER_RULES_INTRO).toBe(FREE_INTRO);
    render(h(ServerRulesPanel, { options: [X_ADD()] }));
    expect(document.body.textContent).toContain(FREE_INTRO);
  });

  it("CF2-U2-1b: no shipped source under src/ carries the Pro-only intro (positive control: the S-5 phrase is found)", () => {
    const srcRoot = join(__dirname, "..", "..", "..");
    const files = filesUnder(srcRoot);
    const hits = (needle: string) => files.filter((f) => readFileSync(f, "utf8").includes(needle));
    expect(hits("does not edit your site's .htaccess file").length).toBeGreaterThan(0);
    expect(hits(PRO_INTRO_PHRASE)).toEqual([]);
  });

  it("CF2-U2-2: a row heading using the navy token carries a dark-mode text colour", () => {
    const { container } = render(h(ServerRulesPanel, { options: [X_ADD()] }));
    const heading = screen.getByRole("heading", { name: /Turn Off Remote Access/ });
    expect(heading.tagName).toBe("H5");
    const navy = Array.from(container.querySelectorAll("*")).filter((el) =>
      el.getAttribute("class")?.split(/\s+/).includes("text-swiss-navy")
    );
    for (const el of [heading, ...navy]) {
      const cls = (el.getAttribute("class") ?? "").split(/\s+/);
      if (cls.includes("text-swiss-navy")) {
        expect(cls.some((c) => c.startsWith("dark:text-"))).toBe(true);
      }
    }
  });

  it("CF2-U2-3a: no clipboard API: the block is selected and the row's status gives the approved instruction", () => {
    Object.assign(navigator, { clipboard: undefined });
    render(h(ServerRulesPanel, { options: [X_ADD()] }));
    const btn = screen.getByRole("button", { name: /copy the rules for turn off remote access/i });
    btn.focus();
    fireEvent.click(btn);
    expect(selected()).toBe(BLOCK_X);
    expect(statusFor(/turn off remote access/i).textContent).toBe(COPY_FAILED);
    expect(document.activeElement).toBe(btn);
  });

  it("CF2-U2-3b: a rejected writeText selects the block and announces the approved instruction", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("NotAllowedError"));
    Object.assign(navigator, { clipboard: { writeText } });
    render(h(ServerRulesPanel, { options: [X_ADD()] }));
    const btn = screen.getByRole("button", { name: /copy the rules for turn off remote access/i });
    btn.focus();
    fireEvent.click(btn);
    await waitFor(() => expect(statusFor(/turn off remote access/i).textContent).toBe(COPY_FAILED));
    expect(writeText).toHaveBeenCalledWith(BLOCK_X);
    expect(selected()).toBe(BLOCK_X);
    expect(document.activeElement).toBe(btn);
  });

  it("CF2-U2-3c: one non-empty status at a time; a later success replaces an earlier failure", async () => {
    const writeText = vi.fn().mockRejectedValueOnce(new Error("denied")).mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(h(ServerRulesPanel, { options: [X_ADD(), B_ADD()] }));
    fireEvent.click(screen.getByRole("button", { name: /turn off remote access/i }));
    await waitFor(() => expect(statusFor(/turn off remote access/i).textContent).toBe(COPY_FAILED));
    fireEvent.click(screen.getByRole("button", { name: /aggressive web crawlers/i }));
    await waitFor(() => expect(statusFor(/aggressive web crawlers/i).textContent).toBe("Copied."));
    expect(statusFor(/turn off remote access/i).textContent).toBe("");
  });

  it("CF2-U2-4a: after a copy, the same option's row changing direction (add -> remove) starts with an empty status", async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    const { rerender } = render(h(ServerRulesPanel, { options: [X_ADD()] }));
    fireEvent.click(screen.getByRole("button", { name: /turn off remote access/i }));
    await waitFor(() => expect(statusFor(/turn off remote access/i).textContent).toBe("Copied."));
    rerender(h(ServerRulesPanel, { options: [X_REMOVE()] }));
    expect(statusFor(/turn off remote access/i).textContent).toBe("");
  });

  it("CF2-U2-4b: a row that disappears and comes back later starts with an empty status", async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    const { rerender, container } = render(h(ServerRulesPanel, { options: [X_ADD()] }));
    fireEvent.click(screen.getByRole("button", { name: /turn off remote access/i }));
    await waitFor(() => expect(statusFor(/turn off remote access/i).textContent).toBe("Copied."));
    rerender(h(ServerRulesPanel, { options: [X_DONE()] }));
    expect(container.textContent).toBe("");
    rerender(h(ServerRulesPanel, { options: [X_ADD()] }));
    expect(statusFor(/turn off remote access/i).textContent).toBe("");
  });

  it("CF2-U2-4c: no timer drives the status (source has no setTimeout/setInterval; positive control on SecurityHub.tsx)", () => {
    const here = __dirname;
    const control = readFileSync(join(__dirname, "..", "..", "SecurityHub.tsx"), "utf8");
    expect(/\bsetTimeout\s*\(/.test(control)).toBe(true);
    const src = readFileSync(join(here, "ServerRulesPanel.tsx"), "utf8");
    expect(/\bset(Timeout|Interval)\s*\(/.test(src)).toBe(false);
  });

  it("CF2-U2-5: a writeText that throws synchronously takes the failure path and nothing escapes the handler", async () => {
    const writeText = vi.fn(() => {
      throw new Error("sync throw");
    });
    Object.assign(navigator, { clipboard: { writeText } });
    render(h(ServerRulesPanel, { options: [X_ADD()] }));
    const escaped = clickCapturing(screen.getByRole("button", { name: /turn off remote access/i }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(escaped).toEqual([]);
    expect(writeText).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(statusFor(/turn off remote access/i).textContent).toBe(COPY_FAILED));
    expect(selected()).toBe(BLOCK_X);
  });
});
