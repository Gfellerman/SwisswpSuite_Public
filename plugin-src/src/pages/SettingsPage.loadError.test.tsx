/**
 * Settings screen when GET /settings fails (V63-V6-1).
 *
 * Install path: plugin/src/pages/SettingsPage.loadError.test.tsx
 *
 * Drives the real SettingsPage with the real useSettings() query and the real
 * panel list. Only `wpApi` (network boundary) and the toast module are
 * mocked. GET /settings rejects with the error wpApi throws for a refused
 * nonce, so the query settles with no data.
 *
 * Expected behaviour:
 *  - the SEO tab does not throw (the page stays mounted);
 *  - every tab whose panels need the settings payload shows one alert that
 *    the settings could not be loaded, with a "Try again" button;
 *  - no switch is drawn at a made-up OFF value on the General tab;
 *  - panels that load their own data (the SMTP card) still render;
 *  - "Try again" refetches and, on success, the real panels appear.
 *
 * React is externalised in this codebase, so the real react/react-dom are
 * stamped onto window before any aliased import runs (same pattern as
 * DashboardTrafficIndicator.test.tsx). No JSX: React.createElement only.
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

vi.mock("../services/api", () => ({
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
let SettingsPage: any;
let render: TL["render"];
let screen: TL["screen"];
let cleanup: TL["cleanup"];
let fireEvent: TL["fireEvent"];
let waitFor: TL["waitFor"];
let React: typeof import("react");
let QueryClient: any;
let QueryClientProvider: any;
let MemoryRouter: any;
let wpApi: any;
let ApiErrorCtor: any;

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  window.React = nodeRequire("react");
  window.ReactDOM = {
    ...nodeRequire("react-dom"),
    ...nodeRequire("react-dom/client"),
  };
  ({ default: SettingsPage } = await import("./SettingsPage"));
  ({ render, screen, cleanup, fireEvent, waitFor } = await import(
    "@testing-library/react"
  ));
  ({ QueryClient, QueryClientProvider } = await import(
    "@tanstack/react-query"
  ));
  ({ MemoryRouter } = await import("react-router-dom"));
  ({ wpApi, ApiError: ApiErrorCtor } = await import("../services/api"));
  React = await import("react");
});

const SMTP_SETTINGS = {
  host: "",
  port: 587,
  encryption: "tls",
  username: "",
  fromEmail: "",
  fromName: "",
  hasPassword: false,
  passwordUnreadable: false,
};

function settingsPayload() {
  return {
    emailNotifications: true,
    pageviewTrackingEnabled: true,
    alertDigestFrequency: "daily",
    alertEmail: "admin@example.com",
    seoDefaultOgImage: 0,
    sitemapEnabled: true,
    llmsTxtEnabled: false,
    seoMetaInjectionEnabled: true,
    coreIntegrityEnabled: false,
    abandonedPluginCheckEnabled: false,
    settings_version: "v1",
  };
}

let settingsShouldFail = true;

function installApiMock() {
  (wpApi as any).mockImplementation((url: string) => {
    if (url === "/settings") {
      return settingsShouldFail
        ? Promise.reject(
            new ApiErrorCtor(
              "Authentication failed. Please refresh the page.",
              403,
              {}
            )
          )
        : Promise.resolve(settingsPayload());
    }
    if (url === "/smtp/settings") return Promise.resolve(SMTP_SETTINGS);
    if (url.startsWith("/smtp/environment")) {
      return Promise.reject(new Error("not needed in this test"));
    }
    return Promise.reject(new Error(`unmocked ${url}`));
  });
}

/** Records a render error instead of letting it unmount the tree. */
let CatchBoundary: any = null;
function getCatchBoundary() {
  if (CatchBoundary) return CatchBoundary;
  CatchBoundary = class extends React.Component<
    { children: any },
    { error: Error | null }
  > {
    constructor(props: any) {
      super(props);
      this.state = { error: null };
    }
    static getDerivedStateFromError(error: Error) {
      return { error };
    }
    render() {
      if (this.state.error) {
        return React.createElement(
          "div",
          { "data-testid": "render-crash" },
          String(this.state.error)
        );
      }
      return this.props.children;
    }
  };
  return CatchBoundary;
}

function renderAt(tab: string) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(
        MemoryRouter,
        { initialEntries: [`/settings?tab=${tab}`] },
        React.createElement(
          getCatchBoundary(),
          null,
          React.createElement(SettingsPage)
        )
      )
    )
  );
}

const LOAD_ERROR = /settings could not be loaded/i;

beforeEach(() => {
  settingsShouldFail = true;
  (wpApi as any).mockReset();
  installApiMock();
});

afterEach(() => {
  cleanup();
});

describe("SettingsPage when GET /settings fails", () => {
  it("SEO tab: no render crash, one load-error alert with Try again", async () => {
    renderAt("seo");
    const alert = await screen.findByText(LOAD_ERROR);
    expect(alert).toBeInTheDocument();
    expect(screen.queryByTestId("render-crash")).toBeNull();
    expect(
      screen.getByRole("button", { name: /try again/i })
    ).toBeInTheDocument();
  });

  it("General tab: shows the alert and draws no preference switch at a made-up value", async () => {
    renderAt("general");
    expect(await screen.findByText(LOAD_ERROR)).toBeInTheDocument();
    expect(screen.queryByText("Email Notifications")).toBeNull();
    expect(screen.queryByTestId("render-crash")).toBeNull();
  });

  it("General tab: the SMTP card, which loads its own data, still renders", async () => {
    renderAt("general");
    await screen.findByText(LOAD_ERROR);
    expect(
      await screen.findByRole("button", { name: /send test email/i })
    ).toBeInTheDocument();
  });

  it("Security and Maintenance tabs: alert shown, no crash", async () => {
    for (const tab of ["security", "maintenance"]) {
      renderAt(tab);
      expect(await screen.findByText(LOAD_ERROR)).toBeInTheDocument();
      expect(screen.queryByTestId("render-crash")).toBeNull();
      cleanup();
    }
  });

  it("Try again refetches GET /settings and shows the real panels on success", async () => {
    renderAt("general");
    await screen.findByText(LOAD_ERROR);
    const before = (wpApi as any).mock.calls.filter(
      (c: any[]) => c[0] === "/settings"
    ).length;
    settingsShouldFail = false;
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(await screen.findByText("Email Notifications")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(LOAD_ERROR)).toBeNull());
    const after = (wpApi as any).mock.calls.filter(
      (c: any[]) => c[0] === "/settings"
    ).length;
    expect(after).toBeGreaterThan(before);
  });

  it("control: with a working GET /settings no load-error alert is shown", async () => {
    settingsShouldFail = false;
    renderAt("general");
    expect(await screen.findByText("Email Notifications")).toBeInTheDocument();
    expect(screen.queryByText(LOAD_ERROR)).toBeNull();
  });
});
