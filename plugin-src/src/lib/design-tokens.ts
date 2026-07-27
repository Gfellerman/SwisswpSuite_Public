/**
 * Neo-Swiss Design Tokens
 * Authored by: Frontend Specialist
 * Skills used: tailwind-patterns, ui-ux-pro-max
 * Date: 2026-02-16
 */

export const tokens = {
    colors: {
        brand: {
            DEFAULT: '#D52B1E',  // Swiss Red
            hover: '#B91C1C',
            light: '#FCA5A5',
            dark: '#7F1D1D'
        },
        neutral: {
            0: '#FFFFFF',
            50: '#F8FAFC',
            100: '#F1F5F9',
            200: '#E2E8F0',
            300: '#CBD5E1',
            400: '#94A3B8',
            500: '#64748B',
            600: '#475569',
            700: '#334155',
            800: '#1E293B',
            900: '#0F172A',
            950: '#020617'
        },
        semantic: {
            success: '#10B981',
            warning: '#F59E0B',
            danger: '#EF4444',
            info: '#3B82F6'
        }
    },
    spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
        section: '64px'
    },
    radius: {
        sm: '4px',   // Swiss sharp
        md: '8px',
        lg: '12px',
        full: '9999px'
    }
} as const;

export type DesignTokens = typeof tokens;
