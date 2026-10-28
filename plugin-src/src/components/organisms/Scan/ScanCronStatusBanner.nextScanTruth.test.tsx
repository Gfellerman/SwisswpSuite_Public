/**
 * Sealed acceptance spec V63-V2-13 (lane V2 DETECT, finding A2 M-2).
 *
 * The Scan tab banner must not announce an upcoming scan while the daily scan
 * report is switched off: the daily cron event is always scheduled, but with the
 * report off it returns without scanning. Production caller: the banner as the
 * Scan tab renders it, fed with GET /security/scan/report-config.
 *
 * Install location for the run: plugin/src/components/organisms/Scan/.
 *
 * React is externalised to WordPress's global in this codebase; the real npm
 * React is stamped onto window before the component module is imported (same
 * workaround as ScanCard.noTierPill.test.tsx).
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, beforeAll } from "vitest";

type BannerModule = typeof import("./ScanCronStatusBanner");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");

let ScanCronStatusBanner: BannerModule["ScanCronStatusBanner"];
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
  ({ ScanCronStatusBanner } = await import("./ScanCronStatusBanner"));
  ({ render, cleanup } = await import("@testing-library/react"));
  React = await import("react");
});

afterEach(() => cleanup());

const inFiveHours = () => Math.floor(Date.now() / 1000) + 5 * 3600 + 120;

function renderBanner(enabled: boolean) {
  return render(
    React.createElement(ScanCronStatusBanner, {
      config: {
        scan_report_email: "",
        scan_report_enabled: enabled,
        last_scan: null,
        next_scheduled_ts: inFiveHours(),
      },
      onPreviewEmail: () => {},
    }),
  );
}

describe("V63-V2-13 ScanCronStatusBanner tells the truth about the next scan", () => {
  it("does not announce a scheduled scan while the daily report is off", () => {
    const { container } = renderBanner(false);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/Next scan:\s*in \d+ (hour|min)/i);
    expect(text).toMatch(/Next scan:\s*Off/);
  });

  it("still shows the countdown while the daily report is on (regression lock)", () => {
    const { container } = renderBanner(true);
    expect(container.textContent ?? "").toMatch(/Next scan:\s*in 5 hours/);
  });
});
