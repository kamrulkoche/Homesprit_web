import type { Metadata } from 'next';
import { AboutPage } from '@/communities/website-community';
import { propertyService } from '@/services/property.service';
import { siteConfig } from '@/config/siteConfig';

export const metadata: Metadata = {
  title: 'About us',
  description: `Who ${siteConfig.name} is, how our agents work, and where we list homes.`,
  alternates: { canonical: '/about' },
};

// The figures are live counts.
export const dynamic = 'force-dynamic';

/** `/about` — two public reads in parallel; each figure drops out on its own if its read fails. */
export default async function About() {
  const [listed, cities] = await Promise.all([
    propertyService.search({}),
    propertyService.getCities(),
  ]);

  return <AboutPage listedCount={listed ? listed.total : null} cities={cities} />;
}
