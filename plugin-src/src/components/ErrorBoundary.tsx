import React from "react";
import { Button } from "./ui/Button";

/**
 * Payload shape reported to `onReport` — deliberately identical to the
 * fields index.tsx's `sendError()` already POSTs to
 * `{apiUrl}/debug/js-error` for window.onerror/unhandledrejection, so the
 * server-side handler (log_js_error() in
 * plugin/includes/api/class-swisswpsuite-api-settings.php) needs no change:
 * it re-validates `source`/`stack` against the plugin's own asset URL and
 * stores/alerts unchanged. `type: "react-boundary"` is a new, distinct
 * value from the existing "onerror"/"unhandledrejection" so a
 * render/commit-phase failure is distinguishable in the log from a plain
 * runtime error.
 */
export interface ErrorBoundaryReportPayload {
  type: "react-boundary";
  message: string;
  source: string;
  lineno: number;
  colno: number;
  stack: string;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /**
   * Called once per catch with a report-ready payload. Transport-agnostic
   * by design — this component knows nothing about fetch, nonces, or the
   * plugin's REST API; the caller decides how (or whether) to forward the
   * report. Keeps this component trivially unit-testable in isolation.
   */
  onReport?: (payload: ErrorBoundaryReportPayload) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Top-level render/commit-phase error boundary for the SwissSuite admin SPA.
 *
 * Closes an audit gap: without this, an uncaught render-phase error
 * ANYWHERE in the component tree unmounts the entire admin SPA to a blank
 * white screen, with no report ever reaching the plugin's own error log
 * (System Config → Logs) or the email alert system it feeds.
 *
 * React error boundaries can ONLY be implemented as class components —
 * `getDerivedStateFromError`/`componentDidCatch` have no hook equivalent as
 * of React 19 — this is the one legitimate exception to the codebase's
 * function-component convention.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private containerRef = React.createRef<HTMLDivElement>();

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.props.onReport?.({
      type: "react-boundary",
      message: error.message || "Unknown React render error",
      source: "",
      lineno: 0,
      colno: 0,
      stack:
        (error.stack || "") +
        "\n--- componentStack ---" +
        errorInfo.componentStack,
    });
  }

  componentDidMount(): void {
    // Covers the most common real-world case: the error is thrown during
    // this subtree's very FIRST render (e.g. a bug on initial page load).
    // React never commits that failed attempt, so from the class component's
    // own lifecycle perspective this fallback render — already reflecting
    // getDerivedStateFromError's hasError:true — IS the initial mount, not
    // an update; componentDidUpdate (below) does not fire for it. See that
    // method's comment for why focus goes to the container rather than the
    // "Reload page" button.
    if (this.state.hasError) {
      this.containerRef.current?.focus();
    }
  }

  componentDidUpdate(_prevProps: ErrorBoundaryProps, prevState: ErrorBoundaryState): void {
    // Covers the other case: children rendered successfully at least once
    // and a LATER update throws (prevState.hasError false -> true) — here
    // componentDidMount already ran (for the earlier, successful render),
    // so this is the only place that transition is observable. Together
    // with componentDidMount above, this ensures focus always lands on the
    // fallback container regardless of when the boundary trips. Focus goes
    // to the alert CONTAINER, not the "Reload page" button, because
    // Button.tsx does not forward refs — moving focus here is still
    // immediately useful, since role="alert" means the container's content
    // is announced by assistive tech as soon as it receives focus, and Tab
    // from here reaches the button in one step.
    if (!prevState.hasError && this.state.hasError) {
      this.containerRef.current?.focus();
    }
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center p-6">
        <div
          ref={this.containerRef}
          role="alert"
          tabIndex={-1}
          className="bg-card border-border max-w-md rounded-2xl border p-8 text-center shadow-lg"
        >
          <h1 className="text-neutral-900 dark:text-foreground mb-3 text-lg font-bold">
            Something went wrong in the SwissSuite admin interface
          </h1>
          <p className="text-neutral-700 dark:text-muted-foreground mb-2 text-sm">
            Your site is <strong>NOT affected</strong> — this is only the
            admin panel view. Reloading the page usually resolves this.
          </p>
          <p className="text-neutral-700 dark:text-muted-foreground mb-6 text-xs">
            If the problem persists after reloading, please contact support.
          </p>
          <Button variant="primary" onClick={this.handleReload}>
            Reload page
          </Button>
        </div>
      </div>
    );
  }
}
