/**
 * Acceptance specs V63-V2-14 .. V63-V2-17 (lane V2 DETECT, findings M-3, M-4, M-10).
 *
 * Production caller: SecurityHub itself, mounted the way the admin page mounts
 * it, with only the network boundary (wpApi) and the toast module replaced.
 *
 *  - V63-V2-14  the Dashboard's scan summary button opens the latest scan's
 *               record, so the findings it counts are on screen.
 *  - V63-V2-15  the File Integrity card shows the outcome of the latest core
 *               file check and whether the daily check is on.
 *  - V63-V2-16  the abandoned-plugins panel does not show "No closed or
 *               unlisted plugins found." while a check is still running.
 *  - V63-V2-17  a check that takes longer than a minute is still picked up.
 *  - V63-V2-19  a panel that has never been checked says so instead of "No
 *               closed or unlisted plugins found.".
 *  - V63-V2-20  a check still running when the 10-minute poll ends says so
 *               instead of "No closed or unlisted plugins found.".
 *  - V63-V2-21  a finished check with nothing found keeps the all-clear.
 *  - V63-V2-22  the screen-reader status announces a running check only while
 *               the detection is on.
 *
 * React is externalised to WordPress's global in this codebase; the real npm
 * React is stamped onto window before SecurityHub is imported (same workaround
 * as SecurityHub.abandonedPluginsAsyncRefresh.test.tsx).
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import {
  describe,
  it,
  expect,
  afterEach,
  beforeAll,
  beforeEach,
  vi,
} from "vitest";

vi.mock("../lib/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("./organisms/Security/TwoFactorNudgeLink", () => ({
  TwoFactorNudgeLink: () => null,
}));

vi.mock("../services/api", () => ({
  wpApi: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = "ApiError";
      this.status = status;
    }
  },
}));

type SecurityHubModule = typeof import("./SecurityHub");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");
type ReactQueryModule = typeof import("@tanstack/react-query");
type ApiModule = typeof import("../services/api");
type ToastModule = typeof import("../lib/toast");

let SecurityHub: SecurityHubModule["default"];
let render: TestingLibraryModule["render"];
let screen: TestingLibraryModule["screen"];
let cleanup: TestingLibraryModule["cleanup"];
let fireEvent: TestingLibraryModule["fireEvent"];
let waitFor: TestingLibraryModule["waitFor"];
let within: TestingLibraryModule["within"];
let React: ReactModule;
let QueryClient: ReactQueryModule["QueryClient"];
let QueryClientProvider: ReactQueryModule["QueryClientProvider"];
let wpApi: ApiModule["wpApi"];
let ApiError: ApiModule["ApiError"];
let toast: ToastModule["toast"];

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  window.React = nodeRequire("react");
  window.ReactDOM = {
    ...nodeRequire("react-dom"),
    ...nodeRequire("react-dom/client"),
  };

  ({ default: SecurityHub } = await import("./SecurityHub"));
  ({ render, screen, cleanup, fireEvent, waitFor, within } =
    await import("@testing-library/react"));
  ({ QueryClient, QueryClientProvider } =
    await import("@tanstack/react-query"));
  ({ wpApi, ApiError } = await import("../services/api"));
  ({ toast } = await import("../lib/toast"));
  React = await import("react");
});

type Overrides = Record<string, (callIndex: number) => unknown>;

/** Inert defaults for every endpoint SecurityHub reads on mount; `overrides` replace single routes. */
function mockApi(overrides: Overrides = {}) {
  const calls: Record<string, number> = {};
  (wpApi as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (url: string) => {
      const index = calls[url] ?? 0;
      calls[url] = index + 1;
      if (overrides[url]) return Promise.resolve(overrides[url](index));
      if (url === "/hardening/status")
        return Promise.resolve({ success: true, options: {} });
      if (url === "/security/status")
        return Promise.resolve({
          firewall_enabled: false,
          spam_enabled: false,
          block_sqli: false,
          block_xss: false,
          simulation_mode: false,
          login_enabled: false,
          last_scan: "Never",
        });
      if (url === "/security/logs") return Promise.resolve([]);
      if (url === "/security/banned-ips") return Promise.resolve({ ips: [] });
      if (url === "/security/sentinel/latest-scan")
        return Promise.resolve({ success: false, record: null });
      if (url === "/security/environment")
        return Promise.resolve({
          success: true,
          environment: { cloudflare: { detected: false } },
        });
      return Promise.resolve({ success: true });
    }
  );
  return calls;
}

function renderSecurityHub() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(SecurityHub)
    )
  );
}

/**
 * Runs the abandoned-plugins poller on a compressed clock: its fixed poll
 * delays (3 s before, 5 s now) fire at once, and the sum of the delays it asked
 * for is the "elapsed" time the mocked server answers by.
 */
function compressPollClock() {
  const realSetTimeout = globalThis.setTimeout;
  const clock = { elapsedMs: 0 };
  vi.spyOn(globalThis, "setTimeout").mockImplementation(((
    handler: TimerHandler,
    ms?: number,
    ...args: unknown[]
  ) => {
    if (ms === 3000 || ms === 5000) {
      clock.elapsedMs += ms;
      return realSetTimeout(handler as () => void, 0, ...args);
    }
    return realSetTimeout(handler as () => void, ms, ...args);
  }) as unknown as typeof setTimeout);
  return clock;
}

const SCAN_RECORD = {
  id: 7,
  scan_id: "11111111-2222-4333-8444-555555555555",
  scan_type: "malware_deep",
  scanned_at: "2026-10-05 10:00:00",
  security_grade: "C",
  findings_count: 1,
  critical_count: 1,
};
const SCAN_FINDING = {
  id: "l1-m1-abc123",
  severity: "critical",
  title: "Web shell signature",
  details: "Signature match in wp-content/uploads/x.php.",
  remediation: "Review the file for malicious code.",
  evidence: "wp-content/uploads/x.php",
  fix_type: "manual_review",
  integrity_category: "malware_signature",
};

const ABANDONED_PLUGIN = {
  slug: "gone-plugin/gone-plugin.php",
  name: "Gone Plugin",
  checked_at: 1_800_000_000,
  reason: "closed",
  closed_date: "2020-01-01",
};

describe("SecurityHub V2 DETECT acceptance (V63-V2-14 .. 17)", () => {
  beforeEach(() => {
    (window as any).swisswpsuiteData = {};
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("V63-V2-14: the scan summary button opens the latest scan's findings", async () => {
    mockApi({
      "/security/sentinel/latest-scan": () => ({
        success: true,
        record: SCAN_RECORD,
        layer1_findings: [SCAN_FINDING],
      }),
    });
    renderSecurityHub();

    const card = await screen.findByRole("status", {
      name: /latest scan result summary/i,
    });
    fireEvent.click(within(card).getByRole("button"));

    // The Scan tab's record viewer shows the finding the card counted.
    const list = await screen.findByRole("list", { name: "Scan findings" });
    expect(within(list).getByText("Web shell signature")).toBeInTheDocument();
    const viewer = screen.getByRole("region", {
      name: "Historical scan record",
    });
    expect(within(viewer).getByText(/Scan Record/)).toBeInTheDocument();
    // A finished Deep Scan is named as such in the viewer header.
    expect(within(viewer).getByText(/Deep Scan/)).toBeInTheDocument();
    expect(within(viewer).queryByText(/Archived scan/)).not.toBeInTheDocument();
  });

  it("V63-V2-14b: a Mark Safe the server refuses (HTTP 422) shows the server's reason, not 'Network error'", async () => {
    const reason = "The file could not be read, so it was not marked safe.";
    const clock = compressPollClock();
    const calls = mockApi({
      "/security/scan/malware/start": () => ({
        success: true,
        job_id: "job-mark-safe",
        status: "pending",
      }),
      "/security/ignore": () => {
        throw new ApiError(reason, 422);
      },
    });
    const base = (
      wpApi as unknown as ReturnType<typeof vi.fn>
    ).getMockImplementation();
    (wpApi as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (url: string, options?: unknown) => {
        if (url.startsWith("/security/scan/malware/status")) {
          return Promise.resolve({
            success: true,
            job_id: "job-mark-safe",
            status: "complete",
            phase: "complete",
            progress: {},
            result: {
              files_scanned: 1,
              threats_found: 1,
              threats: [
                {
                  file: "wp-content/uploads/x.php",
                  type: "Web shell signature",
                  severity: "critical",
                  explanation: "",
                  sources: [],
                },
              ],
              mode: "deep",
              scanned_at: "2026-10-05T10:00:00+00:00",
              sources: [],
              phases: {},
            },
          });
        }
        if (url === "/security/ignore") {
          return Promise.reject(new ApiError(reason, 422));
        }
        return (base as (u: string, o?: unknown) => Promise<unknown>)(
          url,
          options
        );
      }
    );
    void calls;
    void clock;
    renderSecurityHub();

    fireEvent.click(screen.getByRole("button", { name: "scan" }));
    fireEvent.click(
      await screen.findByRole("button", { name: /start deep scan/i })
    );
    const markSafe = await screen.findAllByRole(
      "button",
      { name: /^Mark Safe: wp-content\/uploads\/x\.php\./ },
      { timeout: 8000 }
    );
    fireEvent.click(markSafe[0]);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(reason));
    expect(toast.error).not.toHaveBeenCalledWith(
      "Network error marking file as safe."
    );
  }, 15000);

  describe("V63-V2-15: the File Integrity card reports the latest core check", () => {
    const statusWith = (core_integrity?: Record<string, unknown>) => () => ({
      firewall_enabled: false,
      spam_enabled: false,
      block_sqli: false,
      block_xss: false,
      simulation_mode: false,
      login_enabled: false,
      last_scan: "Never",
      ...(core_integrity ? { core_integrity } : {}),
    });

    it("shows the issues badge and the file count when core files differ", async () => {
      mockApi({
        "/security/status": statusWith({
          result: "issues",
          issues_found: 2,
          informational_found: 0,
          checked_at: "2026-10-05T03:00:00+00:00",
          enabled: true,
        }),
      });
      renderSecurityHub();
      expect(await screen.findByText("Issues Found")).toBeInTheDocument();
      expect(
        screen.getByText("2 core files differ from the official release.")
      ).toBeInTheDocument();
      // The footer reports when the core check ran, not the last scan time.
      expect(
        screen.getByText(new Date("2026-10-05T03:00:00+00:00").toLocaleString())
      ).toBeInTheDocument();
      expect(
        screen.queryByText("Automatic daily checks enabled")
      ).not.toBeInTheDocument();
    });

    it("says so when the checksums could not be fetched (never clean)", async () => {
      mockApi({
        "/security/status": statusWith({
          result: "error",
          issues_found: 0,
          informational_found: 0,
          checked_at: "2026-10-05T03:00:00+00:00",
          enabled: true,
        }),
      });
      renderSecurityHub();
      expect(
        await screen.findByText("The last check could not reach WordPress.org.")
      ).toBeInTheDocument();
      expect(screen.getByText("Not Yet Verified")).toBeInTheDocument();
      expect(screen.queryByText("Secure")).not.toBeInTheDocument();
    });

    it("shows the footer 'Daily check off' instead of claiming automatic checks while the check is off", async () => {
      mockApi({
        "/security/status": statusWith({
          result: "not_run",
          issues_found: 0,
          informational_found: 0,
          checked_at: null,
          enabled: false,
        }),
      });
      renderSecurityHub();
      expect(await screen.findByText("Daily check off")).toBeInTheDocument();
      expect(
        screen.queryByText("Automatic daily checks enabled")
      ).not.toBeInTheDocument();
    });

    it("reads a response without core_integrity as not run, never as clean", async () => {
      mockApi({ "/security/status": statusWith() });
      renderSecurityHub();
      expect(await screen.findByText("Not Yet Verified")).toBeInTheDocument();
      expect(screen.queryByText("Secure")).not.toBeInTheDocument();
      expect(
        screen.queryByText(/core files? differs? from the official release/)
      ).not.toBeInTheDocument();
    });
  });

  it("V63-V2-16: no all-clear is shown while the abandoned-plugins check is still running", async () => {
    const clock = compressPollClock();
    mockApi({
      "/security/abandoned-plugins": (index) =>
        index === 0 || clock.elapsedMs < 15_000
          ? {
              success: true,
              enabled: true,
              last_check: 0,
              in_progress: true,
              plugins: [],
            }
          : {
              success: true,
              enabled: true,
              last_check: 1_800_000_000,
              in_progress: false,
              plugins: [],
            },
    });
    renderSecurityHub();

    await screen.findByText("Closed / Abandoned Plugins");
    expect(
      screen.queryByText(/No closed or unlisted plugins found/)
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Checking installed plugins\.\.\./)
    ).toBeInTheDocument();

    // The finished check replaces the checking line.
    expect(
      await screen.findByText(
        /No closed or unlisted plugins found/,
        {},
        {
          timeout: 8000,
        }
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Checking installed plugins/)
    ).not.toBeInTheDocument();
  }, 12000);

  it("V63-V2-17: a check that finishes after 90 seconds of polling is picked up", async () => {
    const clock = compressPollClock();
    mockApi({
      "/security/abandoned-plugins": (index) =>
        index === 0
          ? {
              success: true,
              enabled: true,
              last_check: 1_700_000_000,
              in_progress: false,
              plugins: [],
            }
          : clock.elapsedMs < 90_000
            ? {
                success: true,
                enabled: true,
                last_check: 0,
                in_progress: true,
                plugins: [],
              }
            : {
                success: true,
                enabled: true,
                last_check: 1_800_000_000,
                in_progress: false,
                plugins: [ABANDONED_PLUGIN],
              },
      "/security/abandoned-plugins/refresh": () => ({
        success: true,
        in_progress: true,
        message: "Abandoned-plugin check started in the background.",
      }),
    });
    renderSecurityHub();

    const refresh = await screen.findByRole("button", {
      name: /re-check now/i,
    });
    fireEvent.click(refresh);

    await waitFor(
      () => expect(screen.getByText("Gone Plugin")).toBeInTheDocument(),
      { timeout: 8000 }
    );
    expect(toast.info).not.toHaveBeenCalledWith(
      expect.stringMatching(/Still checking for abandoned plugins/)
    );
  }, 12000);

  describe("V63-V2-19 .. 22: the abandoned-plugins panel never reads 'all clear' for a check that has not finished", () => {
    const NEVER_CHECKED_TEXT =
      "Not checked yet. Select Re-check now to check your installed plugins.";
    const STILL_RUNNING_TEXT =
      "The check is still running. Come back in a few minutes.";
    const panelOf = async () => {
      const heading = await screen.findByText("Closed / Abandoned Plugins");
      const panel = heading.closest(".glass-panel") as HTMLElement;
      expect(panel).not.toBeNull();
      return panel;
    };

    it("V63-V2-19: a site whose plugins were never checked is told so, not given the all-clear", async () => {
      mockApi({
        "/security/abandoned-plugins": () => ({
          success: true,
          enabled: true,
          last_check: 0,
          in_progress: false,
          plugins: [],
        }),
      });
      renderSecurityHub();

      const panel = await panelOf();
      const line = within(panel).getByText(NEVER_CHECKED_TEXT);
      expect(line).toHaveClass("text-neutral-700", "dark:text-neutral-300");
      expect(
        within(panel).queryByText(/No closed or unlisted plugins found/)
      ).not.toBeInTheDocument();
      expect(within(panel).queryByText(/Last checked/)).not.toBeInTheDocument();
      expect(
        within(panel).getByRole("button", { name: /re-check now/i })
      ).toBeInTheDocument();
    });

    it("V63-V2-20: a check still running when the 10-minute poll ends is not reported as all clear, and a later finished check replaces the notice", async () => {
      const clock = compressPollClock();
      let serverFinishes = false;
      const polls: number[] = [];
      mockApi({
        "/security/abandoned-plugins": (index) => {
          if (index === 0) {
            return {
              success: true,
              enabled: true,
              last_check: 1_700_000_000,
              in_progress: false,
              plugins: [],
            };
          }
          polls.push(clock.elapsedMs);
          return serverFinishes
            ? {
                success: true,
                enabled: true,
                last_check: 1_800_000_000,
                in_progress: false,
                plugins: [],
              }
            : {
                success: true,
                enabled: true,
                last_check: 0,
                in_progress: true,
                plugins: [],
              };
        },
        "/security/abandoned-plugins/refresh": () => ({
          success: true,
          in_progress: true,
          message: "Abandoned-plugin check started in the background.",
        }),
      });
      renderSecurityHub();

      const panel = await panelOf();
      expect(
        await within(panel).findByText(
          /No closed or unlisted plugins found/
        )
      ).toBeInTheDocument();

      fireEvent.click(
        await screen.findByRole("button", { name: /re-check now/i })
      );

      // The poller gives up after its 120 polls (10 minutes) with the server still running.
      const notice = await within(panel).findByText(
        STILL_RUNNING_TEXT,
        {},
        {
          timeout: 8000,
        }
      );
      expect(notice).toHaveClass("text-neutral-700", "dark:text-neutral-300");
      expect(polls.length).toBe(120);
      expect(
        within(panel).queryByText(/No closed or unlisted plugins found/)
      ).not.toBeInTheDocument();
      expect(
        within(panel).queryByText(/Checking installed plugins/)
      ).not.toBeInTheDocument();
      expect(
        within(panel).queryByText(NEVER_CHECKED_TEXT)
      ).not.toBeInTheDocument();
      expect(toast.info).toHaveBeenCalledWith(
        expect.stringMatching(/Still checking for abandoned plugins/)
      );

      // A later check that finishes puts the panel back to its normal all-clear.
      serverFinishes = true;
      fireEvent.click(
        await screen.findByRole("button", { name: /re-check now/i })
      );
      expect(
        await within(panel).findByText(
          /No closed or unlisted plugins found/
        )
      ).toBeInTheDocument();
      expect(
        within(panel).queryByText(STILL_RUNNING_TEXT)
      ).not.toBeInTheDocument();
    }, 20000);

    it("V63-V2-20b: a check that was already running when the page opened, and is still running at the end of the poll, gets the same notice", async () => {
      compressPollClock();
      mockApi({
        "/security/abandoned-plugins": () => ({
          success: true,
          enabled: true,
          last_check: 0,
          in_progress: true,
          plugins: [],
        }),
      });
      renderSecurityHub();

      const panel = await panelOf();
      expect(
        within(panel).getByText(/Checking installed plugins\.\.\./)
      ).toBeInTheDocument();
      expect(
        await within(panel).findByText(
          STILL_RUNNING_TEXT,
          {},
          {
            timeout: 8000,
          }
        )
      ).toBeInTheDocument();
      expect(
        within(panel).queryByText(/No closed or unlisted plugins found/)
      ).not.toBeInTheDocument();
      expect(
        within(panel).queryByText(NEVER_CHECKED_TEXT)
      ).not.toBeInTheDocument();
    }, 20000);

    it("V63-V2-21: a finished check with nothing found still reads 'No closed or unlisted plugins found.'", async () => {
      mockApi({
        "/security/abandoned-plugins": () => ({
          success: true,
          enabled: true,
          last_check: 1_800_000_000,
          in_progress: false,
          plugins: [],
        }),
      });
      renderSecurityHub();

      const panel = await panelOf();
      expect(
        within(panel).getByText("No closed or unlisted plugins found.")
      ).toBeInTheDocument();
      expect(within(panel).getAllByText(/Last checked/).length).toBeGreaterThan(
        0
      );
      expect(
        within(panel).queryByText(NEVER_CHECKED_TEXT)
      ).not.toBeInTheDocument();
      expect(
        within(panel).queryByText(STILL_RUNNING_TEXT)
      ).not.toBeInTheDocument();
    });

    it("V63-V2-22: the screen-reader status says 'Checking installed plugins.' only while a check runs AND the detection is on", async () => {
      compressPollClock();
      // Detection off, but the server reports a run: the panel says "disabled",
      // so the live region must stay empty.
      mockApi({
        "/security/abandoned-plugins": (index) =>
          index === 0
            ? {
                success: true,
                enabled: false,
                last_check: 0,
                in_progress: true,
                plugins: [],
              }
            : new Promise(() => {}),
      });
      const view = renderSecurityHub();

      const panel = await panelOf();
      expect(
        within(panel).getByText("Abandoned plugin detection is disabled.")
      ).toBeInTheDocument();
      // The mount read (panel data and the running state) lands in one batch;
      // with the detection off there is no Re-check button to start a check.
      expect(
        within(panel).queryByRole("button", { name: /re-check|checking/i })
      ).not.toBeInTheDocument();
      expect(within(panel).getByRole("status")).toBeEmptyDOMElement();
      view.unmount();
      cleanup();

      // Control: detection on and the same running check -> the region announces it.
      mockApi({
        "/security/abandoned-plugins": (index) =>
          index === 0
            ? {
                success: true,
                enabled: true,
                last_check: 0,
                in_progress: true,
                plugins: [],
              }
            : new Promise(() => {}),
      });
      renderSecurityHub();
      const enabledPanel = await panelOf();
      await waitFor(() =>
        expect(within(enabledPanel).getByRole("status")).toHaveTextContent(
          "Checking installed plugins."
        )
      );
    });
  });

  describe("V63-V2-18: the new text is accessible (WCAG 2.5.3, 1.4.3, 4.1.3)", () => {
    const coreStatus = (core_integrity: Record<string, unknown>) => () => ({
      firewall_enabled: false,
      spam_enabled: false,
      block_sqli: false,
      block_xss: false,
      simulation_mode: false,
      login_enabled: false,
      last_scan: "Never",
      core_integrity,
    });

    /** A check that is still running: the mount read says so, every poll stays unanswered. */
    const runningCheck = (plugins: unknown[]) => {
      compressPollClock();
      mockApi({
        "/security/abandoned-plugins": (index) =>
          index === 0
            ? {
                success: true,
                enabled: true,
                last_check: plugins.length > 0 ? 1_700_000_000 : 0,
                in_progress: true,
                plugins,
              }
            : new Promise(() => {}),
      });
    };

    it("V63-V2-18a: the View findings button's accessible name contains its visible text", async () => {
      mockApi({
        "/security/sentinel/latest-scan": () => ({
          success: true,
          record: SCAN_RECORD,
          layer1_findings: [SCAN_FINDING],
        }),
      });
      renderSecurityHub();

      const card = await screen.findByRole("status", {
        name: /latest scan result summary/i,
      });
      const visibleText = within(card).getByRole("button").textContent?.trim();
      expect(visibleText).toBe("View findings");
      // Label in Name: a speech-input user who says the visible words must hit it.
      expect(
        within(card).getByRole("button", {
          name: (accessibleName) =>
            accessibleName.includes(visibleText as string),
        })
      ).toBeInTheDocument();
    });

    it("V63-V2-18b: a live region in the abandoned-plugins panel is empty, announces the running check, and is empty again afterwards", async () => {
      compressPollClock();
      let finishCheck!: (status: unknown) => void;
      const finished = new Promise((resolve) => {
        finishCheck = resolve;
      });
      mockApi({
        "/security/abandoned-plugins": (index) =>
          index === 0
            ? {
                success: true,
                enabled: true,
                last_check: 1_700_000_000,
                in_progress: false,
                plugins: [],
              }
            : finished,
        "/security/abandoned-plugins/refresh": () => ({
          success: true,
          in_progress: true,
          message: "Abandoned-plugin check started in the background.",
        }),
      });
      renderSecurityHub();

      const heading = await screen.findByText("Closed / Abandoned Plugins");
      const panel = heading.closest(".glass-panel") as HTMLElement;
      expect(panel).not.toBeNull();
      // Mounted before the check starts, so a screen reader sees its text change.
      const region = within(panel).getByRole("status");
      expect(region).toBeEmptyDOMElement();

      fireEvent.click(
        await screen.findByRole("button", { name: /re-check now/i })
      );
      await waitFor(() =>
        expect(region).toHaveTextContent("Checking installed plugins.")
      );
      expect(within(panel).getByRole("status")).toBe(region);

      finishCheck({
        success: true,
        enabled: true,
        last_check: 1_800_000_000,
        in_progress: false,
        plugins: [],
      });
      await waitFor(() => expect(region).toBeEmptyDOMElement());
      expect(within(panel).getByRole("status")).toBe(region);
    });

    describe("V63-V2-18c: new text has a readable dark-mode colour", () => {
      it("the core-files-differ line", async () => {
        mockApi({
          "/security/status": coreStatus({
            result: "issues",
            issues_found: 2,
            informational_found: 0,
            checked_at: "2026-10-05T03:00:00+00:00",
            enabled: true,
          }),
        });
        renderSecurityHub();
        const line = await screen.findByText(
          "2 core files differ from the official release."
        );
        expect(line).toHaveClass("text-red-700", "dark:text-red-400");
      });

      it("the could-not-reach-WordPress.org line", async () => {
        mockApi({
          "/security/status": coreStatus({
            result: "error",
            issues_found: 0,
            informational_found: 0,
            checked_at: "2026-10-05T03:00:00+00:00",
            enabled: true,
          }),
        });
        renderSecurityHub();
        const line = await screen.findByText(
          "The last check could not reach WordPress.org."
        );
        expect(line).toHaveClass("text-neutral-700", "dark:text-neutral-300");
      });

      it("the 'Daily check off' footer value", async () => {
        mockApi({
          "/security/status": coreStatus({
            result: "not_run",
            issues_found: 0,
            informational_found: 0,
            checked_at: null,
            enabled: false,
          }),
        });
        renderSecurityHub();
        const value = await screen.findByText("Daily check off");
        expect(value).toHaveClass("text-neutral-700", "dark:text-neutral-300");
      });

      it("the checking line shown in place of an empty list", async () => {
        runningCheck([]);
        renderSecurityHub();
        const line = await screen.findByText(
          /Checking installed plugins\.\.\./
        );
        expect(line).toHaveClass("text-neutral-700", "dark:text-neutral-300");
      });

      it("the checking line shown beneath a list of plugins", async () => {
        runningCheck([ABANDONED_PLUGIN]);
        renderSecurityHub();
        const line = await screen.findByText(
          /Checking installed plugins\.\.\./
        );
        expect(line).toHaveClass("text-neutral-700", "dark:text-neutral-300");
      });
    });
  });
});
