// =============================================================================
// FLILINK — Toast notifications
// Lightweight, app-wide feedback ("Link copied", "Changes saved", errors).
// =============================================================================

'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CircleAlert, CircleCheck } from 'lucide-react';

type ToastTone = 'success' | 'error';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const ToastContext = createContext<(message: string, tone?: ToastTone) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const show = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = ++nextId.current;
    // Keep only the latest two so rapid taps never stack up the screen
    setToasts((prev) => [...prev.slice(-1), { id, message, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2400);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-3 z-[100] mx-auto flex max-w-md flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-pop flex items-center gap-2 rounded-full bg-ink/95 px-4 py-2.5 text-sm font-medium text-white shadow-float backdrop-blur"
          >
            {t.tone === 'success' ? (
              <CircleCheck className="h-4 w-4 text-emerald-400" />
            ) : (
              <CircleAlert className="h-4 w-4 text-red-400" />
            )}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
