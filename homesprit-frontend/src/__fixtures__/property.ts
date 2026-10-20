/**
 * Test fixtures shaped exactly like the backend's responses. Not a test file
 * itself (Jest matches only `__tests__/**\/*.test.*`), and imported by nothing
 * outside the tests, so it never reaches a bundle.
 */
import type { IAdminProperty, IProperty } from '@/interface/property.interface';
import type { IPaginated } from '@/interface/admin.interface';

export function makeProperty(overrides: Partial<IProperty> = {}): IProperty {
  return {
    id: 'p-1',
    title: 'Modern family home in Zilker',
    slug: 'modern-family-home-zilker',
    description: 'A light-filled modern home a short walk from the park.',
    property_type: 'house',
    listing_type: 'sale',
    status: 'available',
    price: 1250000,
    address: '2104 Barton Hills Dr',
    city: 'Austin',
    neighborhood: 'Zilker',
    bedrooms: 4,
    bathrooms: 3,
    area_sqft: 2850,
    year_built: 2019,
    parking_spaces: 2,
    features: ['Solar panels', 'Home office'],
    is_featured: true,
    listed_at: '2026-10-10T12:00:00Z',
    images: [
      { id: 'i-2', url: 'https://images.unsplash.com/photo-2', alt_text: 'Kitchen', display_order: 1 },
      { id: 'i-1', url: 'https://images.unsplash.com/photo-1', alt_text: 'Front of the house', display_order: 0 },
    ],
    agent: { id: 'a-1', name: 'Maya Chen', email: 'maya@homesprit.dev', phone: '+1 512 555 0142' },
    ...overrides,
  };
}

export function makeAdminProperty(overrides: Partial<IAdminProperty> = {}): IAdminProperty {
  return {
    ...makeProperty(),
    agent_id: 'a-1',
    is_active: true,
    created_at: '2026-10-01T09:00:00Z',
    updated_at: '2026-10-11T09:00:00Z',
    created_by: 'a-1',
    updated_by: 'a-1',
    ...overrides,
  };
}

export function page<T>(items: T[], overrides: Partial<IPaginated<T>> = {}): IPaginated<T> {
  return { items, total: items.length, page: 1, page_size: 12, total_pages: 1, ...overrides };
}
