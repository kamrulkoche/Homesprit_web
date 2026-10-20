/**
 * Display labels for the backend's enum values.
 *
 * A PLAIN data module — no `'use client'`, no components — so a Server
 * Component can import it, and so can the client components behind a barrel.
 * Keyed by the union types, so a value added on the backend and mirrored into
 * `property.interface.ts` fails the type check here until it has a label.
 */

import type { InquiryStatus } from '@/interface/inquiry.interface';
import type {
  ListingType,
  PropertyStatus,
  PropertyType,
} from '@/interface/property.interface';
import type { UserRole, UserStatus } from '@/interface/admin.interface';

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartment: 'Apartment',
  house: 'House',
  townhouse: 'Townhouse',
  villa: 'Villa',
  land: 'Land',
  commercial: 'Commercial',
};

export const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  sale: 'For sale',
  rent: 'For rent',
};

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  draft: 'Draft',
  available: 'Available',
  under_offer: 'Under offer',
  sold: 'Sold',
  rented: 'Rented',
  archived: 'Archived',
};

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  closed: 'Closed',
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  agent: 'Agent',
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspended',
};

/** Option lists for selects, in the order the enum declares them. */
export const toOptions = <T extends string>(labels: Record<T, string>) =>
  (Object.entries(labels) as [T, string][]).map(([value, label]) => ({ value, label }));

/**
 * Statuses a visitor can still act on. Mirrors `ENQUIRABLE_STATUSES` on the
 * backend — the detail page hides its inquiry form for anything else.
 */
export const ENQUIRABLE: ReadonlySet<PropertyStatus> = new Set(['available', 'under_offer']);
