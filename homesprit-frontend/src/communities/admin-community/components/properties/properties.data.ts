/**
 * The listing form's model and its two conversions. A PLAIN module — imported
 * by deep path, never through the `'use client'` barrel.
 *
 * The form holds numbers as STRINGS, because that is what an input holds: a
 * cleared "Year built" is `''`, not `0`, and the difference matters — `''` is
 * sent as `null` ("unknown"), where `0` would be a year.
 */

import type {
  IAdminProperty,
  IPropertyWrite,
  ListingType,
  PropertyStatus,
  PropertyType,
} from '@/interface/property.interface';

export interface IPhotoDraft {
  url: string;
  alt_text: string;
}

export interface IPropertyForm {
  title: string;
  slug: string;
  description: string;
  property_type: PropertyType;
  listing_type: ListingType;
  status: PropertyStatus;
  price: string;
  address: string;
  city: string;
  neighborhood: string;
  bedrooms: string;
  bathrooms: string;
  area_sqft: string;
  year_built: string;
  parking_spaces: string;
  /** One feature per line in the textarea. */
  features: string;
  is_featured: boolean;
  agent_id: string;
  images: IPhotoDraft[];
}

export const EMPTY_PROPERTY_FORM: IPropertyForm = {
  title: '',
  slug: '',
  description: '',
  property_type: 'apartment',
  listing_type: 'sale',
  status: 'draft',
  price: '',
  address: '',
  city: '',
  neighborhood: '',
  bedrooms: '0',
  bathrooms: '0',
  area_sqft: '',
  year_built: '',
  parking_spaces: '0',
  features: '',
  is_featured: false,
  agent_id: '',
  images: [],
};

/** A stored listing → the form's strings. */
export function formFromProperty(property: IAdminProperty): IPropertyForm {
  return {
    title: property.title,
    slug: property.slug,
    description: property.description,
    property_type: property.property_type,
    listing_type: property.listing_type,
    status: property.status,
    price: String(property.price),
    address: property.address,
    city: property.city,
    neighborhood: property.neighborhood ?? '',
    bedrooms: String(property.bedrooms),
    bathrooms: String(property.bathrooms),
    area_sqft: property.area_sqft === null ? '' : String(property.area_sqft),
    year_built: property.year_built === null ? '' : String(property.year_built),
    parking_spaces: String(property.parking_spaces),
    features: property.features.join('\n'),
    is_featured: property.is_featured,
    agent_id: property.agent_id,
    images: [...property.images]
      .sort((a, b) => a.display_order - b.display_order)
      .map((image) => ({ url: image.url, alt_text: image.alt_text ?? '' })),
  };
}

/** `'12'` → 12, `''` → null. Non-digits are stripped (thousands separators). */
function toNumberOrNull(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, '');
  return digits ? Number(digits) : null;
}

/**
 * The form → the write body the backend expects.
 *
 * Validation is the backend's job and its 422 names the field; this only
 * reshapes. Blank photo rows are dropped rather than sent as an invalid URL,
 * and `agent_id` is omitted when blank so the backend applies "the caller".
 */
export function writeBodyFromForm(form: IPropertyForm): IPropertyWrite {
  const body: IPropertyWrite = {
    title: form.title.trim(),
    slug: form.slug.trim(),
    description: form.description.trim(),
    property_type: form.property_type,
    listing_type: form.listing_type,
    status: form.status,
    price: toNumberOrNull(form.price) ?? 0,
    address: form.address.trim(),
    city: form.city.trim(),
    neighborhood: form.neighborhood.trim() || null,
    bedrooms: toNumberOrNull(form.bedrooms) ?? 0,
    bathrooms: toNumberOrNull(form.bathrooms) ?? 0,
    area_sqft: toNumberOrNull(form.area_sqft),
    year_built: toNumberOrNull(form.year_built),
    parking_spaces: toNumberOrNull(form.parking_spaces) ?? 0,
    features: form.features
      .split('\n')
      .map((feature) => feature.trim())
      .filter(Boolean),
    is_featured: form.is_featured,
    images: form.images
      .filter((image) => image.url.trim())
      .map((image) => ({ url: image.url.trim(), alt_text: image.alt_text.trim() || null })),
  };
  if (form.agent_id) body.agent_id = form.agent_id;
  return body;
}

/** Move one photo up or down; the first photo is the cover. */
export function movePhoto(images: IPhotoDraft[], index: number, delta: -1 | 1): IPhotoDraft[] {
  const target = index + delta;
  if (target < 0 || target >= images.length) return images;
  const next = [...images];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
