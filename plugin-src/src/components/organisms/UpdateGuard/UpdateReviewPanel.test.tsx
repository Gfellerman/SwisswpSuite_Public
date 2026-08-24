/**
 * Vitest coverage for UpdateReviewPanel (U1, v2.9.33.29 — GENUINE-ALLOW wording +
 * response.success check, audit finding #24).
 *
 * Before this fix: handleApprove()/handleReject() announced success purely from the
 * fetch resolving (any 2xx), never reading the parsed response body's `success` field
 * (docs/reports/UI_TRUTH_AUDIT_2026-08-20.md finding #24). This suite proves both halves
 * of the fix: (1) the announced wording now states the GENUINE-ALLOW semantics ("this
 * exact version will be allowed on the next update") instead of the old ambiguous
 * "approved. Removed from review queue."; (2) a 2xx response whose BODY carries
 * `success:false` now surfaces a row error and does NOT announce success or call
 * onQueueChange — the exact gap audit finding #24 named.
 *
 * React-externalization workaround (read before editing): identical pattern to
 * UpdateGuardCard.test.tsx / SyncManager.test.tsx in this same directory/repo — this
 * codebase externalizes React (WP.org Guideline 13), so "react"/"react-dom" are
 * Vite-aliased to shims reading a pre-existing `window.React`/`window.ReactDOM` global.
 * Real npm react/react-dom are pulled in via Node's `createRequire` and stamped onto
 * those globals in `beforeAll`, BEFORE any aliased import runs.
 *
 * fetch mocking: follows SyncManager.test.tsx's established `vi.stubGlobal('fetch', ...)`
 * pattern (this component calls `wpApi()`, which wraps the global `fetch` — there is no
 * dependency-injected `onApprove` prop to stub directly, unlike LicenseManager.tsx).
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";

type UpdateReviewPanelModule = typeof import("./UpdateReviewPanel");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");

let UpdateReviewPanel: UpdateReviewPanelModule["default"];
let render: TestingLibraryModule["render"];
let screen: TestingLibraryModule["screen"];
let cleanup: TestingLibraryModule["cleanup"];
let waitFor: TestingLibraryModule["waitFor"];
let fireEvent: TestingLibraryModule["fireEvent"];
let React: ReactModule;

const REVIEW = {
  slug: "totally-fake-test-plugin/totally-fake-test-plugin.php",
  version: "1.0.0",
  held_at: "2026-08-20T00:00:00+00:00",
  findings_count: 3,
};

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  const RealReact = nodeRequire("react");
  const RealReactDOM = nodeRequire("react-dom");
  const RealReactDOMClient = nodeRequire("react-dom/client");
  window.React = RealReact;
  window.ReactDOM = { ...RealReactDOM, ...RealReactDOMClient };

  window.swisswpsuiteData = {
    apiUrl: "/wp-json/swisswpsuite/v1",
    nonce: "test-nonce",
  } as unknown as SwissWPSuiteData;

  ({ default: UpdateReviewPanel } = await import("./UpdateReviewPanel"));
  ({ render, screen, cleanup, waitFor, fireEvent } =
    await import("@testing-library/react"));
  React = await import("react");
});

function clickButton(name: RegExp) {
  const button = screen.getByRole("button", { name });
  fireEvent.click(button);
}

describe("UpdateReviewPanel — Approve/Reject truthfulness (U1)", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("announces the GENUINE-ALLOW wording and calls onQueueChange when the backend genuinely succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, slug: REVIEW.slug }),
      })
    );
    const onQueueChange = vi.fn();

    render(
      React.createElement(UpdateReviewPanel, {
        reviews: [REVIEW],
        onQueueChange,
      })
    );

    clickButton(/^Approve update for/i);

    await waitFor(() => {
      expect(onQueueChange).toHaveBeenCalledTimes(1);
    });

    // Wording reflects genuine-allow semantics (not the old ambiguous
    // "approved. Removed from review queue.").
    expect(
      await screen.findByText(
        new RegExp(
          `${REVIEW.slug.replace(/[/.]/g, "\\$&")} approved — this exact version will be allowed on the next update\\.`
        )
      )
    ).toBeInTheDocument();

    const fetchMock = window.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/update-guard/reviews/approve"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("does NOT announce success and surfaces a row error when the response body carries success:false at HTTP 200 (audit #24)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: false, error: "queue_entry_vanished" }),
      })
    );
    const onQueueChange = vi.fn();

    render(
      React.createElement(UpdateReviewPanel, {
        reviews: [REVIEW],
        onQueueChange,
      })
    );

    clickButton(/^Approve update for/i);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "queue_entry_vanished"
      );
    });

    // The pre-fix bug: a 2xx alone used to be treated as success regardless of body.
    expect(onQueueChange).not.toHaveBeenCalled();
    expect(
      screen.queryByText(/approved — this exact version will be allowed/i)
    ).not.toBeInTheDocument();
  });

  it("Reject still announces removal and calls onQueueChange on a genuine success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, slug: REVIEW.slug }),
      })
    );
    const onQueueChange = vi.fn();

    render(
      React.createElement(UpdateReviewPanel, {
        reviews: [REVIEW],
        onQueueChange,
      })
    );

    clickButton(/^Reject update for/i);

    await waitFor(() => {
      expect(onQueueChange).toHaveBeenCalledTimes(1);
    });

    expect(
      await screen.findByText(
        new RegExp(
          `${REVIEW.slug.replace(/[/.]/g, "\\$&")} rejected\\. Removed from review queue\\.`
        )
      )
    ).toBeInTheDocument();
  });

  it("Reject does NOT call onQueueChange when the response body carries success:false", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: false, error: "missing_slug" }),
      })
    );
    const onQueueChange = vi.fn();

    render(
      React.createElement(UpdateReviewPanel, {
        reviews: [REVIEW],
        onQueueChange,
      })
    );

    clickButton(/^Reject update for/i);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("missing_slug");
    });
    expect(onQueueChange).not.toHaveBeenCalled();
  });
});
