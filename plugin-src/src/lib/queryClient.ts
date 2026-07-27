/**
 * Authored by: Backend Specialist
 * Skills: typescript-expert, react-patterns
 * Date: 2026-02-17
 * 
 * Query Client Configuration
 * Sets up global defaults for data fetching, caching, and retries.
 */

import { QueryClient } from '@tanstack/react-query';

// Time constants in milliseconds
const ONE_MINUTE = 60 * 1000;
const FIVE_MINUTES = 5 * ONE_MINUTE;

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Default caching strategy: 5 minutes for general data (settings, etc.)
            staleTime: FIVE_MINUTES,

            // Minimize refetches to save server resources
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,

            // Retry logic: 3 attempts with exponential backoff (handled by default)
            retry: 3,

            // Error handling: Could add global error boundary logic here if needed,
            // but usually better handled at the UI layer or via mutation callbacks.
        },
        mutations: {
            // Mutations usually shouldn't retry automatically unless idempotent
            retry: 1,
        },
    },
});
