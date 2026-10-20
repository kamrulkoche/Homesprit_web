/**
 * Inquiry types, hand-mirrored from
 * `homesprit-backend/src/modules/inquiry/application/schemas/inquiry_schema.py`.
 */

export type InquiryStatus = 'new' | 'contacted' | 'closed';

/** `InquiryListingSchema` — the listing an inquiry is about. */
export interface IInquiryListing {
  id: string;
  title: string;
  slug: string;
  city: string;
  agent_id: string;
}

/** `InquiryAdminSchema`. */
export interface IInquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: InquiryStatus;
  property_id: string | null;
  listing: IInquiryListing | null;
  created_at: string;
  updated_at: string;
}

/** `InquiryCountsSchema`. */
export interface IInquiryCounts {
  new: number;
  contacted: number;
  closed: number;
  total: number;
}

/** What the inquiry form sends — `InquirySubmitSchema`. */
export interface IInquirySubmit {
  property_slug?: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
}
