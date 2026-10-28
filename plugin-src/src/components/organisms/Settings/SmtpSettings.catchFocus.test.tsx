/**
 * SMTP "Send Test Email" failure: focus hand-off and environment refresh.
 *
 * Install path:
 *   plugin/src/components/organisms/Settings/SmtpSettings.catchFocus.test.tsx
 *
 * A failed test comes back as a non-2xx answer, so wpApi throws an ApiError
 * that carries the parsed body. Drives the real SmtpSettings through its real
 * "Send Test Email" button; only `wpApi` and the toast module are mocked.
 *
 * Expected behaviour:
 *  - a body whose rootCause is password_decrypt_failed moves keyboard focus to
 *    the "Change" password button, so the user lands on the remedy;
 *  - any body with a rootCause makes the card re-read the server environment
 *    (a competing plugin may have been deactivated meanwhile);
 *  - a failure with no rootCause leaves the focus alone and does not re-read
 *    the environment.
 *
 * React externalisation workaround as in DashboardTrafficIndicator.test.tsx.
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

vi.mock("../../../lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock("../../../services/api", () => ({
  wpApi: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    data?: any;
    constructor(message: string, status: number, data?: any) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.data = data;
    }
  },
}));

type TL = typeof import("@testing-library/react");
let SmtpSettings: any;
let render: TL["render"];
let screen: TL["screen"];
let cleanup: TL["cleanup"];
let fireEvent: TL["fireEvent"];
let waitFor: TL["waitFor"];
let React: typeof import("react");
let QueryClient: any;
let QueryClientProvider: any;
let wpApi: any;
let ApiErrorCtor: any;

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  window.React = nodeRequire("react");
  window.ReactDOM = {
    ...nodeRequire("react-dom"),
    ...nodeRequire("react-dom/client"),
  };
  ({ SmtpSettings } = await import("./SmtpSettings"));
  ({ render, screen, cleanup, fireEvent, waitFor } =
    await import("@testing-library/react"));
  ({ QueryClient, QueryClientProvider } =
    await import("@tanstack/react-query"));
  ({ wpApi, ApiError: ApiErrorCtor } = await import("../../../services/api"));
  React = await import("react");
});

const SAVED = {
  host: "smtp.example.com",
  port: 587,
  encryption: "tls",
  username: "mailer@example.com",
  fromEmail: "mailer@example.com",
  fromName: "Example",
  hasPassword: true,
  passwordUnreadable: false,
};

function diagnostics(extra: Record<string, unknown> = {}) {
  return {
    smtp_host: "smtp.example.com",
    smtp_port: 587,
    smtp_encryption: "tls",
    smtp_username: "mailer@example.com",
    smtp_from: "mailer@example.com",
    password_saved: true,
    phpmailer_is_smtp: false,
    phpmailer_host: "",
    phpmailer_port: 0,
    phpmailer_smtp_secure: "",
    phpmailer_smtp_auth: false,
    phpmailer_from: "",
    phpmailer_password_length: 0,
    wp_error_messages: [],
    throw_message: "",
    ...extra,
  };
}

let testOutcome: () => Promise<unknown>;
let environmentCalls = 0;

beforeEach(() => {
  environmentCalls = 0;
  (wpApi as any).mockReset();
  (wpApi as any).mockImplementation((url: string) => {
    if (url === "/smtp/settings") return Promise.resolve(SAVED);
    if (url.startsWith("/smtp/environment")) {
      environmentCalls += 1;
      return Promise.resolve({
        competing_plugins: [],
        php_mail: {
          mail_function_exists: true,
          mail_function_disabled: false,
          mail_is_usable: true,
          disable_functions: [],
        },
        wp_cron: { next_daily_report_ts: 0, last_scan_run_ts: 0 },
        encryption_strength: "openssl",
      });
    }
    if (url.startsWith("/smtp/test")) return testOutcome();
    return Promise.reject(new Error(`unmocked ${url}`));
  });
});

afterEach(() => {
  cleanup();
});

function mount() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(SmtpSettings)
    )
  );
}

/** Waits for the saved settings and the first environment read, then clicks Send. */
async function sendTestEmail(): Promise<number> {
  await waitFor(() =>
    expect(screen.getByLabelText(/smtp host|host/i)).toBeInTheDocument()
  );
  await waitFor(() => expect(environmentCalls).toBeGreaterThan(0));
  const sendButton = await screen.findByRole("button", {
    name: /send test email/i,
  });
  await waitFor(() => expect(sendButton).not.toBeDisabled());
  const before = environmentCalls;
  fireEvent.click(sendButton);
  return before;
}

describe("SmtpSettings: a failed test email", () => {
  it("password_decrypt_failed: focus moves to the Change button and the environment is read again", async () => {
    testOutcome = () =>
      Promise.reject(
        new ApiErrorCtor("Your saved SMTP password could not be read.", 400, {
          success: false,
          message: "Your saved SMTP password could not be read.",
          rootCause: "password_decrypt_failed",
          diagnostics: diagnostics(),
        })
      );
    mount();
    const before = await sendTestEmail();

    await waitFor(() =>
      expect(document.activeElement?.id).toBe("smtp-change-password-btn")
    );
    await waitFor(() => expect(environmentCalls).toBeGreaterThan(before));
  });

  it("another rootCause: the environment is read again and focus stays where it was", async () => {
    testOutcome = () =>
      Promise.reject(
        new ApiErrorCtor("Mail could not be sent.", 502, {
          success: false,
          message: "Mail could not be sent.",
          rootCause: "silent_failure",
          diagnostics: diagnostics(),
        })
      );
    mount();
    const before = await sendTestEmail();

    await waitFor(() => expect(environmentCalls).toBeGreaterThan(before));
    await screen.findByRole("button", { name: /show technical details/i });
    expect(document.activeElement?.id).not.toBe("smtp-change-password-btn");
  });

  it("no rootCause: focus is left alone and the environment is not read again", async () => {
    testOutcome = () =>
      Promise.reject(
        new ApiErrorCtor("Server error (HTTP 500)", 500, {
          success: false,
          message: "Server error (HTTP 500)",
          diagnostics: diagnostics({ throw_message: "boom" }),
        })
      );
    mount();
    const before = await sendTestEmail();

    await screen.findByRole("button", { name: /show technical details/i });
    expect(environmentCalls).toBe(before);
    expect(document.activeElement?.id).not.toBe("smtp-change-password-btn");
  });
});
