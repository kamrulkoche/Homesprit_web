/**
 * @jest-environment node
 */
import { POST } from '../route';

const valid = {
  property_slug: 'modern-family-home-zilker',
  name: 'Priya Raman',
  email: 'priya@example.com',
  message: 'Could I view it on Saturday morning?',
};

function post(body: unknown, headers: Record<string, string> = {}) {
  return POST(
    new Request('http://localhost:3002/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    })
  );
}

function backendReplies(status: number, body: unknown) {
  const fn = jest.fn().mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  );
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

describe('POST /api/inquiries', () => {
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => undefined));
  afterEach(() => jest.restoreAllMocks());

  it('re-validates on the server and never calls the backend with a bad body', async () => {
    const fetchMock = backendReplies(201, {});
    const response = await post({ ...valid, email: 'nope' });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ success: false, fields: { email: expect.any(String) } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('forwards to the backend with the visitor’s address and relays its message', async () => {
    const fetchMock = backendReplies(201, { status: 201, success: true, data: { message: 'Thanks!' } });
    const response = await post(valid, { 'x-forwarded-for': '203.0.113.9' });

    expect(await response.json()).toEqual({ success: true, message: 'Thanks!' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8001/api/v1/public/inquiries');
    expect(init.headers['X-Forwarded-For']).toBe('203.0.113.9');
  });

  it('turns a 429 into a polite message', async () => {
    backendReplies(429, { status: 429, success: false, error: 'Too many attempts.' });
    const response = await post(valid);
    expect(response.status).toBe(429);
    expect((await response.json()).error).toMatch(/wait a few minutes/);
  });

  it('passes a sold listing’s reason through', async () => {
    backendReplies(422, {
      status: 422,
      success: false,
      error: 'Inquiry.property_slug: This home is no longer on the market.',
      details: { field: 'property_slug', reason: 'This home is no longer on the market.' },
    });
    const response = await post(valid);
    expect(await response.json()).toMatchObject({ success: false, error: 'This home is no longer on the market.' });
  });

  it('reports a backend that is down as 503', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('fetch failed')) as unknown as typeof fetch;
    expect((await post(valid)).status).toBe(503);
  });
});
