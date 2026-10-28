import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";

/**
 * Scan result panel (final .69 pass, FA-1, FE-3, FE-5):
 *  - FA-1  no Delete button in either selection bar (the server quarantines
 *          what the button called "delete"); Quarantine stays.
 *  - FE-3  the loading line does not promise "up to a minute".
 *  - FE-5  the Mark Safe controls say the exclusion holds while the content
 *          stays the same.
 * The real panel is rendered; the parent's handlers are spies. No JSX.
 */
type TL = typeof import("@testing-library/react");
let ScanResultPanel: any;
let render: TL["render"];
let screen: TL["screen"];
let cleanup: TL["cleanup"];
let fireEvent: TL["fireEvent"];
let React: typeof import("react");

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  window.React = nodeRequire("react");
  window.ReactDOM = {
    ...nodeRequire("react-dom"),
    ...nodeRequire("react-dom/client"),
  };
  ({ ScanResultPanel } = await import("./ScanResultPanel"));
  ({ render, screen, cleanup, fireEvent } =
    await import("@testing-library/react"));
  React = await import("react");
});

afterEach(() => cleanup());

const RESULT = {
  files_scanned: 120,
  threats_found: 2,
  threats: [
    { file: "wp-content/uploads/a.php", type: "backdoor", severity: "high" },
    {
      file: "wp-content/uploads/b.php",
      type: "backdoor",
      severity: "critical",
    },
    { file: "wp-content/plugins/low/x.php", type: "changed", severity: "low" },
  ],
  mode: "deep",
  scanned_at: "2026-10-23T10:00:00Z",
};

function mountPanel(onBulkAction = vi.fn(async () => {})) {
  const onMarkSafe = vi.fn(async () => {});
  render(
    React.createElement(ScanResultPanel, {
      result: RESULT,
      isLoading: false,
      onMarkSafe,
      onBulkAction,
    })
  );
  return { onBulkAction, onMarkSafe };
}

const MARK_SAFE_NAME = (file: string) =>
  `Mark Safe: ${file}. Excludes it from future scans while its content stays the same`;
const IGNORE_NAME = (file: string) =>
  `Ignore ${file}: exclude it from future scans while its content stays the same`;
const MARK_SAFE_TITLE =
  "Exclude this file from future malware scans while its content stays the same";

describe("ScanResultPanel — final .69 truth fixes", () => {
  it("FA-1: the selection bar offers Quarantine and no Delete button", () => {
    const { onBulkAction } = mountPanel();
    // positive control: the bar appears once a finding is selected
    fireEvent.click(
      screen.getByLabelText("Select threat: wp-content/uploads/a.php")
    );
    expect(
      screen.getByRole("button", { name: "Mark 1 Safe" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Delete\b/ })
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Quarantine 1" }));
    expect(onBulkAction).toHaveBeenCalledWith("quarantine", [
      "wp-content/uploads/a.php",
    ]);
  });

  it("FA-1: the low-risk selection bar offers Quarantine and no Delete button", () => {
    const { onBulkAction } = mountPanel();
    fireEvent.click(screen.getByRole("button", { name: /1 low-risk finding/ }));
    fireEvent.click(screen.getByLabelText("Select all low-risk findings"));
    expect(
      screen.getByRole("button", { name: "Mark 1 Safe" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Delete\b/ })
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Quarantine 1" }));
    expect(onBulkAction).toHaveBeenCalledWith("quarantine", [
      "wp-content/plugins/low/x.php",
    ]);
  });

  it("FE-3: the loading line says the scan can take several minutes", () => {
    render(
      React.createElement(ScanResultPanel, { result: null, isLoading: true })
    );
    expect(
      screen.getByText("This can take several minutes. Please wait…")
    ).toBeInTheDocument();
    expect(screen.queryByText(/up to a minute/)).not.toBeInTheDocument();
  });

  it("FE-5: the Mark Safe button of a finding names the content condition (aria-label and title)", () => {
    mountPanel();
    const button = screen.getByRole("button", {
      name: MARK_SAFE_NAME("wp-content/uploads/a.php"),
    });
    expect(button).toHaveAttribute("title", MARK_SAFE_TITLE);
  });

  it("FE-5: the Ignore button of a low-risk finding names the content condition (aria-label and title)", () => {
    mountPanel();
    fireEvent.click(screen.getByRole("button", { name: /1 low-risk finding/ }));
    const button = screen.getByRole("button", {
      name: IGNORE_NAME("wp-content/plugins/low/x.php"),
    });
    expect(button).toHaveAttribute("title", MARK_SAFE_TITLE);
  });
});
