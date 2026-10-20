/**
 * Dashboard navigation — a PLAIN module (no components), imported by deep
 * path, as hgs-frontend's `admin.data.ts` is.
 *
 * Icons are named here and resolved in the sidebar, so this stays plain data a
 * Server Component could read too.
 */

import type { UserRole } from '@/interface/admin.interface';

export type NavIcon = 'dashboard' | 'properties' | 'inquiries' | 'users' | 'account';

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
  /**
   * Who sees the link. Hiding it is courtesy, not security — the Users page
   * redirects an agent, and the backend refuses them with a 403 regardless.
   */
  roles: readonly UserRole[];
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/admin/dashboard', label: 'Overview', icon: 'dashboard', roles: ['admin', 'agent'] },
  { href: '/admin/properties', label: 'Listings', icon: 'properties', roles: ['admin', 'agent'] },
  { href: '/admin/inquiries', label: 'Inquiries', icon: 'inquiries', roles: ['admin', 'agent'] },
  { href: '/admin/users', label: 'Team', icon: 'users', roles: ['admin'] },
  { href: '/admin/account', label: 'My account', icon: 'account', roles: ['admin', 'agent'] },
];

/**
 * The link to highlight: the LONGEST href the path starts with, so
 * `/admin/properties/new` lights "Listings" — hgs-frontend's `activeNavHref`.
 */
export function activeNavHref(pathname: string, items: readonly NavItem[] = NAV_ITEMS): string | null {
  const matches = items.filter(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
  return matches.sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
}

export function navFor(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
