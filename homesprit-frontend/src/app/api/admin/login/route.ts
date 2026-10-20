import { NextResponse } from 'next/server';
import { loginSchema } from '@/helpers/validation/auth.schema';
import { BACKEND_URL, SESSION_COOKIE } from '@/services/admin.service';
import type { IBackendEnvelope, ILoginResult } from '@/interface/admin.interface';

/**
 * Sign-in proxy — ported from hgs-frontend.
 *
 * The browser posts here, not to the backend, so the JWT can be written into an
 * httpOnly cookie that client-side JavaScript cannot read. The response is this
 * app's own `{ success, message }` / `{ success, error }`, the same shape as
 * `/api/inquiries`, so every form on the site reads its result the same way.
 */
export async function POST(request: Request) {
  try {
    const result = loginSchema.safeParse(await request.json().catch(() => null));
    if (!result.success) {
      const firstIssue = result.error.issues?.[0]?.message ?? 'Invalid input';
      return NextResponse.json({ success: false, error: firstIssue }, { status: 400 });
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    // The backend rate limits per (address, email); without the visitor's
    // address every sign-in would share this server's.
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) headers['X-Forwarded-For'] = forwardedFor;

    let backendResponse: Response;
    try {
      backendResponse = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers,
        body: JSON.stringify(result.data),
        cache: 'no-store',
      });
    } catch (err) {
      console.error('Login: backend unreachable:', err);
      return NextResponse.json(
        { success: false, error: 'Unable to reach the server. Please try again shortly.' },
        { status: 503 }
      );
    }

    const payload = await backendResponse.json().catch(() => null);

    if (!backendResponse.ok) {
      // Passed through verbatim. It is deliberately vague for bad credentials,
      // so this route must not embellish it — that would re-introduce account
      // enumeration.
      const error =
        (payload && typeof payload.error === 'string' && payload.error) ||
        'Invalid email or password.';
      return NextResponse.json({ success: false, error }, { status: backendResponse.status });
    }

    const data = (payload as IBackendEnvelope<ILoginResult>)?.data;
    if (!data?.access_token) {
      console.error('Login: unexpected backend payload shape');
      return NextResponse.json(
        { success: false, error: 'An unexpected error occurred.' },
        { status: 502 }
      );
    }

    const response = NextResponse.json({ success: true, message: 'Signed in successfully.' });
    response.cookies.set(SESSION_COOKIE, data.access_token, {
      httpOnly: true,
      // Lax, not Strict: Strict drops the cookie when someone follows a link
      // into the dashboard from an email. Lax still blocks the cross-site POSTs
      // CSRF relies on.
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      // The token's own lifetime, so the cookie cannot outlive it.
      maxAge: data.expires_in,
    });
    return response;
  } catch (err) {
    console.error('Login API error:', err);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
