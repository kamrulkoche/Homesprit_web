import type { Metadata } from 'next';
import { PropertiesPageContainer } from '@/communities/website-community';
import StoreProvider from '@/providers/StoreProvider';
import { propertyService } from '@/services/property.service';
import { asyncLoaded } from '@/interface/state.interface';
import { parseSearch } from '@/helpers/properties/search-params';
import { LISTING_TYPE_LABELS } from '@/helpers/properties/labels';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const search = parseSearch(await searchParams);
  const what = search.listing_type ? LISTING_TYPE_LABELS[search.listing_type] : 'Homes for sale and to rent';
  const where = search.city ? ` in ${search.city}` : '';
  return {
    title: `${what}${where}`,
    description: `Browse ${what.toLowerCase()}${where} on Homesprit — filter by price, type and bedrooms.`,
    alternates: { canonical: '/properties' },
  };
}

// Every request reads the database, so a listing published in the dashboard
// shows on the next request — hgs-frontend's treatment of its content routes.
export const dynamic = 'force-dynamic';

/**
 * `/properties` — the hybrid Redux pattern, end to end (hgs-frontend's
 * `/services` worked example, for a search):
 *
 *   page.tsx (server) ── parseSearch(URL) ── propertyService.search()   ← server-only URL
 *        └─ preloadedState ──► StoreProvider
 *                                  └─ PropertiesPageContainer reads the store
 *                                       └─ filter change → dispatch → saga → /api/public
 *
 * The first page renders as complete HTML — crawlable, no skeleton — and the
 * saga owns every read after it. `search()` returns null ONLY for a failed
 * read; `asyncLoaded(null)` carries that into the store, where the container
 * shows "could not load" rather than "no homes match".
 */
export default async function PropertiesPage({ searchParams }: PageProps) {
  const search = parseSearch(await searchParams);
  const [page, cities] = await Promise.all([
    propertyService.search(search),
    propertyService.getCities(),
  ]);

  return (
    <StoreProvider
      preloadedState={{
        properties: {
          search,
          list: asyncLoaded(page),
          cities: asyncLoaded(cities),
        },
      }}
    >
      <PropertiesPageContainer />
    </StoreProvider>
  );
}
