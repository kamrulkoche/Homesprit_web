'use client';

import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AlertTriangle, SearchX } from 'lucide-react';
import { cn } from '@/helpers/utils/utils';
import {
  SORT_OPTIONS,
  sortValueOf,
  toQueryString,
  type SortValue,
} from '@/helpers/properties/search-params';
import { formatNumber } from '@/helpers/utils/format';
import type { IPropertySearch } from '@/interface/property.interface';
import type { AppDispatch } from '@/state/store';
import {
  fetchProperties,
  selectCities,
  selectPropertiesError,
  selectPropertiesErrorMessage,
  selectPropertiesLoading,
  selectPropertiesPage,
  selectPropertySearch,
} from '@/state/features/properties';
import { PropertyCard } from './PropertyCard';
import { PropertyFilters } from './PropertyFilters';
import { ResultsPagination } from './ResultsPagination';
import { StateCard } from './StateCard';

/**
 * `/properties` — the client half of the hybrid.
 *
 * The page's Server Component fetched the first page and seeded the store, so
 * this component only READS on its first render: no `useEffect` + dispatch on
 * mount, which would fire a second identical request and flicker (the rule
 * hgs-frontend's `ServicesPageContainer` follows). Every LATER read is a
 * dispatch from an event handler; the saga does the work.
 *
 * The URL is kept in step with `history.replaceState` rather than a router
 * navigation: a navigation would re-run the Server Component for a search the
 * saga is already fetching. `replace` rather than `push`, so typing a search
 * does not leave one history entry per keystroke.
 */
export function PropertiesPageContainer() {
  const dispatch = useDispatch<AppDispatch>();
  const search = useSelector(selectPropertySearch);
  const page = useSelector(selectPropertiesPage);
  const cities = useSelector(selectCities);
  const isLoading = useSelector(selectPropertiesLoading);
  const isError = useSelector(selectPropertiesError);
  const errorMessage = useSelector(selectPropertiesErrorMessage);

  const runSearch = useCallback(
    (next: IPropertySearch) => {
      dispatch(fetchProperties(next));
      window.history.replaceState(null, '', `/properties${toQueryString(next)}`);
    },
    [dispatch]
  );

  const changeSort = (value: SortValue) => {
    const option = SORT_OPTIONS.find((o) => o.value === value) ?? SORT_OPTIONS[0];
    runSearch({ ...search, sort: option.sort, order: option.order, page: undefined });
  };

  const changePage = (next: number) => {
    runSearch({ ...search, page: next });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const total = page?.total ?? 0;

  return (
    <div className="container-page py-10 md:py-14">
      <header className="mb-8 max-w-2xl">
        <p className="eyebrow">Homes on the market</p>
        <h1 className="mt-2 text-3xl font-extrabold text-ink dark:text-white md:text-4xl">
          {search.listing_type === 'rent'
            ? 'Homes to rent'
            : search.listing_type === 'sale'
              ? 'Homes for sale'
              : 'Find your next home'}
          {search.city ? ` in ${search.city}` : ''}
        </h1>
      </header>

      <PropertyFilters search={search} cities={cities} onChange={runSearch} />

      <div className="mb-6 mt-8 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted dark:text-slate-400" aria-live="polite">
          {page === null
            ? isLoading
              ? 'Searching…'
              : ' '
            : `${formatNumber(total)} ${total === 1 ? 'home' : 'homes'}`}
        </p>
        <label className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-ink-body dark:text-slate-300">Sort</span>
          <select
            className="field-input w-auto py-2"
            value={sortValueOf(search)}
            onChange={(event) => changeSort(event.target.value as SortValue)}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isError && page !== null && (
        <p role="alert" className="mb-6 rounded-2xl bg-accent-clay/10 px-4 py-3 text-sm font-medium text-accent-clay">
          {errorMessage ?? 'Could not refresh the results.'} Showing the last results that loaded.
        </p>
      )}

      {page === null ? (
        // The read FAILED — distinct from "nothing matches". There is no
        // static fallback here by design: a listing shown must be one that
        // exists (see docs/ARCHITECTURE.md).
        <StateCard
          icon={<AlertTriangle size={28} aria-hidden="true" />}
          title="We could not load listings"
          body={errorMessage ?? 'The listing service did not answer. Please try again in a moment.'}
          action={
            <button type="button" className="btn-primary" onClick={() => runSearch(search)} disabled={isLoading}>
              {isLoading ? 'Trying…' : 'Try again'}
            </button>
          }
        />
      ) : page.items.length === 0 ? (
        <StateCard
          icon={<SearchX size={28} aria-hidden="true" />}
          title="No homes match that search"
          body="Try a wider price range, another city, or fewer filters."
          action={
            <button
              type="button"
              className="btn-secondary"
              onClick={() => runSearch({ sort: search.sort, order: search.order })}
            >
              Clear filters
            </button>
          }
        />
      ) : (
        <>
          <ul
            className={cn(
              'grid gap-6 transition-opacity duration-300 sm:grid-cols-2 lg:grid-cols-3',
              // Dim rather than swap for a skeleton: a refetch should not pull
              // the cards out from under the pointer.
              isLoading && 'opacity-60'
            )}
            aria-busy={isLoading || undefined}
          >
            {page.items.map((property, index) => (
              <li key={property.id}>
                <PropertyCard property={property} priority={index < 3} />
              </li>
            ))}
          </ul>
          <ResultsPagination page={page.page} totalPages={page.total_pages} onPageChange={changePage} />
        </>
      )}
    </div>
  );
}
