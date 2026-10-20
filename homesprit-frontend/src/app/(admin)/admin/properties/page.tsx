import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { adminService } from '@/services/admin.service';
import {
  AdminPropertiesPage,
  AdminShell,
  BackendUnavailablePage,
} from '@/communities/admin-community';
import { PROPERTY_STATUS_LABELS } from '@/helpers/properties/labels';
import type { IUser } from '@/interface/admin.interface';
import type { IAdminProperty } from '@/interface/property.interface';

export const metadata: Metadata = { title: 'Listings' };
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * The listings table. Its first page is read here and handed down, so the
 * screen does not fetch on mount; a null read leaves `initialRows` undefined on
 * purpose, so the screen fetches, fails visibly and offers Try again.
 *
 * `?status=` comes from the dashboard's status breakdown, and the server read
 * sends the same filter the screen opens with.
 */
export default async function AdminProperties({ searchParams }: PageProps) {
  const session = await adminService.getSession();
  if (session.status === 'unauthenticated') redirect('/admin/login');
  if (session.status === 'unreachable') return <BackendUnavailablePage />;

  const raw = (await searchParams).status;
  const status = typeof raw === 'string' && raw in PROPERTY_STATUS_LABELS ? raw : undefined;
  const isAdmin = session.user.role === 'admin';

  const [list, staff] = await Promise.all([
    adminService.getList<IAdminProperty>('properties', {
      page: 1,
      page_size: 20,
      sort: 'updated_at',
      order: 'desc',
      status,
    }),
    isAdmin
      ? adminService.getList<IUser>('users', { page_size: 100, status: 'active', sort: 'name' })
      : Promise.resolve(null),
  ]);

  return (
    <AdminShell user={session.user}>
      <AdminPropertiesPage
        key={status ?? 'all'}
        user={session.user}
        initialRows={list?.items}
        initialTotal={list?.total}
        initialFilters={status ? { status } : undefined}
        agents={staff?.items ?? null}
      />
    </AdminShell>
  );
}
