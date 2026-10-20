import Link from 'next/link';
import { Bath, BedDouble, MapPin, Ruler } from 'lucide-react';
import { ListingImage } from '@/shared/components/ListingImage';
import { SaveHomeButton } from '@/shared/components/SaveHomeButton';
import { coverImage } from '@/helpers/properties/images';
import { LISTING_TYPE_LABELS, PROPERTY_TYPE_LABELS } from '@/helpers/properties/labels';
import { formatNumber, formatPrice, plural } from '@/helpers/utils/format';
import type { IProperty } from '@/interface/property.interface';
import { ListingStatusPill } from './ListingStatusPill';

interface PropertyCardProps {
  property: IProperty;
  /** Eager-load the photo — for the first row above the fold. */
  priority?: boolean;
}

/**
 * One listing in a grid — the homepage's featured row and the search results.
 *
 * The whole card is one link, so the hit target is the card, but the link's
 * accessible name is the title alone: a screen reader announcing every fact on
 * the card as the link text is a sentence nobody wants to hear twelve times.
 */
export function PropertyCard({ property, priority }: PropertyCardProps) {
  const cover = coverImage(property);
  const place = [property.neighborhood, property.city].filter(Boolean).join(', ');
  const isLand = property.property_type === 'land';

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl border border-ink/[0.07] bg-white shadow-card transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-card-hover dark:border-white/[0.08] dark:bg-ink-soft">
      <div className="relative aspect-[4/3] overflow-hidden">
        <ListingImage
          src={cover?.url}
          alt={cover?.alt_text || property.title}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          priority={priority}
          className="transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-ink shadow-sm">
            {LISTING_TYPE_LABELS[property.listing_type]}
          </span>
          <ListingStatusPill status={property.status} />
        </div>
        <SaveHomeButton slug={property.slug} title={property.title} className="absolute right-3 top-3" />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <p className="font-display text-xl font-extrabold text-ink dark:text-white">
            {formatPrice(property.price, property.listing_type)}
          </p>
          <h3 className="mt-1 line-clamp-2 font-semibold leading-snug text-ink dark:text-slate-100">
            <Link
              href={`/properties/${property.slug}`}
              className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
            >
              {property.title}
            </Link>
          </h3>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-muted dark:text-slate-400">
            <MapPin size={14} aria-hidden="true" className="shrink-0" />
            <span className="truncate">{place}</span>
          </p>
        </div>

        <dl className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-ink/[0.07] pt-3 text-sm text-ink-body dark:border-white/[0.08] dark:text-slate-300">
          {!isLand && (
            <>
              <div className="flex items-center gap-1.5">
                <BedDouble size={15} aria-hidden="true" />
                <dt className="sr-only">Bedrooms</dt>
                <dd>{plural(property.bedrooms, 'bed')}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <Bath size={15} aria-hidden="true" />
                <dt className="sr-only">Bathrooms</dt>
                <dd>{plural(property.bathrooms, 'bath')}</dd>
              </div>
            </>
          )}
          {property.area_sqft !== null && (
            <div className="flex items-center gap-1.5">
              <Ruler size={15} aria-hidden="true" />
              <dt className="sr-only">Floor area</dt>
              <dd>{formatNumber(property.area_sqft)} sq ft</dd>
            </div>
          )}
          <div className="ml-auto text-xs font-semibold uppercase tracking-wide text-ink-muted dark:text-slate-400">
            <dt className="sr-only">Type</dt>
            <dd>{PROPERTY_TYPE_LABELS[property.property_type]}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
