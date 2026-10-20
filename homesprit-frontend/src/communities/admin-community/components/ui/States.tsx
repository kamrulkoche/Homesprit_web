'use client';

import Link from 'next/link';
import { AlertTriangle, LogIn, type LucideIcon } from 'lucide-react';

/**
 * Loading, empty, error and session-expired states — one set, so every screen
 * says the same thing the same way (hgs-frontend's `States.tsx`).
 *
 * "Empty" and "error" are different components on purpose: a list that could
 * not be read must never look like a list with nothing in it.
 */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
        <Icon size={22} aria-hidden="true" />
      </span>
      <h3 className="font-semibold text-ink dark:text-white">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-muted dark:text-slate-400">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-accent-clay/10 text-accent-clay">
        <AlertTriangle size={22} aria-hidden="true" />
      </span>
      <h3 className="font-semibold text-ink dark:text-white">Could not load this</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-muted dark:text-slate-400">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary mt-5">
          Try again
        </button>
      )}
    </div>
  );
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="px-6 py-14 text-center text-sm text-ink-muted dark:text-slate-400">
      {label}
    </div>
  );
}

/** Placeholder rows while the FIRST read of a list is in flight. */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="divide-y divide-ink/[0.06] dark:divide-white/[0.05]">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4 px-5 py-4">
          <div className="h-4 w-1/3 animate-pulse rounded bg-ink/[0.06] dark:bg-white/[0.06]" />
          <div className="h-4 w-1/4 animate-pulse rounded bg-ink/[0.06] dark:bg-white/[0.06]" />
          <div className="ml-auto h-4 w-16 animate-pulse rounded bg-ink/[0.06] dark:bg-white/[0.06]" />
        </div>
      ))}
    </div>
  );
}

/** Shown above a list whose last read came back 401. */
export function SessionExpiredNotice() {
  return (
    <div
      role="alert"
      className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 px-5 py-4 text-amber-900 dark:bg-amber-500/10 dark:text-amber-100"
    >
      <p className="font-medium">Your session has ended. Sign in again to keep working.</p>
      <Link href="/admin/login" className="btn-secondary py-2">
        <LogIn size={16} aria-hidden="true" />
        Sign in
      </Link>
    </div>
  );
}
