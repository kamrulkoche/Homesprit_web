import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { adminService } from '@/services/admin.service';
import {
  AdminAccountPage,
  AdminShell,
  BackendUnavailablePage,
} from '@/communities/admin-community';

export const metadata: Metadata = { title: 'My account' };
export const dynamic = 'force-dynamic';

/**
 * The signed-in person's own profile and password — every role. The session
 * read already returns the profile, so there is no second request.
 */
export default async function AdminAccount() {
  const session = await adminService.getSession();
  if (session.status === 'unauthenticated') redirect('/admin/login');
  if (session.status === 'unreachable') return <BackendUnavailablePage />;

  return (
    <AdminShell user={session.user}>
      <AdminAccountPage user={session.user} />
    </AdminShell>
  );
}
