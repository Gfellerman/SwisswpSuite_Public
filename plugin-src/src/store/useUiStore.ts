/**
 * useUiStore — Zustand slice for Security Hub UI state.
 * =============================================================================
 * Introduced in v2.9.30.118 (TD-1 refactor) for ephemeral UI state that
 * crosses tab boundaries (confirm dialog, advisor modals, transient banners)
 * and the active-tab selection.
 *
 * Scope:
 *   - activeTab             — which tab is currently rendered
 *   - confirmDialog         — single global confirm modal (used by IP ban,
 *                             quarantine move, hardening apply-all, etc.)
 *   - showLogAdvisor        — Log Advisor modal (renders on any tab)
 *   - showFirewallAdvisor   — Firewall Advisor modal (renders on any tab)
 *   - aiElapsed + aiTimerRef — the W4 elapsed-time counter for AI calls
 *
 * REMOVED 2026-08-13 (Package E / G2 / T4 dead-path deletion): `showM5Consent`
 * was a second, orphaned copy of the same flag SecurityHub.tsx kept as its
 * OWN local `useState` — this store's copy was never read or written by
 * anything outside this file (confirmed by tree-wide grep before deletion),
 * and the local-state copy's own opener (`setShowM5Consent(true)`) had zero
 * call sites either, so the modal it gated could never open through either
 * copy. See SecurityHub.tsx's own deletion comments for the full two-proof
 * verification.
 *
 * Non-goals:
 *   - Per-tab local UI state (search inputs, expanded rows) stays in the
 *     tab component as useState — no need to share across consumers.
 *   - Toast notifications (handled by sonner directly).
 *
 * Why not just useState?
 *   - Modals are rendered "global" — they show from any tab. The trigger
 *     button may live on the Dashboard tab while the modal itself sits
 *     outside the tab switch tree. A store is the only way to coordinate
 *     this without prop-drilling showLogAdvisor through every tab.
 */
import { create } from "zustand";

/** A small ad-hoc confirm dialog (message + onConfirm callback). */
export interface ConfirmDialog {
  message: string;
  onConfirm: () => void;
}

export type SecurityTab =
  | "dashboard"
  | "scan"
  | "logs"
  | "quarantine"
  | "hardening"
  | "cloud-shield"
  | "history";

export interface UiState {
  activeTab: SecurityTab;
  confirmDialog: ConfirmDialog | null;
  showLogAdvisor: boolean;
  showFirewallAdvisor: boolean;
  /** W4 — Elapsed timer for long AI calls (compound model; 15–60s). */
  aiElapsed: number;
}

export interface UiSetters {
  setActiveTab: (tab: SecurityTab) => void;
  setConfirmDialog: (dialog: ConfirmDialog | null) => void;
  setShowLogAdvisor: (show: boolean) => void;
  setShowFirewallAdvisor: (show: boolean) => void;
  setAiElapsed: (elapsed: number) => void;
  incrementAiElapsed: () => void;
}

export const useUiStore = create<UiState & UiSetters>((set) => ({
  activeTab: "dashboard",
  confirmDialog: null,
  showLogAdvisor: false,
  showFirewallAdvisor: false,
  aiElapsed: 0,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setConfirmDialog: (dialog) => set({ confirmDialog: dialog }),
  setShowLogAdvisor: (show) => set({ showLogAdvisor: show }),
  setShowFirewallAdvisor: (show) => set({ showFirewallAdvisor: show }),
  setAiElapsed: (elapsed) => set({ aiElapsed: elapsed }),
  incrementAiElapsed: () => set((s) => ({ aiElapsed: s.aiElapsed + 1 })),
}));
