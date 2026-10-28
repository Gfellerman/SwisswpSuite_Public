/**
 * CF2 D-9 acceptance (validator-written): the Security Event Log shows the
 * BLOCKED badge for every row whose `blocked` column is 1, in whatever JSON
 * type the endpoint sends it. GET /security/logs returns the rows of
 * $wpdb->get_results(), where MySQL integer columns arrive as STRINGS ("1" /
 * "0"); the panel compared `=== 1`, so the badge never rendered.
 *
 * Ids: CF2-D9-V1 (string "1" renders, RED on d40767d0), CF2-D9-V2 (string "0"
 * and number 0 do not render), CF2-D9-V3 (number 1 / true still render).
 */
import { createRequire } from "module";
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import type { SecurityLog } from "../../../types";

type TL = typeof import("@testing-library/react");
type PanelModule = typeof import("./SecurityLogsPanel");

let render: TL["render"];
let screen: TL["screen"];
let cleanup: TL["cleanup"];
let SecurityLogsPanel: PanelModule["SecurityLogsPanel"];
let h: (typeof import("react"))["createElement"];

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  const RealReact = nodeRequire("react");
  const RealReactDOM = nodeRequire("react-dom");
  const RealReactDOMClient = nodeRequire("react-dom/client");
  (window as unknown as { React: unknown }).React = RealReact;
  (window as unknown as { ReactDOM: unknown }).ReactDOM = {
    ...RealReactDOM,
    ...RealReactDOMClient,
  };
  h = RealReact.createElement;
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  ({ SecurityLogsPanel } = await import("./SecurityLogsPanel"));
});

afterEach(() => cleanup());

function row(id: number, blocked: unknown): SecurityLog {
  return {
    id,
    ip_address: "198.51.100." + id,
    event: "SQL Injection Attempt",
    created_at: "2026-10-04T08:00:00Z",
    severity: "high",
    blocked: blocked as SecurityLog["blocked"],
  };
}

describe("SecurityLogsPanel BLOCKED badge (CF2 D-9)", () => {
  it('CF2-D9-V1: renders BLOCKED for blocked = "1" (the wpdb string shape)', () => {
    render(h(SecurityLogsPanel, { logs: [row(1, "1")] }));
    expect(screen.queryAllByText("BLOCKED")).toHaveLength(1);
  });

  it('CF2-D9-V2: no badge for "0" or 0', () => {
    render(h(SecurityLogsPanel, { logs: [row(2, "0"), row(3, 0)] }));
    expect(screen.queryAllByText("BLOCKED")).toHaveLength(0);
  });

  it("CF2-D9-V3: number 1 and true still render", () => {
    render(h(SecurityLogsPanel, { logs: [row(4, 1), row(5, true)] }));
    expect(screen.queryAllByText("BLOCKED")).toHaveLength(2);
  });
});
