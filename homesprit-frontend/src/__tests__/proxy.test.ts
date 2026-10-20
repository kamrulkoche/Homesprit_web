/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { hasUnexpiredToken, proxy } from '../proxy';

/** An unsigned JWT-shaped token — the proxy never checks signatures. */
function token(exp: number | string): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256' })}.${encode({ sub: 'u', exp })}.signature`;
}

const future = Math.floor(Date.now() / 1000) + 3600;
const past = Math.floor(Date.now() / 1000) - 60;

function request(path: string, cookie?: string): NextRequest {
  return new NextRequest(new URL(path, 'http://localhost:3002'), {
    headers: cookie ? { cookie: `homesprit_session=${cookie}` } : {},
  });
}

describe('hasUnexpiredToken', () => {
  it('accepts only a well-formed, unexpired token', () => {
    expect(hasUnexpiredToken(token(future))).toBe(true);
    expect(hasUnexpiredToken(token(past))).toBe(false);
    expect(hasUnexpiredToken(token('soon'))).toBe(false);
    expect(hasUnexpiredToken('not.a.jwt')).toBe(false);
    expect(hasUnexpiredToken(undefined)).toBe(false);
  });
});

describe('proxy', () => {
  it('sends a signed-out visitor to login, remembering only the path', () => {
    const response = proxy(request('/admin/properties?status=draft'));
    const location = new URL(response.headers.get('location') ?? '');
    expect(location.pathname).toBe('/admin/login');
    expect(location.searchParams.get('next')).toBe('/admin/properties?status=draft');
  });

  it('lets a signed-in visitor through, and away from the login page', () => {
    expect(proxy(request('/admin/properties', token(future))).headers.get('location')).toBeNull();
    const fromLogin = proxy(request('/admin/login', token(future)));
    expect(new URL(fromLogin.headers.get('location') ?? '').pathname).toBe('/admin/dashboard');
  });

  it('treats an expired cookie as signed out', () => {
    const response = proxy(request('/admin/dashboard', token(past)));
    expect(new URL(response.headers.get('location') ?? '').pathname).toBe('/admin/login');
  });
});
