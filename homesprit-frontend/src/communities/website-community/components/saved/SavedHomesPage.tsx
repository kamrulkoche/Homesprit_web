'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowRight, Heart, Info } from 'lucide-react';
import { MAX_SAVED_HOMES } from '@/helpers/properties/saved-homes';
import { useSavedHomes } from '@/shared/hooks/useSavedHomes';
import type { IProperty } from '@/interface/property.interface';
import { PropertyCard } from '../propertylist/PropertyCard';
import { StateCard } from '../propertylist/StateCard';

interface SavedHomesPageProps {
  /** Every saved listing the backend returned, most recently saved first. */
  properties: IProperty[];
  /** Saved slugs the backend answered "not found" for — taken down since. */
  missing: string[];
  /** The read failed: the backend is down, so nothing can be called missing. */
  unavailable: boolean;
}

type SortValue = 'saved' | 'price-asc' | 'price-desc';

const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: 'saved', label: 'Recently saved' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
];

const noopSubscribe = () => () => undefined;

/**
 * `/saved` — the visitor's shortlist. The listings are read on the server from
 * the cookie; this component only keeps the grid in step with the cookie as
 * the visitor un-hearts homes, so a removal is instant and needs no refetch.
 *
 * Before hydration the hook's snapshot is empty by design, so filtering on it
 * would render "nothing saved" into the HTML. The server's list is used until
 * the client has mounted.
 */
export function SavedHomesPage({ properties, missing, unavailable }: SavedHomesPageProps) {
  const router = useRouter();
  const { slugs, remove, clear } = useSavedHomes();
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [sort, setSort] = useState<SortValue>('saved');
  const [confirmingClear, setConfirmingClear] = useState(false);

  const visible = useMemo(() => {
    const kept = isClient ? properties.filter((p) => slugs.includes(p.slug)) : properties;
    if (sort === 'saved') return kept;
    const direction = sort === 'price-asc' ? 1 : -1;
    // Rent and sale prices are not comparable; group by listing type first.
    return [...kept].sort(
      (a, b) => a.listing_type.localeCompare(b.listing_type) || (a.price - b.price) * direction
    );
  }, [isClient, properties, slugs, sort]);

  const gone = isClient ? missing.filter((slug) => slugs.includes(slug)) : missing;
  const forSale = visible.filter((p) => p.listing_type === 'sale').length;
  const toRent = visible.length - forSale;

  if (unavailable && properties.length === 0) {
    return (
      <Shell>
        <StateCard
          icon={<AlertTriangle size={28} aria-hidden="true" />}
          title="We could not load your saved homes"
          body="The listing service did not answer. Your list is safe on this device — try again in a moment."
          action={
            <button type="button" className="btn-primary" onClick={() => router.refresh()}>
              Try again
            </button>
          }
        />
      </Shell>
    );
  }

  if (visible.length === 0 && gone.length === 0) {
    return (
      <Shell>
        <StateCard
          icon={<Heart size={28} aria-hidden="true" />}
          title="No saved homes yet"
          body="Tap the heart on any listing to keep it here, so you can compare your favourites side by side."
          action={
            <Link href="/properties" className="btn-primary">
              Browse homes
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          }
        />
      </Shell>
    );
  }

  return (
    <Shell
      summary={
        visible.length > 0
          ? `${visible.length} of ${MAX_SAVED_HOMES} saved${
              forSale && toRent ? ` · ${forSale} for sale, ${toRent} to rent` : ''
            }`
          : undefined
      }
      actions={
        visible.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-ink-body dark:text-slate-300">
              Sort
              <select
                className="field-input w-auto py-2"
                value={sort}
                onChange={(event) => setSort(event.target.value as SortValue)}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {confirmingClear ? (
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn bg-accent-clay text-white hover:brightness-95"
                  onClick={() => {
                    clear();
                    setConfirmingClear(false);
                  }}
                >
                  Clear all {visible.length + gone.length}
                </button>
                <button type="button" className="btn-ghost" onClick={() => setConfirmingClear(false)}>
                  Keep them
                </button>
              </span>
            ) : (
              <button type="button" className="btn-ghost" onClick={() => setConfirmingClear(true)}>
                Clear list
              </button>
            )}
          </div>
        )
      }
    >
      {unavailable && (
        <p role="alert" className="mb-6 rounded-2xl bg-accent-clay/10 px-4 py-3 text-sm font-medium text-accent-clay">
          Some saved homes could not be loaded right now. They are still on your list.
        </p>
      )}

      {gone.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Info size={17} className="shrink-0" aria-hidden="true" />
            {gone.length === 1
              ? 'One home you saved is no longer listed.'
              : `${gone.length} homes you saved are no longer listed.`}
          </p>
          <button type="button" className="btn-secondary py-2" onClick={() => remove(gone)}>
            Remove from list
          </button>
        </div>
      )}

      {visible.length > 0 && (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((property, index) => (
            <li key={property.id}>
              <PropertyCard property={property} priority={index < 3} />
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

function Shell({
  summary,
  actions,
  children,
}: {
  summary?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="container-page py-10 md:py-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Your shortlist</p>
          <h1 className="mt-2 text-3xl font-extrabold text-ink dark:text-white md:text-4xl">Saved homes</h1>
          <p className="mt-2 text-ink-muted dark:text-slate-400">
            {summary ?? 'Kept on this device — no account needed.'}
          </p>
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}
