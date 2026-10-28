import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, beforeAll } from "vitest";

/**
 * Security panels (final .69 pass): the Cloudflare section (FF-1 T52, FF-2
 * T53), the Quarantine reason column (FF-3 T54) and the History button's
 * accessible name (FF-4). The real components are rendered. No JSX.
 */
type TL = typeof import("@testing-library/react");
let CloudShieldPanel: any;
let QuarantineTab: any;
let ScanHistoryTable: any;
let render: TL["render"];
let screen: TL["screen"];
let cleanup: TL["cleanup"];
let React: typeof import("react");

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  window.React = nodeRequire("react");
  window.ReactDOM = {
    ...nodeRequire("react-dom"),
    ...nodeRequire("react-dom/client"),
  };
  ({ CloudShieldPanel } = await import("./CloudShieldPanel"));
  ({ QuarantineTab } = await import("./QuarantineTab"));
  ({ ScanHistoryTable } = await import("./ScanHistoryTable"));
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  React = await import("react");
});

afterEach(() => cleanup());

const flat = (el: Element | null) =>
  (el?.textContent ?? "").replace(/\s+/g, " ").trim();

describe("CloudShieldPanel — no Cloudflare header on the request (T52, T53)", () => {
  function mountPanel() {
    return render(
      React.createElement(CloudShieldPanel, {
        cloudflareDetected: false,
        cloudflareConnectingIp: false,
        cloudflareCountryHeader: false,
        headersActive: false,
        wafActive: true,
        botBlockingActive: false,
        versionHidingActive: false,
      })
    );
  }

  it("T52: says what SwissSuite saw on the request and what the Security Score shows", () => {
    const { container } = mountPanel();
    expect(flat(container)).toContain(
      "SwissSuite did not find a Cloudflare CF-Connecting-IP or CF-Ray header on the request this page made to the site. SwissSuite's own protections (firewall, login protection, bot blocking) run whether or not a reverse proxy is in front of the site; behind a proxy other than Cloudflare they can see the proxy's address instead of each visitor's. The Security Score below shows whether the firewall and bot blocking are on. The section below describes what this plugin does with the Cloudflare proxy headers whenever one is present."
    );
    expect(flat(container)).not.toContain(
      "regardless of whether a reverse proxy"
    );
  });

  it("T53: the verification hint points to screens that exist", () => {
    const { container } = mountPanel();
    expect(flat(container)).toContain(
      'The clearest check is whether the Origin addresses in the Security Event Log (Logs tab) and "Your current IP" under Quarantine → Allowed IPs show real visitor addresses rather than one of Cloudflare\'s own edge IPs repeated for every request.'
    );
    expect(flat(container)).not.toContain("rate-limit entries");
  });
});

describe("QuarantineTab — Reason column (T54)", () => {
  it("T54: a quarantined file's reason reads 'Flagged by a scan'", () => {
    const noop = () => {};
    const { container } = render(
      React.createElement(QuarantineTab, {
        bannedIps: [],
        bannedIpTypes: {},
        manualIp: "",
        allowedIps: [],
        currentIp: "203.0.113.5",
        manualAllowedIp: "",
        quarantinedFiles: [
          {
            id: "q1",
            original_path: "wp-content/uploads/x.php",
            date: "2026-10-20 10:00:00",
          },
        ],
        ignoredPaths: [],
        onChangeManualIp: noop,
        onChangeManualAllowedIp: noop,
        onBanIp: noop,
        onUnbanIp: noop,
        onAllowIp: noop,
        onRemoveAllowedIp: noop,
        onRestoreQuarantine: noop,
        onDeleteQuarantine: noop,
        onUnIgnore: noop,
      })
    );
    expect(screen.getByText("wp-content/uploads/x.php")).toBeInTheDocument();
    expect(flat(container)).toContain("Flagged by a scan");
    expect(flat(container)).not.toContain("POTENTIAL SHELL");
  });
});

describe("ScanHistoryTable — View button name, older server formats (FF-4)", () => {
  const mountWith = (scannedAt: string) =>
    render(
      React.createElement(ScanHistoryTable, {
        scanHistory: [
          {
            id: 8,
            scan_id: "11111111-2222-4333-8444-555555555556",
            scan_type: "malware_deep",
            scanned_at: scannedAt,
            security_grade: "C",
            findings_count: 0,
            critical_count: 0,
          },
        ],
        loadingRecordId: null,
        onRefresh: () => {},
        onViewRecord: () => {},
      })
    );

  it("an older server's local 'Y-m-d H:i:s' value is still formatted", () => {
    mountWith("2026-10-25 12:00:00");
    const shown = new Date("2026-10-25 12:00:00").toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    expect(
      screen.getByRole("button", { name: `View scan from ${shown}` })
    ).toBeInTheDocument();
  });

  it("an unreadable value is shown as it came, never as 'Invalid Date'", () => {
    mountWith("garbage");
    expect(
      screen.getByRole("button", { name: "View scan from garbage" })
    ).toBeInTheDocument();
    expect(screen.queryByText("Invalid Date")).not.toBeInTheDocument();
  });
});

describe("ScanHistoryTable — View button name (FF-4)", () => {
  it("FF-4: names the scan by its time in the reader's time zone, not the server's raw string", () => {
    const scannedAt = "2026-10-25T10:00:00Z";
    render(
      React.createElement(ScanHistoryTable, {
        scanHistory: [
          {
            id: 7,
            scan_id: "11111111-2222-4333-8444-555555555555",
            scan_type: "malware_deep",
            scanned_at: scannedAt,
            security_grade: "C",
            findings_count: 1,
            critical_count: 0,
          },
        ],
        loadingRecordId: null,
        onRefresh: () => {},
        onViewRecord: () => {},
      })
    );
    const shown = new Date(scannedAt).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    expect(
      screen.getByRole("button", { name: `View scan from ${shown}` })
    ).toBeInTheDocument();
    // the visible cell shows the same text
    expect(screen.getByText(shown)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: `View scan from ${scannedAt}` })
    ).not.toBeInTheDocument();
  });
});
