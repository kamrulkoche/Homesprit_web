import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PropertyDetail } from '@/communities/website-community';
import { propertyService } from '@/services/property.service';
import { coverImage } from '@/helpers/properties/images';
import { formatPrice } from '@/helpers/utils/format';

interface PageProps {
  params: Promise<{ slug: string }>;
}

/** One request per render, shared by `generateMetadata` and the page. */
const getProperty = cache((slug: string) => propertyService.getBySlug(slug));

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const property = await getProperty((await params).slug);
  if (!property) return { title: 'Home not found' };

  const cover = coverImage(property);
  return {
    title: `${property.title} — ${formatPrice(property.price, property.listing_type)}`,
    description: property.description.slice(0, 160),
    alternates: { canonical: `/properties/${property.slug}` },
    openGraph: {
      title: property.title,
      description: property.description.slice(0, 160),
      images: cover ? [{ url: cover.url }] : undefined,
    },
  };
}

export const dynamic = 'force-dynamic';

/**
 * `/properties/[slug]`.
 *
 * `getBySlug` returns null for an unknown slug AND for a failed read, and the
 * page must not tell a visitor a home does not exist when the backend is
 * merely down. So a null is checked against `getCities()` — the approach
 * hgs-frontend's service detail page takes with `getAll()`: a list that came
 * back means the backend is up and the slug is genuinely absent.
 */
export default async function PropertyPage({ params }: PageProps) {
  const { slug } = await params;
  const property = await getProperty(slug);

  if (!property) {
    const reachable = (await propertyService.getCities()) !== null;
    if (reachable) notFound();
    throw new Error('The listing service is unavailable.');
  }

  return <PropertyDetail property={property} />;
}
