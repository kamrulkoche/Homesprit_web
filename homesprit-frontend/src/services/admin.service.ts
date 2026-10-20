import { cookies } from 'next/headers';
import { BACKEND_URL } from '@/services/backend/public-api';
import type {
  IBackendEnvelope,
  IDashboardResponse,
  IPaginated,
  IUser,
} from '@/interface/admin.interface';

/**
 * Server-side client for the dashboard — SERVER ONLY.
 *
 * Ported from hgs-frontend's `admin.service.ts`: every method reads the
 * httpOnly session cookie through `cookies()`, which is unavailable in the
 * browser. That is the point — the JWT never reaches client-side JavaScript,
 * so an XSS cannot exfiltrate it — and every method swallows failures into
 * `null`, so a backend that is down degrades the screen instead of crashing it.
 */

/** Name of the httpOnly cookie carrying the session JWT. */
export const SESSION_COOKIE = 'homesprit_session';

export { BACKEND_URL };

/**
 * Outcome of a session check — THREE states, not two.
 *
 * `unauthenticated` and `unreachable` must stay distinct. Collapsing them means
 * that when the backend is merely down, a validly signed-in agent is sent to a
 * login page where logging in also fails, which tells them they are signed out
 * when they are not.
 */
export type Session =
  | { status: 'authenticated'; user: IUser }
  | { status: 'unauthenticated' }
  | { status: 'unreachable' };

/** One list as a server component receives it. */
export interface IListPage<T> {
  items: T[];
  total: number;
}

async function readToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

function warnUnreachable(method: string, error: unknown): void {
  console.error(
    `adminService.${method}: backend request failed (${BACKEND_URL}). ` +
      'Is homesprit-backend running? Set HOMESPRIT_BACKEND_URL in .env.local.',
    error
  );
}

/** GET one path under `/api/v1/admin/`, with the session attached. Null on any failure. */
async function readAdmin<T>(path: string): Promise<T | null> {
  const token = await readToken();
  if (!token) return null;

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/admin/${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const body = (await res.json()) as IBackendEnvelope<T>;
    return body.data ?? null;
  } catch (error) {
    warnUnreachable(`readAdmin(${path})`, error);
    return null;
  }
}

export const adminService = {
  /** Resolve the current session, telling "signed out" apart from "backend down". */
  async getSession(): Promise<Session> {
    const token = await readToken();
    if (!token) return { status: 'unauthenticated' };

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        // Never cached: deactivating an agent must bite on their next request,
        // and the backend re-reads the user row precisely so that it can.
        cache: 'no-store',
      });

      if (res.status === 401 || res.status === 403) return { status: 'unauthenticated' };
      if (!res.ok) {
        console.error(`adminService.getSession: backend returned ${res.status}`);
        return { status: 'unreachable' };
      }

      const body = (await res.json()) as IBackendEnvelope<IUser>;
      return body.data ? { status: 'authenticated', user: body.data } : { status: 'unauthenticated' };
    } catch (error) {
      warnUnreachable('getSession', error);
      return { status: 'unreachable' };
    }
  },

  /** The dashboard overview. Null renders the cards as unavailable, never as zeros. */
  async getDashboard(): Promise<IDashboardResponse | null> {
    return readAdmin<IDashboardResponse>('dashboard');
  },

  /**
   * A screen's FIRST page, read server-side and handed to `useAdminResource`
   * as `initialRows`, which suppresses the mount fetch.
   *
   * Null on failure rather than an empty list, and the difference is
   * load-bearing (hgs-frontend's note): null leaves `initialRows` undefined, so
   * the hook fetches on mount, fails visibly and offers Try again. An empty
   * array would render "no listings yet" over a backend that is merely down.
   */
  async getList<T>(
    path: string,
    query?: Record<string, string | number | undefined>
  ): Promise<IListPage<T> | null> {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value === undefined || value === '') continue;
      search.set(key, String(value));
    }
    const suffix = search.toString() ? `?${search}` : '';
    const payload = await readAdmin<IPaginated<T>>(`${path}${suffix}`);
    return payload ? { items: payload.items ?? [], total: payload.total ?? 0 } : null;
  },

  /** One row or object. Null on failure — including a 403 or 404. */
  async getOne<T>(path: string): Promise<T | null> {
    return readAdmin<T>(path);
  },
};
