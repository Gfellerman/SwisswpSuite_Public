import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { router } from "./lib/router";
import { ErrorBoundary } from "./components/ErrorBoundary";
import type { ErrorBoundaryReportPayload } from "./components/ErrorBoundary";
import { isOwnScript, sendError } from "./lib/errorReporting";
import "./index.css";

// ─── JS ERROR FORWARDING (module scope) ────────────────────────────────────
// isOwnScript()/sendError() moved to ./lib/errorReporting.ts (2026-08-17,
// TanStack-forwarding audit gap fix) — unchanged logic, imported from there
// so plugin/src/lib/queryClient.ts can reuse the same fail-closed
// attribution check and POST transport without a circular import
// (queryClient.ts -> index.tsx -> queryClient.ts). The window.onerror /
// unhandledrejection wiring below still lives here (DOM-global event
// wiring, not a reusable transport) — see the DOUBLE-LOAD GUARD comment
// further down for why it's registered only inside the guarded branch (it
// must not be registered twice on a duplicate script load).

// Reports a boundary-caught error using the same fail-closed attribution as
// the window handlers below: only forward when the error's OWN stack
// demonstrably references this plugin's asset URL (boundary-caught errors
// originate in our bundle, so their stack should reference it — a
// component-stack alone from an unrelated source is not sufficient
// evidence). If it doesn't pass, show the fallback UI but skip reporting —
// under-reporting beats mislabeling, this file's documented doctrine.
function reportBoundaryError(payload: ErrorBoundaryReportPayload): void {
  if (!isOwnScript(payload.stack)) return;
  sendError(payload);
}

const rootElement = document.getElementById("swisswpsuite-app-root");
if (!rootElement) {
  throw new Error(
    "Could not find root element (#swisswpsuite-app-root) to mount to"
  );
}

// ─── DOUBLE-LOAD GUARD ────────────────────────────────────────────────────────
// LiteSpeed Cache (and other caching plugins) can inject a second copy of the
// entry script without the WordPress ?ver= cache-buster, causing two
// RouterProvider instances to mount and crashing with "You cannot render a
// <Router> inside another <Router>". A DOM attribute on the root element is
// used as the guard (more reliable than a window flag — survives HMR reloads).
// Exception: in Vite dev mode (import.meta.hot is truthy), HMR replaces
// modules without reloading the page, so the attribute persists and would
// block legitimate re-mounts after source edits. Skip the guard during HMR;
// Vite replaces import.meta.hot with undefined in production builds, so the
// guard remains fully active in production.
if (!import.meta.hot && rootElement.hasAttribute("data-swisswpsuite-mounted")) {
  console.warn(
    "[SwissSuite] Duplicate script load detected — skipping re-initialization"
  );
} else {
  rootElement.setAttribute("data-swisswpsuite-mounted", "true");
  // ─────────────────────────────────────────────────────────────────────────────

  // ─── JS ERROR FORWARDING ──────────────────────────────────────────────────────
  // Catches unhandled JS errors and promise rejections THROWN BY THIS PLUGIN'S OWN
  // BUNDLE and forwards them to the PHP plugin log (visible in System Config → Logs).
  // These errors also trigger the email alert system. This is the primary tool for
  // detecting plugin JS conflicts — but window.onerror/unhandledrejection fire for
  // EVERY script on the page, not just this one, so every error/rejection is checked
  // against this plugin's own asset URL (localized as assetsBaseUrl by
  // class-swisswpsuite-admin.php) before being forwarded. Without this filter, a
  // completely unrelated plugin's JS error would be logged and alerted on as a
  // SwissSuite issue (4.3 fix — the filtering this comment used to merely claim to
  // do). log_js_error() (api-settings.php) re-validates the same on the server as a
  // defensive second layer, in case a stale cached bundle predates this filter.
  (function setupSwissErrorForwarder() {
    window.onerror = (message, source, lineno, colno, error) => {
      const sourceStr = String(source || "");
      if (isOwnScript(sourceStr)) {
        sendError({
          type: "onerror",
          message: String(message),
          source: sourceStr,
          lineno: lineno || 0,
          colno: colno || 0,
          stack: error?.stack || "",
        });
      }
      return false; // don't suppress default error handling
    };

    window.addEventListener("unhandledrejection", (event) => {
      const reason = event.reason;
      const stack: string = reason?.stack || "";
      // Promise rejections carry no `source` field at all — the stack trace is
      // the only available attribution signal. Only forward when a frame in
      // the stack demonstrably points into this plugin's own bundle.
      if (!isOwnScript(stack)) return;
      sendError({
        type: "unhandledrejection",
        message:
          reason?.message || String(reason) || "Unhandled Promise rejection",
        source: "",
        lineno: 0,
        colno: 0,
        stack,
      });
    });
  })();

  const root = ReactDOM.createRoot(rootElement);

  // Safety Check: Ensure window.swisswpsuiteData exists
  if (!window.swisswpsuiteData) {
    root.render(
      <div
        style={{
          padding: "20px",
          color: "#721c24",
          background: "#f8d7da",
          border: "1px solid #f5c6cb",
          borderRadius: "8px",
          margin: "20px",
        }}
      >
        <h2 style={{ marginTop: 0 }}>SwissSuite Error</h2>
        <p>
          Required configuration data (<code>swisswpsuiteData</code>) is
          missing. This usually happens if admin scripts are not enqueued
          correctly or if a caching/optimization plugin is interfering with
          JavaScript execution.
        </p>
        <p>Please try disabling any caching plugins or contact support.</p>
      </div>
    );
  } else {
    // v2.9.30.117: removed production console.log (no-op in built bundle)
    root.render(
      <React.StrictMode>
        <ErrorBoundary onReport={reportBoundaryError}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </ErrorBoundary>
      </React.StrictMode>
    );
  }
} // end double-load guard
