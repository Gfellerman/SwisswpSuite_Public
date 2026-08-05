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
    const assetsBaseUrl = window.swisswpsuiteData?.assetsBaseUrl;

    // Returns true only when the given source URL is demonstrably inside this
    // plugin's own asset directory. A missing/empty assetsBaseUrl (e.g. a stale
    // cached bundle running against an older localized-data object) or a
    // missing source both fail closed — under-reporting is preferable to
    // mislabeling another plugin's error as a SwissSuite issue.
    const isOwnScript = (source: string): boolean => {
      if (!assetsBaseUrl || !source) return false;
      return source.includes(assetsBaseUrl);
    };

    const sendError = (payload: object) => {
      const data = window.swisswpsuiteData;
      if (!data?.apiUrl || !data?.nonce) return;
      const url = data.apiUrl + "/debug/js-error";
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
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </React.StrictMode>
    );
  }
} // end double-load guard
