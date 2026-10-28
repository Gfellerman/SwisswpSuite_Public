import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";

/**
 * Settings panels (final .69 pass): the default social image description
 * (FB-2, T33), the cache purge description (FB-3, T34) and the SMTP card's
 * 48-hour warning (FB-5, AC-14). The real components; only `wpApi` and the
 * toast module are mocked. No JSX.
 */
vi.mock("../../../lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
vi.mock("../../../services/api", () => ({
  wpApi: vi.fn(),
  ApiError: class ApiError extends Error {},
}));

type TL = typeof import("@testing-library/react");
let SeoSettings: any;
let MaintenanceSettings: any;
let SmtpSettings: any;
let render: TL["render"];
let screen: TL["screen"];
let cleanup: TL["cleanup"];
let QueryClient: any;
let QueryClientProvider: any;
let wpApi: any;
let React: typeof import("react");

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  window.React = nodeRequire("react");
  window.ReactDOM = {
    ...nodeRequire("react-dom"),
    ...nodeRequire("react-dom/client"),
  };
  ({ SeoSettings } = await import("./SeoSettings"));
  ({ MaintenanceSettings } = await import("./MaintenanceSettings"));
  ({ SmtpSettings } = await import("./SmtpSettings"));
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  ({ QueryClient, QueryClientProvider } =
    await import("@tanstack/react-query"));
  ({ wpApi } = await import("../../../services/api"));
  React = await import("react");
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const flat = (el: Element | null) =>
  (el?.textContent ?? "").replace(/\s+/g, " ").trim();

const provider = (child: unknown) =>
  React.createElement(
    QueryClientProvider,
    {
      client: new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      }),
    },
    child as React.ReactElement
  );

describe("SeoSettings — default social image (FB-2, T33)", () => {
  it("says the image is used while the basic tags are on and no SEO plugin is active", () => {
    const { container } = render(
      provider(
        React.createElement(SeoSettings, {
          settings: { emailNotifications: true, loginMaxRetries: 5 },
          onSave: async () => ({ success: true }),
        })
      )
    );
    expect(flat(container)).toContain(
      "Shown when sharing pages that have no featured image (homepage, blog listing, posts without thumbnails), while Basic SEO Meta Tags is on and no dedicated SEO plugin (such as Yoast SEO or Rank Math) is active. Recommended size: 1200×630px."
    );
    expect(flat(container)).not.toContain(
      "blog listing, posts without thumbnails). Recommended"
    );
  });
});

describe("MaintenanceSettings — Clear Site Cache (FB-3, T34)", () => {
  it("describes what is cleared without claiming every cache", () => {
    (wpApi as any).mockImplementation((url: string) => {
      if (url === "/system-logs") return Promise.resolve({ logs: [] });
      if (url === "/cache/status")
        return Promise.resolve({ detected: [], active: false });
      return Promise.resolve({});
    });
    const { container } = render(React.createElement(MaintenanceSettings));
    expect(flat(container)).toContain(
      "Clears the detected cache plugin's cache and any detected hosting cache, plus the object cache and the PHP code cache. Detected:"
    );
    expect(flat(container)).not.toContain("Purge all server and plugin caches");
  });
});

describe("SmtpSettings — 48-hour warning (FB-5, AC-14)", () => {
  const NOW = 1_800_000_000;
  const env = (wpCron: Record<string, unknown>) => ({
    competing_plugins: [],
    has_smtp_host: true,
    php_mail: {
      mail_function_exists: true,
      mail_function_disabled: false,
      mail_is_usable: true,
      disable_functions: [],
    },
    wp_cron: {
      next_daily_report_ts: NOW + 7200,
      last_scan_run_ts: NOW - 3 * 86400,
      disable_wp_cron: false,
      alternate_wp_cron: false,
      ...wpCron,
    },
    encryption_strength: "sodium",
    smtp_health: { timestamp: NOW - 120, status: "ok", context: "test_email" },
    server_time_ts: NOW,
  });

  async function mountCard(wpCron: Record<string, unknown>) {
    (wpApi as any).mockImplementation((url: string) => {
      if (url === "/smtp/settings")
        return Promise.resolve({
          host: "mail.yourdomain.com",
          port: 587,
          encryption: "tls",
          username: "mailer@example.com",
          fromEmail: "",
          fromName: "Example",
          hasPassword: false,
          passwordUnreadable: false,
        });
      if (url.startsWith("/smtp/environment"))
        return Promise.resolve(env(wpCron));
      return Promise.reject(new Error("unmocked " + url));
    });
    const view = render(provider(React.createElement(SmtpSettings)));
    await screen.findByText("Daily security report");
    return view;
  }

  it("AC-14: reports switched off - no 'wp-cron cannot fire' warning for a scan that is not scheduled", async () => {
    const { container } = await mountCard({ scan_report_enabled: false });
    expect(flat(container)).not.toContain(
      "The last scan is more than 48 hours old."
    );
  });

  it("AC-14 control: reports on and a 3-day-old scan - the warning is shown", async () => {
    const { container } = await mountCard({ scan_report_enabled: true });
    expect(flat(container)).toContain(
      "The last scan is more than 48 hours old."
    );
  });

  it("AC-14 control: an older server without the field keeps today's behaviour (warning shown)", async () => {
    const { container } = await mountCard({});
    expect(flat(container)).toContain(
      "The last scan is more than 48 hours old."
    );
  });
});
