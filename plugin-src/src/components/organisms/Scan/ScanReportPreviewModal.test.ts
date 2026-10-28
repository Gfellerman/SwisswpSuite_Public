/**
 * ScanReportPreviewModal renders the scan-report DATA returned by
 * GET /security/scan/report-preview with the app's own components:
 * no iframe, no srcDoc, no inline style attributes, no injected HTML.
 *
 * Acceptance ids: PV-V1 .. PV-V4 (PLAN_CF1_PREVIEW_C_VALIDATED.md §5).
 *
 * React is externalized to WordPress's window.React in this codebase, so
 * window.React / window.ReactDOM are pre-stamped from the real packages in
 * beforeAll and every React-dependent import is deferred (same pattern as
 * BasicScanResults.test.tsx). No JSX in this file.
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, beforeAll } from "vitest";

type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ScanReportPreviewModal: any;
let render: TestingLibraryModule["render"];
let screen: TestingLibraryModule["screen"];
let cleanup: TestingLibraryModule["cleanup"];
let React: ReactModule;

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  const RealReact = nodeRequire("react");
  const RealReactDOM = nodeRequire("react-dom");
  const RealReactDOMClient = nodeRequire("react-dom/client");
  window.React = RealReact;
  window.ReactDOM = { ...RealReactDOM, ...RealReactDOMClient };

  ({ ScanReportPreviewModal } = await import("./ScanReportPreviewModal"));
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  React = await import("react");
});

const withScan = {
  success: true,
  has_scan: true,
  grade: "F",
  summary: "Found 6 issues: 1 critical, 1 high, 2 medium, 2 low.",
  findings: [
    { severity: "critical", title: "Critical one", description: "" },
    { severity: "high", title: "High one", description: "High detail" },
    { severity: "medium", title: "Medium one", description: "" },
    { severity: "medium", title: "Medium two", description: "" },
    { severity: "low", title: "Low one", description: "" },
  ],
  total_findings: 6,
  next_scheduled_ts: null,
  sections: [{ heading: "Extra Heading" }],
};

function renderModal(preview: unknown) {
  return render(
    React.createElement(ScanReportPreviewModal, {
      isOpen: true,
      onClose: () => {},
      preview,
    })
  );
}

function assertNoEmbeddedDocument(container: HTMLElement) {
  expect(document.querySelector("iframe")).toBeNull();
  expect(document.querySelector("[srcdoc]")).toBeNull();
  const dialog = screen.getByRole("dialog");
  expect(dialog.querySelectorAll("[style]").length).toBe(0);
  expect(container.innerHTML).not.toMatch(/<table[^>]*style=/i);
}

describe("ScanReportPreviewModal (data render)", () => {
  afterEach(() => {
    cleanup();
  });

  it("PV-V1: renders grade, summary and findings from data, with no iframe/srcDoc/inline style", () => {
    const { container } = renderModal(withScan);
    assertNoEmbeddedDocument(container);
    expect(
      screen.getByRole("img", { name: /Security grade F/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Found 6 issues/)).toBeInTheDocument();
    expect(screen.getByText("Critical one")).toBeInTheDocument();
    expect(screen.getByText("High detail")).toBeInTheDocument();
    expect(screen.getByText("Low one")).toBeInTheDocument();
    expect(screen.getByText(/Showing top 5 of 6 findings/i)).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText(/Next scheduled scan:/i).closest("p")?.textContent).toMatch(
      /Not scheduled/i
    );
  });

  it("PV-V2: no stored scan shows a plain empty state, no iframe", () => {
    const { container } = renderModal({
      success: true,
      has_scan: false,
      grade: "",
      summary: "",
      findings: [],
      total_findings: 0,
      next_scheduled_ts: null,
      sections: [],
    });
    assertNoEmbeddedDocument(container);
    expect(screen.getByText(/No scan results yet/i)).toBeInTheDocument();
  });

  it("PV-V3: extra report sections are listed by heading", () => {
    renderModal(withScan);
    expect(screen.getByText("Extra Heading")).toBeInTheDocument();
  });

  it("PV-V4: an empty description renders the e-mail's dash placeholder", () => {
    renderModal(withScan);
    const row = screen.getByText("Critical one").closest("tr");
    expect(row).not.toBeNull();
    expect(row!.textContent).toContain("—");
  });
});
