/**
 * Security Hub truth fixes of the final .69 pass (lane FF-REACT-A):
 *
 *  - AC-9  FA-3  a refusal answered by the server shows the server's reason;
 *                a request that never completed keeps the network wording.
 *  - AC-10 FA-5  no Re-check button while detection is off; a finished poll
 *                that found the check no longer running says so (T30).
 *  - AC-11 FA-7  the File Integrity footer claims nothing while the status is
 *                unknown and shows the core check time, not the scan time.
 *  - FA-1        the scan result offers Quarantine only (no Delete button).
 *  - T28, T29    the self-test hint and the Deep Scan timeout toast.
 *
 * Production caller path: SecurityHub renders the way the admin page mounts it;
 * only the network boundary (`wpApi`) and the toast module are mocked.
 * No JSX (React is stamped onto window before SecurityHub is imported).
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

type TL = typeof import("@testing-library/react");
let SecurityHub: any;
let render: TL["render"];
let screen: TL["screen"];
let cleanup: TL["cleanup"];
let fireEvent: TL["fireEvent"];
let waitFor: TL["waitFor"];
let within: TL["within"];
let React: typeof import("react");
let QueryClient: any;
let QueryClientProvider: any;
let wpApi: any;
let ApiError: any;
let toast: any;
let useScanStore: any;

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
  ({ useScanStore } = await import("../store/useScanStore"));
  React = await import("react");
});

type Overrides = Record<string, (callIndex: number, opts?: any) => unknown>;

const STATUS = {
  firewall_enabled: false,
  spam_enabled: false,
  block_sqli: false,
  block_xss: false,
  simulation_mode: false,
  login_enabled: false,
  last_scan: "Never",
};

/** Inert defaults for every endpoint SecurityHub reads on mount; `overrides` replace single routes. */
function mockApi(overrides: Overrides = {}) {
  const calls: Record<string, number> = {};
  (wpApi as ReturnType<typeof vi.fn>).mockImplementation(
    (url: string, opts?: any) => {
      const index = calls[url] ?? 0;
      calls[url] = index + 1;
      if (overrides[url]) return Promise.resolve(overrides[url](index, opts));
      if (url === "/hardening/status")
        return Promise.resolve({ success: true, options: {} });
      if (url === "/security/status") return Promise.resolve(STATUS);
      if (url === "/security/logs") return Promise.resolve([]);
      if (url === "/security/banned-ips")
        return Promise.resolve({
          ips: [],
          allowed_ips: [],
          current_ip: "203.0.113.5",
        });
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

function mountHub() {
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

/** Poll delays of 3 s and 5 s fire at once, so a 10-minute poller finishes in milliseconds. */
function compressPollClock() {
  const realSetTimeout = globalThis.setTimeout;
  vi.spyOn(globalThis, "setTimeout").mockImplementation(((
    handler: TimerHandler,
    ms?: number,
    ...args: unknown[]
  ) => {
    if (ms === 3000 || ms === 5000) {
      return realSetTimeout(handler as () => void, 0, ...args);
    }
    return realSetTimeout(handler as () => void, ms, ...args);
  }) as unknown as typeof setTimeout);
}

const flat = (el: Element | null) =>
  (el?.textContent ?? "").replace(/\s+/g, " ").trim();

const abandoned = (over: Record<string, unknown> = {}) => ({
  success: true,
  enabled: true,
  last_check: 0,
  in_progress: false,
  plugins: [],
  ...over,
});

describe("SecurityHub — final .69 truth fixes", () => {
  beforeEach(() => {
    (window as any).swisswpsuiteData = {};
    useScanStore.getState().setDeepMalwareResult(null);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.clearAllMocks();
    useScanStore.getState().setDeepMalwareResult(null);
  });

  // ── T28 ────────────────────────────────────────────────────────────────────
  it("T28: a self-test that never ran says what it checks, in the words of Detection Only Mode", async () => {
    mockApi({
      "/security/status": () => ({ ...STATUS, firewall_enabled: true }),
    });
    mountHub();
    expect(
      await screen.findByText(
        'Never run — click "Run self-test now" to check that the firewall detects attacks (and, with Detection Only Mode off, blocks them).'
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/to verify the firewall is actually blocking attacks/)
    ).not.toBeInTheDocument();
  });

  // ── AC-9 (FA-3) ────────────────────────────────────────────────────────────
  async function banIp(ip: string) {
    fireEvent.click(screen.getByRole("button", { name: "quarantine" }));
    const input = await screen.findByLabelText("IP address to block");
    fireEvent.change(input, { target: { value: ip } });
    fireEvent.click(screen.getByRole("button", { name: "Block IP" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm" }));
  }

  it("AC-9: a ban the server refuses (HTTP 400) shows the server's reason", async () => {
    mockApi({
      "/security/ban-ip": () => {
        throw new ApiError("IP is already banned", 400);
      },
    });
    mountHub();
    await banIp("198.51.100.7");
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("IP is already banned")
    );
    expect(toast.error).not.toHaveBeenCalledWith("Network error during ban.");
  });

  it("AC-9 control: a request that never completed keeps the network wording", async () => {
    mockApi({
      "/security/ban-ip": () => {
        throw new TypeError("Failed to fetch");
      },
    });
    mountHub();
    await banIp("198.51.100.7");
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Network error during ban.")
    );
  });

  it.each([
    ["an error answer with no message", () => new ApiError("", 502)],
    [
      "a request that never completed (status 0)",
      () => new ApiError("offline", 0),
    ],
    ["a thrown string", () => "boom"],
  ])("AC-9 inversion: %s keeps the network wording", async (_label, make) => {
    mockApi({
      "/security/ban-ip": () => {
        throw make();
      },
    });
    mountHub();
    await banIp("198.51.100.7");
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Network error during ban.")
    );
  });

  // ── T29 ────────────────────────────────────────────────────────────────────
  it("T29: a Deep Scan that is still running after the last poll says it did not finish in time", async () => {
    compressPollClock();
    mockApi({
      "/security/scan/malware/start": () => ({
        success: true,
        job_id: "job-slow",
        status: "pending",
      }),
      "/security/scan/malware/status?job_id=job-slow": () => ({
        success: true,
        status: "running",
        phase: "local_scan",
      }),
    });
    mountHub();
    fireEvent.click(screen.getByRole("button", { name: "scan" }));
    fireEvent.click(
      await screen.findByRole("button", { name: /start deep scan/i })
    );
    await waitFor(
      () =>
        expect(toast.error).toHaveBeenCalledWith(
          "The scan did not finish in time. Start a new scan."
        ),
      { timeout: 15000 }
    );
  }, 20000);

  // ── AC-10 (FA-5) ───────────────────────────────────────────────────────────
  const panelOf = async () => {
    const heading = await screen.findByText("Closed / Abandoned Plugins");
    return heading.closest(".glass-panel") as HTMLElement;
  };

  it("AC-10: no Re-check button while abandoned-plugin detection is off", async () => {
    mockApi({
      "/security/abandoned-plugins": () => abandoned({ enabled: false }),
    });
    mountHub();
    const panel = await panelOf();
    expect(
      within(panel).getByText("Abandoned plugin detection is disabled.")
    ).toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: /re-check now/i })
    ).not.toBeInTheDocument();
  });

  it("AC-10 control: the Re-check button is there while detection is on", async () => {
    mockApi({ "/security/abandoned-plugins": () => abandoned() });
    mountHub();
    const panel = await panelOf();
    expect(
      await within(panel).findByRole("button", { name: /re-check now/i })
    ).toBeInTheDocument();
  });

  it("AC-10: a poll that ends with the check no longer running says it did not finish (T30), not 'still checking'", async () => {
    compressPollClock();
    mockApi({
      "/security/abandoned-plugins": () => abandoned(),
      "/security/abandoned-plugins/refresh": () => ({
        success: true,
        in_progress: true,
      }),
    });
    mountHub();
    const panel = await panelOf();
    fireEvent.click(
      await within(panel).findByRole("button", { name: /re-check now/i })
    );
    await waitFor(
      () =>
        expect(toast.info).toHaveBeenCalledWith(
          "The check did not finish. Click Re-check now to try again."
        ),
      { timeout: 15000 }
    );
    expect(toast.info).not.toHaveBeenCalledWith(
      expect.stringMatching(/Still checking for abandoned plugins/)
    );
  }, 20000);

  it("AC-10 control: a check the server still reports as running keeps the 'still checking' notice", async () => {
    compressPollClock();
    mockApi({
      "/security/abandoned-plugins": (index) =>
        index === 0 ? abandoned() : abandoned({ in_progress: true }),
      "/security/abandoned-plugins/refresh": () => ({
        success: true,
        in_progress: true,
      }),
    });
    mountHub();
    const panel = await panelOf();
    fireEvent.click(
      await within(panel).findByRole("button", { name: /re-check now/i })
    );
    await waitFor(
      () =>
        expect(toast.info).toHaveBeenCalledWith(
          expect.stringMatching(/Still checking for abandoned plugins/)
        ),
      { timeout: 15000 }
    );
    expect(toast.info).not.toHaveBeenCalledWith(
      "The check did not finish. Click Re-check now to try again."
    );
  }, 20000);

  // ── AC-11 (FA-7) ───────────────────────────────────────────────────────────
  const footerOf = async () => {
    const label = await screen.findByText("Last Scan");
    return label.parentElement as HTMLElement;
  };

  it("AC-11: while the status has not arrived the footer claims nothing (no value, not 'Never')", async () => {
    mockApi({ "/security/status": () => new Promise(() => {}) });
    mountHub();
    const footer = await footerOf();
    expect(flat(footer)).not.toContain("Automatic daily checks enabled");
    expect(flat(footer)).not.toContain("Daily check off");
    expect(flat(footer)).not.toContain("Never");
    expect(flat(footer)).toBe("Last Scan");
  });

  it("AC-11: the footer shows the time of the core check, not the last scan time", async () => {
    const checkedAt = "2026-10-05T03:00:00+00:00";
    mockApi({
      "/security/status": () => ({
        ...STATUS,
        last_scan: "SCAN-TIME-MARKER",
        core_integrity: {
          result: "clean",
          issues_found: 0,
          informational_found: 0,
          checked_at: checkedAt,
          enabled: true,
        },
      }),
    });
    mountHub();
    await waitFor(async () =>
      expect(flat(await footerOf())).toContain(
        new Date(checkedAt).toLocaleString()
      )
    );
    expect(flat(await footerOf())).not.toContain("SCAN-TIME-MARKER");
  });

  it.each(["not-a-date", ""])(
    "AC-11 inversion: an unreadable checked_at (%j) never prints 'Invalid Date'",
    async (checkedAt) => {
      mockApi({
        "/security/status": () => ({
          ...STATUS,
          core_integrity: {
            result: "not_run",
            issues_found: 0,
            informational_found: 0,
            checked_at: checkedAt,
            enabled: true,
          },
        }),
      });
      mountHub();
      await waitFor(async () =>
        expect(flat(await footerOf())).toContain(
          "Automatic daily checks enabled"
        )
      );
      expect(flat(await footerOf())).not.toContain("Invalid Date");
    }
  );

  it("AC-11 control: an enabled check that has not run yet keeps 'Automatic daily checks enabled'", async () => {
    mockApi({
      "/security/status": () => ({
        ...STATUS,
        core_integrity: {
          result: "not_run",
          issues_found: 0,
          informational_found: 0,
          checked_at: null,
          enabled: true,
        },
      }),
    });
    mountHub();
    await waitFor(async () =>
      expect(flat(await footerOf())).toContain("Automatic daily checks enabled")
    );
  });

  // ── FA-1 ───────────────────────────────────────────────────────────────────
  it("FA-1: the scan result offers Quarantine and no Delete; the toast says 'quarantined'", async () => {
    useScanStore.getState().setDeepMalwareResult({
      files_scanned: 120,
      threats_found: 2,
      threats: [
        {
          file: "wp-content/uploads/a.php",
          type: "backdoor",
          severity: "high",
        },
        {
          file: "wp-content/uploads/b.php",
          type: "backdoor",
          severity: "high",
        },
      ],
      mode: "deep",
      scanned_at: "2026-10-23T10:00:00Z",
    });
    mockApi({
      "/security/bulk": () => ({ success: true, count: 2, failed: [] }),
    });
    mountHub();
    fireEvent.click(screen.getByRole("button", { name: "scan" }));
    fireEvent.click(await screen.findByLabelText("Select all threats"));
    const quarantine = await screen.findByRole("button", {
      name: "Quarantine 2",
    });
    expect(
      screen.queryByRole("button", { name: /^Delete \d/ })
    ).not.toBeInTheDocument();
    fireEvent.click(quarantine);
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("2 findings quarantined.")
    );
    const bulk = (wpApi as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([url]: [string]) => url === "/security/bulk"
    );
    expect(bulk).toHaveLength(1);
    expect(JSON.parse(bulk[0][1].body).action).toBe("quarantine");
  });
});
