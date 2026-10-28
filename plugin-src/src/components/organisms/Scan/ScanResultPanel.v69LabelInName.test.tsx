import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";

/**
 * Scan result panel: the accessible name of a row button contains its visible
 * label (WCAG 2.5.3 Label in Name; fix round FF-REACT-C, E10 and E11).
 *
 * A voice-control user says the words they see on the button. The buttons show
 * "Mark Safe" (threat rows) and "Ignore" (low-risk rows); their accessible
 * names start with exactly those words, then name the file.
 *
 * The real panel is rendered with spy handlers, the way SecurityHub mounts it.
 * No JSX.
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

const THREAT_FILE = "wp-content/uploads/a.php";
const LOW_FILE = "wp-content/plugins/low/x.php";

const RESULT = {
  files_scanned: 120,
  threats_found: 2,
  threats: [
    { file: THREAT_FILE, type: "backdoor", severity: "high" },
    { file: LOW_FILE, type: "changed", severity: "low" },
  ],
  mode: "deep",
  scanned_at: "2026-10-23T10:00:00Z",
};

function mountPanel() {
  const onMarkSafe = vi.fn(async () => {});
  const view = render(
    React.createElement(ScanResultPanel, {
      result: RESULT,
      isLoading: false,
      onMarkSafe,
      onBulkAction: vi.fn(async () => {}),
    })
  );
  return { ...view, onMarkSafe };
}

const norm = (s: string | null | undefined) =>
  (s ?? "").replace(/\s+/g, " ").trim().toLowerCase();

/** The button whose visible text is exactly `visible`, inside the list item of `file`. */
function rowButton(container: HTMLElement, file: string, visible: string) {
  const row = Array.from(container.querySelectorAll("li")).find(
    (li) => li.textContent?.includes(file) && li.querySelector("button")
  );
  expect(row, `a list item for ${file}`).toBeTruthy();
  const button = Array.from(row!.querySelectorAll("button")).find(
    (b) => norm(b.textContent) === norm(visible)
  );
  expect(button, `a "${visible}" button in the row of ${file}`).toBeTruthy();
  return button as HTMLButtonElement;
}

describe("ScanResultPanel — Label in Name (WCAG 2.5.3)", () => {
  it("E11: the Mark Safe button of a finding is named with its visible label first", () => {
    const { container } = mountPanel();
    const button = rowButton(container, THREAT_FILE, "Mark Safe");
    const name = button.getAttribute("aria-label");
    expect(name).toBe(
      `Mark Safe: ${THREAT_FILE}. Excludes it from future scans while its content stays the same`
    );
    expect(norm(name)).toContain(norm("Mark Safe"));
    expect(norm(name).startsWith(norm("Mark Safe"))).toBe(true);
    // the same name is what assistive technology exposes
    expect(screen.getByRole("button", { name: name! })).toBe(button);
  });

  it("E10: the Ignore button of a low-risk finding is named with its visible label first", () => {
    const { container } = mountPanel();
    fireEvent.click(screen.getByRole("button", { name: /1 low-risk finding/ }));
    const button = rowButton(container, LOW_FILE, "Ignore");
    const name = button.getAttribute("aria-label");
    expect(name).toBe(
      `Ignore ${LOW_FILE}: exclude it from future scans while its content stays the same`
    );
    expect(norm(name)).toContain(norm("Ignore"));
    expect(norm(name).startsWith(norm("Ignore"))).toBe(true);
    expect(screen.getByRole("button", { name: name! })).toBe(button);
  });

  it("the two row buttons keep the same description as before (title)", () => {
    const { container } = mountPanel();
    fireEvent.click(screen.getByRole("button", { name: /1 low-risk finding/ }));
    for (const [file, visible] of [
      [THREAT_FILE, "Mark Safe"],
      [LOW_FILE, "Ignore"],
    ]) {
      expect(rowButton(container, file, visible)).toHaveAttribute(
        "title",
        "Exclude this file from future malware scans while its content stays the same"
      );
    }
  });

  it("every row button that has both a visible label and an aria-label contains the label in its name", () => {
    const { container } = mountPanel();
    fireEvent.click(screen.getByRole("button", { name: /1 low-risk finding/ }));
    const checked: string[] = [];
    container.querySelectorAll("li button").forEach((b) => {
      const label = b.getAttribute("aria-label");
      const visible = norm(b.textContent);
      if (!label || !visible) return;
      checked.push(visible);
      expect(norm(label), `name of the "${visible}" button`).toContain(visible);
    });
    // positive control: the sweep did look at both row buttons
    expect(checked).toEqual(expect.arrayContaining(["mark safe", "ignore"]));
  });
});
