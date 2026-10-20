import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Route guard for the dashboard — Next 16's `proxy` convention (formerly
 * `middleware`). Ported from hgs-frontend.
 *
 * It checks only that a session cookie is PRESENT and that its `exp` claim is
 * in the future. It does NOT verify the signature: the signing secret lives in
 * the backend and must never reach this runtime.
 *
 * That is fine, because this is a redirect optimisation, not the security
 * boundary. The backend verifies every request and re-reads the user, so a
 * forged or revoked token gets a 401 there whatever this file thinks. What this
 * buys is that a signed-out visitor is redirected before any dashboard HTML is
 * generated.
 */

/** Must match `SESSION_COOKIE` in services/admin.service.ts, which this runtime cannot import. */
const SESSION_COOKIE = 'homesprit_session';
const LOGIN_PATH = '/admin/login';
const DASHBOARD_PATH = '/admin/dashboard';

/**
 * Read the `exp` claim without verifying the signature. True only for a
 * well-formed, unexpired token; anything malformed counts as no session.
 */
export function hasUnexpiredToken(token: string | undefined, now = Date.now()): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const claims = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof claims.exp === 'number' && claims.exp * 1000 > now;
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isSignedIn = hasUnexpiredToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === LOGIN_PATH) {
    return isSignedIn
      ? NextResponse.redirect(new URL(DASHBOARD_PATH, request.url))
      : NextResponse.next();
  }

  if (!isSignedIn) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    // Remember where they were headed. Only the path and query — accepting a
    // full URL would make this an open redirect.
    if (pathname !== DASHBOARD_PATH && pathname !== '/admin') {
      loginUrl.searchParams.set('next', pathname + search);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  /* Dashboard pages only. `/api/admin/*` is deliberately NOT matched: login
     must stay reachable without a session and logout must work with an
     expired one; those routes do their own checking. */
  matcher: ['/admin/:path*'],
};
