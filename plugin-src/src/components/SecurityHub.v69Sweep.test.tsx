/**
 * Truth-sweep screen texts reached through the real Security Hub (lane SW-B):
 *
 *  - B5 / S3, S4, S5   the Closed / Abandoned Plugins panel: a plugin
 *                      WordPress.org did not answer for reads "NOT CHECKED",
 *                      and a finished check with nothing found no longer
 *                      claims that "abandoned" plugins were tested.
 *  - B8 / S6           a firewall in Detection Only Mode is not counted as
 *                      active in the Cloud Shield score.
 *  - S29, S32, S33, S40, S43, S44  single-label corrections on the same screen.
 *
 * Production caller path: SecurityHub renders the way the admin page mounts
 * it; only the network boundary (`wpApi`) and the toast module are mocked.
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
    status?: number;
  },
}));

type TL = typeof import("@testing-library/react");
let SecurityHub: any;
let render: TL["render"];
let screen: TL["screen"];
let cleanup: TL["cleanup"];
let fireEvent: TL["fireEvent"];
let within: TL["within"];
let React: typeof import("react");
let QueryClient: any;
let QueryClientProvider: any;
let wpApi: any;
let useScanStore: any;

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  window.React = nodeRequire("react");
  window.ReactDOM = {
    ...nodeRequire("react-dom"),
    ...nodeRequire("react-dom/client"),
  };
  ({ default: SecurityHub } = await import("./SecurityHub"));
  ({ render, screen, cleanup, fireEvent, within } =
    await import("@testing-library/react"));
  ({ QueryClient, QueryClientProvider } =
    await import("@tanstack/react-query"));
  ({ wpApi } = await import("../services/api"));
  ({ useScanStore } = await import("../store/useScanStore"));
  React = await import("react");
});

type Routes = Record<string, unknown>;

function hardeningOption(key: string, enabled: boolean) {
  return { key, label: key, description: key, enabled };
}

/** Inert defaults for every endpoint SecurityHub reads on mount. */
function mockApi(routes: Routes = {}) {
  (wpApi as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
    if (url in routes) return Promise.resolve(routes[url]);
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
    if (url === "/security/banned-ips")
      return Promise.resolve({ ips: [], allowed_ips: [], current_ip: "" });
    if (url === "/security/sentinel/latest-scan")
      return Promise.resolve({ success: false, record: null });
    if (url === "/security/environment")
      return Promise.resolve({
        success: true,
        environment: { cloudflare: { detected: false } },
      });
    return Promise.resolve({ success: true });
  });
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

const flat = (el: Element | null) =>
  (el?.textContent ?? "").replace(/\s+/g, " ").trim();

const panelOf = async () => {
  const heading = await screen.findByText("Closed / Abandoned Plugins");
  const panel = heading.closest(".glass-panel") as HTMLElement;
  expect(panel).not.toBeNull();
  return panel;
};

const abandoned = (plugins: unknown[], last_check = 1_800_000_000) => ({
  "/security/abandoned-plugins": {
    success: true,
    enabled: true,
    last_check,
    in_progress: false,
    plugins,
  },
});

describe("SecurityHub — Closed / Abandoned Plugins panel (B5: S3, S4, S5)", () => {
  beforeEach(() => {
    (window as any).swisswpsuiteData = {};
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("A-B5c: a plugin WordPress.org did not answer for reads NOT CHECKED with the signed explanation, and no all-clear", async () => {
    mockApi(
      abandoned([
        {
          slug: "quiet-plugin/quiet-plugin.php",
          name: "Quiet Plugin",
          checked_at: 1_800_000_000,
          reason: "lookup_failed",
        },
      ])
    );
    mountHub();

    const panel = await panelOf();
    const row = (await within(panel).findByText("Quiet Plugin")).closest(
      "div.rounded-xl"
    ) as HTMLElement;
    expect(row).not.toBeNull();
    expect(within(row).getByText("NOT CHECKED")).toBeInTheDocument();
    expect(flat(row)).toContain(
      "WordPress.org did not give a usable answer for this plugin, so it could not be checked. Select Re-check now to try again."
    );
    // The row is neither a closed plugin nor a "not listed" slug mismatch.
    expect(within(row).queryByText("CLOSED")).not.toBeInTheDocument();
    expect(flat(row)).not.toContain("NOT FOUND ON WORDPRESS.ORG");
    expect(flat(row)).not.toContain("is not listed on WordPress.org");
    // No all-clear is printed next to a plugin that was not checked.
    expect(flat(panel)).not.toContain("No closed or unlisted plugins found");
    // Only unchecked rows: the panel badge is the informational one.
    expect(within(panel).getByText("INFO")).toBeInTheDocument();
    expect(within(panel).queryByText("HIGH")).not.toBeInTheDocument();
  });

  it("A-B5c control: a not-listed row, a closed row and a row cached without a reason keep their own wording", async () => {
    mockApi(
      abandoned([
        {
          slug: "custom-plugin/custom-plugin.php",
          name: "Custom Plugin",
          checked_at: 1_800_000_000,
          reason: "not_found",
        },
        {
          slug: "gone-plugin/gone-plugin.php",
          name: "Gone Plugin",
          checked_at: 1_800_000_000,
          reason: "closed",
          closed_date: "2020-01-01",
        },
        // A row cached by an older version carries no reason at all.
        {
          slug: "old-cache/old-cache.php",
          name: "Old Cache Plugin",
          checked_at: 1_700_000_000,
        },
      ])
    );
    mountHub();

    const panel = await panelOf();
    const legacy = (await within(panel).findByText("Old Cache Plugin")).closest(
      "div.rounded-xl"
    ) as HTMLElement;
    expect(flat(legacy)).toContain("NOT FOUND ON WORDPRESS.ORG");
    expect(within(legacy).queryByText("NOT CHECKED")).not.toBeInTheDocument();
    const custom = (await within(panel).findByText("Custom Plugin")).closest(
      "div.rounded-xl"
    ) as HTMLElement;
    expect(flat(custom)).toContain("NOT FOUND ON WORDPRESS.ORG");
    expect(flat(custom)).toContain(
      "This plugin is not listed on WordPress.org."
    );
    expect(within(custom).queryByText("NOT CHECKED")).not.toBeInTheDocument();
    const gone = within(panel)
      .getByText("Gone Plugin")
      .closest("div.rounded-xl") as HTMLElement;
    expect(within(gone).getByText("CLOSED")).toBeInTheDocument();
    expect(within(panel).getByText("HIGH")).toBeInTheDocument();
  });

  it("A-B5d: a finished check with nothing found says what was and was not checked", async () => {
    mockApi(abandoned([]));
    mountHub();

    const panel = await panelOf();
    expect(
      await within(panel).findByText("No closed or unlisted plugins found.")
    ).toBeInTheDocument();
    expect(flat(panel)).toContain(
      "No closed or unlisted plugins found. This plugin and plugins known to come from outside WordPress.org are not checked."
    );
    expect(flat(panel)).not.toContain("abandoned plugins detected");
  });
});

describe("SecurityHub — Cloud Shield score (B8: S6, S44)", () => {
  beforeEach(() => {
    (window as any).swisswpsuiteData = {};
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const shieldRoutes = (simulation: boolean): Routes => ({
    "/security/status": {
      firewall_enabled: true,
      spam_enabled: false,
      block_sqli: true,
      block_xss: true,
      simulation_mode: simulation,
      login_enabled: false,
      last_scan: "Never",
    },
    "/hardening/status": {
      success: true,
      options: {
        force_security_headers: hardeningOption("force_security_headers", true),
        block_bad_bots: hardeningOption("block_bad_bots", true),
        hide_wp_version: hardeningOption("hide_wp_version", true),
      },
    },
    "/security/environment": {
      success: true,
      environment: { cloudflare: { detected: true, connecting_ip: true } },
    },
  });

  const rowOf = (label: string) =>
    screen.getByText(label).closest("div.flex") as HTMLElement;

  const openCloudShield = async () => {
    fireEvent.click(screen.getByRole("button", { name: /cloud shield/i }));
    return (await screen.findByText("Security Score")).closest(
      ".glass-panel"
    ) as HTMLElement;
  };

  it("A-B8: with Detection Only Mode on, the firewall row reads Detection only and the score leaves it out", async () => {
    mockApi(shieldRoutes(true));
    mountHub();
    const scoreCard = await openCloudShield();

    await vi.waitFor(() =>
      expect(flat(rowOf("Application Firewall"))).toContain("Detection only")
    );
    expect(flat(rowOf("Application Firewall"))).not.toContain("Active");
    expect(flat(rowOf("Application Firewall"))).not.toContain("Not detected");
    // Contrast (WCAG 1.4.3): 12px bold text needs 4.5:1 on the page surface in
    // both themes. amber-800 is 5.62:1 on the light page, amber-400 is 10.73:1
    // on the dark page; amber-700 was 3.98:1 / 3.65:1.
    const label = screen.getByText("Detection only");
    expect(label).toHaveClass("text-amber-800", "dark:text-amber-400");
    expect(label).not.toHaveClass("text-amber-700");
    // The other four inputs are on: 4 of 5 = 80 %, not the full score.
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.queryByText("100%")).not.toBeInTheDocument();
    expect(within(scoreCard).getAllByText("Active")).toHaveLength(4);
  });

  it("A-B8c control: with the firewall blocking, the row reads Active and the score is complete", async () => {
    mockApi(shieldRoutes(false));
    mountHub();
    const scoreCard = await openCloudShield();

    await vi.waitFor(() =>
      expect(flat(rowOf("Application Firewall"))).toContain("Active")
    );
    expect(flat(rowOf("Application Firewall"))).not.toContain("Detection only");
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(within(scoreCard).getAllByText("Active")).toHaveLength(5);
  });

  it("A-B8 control: with the firewall off the row still reads Not detected", async () => {
    const routes = shieldRoutes(true);
    routes["/security/status"] = {
      ...(routes["/security/status"] as object),
      firewall_enabled: false,
    };
    mockApi(routes);
    mountHub();
    await openCloudShield();

    await vi.waitFor(() =>
      expect(flat(rowOf("Application Firewall"))).toContain("Not detected")
    );
    expect(flat(rowOf("Application Firewall"))).not.toContain("Detection only");
  });

  it("S44: the trusted-proxy explanation names the IPv4 ranges listed in the plugin", async () => {
    mockApi();
    const { container } = mountHub();
    await openCloudShield();

    expect(flat(container)).toContain(
      "The CF-Connecting-IP header is only trusted when the request itself comes from one of the Cloudflare IPv4 ranges listed in the plugin. A header claiming to be from Cloudflare is ignored if the connection did not come from one of those ranges."
    );
    expect(flat(container)).not.toContain("published IP ranges");
  });
});

describe("SecurityHub — single-label corrections (S29, S32, S33, S40, S43)", () => {
  beforeEach(() => {
    (window as any).swisswpsuiteData = {};
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    useScanStore.getState().setDeepMalwareResult(null);
  });

  it("S29 and S40: the File Integrity row is labelled Last Scan and the Smart Firewall card says what Detection Only Mode does", async () => {
    mockApi();
    const { container } = mountHub();

    expect(await screen.findByText("Last Scan")).toBeInTheDocument();
    expect(screen.queryByText("Last Verified")).not.toBeInTheDocument();
    expect(flat(container)).toContain(
      "Checks incoming requests for SQL-injection, script-injection and path-traversal patterns. It stops the ones it recognises unless Detection Only Mode is on."
    );
  });

  it("S33: the Dashboard tab's scan summary card is titled Scan Complete", async () => {
    mockApi({
      "/security/sentinel/latest-scan": {
        success: true,
        record: {
          id: 7,
          scan_id: "11111111-2222-4333-8444-555555555555",
          scan_type: "malware_deep",
          scanned_at: "2026-10-05 10:00:00",
          security_grade: "",
          findings_count: 1,
          critical_count: 1,
        },
        layer1_findings: [
          {
            id: "l1-m1-abc123",
            severity: "critical",
            title: "Web shell signature",
            details: "Signature match in wp-content/uploads/x.php.",
            remediation: "Review the file for malicious code.",
            evidence: "wp-content/uploads/x.php",
            fix_type: "manual_review",
            integrity_category: "malware_signature",
          },
        ],
      },
    });
    mountHub();

    const card = await screen.findByRole("status", {
      name: /latest scan result summary/i,
    });
    expect(within(card).getByText("Scan Complete")).toBeInTheDocument();
    expect(flat(card)).not.toContain("Quick Scan Complete");
  });

  it("S32: the Security Logs table names its severity column Severity", async () => {
    mockApi({
      "/security/logs": [
        {
          id: 1,
          ip_address: "203.0.113.7",
          event: "Login Lockout (Too many attempts)",
          created_at: "2026-10-05 10:00:00",
          severity: "high",
          blocked: 1,
        },
      ],
    });
    mountHub();
    fireEvent.click(screen.getByRole("button", { name: "logs" }));

    const header = await screen.findByRole("columnheader", {
      name: "Severity",
    });
    expect(header).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Type" })
    ).not.toBeInTheDocument();
  });

  it("S43: a deep scan without findings says malware was not detected in the scanned files", async () => {
    mockApi();
    useScanStore.getState().setDeepMalwareResult({
      files_scanned: 120,
      threats_found: 0,
      threats: [],
      mode: "deep",
      scanned_at: "2026-10-23T10:00:00Z",
    });
    const { container } = mountHub();
    fireEvent.click(screen.getByRole("button", { name: "scan" }));

    expect(
      await screen.findByText("No malware detected in the scanned files.")
    ).toBeInTheDocument();
    expect(flat(container)).not.toContain("Your files look clean");
  });

  it("the Mark Safe note under the findings is readable in both themes (WCAG 1.4.3)", async () => {
    mockApi();
    useScanStore.getState().setDeepMalwareResult({
      files_scanned: 120,
      threats_found: 1,
      threats: [
        {
          file: "wp-content/uploads/evil.php",
          type: "backdoor",
          severity: "high",
        },
      ],
      mode: "deep",
      scanned_at: "2026-10-23T10:00:00Z",
    });
    mountHub();
    fireEvent.click(screen.getByRole("button", { name: "scan" }));

    // 11px text: 4.5:1 needed. neutral-500 was 3.73:1 on the light page and
    // 3.89:1 on the dark page; neutral-700 is 8.19:1, neutral-300 is 12.43:1.
    const note = await screen.findByText(
      /Mark Safe adds the file to your ignore list/
    );
    expect(note).toHaveClass("text-neutral-700", "dark:text-neutral-300");
    expect(note).not.toHaveClass("text-neutral-500");
  });
});
