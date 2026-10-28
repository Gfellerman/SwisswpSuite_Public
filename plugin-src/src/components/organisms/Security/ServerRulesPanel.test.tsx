/**
 * CF2 Q2 acceptance, UI side (validator-written; owner ruling 2026-10-04): the
 * code the Free package ships never writes the site-root .htaccess, so the
 * hardening screen shows each rule block the user should paste (or remove),
 * with a copy button and the block's presence read from the file.
 *
 * Contract: src/components/organisms/Security/ServerRulesPanel.tsx exports
 * ServerRulesPanel({ options: HardeningOption[] }); an option carries
 * server_rules?: { marker: string; rules: string; present: boolean }.
 * Shown entries: enabled && !present (to add) and !enabled && present (to
 * remove). Nothing to show → renders nothing. When shown, the panel ends with
 * the shared CapabilityNote (CAPABILITY_NOTES.serverRules).
 *
 * Ids: CF2-Q2U-1 .. Q2U-5. RED on d40767d0 (module absent).
 */
import { createRequire } from "module";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";

type TL = typeof import("@testing-library/react");
let render: TL["render"];
let screen: TL["screen"];
let cleanup: TL["cleanup"];
let fireEvent: TL["fireEvent"];
let h: (typeof import("react"))["createElement"];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ServerRulesPanel: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let copy: any;

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  const RealReact = nodeRequire("react");
  (window as unknown as { React: unknown }).React = RealReact;
  (window as unknown as { ReactDOM: unknown }).ReactDOM = {
    ...nodeRequire("react-dom"),
    ...nodeRequire("react-dom/client"),
  };
  h = RealReact.createElement;
  ({ render, screen, cleanup, fireEvent } = await import("@testing-library/react"));
  copy = await import("../../../lib/capabilityNoteCopy");
  ({ ServerRulesPanel } = await import("./ServerRulesPanel"));
});
afterEach(() => cleanup());

const BLOCK = "# BEGIN SwissWPSuite-XMLRPC\n<Files xmlrpc.php>\nRequire all denied\n</Files>\n# END SwissWPSuite-XMLRPC";
function opt(key: string, label: string, enabled: boolean, present: boolean | null) {
  return {
    key,
    label,
    description: "d",
    enabled,
    ...(present === null ? {} : { server_rules: { marker: "SwissWPSuite-" + key, rules: key === "disable_xmlrpc" ? BLOCK : "# BEGIN x\nY\n# END x", present } }),
  };
}

describe("ServerRulesPanel (CF2 Q2)", () => {
  it("CF2-Q2U-1: shows the exact block for an enabled option whose block is missing", () => {
    const { container } = render(h(ServerRulesPanel, { options: [opt("disable_xmlrpc", "Turn Off Remote Access", true, false)] }));
    const pre = container.querySelector("pre");
    expect(pre?.textContent).toBe(BLOCK);
    expect(screen.getByRole("heading", { name: /Turn Off Remote Access/ })).toBeTruthy();
  });

  it("CF2-Q2U-2: the copy button has a self-describing name and copies the exact block", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(h(ServerRulesPanel, { options: [opt("disable_xmlrpc", "Turn Off Remote Access", true, false)] }));
    const btn = screen.getByRole("button", { name: /copy.*turn off remote access/i });
    fireEvent.click(btn);
    expect(writeText).toHaveBeenCalledWith(BLOCK);
  });

  it("CF2-Q2U-3: a block still present for a switched-off option is listed for removal; present+enabled is not listed", () => {
    const { container } = render(
      h(ServerRulesPanel, {
        options: [opt("enable_csp", "Content Source Monitoring", false, true), opt("block_bad_bots", "Block Aggressive Web Crawlers", true, true)],
      })
    );
    expect(container.textContent).toMatch(/Content Source Monitoring/);
    expect(container.textContent).not.toMatch(/Block Aggressive Web Crawlers/);
    expect(container.textContent).toMatch(/remove/i);
  });

  it("CF2-Q2U-4: nothing to show renders nothing (and no capability note)", () => {
    const { container } = render(
      h(ServerRulesPanel, { options: [opt("block_bad_bots", "B", true, true), opt("enable_csp", "C", false, false), opt("x", "No rules", true, null)] })
    );
    expect(container.textContent).toBe("");
  });

  it("CF2-Q2U-5: when shown, ends with the capability note linking to Settings", () => {
    render(h(ServerRulesPanel, { options: [opt("disable_xmlrpc", "Turn Off Remote Access", true, false)] }));
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("#/settings?tab=general");
    expect(document.body.textContent).toContain(copy.CAPABILITY_NOTES.serverRules);
    expect(document.body.textContent).not.toMatch(/\b(pro|premium|upgrade|unlock|edition)\b/i);
  });
});
