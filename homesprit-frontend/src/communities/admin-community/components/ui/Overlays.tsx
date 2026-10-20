'use client';

import { useEffect, useId, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/helpers/utils/utils';

/**
 * The two overlays every admin screen shares — the form panel and the delete
 * confirmation — ported from hgs-frontend. They share one behaviour: Escape
 * closes, the page behind stops scrolling, focus goes somewhere sensible.
 */

function useOverlayBehaviour(isOpen: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);
}

interface FormPanelProps {
  isOpen: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Rendered in the pinned footer — Save / Cancel live with the caller. */
  footer: React.ReactNode;
  /** The panel owns the submit, so Enter works in every field. */
  onSubmit: (event: React.FormEvent) => void;
  placement?: 'side' | 'center';
}

/**
 * A panel holding a form. Whatever the placement the SHAPE is the same: a fixed
 * header, a scrolling middle, a pinned footer — so Save is never pushed below
 * the fold by a tall form.
 */
export function FormPanel({
  isOpen,
  title,
  description,
  onClose,
  children,
  footer,
  onSubmit,
  placement = 'side',
}: FormPanelProps) {
  useOverlayBehaviour(isOpen, onClose);
  const headingId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  // Move focus into the panel, or Tab keeps walking the page underneath.
  useEffect(() => {
    if (!isOpen) return;
    panelRef.current?.querySelector<HTMLElement>('input, textarea, select, button[type="submit"]')?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex',
        placement === 'center' ? 'items-center justify-center p-4 md:p-8' : 'justify-end'
      )}
    >
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className={cn(
          'relative flex w-full max-w-xl flex-col bg-white shadow-2xl dark:bg-ink-soft',
          placement === 'center' ? 'max-h-full overflow-hidden rounded-2xl' : 'h-full'
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-ink/[0.08] px-6 py-5 dark:border-white/[0.08]">
          <div>
            <h2 id={headingId} className="text-xl font-bold text-ink dark:text-white">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-ink-muted dark:text-slate-400">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-ink-muted hover:bg-ink/5 hover:text-ink dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-6">{children}</div>
          <footer className="flex items-center justify-end gap-3 border-t border-ink/[0.08] px-6 py-4 dark:border-white/[0.08]">
            {footer}
          </footer>
        </form>
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  isBusy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Delete confirmation. Every delete behind it is a SOFT delete, so the wording
 * says "remove", never "permanently delete" — promising a permanence the
 * system does not deliver is its own kind of wrong.
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  isBusy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useOverlayBehaviour(isOpen, onCancel);
  const headingId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) confirmRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-5">
      <button type="button" aria-label="Cancel" onClick={onCancel} className="absolute inset-0 bg-ink/50 backdrop-blur-sm" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-ink-soft"
      >
        <span className="mb-4 inline-grid h-12 w-12 place-items-center rounded-xl bg-accent-clay/10 text-accent-clay">
          <AlertTriangle size={22} aria-hidden="true" />
        </span>
        <h2 id={headingId} className="mb-2 text-lg font-bold text-ink dark:text-white">
          {title}
        </h2>
        <p className="mb-6 text-ink-muted dark:text-slate-400">{message}</p>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={isBusy} className="btn-secondary">
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={isBusy}
            className="btn bg-accent-clay text-white hover:brightness-95"
          >
            {isBusy ? 'Removing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
