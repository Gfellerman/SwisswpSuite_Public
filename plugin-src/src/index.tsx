import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { router } from "./lib/router";
import "./index.css";

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
  // Catches ALL unhandled JS errors and promise rejections and forwards them to the
  // PHP plugin log (visible in System Config → Logs). These errors also trigger the
  // email alert system. This is the primary tool for detecting plugin JS conflicts.
  (function setupSwissErrorForwarder() {
    const sendError = (payload: object) => {
      const data = window.swisswpsuiteData;
      if (!data?.apiUrl || !data?.nonce) return;
      // Use sendBeacon for reliability — works even during page unload
      const blob = new Blob([JSON.stringify(payload)], {
        type: "application/json",
      });
      const url = data.apiUrl + "/debug/js-error";
      if (navigator.sendBeacon) {
        // sendBeacon doesn't send custom headers; use fetch with keepalive instead
      }
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": data.nonce,
        },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {
        /* never throw from the error reporter itself */
      });
    };

    window.onerror = (message, source, lineno, colno, error) => {
      // Ignore errors from other plugins' scripts (not swisswpsuite)
      sendError({
        type: "onerror",
        message: String(message),
        source: String(source || ""),
        lineno: lineno || 0,
        colno: colno || 0,
        stack: error?.stack || "",
      });
      return false; // don't suppress default error handling
    };

    window.addEventListener("unhandledrejection", (event) => {
      const reason = event.reason;
      sendError({
        type: "unhandledrejection",
        message:
          reason?.message || String(reason) || "Unhandled Promise rejection",
        source: "",
        lineno: 0,
        colno: 0,
        stack: reason?.stack || "",
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
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </React.StrictMode>
    );
  }
} // end double-load guard
