import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { BACKEND_URL, SESSION_COOKIE } from '@/services/admin.service';

/**
 * Proxy for the backend's admin API — the seam every dashboard write goes
 * through.
 *
 * Ported from hgs-frontend. The session JWT lives in an httpOnly cookie
 * precisely so client-side JavaScript cannot read it, which also means
 * client-side JavaScript cannot attach it to an Authorization header. The
 * browser sends the cookie here automatically; this handler reads it and
 * forwards the call with `Authorization: Bearer`. So:
 *
 *  - an XSS on the dashboard cannot exfiltrate the session;
 *  - the backend needs no permissive CORS, because only this server calls it;
 *  - the backend's address never reaches the browser.
 *
 * The envelope passes through unchanged — the screens read the backend's
 * schemas directly. `/api/admin/login` and `/logout` have their own handlers;
 * Next resolves a static segment before a catch-all.
 */

/**
 * Path prefixes this proxy forwards, relative to `/api/v1/admin`. Blast
 * radius, not the boundary — the backend authorizes every request itself.
 */
const ALLOWED_PREFIXES = ['dashboard', 'properties', 'inquiries', 'users', 'account'];

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PATCH', 'DELETE']);

async function proxy(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await context.params;

  if (!ALLOWED_METHODS.has(request.method)) {
    return NextResponse.json(
      { success: false, error: `Method ${request.method} not allowed.` },
      { status: 405 }
    );
  }

  if (!path?.length || !ALLOWED_PREFIXES.includes(path[0])) {
    return NextResponse.json({ success: false, error: 'Unknown admin resource.' }, { status: 404 });
  }

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) {
    // 401, not a redirect: the caller is fetch(), and the screens turn this
    // into "your session expired, sign in again".
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  }

  // Each segment re-encoded, so a `../` from the client cannot climb out of
  // /admin/.
  const segments = path.map(encodeURIComponent).join('/');
  const target = `${BACKEND_URL}/api/v1/admin/${segments}${new URL(request.url).search}`;

  const hasBody = request.method !== 'GET' && request.method !== 'DELETE';
  // Bytes, not text, and the original content-type — the HGS proxy does this
  // for multipart uploads; here every body is JSON, but forwarding exactly
  // what arrived costs nothing and leaves room for uploads later.
  const body = hasBody ? await request.arrayBuffer() : undefined;
  const contentType = request.headers.get('content-type');

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(hasBody && contentType ? { 'Content-Type': contentType } : {}),
      },
      body,
      cache: 'no-store',
    });

    if (upstream.status === 204) return new NextResponse(null, { status: 204 });

    const payload = await upstream.json().catch(() => null);
    return NextResponse.json(payload, { status: upstream.status });
  } catch (err) {
    console.error(`Admin proxy: backend unreachable (${target})`, err);
    return NextResponse.json(
      { success: false, error: 'Unable to reach the server. Is homesprit-backend running?' },
      { status: 503 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
