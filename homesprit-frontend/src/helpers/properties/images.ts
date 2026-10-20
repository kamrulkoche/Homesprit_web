/**
 * Image helpers shared by the public cards and the dashboard previews.
 * Plain module: no `'use client'`.
 */

import type { IProperty, IPropertyImage } from '@/interface/property.interface';

/**
 * Hosts `next/image` may optimise — keep in step with `images.remotePatterns`
 * in `next.config.mjs`. Any other host is rendered `unoptimized`: an agent can
 * paste a photo from anywhere, and an unknown host given to the optimiser
 * throws at render time.
 */
const OPTIMISABLE_HOSTS = new Set(['images.unsplash.com']);

export function isOptimisable(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && OPTIMISABLE_HOSTS.has(hostname);
  } catch {
    return false;
  }
}

/** The cover photo — lowest `display_order` — or null for a listing with none. */
export function coverImage(property: Pick<IProperty, 'images'>): IPropertyImage | null {
  if (!property.images?.length) return null;
  return [...property.images].sort((a, b) => a.display_order - b.display_order)[0];
}
