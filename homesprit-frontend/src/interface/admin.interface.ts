/**
 * Types for the dashboard and the transport around it.
 *
 * Hand-mirrored from homesprit-backend:
 *   IUser               <- modules/user/application/schemas/user_schema.py
 *   IAccountUpdate,
 *   IPasswordChange     <- modules/user/application/schemas/account_schema.py
 *   IDashboardResponse  <- modules/dashboard/application/schemas/dashboard_schema.py
 * The envelope and pagination shapes are the ones hgs-frontend declares, because
 * the backend kernel that produces them is the same.
 */

import type { IInquiry, IInquiryCounts } from './inquiry.interface';

export type UserRole = 'admin' | 'agent';
export type UserStatus = 'active' | 'inactive' | 'suspended';

/** `UserResponseSchema`. No password hash, by construction on the backend. */
export interface IUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

/** `UserCreateSchema`; `UserUpdateSchema` is a partial with `status`. */
export interface IUserWrite {
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status?: UserStatus;
  password?: string;
}

/** `AccountUpdateSchema` — what a user may change about themselves. */
export interface IAccountUpdate {
  name?: string;
  phone?: string | null;
}

/** `PasswordChangeSchema`. */
export interface IPasswordChange {
  current_password: string;
  new_password: string;
}

/** `PropertyCountsSchema`. */
export interface IPropertyCounts {
  draft: number;
  available: number;
  under_offer: number;
  sold: number;
  rented: number;
  archived: number;
  total: number;
}

/** `DashboardResponseSchema`. */
export interface IDashboardResponse {
  /** `all` for an admin, `own` for an agent — labels the cards. */
  scope: 'all' | 'own';
  properties: IPropertyCounts;
  inquiries: IInquiryCounts;
  /** Active agents. Null for an agent, who is not shown the number. */
  agents: number | null;
  recent_inquiries: IInquiry[];
  /** Sections whose read failed — rendered as unknown, never as zero. */
  unavailable: string[];
}

/** The backend's success envelope: `{ status, success: true, data }`. */
export interface IBackendEnvelope<T> {
  status: number;
  success: true;
  data: T;
}

/** The backend's error envelope: `{ status, success: false, error, details }`. */
export interface IBackendError {
  status: number;
  success: false;
  error: string;
  details?: Record<string, unknown>;
}

export interface ILoginResult {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: IUser;
}

/** The shared list contract — `PaginatedResponseSchema`. `page` is 1-based. */
export interface IPaginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/** What a soft delete returns. The row survives; it just leaves the site. */
export interface IDeleteResult {
  id: string;
  deleted: boolean;
  message: string;
}
