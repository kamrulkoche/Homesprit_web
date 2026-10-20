import type { Metadata } from 'next';
import { LegalPage } from '@/communities/website-community';
import { PRIVACY_POLICY } from '@/communities/website-community/components/legal/legal.data';

export const metadata: Metadata = {
  title: PRIVACY_POLICY.title,
  description: PRIVACY_POLICY.description,
  alternates: { canonical: '/privacy' },
};

export default function Privacy() {
  return <LegalPage document={PRIVACY_POLICY} />;
}
