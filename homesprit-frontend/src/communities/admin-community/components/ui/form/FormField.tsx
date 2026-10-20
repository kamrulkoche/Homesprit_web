'use client';

import { cloneElement, isValidElement, useId } from 'react';

interface FormFieldProps {
  label: string;
  /** The server's or the form's message for this field. */
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  /** One input element; the field wires its id, aria-invalid and aria-describedby. */
  children: React.ReactElement<Record<string, unknown>>;
}

/**
 * A label, one control, and its hint or error — wired for assistive tech once
 * here rather than by hand in every form (hgs-frontend's `form/FormField`).
 */
export function FormField({ label, error, hint, required, className, children }: FormFieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
        required,
      })
    : children;

  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
        {required && (
          <span className="text-accent-clay" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {control}
      {error ? (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-ink-muted dark:text-slate-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
