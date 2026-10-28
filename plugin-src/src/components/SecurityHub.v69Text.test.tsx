/**
 * Signed screen texts reached through the real Security Hub: the Mark Safe
 * flow (U40 toast, U42 note under the findings list) and the Ignored Paths
 * card subtitle (U41).
 *
 * Production caller path: SecurityHub renders, the Scan tab shows the deep
 * malware result held in the scan store, the user clicks Mark Safe, the hub
 * posts /security/ignore and raises the success toast. The Quarantine tab
 * shows the Ignored Paths card. Only `wpApi` and the toast module are mocked.
 * No JSX.
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
    status?: number;
  },
}));

type TL = typeof import("@testing-library/react");
let SecurityHub: any;
let render: TL["render"];
let screen: TL["screen"];
let cleanup: TL["cleanup"];
let fireEvent: TL["fireEvent"];
let waitFor: TL["waitFor"];
let React: typeof import("react");
let QueryClient: any;
let QueryClientProvider: any;
let wpApi: any;
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
  ({ render, screen, cleanup, fireEvent, waitFor } =
    await import("@testing-library/react"));
  ({ QueryClient, QueryClientProvider } =
    await import("@tanstack/react-query"));
  ({ wpApi } = await import("../services/api"));
  ({ toast } = await import("../lib/toast"));
  ({ useScanStore } = await import("../store/useScanStore"));
  React = await import("react");
});

function defaultMockFor(url: string): unknown {
  if (url === "/hardening/status") return { success: true, options: {} };
  if (url === "/security/status") {
    return {
      firewall_enabled: false,
      spam_enabled: false,
      block_sqli: false,
      block_xss: false,
      simulation_mode: false,
      login_enabled: false,
      last_scan: "",
    };
  }
  if (url === "/security/logs") return [];
  if (url === "/security/banned-ips")
    return { ips: [], allowed_ips: [], current_ip: "203.0.113.5" };
  if (url === "/security/sentinel/latest-scan")
    return { success: false, record: null };
  if (url === "/security/environment")
    return { success: true, environment: { cloudflare: { detected: false } } };
  return { success: true };
}

const THREAT_FILE = "wp-content/uploads/evil.php";

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

const flat = (el: Element | null) =>
  (el?.textContent ?? "").replace(/\s+/g, " ").trim();

describe("SecurityHub — signed Mark Safe and Ignored Paths texts (U40, U41, U42)", () => {
  beforeEach(() => {
    (window as any).swisswpsuiteData = {};
    (wpApi as ReturnType<typeof vi.fn>).mockImplementation((url: string) =>
      Promise.resolve(defaultMockFor(url))
    );
    useScanStore.getState().setDeepMalwareResult({
      files_scanned: 120,
      threats_found: 1,
      threats: [{ file: THREAT_FILE, type: "backdoor", severity: "high" }],
      mode: "deep",
      scanned_at: "2026-10-23T10:00:00Z",
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    useScanStore.getState().setDeepMalwareResult(null);
  });

  it("U42: the note under the findings names the real Ignored Paths card and the content condition", async () => {
    const { container } = mountHub();
    fireEvent.click(screen.getByRole("button", { name: "scan" }));

    // positive control: the finding and its Mark Safe button are on screen
    await screen.findByRole("button", {
      name: `Mark Safe: ${THREAT_FILE}. Excludes it from future scans while its content stays the same`,
    });
    expect(flat(container)).toContain(THREAT_FILE);

    expect(flat(container)).toContain(
      "Mark Safe adds the file to your ignore list so future scans skip it while its content stays the same. You can review or remove entries later under Security Hub > Quarantine > Ignored Paths."
    );
    expect(flat(container)).not.toContain("under Security Hub > Ignore Paths");
  });

  it("U40: Mark Safe posts the path and raises the signed success toast", async () => {
    mountHub();
    fireEvent.click(screen.getByRole("button", { name: "scan" }));
    const markSafe = await screen.findByRole("button", {
      name: `Mark Safe: ${THREAT_FILE}. Excludes it from future scans while its content stays the same`,
    });

    fireEvent.click(markSafe);
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "Marked as safe. Future scans skip this file while its content stays the same."
      )
    );
    const ignoreCalls = (wpApi as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([url, opts]: [string, RequestInit | undefined]) =>
        url === "/security/ignore" && opts?.method === "POST"
    );
    expect(ignoreCalls).toHaveLength(1);
    expect(JSON.parse(ignoreCalls[0][1].body)).toEqual({ path: THREAT_FILE });
  });

  it("U41: the Quarantine tab's Ignored Paths card says a file is skipped only while its content stays the same", async () => {
    const { container } = mountHub();
    fireEvent.click(screen.getByRole("button", { name: "quarantine" }));
    expect(await screen.findByText("Ignored Paths")).toBeInTheDocument();
    expect(flat(container)).toContain(
      "Paths excluded from automated scans (a file only while its content stays the same)"
    );
  });
});
