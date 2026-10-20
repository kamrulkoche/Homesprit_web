import type { PayloadAction } from '@reduxjs/toolkit';
import { debounce, takeLatest } from 'redux-saga/effects';
import { all, call, put } from 'typed-redux-saga';
import propertiesApiService from '@/services/api/properties.service';
import { logSagaError } from '@/helpers/utils/sagaErrorHandler';
import type { IFetchPropertiesPayload } from './properties.interface';
import {
  fetchCitiesFailed,
  fetchCitiesSuccess,
  fetchPropertiesFailed,
  fetchPropertiesSuccess,
} from './properties.slice';

/**
 * Side effects for the listings search.
 *
 * THE IMPORT RULE, carried over from both references because it is the single
 * easiest way to break a saga file:
 *   - `takeLatest` / `debounce` come from `redux-saga/effects`
 *   - `call` / `put` / `all` come from `typed-redux-saga`
 * A `takeLatest` from `typed-redux-saga` blocks on `yield`, so only the first
 * watcher registers and the rest fail silently.
 */

export function* fetchPropertiesSaga(action: PayloadAction<IFetchPropertiesPayload>) {
  try {
    const response = yield* call(propertiesApiService.searchProperties, action.payload);
    if (response?.success && response.data) {
      yield* put(fetchPropertiesSuccess(response.data));
    } else {
      yield* put(fetchPropertiesFailed(response?.message || 'Could not load listings.'));
    }
  } catch (error: unknown) {
    const errorDetails = logSagaError('fetchPropertiesSaga', error);
    yield* put(fetchPropertiesFailed(errorDetails.message));
  }
}

export function* fetchCitiesSaga() {
  try {
    const response = yield* call(propertiesApiService.getCities);
    if (response?.success) {
      yield* put(fetchCitiesSuccess(response.data ?? []));
    } else {
      yield* put(fetchCitiesFailed(response?.message || 'Could not load cities.'));
    }
  } catch (error: unknown) {
    const errorDetails = logSagaError('fetchCitiesSaga', error);
    yield* put(fetchCitiesFailed(errorDetails.message));
  }
}

function* propertiesWatcher() {
  // List reads debounce at 500ms — the reference's rule — so typing in the
  // search box issues one request, not one per keystroke. The slice flips
  // `isLoading` on dispatch, so the grid dims immediately regardless.
  yield debounce(500, 'properties/fetchProperties', fetchPropertiesSaga);
  yield takeLatest('properties/fetchCities', fetchCitiesSaga);
}

export default function* propertiesSaga() {
  yield* all([propertiesWatcher()]);
}
