import { AdminApiError, adminApi, readFieldErrors, slugify, toQueryString } from '../admin-api';

function mockFetch(body: unknown, status: number) {
  const fn = jest.fn().mockResolvedValue({ ok: status < 400, status, json: () => Promise.resolve(body) });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

describe('admin-api', () => {
  it('goes through this app’s proxy and unwraps the envelope', async () => {
    const fetchMock = mockFetch({ status: 200, success: true, data: { total: 3 } }, 200);
    await expect(adminApi.get('properties', { page: 2, search: '', status: undefined })).resolves.toEqual({ total: 3 });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/admin/properties?page=2');
  });

  it('throws an error carrying the status and the per-field messages of a 422', async () => {
    mockFetch({ status: 422, success: false, error: 'Input should be greater than 0', details: { fields: { price: 'Input should be greater than 0' } } }, 422);
    const error = await adminApi.post('properties', {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AdminApiError);
    expect((error as AdminApiError).status).toBe(422);
    expect((error as AdminApiError).fields).toEqual({ price: 'Input should be greater than 0' });
  });

  it('reads a domain ValidationError as a field message too', () => {
    expect(
      readFieldErrors({ details: { field: 'agent_id', reason: 'Choose an active staff member.' } })
    ).toEqual({ agent_id: 'Choose an active staff member.' });
    expect(readFieldErrors({ details: { reason: 'nope' } })).toBeUndefined();
  });

  it('reports a network failure as status 0', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch;
    await expect(adminApi.get('dashboard')).rejects.toMatchObject({ status: 0 });
  });

  it('builds query strings without empties', () => {
    expect(toQueryString({ a: 1, b: '', c: null, d: undefined, e: false })).toBe('?a=1&e=false');
    expect(toQueryString({})).toBe('');
  });

  it('slugifies like the backend expects', () => {
    expect(slugify('  Café on Main St. #2! ')).toBe('cafe-on-main-st-2');
  });
});
