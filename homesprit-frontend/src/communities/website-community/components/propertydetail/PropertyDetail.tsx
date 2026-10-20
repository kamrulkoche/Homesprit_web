'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  Bath,
  BedDouble,
  CalendarDays,
  Car,
  Check,
  Home,
  Mail,
  MapPin,
  Phone,
  Ruler,
} from 'lucide-react';
import {
  ENQUIRABLE,
  LISTING_TYPE_LABELS,
  PROPERTY_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
} from '@/helpers/properties/labels';
import { formatDate, formatNumber, formatPrice } from '@/helpers/utils/format';
import type { IProperty } from '@/interface/property.interface';
import { SaveHomeButton } from '@/shared/components/SaveHomeButton';
import { ListingStatusPill } from '../propertylist/ListingStatusPill';
import { InquiryForm } from './InquiryForm';
import { PropertyGallery } from './PropertyGallery';

/**
 * `/properties/[slug]`. The row arrives as a prop from the Server Component —
 * it is plain data, so it crosses the client boundary whole.
 */
export function PropertyDetail({ property }: { property: IProperty }) {
  const isLand = property.property_type === 'land';
  const canEnquire = ENQUIRABLE.has(property.status);

  const facts = [
    !isLand && { icon: BedDouble, label: 'Bedrooms', value: formatNumber(property.bedrooms) },
    !isLand && { icon: Bath, label: 'Bathrooms', value: formatNumber(property.bathrooms) },
    property.area_sqft !== null && {
      icon: Ruler,
      label: 'Floor area',
      value: `${formatNumber(property.area_sqft)} sq ft`,
    },
    { icon: Home, label: 'Type', value: PROPERTY_TYPE_LABELS[property.property_type] },
    property.year_built !== null && { icon: CalendarDays, label: 'Built', value: String(property.year_built) },
    !isLand && { icon: Car, label: 'Parking', value: formatNumber(property.parking_spaces) },
  ].filter(Boolean) as { icon: typeof BedDouble; label: string; value: string }[];

  return (
    <div className="container-page py-8 md:py-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/properties" className="btn-ghost -ml-3 px-3">
          <ArrowLeft size={16} aria-hidden="true" />
          All homes
        </Link>
        <SaveHomeButton slug={property.slug} title={property.title} variant="button" />
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-10">
          <PropertyGallery images={property.images} title={property.title} />

          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-800 dark:bg-brand-900/40 dark:text-brand-200">
                {LISTING_TYPE_LABELS[property.listing_type]}
              </span>
              <ListingStatusPill status={property.status} />
            </div>
            <h1 className="text-3xl font-extrabold leading-tight text-ink dark:text-white md:text-4xl">
              {property.title}
            </h1>
            <p className="flex items-start gap-2 text-ink-muted dark:text-slate-400">
              <MapPin size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              {[property.address, property.neighborhood, property.city].filter(Boolean).join(', ')}
            </p>
            <p className="font-display text-3xl font-extrabold text-brand-700 dark:text-brand-300">
              {formatPrice(property.price, property.listing_type)}
            </p>
          </header>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {facts.map(({ icon: Icon, label, value }) => (
              <div key={label} className="surface flex items-center gap-3 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sand text-brand-700 dark:bg-white/5 dark:text-brand-300">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted dark:text-slate-400">
                    {label}
                  </dt>
                  <dd className="font-bold text-ink dark:text-white">{value}</dd>
                </div>
              </div>
            ))}
          </dl>

          <section aria-labelledby="about-heading">
            <h2 id="about-heading" className="mb-3 text-xl font-bold text-ink dark:text-white">
              About this home
            </h2>
            <p className="whitespace-pre-line leading-relaxed text-ink-body dark:text-slate-300">
              {property.description}
            </p>
            {property.listed_at && (
              <p className="mt-4 text-sm text-ink-muted dark:text-slate-400">
                Listed {formatDate(property.listed_at)}
              </p>
            )}
          </section>

          {property.features.length > 0 && (
            <section aria-labelledby="features-heading">
              <h2 id="features-heading" className="mb-3 text-xl font-bold text-ink dark:text-white">
                Features
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {property.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5 text-ink-body dark:text-slate-300">
                    <Check size={16} className="shrink-0 text-brand-600 dark:text-brand-300" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="surface space-y-6 p-6">
            {property.agent && (
              <div>
                <p className="eyebrow">Listing agent</p>
                <p className="mt-2 text-lg font-bold text-ink dark:text-white">{property.agent.name}</p>
                <ul className="mt-2 space-y-1.5 text-sm">
                  <li>
                    <a
                      className="inline-flex items-center gap-2 text-brand-700 hover:underline dark:text-brand-300"
                      href={`mailto:${property.agent.email}`}
                    >
                      <Mail size={15} aria-hidden="true" />
                      {property.agent.email}
                    </a>
                  </li>
                  {property.agent.phone && (
                    <li>
                      <a
                        className="inline-flex items-center gap-2 text-brand-700 hover:underline dark:text-brand-300"
                        href={`tel:${property.agent.phone.replace(/\s/g, '')}`}
                      >
                        <Phone size={15} aria-hidden="true" />
                        {property.agent.phone}
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            )}

            <div className="border-t border-ink/[0.07] pt-6 dark:border-white/[0.08]">
              {canEnquire ? (
                <>
                  <h2 className="mb-4 text-lg font-bold text-ink dark:text-white">Ask about this home</h2>
                  <InquiryForm
                    propertySlug={property.slug}
                    defaultMessage={`Hi, I'm interested in "${property.title}". Could you tell me more?`}
                  />
                </>
              ) : (
                <p className="rounded-xl bg-sand px-4 py-3 text-sm text-ink-body dark:bg-white/5 dark:text-slate-300">
                  This home is {PROPERTY_STATUS_LABELS[property.status].toLowerCase()} and no longer takes
                  inquiries. <Link href="/properties" className="font-semibold text-brand-700 underline dark:text-brand-300">See homes on the market</Link>.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
