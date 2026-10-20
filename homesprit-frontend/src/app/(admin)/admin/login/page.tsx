import type { Metadata } from 'next';
import { AdminLoginPage } from '@/communities/admin-community';

export const metadata: Metadata = { title: 'Sign in' };

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** `proxy.ts` has already sent a signed-in visitor on to the dashboard. */
export default async function Login({ searchParams }: PageProps) {
  const next = (await searchParams).next;
  return <AdminLoginPage next={Array.isArray(next) ? next[0] : next} />;
}
