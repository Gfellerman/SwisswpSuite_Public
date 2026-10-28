/**
 * Signed Backups page texts (U45, U46, U46b), Free build. Drives the real
 * BackupsPage; only its two data-heavy children and the backup list hook are
 * replaced at the module boundary (as in BackupsPage.heading.test.tsx).
 *
 * React-externalization workaround: the real react/react-dom are stamped onto
 * window before any aliased import runs. No JSX; React.createElement only.
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";

vi.mock("../components/organisms/Backups/BackupControl", () => ({
  BackupControl: () => null,
}));
vi.mock("../components/organisms/Backups/BackupList", () => ({
  BackupList: () => null,
}));
vi.mock("../hooks/useBackups", () => ({
  useBackups: () => ({ backups: [] }),
}));

type TL = typeof import("@testing-library/react");
let BackupsPage: import("react").ComponentType;
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
  ({ default: BackupsPage } = await import("./BackupsPage"));
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  React = await import("react");
});

afterEach(() => cleanup());

const flat = (el: Element | null) =>
  (el?.textContent ?? "").replace(/\s+/g, " ").trim();

describe("BackupsPage (Free) — signed texts U45, U46, U46b", () => {
  it("U45: the no-backup callout says there is no copy of the files, and promises no duration", () => {
    const { container } = render(React.createElement(BackupsPage));
    // positive control: the callout rendered
    expect(
      screen.getByText("This site has no stored backup.")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "If something goes wrong — a bad plugin update, an accidental deletion, a hack — you'll have no copy of your files to restore from. Create your first backup now."
      )
    ).toBeInTheDocument();
    expect(flat(container)).not.toContain("2–5 minutes");
    expect(flat(container)).not.toContain("nothing to restore from");
  });

  it("U46: the page subtitle says the restore brings back the files", () => {
    const { container } = render(React.createElement(BackupsPage));
    const header = container.querySelector("header")!;
    expect(flat(header.querySelector("p"))).toBe(
      "Back up your WordPress site and restore its files"
    );
  });

  it("U46b: the Backups sub-section button describes saving copies and restoring their files", () => {
    render(React.createElement(BackupsPage));
    const button = screen.getByRole("button", {
      name: "Backups: Save copies of your site and restore their files",
    });
    expect(
      screen.getByText("Save copies of your site and restore their files")
    ).toBeInTheDocument();
    expect(button.textContent).toContain("Backups");
  });
});
