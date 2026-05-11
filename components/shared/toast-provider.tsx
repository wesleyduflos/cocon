"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface Toast {
  id: number;
  message: string;
  action?: {
    label: string;
    onClick: () => void | Promise<void>;
  };
}

interface ToastContextValue {
  showToast: (toast: Omit<Toast, "id">, durationMs?: number) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

const DEFAULT_DURATION_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const idRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback(
    (input: Omit<Toast, "id">, durationMs: number = DEFAULT_DURATION_MS) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      idRef.current += 1;
      const id = idRef.current;
      setToast({ ...input, id });
      timeoutRef.current = setTimeout(() => {
        setToast((current) => (current?.id === id ? null : current));
        timeoutRef.current = null;
      }, durationMs);
    },
    [],
  );

  const handleClick = useCallback(async () => {
    if (!toast) return;
    const action = toast.action;
    dismiss();
    if (action) {
      try {
        await action.onClick();
      } catch {
        // Erreur lors de l'undo : silencieux pour ne pas perturber l'UX.
      }
    }
  }, [toast, dismiss]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast ? (
        <button
          type="button"
          onClick={handleClick}
          className="fixed bottom-24 left-5 right-5 max-w-md mx-auto z-[60] rounded-[14px] bg-surface-elevated border border-border px-4 py-3 flex items-center justify-between gap-3 text-left shadow-[0_-6px_30px_rgba(0,0,0,0.4)]"
          aria-live="polite"
        >
          <span className="text-[14px] text-foreground">{toast.message}</span>
          {toast.action ? (
            <span className="text-[14px] font-semibold text-primary shrink-0">
              {toast.action.label}
            </span>
          ) : null}
        </button>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}
