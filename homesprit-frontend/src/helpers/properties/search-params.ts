/**
 * The public search, as a URL.
 *
 * `/properties?city=Austin&listing_type=rent&page=2` is the state of the search
 * page: the server reads it to build the first page, the client writes it back
 * as filters change, and a visitor can share or bookmark it. This module is the
 * one translation between that URL and `IPropertySearch`, used on both sides,
 * so the server and the saga can never disagree about what a link means.
 *
 * Parsing is FORGIVING by design. A hand-edited `?page=abc` or a stale
 * `?property_type=castle` is dropped rather than turned into an error page —
 * the same reasoning as the backend's sort allowlist: it is usually an old
 * bookmark, and "here are all homes" is a better answer than a 422.
 *
 * Plain module: no `'use client'`.
 */

import type {
  IPropertySearch,
  ListingType,
  PropertyType,
} from '@/interface/property.interface';
import { LISTING_TYPE_LABELS, PROPERTY_TYPE_LABELS } from './labels';

/** Results per page on `/properties`. Four rows of three on a desktop. */
export const PAGE_SIZE = 12;

/** The sort choices a visitor sees, and what each sends to the backend. */
export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest', sort: 'listed_at', order: 'desc' },
  { value: 'price_asc', label: 'Price: low to high', sort: 'price', order: 'asc' },
  { value: 'price_desc', label: 'Price: high to low', sort: 'price', order: 'desc' },
  { value: 'largest', label: 'Largest first', sort: 'area_sqft', order: 'desc' },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]['value'];

type ParamSource =
  | URLSearchParams
  | Record<string, string | string[] | undefined>
  | undefined;

function read(source: ParamSource, key: string): string | undefined {
  if (!source) return undefined;
  const raw = source instanceof URLSearchParams ? source.get(key) : source[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** A non-negative integer, or undefined for anything else. */
function readInt(source: ParamSource, key: string, min = 0): number | undefined {
  const raw = read(source, key);
  if (raw === undefined || !/^\d+$/.test(raw)) return undefined;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= min ? value : undefined;
}

function readEnum<T extends string>(
  source: ParamSource,
  key: string,
  allowed: Record<T, string>
): T | undefined {
  const raw = read(source, key);
  return raw !== undefined && raw in allowed ? (raw as T) : undefined;
}

/** URL → search. Unknown or malformed values are dropped, never thrown. */
export function parseSearch(source: ParamSource): IPropertySearch {
  const search: IPropertySearch = {
    search: read(source, 'search'),
    city: read(source, 'city'),
    property_type: readEnum<PropertyType>(source, 'property_type', PROPERTY_TYPE_LABELS),
    listing_type: readEnum<ListingType>(source, 'listing_type', LISTING_TYPE_LABELS),
    min_price: readInt(source, 'min_price'),
    max_price: readInt(source, 'max_price'),
    min_bedrooms: readInt(source, 'min_bedrooms'),
    page: readInt(source, 'page', 1),
  };

  const sort = read(source, 'sort');
  const order = read(source, 'order');
  const option = SORT_OPTIONS.find((o) => o.sort === sort && o.order === order);
  if (option) {
    search.sort = option.sort;
    search.order = option.order;
  }

  // An inverted range would come back from the backend as a 422. Swapping it
  // is what the visitor meant.
  if (
    search.min_price !== undefined &&
    search.max_price !== undefined &&
    search.min_price > search.max_price
  ) {
    [search.min_price, search.max_price] = [search.max_price, search.min_price];
  }

  return compact(search);
}

/** Drop undefined keys and page 1, so equal searches serialise identically. */
export function compact(search: IPropertySearch): IPropertySearch {
  const out: IPropertySearch = {};
  for (const [key, value] of Object.entries(search) as [keyof IPropertySearch, unknown][]) {
    if (value === undefined || value === '' || value === null) continue;
    if (key === 'page' && value === 1) continue;
    (out as Record<string, unknown>)[key] = value;
  }
  return out;
}

/** Search → query object for the backend, with the page size applied. */
export function toApiQuery(search: IPropertySearch): Record<string, string> {
  const query: Record<string, string> = { page_size: String(PAGE_SIZE) };
  for (const [key, value] of Object.entries(compact(search))) {
    query[key] = String(value);
  }
  return query;
}

/** Search → `?city=Austin&page=2`, or `''` for the unfiltered search. */
export function toQueryString(search: IPropertySearch): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(compact(search))) {
    params.set(key, String(value));
  }
  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}

/** Which sort option a search is using — `newest` when it names none. */
export function sortValueOf(search: IPropertySearch): SortValue {
  return (
    SORT_OPTIONS.find((o) => o.sort === search.sort && o.order === search.order)?.value ??
    'newest'
  );
}

/** How many filters (not paging, not sorting) are active — for the "Clear" chip. */
export function activeFilterCount(search: IPropertySearch): number {
  const { page: _page, sort: _sort, order: _order, ...filters } = compact(search);
  return Object.keys(filters).length;
}
