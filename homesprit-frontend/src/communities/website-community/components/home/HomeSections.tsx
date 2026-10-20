'use client';

import Link from 'next/link';
import { ArrowRight, Building2, Handshake, MessageSquareText, SearchCheck } from 'lucide-react';
import { formatNumber } from '@/helpers/utils/format';
import type { ICityCount, IProperty } from '@/interface/property.interface';
import { PropertyCard } from '../propertylist/PropertyCard';

/**
 * The bands below the homepage hero.
 *
 * Each takes its data as a prop from the page's Server Component and renders
 * nothing when that data is absent — a failed read leaves the homepage shorter,
 * never broken. The copy is fixed in code: unlike HGS, Homesprit has no content
 * engine, because its editable content is the listings themselves.
 */

export function FeaturedProperties({ properties }: { properties: IProperty[] | null }) {
  if (!properties?.length) return null;

  return (
    <section className="container-page py-16 md:py-24" aria-labelledby="featured-heading">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Hand-picked</p>
          <h2 id="featured-heading" className="mt-2 text-3xl font-extrabold text-ink dark:text-white md:text-4xl">
            Featured homes
          </h2>
        </div>
        <Link href="/properties" className="btn-secondary">
          Browse every home
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {properties.map((property) => (
          <li key={property.id}>
            <PropertyCard property={property} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CityGrid({ cities }: { cities: ICityCount[] | null }) {
  if (!cities?.length) return null;

  return (
    <section className="bg-white py-16 dark:bg-ink-soft md:py-20" aria-labelledby="cities-heading">
      <div className="container-page">
        <p className="eyebrow">Where we work</p>
        <h2 id="cities-heading" className="mt-2 text-3xl font-extrabold text-ink dark:text-white">
          Browse by city
        </h2>
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {cities.map((city) => (
            <li key={city.city}>
              <Link
                href={`/properties?city=${encodeURIComponent(city.city)}`}
                className="group flex h-full flex-col justify-between gap-6 rounded-2xl border border-ink/[0.08] bg-sand p-4 transition-colors hover:border-brand-500 hover:bg-brand-50 dark:border-white/[0.08] dark:bg-ink dark:hover:border-brand-400 dark:hover:bg-brand-900/30"
              >
                <Building2 size={20} className="text-brand-600 dark:text-brand-300" aria-hidden="true" />
                <span>
                  <span className="block font-bold text-ink dark:text-white">{city.city}</span>
                  <span className="text-sm text-ink-muted dark:text-slate-400">
                    {formatNumber(city.count)} {city.count === 1 ? 'home' : 'homes'}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const STEPS = [
  {
    icon: SearchCheck,
    title: 'Search what is really available',
    body: 'Only homes still on the market appear in results. Sold and rented listings drop out the day the deal closes.',
  },
  {
    icon: MessageSquareText,
    title: 'Ask the agent directly',
    body: 'Every inquiry goes straight to the agent who holds the listing, with your question attached.',
  },
  {
    icon: Handshake,
    title: 'Hear back from a person',
    body: 'Agents answer from the dashboard the moment your message lands — no shared inbox in between.',
  },
];

export function HowItWorks() {
  return (
    <section className="container-page py-16 md:py-24" aria-labelledby="how-heading">
      <p className="eyebrow">How it works</p>
      <h2 id="how-heading" className="mt-2 max-w-2xl text-3xl font-extrabold text-ink dark:text-white md:text-4xl">
        From first search to first viewing, without the runaround
      </h2>
      <ol className="mt-10 grid gap-6 md:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, body }, index) => (
          <li key={title} className="surface p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600 text-white">
                <Icon size={20} aria-hidden="true" />
              </span>
              <span className="font-mono text-sm font-semibold text-ink-muted">0{index + 1}</span>
            </div>
            <h3 className="mt-5 text-lg font-bold text-ink dark:text-white">{title}</h3>
            <p className="mt-2 text-ink-body dark:text-slate-300">{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function CtaBand() {
  return (
    <section className="container-page">
      <div className="overflow-hidden rounded-4xl bg-brand-700 px-6 py-12 text-center text-white md:px-16 md:py-16">
        <h2 className="text-3xl font-extrabold md:text-4xl">Thinking of selling or letting?</h2>
        <p className="mx-auto mt-3 max-w-xl text-brand-100">
          Tell us about your place and an agent will call you back with a valuation.
        </p>
        <Link href="/contact" className="btn mt-8 bg-white text-ink hover:bg-sand">
          Talk to an agent
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
