import { NextResponse } from 'next/server';
import { BACKEND_URL } from '@/services/backend/public-api';

/**
 * Read-only passthrough to the backend's public API — what the browser-side
 * sagas call.
 *
 * Ported from hgs-frontend. The saga → axios path runs in the BROWSER and needs
 * a URL it can reach, but `HOMESPRIT_BACKEND_URL` is server-only on purpose,
 * so `apiConfig.ts` points axios at `/api/public` and this handler forwards it.
 * The backend's envelope passes through untouched, because the sagas are
 * written against it.
 *
 * GET only, no credentials forwarded. The allowlist is blast radius, not the
 * security boundary: a backend route under `/public` that the browser was
 * never meant to call stays unreachable until it is named here.
 */
const ALLOWED_PREFIXES = ['properties'] as const;

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
): Promise<Response> {
  const { path } = await context.params;

  if (!path?.length || !ALLOWED_PREFIXES.includes(path[0] as (typeof ALLOWED_PREFIXES)[number])) {
    return NextResponse.json(
      { status: 404, success: false, error: 'Unknown public resource.' },
      { status: 404 }
    );
  }

  // Per-segment encoding: a slug arrives from the URL, and `../` must not
  // climb out of the public namespace.
  const segments = path.map(encodeURIComponent).join('/');
  const search = new URL(request.url).search;
  const target = `${BACKEND_URL}/api/v1/public/${segments}${search}`;

  try {
    const upstream = await fetch(target, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    return new NextResponse(await upstream.text(), {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error(`/api/public: request failed (${target}). Is homesprit-backend running?`, error);
    return NextResponse.json(
      { status: 502, success: false, error: 'Backend unreachable.' },
      { status: 502 }
    );
  }
}
