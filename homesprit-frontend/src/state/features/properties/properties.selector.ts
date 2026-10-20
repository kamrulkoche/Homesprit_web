import type { RootState } from '@/state/store';

/**
 * Selectors for the listings search — plain functions typed against
 * `RootState`, as in the reference. Prefer the granular ones: reading a whole
 * branch re-renders on every flag change, including ones the component ignores.
 */

export const selectPropertySearch = (state: RootState) => state.properties.search;

export const selectPropertiesPage = (state: RootState) => state.properties.list.data;
export const selectPropertiesLoading = (state: RootState) => state.properties.list.isLoading;
export const selectPropertiesError = (state: RootState) => state.properties.list.isError;
export const selectPropertiesErrorMessage = (state: RootState) =>
  state.properties.list.errorMessage;

export const selectCities = (state: RootState) => state.properties.cities.data;
