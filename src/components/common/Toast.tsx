"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";

export type ToastType = "error" | "success" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Event-driven global dispatcher for calling toast.error() anywhere
type ToastListener = (toast: Omit<ToastItem, "id">) => void;
const listeners = new Set<ToastListener>();

function emitToast(toast: Omit<ToastItem, "id">) {
  listeners.forEach((listener) => listener(toast));
}

export const toast = {
  error: (message: string, title?: string, duration = 5500) =>
    emitToast({ type: "error", message, title, duration }),
  success: (message: string, title?: string, duration = 4000) =>
    emitToast({ type: "success", message, title, duration }),
  warning: (message: string, title?: string, duration = 4500) =>
    emitToast({ type: "warning", message, title, duration }),
  info: (message: string, title?: string, duration = 4000) =>
    emitToast({ type: "info", message, title, duration }),
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Return global fallback if outside provider
    return toast;
  }
  return {
    ...toast,
    addToast: context.addToast,
    removeToast: context.removeToast,
  };
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toastData: Omit<ToastItem, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastItem = { ...toastData, id };

      setToasts((prev) => [...prev, newToast]);

      const duration = toastData.duration ?? 4500;
      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  useEffect(() => {
    const handleListener: ToastListener = (t) => addToast(t);
    listeners.add(handleListener);
    return () => {
      listeners.delete(handleListener);
    };
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0"
    >
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} onRemove={() => onRemove(item.id)} />
      ))}
    </div>
  );
}

function ToastCard({
  item,
  onRemove,
}: {
  item: ToastItem;
  onRemove: () => void;
}) {
  const config = {
    error: {
      border: "border-destructive/30",
      bg: "bg-destructive/10 backdrop-blur-md",
      text: "text-destructive",
      icon: <AlertCircle className="size-5 shrink-0 text-destructive mt-0.5" />,
      defaultTitle: "Validation Error",
    },
    success: {
      border: "border-emerald-500/30",
      bg: "bg-emerald-500/10 backdrop-blur-md",
      text: "text-emerald-600 dark:text-emerald-400",
      icon: <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />,
      defaultTitle: "Success",
    },
    warning: {
      border: "border-amber-500/30",
      bg: "bg-amber-500/10 backdrop-blur-md",
      text: "text-amber-600 dark:text-amber-400",
      icon: <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />,
      defaultTitle: "Notice",
    },
    info: {
      border: "border-primary/30",
      bg: "bg-primary/10 backdrop-blur-md",
      text: "text-primary",
      icon: <Info className="size-5 shrink-0 text-primary mt-0.5" />,
      defaultTitle: "Information",
    },
  }[item.type];

  // Split lines if message has multiple bullet points or errors
  const lines = item.message.split("\n").filter(Boolean);

  return (
    <div
      role="alert"
      className={`pointer-events-auto rounded-lg border ${config.border} bg-card p-4 shadow-lg transition-all animate-in fade-in slide-in-from-top-2`}
    >
      <div className="flex items-start gap-3">
        {config.icon}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-foreground">
            {item.title || config.defaultTitle}
          </p>
          {lines.length <= 1 ? (
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-snug">
              {item.message}
            </p>
          ) : (
            <ul className="mt-1 space-y-1 text-xs sm:text-sm text-muted-foreground">
              {lines.map((line, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-destructive font-bold">•</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          onClick={onRemove}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-surface shrink-0 cursor-pointer"
          aria-label="Close notification"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
