import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { SavedHomesPage } from '@/communities/website-community';
import { propertyService } from '@/services/property.service';
import { SAVED_HOMES_COOKIE, parseSavedHomes } from '@/helpers/properties/saved-homes';
import type { IProperty } from '@/interface/property.interface';

export const metadata: Metadata = {
  title: 'Saved homes',
  description: 'The homes you have shortlisted on this device.',
  // Different for every visitor; nothing here for a search engine.
  robots: { index: false, follow: true },
};

export const dynamic = 'force-dynamic';

/**
 * `/saved` — reads the shortlist cookie and fetches each listing in parallel.
 *
 * `getBySlug` returns null for a listing taken down AND for a failed read, so
 * any null is checked against `getCities()`, as the detail page does: when the
 * backend answers, a null slug is genuinely gone; when it does not, nothing is
 * called gone and the page says the read failed.
 */
export default async function SavedPage() {
  const slugs = parseSavedHomes((await cookies()).get(SAVED_HOMES_COOKIE)?.value);
  const results = await Promise.all(slugs.map((slug) => propertyService.getBySlug(slug)));

  const missing = slugs.filter((_, index) => results[index] === null);
  const unavailable = missing.length > 0 && (await propertyService.getCities()) === null;

  // Newest saved first.
  const properties = results.filter((p): p is IProperty => p !== null).reverse();

  return (
    <SavedHomesPage
      properties={properties}
      missing={unavailable ? [] : missing}
      unavailable={unavailable}
    />
  );
}
