'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  SAVED_HOMES_COOKIE,
  SAVED_HOMES_MAX_AGE,
  parseSavedHomes,
  serializeSavedHomes,
  toggleSavedHome,
  type ToggleResult,
} from '@/helpers/properties/saved-homes';

/**
 * The saved-homes shortlist as React state — one store for the navbar badge,
 * every heart on every card, and the `/saved` page, so saving on one updates
 * all of them at once.
 *
 * `useSyncExternalStore` over the cookie. The server snapshot is always empty
 * (the navbar is static chrome and does not read cookies), so a heart renders
 * unfilled in the HTML and fills on hydration without a mismatch warning.
 * Cookies fire no change events, so another tab's change is picked up when this
 * one regains focus.
 */

const listeners = new Set<() => void>();
const EMPTY: string[] = [];
let cache: { raw: string; slugs: string[] } = { raw: '', slugs: EMPTY };

function readRaw(): string {
  const prefix = `${SAVED_HOMES_COOKIE}=`;
  const entry = document.cookie.split('; ').find((part) => part.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : '';
}

function getSnapshot(): string[] {
  const raw = readRaw();
  // Same raw value → same array instance, or React re-renders forever.
  if (raw !== cache.raw) cache = { raw, slugs: parseSavedHomes(raw) };
  return cache.slugs;
}

function getServerSnapshot(): string[] {
  return EMPTY;
}

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('focus', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('focus', listener);
  };
}

function write(slugs: readonly string[]): void {
  const secure = window.location.protocol === 'https:' ? '; secure' : '';
  document.cookie = slugs.length
    ? `${SAVED_HOMES_COOKIE}=${serializeSavedHomes(slugs)}; path=/; max-age=${SAVED_HOMES_MAX_AGE}; samesite=lax${secure}`
    : `${SAVED_HOMES_COOKIE}=; path=/; max-age=0; samesite=lax${secure}`;
  emit();
}

export interface UseSavedHomesResult {
  slugs: string[];
  isSaved: (slug: string) => boolean;
  toggle: (slug: string) => ToggleResult;
  remove: (slugs: readonly string[]) => void;
  clear: () => void;
}

export function useSavedHomes(): UseSavedHomesResult {
  const slugs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const isSaved = useCallback((slug: string) => slugs.includes(slug), [slugs]);

  const toggle = useCallback((slug: string) => {
    // Read fresh rather than closing over `slugs`: two quick taps on two cards
    // must not each start from the same stale list.
    const next = toggleSavedHome(getSnapshot(), slug);
    if (next.result !== 'full') write(next.slugs);
    return next.result;
  }, []);

  const remove = useCallback((gone: readonly string[]) => {
    write(getSnapshot().filter((slug) => !gone.includes(slug)));
  }, []);

  const clear = useCallback(() => write([]), []);

  return { slugs, isSaved, toggle, remove, clear };
}
