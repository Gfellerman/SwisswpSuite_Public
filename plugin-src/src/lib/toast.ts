/**
 * Notification (toast) store.
 *
 * WordPress.org guidelines require every style to go through the WordPress
 * enqueue API, with no exception for wp-admin screens, so no shipped script
 * may create a <style> or <link rel=stylesheet> element at runtime. This
 * module keeps the notification queue; the render half
 * (`../components/atoms/Toaster.tsx`) uses only Tailwind utility classes
 * already compiled into the plugin's enqueued stylesheet.
 *
 * Call surface: `toast.success(...)`,
 * `toast.error(...)`, `toast.warning(...)`, `toast.info(...)`,
 * `toast.dismiss(id)`, and the `{ duration, action: { label, onClick } }`
 * options shape.
 *
 * `toast.loading`, `toast.promise`, `toast.custom`, and a bare `toast(...)`
 * call are NOT implemented — a source-tree census across plugin/src and
 * pro-overlay/src at the time this module was written found zero call
 * sites for any of them.
 */
import { create } from "zustand";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  /** Milliseconds before auto-dismiss. `Infinity` disables auto-dismiss. */
  duration?: number;
  action?: ToastAction;
}

export interface ToastRecord {
  id: string;
  variant: ToastVariant;
  message: string;
  action?: ToastAction;
  duration: number;
}

/** Default toast lifetime for call sites that pass no explicit `duration`. */
export const DEFAULT_TOAST_DURATION = 4000;

interface ToastStoreState {
  toasts: ToastRecord[];
  push: (
    variant: ToastVariant,
    message: string,
    options?: ToastOptions
  ) => string;
  dismiss: (id: string) => void;
}

let seq = 0;
function nextId(): string {
  seq += 1;
  return `toast-${Date.now()}-${seq}`;
}

export const useToastStore = create<ToastStoreState>((set) => ({
  toasts: [],
  push: (variant, message, options) => {
    const id = nextId();
    const duration = options?.duration ?? DEFAULT_TOAST_DURATION;
    set((state) => ({
      toasts: [
        ...state.toasts,
        { id, variant, message, action: options?.action, duration },
      ],
    }));
    return id;
  },
  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));

function make(variant: ToastVariant) {
  return (message: string, options?: ToastOptions): string =>
    useToastStore.getState().push(variant, message, options);
}

export const toast = {
  success: make("success"),
  error: make("error"),
  warning: make("warning"),
  info: make("info"),
  dismiss: (id: string): void => useToastStore.getState().dismiss(id),
};
