import reducer, {
  fetchCities,
  fetchCitiesSuccess,
  fetchProperties,
  fetchPropertiesFailed,
  fetchPropertiesSuccess,
  initialState,
  resetProperties,
} from '../properties.slice';
import { makeProperty, page } from '@/__fixtures__/property';

describe('properties slice', () => {
  it('records the search and flips the flags on fetch, leaving data alone', () => {
    const loaded = reducer(initialState, fetchPropertiesSuccess(page([makeProperty()])));
    const next = reducer(loaded, fetchProperties({ city: 'Austin' }));
    expect(next.search).toEqual({ city: 'Austin' });
    expect(next.list.isLoading).toBe(true);
    expect(next.list.data).toBe(loaded.list.data);
  });

  it('stores an empty page as an answer, not as a failure', () => {
    const next = reducer(initialState, fetchPropertiesSuccess(page([])));
    expect(next.list.data?.items).toEqual([]);
    expect(next.list.isSuccess).toBe(true);
  });

  it('keeps the last results when a refetch fails', () => {
    const loaded = reducer(initialState, fetchPropertiesSuccess(page([makeProperty()])));
    const failed = reducer(loaded, fetchPropertiesFailed('Network error'));
    expect(failed.list.isError).toBe(true);
    expect(failed.list.errorMessage).toBe('Network error');
    expect(failed.list.data?.items).toHaveLength(1);
  });

  it('resets the list and the search', () => {
    const loaded = reducer(reducer(initialState, fetchProperties({ city: 'Austin' })), fetchPropertiesSuccess(page([])));
    const reset = reducer(loaded, resetProperties());
    expect(reset.search).toEqual({});
    expect(reset.list.data).toBeNull();
  });

  it('tracks cities independently of the list', () => {
    const loading = reducer(initialState, fetchCities());
    expect(loading.cities.isLoading).toBe(true);
    expect(loading.list.isLoading).toBe(false);
    const done = reducer(loading, fetchCitiesSuccess([{ city: 'Austin', count: 3 }]));
    expect(done.cities.data).toEqual([{ city: 'Austin', count: 3 }]);
  });

  it('never aliases the two async branches (the spread rule)', () => {
    expect(initialState.list).not.toBe(initialState.cities);
  });
});
