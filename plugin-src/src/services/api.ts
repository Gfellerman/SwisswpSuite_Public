/**
 * Authored by: Backend Specialist
 * Skills: api-patterns, typescript-expert
 * Date: 2026-02-17
 * 
 * WordPress REST API Wrapper
 * Handles nonce injection, base URL resolution, and centralized error handling.
 */

// We rely on the global Window interface defined in ../types.ts
// which includes swisswpsuiteData.

/**
 * Custom error class for API failures
 * Captures HTTP status and backend error messages
 */
export class ApiError extends Error {
    public status: number;
    public data: any;

    constructor(message: string, status: number, data?: any) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

/**
 * Validates availability of critical WordPress context data
 * @throws Error if nonce or API URL is missing
 */
function getWpContext(): { nonce: string; baseUrl: string } {
    const data = window.swisswpsuiteData;

    if (!data) {
        // Fallback for development/testing environments outside WP
        // @ts-ignore - import.meta.env is provided by Vite but might need types
        if (import.meta.env && import.meta.env.DEV) {
            console.warn('WP Context missing, using mock data for dev');
            return { nonce: 'mock-nonce', baseUrl: 'http://localhost/wp-json/swisswpsuite/v1' };
        }
        throw new Error('Critical: WordPress context (swisswpsuiteData) is missing.');
    }

    if (!data.nonce || !data.apiUrl) {
        throw new Error('Critical: WordPress API configuration is incomplete.');
    }

    return { nonce: data.nonce, baseUrl: data.apiUrl };
}

/**
 * Generic API wrapper for WordPress REST endpoints
 * Automatically injects X-WP-Nonce header
 * 
 * @template T - The expected response type
 * @param endpoint - The API endpoint path (e.g., '/security/scan')
 * @param options - Standard fetch options
 * @returns Promise resolving to the typed response data
 */
export async function wpApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const { nonce, baseUrl } = getWpContext();

    // Ensure endpoint starts with / if not present (unless it's a full URL)
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${baseUrl}${cleanEndpoint}`;

    const headers = {
        'Content-Type': 'application/json',
        'X-WP-Nonce': nonce,
        ...options.headers,
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (!response.ok) {
            // Attempt to parse error detail from backend.
            //
            // WordPress REST endpoints normally return JSON. But if the server
            // emits a PHP fatal before the callback runs, or returns a plain
            // HTML error page (nginx 502, Cloudflare error, maintenance mode,
            // mod_security block), response.json() throws and errorData stays
            // undefined — which in the old code fell all the way through to
            // "An unknown API error occurred". That left the user with zero
            // signal about what actually failed.
            //
            // Fix: read the body as text once, attempt JSON.parse on it, and
            // fall back to a status-aware message that includes a truncated
            // body snippet when the response isn't JSON.
            let errorData: any = {};
            let rawBody = '';
            try {
                rawBody = await response.text();
                if (rawBody) {
                    try {
                        errorData = JSON.parse(rawBody);
                    } catch {
                        // Non-JSON body — errorData stays {}, we use rawBody for the snippet below.
                    }
                }
            } catch {
                // Body couldn't even be read as text (network stream error).
            }

            // Handle specific status codes (api-patterns).
            //
            // v2.9.28.21 — 403 no longer unconditionally maps to "Authentication
            // failed. Please refresh the page." That string is correct for a
            // real nonce expiry but useless when the 403 carries a legitimate
            // body like "AI analysis requires a Pro license." or "Pro licence
            // required." — the user was left with no indication of why the
            // action failed. We now prefer the backend's explicit message and
            // only fall back to the generic auth string when the 403 body is
            // empty (which is what a genuine nonce-rejected request looks like).
            if (response.status === 401) {
                throw new ApiError('Authentication failed. Please refresh the page.', response.status, errorData);
            }

            if (response.status === 403) {
                const msg = errorData?.message || errorData?.data?.message;
                throw new ApiError(
                    msg || 'Authentication failed. Please refresh the page.',
                    response.status,
                    errorData
                );
            }

            if (response.status === 402) {
                throw new ApiError(
                    (errorData as any)?.message || 'Insufficient tokens. Please upgrade your plan or purchase more tokens.',
                    402,
                    errorData
                );
            }

            if (response.status === 404) {
                throw new ApiError('Resource not found.', response.status, errorData);
            }

            // Extract a human-readable message. Order of precedence:
            //   1. errorData.message            — our endpoints' { success:false, message:"..." } shape
            //   2. errorData.data?.message      — nested WP_Error shape (rare, belt & suspenders)
            //   3. response.statusText          — empty on HTTP/2, but useful on HTTP/1.1
            //   4. Status-aware fallback with optional body snippet so the user sees SOMETHING actionable
            //      instead of the opaque "An unknown API error occurred" string.
            let message: string = errorData?.message
                || errorData?.data?.message
                || response.statusText
                || '';

            if (!message) {
                // Non-JSON response (or empty body) — synthesize a message that
                // at minimum tells the user the HTTP status and includes up to
                // 200 chars of the raw body so PHP fatals / HTML error pages
                // aren't swallowed silently. This replaces the old opaque
                // "An unknown API error occurred" fallback.
                const snippet = rawBody
                    ? ' — ' + rawBody.replace(/\s+/g, ' ').trim().slice(0, 200)
                    : '';
                message = `Server error (HTTP ${response.status})${snippet}`;
            }

            throw new ApiError(message, response.status, errorData);
        }

        // Parse success response
        // If status is 204 No Content, return null as T
        if (response.status === 204) {
            return null as unknown as T;
        }

        return await response.json();
    } catch (error) {
        // Re-throw ApiErrors, wrap others
        if (error instanceof ApiError) {
            throw error;
        }

        // Network errors or other fetch failures
        throw new ApiError(
            error instanceof Error ? error.message : 'Network request failed',
            0 // 0 indicates client-side/network error
        );
    }
}
