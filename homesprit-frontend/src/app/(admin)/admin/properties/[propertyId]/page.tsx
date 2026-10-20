import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { adminService } from '@/services/admin.service';
import {
  AdminPropertyEditPage,
  AdminShell,
  BackendUnavailablePage,
} from '@/communities/admin-community';
import type { IUser } from '@/interface/admin.interface';
import type { IAdminProperty } from '@/interface/property.interface';

export const metadata: Metadata = { title: 'Edit listing' };
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ propertyId: string }>;
}

/**
 * One listing's editor. A null read — a 404, an agent opening someone else's
 * listing (403), or the backend failing — hands the screen `loadFailed`, which
 * says so rather than rendering an empty form that would save as a new row.
 */
export default async function EditProperty({ params }: PageProps) {
  const { propertyId } = await params;
  const session = await adminService.getSession();
  if (session.status === 'unauthenticated') redirect('/admin/login');
  if (session.status === 'unreachable') return <BackendUnavailablePage />;

  const [property, staff] = await Promise.all([
    adminService.getOne<IAdminProperty>(`properties/${encodeURIComponent(propertyId)}`),
    session.user.role === 'admin'
      ? adminService.getList<IUser>('users', { page_size: 100, status: 'active', sort: 'name' })
      : Promise.resolve(null),
  ]);

  return (
    <AdminShell user={session.user}>
      <AdminPropertyEditPage
        key={property?.id ?? propertyId}
        user={session.user}
        property={property}
        loadFailed={property === null}
        agents={staff?.items ?? null}
      />
    </AdminShell>
  );
}
