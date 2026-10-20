import type { Metadata } from 'next';
import { LegalPage } from '@/communities/website-community';
import { TERMS_OF_USE } from '@/communities/website-community/components/legal/legal.data';

export const metadata: Metadata = {
  title: TERMS_OF_USE.title,
  description: TERMS_OF_USE.description,
  alternates: { canonical: '/terms' },
};

export default function Terms() {
  return <LegalPage document={TERMS_OF_USE} />;
}
