/**
 * Settings screen retry and panel contract when GET /settings fails.
 *
 * Install path: plugin/src/pages/SettingsPage.retryContract.test.tsx
 *
 * Drives the real SettingsPage with the real useSettings() query and the real
 * panel list. Only `wpApi` (network boundary) and the toast module are
 * mocked. The settings request is answered from a handler the test swaps, so
 * a retry can be held in flight and settled by hand.
 *
 * Expected behaviour:
 *  - while "Try again" is in flight the load-error alert, the page heading and
 *    the panels that load their own data stay mounted, so text typed into the
 *    SMTP card is not lost;
 *  - "Try again" stays focused and reports itself unavailable with
 *    aria-disabled while the retry runs; a second click starts no second
 *    request;
 *  - when the retry succeeds the alert is gone and keyboard focus lands on
 *    the page heading, unless the user already moved it somewhere else;
 *  - a query that is paused (no network) with no data still shows the alert;
 *  - the diagnostics tab needs no settings payload, so it shows no alert and
 *    its panel renders.
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
let act: TL["act"];
let React: typeof import("react");
let QueryClient: any;
let QueryClientProvider: any;
let onlineManager: any;
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
  ({ render, screen, cleanup, fireEvent, waitFor, act } =
    await import("@testing-library/react"));
  ({ QueryClient, QueryClientProvider, onlineManager } =
    await import("@tanstack/react-query"));
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

interface Deferred {
  promise: Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

function deferred(): Deferred {
  let resolve!: (value: unknown) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<unknown>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const refused = () =>
  Promise.reject(
    new ApiErrorCtor("Authentication failed. Please refresh the page.", 403, {})
  );

let settingsHandler: () => Promise<unknown>;

function settingsCalls(): number {
  return (wpApi as any).mock.calls.filter((c: any[]) => c[0] === "/settings")
    .length;
}

function installApiMock() {
  (wpApi as any).mockImplementation((url: string) => {
    if (url === "/settings") return settingsHandler();
    if (url === "/smtp/settings") return Promise.resolve(SMTP_SETTINGS);
    if (url.startsWith("/smtp/environment")) {
      return Promise.reject(new Error("not needed in this test"));
    }
    if (url === "/selfcheck/last") {
      return Promise.resolve({ ran_at: null });
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

function renderAt(tab: string, queryOptions: Record<string, unknown> = {}) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, ...queryOptions },
      mutations: { retry: false },
    },
  });
  render(
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
  return qc;
}

const HOST_LABEL = /^smtp host|host/i;
const LOAD_ERROR = /settings could not be loaded/i;

/** Loads the General tab in the failed state and types into the SMTP card. */
async function failedGeneralTabWithTypedHost(
  queryOptions: Record<string, unknown> = {}
) {
  settingsHandler = refused;
  const qc = renderAt("general", queryOptions);
  await screen.findByText(LOAD_ERROR, {}, { timeout: 3000 });
  const host = (await screen.findByLabelText(HOST_LABEL)) as HTMLInputElement;
  fireEvent.change(host, { target: { value: "typed.example.com" } });
  expect(host.value).toBe("typed.example.com");
  const retry = screen.getByRole("button", { name: /try again/i });
  retry.focus();
  expect(document.activeElement).toBe(retry);
  return { host, retry, qc };
}

function pageHeading(): HTMLElement {
  return screen.getByRole("heading", { level: 1, name: "Settings" });
}

beforeEach(() => {
  settingsHandler = refused;
  (wpApi as any).mockReset();
  installApiMock();
});

afterEach(() => {
  cleanup();
  onlineManager.setOnline(true);
});

describe("SettingsPage: Try again while the retry is in flight", () => {
  it("keeps the alert, the heading, the typed SMTP text and the focus; ignores a second click", async () => {
    const { host, retry, qc } = await failedGeneralTabWithTypedHost();
    const pending = deferred();
    settingsHandler = () => pending.promise;
    const before = settingsCalls();
    const refetch = vi.spyOn(qc, "refetchQueries");

    fireEvent.click(retry);
    await waitFor(() => expect(settingsCalls()).toBe(before + 1));
    await waitFor(() => expect(retry).toHaveAttribute("aria-disabled", "true"));

    // The error view is still on screen; nothing was swapped for a spinner.
    expect(retry.isConnected).toBe(true);
    expect(screen.getByRole("alert")).toHaveTextContent(LOAD_ERROR);
    expect(pageHeading()).toBeInTheDocument();
    expect((screen.getByLabelText(HOST_LABEL) as HTMLInputElement).value).toBe(
      "typed.example.com"
    );
    expect(host.isConnected).toBe(true);
    expect(document.activeElement).toBe(retry);

    // A second click while the retry runs asks for nothing more. (The query
    // cache would join the running request anyway, so the request count alone
    // cannot tell; the spy on the refetch call can.)
    expect(refetch).toHaveBeenCalledTimes(1);
    fireEvent.click(retry);
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(settingsCalls()).toBe(before + 1);

    // The retry fails: the alert stays, the button is available again, and
    // focus never left it.
    await act(async () => {
      pending.reject(new ApiErrorCtor("Server error (HTTP 500)", 500, {}));
    });
    await waitFor(() =>
      expect(retry).toHaveAttribute("aria-disabled", "false")
    );
    expect(screen.getByRole("alert")).toHaveTextContent(LOAD_ERROR);
    expect(document.activeElement).toBe(retry);
    expect((screen.getByLabelText(HOST_LABEL) as HTMLInputElement).value).toBe(
      "typed.example.com"
    );
  });

  it("with the production retry policy (retry 2) the alert never gives way to the page spinner", async () => {
    const { retry } = await failedGeneralTabWithTypedHost({ retryDelay: 10 });
    const before = settingsCalls();

    fireEvent.click(retry);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
    });
    expect(settingsCalls()).toBeGreaterThan(before);
    expect(screen.getByRole("alert")).toHaveTextContent(LOAD_ERROR);
    expect(pageHeading()).toBeInTheDocument();

    await waitFor(
      () => expect(retry).toHaveAttribute("aria-disabled", "false"),
      { timeout: 3000 }
    );
    expect(screen.getByRole("alert")).toHaveTextContent(LOAD_ERROR);
    expect((screen.getByLabelText(HOST_LABEL) as HTMLInputElement).value).toBe(
      "typed.example.com"
    );
  });
});

describe("SettingsPage: Try again succeeds", () => {
  it("clears the alert, keeps the typed SMTP text and puts focus on the page heading", async () => {
    const { host, retry } = await failedGeneralTabWithTypedHost();
    const pending = deferred();
    settingsHandler = () => pending.promise;

    fireEvent.click(retry);
    await waitFor(() => expect(retry).toHaveAttribute("aria-disabled", "true"));
    await act(async () => {
      pending.resolve(settingsPayload());
    });

    expect(await screen.findByText("Email Notifications")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(LOAD_ERROR)).toBeNull());
    expect((screen.getByLabelText(HOST_LABEL) as HTMLInputElement).value).toBe(
      "typed.example.com"
    );
    expect(host.isConnected).toBe(true);
    await waitFor(() => expect(document.activeElement).toBe(pageHeading()));
  });

  it("does not take focus from a field the user moved to while the retry ran", async () => {
    const { host, retry } = await failedGeneralTabWithTypedHost();
    const pending = deferred();
    settingsHandler = () => pending.promise;

    fireEvent.click(retry);
    await waitFor(() => expect(retry).toHaveAttribute("aria-disabled", "true"));
    host.focus();
    expect(document.activeElement).toBe(host);
    await act(async () => {
      pending.resolve(settingsPayload());
    });

    expect(await screen.findByText("Email Notifications")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(LOAD_ERROR)).toBeNull());
    expect(document.activeElement).toBe(host);
  });

  it("a working first load never moves focus", async () => {
    settingsHandler = () => Promise.resolve(settingsPayload());
    renderAt("general");
    expect(await screen.findByText("Email Notifications")).toBeInTheDocument();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(document.activeElement).toBe(document.body);
  });
});

describe("SettingsPage: panels that need no settings payload", () => {
  it("offline with no data: the load-error alert still shows and Try again is not marked unavailable", async () => {
    settingsHandler = () => Promise.resolve(settingsPayload());
    onlineManager.setOnline(false);
    renderAt("seo");
    expect(await screen.findByText(LOAD_ERROR)).toBeInTheDocument();
    expect(screen.queryByTestId("render-crash")).toBeNull();
    expect(screen.getByRole("button", { name: /try again/i })).toHaveAttribute(
      "aria-disabled",
      "false"
    );
  });

  it("Diagnostics tab: no alert and the self-check panel renders without the settings payload", async () => {
    settingsHandler = refused;
    renderAt("diagnostics");
    expect(
      await screen.findByRole("button", { name: /run self-check/i })
    ).toBeInTheDocument();
    expect(screen.queryByText(LOAD_ERROR)).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByTestId("render-crash")).toBeNull();
  });
});
