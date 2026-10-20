import { siteConfig } from '@/config/siteConfig';
import type { ListingType } from '@/interface/property.interface';

/**
 * Every number and date the site prints goes through here, with the locale and
 * currency from `siteConfig`.
 *
 * Neither reference project has a localization layer on the side Homesprit
 * follows (hgs-frontend is English-only), so this is the smallest thing that
 * keeps the option open: one place decides how a price looks, and adding a
 * locale later changes this file rather than every card.
 *
 * Formatters are built once at module load — `Intl.NumberFormat` construction
 * is the expensive part, and a results grid formats dozens of prices.
 */

const priceFormatter = new Intl.NumberFormat(siteConfig.locale, {
  style: 'currency',
  currency: siteConfig.currency,
  maximumFractionDigits: 0,
});

const compactFormatter = new Intl.NumberFormat(siteConfig.locale, {
  style: 'currency',
  currency: siteConfig.currency,
  notation: 'compact',
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat(siteConfig.locale);

const dateFormatter = new Intl.DateTimeFormat(siteConfig.locale, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat(siteConfig.locale, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

/**
 * "$1,250,000" for a sale, "$3,200/mo" for a rental — the listing type changes
 * what the number means, so it changes how it reads.
 */
export function formatPrice(price: number, listingType: ListingType): string {
  const amount = priceFormatter.format(price);
  return listingType === 'rent' ? `${amount}/mo` : amount;
}

/** "$1.3M" — for filter chips and tight spaces. */
export function formatCompactPrice(price: number): string {
  return compactFormatter.format(price);
}

/** "2,850" */
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** "14 Oct 2026", or an em dash for a missing value. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
}

/** "14 Oct 2026, 2:05 PM" — an inbox needs the time, not just the day. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date);
}

/** "1 bed" / "3 beds" — English plurals, kept here with the other wording. */
export function plural(count: number, one: string, many = `${one}s`): string {
  return `${formatNumber(count)} ${count === 1 ? one : many}`;
}
