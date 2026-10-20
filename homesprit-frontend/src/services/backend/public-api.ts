import type { IBackendEnvelope } from '@/interface/admin.interface';

/**
 * Read client for homesprit-backend's public API — SERVER ONLY.
 *
 * Ported from hgs-frontend's `public-api.ts`. These endpoints are anonymous, so
 * "server only" is not about secrets; it is about the address.
 * `HOMESPRIT_BACKEND_URL` carries no `NEXT_PUBLIC_` prefix, so only server
 * code can read it, and the public pages are Server Components that fetch
 * during render anyway.
 */

/** Base URL of the backend. The admin area reads the same variable. */
export const BACKEND_URL = (process.env.HOMESPRIT_BACKEND_URL ?? 'http://localhost:8001').replace(
  /\/+$/,
  ''
);

interface GetOptions {
  /**
   * Seconds to hold the response. Omit for no caching — the default, because
   * an agent who publishes a listing expects it live on the next request.
   */
  revalidate?: number;
}

/**
 * Whether an error is Next opting a route out of static rendering. Matched on
 * the documented `digest`, not the message text — see hgs-frontend's note.
 */
function isDynamicServerUsage(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    (error as { digest?: unknown }).digest === 'DYNAMIC_SERVER_USAGE'
  );
}

/**
 * GET a public endpoint and unwrap the response envelope.
 *
 * Returns `null` for "could not read this", NEVER an empty array standing in
 * for it — the rule hgs-frontend's readers live by. A search that came back
 * empty is `{ items: [] }`; a backend that is down is `null`, and the page
 * says "could not load listings" rather than "no homes match".
 *
 * @param path - Path below `/api/v1/public`, e.g. `/properties?city=Austin`
 * @param method - Caller name, for the console message only
 */
async function get<T>(path: string, method: string, options?: GetOptions): Promise<T | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/public${path}`, {
      ...(options?.revalidate === undefined
        ? { cache: 'no-store' as const }
        : { next: { revalidate: options.revalidate } }),
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      // 404 is an ordinary answer on the by-slug route, not a fault.
      if (res.status !== 404) {
        console.error(`publicApi.${method}: backend returned ${res.status} for ${path}`);
      }
      return null;
    }

    const body = (await res.json()) as IBackendEnvelope<T>;
    return body.data ?? null;
  } catch (error) {
    // Next's signal that the route must be dynamic — re-thrown, not swallowed.
    if (isDynamicServerUsage(error)) throw error;

    console.error(
      `publicApi.${method}: request failed (${BACKEND_URL}/api/v1/public${path}). ` +
        'Is homesprit-backend running? Set HOMESPRIT_BACKEND_URL in .env.local.',
      error
    );
    return null;
  }
}

export const publicApi = { get };
