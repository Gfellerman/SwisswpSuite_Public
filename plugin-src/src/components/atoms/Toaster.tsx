/**
 * Toaster — renders the notification queue kept in ../../lib/toast.ts.
 *
 * Renders the toast queue as a fixed, bottom-right stack using only
 * Tailwind utility classes already compiled into the app's enqueued
 * stylesheet — no inline `style` attribute, no CSS-in-JS, no runtime
 * <style>/<link> injection anywhere in this file.
 *
 * Accessibility:
 *   - Each toast is its own live region: `role="alert"`
 *     (`aria-live="assertive"`) for errors, `role="status"`
 *     (`aria-live="polite"`) for success/info/warning, so a screen reader
 *     announces new toasts without the caller doing anything special.
 *   - Auto-dismiss after DEFAULT_TOAST_DURATION (4000ms;
 *     `Infinity` disables it, matching every existing call site's
 *     `options.duration`), and pauses while the pointer is over the toast.
 *   - The dismiss control is a native <button> with an aria-label, so it is
 *     keyboard-operable (Enter/Space) with no extra handler needed.
 */
import { useEffect, useRef } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";
import {
  useToastStore,
  type ToastRecord,
  type ToastVariant,
} from "../../lib/toast";
import { cn } from "../../lib/utils";

interface VariantMeta {
  icon: React.ElementType;
  border: string;
  iconColor: string;
  role: "alert" | "status";
}

const VARIANT_META: Record<ToastVariant, VariantMeta> = {
  success: {
    icon: CheckCircle2,
    border: "border-semantic-success",
    iconColor: "text-semantic-success",
    role: "status",
  },
  info: {
    icon: Info,
    border: "border-semantic-info",
    iconColor: "text-semantic-info",
    role: "status",
  },
  warning: {
    icon: AlertTriangle,
    border: "border-semantic-warning",
    iconColor: "text-semantic-warning",
    role: "status",
  },
  error: {
    icon: XCircle,
    border: "border-semantic-danger",
    iconColor: "text-semantic-danger",
    role: "alert",
  },
};

function ToastCard({ record }: { record: ToastRecord }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const meta = VARIANT_META[record.variant];
  const Icon = meta.icon;

  // Pause-on-hover: track remaining time across mouseenter/mouseleave
  // instead of a single fire-and-forget setTimeout.
  const remainingRef = useRef(record.duration);
  const startRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!Number.isFinite(record.duration)) return undefined;
    startRef.current = Date.now();
    timerRef.current = setTimeout(
      () => dismiss(record.id),
      remainingRef.current
    );
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // Intentionally run once per toast — the toast is re-created (new id)
    // rather than mutated if its content changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMouseEnter = () => {
    if (!Number.isFinite(record.duration)) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const elapsed = Date.now() - startRef.current;
    remainingRef.current = Math.max(remainingRef.current - elapsed, 0);
  };

  const handleMouseLeave = () => {
    if (!Number.isFinite(record.duration)) return;
    startRef.current = Date.now();
    timerRef.current = setTimeout(
      () => dismiss(record.id),
      remainingRef.current
    );
  };

  return (
    <div
      role={meta.role}
      aria-live={meta.role === "alert" ? "assertive" : "polite"}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "bg-surface text-surface-foreground ring-border pointer-events-auto flex w-full items-start gap-3 rounded-md border-l-4 p-4 shadow-lg ring-1",
        meta.border
      )}
    >
      <Icon
        className={cn("mt-0.5 h-5 w-5 flex-shrink-0", meta.iconColor)}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug font-medium break-words whitespace-pre-line">
          {record.message}
        </p>
        {record.action && (
          <button
            type="button"
            onClick={() => {
              record.action?.onClick();
              dismiss(record.id);
            }}
            className="text-brand focus-visible:ring-ring mt-2 rounded-sm text-sm font-semibold underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            {record.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => dismiss(record.id)}
        aria-label="Dismiss notification"
        className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex-shrink-0 rounded-sm p-1 focus-visible:ring-2 focus-visible:outline-none"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export interface ToasterProps {
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
}

const POSITION_CLASSES: Record<
  NonNullable<ToasterProps["position"]>,
  string
> = {
  "top-right": "top-4 right-4 items-end",
  "top-left": "top-4 left-4 items-start",
  "bottom-right": "bottom-4 right-4 items-end",
  "bottom-left": "bottom-4 left-4 items-start",
};

export function Toaster({ position = "bottom-right" }: ToasterProps) {
  const toasts = useToastStore((s) => s.toasts);
  if (toasts.length === 0) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed z-[9999] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0",
        POSITION_CLASSES[position]
      )}
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} record={t} />
      ))}
    </div>
  );
}
