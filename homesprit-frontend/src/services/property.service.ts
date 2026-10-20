import { publicApi } from '@/services/backend/public-api';
import { toApiQuery } from '@/helpers/properties/search-params';
import type { IPaginated } from '@/interface/admin.interface';
import type {
  ICityCount,
  IProperty,
  IPropertySearch,
} from '@/interface/property.interface';

/**
 * Listing reads for Server Components — the SSR half of the hybrid.
 *
 * A plain object literal of async methods that swallow errors, the shape every
 * hgs-frontend `*.service.ts` takes. The browser half of the same endpoints is
 * `services/api/properties.service.ts`, over axios through the `/api/public`
 * proxy; both are needed because one endpoint has two transports.
 *
 * Every method returns `null` for "could not read" and an empty result for
 * "read it, there is nothing". Callers keep the two apart.
 */
export const propertyService = {
  /** One page of the public search. */
  async search(search: IPropertySearch): Promise<IPaginated<IProperty> | null> {
    const query = new URLSearchParams(toApiQuery(search)).toString();
    return publicApi.get<IPaginated<IProperty>>(`/properties?${query}`, 'search');
  },

  /**
   * One listing for `/properties/[slug]`.
   *
   * Null for an unknown slug — which the route turns into a not-found page —
   * and also for a read failure, which it cannot tell apart from here. The
   * route resolves that with `getCities()`, as hgs-frontend's service detail
   * page does with `getAll()`: a list that came back means the backend is up
   * and the slug is genuinely absent.
   */
  async getBySlug(slug: string): Promise<IProperty | null> {
    return publicApi.get<IProperty>(`/properties/${encodeURIComponent(slug)}`, 'getBySlug');
  },

  /** The homepage's featured row. */
  async getFeatured(limit = 6): Promise<IProperty[] | null> {
    return publicApi.get<IProperty[]>(`/properties/featured?limit=${limit}`, 'getFeatured');
  },

  /** Cities with a listed home, for the city picker and the homepage strip. */
  async getCities(): Promise<ICityCount[] | null> {
    return publicApi.get<ICityCount[]>('/properties/cities', 'getCities');
  },
};
