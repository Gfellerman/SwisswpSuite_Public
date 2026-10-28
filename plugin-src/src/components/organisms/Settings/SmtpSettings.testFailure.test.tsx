/**
 * SMTP "Send Test Email" failure diagnostics (V63-V6-4).
 *
 * Install path: plugin/src/components/organisms/Settings/SmtpSettings.testFailure.test.tsx
 *
 * Every failure answer of POST /smtp/test is non-2xx (400 password_decrypt_failed,
 * 400 port_blocked, 502 no_smtp_server_mail_failed, 500 throw, 502 generic
 * failure path; class-swisswpsuite-api-settings.php send_smtp_test_email()).
 * wpApi() throws an ApiError for those and keeps the parsed body on
 * `err.data`. The card must still show the root-cause help and the
 * technical-details disclosure built from that body.
 *
 * Drives the real SmtpSettings card with its real /smtp/settings query;
 * only `wpApi` and the toast module are mocked. No JSX.
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
let toastMod: any;

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  window.React = nodeRequire("react");
  window.ReactDOM = {
    ...nodeRequire("react-dom"),
    ...nodeRequire("react-dom/client"),
  };
  ({ SmtpSettings } = await import("./SmtpSettings"));
  ({ render, screen, cleanup, fireEvent, waitFor } = await import(
    "@testing-library/react"
  ));
  ({ QueryClient, QueryClientProvider } = await import(
    "@tanstack/react-query"
  ));
  ({ wpApi, ApiError: ApiErrorCtor } = await import("../../../services/api"));
  toastMod = await import("../../../lib/toast");
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
    wp_error_messages: ["fsockopen refused"],
    throw_message: "",
    ...extra,
  };
}

let testOutcome: () => Promise<unknown>;

function installApiMock() {
  (wpApi as any).mockImplementation((url: string) => {
    if (url === "/smtp/settings") return Promise.resolve(SAVED);
    if (url.startsWith("/smtp/environment")) {
      return Promise.reject(new Error("not needed in this test"));
    }
    if (url.startsWith("/smtp/test")) return testOutcome();
    return Promise.reject(new Error(`unmocked ${url}`));
  });
}

function renderCard() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(SmtpSettings)
    )
  );
}

async function clickSendTest() {
  const btn = await screen.findByRole("button", { name: /send test email/i });
  await waitFor(() => expect(btn).not.toBeDisabled());
  fireEvent.click(btn);
}

beforeEach(() => {
  (wpApi as any).mockReset();
  (toastMod.toast.error as any).mockClear();
  installApiMock();
});

afterEach(() => {
  cleanup();
});

describe("SmtpSettings: failed test send", () => {
  it("400 password_decrypt_failed: shows the password help card and the details disclosure", async () => {
    testOutcome = () =>
      Promise.reject(
        new ApiErrorCtor("Your saved SMTP password cannot be decrypted.", 400, {
          success: false,
          message: "Your saved SMTP password cannot be decrypted.",
          rootCause: "password_decrypt_failed",
          diagnostics: diagnostics({ wp_error_messages: [] }),
        })
      );
    renderCard();
    await clickSendTest();
    expect(
      await screen.findByText(/your saved password can.t be read/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /show technical details/i })
    ).toBeInTheDocument();
  });

  it("400 port_blocked: the details disclosure opens and lists the server error", async () => {
    testOutcome = () =>
      Promise.reject(
        new ApiErrorCtor("Cannot reach smtp.example.com:587", 400, {
          success: false,
          message: "Cannot reach smtp.example.com:587",
          rootCause: "port_blocked",
          diagnostics: diagnostics(),
        })
      );
    renderCard();
    await clickSendTest();
    const toggle = await screen.findByRole("button", {
      name: /show technical details/i,
    });
    fireEvent.click(toggle);
    expect(await screen.findByText(/fsockopen refused/)).toBeInTheDocument();
    expect(screen.getByText(/cannot reach smtp\.example\.com:587/i)).toBeInTheDocument();
  });

  it("502 generic failure with diagnostics: disclosure shown", async () => {
    testOutcome = () =>
      Promise.reject(
        new ApiErrorCtor("PHPMailer did not enter SMTP mode", 502, {
          success: false,
          message: "PHPMailer did not enter SMTP mode",
          rootCause: "not_smtp_mode",
          diagnostics: diagnostics(),
        })
      );
    renderCard();
    await clickSendTest();
    expect(
      await screen.findByRole("button", { name: /show technical details/i })
    ).toBeInTheDocument();
  });

  it("malformed diagnostics in the error body never crash the card", async () => {
    testOutcome = () =>
      Promise.reject(
        new ApiErrorCtor("Odd failure", 502, {
          success: false,
          message: "Odd failure",
          rootCause: "silent_failure",
          diagnostics: { smtp_host: "x" },
        })
      );
    renderCard();
    await clickSendTest();
    expect(await screen.findByText("Odd failure")).toBeInTheDocument();
    const toggle = screen.queryByRole("button", {
      name: /show technical details/i,
    });
    if (toggle) fireEvent.click(toggle);
    expect(screen.getByText("Odd failure")).toBeInTheDocument();
  });

  it("control: a network error with no body keeps today's message-only result", async () => {
    testOutcome = () => Promise.reject(new Error("Failed to fetch"));
    renderCard();
    await clickSendTest();
    expect(await screen.findByText("Failed to fetch")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /show technical details/i })
    ).toBeNull();
  });
});
