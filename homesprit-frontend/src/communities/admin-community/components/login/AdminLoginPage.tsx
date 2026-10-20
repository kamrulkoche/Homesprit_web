'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn } from 'lucide-react';
import { Logo } from '@/shared/components/Logo';
import { loginSchema } from '@/helpers/validation/auth.schema';
import type { IResponse } from '@/interface/response.interface';

/**
 * Staff sign-in. Posts to `/api/admin/login`, which sets the httpOnly cookie —
 * this component never sees the token.
 *
 * `next` is accepted only as a same-site path: `//evil.example` or a full URL
 * would make this an open redirect.
 */
export function AdminLoginPage({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const destination = next && next.startsWith('/admin') && !next.startsWith('//') ? next : '/admin/dashboard';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your details.');
      return;
    }

    setIsBusy(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const body = (await res.json().catch(() => null)) as IResponse | null;
      if (body?.success) {
        router.replace(destination);
        router.refresh();
        return;
      }
      setError(body && !body.success ? body.error : 'Could not sign in. Please try again.');
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    }
    setIsBusy(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand p-4 dark:bg-ink">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <form onSubmit={submit} noValidate className="surface space-y-5 p-7">
          <div>
            <h1 className="text-xl font-extrabold text-ink dark:text-white">Staff sign in</h1>
            <p className="mt-1 text-sm text-ink-muted dark:text-slate-400">For Homesprit agents and admins.</p>
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-accent-clay/10 px-4 py-3 text-sm font-medium text-accent-clay">
              {error}
            </p>
          )}

          <div>
            <label htmlFor="login-email" className="field-label">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              className="field-input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="login-password" className="field-label">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              className="field-input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={isBusy}>
            <LogIn size={17} aria-hidden="true" />
            {isBusy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
