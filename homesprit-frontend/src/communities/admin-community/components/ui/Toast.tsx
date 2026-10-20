'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/helpers/utils/utils';
import { focusRingClasses } from './admin-ui.data';

/**
 * Transient confirmations for dashboard writes — hgs-frontend's Toast, without
 * framer-motion (Homesprit does not carry it; a CSS transition is enough).
 *
 * `role="status"` / polite even for errors: the error is also shown in the form
 * the person is looking at, and interrupting a screen reader to repeat it is
 * rude rather than helpful.
 */

const AUTO_DISMISS_MS = 4000;

type ToastVariant = 'success' | 'error';

interface ToastEntry {
  id: number;
  variant: ToastVariant;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Throws outside a provider — a silent no-op would hide missing confirmations. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside <ToastProvider>.');
  return api;
}

function ToastItem({ toast, onDismiss }: { toast: ToastEntry; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const Icon = toast.variant === 'success' ? CheckCircle2 : AlertTriangle;
  return (
    <li
      className={cn(
        'pointer-events-auto flex items-start gap-3 rounded-xl p-4 text-ink shadow-lg',
        toast.variant === 'success' ? 'bg-brand-100' : 'bg-orange-100'
      )}
    >
      <Icon size={20} aria-hidden="true" className="mt-0.5 shrink-0" />
      <p className="min-w-0 flex-1 break-words font-medium">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        className={cn('-m-1 rounded-lg p-1 hover:bg-ink/10', focusRingClasses)}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </li>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  // A counter, not Date.now(): two toasts in one millisecond would share a key.
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const api = useMemo<ToastApi>(() => {
    const push = (variant: ToastVariant) => (message: string) => {
      const id = (nextId.current += 1);
      setToasts((current) => [...current.slice(-3), { id, variant, message }]);
    };
    return { success: push('success'), error: push('error') };
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-5 right-5 z-[70] w-[min(24rem,calc(100vw-2.5rem))]"
      >
        <ul className="flex flex-col gap-2.5">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </ul>
      </div>
    </ToastContext.Provider>
  );
}
