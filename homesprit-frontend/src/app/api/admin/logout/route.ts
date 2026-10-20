import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BACKEND_URL, SESSION_COOKIE } from '@/services/admin.service';

/**
 * Sign-out — ported from hgs-frontend.
 *
 * Clearing the cookie is what actually ends the session, so it happens
 * unconditionally. The backend call is best-effort (it only logs in v1), and a
 * failure there must not leave someone who pressed "Sign out" signed in.
 */
export async function POST() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;

  if (token) {
    try {
      await fetch(`${BACKEND_URL}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
    } catch (err) {
      console.error('Logout: backend call failed (cookie cleared anyway):', err);
    }
  }

  const response = NextResponse.json({ success: true, message: 'Signed out successfully.' });
  // Same attributes it was written with, or the original survives.
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}
