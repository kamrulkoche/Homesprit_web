/**
 * Browser-side client for the admin API — the ONE request implementation in
 * the dashboard, as in hgs-frontend.
 *
 * Calls `/api/admin/*`, this app's own proxy, never the backend: the session
 * JWT is in an httpOnly cookie this code cannot read, so the proxy attaches it.
 *
 * Unlike the public readers, these THROW on failure. A visitor is better served
 * by a page that degrades; someone who pressed Save needs to be told plainly
 * that it did not save.
 */

/** Error carrying the HTTP status, so callers can treat 401 as "signed out". */
export class AdminApiError extends Error {
  readonly status: number;
  /** Per-field messages, keyed by field name. */
  readonly fields?: Record<string, string>;

  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
    this.fields = fields;
  }
}

interface BackendErrorBody {
  error?: string;
  details?: { fields?: Record<string, string>; field?: string; reason?: string };
}

/**
 * Per-field messages from either error shape the backend sends.
 *
 * A Pydantic 422 carries `details.fields` (`{price: "…"}`); a domain
 * `ValidationError` raised in a use case carries `details.field` + `reason`
 * (`{field: "agent_id", reason: "…"}`). The form wants one map either way.
 */
export function readFieldErrors(body: BackendErrorBody | null): Record<string, string> | undefined {
  if (!body?.details) return undefined;
  if (body.details.fields) return body.details.fields;
  if (body.details.field && body.details.reason) {
    return { [body.details.field]: body.details.reason };
  }
  return undefined;
}

/** Anything that can go in a query string. `undefined`, `null` and `''` are dropped. */
export type QueryValue = string | number | boolean | null | undefined;

/**
 * Build `?a=1&b=2`, skipping empties — sending `status=` would make the backend
 * filter on a status named "".
 */
export function toQueryString(query?: Record<string, QueryValue>): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/admin/${path.replace(/^\/+/, '')}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new AdminApiError('Could not reach the server. Check your connection and try again.', 0);
  }

  const payload = (await res.json().catch(() => null)) as (BackendErrorBody & { data?: T }) | null;

  if (!res.ok) {
    throw new AdminApiError(
      payload?.error ?? `Request failed (${res.status}).`,
      res.status,
      readFieldErrors(payload)
    );
  }

  return payload?.data as T;
}

export const adminApi = {
  get: <T>(path: string, query?: Record<string, QueryValue>) =>
    request<T>(`${path}${toQueryString(query)}`),
  post: <T>(path: string, body: unknown) => request<T>(path, 'POST', body),
  /** Partial update — only the keys present are touched. */
  patch: <T>(path: string, body: unknown) => request<T>(path, 'PATCH', body),
  /** `del`, not `delete` — a reserved word as a bare identifier. */
  del: <T>(path: string) => request<T>(path, 'DELETE'),
};

/**
 * Turn a title into a URL slug.
 *
 * Mirrors `normalize_slug` in homesprit-backend, which is the authority — this
 * only saves typing. Anything it lets through that the backend refuses comes
 * back as a 422 naming the field.
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}
