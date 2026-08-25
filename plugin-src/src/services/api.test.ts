/**
 * Vitest coverage for wpApi()'s U10 hardening (gate report 2026-08-20,
 * UI_TRUTH_AUDIT_2026-08-20.md finding R3): wpApi() now throws an ApiError
 * when a 2xx response body carries `success: false`, mirroring the non-2xx
 * path it already had — UNLESS the caller explicitly opts a specific call
 * out via `allowSuccessFalse: true` (WpApiOptions).
 *
 * No React-externalization workaround needed here (see ErrorBoundary.test.tsx
 * / queryClient.test.ts for why other files in this repo need one) — this
 * module has zero dependency on "react" or "@tanstack/react-query" in its
 * own import graph, verified by reading services/api.ts in full before
 * writing this file: it imports nothing beyond the ambient `window` global.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { wpApi, ApiError } from "./api";
// SwissWPSuiteData is a global ambient interface (plugin/src/vite-env.d.ts),
// not a module export — used below via `window.swisswpsuiteData` directly,
// no import needed/possible.

function mockFetchOnce(
  body: unknown,
  status: number,
  ok = status >= 200 && status < 300
) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

describe("wpApi() — U10 200+success:false hardening", () => {
  beforeEach(() => {
    window.swisswpsuiteData = {
      apiUrl: "https://example.test/wp-json/swisswpsuite/v1",
      nonce: "test-nonce",
    } as unknown as SwissWPSuiteData;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as { swisswpsuiteData?: unknown }).swisswpsuiteData;
  });

  it("throws an ApiError when a 2xx response body has success:false, by default", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchOnce({ success: false, message: "Something did not work." }, 200)
    );

    await expect(wpApi("/some/endpoint")).rejects.toMatchObject({
      name: "ApiError",
      message: "Something did not work.",
      status: 200,
    });
  });

  it("throws with the fallback message when a 2xx success:false body carries no message", async () => {
    vi.stubGlobal("fetch", mockFetchOnce({ success: false }, 200));

    await expect(wpApi("/some/endpoint")).rejects.toMatchObject({
      name: "ApiError",
      message: "Request failed.",
      status: 200,
    });
  });

  it("resolves normally (does not throw) for a 2xx success:false body when allowSuccessFalse is set", async () => {
    const body = {
      success: false,
      manual_fix: { what: "x", why: "y", how: ["z"] },
    };
    vi.stubGlobal("fetch", mockFetchOnce(body, 200));

    // Endpoint string kept realistic (matches the WpApiOptions.allowSuccessFalse
    // doc comment's "gold pattern" opt-out example, api.ts:70-75): this was
    // "/security/findings/fix" until ARS Round E (F-08) deleted that route and
    // its sole frontend caller as dead code — SecurityHub.tsx's remaining
    // allowSuccessFalse callers (handleFix / handleLogActionFix) both use
    // /security/sentinel/remediate, so that is what's exercised here now.
    await expect(
      wpApi("/security/sentinel/remediate", { allowSuccessFalse: true })
    ).resolves.toEqual(body);
  });

  it("resolves normally for a 2xx success:true body regardless of allowSuccessFalse", async () => {
    const body = { success: true, message: "ok" };
    vi.stubGlobal("fetch", mockFetchOnce(body, 200));

    await expect(wpApi("/some/endpoint")).resolves.toEqual(body);
  });

  it("still throws on a non-2xx response, unchanged from before U10", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchOnce({ success: false, message: "Invalid license key." }, 400)
    );

    await expect(wpApi("/activate-license")).rejects.toMatchObject({
      name: "ApiError",
      message: "Invalid license key.",
      status: 400,
    });
  });

  it("non-2xx throw is unaffected by allowSuccessFalse — that option only governs the 2xx path", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchOnce({ success: false, message: "Server error." }, 500)
    );

    await expect(
      wpApi("/some/endpoint", { allowSuccessFalse: true })
    ).rejects.toMatchObject({
      name: "ApiError",
      status: 500,
    });
  });

  it("does not throw for a 2xx body with no success field at all (e.g. a plain data payload)", async () => {
    const body = { history: [] };
    vi.stubGlobal("fetch", mockFetchOnce(body, 200));

    await expect(wpApi("/some/read-endpoint")).resolves.toEqual(body);
  });

  it("ApiError thrown on 200+success:false carries the full parsed body as .data", async () => {
    const body = { success: false, message: "nope", upgrade_required: true };
    vi.stubGlobal("fetch", mockFetchOnce(body, 200));

    try {
      await wpApi("/activate-license");
      expect.unreachable("wpApi() should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).data).toEqual(body);
    }
  });
});
