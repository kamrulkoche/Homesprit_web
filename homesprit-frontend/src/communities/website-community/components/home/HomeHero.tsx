'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import Image from 'next/image';
import { siteConfig } from '@/config/siteConfig';
import { toQueryString } from '@/helpers/properties/search-params';
import type { ICityCount, ListingType } from '@/interface/property.interface';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2000&q=80';

/**
 * The homepage hero with a quick search.
 *
 * The search hands off to `/properties` as a URL — the same URL the full search
 * page writes — so the results page's Server Component renders the answer on
 * arrival rather than this component fetching anything.
 */
export function HomeHero({ cities }: { cities: ICityCount[] | null }) {
  const router = useRouter();
  const [listingType, setListingType] = useState<ListingType>('sale');
  const [city, setCity] = useState('');
  const [text, setText] = useState('');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    router.push(
      `/properties${toQueryString({
        listing_type: listingType,
        city: city || undefined,
        search: text.trim() || undefined,
      })}`
    );
  };

  return (
    <section className="relative isolate overflow-hidden">
      <Image
        src={HERO_IMAGE}
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/70 via-ink/55 to-ink/80" aria-hidden="true" />

      <div className="container-page flex min-h-[560px] flex-col justify-center py-20 md:min-h-[640px]">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-brand-200">
          Homes for sale and to rent
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-[1.05] text-white sm:text-5xl md:text-6xl">
          {siteConfig.tagline}
        </h1>
        <p className="mt-5 max-w-xl text-lg text-slate-200">
          Every listing is handled by a local agent who answers your questions directly — no
          call centres, no lead forms that go nowhere.
        </p>

        <form
          onSubmit={submit}
          role="search"
          aria-label="Quick search"
          className="mt-10 w-full max-w-3xl rounded-3xl bg-white p-3 shadow-card-hover dark:bg-ink-soft"
        >
          <div className="mb-3 flex gap-1 px-1" role="radiogroup" aria-label="Buy or rent">
            {(['sale', 'rent'] as ListingType[]).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={listingType === value}
                onClick={() => setListingType(value)}
                className={
                  listingType === value
                    ? 'rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-white dark:bg-white dark:text-ink'
                    : 'rounded-full px-4 py-1.5 text-sm font-semibold text-ink-body hover:bg-ink/5 dark:text-slate-300 dark:hover:bg-white/10'
                }
              >
                {value === 'sale' ? 'Buy' : 'Rent'}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="sm:w-48">
              <span className="sr-only">City</span>
              <select className="field-input h-12" value={city} onChange={(event) => setCity(event.target.value)}>
                <option value="">Any city</option>
                {cities?.map((option) => (
                  <option key={option.city} value={option.city}>
                    {option.city}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex-1">
              <span className="sr-only">Neighbourhood or keyword</span>
              <input
                className="field-input h-12"
                placeholder="Neighbourhood, street or keyword"
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
            </label>
            <button type="submit" className="btn-primary h-12 px-7">
              <Search size={18} aria-hidden="true" />
              Search
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
