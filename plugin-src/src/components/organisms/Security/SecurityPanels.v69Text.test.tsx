/**
 * Signed screen texts of two Security panels: the security event log footer
 * (U39) and the hardening card risk badge (U49). Both are the real
 * components rendered with props. No JSX.
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, beforeAll } from "vitest";

type TL = typeof import("@testing-library/react");
let React: typeof import("react");
let render: TL["render"];
let screen: TL["screen"];
let cleanup: TL["cleanup"];
let SecurityLogsPanel: any;
let HardeningOptionsGrid: any;

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  window.React = nodeRequire("react");
  window.ReactDOM = {
    ...nodeRequire("react-dom"),
    ...nodeRequire("react-dom/client"),
  };
  ({ SecurityLogsPanel } = await import("./SecurityLogsPanel"));
  ({ HardeningOptionsGrid } = await import("./HardeningOptionsGrid"));
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  React = await import("react");
});

afterEach(() => cleanup());

const flat = (el: Element | null) =>
  (el?.textContent ?? "").replace(/\s+/g, " ").trim();

describe("SecurityLogsPanel — signed text U39", () => {
  it("U39: the footer says the 20 most recent events of every severity are shown", () => {
    const { container } = render(
      React.createElement(SecurityLogsPanel, {
        logs: [
          {
            id: 1,
            ip_address: "198.51.100.1",
            event: "Failed login",
            created_at: "2026-10-04T08:00:00Z",
            severity: "low",
            blocked: "0",
          },
        ],
      })
    );
    // positive control: the log row is on screen
    expect(screen.getByText("198.51.100.1")).toBeInTheDocument();
    expect(flat(container)).toContain(
      "Only the 20 most recent security events are shown here."
    );
    expect(flat(container)).not.toContain("high-priority");
  });
});

function option(overrides: Record<string, unknown> = {}) {
  return {
    key: "force_security_headers",
    label: "Security Headers",
    description: "Sends hardened HTTP security headers on every response.",
    enabled: false,
    pro: false,
    risk: "low",
    tier: "essential",
    requires_confirmation: false,
    ...overrides,
  };
}

describe("HardeningOptionsGrid — signed text U49", () => {
  it("U49: a low-risk card is badged 'Low risk' and a high-risk card keeps 'Read before enabling'", () => {
    const { container } = render(
      React.createElement(HardeningOptionsGrid, {
        options: [
          option(),
          option({
            key: "disable_xmlrpc",
            label: "Disable XML-RPC",
            risk: "high",
            tier: "essential",
          }),
        ],
        isLoading: false,
        onToggle: () => {},
        onApplyAll: () => {},
      })
    );
    const text = flat(container);
    // positive control: both cards rendered
    expect(text).toContain("Security Headers");
    expect(text).toContain("Disable XML-RPC");
    expect(screen.getAllByText("Low risk")).toHaveLength(1);
    expect(screen.getAllByText("Read before enabling")).toHaveLength(1);
    expect(text).not.toContain("Safe for all sites");
  });
});
