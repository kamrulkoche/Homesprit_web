import { runSaga } from 'redux-saga';
import type { UnknownAction } from '@reduxjs/toolkit';
import propertiesApiService from '@/services/api/properties.service';
import { fetchCitiesSaga, fetchPropertiesSaga } from '../properties.saga';
import { fetchProperties } from '../properties.slice';
import { makeProperty, page } from '@/__fixtures__/property';

jest.mock('@/services/api/properties.service', () => ({
  __esModule: true,
  default: { searchProperties: jest.fn(), getCities: jest.fn() },
}));

const api = propertiesApiService as jest.Mocked<typeof propertiesApiService>;

/** Run one saga to completion and return what it dispatched. */
async function run<Args extends unknown[]>(saga: (...args: Args) => Generator, ...args: Args) {
  const dispatched: UnknownAction[] = [];
  const dispatch = (action: UnknownAction) => {
    dispatched.push(action);
  };
  await runSaga({ dispatch }, saga, ...args).toPromise();
  return dispatched;
}

describe('properties saga', () => {
  beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => undefined));
  afterEach(() => jest.restoreAllMocks());

  it('passes the search to the service and stores the page', async () => {
    const result = page([makeProperty()]);
    api.searchProperties.mockResolvedValue({ status: 200, success: true, data: result });

    const dispatched = await run(fetchPropertiesSaga, fetchProperties({ city: 'Austin' }));

    expect(api.searchProperties).toHaveBeenCalledWith({ city: 'Austin' });
    expect(dispatched).toEqual([{ type: 'properties/fetchPropertiesSuccess', payload: result }]);
  });

  it('turns a rejected request into a failure with a readable message', async () => {
    // The shape httpRequest rejects with: the backend's error envelope.
    api.searchProperties.mockRejectedValue({ status: 422, success: false, error: 'The minimum price is above the maximum.' });

    const dispatched = await run(fetchPropertiesSaga, fetchProperties({}));

    expect(dispatched).toEqual([
      { type: 'properties/fetchPropertiesFailed', payload: 'The minimum price is above the maximum.' },
    ]);
  });

  it('loads the cities', async () => {
    api.getCities.mockResolvedValue({ status: 200, success: true, data: [{ city: 'Austin', count: 2 }] });
    const dispatched = await run(fetchCitiesSaga);
    expect(dispatched).toEqual([
      { type: 'properties/fetchCitiesSuccess', payload: [{ city: 'Austin', count: 2 }] },
    ]);
  });
});
