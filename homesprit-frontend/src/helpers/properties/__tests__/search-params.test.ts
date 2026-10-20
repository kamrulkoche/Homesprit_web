import {
  PAGE_SIZE,
  activeFilterCount,
  parseSearch,
  sortValueOf,
  toApiQuery,
  toQueryString,
} from '../search-params';

describe('parseSearch', () => {
  it('reads every supported key from a URL', () => {
    const search = parseSearch(
      new URLSearchParams(
        'search=garden&city=Austin&property_type=house&listing_type=sale&min_price=100&max_price=900&min_bedrooms=3&sort=price&order=asc&page=2'
      )
    );
    expect(search).toEqual({
      search: 'garden',
      city: 'Austin',
      property_type: 'house',
      listing_type: 'sale',
      min_price: 100,
      max_price: 900,
      min_bedrooms: 3,
      sort: 'price',
      order: 'asc',
      page: 2,
    });
  });

  it('accepts the record Next hands a page, arrays included', () => {
    expect(parseSearch({ city: ['Denver', 'Austin'], page: '3' })).toEqual({ city: 'Denver', page: 3 });
  });

  it('drops malformed and unknown values instead of failing', () => {
    expect(
      parseSearch({
        property_type: 'castle',
        listing_type: 'lease',
        min_price: '-5',
        max_price: 'lots',
        page: '0',
        sort: 'password_hash',
        order: 'desc',
      })
    ).toEqual({});
  });

  it('swaps an inverted price range, which is what the visitor meant', () => {
    expect(parseSearch({ min_price: '900', max_price: '100' })).toEqual({ min_price: 100, max_price: 900 });
  });

  it('treats page 1 and blanks as absent so equal searches serialise identically', () => {
    expect(parseSearch({ page: '1', city: '  ' })).toEqual({});
  });
});

describe('serialising', () => {
  it('round-trips through a query string', () => {
    const search = { city: 'Austin', listing_type: 'rent' as const, page: 2 };
    expect(parseSearch(new URLSearchParams(toQueryString(search).slice(1)))).toEqual(search);
  });

  it('produces no query string for the unfiltered search', () => {
    expect(toQueryString({ page: 1, search: undefined })).toBe('');
  });

  it('adds the page size for the backend', () => {
    expect(toApiQuery({ city: 'Austin' })).toEqual({ page_size: String(PAGE_SIZE), city: 'Austin' });
  });
});

describe('sortValueOf / activeFilterCount', () => {
  it('names the sort, defaulting to newest', () => {
    expect(sortValueOf({ sort: 'price', order: 'desc' })).toBe('price_desc');
    expect(sortValueOf({})).toBe('newest');
  });

  it('counts filters but not paging or sorting', () => {
    expect(activeFilterCount({ city: 'Austin', min_bedrooms: 2, page: 3, sort: 'price', order: 'asc' })).toBe(2);
  });
});
