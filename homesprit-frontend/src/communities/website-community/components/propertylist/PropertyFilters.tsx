'use client';

import { Search, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/helpers/utils/utils';
import { LISTING_TYPE_LABELS, PROPERTY_TYPE_LABELS, toOptions } from '@/helpers/properties/labels';
import { activeFilterCount } from '@/helpers/properties/search-params';
import type {
  ICityCount,
  IPropertySearch,
  ListingType,
  PropertyType,
} from '@/interface/property.interface';

interface PropertyFiltersProps {
  search: IPropertySearch;
  cities: ICityCount[] | null;
  /** Receives the WHOLE next search; the container decides what to do with it. */
  onChange: (next: IPropertySearch) => void;
}

const BEDROOM_OPTIONS = [1, 2, 3, 4, 5];

/** A whole-number price from an input, or undefined for blank or junk. */
function toPrice(raw: string): number | undefined {
  const digits = raw.replace(/[^\d]/g, '');
  return digits ? Number(digits) : undefined;
}

/**
 * The search form.
 *
 * Fully controlled by the store's `search` — no local copy to drift from it.
 * Every change hands the container a new search with `page` dropped, because
 * staying on page 4 of a result set that now has one page shows an empty grid
 * that reads as "nothing found" (hgs-frontend's `useAdminResource` rule, for
 * the public side).
 */
export function PropertyFilters({ search, cities, onChange }: PropertyFiltersProps) {
  const update = (patch: Partial<IPropertySearch>) => onChange({ ...search, ...patch, page: undefined });
  const count = activeFilterCount(search);

  return (
    <form
      role="search"
      aria-label="Search homes"
      onSubmit={(event) => event.preventDefault()}
      className="surface space-y-4 p-4 sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search by neighbourhood, street or keyword</span>
          <Search
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <input
            type="search"
            value={search.search ?? ''}
            onChange={(event) => update({ search: event.target.value || undefined })}
            placeholder="Neighbourhood, street or keyword"
            className="field-input pl-10"
          />
        </label>

        {/* Buy / Rent / Any — the filter that changes what "price" means, so it
            gets the most prominent control. */}
        <div
          role="radiogroup"
          aria-label="Listing type"
          className="inline-flex shrink-0 rounded-xl border border-ink/15 bg-white p-1 dark:border-white/15 dark:bg-ink"
        >
          {([undefined, 'sale', 'rent'] as (ListingType | undefined)[]).map((value) => {
            const selected = search.listing_type === value;
            return (
              <button
                key={value ?? 'any'}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => update({ listing_type: value })}
                className={cn(
                  'flex-1 rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors',
                  selected
                    ? 'bg-brand-600 text-white'
                    : 'text-ink-body hover:bg-ink/5 dark:text-slate-300 dark:hover:bg-white/10'
                )}
              >
                {value ? (value === 'sale' ? 'Buy' : 'Rent') : 'Any'}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <label className="col-span-2 sm:col-span-1">
          <span className="field-label">City</span>
          <select
            className="field-input"
            value={search.city ?? ''}
            onChange={(event) => update({ city: event.target.value || undefined })}
          >
            <option value="">Any city</option>
            {cities?.map((city) => (
              <option key={city.city} value={city.city}>
                {city.city} ({city.count})
              </option>
            ))}
            {/* A city from the URL that the list no longer offers stays
                selectable, so the control never shows a value it cannot hold. */}
            {search.city &&
              !cities?.some((c) => c.city.toLowerCase() === search.city?.toLowerCase()) && (
                <option value={search.city}>{search.city}</option>
              )}
          </select>
        </label>

        <label className="col-span-2 sm:col-span-1">
          <span className="field-label">Type</span>
          <select
            className="field-input"
            value={search.property_type ?? ''}
            onChange={(event) =>
              update({ property_type: (event.target.value || undefined) as PropertyType | undefined })
            }
          >
            <option value="">Any type</option>
            {toOptions(PROPERTY_TYPE_LABELS).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="field-label">Min price</span>
          <input
            inputMode="numeric"
            className="field-input"
            placeholder="No min"
            value={search.min_price ?? ''}
            onChange={(event) => update({ min_price: toPrice(event.target.value) })}
          />
        </label>

        <label>
          <span className="field-label">Max price</span>
          <input
            inputMode="numeric"
            className="field-input"
            placeholder="No max"
            value={search.max_price ?? ''}
            onChange={(event) => update({ max_price: toPrice(event.target.value) })}
          />
        </label>

        <label className="col-span-2 sm:col-span-1">
          <span className="field-label">Bedrooms</span>
          <select
            className="field-input"
            value={search.min_bedrooms ?? ''}
            onChange={(event) =>
              update({ min_bedrooms: event.target.value ? Number(event.target.value) : undefined })
            }
          >
            <option value="">Any</option>
            {BEDROOM_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}+
              </option>
            ))}
          </select>
        </label>
      </div>

      {count > 0 && (
        <div className="flex items-center justify-between gap-3 border-t border-ink/[0.07] pt-3 text-sm dark:border-white/[0.08]">
          <span className="inline-flex items-center gap-2 text-ink-muted dark:text-slate-400">
            <SlidersHorizontal size={15} aria-hidden="true" />
            {count} {count === 1 ? 'filter' : 'filters'} applied
            {search.listing_type && ` · ${LISTING_TYPE_LABELS[search.listing_type]}`}
          </span>
          <button
            type="button"
            onClick={() => onChange({ sort: search.sort, order: search.order })}
            className="btn-ghost px-3 py-1.5"
          >
            <X size={15} aria-hidden="true" />
            Clear filters
          </button>
        </div>
      )}
    </form>
  );
}
