/**
 * The saved-homes shortlist's storage format — a PLAIN module, shared by the
 * `/saved` Server Component (which reads the cookie with `cookies()`) and the
 * browser hook that writes it.
 *
 * A cookie rather than localStorage for one reason: the server can read it, so
 * `/saved` fetches its listings in the page like every other public route, and
 * the browser never needs a second transport for listing reads. Visitors have
 * no accounts (ARCHITECTURE.md §5), so the shortlist lives on their device.
 *
 * Only slugs are stored. A slug is the public identifier and stays reserved
 * after a soft delete, so a saved slug can never come to mean another home.
 */

export const SAVED_HOMES_COOKIE = 'homesprit_saved';

/**
 * The cap. Slugs run up to 180 characters and a cookie must stay under ~4 KB
 * with room to spare, so 20 × 180 = 3.6 KB is the ceiling — and twenty is more
 * than anyone compares at once.
 */
export const MAX_SAVED_HOMES = 20;

/** A year — a shortlist outlives a browsing session on purpose. */
export const SAVED_HOMES_MAX_AGE = 60 * 60 * 24 * 365;

/** The backend's slug rule (`shared/domain/slug.py`): lowercase words joined by hyphens. */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Cookie value → slugs. Tolerant: anything malformed (a hand-edited cookie, a
 * future format) is dropped rather than thrown, duplicates collapse, the cap
 * holds, and the order is the order saved — newest last.
 */
export function parseSavedHomes(raw: string | null | undefined): string[] {
  if (!raw) return [];
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return [];
  }
  const slugs: string[] = [];
  for (const part of decoded.split(',')) {
    const slug = part.trim();
    if (slug.length <= 180 && SLUG.test(slug) && !slugs.includes(slug)) slugs.push(slug);
    if (slugs.length === MAX_SAVED_HOMES) break;
  }
  return slugs;
}

/** Slugs → cookie value. */
export function serializeSavedHomes(slugs: readonly string[]): string {
  return encodeURIComponent(slugs.slice(0, MAX_SAVED_HOMES).join(','));
}

export type ToggleResult = 'saved' | 'removed' | 'full';

/** The next list after toggling one slug, and what happened. Pure, for the hook and the tests. */
export function toggleSavedHome(
  slugs: readonly string[],
  slug: string
): { slugs: string[]; result: ToggleResult } {
  if (slugs.includes(slug)) return { slugs: slugs.filter((s) => s !== slug), result: 'removed' };
  if (slugs.length >= MAX_SAVED_HOMES) return { slugs: [...slugs], result: 'full' };
  return { slugs: [...slugs, slug], result: 'saved' };
}
