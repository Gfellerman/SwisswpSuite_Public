/**
 * Cloud Shield disclaimer (final .69 pass, fix round FF-REACT-C, R1 and R2).
 *
 * The disclaimer under the Cloud Shield section says what SwissSuite does not
 * do for a Cloudflare account. It makes no claim about how well the site is
 * protected with or without a proxy: SwissSuite reads a visitor's address from
 * a proxy header only for Cloudflare, so "works with or without a reverse
 * proxy" is not true for every proxy.
 *
 * Production caller path: the real SecurityHub mounts the way the admin page
 * does, `/security/environment` (network boundary, mocked) reports whether a
 * Cloudflare header was seen, the user opens the "Cloud Shield" tab, and the
 * real CloudShieldPanel renders in the matching branch. No JSX (React is
 * stamped onto window before SecurityHub is imported).
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
let React: typeof import("react");
let QueryClient: any;
let QueryClientProvider: any;
let wpApi: any;

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  window.React = nodeRequire("react");
  window.ReactDOM = {
    ...nodeRequire("react-dom"),
    ...nodeRequire("react-dom/client"),
  };
  ({ default: SecurityHub } = await import("./SecurityHub"));
  ({ render, screen, cleanup, fireEvent } =
    await import("@testing-library/react"));
  ({ QueryClient, QueryClientProvider } =
    await import("@tanstack/react-query"));
  ({ wpApi } = await import("../services/api"));
  React = await import("react");
});

const STATUS = {
  firewall_enabled: true,
  spam_enabled: false,
  block_sqli: false,
  block_xss: false,
  simulation_mode: false,
  login_enabled: false,
  last_scan: "Never",
};

/** Inert defaults for every endpoint SecurityHub reads on mount; the environment answer is the variable. */
function mockApi(cloudflareDetected: boolean) {
  (wpApi as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
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
        environment: {
          cloudflare: {
            detected: cloudflareDetected,
            connecting_ip: cloudflareDetected,
            country_header: cloudflareDetected,
          },
        },
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

const R1 =
  "Cloudflare is an independent third-party service not affiliated with SwissSuite. This page is provided for reference only — SwissSuite does not manage your Cloudflare account or settings.";
const R2 =
  "Cloudflare is an independent third-party service not affiliated with SwissSuite. This page is provided for reference only — SwissSuite does not manage a Cloudflare account or settings on your behalf.";

const disclaimerOf = () =>
  screen.getByText(/^Cloudflare is an independent third-party service/);

describe("SecurityHub — Cloud Shield disclaimer (R1, R2)", () => {
  beforeEach(() => {
    (window as any).swisswpsuiteData = {};
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("R1: with a Cloudflare header seen, the disclaimer says only what SwissSuite does not manage", async () => {
    mockApi(true);
    const { container } = mountHub();
    fireEvent.click(
      await screen.findByRole("button", { name: /cloud shield/i })
    );
    // positive control: the Cloudflare-detected branch is the one on screen
    await screen.findByText(
      /Cloudflare detected — your site has an extra layer/
    );

    expect(flat(disclaimerOf())).toBe(R1);
    expect(flat(container)).not.toContain("with or without");
    expect(flat(container)).not.toContain(
      "application-level security protection"
    );
  });

  it("R2: with no Cloudflare header seen, the disclaimer says only what SwissSuite does not manage", async () => {
    mockApi(false);
    const { container } = mountHub();
    fireEvent.click(
      await screen.findByRole("button", { name: /cloud shield/i })
    );
    // positive control: the not-detected branch is the one on screen
    await screen.findByText(/Cloudflare not detected on this site/);

    expect(flat(disclaimerOf())).toBe(R2);
    expect(flat(container)).not.toContain("with or without");
    expect(flat(container)).not.toContain(
      "application-level security protection"
    );
  });

  it("control: the not-detected paragraph keeps its signed statement about proxies other than Cloudflare", async () => {
    mockApi(false);
    const { container } = mountHub();
    fireEvent.click(
      await screen.findByRole("button", { name: /cloud shield/i })
    );
    await screen.findByText(/Cloudflare not detected on this site/);
    expect(flat(container)).toContain(
      "behind a proxy other than Cloudflare they can see the proxy's address instead of each visitor's"
    );
  });
});
