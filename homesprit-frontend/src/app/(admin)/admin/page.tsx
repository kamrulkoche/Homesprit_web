import { redirect } from 'next/navigation';
import { adminService } from '@/services/admin.service';
import { BackendUnavailablePage } from '@/communities/admin-community';

export const dynamic = 'force-dynamic';

/**
 * Bare `/admin` renders nothing of its own: it resolves the session and sends
 * people where they belong — with the same three outcomes every dashboard page
 * checks, so a backend that is merely down never bounces to a login form that
 * would also fail.
 */
export default async function AdminIndex() {
  const session = await adminService.getSession();
  if (session.status === 'unreachable') return <BackendUnavailablePage />;
  if (session.status === 'unauthenticated') redirect('/admin/login');
  redirect('/admin/dashboard');
}
