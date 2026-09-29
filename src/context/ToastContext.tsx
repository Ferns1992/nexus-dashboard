import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";

type ToastKind = "success" | "error" | "info";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  notify: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let nextId = 1;

const STYLES: Record<ToastKind, { icon: typeof Info; ring: string }> = {
  success: { icon: CheckCircle2, ring: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  error: { icon: XCircle, ring: "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400" },
  info: { icon: Info, ring: "border-zinc-500/30 bg-zinc-500/10 text-zinc-600 dark:text-zinc-300" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, kind: ToastKind = "info") => {
      const id = nextId++;
      setToasts((prev) => [...prev.slice(-3), { id, kind, message }]);
      setTimeout(() => dismiss(id), kind === "error" ? 7000 : 4000);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)]">
        {toasts.map((toast) => {
          const { icon: Icon, ring } = STYLES[toast.kind];
          return (
            <div
              key={toast.id}
              role="status"
              className={`flex items-start gap-3 p-3 rounded-xl border backdrop-blur-md shadow-lg ${ring}`}
            >
              <Icon className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm flex-1 break-words">{toast.message}</p>
              <button
                onClick={() => dismiss(toast.id)}
                className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
