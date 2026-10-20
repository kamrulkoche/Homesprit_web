import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/siteConfig';
import { propertyService } from '@/services/property.service';

// Listings change constantly; a cached sitemap would advertise sold homes.
export const dynamic = 'force-dynamic';

/**
 * The public routes plus every listed home. `/admin/*` is excluded, as in
 * hgs-frontend. A failed read yields the static routes only — a sitemap must
 * never advertise a URL the routes would 404.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  // `/saved` is left out: it is different for every visitor and noindex.
  const routes: MetadataRoute.Sitemap = [
    { path: '', changeFrequency: 'daily', priority: 1 },
    { path: '/properties', changeFrequency: 'daily', priority: 0.8 },
    { path: '/contact', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/about', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/faq', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/privacy', changeFrequency: 'yearly', priority: 0.2 },
    { path: '/terms', changeFrequency: 'yearly', priority: 0.2 },
  ].map(({ path, changeFrequency, priority }) => ({
    url: `${base}${path}`,
    changeFrequency: changeFrequency as 'daily' | 'monthly' | 'yearly',
    priority,
  }));

  const listings: MetadataRoute.Sitemap = [];
  const first = await propertyService.search({});
  if (first) {
    const pages = [first];
    for (let page = 2; page <= first.total_pages && page <= 50; page += 1) {
      const next = await propertyService.search({ page });
      if (!next) break;
      pages.push(next);
    }
    for (const { items } of pages) {
      for (const property of items) {
        listings.push({
          url: `${base}/properties/${property.slug}`,
          lastModified: property.listed_at ?? undefined,
          changeFrequency: 'weekly',
          priority: 0.6,
        });
      }
    }
  }
  return [...routes, ...listings];
}
