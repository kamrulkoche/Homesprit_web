/**
 * The async-state wrapper every Redux domain in this repo uses.
 *
 * Ported verbatim from hgs-frontend, which hoisted it out of
 * `sp-company-ltd-ui`'s account community into this shared module.
 *
 * One slice usually holds SEVERAL of these — one per independently-loading
 * thing — rather than a single `isLoading` for the whole domain. That is what
 * lets `/properties` show a loaded grid while the city list is still resolving.
 */
export interface IAsyncState<T> {
  data: T | null;
  isSuccess: boolean;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
}

/**
 * The initial value for every `IAsyncState<T>` field.
 *
 * ALWAYS spread it (`{ ...asyncInitial }`) rather than assigning it — Immer
 * drafts the slice state, and handing the same frozen object to two fields
 * makes them alias.
 */
export const asyncInitial = {
  data: null,
  isSuccess: false,
  isLoading: false,
  isError: false,
  errorMessage: null,
} as const;

/**
 * Build a loaded `IAsyncState<T>` from data fetched on the SERVER.
 *
 * This is the hybrid half of the architecture (from hgs-frontend) and has no counterpart in
 * sp-company, which fetches everything in the browser. A public route
 * fetches during SSR and seeds the store through `preloadedState`, so the
 * first paint is complete HTML rather than a skeleton — the crawler-visible
 * content this site depends on. The saga still owns every LATER read
 * (pagination, filtering, refetch), which is why the slice and saga are
 * unchanged from the reference pattern.
 *
 * `data: null` is a legitimate seed: it means the server read failed and the
 * component should render its "could not load" state.
 */
export const asyncLoaded = <T>(data: T | null): IAsyncState<T> => ({
  data,
  isSuccess: data !== null,
  isLoading: false,
  isError: false,
  errorMessage: null,
});
