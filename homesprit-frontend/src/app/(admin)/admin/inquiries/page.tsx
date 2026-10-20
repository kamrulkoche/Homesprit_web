import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { adminService } from '@/services/admin.service';
import {
  AdminInquiriesPage,
  AdminShell,
  BackendUnavailablePage,
} from '@/communities/admin-community';
import type { IInquiry, IInquiryCounts } from '@/interface/inquiry.interface';

export const metadata: Metadata = { title: 'Inquiries' };
// New inquiries arrive without anyone in the dashboard doing anything.
export const dynamic = 'force-dynamic';

export default async function AdminInquiries() {
  const session = await adminService.getSession();
  if (session.status === 'unauthenticated') redirect('/admin/login');
  if (session.status === 'unreachable') return <BackendUnavailablePage />;

  const [list, counts] = await Promise.all([
    adminService.getList<IInquiry>('inquiries', {
      page: 1,
      page_size: 20,
      sort: 'created_at',
      order: 'desc',
    }),
    adminService.getOne<IInquiryCounts>('inquiries/counts'),
  ]);

  return (
    <AdminShell user={session.user}>
      <AdminInquiriesPage
        user={session.user}
        initialRows={list?.items}
        initialTotal={list?.total}
        initialCounts={counts}
      />
    </AdminShell>
  );
}
