import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";

/**
 * Scan tab panels (final .69 pass): the stored-record header count (FE-4,
 * AC-19, T50), the report preview schedule line (FE-1, T5) and the report
 * switch description (FE-2, T48). The real components are rendered. No JSX.
 */
type TL = typeof import("@testing-library/react");
let ScanHistoricalRecord: any;
let ScanReportPreviewModal: any;
let ScanReportSettingsPanel: any;
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
  ({ default: ScanHistoricalRecord } = await import("./ScanHistoricalRecord"));
  ({ ScanReportPreviewModal } = await import("./ScanReportPreviewModal"));
  ({ default: ScanReportSettingsPanel } =
    await import("./ScanReportSettingsPanel"));
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  React = await import("react");
});

afterEach(() => cleanup());

const flat = (el: Element | null) =>
  (el?.textContent ?? "").replace(/\s+/g, " ").trim();

describe("ScanHistoricalRecord — AC-19 (FE-4, T50)", () => {
  const record = {
    id: 7,
    scan_id: "11111111-2222-4333-8444-555555555555",
    scan_type: "malware_deep",
    scanned_at: "2026-10-05 10:00:00",
    security_grade: "C" as const,
    findings_count: 3,
    critical_count: 0,
  };

  it("counts the findings it lists, and says why the list can be empty", () => {
    const { container } = render(
      React.createElement(ScanHistoricalRecord, {
        historicalScanDetail: { record, layer1_findings: [] },
        onClose: () => {},
      })
    );
    expect(flat(container)).toContain("0 findings");
    expect(flat(container)).not.toContain("3 findings");
    expect(flat(container)).toContain(
      "No open findings for this scan. Findings marked safe or fixed are hidden."
    );
    expect(flat(container)).not.toContain(
      "No findings recorded for this scan."
    );
  });
});

describe("ScanReportPreviewModal — AC-12 React part (FE-1, T5)", () => {
  const preview = (over: Record<string, unknown>) => ({
    success: true,
    has_scan: true,
    grade: "B",
    summary: "Found 1 issue.",
    findings: [],
    total_findings: 0,
    next_scheduled_ts: 1_800_000_000,
    sections: [],
    ...over,
  });
  const mount = (p: unknown) =>
    render(
      React.createElement(ScanReportPreviewModal, {
        isOpen: true,
        onClose: () => {},
        preview: p,
        isLoading: false,
      })
    );

  it("T5: reports switched off read 'Off', not a date", () => {
    const { container } = mount(preview({ scan_report_enabled: false }));
    expect(flat(container)).toContain("Next scheduled scan: " + "Off");
    expect(flat(container)).not.toContain(
      new Date(1_800_000_000 * 1000).toLocaleString()
    );
  });

  it("control: reports on keep the date; an older server without the field keeps the date", () => {
    const date = new Date(1_800_000_000 * 1000).toLocaleString();
    const first = mount(preview({ scan_report_enabled: true }));
    expect(flat(first.container)).toContain("Next scheduled scan: " + date);
    first.unmount();
    const second = mount(preview({}));
    expect(flat(second.container)).toContain("Next scheduled scan: " + date);
  });
});

describe("ScanReportSettingsPanel — report description (FE-2, T48)", () => {
  it("T48: describes the grade and the most important findings, nothing more", () => {
    const { container } = render(
      React.createElement(ScanReportSettingsPanel, {
        config: {
          scan_report_email: "a@example.com",
          scan_report_enabled: true,
          last_scan: null,
          next_scheduled_ts: null,
        },
        onSave: vi.fn(),
        isSaving: false,
      })
    );
    expect(flat(container)).toContain(
      "Send an email after each scheduled scan summarising the grade and the most important findings."
    );
    expect(flat(container)).not.toContain("recommended actions");
  });
});
