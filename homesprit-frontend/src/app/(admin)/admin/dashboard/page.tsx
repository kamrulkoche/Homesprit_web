import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { adminService } from '@/services/admin.service';
import {
  AdminDashboardPage,
  AdminShell,
  BackendUnavailablePage,
} from '@/communities/admin-community';

export const metadata: Metadata = { title: 'Overview' };
export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const session = await adminService.getSession();
  if (session.status === 'unauthenticated') redirect('/admin/login');
  if (session.status === 'unreachable') return <BackendUnavailablePage />;

  const dashboard = await adminService.getDashboard();
  return (
    <AdminShell user={session.user}>
      <AdminDashboardPage user={session.user} dashboard={dashboard} />
    </AdminShell>
  );
}
