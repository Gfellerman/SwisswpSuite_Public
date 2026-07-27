/**
 * Authored by: Frontend Specialist
 * Skills: react-patterns, frontend-design, typescript-expert
 * Date: 2026-02-17
 * 
 * React Router v7 Configuration
 * Uses HashRouter for WordPress admin compatibility
 * Code splitting with React.lazy for performance
 */

import { createHashRouter, Navigate } from 'react-router-dom';
import React, { Suspense } from 'react';

// Lazy load pages for code splitting (react-patterns: performance optimization)
const DashboardPage = React.lazy(() => import('../pages/DashboardPage'));
const SecurityPage = React.lazy(() => import('../pages/SecurityPage'));
const SeoPage = React.lazy(() => import('../pages/SeoPage'));
const BackupsPage = React.lazy(() => import('../pages/BackupsPage'));
const AIContentPage = React.lazy(() => import('../pages/AIContentPage'));
const SettingsPage = React.lazy(() => import('../pages/SettingsPage'));

const SyncPage = React.lazy(() => import('../pages/SyncPage'));

// Loading fallback component
const LoadingFallback = () => (
    <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand border-r-transparent"></div>
            <p className="mt-4 text-neutral-600 ">Loading...</p>
        </div>
    </div>
);

import { DashboardLayout } from '../components/templates/DashboardLayout';

// Router configuration with HashRouter strategy
export const router = createHashRouter([
    {
        path: '/',
        element: <DashboardLayout />,
        children: [
            {
                index: true,
                element: (
                    <Suspense fallback={<LoadingFallback />}>
                        <DashboardPage />
                    </Suspense>
                ),
            },
            {
                path: 'dashboard',
                element: <Navigate to="/" replace />,
            },
            {
                path: 'security',
                element: (
                    <Suspense fallback={<LoadingFallback />}>
                        <SecurityPage />
                    </Suspense>
                ),
            },
            {
                path: 'seo',
                element: (
                    <Suspense fallback={<LoadingFallback />}>
                        <SeoPage />
                    </Suspense>
                ),
            },
            {
                path: 'backups',
                element: (
                    <Suspense fallback={<LoadingFallback />}>
                        <BackupsPage />
                    </Suspense>
                ),
            },
            {
                path: 'ai-content',
                element: (
                    <Suspense fallback={<LoadingFallback />}>
                        <AIContentPage />
                    </Suspense>
                ),
            },
            {
                path: 'sync',
                element: (
                    <Suspense fallback={<LoadingFallback />}>
                        <SyncPage />
                    </Suspense>
                ),
            },
            {
                path: 'settings',
                element: (
                    <Suspense fallback={<LoadingFallback />}>
                        <SettingsPage />
                    </Suspense>
                ),
            },
        ]
    },
]);
