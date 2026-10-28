/**
 * The Backups page heading reads "Backups": the same word as the sidebar entry
 * and as the instruction in the backup e-mails and notices ("SwissSuite →
 * Backups"). Drives the real BackupsPage component; only its two data-heavy
 * children and the backup list hook are replaced at the module boundary.
 *
 * React-externalization workaround (same as GeneralSettings.test.tsx): the
 * aliased React import reads window.React, so the real npm React is stamped
 * onto the globals in beforeAll, before any aliased import runs. No JSX;
 * React.createElement only.
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

type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");

let BackupsPage: import("react").ComponentType;
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

  ({ default: BackupsPage } = await import("./BackupsPage"));
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  React = await import("react");
});

describe("BackupsPage — heading", () => {
  afterEach(() => {
    cleanup();
  });

  it("positive control: the page really rendered (first-time callout is shown for an empty backup list)", () => {
    render(React.createElement(BackupsPage));
    expect(
      screen.getByText("This site has no stored backup.")
    ).toBeInTheDocument();
  });

  it("the page title is 'Backups'", () => {
    const { container } = render(React.createElement(BackupsPage));
    const headings = container.querySelectorAll("h1");
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe("Backups");
  });
});
