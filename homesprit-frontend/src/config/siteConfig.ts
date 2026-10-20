/**
 * Site-wide constants — the one place for the name, contact details and the
 * formatting locale. hgs-frontend keeps the same file for the same reason: so
 * the footer, the metadata and the contact page cannot drift apart.
 */
export const siteConfig = {
  name: 'Homesprit',
  tagline: 'Find the place that feels like home',
  description:
    'Homes for sale and to rent, listed by agents who know the neighbourhood. Search by city, budget and size, and ask about any listing in one message.',
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002').replace(/\/+$/, ''),
  email: 'hello@homesprit.dev',
  phone: '+1 512 555 0100',
  address: '500 Congress Ave, Austin, TX 78701',
  hours: 'Mon–Sat, 9am – 6pm',
  /** Every price and date on the site is formatted with these. */
  locale: 'en-US',
  currency: 'USD',
} as const;
