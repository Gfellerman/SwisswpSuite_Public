/**
 * Vitest coverage for FileIntegrityBadge (S-H1 fix, post-submission QA
 * round 1, v2.9.33.59, Lane 6, Task 6.3).
 *
 * Acceptance scenario F3 (FIX_PLAN_ROUND1_V59_VALIDATED.md, LANE 6):
 * "Render the File Integrity card with (a) a clean result, (b) a result
 * with issues, (c) no result; assert three distinct badges. Assert the
 * string 'Secure' never appears in case (b)."
 *
 * Before this fix, SecurityHub.tsx hardcoded a literal
 *   <Badge ...>Secure</Badge>
 * unconditionally in the File Integrity card (S-H1, FINDINGS_REGISTER.md) —
 * there was no state machine at all, so a module import of
 * `./FileIntegrityBadge` fails on baseline (the file does not exist before
 * this lane's fix) — see LANE_L6_REPORT.md for the verbatim RED transcript
 * from the clean-HEAD worktree.
 *
 * React-externalization workaround (read before editing): same pattern as
 * Badge.test.tsx / HardeningOptionsGrid.test.tsx — this codebase
 * externalizes React (WP.org Guideline 13); jsdom never loads
 * window.React, so the real npm react/react-dom is stamped onto those
 * globals in beforeAll BEFORE any aliased import runs. No JSX in this
 * file, React.createElement only.
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, beforeAll } from "vitest";

type FileIntegrityBadgeModule = typeof import("./FileIntegrityBadge");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");

let FileIntegrityBadge: FileIntegrityBadgeModule["FileIntegrityBadge"];
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

  ({ FileIntegrityBadge } = await import("./FileIntegrityBadge"));
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  React = await import("react");
});

describe("FileIntegrityBadge — S-H1 (no more unconditional 'Secure' literal)", () => {
  afterEach(() => {
    cleanup();
  });

  it("(a) clean result -> shows the Secure badge", () => {
    render(React.createElement(FileIntegrityBadge, { status: "clean" }));
    expect(screen.getByText("Secure")).toBeInTheDocument();
  });

  it("(b) result with issues -> shows an Issues badge and NEVER the string 'Secure'", () => {
    render(React.createElement(FileIntegrityBadge, { status: "issues" }));
    expect(screen.getByText("Issues Found")).toBeInTheDocument();
    expect(screen.queryByText("Secure")).not.toBeInTheDocument();
  });

  it("(c) no result -> shows a neutral 'not yet verified' badge, not Secure and not Issues", () => {
    render(React.createElement(FileIntegrityBadge, { status: "not_run" }));
    expect(screen.getByText("Not Yet Verified")).toBeInTheDocument();
    expect(screen.queryByText("Secure")).not.toBeInTheDocument();
    expect(screen.queryByText("Issues Found")).not.toBeInTheDocument();
  });

  it("all three states render visually distinct badges (different text content)", () => {
    const labels = (["clean", "issues", "not_run"] as const).map((status) => {
      const { unmount, container } = render(
        React.createElement(FileIntegrityBadge, { status })
      );
      const text = container.textContent;
      unmount();
      return text;
    });
    expect(new Set(labels).size).toBe(3);
  });
});
