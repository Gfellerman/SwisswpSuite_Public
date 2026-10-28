/**
 * Signed screen texts of the SMTP card (U28-U33). Drives the real
 * SmtpSettings card with its real /smtp/settings and /smtp/environment
 * queries; only `wpApi` and the toast module are mocked. No JSX.
 *
 * Fixture: no saved password, the SiteGround preset, a failed last test
 * email, and a scheduled daily run, so every signed text is on screen.
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
let waitFor: TL["waitFor"];
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
  ({ render, screen, cleanup, waitFor } =
    await import("@testing-library/react"));
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

const ENV = {
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
  smtp_health: {
    status: "fail",
    timestamp: NOW - 120,
    context: "test_email",
    reason: "Connection refused",
  },
  server_time_ts: NOW,
};

const flat = (el: Element | null) =>
  (el?.textContent ?? "").replace(/\s+/g, " ").trim();

async function mountCard() {
  (wpApi as any).mockImplementation((url: string) => {
    if (url === "/smtp/settings") return Promise.resolve(SAVED);
    if (url.startsWith("/smtp/environment")) return Promise.resolve(ENV);
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
  // The environment query resolves after the settings query; the block
  // title below renders only once it has arrived.
  await screen.findByText("Daily security report");
  return view;
}

describe("SmtpSettings — signed texts U28-U33", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("positive control: the card rendered with its environment blocks", async () => {
    const { container } = await mountCard();
    expect(flat(container)).toContain("Daily security report");
    expect(flat(container)).toContain("Email Delivery (SMTP)");
  });

  it("U28: the status card is titled 'Last test email:' and the failure line names the test email", async () => {
    const { container } = await mountCard();
    const text = flat(container);
    expect(text).toContain("Last test email: FAILED");
    expect(text).toContain(
      "The last test email did not reach its destination. Run Send Test Email below to diagnose, or review the SMTP settings above."
    );
    expect(text).not.toContain("Last email send");
    expect(text).not.toContain("The last outgoing email");
  });

  it("U29: the report block names the daily run, says the schedule needs the reports switch, and the button emails the administrator", async () => {
    const { container } = await mountCard();
    const text = flat(container);
    expect(text).toContain("Next daily run:");
    expect(text).not.toContain("Next scheduled:");
    expect(text).toContain(
      "No report is sent on this schedule unless “Enable scheduled email reports” is switched on (Security → Scan → Scheduled Scan Report)."
    );
    const btn = screen.getByRole("button", {
      name: "Send report to administrator now",
    });
    expect(flat(btn)).toBe("Send Report to Administrator Now");
    expect(btn.getAttribute("title")).toBe(
      "Sends a security report to the WordPress administrator address now, whether or not scheduled reports are switched on."
    );
    expect(text).not.toContain("Send Daily Report Now");
    expect(
      screen.queryByRole("button", { name: "Send daily security report now" })
    ).toBeNull();
  });

  it("U30: with no saved password the help line says what to enter, not that it may be left blank", async () => {
    const { container } = await mountCard();
    const text = flat(container);
    expect(text).toContain("Enter the password for this SMTP account.");
    expect(text).not.toContain("Leave blank if your SMTP server does not");
  });

  it("U31: the From-address help says the username is used only when it is an email address", async () => {
    const { container } = await mountCard();
    expect(flat(container.querySelector("#smtp-from-email-help"))).toBe(
      "This is only the display sender address — it does not need its own SMTP account. Leave blank to use your SMTP username as the From address when the username is an email address."
    );
  });

  it("U32: the provider tip repeats the same condition", async () => {
    const { container } = await mountCard();
    expect(flat(container)).toContain(
      "make sure the From email and SMTP username are the same mailbox — or leave From email blank to let the plugin use the username automatically when it is an email address."
    );
  });

  it("U33: the preset help names the real 'Custom / Other' option and tells SiteGround and Bluehost users to enter their own host", async () => {
    const { container } = await mountCard();
    expect(flat(container)).toContain(
      "Selecting a preset fills in the host, port, and encryption for you. Choose “Custom / Other” to edit them manually. For SiteGround and Bluehost, choose “Custom / Other” and enter your own mail server name."
    );
    // The option the text points at exists in the preset list.
    const options = Array.from(container.querySelectorAll("select option")).map(
      (o) => flat(o)
    );
    expect(options).toContain("Custom / Other");
    expect(options).toContain("SiteGround");
    expect(options).toContain("Bluehost");
  });
});
