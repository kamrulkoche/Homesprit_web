'use client';

import Link from 'next/link';
import { ArrowRight, BadgeCheck, Clock, MapPin, MessagesSquare, ShieldCheck, UserRound } from 'lucide-react';
import { siteConfig } from '@/config/siteConfig';
import { formatNumber } from '@/helpers/utils/format';
import type { ICityCount } from '@/interface/property.interface';
import { CityGrid, CtaBand } from '../home/HomeSections';

interface AboutPageProps {
  /** Homes on the market now. Null when the read failed — the figure is left out, never shown as 0. */
  listedCount: number | null;
  cities: ICityCount[] | null;
}

const PRINCIPLES = [
  {
    icon: BadgeCheck,
    title: 'Only homes you can actually get',
    body: 'A listing leaves search the day it sells or lets. No stale ads kept up to fill the page.',
  },
  {
    icon: UserRound,
    title: 'One agent, start to finish',
    body: 'Every home has a named agent who wrote the listing, shows the home and answers your questions.',
  },
  {
    icon: MessagesSquare,
    title: 'Straight answers',
    body: 'Ask about any listing in one message. It reaches the agent who holds it, not a call centre.',
  },
  {
    icon: ShieldCheck,
    title: 'Your details stay with us',
    body: 'We use what you send to answer you, and nothing else. No sign-up, no marketing lists.',
  },
];

/**
 * `/about` — who Homesprit is. The figures come from the same public reads as
 * the homepage and drop out individually when a read fails, so the page is
 * shorter rather than wrong when the backend is down.
 */
export function AboutPage({ listedCount, cities }: AboutPageProps) {
  const stats = [
    listedCount !== null && { value: formatNumber(listedCount), label: listedCount === 1 ? 'home on the market' : 'homes on the market' },
    cities !== null && cities.length > 0 && { value: formatNumber(cities.length), label: cities.length === 1 ? 'city covered' : 'cities covered' },
    { value: '1 day', label: 'target reply time' },
    { value: '$0', label: 'to search and save' },
  ].filter(Boolean) as { value: string; label: string }[];

  return (
    <>
      <section className="container-page py-12 md:py-20">
        <div className="grid items-end gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="eyebrow">About {siteConfig.name}</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-[1.1] text-ink dark:text-white md:text-5xl">
              Local agents, honest listings, and a search that respects your time
            </h1>
          </div>
          <p className="text-lg leading-relaxed text-ink-body dark:text-slate-300">
            {siteConfig.name} started with a simple complaint: too many property sites are full of homes that are
            already gone. We list only what is genuinely available, put you in touch with the agent who knows each
            home, and make sure someone answers.
          </p>
        </div>

        <dl className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="surface flex flex-col-reverse gap-1 p-5 md:p-6">
              <dt className="text-sm text-ink-muted dark:text-slate-400">{stat.label}</dt>
              <dd className="font-display text-3xl font-extrabold text-brand-700 dark:text-brand-300 md:text-4xl">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="bg-white py-16 dark:bg-ink-soft md:py-20" aria-labelledby="principles-heading">
        <div className="container-page">
          <p className="eyebrow">What we hold to</p>
          <h2 id="principles-heading" className="mt-2 max-w-2xl text-3xl font-extrabold text-ink dark:text-white">
            Four promises behind every listing
          </h2>
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PRINCIPLES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="rounded-3xl border border-ink/[0.07] bg-sand p-6 dark:border-white/[0.08] dark:bg-ink">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600 text-white">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-lg font-bold text-ink dark:text-white">{title}</h3>
                <p className="mt-2 text-ink-body dark:text-slate-300">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-page py-16 md:py-20" aria-labelledby="office-heading">
        <div className="surface grid gap-8 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-10">
          <div>
            <p className="eyebrow">Visit us</p>
            <h2 id="office-heading" className="mt-2 text-2xl font-extrabold text-ink dark:text-white md:text-3xl">
              Our office is open six days a week
            </h2>
            <ul className="mt-5 space-y-2 text-ink-body dark:text-slate-300">
              <li className="flex items-start gap-2.5">
                <MapPin size={18} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-300" aria-hidden="true" />
                {siteConfig.address}
              </li>
              <li className="flex items-start gap-2.5">
                <Clock size={18} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-300" aria-hidden="true" />
                {siteConfig.hours}
              </li>
            </ul>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/contact" className="btn-primary">
              Talk to an agent
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link href="/faq" className="btn-secondary">
              Read the FAQ
            </Link>
          </div>
        </div>
      </section>

      <CityGrid cities={cities} />
      <div className="pt-16 md:pt-24">
        <CtaBand />
      </div>
    </>
  );
}
