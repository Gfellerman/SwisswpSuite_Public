/**
 * S36 / S36b (truth-sweep lane SW-B): the SMTP status card says "test email"
 * only when the stored result came from a test email.
 *
 * Drives the real SmtpSettings card with its real /smtp/settings and
 * /smtp/environment queries; only `wpApi` and the toast module are mocked.
 * No JSX.
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";

vi.mock("../../../lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock("../../../services/api", () => ({
  wpApi: vi.fn(),
  ApiError: class ApiError extends Error {},
}));

type TL = typeof import("@testing-library/react");
let SmtpSettings: any;
let render: TL["render"];
let screen: TL["screen"];
let cleanup: TL["cleanup"];
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
  ({ SmtpSettings } = await import("./SmtpSettings"));
  ({ render, screen, cleanup } = await import("@testing-library/react"));
  ({ QueryClient, QueryClientProvider } =
    await import("@tanstack/react-query"));
  ({ wpApi } = await import("../../../services/api"));
  React = await import("react");
});

const NOW = 1_800_000_000;

const SAVED = {
  host: "mail.yourdomain.com",
  port: 587,
  encryption: "tls",
  username: "mailer@example.com",
  fromEmail: "",
  fromName: "Example",
  hasPassword: false,
  passwordUnreadable: false,
};

function envWith(health: Record<string, unknown>) {
  return {
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
      last_scan_run_ts: NOW - 3600,
      disable_wp_cron: false,
      alternate_wp_cron: false,
    },
    encryption_strength: "sodium",
    smtp_health: { timestamp: NOW - 120, ...health },
    server_time_ts: NOW,
  };
}

const flat = (el: Element | null) =>
  (el?.textContent ?? "").replace(/\s+/g, " ").trim();

async function mountCard(health: Record<string, unknown>) {
  (wpApi as any).mockImplementation((url: string) => {
    if (url === "/smtp/settings") return Promise.resolve(SAVED);
    if (url.startsWith("/smtp/environment"))
      return Promise.resolve(envWith(health));
    return Promise.reject(new Error(`unmocked ${url}`));
  });
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const view = render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(SmtpSettings)
    )
  );
  await screen.findByText("Daily security report");
  return view;
}

const GENERIC_FAIL =
  "The last email did not reach its destination. Run Send Test Email below to diagnose, or review the SMTP settings above.";
const TEST_FAIL =
  "The last test email did not reach its destination. Run Send Test Email below to diagnose, or review the SMTP settings above.";

describe("SmtpSettings status card — S36, S36b", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("a failed result from the automated report reads 'Last email:' with the generic failure line", async () => {
    const { container } = await mountCard({
      status: "fail",
      context: "daily_security_report",
      reason: "Connection refused",
    });
    const text = flat(container);
    expect(text).toContain("Last email: FAILED");
    expect(text).toContain(GENERIC_FAIL);
    expect(text).not.toContain("Last test email");
    expect(text).not.toContain("The last test email did not reach");
  });

  it("a result stored without a context also gets the generic wording", async () => {
    const { container } = await mountCard({ status: "fail" });
    const text = flat(container);
    expect(text).toContain("Last email: FAILED");
    expect(text).toContain(GENERIC_FAIL);
    expect(text).not.toContain("Last test email");
  });

  it("a successful result that is not from a test email reads 'Last email: succeeded'", async () => {
    const { container } = await mountCard({
      status: "ok",
      context: "daily_security_report",
    });
    expect(flat(container)).toContain("Last email: succeeded");
    expect(flat(container)).not.toContain("Last test email");
  });

  it("control: a result from a test email keeps 'Last test email:' and the signed test line", async () => {
    const { container } = await mountCard({
      status: "fail",
      context: "test_email",
      reason: "Connection refused",
    });
    const text = flat(container);
    expect(text).toContain("Last test email: FAILED");
    expect(text).toContain(TEST_FAIL);
    expect(text).not.toContain("Last email:");
  });
});
