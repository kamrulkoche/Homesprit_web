import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { asyncInitial } from '@/interface/state.interface';
import type { IPaginated } from '@/interface/admin.interface';
import type { ICityCount, IProperty } from '@/interface/property.interface';
import type { IFetchPropertiesPayload, IPropertiesState } from './properties.interface';

/**
 * The properties slice.
 *
 * Action naming follows the reference exactly: fetchX → fetchXSuccess →
 * fetchXFailed → resetX. The `fetchX` reducers only record the request and flip
 * flags; the saga watching `'properties/fetchProperties'` does the work.
 */
export const initialState: IPropertiesState = {
  search: {},
  list: { ...asyncInitial },
  cities: { ...asyncInitial },
};

const propertiesSlice = createSlice({
  name: 'properties',
  initialState,
  reducers: {
    // List
    fetchProperties: (state, action: PayloadAction<IFetchPropertiesPayload>) => {
      state.search = action.payload;
      state.list.isLoading = true;
      state.list.isError = false;
      state.list.isSuccess = false;
      state.list.errorMessage = null;
    },
    fetchPropertiesSuccess: (state, action: PayloadAction<IPaginated<IProperty>>) => {
      /* Assigned straight through, including an empty page: "no homes match"
         is an answer, and the grid says so. `data === null` is reserved for a
         read that FAILED — the null-vs-empty rule hgs-frontend carries into
         Redux, unchanged. */
      state.list.data = action.payload;
      state.list.isLoading = false;
      state.list.isSuccess = true;
      state.list.isError = false;
    },
    fetchPropertiesFailed: (state, action: PayloadAction<string>) => {
      state.list.isLoading = false;
      state.list.isError = true;
      state.list.isSuccess = false;
      state.list.errorMessage = action.payload;
      // `data` is left alone on purpose: a failed refetch should not blank
      // results the visitor is already reading.
    },
    resetProperties: (state) => {
      state.search = {};
      state.list = { ...asyncInitial };
    },

    // Cities
    fetchCities: (state) => {
      state.cities.isLoading = true;
      state.cities.isError = false;
      state.cities.errorMessage = null;
    },
    fetchCitiesSuccess: (state, action: PayloadAction<ICityCount[]>) => {
      state.cities.data = action.payload;
      state.cities.isLoading = false;
      state.cities.isSuccess = true;
    },
    fetchCitiesFailed: (state, action: PayloadAction<string>) => {
      state.cities.isLoading = false;
      state.cities.isError = true;
      state.cities.errorMessage = action.payload;
    },
  },
});

export const {
  fetchProperties,
  fetchPropertiesSuccess,
  fetchPropertiesFailed,
  resetProperties,
  fetchCities,
  fetchCitiesSuccess,
  fetchCitiesFailed,
} = propertiesSlice.actions;

export default propertiesSlice.reducer;
