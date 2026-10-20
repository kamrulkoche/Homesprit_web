/**
 * Listing types.
 *
 * Hand-mirrored from `homesprit-backend/src/modules/property/application/
 * schemas/property_schema.py`. There is no generated client — a backend schema
 * change means editing both sides, the same arrangement hgs-frontend keeps.
 */

export type PropertyType =
  | 'apartment'
  | 'house'
  | 'townhouse'
  | 'villa'
  | 'land'
  | 'commercial';

export type ListingType = 'sale' | 'rent';

export type PropertyStatus =
  | 'draft'
  | 'available'
  | 'under_offer'
  | 'sold'
  | 'rented'
  | 'archived';

/** `PropertyImageResponseSchema`. The first by `display_order` is the cover. */
export interface IPropertyImage {
  id: string;
  url: string;
  alt_text: string | null;
  display_order: number;
}

/** `AgentPublicSchema` — who a visitor calls. */
export interface IAgent {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

/** `PropertyPublicSchema` — what the public site receives. */
export interface IProperty {
  id: string;
  title: string;
  slug: string;
  description: string;
  property_type: PropertyType;
  listing_type: ListingType;
  status: PropertyStatus;
  /** Whole currency units: a sale price, or monthly rent when `listing_type` is `rent`. */
  price: number;
  address: string;
  city: string;
  neighborhood: string | null;
  bedrooms: number;
  bathrooms: number;
  area_sqft: number | null;
  year_built: number | null;
  parking_spaces: number;
  features: string[];
  is_featured: boolean;
  listed_at: string | null;
  images: IPropertyImage[];
  agent: IAgent | null;
}

/** `PropertyAdminSchema` — plus ownership and the audit trail, for the dashboard. */
export interface IAdminProperty extends IProperty {
  agent_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

/** One photo in a write body — `PropertyImageWriteSchema`. */
export interface IPropertyImageWrite {
  url: string;
  alt_text?: string | null;
}

/** `PropertyCreateSchema`; `PropertyUpdateSchema` is its `Partial`. */
export interface IPropertyWrite {
  title: string;
  slug: string;
  description: string;
  property_type: PropertyType;
  listing_type: ListingType;
  status: PropertyStatus;
  price: number;
  address: string;
  city: string;
  neighborhood: string | null;
  bedrooms: number;
  bathrooms: number;
  area_sqft: number | null;
  year_built: number | null;
  parking_spaces: number;
  features: string[];
  is_featured: boolean;
  agent_id?: string;
  images: IPropertyImageWrite[];
}

/** `CityCountSchema` — one option in the city picker. */
export interface ICityCount {
  city: string;
  count: number;
}

/**
 * The public search's query — every key optional, and absent means "any".
 *
 * Mirrors `public_property_filters` + `list_query_params` on the backend. The
 * names ARE the query-string names, so `helpers/properties/search-params.ts`
 * can map between this and a URL without a lookup table.
 */
export interface IPropertySearch {
  search?: string;
  city?: string;
  property_type?: PropertyType;
  listing_type?: ListingType;
  min_price?: number;
  max_price?: number;
  min_bedrooms?: number;
  sort?: 'listed_at' | 'price' | 'area_sqft' | 'bedrooms';
  order?: 'asc' | 'desc';
  page?: number;
}
