import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { adminService } from '@/services/admin.service';
import {
  AdminPropertyEditPage,
  AdminShell,
  BackendUnavailablePage,
} from '@/communities/admin-community';
import type { IUser } from '@/interface/admin.interface';

export const metadata: Metadata = { title: 'New listing' };
export const dynamic = 'force-dynamic';

export default async function NewProperty() {
  const session = await adminService.getSession();
  if (session.status === 'unauthenticated') redirect('/admin/login');
  if (session.status === 'unreachable') return <BackendUnavailablePage />;

  const staff =
    session.user.role === 'admin'
      ? await adminService.getList<IUser>('users', { page_size: 100, status: 'active', sort: 'name' })
      : null;

  return (
    <AdminShell user={session.user}>
      <AdminPropertyEditPage user={session.user} property={null} agents={staff?.items ?? null} />
    </AdminShell>
  );
}
