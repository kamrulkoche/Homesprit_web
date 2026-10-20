import type { IAsyncState } from '@/interface/state.interface';
import type { IPaginated } from '@/interface/admin.interface';
import type {
  ICityCount,
  IProperty,
  IPropertySearch,
} from '@/interface/property.interface';

/**
 * Redux types for the public listings search.
 *
 * The row type (`IProperty`) is NOT redefined here — it lives in
 * `src/interface/property.interface.ts`, hand-mirrored from the backend. This
 * file holds only what Redux adds: the state shape and the action payloads.
 */

/** Payload for the list fetch: the whole search, which the store then holds. */
export type IFetchPropertiesPayload = IPropertySearch;

/**
 * Two independently-loading things, so two `IAsyncState`s rather than one
 * `isLoading` for the domain — the city picker and the results resolve
 * separately. `search` is the query the CURRENT `list` answers, so the filter
 * bar and the results can never describe two different searches.
 */
export interface IPropertiesState {
  search: IPropertySearch;
  list: IAsyncState<IPaginated<IProperty>>;
  cities: IAsyncState<ICityCount[]>;
}
