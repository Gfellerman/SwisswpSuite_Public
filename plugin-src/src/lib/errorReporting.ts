/**
 * SwissSuite AI - The Ultimate All-in-One WordPress Plugin
 *
 * @package   SwissSuite_AI
 * @author    Swisswpsecure Team <info@swisswpsecure.com>
 * @license   GPL-2.0+
 * @link      https://www.swisswpsecure.com
 * @copyright 2026 Swisswpsecure Team
 */

/**
 * Shared JS-error-forwarding transport.
 *
 * Hoisted out of index.tsx (2026-08-17, TanStack-forwarding audit gap fix:
 * "failed API calls a component doesn't render are logged nowhere") so
 * plugin/src/lib/queryClient.ts can reuse the exact same fail-closed
 * attribution check and POST transport that index.tsx's window.onerror /
 * unhandledrejection handlers and the ErrorBoundary already use — without
 * creating a circular import (queryClient.ts -> index.tsx -> queryClient.ts,
 * since index.tsx imports queryClient). Logic is UNCHANGED from the
 * index.tsx originals; index.tsx now imports both functions from here. See
 * index.tsx for the window.onerror / unhandledrejection wiring, which stays
 * there (it's DOM-global event wiring, not a reusable transport).
 */

// Returns true only when the given source/stack string is demonstrably
// inside this plugin's own asset directory. A missing/empty assetsBaseUrl
// (e.g. a stale cached bundle running against an older localized-data
// object) or a missing source/stack both fail closed — under-reporting is
// preferable to mislabeling another plugin's error (or, for the boundary,
// an error whose true origin can't be verified) as a SwissSuite issue.
export function isOwnScript(source: string): boolean {
  const assetsBaseUrl = window.swisswpsuiteData?.assetsBaseUrl;
  if (!assetsBaseUrl || !source) return false;
  return source.includes(assetsBaseUrl);
}

export function sendError(payload: object): void {
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
}
