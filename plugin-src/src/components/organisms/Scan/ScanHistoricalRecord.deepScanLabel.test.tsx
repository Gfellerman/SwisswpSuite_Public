/**
 * A finished manual Deep Scan is stored in Scan History as `malware_deep`. Both
 * places that name a history row's scan type (the record viewer header and the
 * history table badge) show it under the Deep Scan name, not as an archived or
 * quick scan.
 *
 * Free build: the label is "Deep Scan". The component and the badge helper are
 * imported the way the app imports them. The Pro build's copies are covered by
 * pro-overlay/src/components/organisms/Scan/ScanHistoricalRecord.deepMalwareLabel.test.tsx.
 *
 * React is externalised to WordPress's global in this codebase; the real npm
 * React is stamped onto window before the component is imported.
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, beforeAll } from "vitest";

type RecordModule = typeof import("./ScanHistoricalRecord");
type BadgeModule = typeof import("../Security/scanHistoryBadge");
type CopyModule = typeof import("./scanCopy");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");

let ScanHistoricalRecord: RecordModule["default"];
let getScanHistoryBadge: BadgeModule["getScanHistoryBadge"];
let HISTORY_LABEL_DEEP_MALWARE: CopyModule["HISTORY_LABEL_DEEP_MALWARE"];
let render: TestingLibraryModule["render"];
let cleanup: TestingLibraryModule["cleanup"];
let React: ReactModule;

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  window.React = nodeRequire("react");
  window.ReactDOM = {
    ...nodeRequire("react-dom"),
    ...nodeRequire("react-dom/client"),
  };
  ({ default: ScanHistoricalRecord } = await import("./ScanHistoricalRecord"));
  ({ getScanHistoryBadge } = await import("../Security/scanHistoryBadge"));
  ({ HISTORY_LABEL_DEEP_MALWARE } = await import("./scanCopy"));
  ({ render, cleanup } = await import("@testing-library/react"));
  React = await import("react");
});

afterEach(() => cleanup());

function detail(scanType: string) {
  return {
    record: {
      id: 7,
      scan_id: "11111111-2222-4333-8444-555555555555",
      scan_type: scanType,
      scanned_at: "2026-10-05 10:00:00",
      security_grade: "C" as const,
      findings_count: 1,
      critical_count: 1,
    },
    layer1_findings: [],
  };
}

function headerText(scanType: string): string {
  const { container } = render(
    React.createElement(ScanHistoricalRecord, {
      historicalScanDetail: detail(scanType),
      onClose: () => {},
    })
  );
  return container.textContent ?? "";
}

describe("Deep Scan rows in Scan History", () => {
  it("names the label for this build", () => {
    expect(HISTORY_LABEL_DEEP_MALWARE).toBe("Deep Scan");
  });

  it("the record viewer header shows the Deep Scan label for malware_deep", () => {
    const text = headerText("malware_deep");
    expect(text).toContain(`${HISTORY_LABEL_DEEP_MALWARE} ·`);
    expect(text).not.toMatch(/Archived scan|Quick Scan/);
  });

  it("the history badge shows the Deep Scan label for malware_deep", () => {
    expect(getScanHistoryBadge("malware_deep").label).toBe("Deep Scan");
  });

  it("still labels the daily audit as Security Audit (regression lock)", () => {
    expect(headerText("security_audit")).toContain("Security Audit ·");
    expect(getScanHistoryBadge("security_audit").label).toBe("Security Audit");
  });
});
