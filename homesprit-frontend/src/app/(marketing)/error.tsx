'use client';

/**
 * Error boundary for the public pages — reached when a read fails in a way the
 * page cannot render around (a listing page whose backend is down).
 */
export default function MarketingError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="mt-3 text-3xl font-extrabold text-ink dark:text-white">We could not load this page</h1>
      <p className="mt-3 max-w-md text-ink-muted dark:text-slate-400">
        The listing service did not answer. Please try again in a moment.
      </p>
      <button type="button" onClick={reset} className="btn-primary mt-8">
        Try again
      </button>
    </div>
  );
}
