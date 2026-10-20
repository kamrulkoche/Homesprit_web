import { NextResponse } from 'next/server';
import { BACKEND_URL } from '@/services/backend/public-api';
import { fieldErrors, inquirySchema } from '@/helpers/validation/inquiry.schema';

/**
 * The inquiry form's submit — hgs-frontend's `/api/contact`, for listings.
 *
 * Parse → validate with the same Zod schema the form uses (the browser is not
 * trusted) → forward to `POST <backend>/api/v1/public/inquiries` → answer with
 * this app's `{ success, message }` / `{ success, error, fields }`. The browser
 * only ever talks to this route, so `HOMESPRIT_BACKEND_URL` stays server-only.
 *
 * The visitor's address travels in `X-Forwarded-For`: the backend rate limits
 * per address, and without it every visitor would share this server's address
 * and one limit.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = inquirySchema.safeParse(body);
  if (!result.success) {
    const fields = fieldErrors(result.error);
    return NextResponse.json(
      { success: false, error: Object.values(fields)[0] ?? 'Invalid input', fields },
      { status: 400 }
    );
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) headers['X-Forwarded-For'] = forwardedFor;

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/api/v1/public/inquiries`, {
      method: 'POST',
      headers,
      body: JSON.stringify(result.data),
      cache: 'no-store',
    });
  } catch (err) {
    console.error('Inquiry API: backend unreachable:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'We could not send your message right now. Please try again shortly.',
      },
      { status: 503 }
    );
  }

  if (res.ok) {
    const payload = await res.json().catch(() => null);
    return NextResponse.json({
      success: true,
      message: payload?.data?.message ?? 'Thanks — your message has been sent.',
    });
  }

  if (res.status === 429) {
    return NextResponse.json(
      {
        success: false,
        error: 'You have sent several messages in a short time. Please wait a few minutes and try again.',
      },
      { status: 429 }
    );
  }

  // 404 (listing gone) and 422 (sold, or a rule the form missed) carry a
  // message worth showing; anything else is a fault the visitor cannot fix.
  if (res.status === 404 || res.status === 422) {
    const payload = await res.json().catch(() => null);
    const reason =
      res.status === 404
        ? 'This listing is no longer available.'
        : (payload?.details?.reason as string | undefined) ??
          (payload?.error as string | undefined) ??
          'Please check the form and try again.';
    return NextResponse.json(
      { success: false, error: reason, fields: payload?.details?.fields },
      { status: res.status }
    );
  }

  console.error('Inquiry API: backend error', res.status, await res.text().catch(() => ''));
  return NextResponse.json(
    { success: false, error: 'Failed to send. Please try again.' },
    { status: 502 }
  );
}
