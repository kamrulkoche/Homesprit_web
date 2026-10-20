import {
  CityGrid,
  CtaBand,
  FeaturedProperties,
  HomeHero,
  HowItWorks,
} from '@/communities/website-community';
import { propertyService } from '@/services/property.service';

// Reads listings, so a newly featured home appears without a rebuild.
export const dynamic = 'force-dynamic';

/**
 * `/` — two reads, in parallel, on the server; each band renders nothing when
 * its read failed, so a backend that is down leaves the page shorter, not
 * broken.
 */
export default async function HomePage() {
  const [featured, cities] = await Promise.all([
    propertyService.getFeatured(6),
    propertyService.getCities(),
  ]);

  return (
    <>
      <HomeHero cities={cities} />
      <FeaturedProperties properties={featured} />
      <CityGrid cities={cities} />
      <HowItWorks />
      <CtaBand />
    </>
  );
}
