import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { adminService } from '@/services/admin.service';
import {
  AdminShell,
  AdminUsersPage,
  BackendUnavailablePage,
} from '@/communities/admin-community';
import type { IUser } from '@/interface/admin.interface';

export const metadata: Metadata = { title: 'Team' };
export const dynamic = 'force-dynamic';

/**
 * Staff management — admins only. An agent is redirected to the overview; the
 * backend would refuse every request from this screen with a 403 anyway, so
 * this is courtesy, not the boundary.
 */
export default async function AdminUsers() {
  const session = await adminService.getSession();
  if (session.status === 'unauthenticated') redirect('/admin/login');
  if (session.status === 'unreachable') return <BackendUnavailablePage />;
  if (session.user.role !== 'admin') redirect('/admin/dashboard');

  const list = await adminService.getList<IUser>('users', { page: 1, page_size: 20, sort: 'name' });

  return (
    <AdminShell user={session.user}>
      <AdminUsersPage
        currentUser={session.user}
        initialRows={list?.items}
        initialTotal={list?.total}
      />
    </AdminShell>
  );
}
