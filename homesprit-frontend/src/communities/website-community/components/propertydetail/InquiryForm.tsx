'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { fieldErrors, inquirySchema } from '@/helpers/validation/inquiry.schema';
import type { IResponse } from '@/interface/response.interface';

interface InquiryFormProps {
  /** The listing asked about. Omit for a general inquiry (`/contact`). */
  propertySlug?: string;
  /** Pre-filled message, so a visitor can send with one click. */
  defaultMessage?: string;
  submitLabel?: string;
}

type Status = 'idle' | 'sending' | 'sent';

/**
 * The inquiry form, used on every listing and on `/contact`.
 *
 * Validates with the same Zod schema the `/api/inquiries` route handler uses,
 * for instant per-field feedback — the route validates again, because it must
 * not trust the browser, and the backend a third time. Posts with `fetch` to
 * this app's own route, never to the backend, as every hgs-frontend form does.
 */
export function InquiryForm({ propertySlug, defaultMessage = '', submitLabel = 'Send message' }: InquiryFormProps) {
  const id = useId();
  const [values, setValues] = useState({ name: '', email: '', phone: '', message: defaultMessage });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [confirmation, setConfirmation] = useState('');

  const set = (field: keyof typeof values) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    // Clear a field's error as soon as it is edited — leaving it up while the
    // visitor fixes it reads as "still wrong".
    if (errors[field]) setErrors(({ [field]: _removed, ...rest }) => rest);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const parsed = inquirySchema.safeParse({ ...values, property_slug: propertySlug });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setStatus('sending');
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const body = (await res.json().catch(() => null)) as IResponse | null;

      if (body?.success) {
        setConfirmation(body.message);
        setStatus('sent');
        return;
      }
      setErrors(body && !body.success && body.fields ? body.fields : {});
      setFormError(body && !body.success ? body.error : 'Something went wrong. Please try again.');
    } catch {
      setFormError('Could not reach the server. Check your connection and try again.');
    }
    setStatus('idle');
  };

  if (status === 'sent') {
    return (
      <div role="status" className="flex flex-col items-center rounded-2xl bg-brand-50 px-6 py-10 text-center dark:bg-brand-900/30">
        <CheckCircle2 size={36} className="text-brand-600 dark:text-brand-300" aria-hidden="true" />
        <p className="mt-3 font-semibold text-ink dark:text-white">{confirmation}</p>
      </div>
    );
  }

  const field = (name: keyof typeof values) => ({
    id: `${id}-${name}`,
    name,
    value: values[name],
    onChange: set(name),
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `${id}-${name}-error` : undefined,
    className: 'field-input',
  });

  const errorText = (name: string) =>
    errors[name] ? (
      <p id={`${id}-${name}-error`} className="field-error">
        {errors[name]}
      </p>
    ) : null;

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {formError && (
        <p role="alert" className="rounded-xl bg-accent-clay/10 px-4 py-3 text-sm font-medium text-accent-clay">
          {formError}
        </p>
      )}

      <div>
        <label htmlFor={`${id}-name`} className="field-label">
          Name
        </label>
        <input {...field('name')} autoComplete="name" />
        {errorText('name')}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-email`} className="field-label">
            Email
          </label>
          <input {...field('email')} type="email" autoComplete="email" />
          {errorText('email')}
        </div>
        <div>
          <label htmlFor={`${id}-phone`} className="field-label">
            Phone <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <input {...field('phone')} type="tel" autoComplete="tel" />
          {errorText('phone')}
        </div>
      </div>

      <div>
        <label htmlFor={`${id}-message`} className="field-label">
          Message
        </label>
        <textarea {...field('message')} rows={5} />
        {errorText('message')}
      </div>

      <button type="submit" className="btn-primary w-full" disabled={status === 'sending'}>
        <Send size={16} aria-hidden="true" />
        {status === 'sending' ? 'Sending…' : submitLabel}
      </button>
      <p className="text-center text-xs text-ink-muted dark:text-slate-400">
        We use your details only to reply.{' '}
        <Link href="/privacy" className="font-semibold underline hover:text-ink dark:hover:text-white">
          Privacy policy
        </Link>
      </p>
    </form>
  );
}
