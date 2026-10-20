'use client';

import { useRouter } from 'next/navigation';
import { ServerCrash } from 'lucide-react';

/**
 * The third session state: the backend did not answer.
 *
 * Distinct from being signed out, as in hgs-frontend — sending someone whose
 * session may be perfectly valid to a login form that will also fail tells
 * them something untrue.
 */
export function BackendUnavailablePage() {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-sand p-6 dark:bg-ink">
      <div className="surface max-w-md p-8 text-center">
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-accent-clay/10 text-accent-clay">
          <ServerCrash size={26} aria-hidden="true" />
        </span>
        <h1 className="text-xl font-bold text-ink dark:text-white">The dashboard cannot reach its server</h1>
        <p className="mt-2 text-ink-muted dark:text-slate-400">
          Your session is probably fine — the listing service is not answering. Try again in a moment.
        </p>
        <button type="button" className="btn-primary mt-6" onClick={() => router.refresh()}>
          Try again
        </button>
      </div>
    </div>
  );
}
