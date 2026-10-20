import type { Metadata } from 'next';
import { ContactPage } from '@/communities/website-community';

export const metadata: Metadata = {
  title: 'Talk to an agent',
  description: 'Selling, letting or still deciding where to look? Send Homesprit a message.',
};

export default function Contact() {
  return <ContactPage />;
}
