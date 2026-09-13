/**
 * Vitest coverage for the toast store and renderer.
 *
 * React-externalization workaround (read before editing): this codebase
 * externalizes React (WP.org Guideline 13, 2026-08-12) — vite.config.ts's
 * resolve.alias redirects every `import ... from "react"` to a proxy module
 * under src/vendor-shims/ that reads WordPress's already-loaded
 * `window.React` global at import time. There is no real WP admin page
 * loading that global in this jsdom test environment, and "zustand"'s
 * `create()` transitively needs "react" (it returns a React hook), so this
 * file follows the same pattern as queryClient.test.ts /
 * SelfCheckPanel.test.tsx: stamp the REAL npm react/react-dom onto
 * `window.React`/`window.ReactDOM` in `beforeAll`, then `await import(...)`
 * the modules under test — a plain top-level `import` is hoisted and
 * evaluated before this file's own body runs, which would defeat the stamp.
 *
 * Covers the three behaviours named in the task brief: enqueue, auto-dismiss
 * (default 4000ms duration, `Infinity` disables it, pause-on-hover leaves it
 * present), and dismiss by id (both via `toast.dismiss(id)` and via the
 * rendered dismiss button).
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  vi,
} from "vitest";

type ToastModule = typeof import("./toast");
type ToasterModule = typeof import("../components/atoms/Toaster");
type TestingLibraryModule = typeof import("@testing-library/react");
type ReactModule = typeof import("react");

let toast: ToastModule["toast"];
let useToastStore: ToastModule["useToastStore"];
let Toaster: ToasterModule["Toaster"];
let render: TestingLibraryModule["render"];
let screen: TestingLibraryModule["screen"];
let cleanup: TestingLibraryModule["cleanup"];
let fireEvent: TestingLibraryModule["fireEvent"];
let act: TestingLibraryModule["act"];
let React: ReactModule;

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  const RealReact = nodeRequire("react");
  const RealReactDOM = nodeRequire("react-dom");
  const RealReactDOMClient = nodeRequire("react-dom/client");
  window.React = RealReact;
  window.ReactDOM = { ...RealReactDOM, ...RealReactDOMClient };

  ({ toast, useToastStore } = await import("./toast"));
  ({ Toaster } = await import("../components/atoms/Toaster"));
  ({ render, screen, cleanup, fireEvent, act } =
    await import("@testing-library/react"));
  React = await import("react");
});

beforeEach(() => {
  vi.useFakeTimers();
  useToastStore.setState({ toasts: [] });
});

afterEach(() => {
  cleanup();
  useToastStore.setState({ toasts: [] });
  vi.useRealTimers();
});

describe("toast store — enqueue", () => {
  it("push() (via toast.success) adds a record and returns a usable id", () => {
    const id = toast.success("Saved");
    expect(typeof id).toBe("string");
    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().toasts[0]).toMatchObject({
      id,
      variant: "success",
      message: "Saved",
    });
  });

  it("defaults to a 4000ms duration when none is passed", () => {
    toast.info("Heads up");
    expect(useToastStore.getState().toasts[0].duration).toBe(4000);
  });

  it("keeps an explicit duration option, including Infinity", () => {
    toast.warning("Wait", { duration: Infinity });
    expect(useToastStore.getState().toasts[0].duration).toBe(Infinity);
  });
});

describe("toast store — dismiss by id", () => {
  it("toast.dismiss(id) removes exactly that record", () => {
    const keep = toast.success("Keep me");
    const remove = toast.error("Remove me");
    toast.dismiss(remove);
    const remaining = useToastStore.getState().toasts;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(keep);
  });
});

describe("Toaster — rendered auto-dismiss behaviour", () => {
  it("renders a success toast in a polite status region and auto-dismisses after 4000ms", () => {
    render(React.createElement(Toaster));
    act(() => {
      toast.success("All good");
    });
    const region = screen.getByRole("status");
    expect(region).toHaveTextContent("All good");

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.queryByText("All good")).not.toBeInTheDocument();
  });

  it("renders an error toast as an alert region", () => {
    render(React.createElement(Toaster));
    act(() => {
      toast.error("Something broke");
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Something broke");
  });

  it("never auto-dismisses a toast opened with duration: Infinity", () => {
    render(React.createElement(Toaster));
    act(() => {
      toast.info("Still working…", { duration: Infinity });
    });
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByText("Still working…")).toBeInTheDocument();
  });

  it("the dismiss button removes its own toast immediately", () => {
    render(React.createElement(Toaster));
    act(() => {
      toast.warning("Careful");
    });
    fireEvent.click(
      screen.getByRole("button", { name: /dismiss notification/i })
    );
    expect(screen.queryByText("Careful")).not.toBeInTheDocument();
  });
});
