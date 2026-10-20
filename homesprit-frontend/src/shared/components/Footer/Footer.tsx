import Link from 'next/link';
import { Mail, MapPin, Phone } from 'lucide-react';
import { siteConfig } from '@/config/siteConfig';
import { Logo } from '../Logo';

const COMPANY_LINKS = [
  { href: '/about', label: 'About us' },
  { href: '/faq', label: 'Questions & answers' },
  { href: '/privacy', label: 'Privacy policy' },
  { href: '/terms', label: 'Terms of use' },
  { href: '/admin/login', label: 'Agent sign in' },
] as const;

/** Public site footer. A Server Component: it reads only `siteConfig`. */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 bg-ink text-slate-300">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-4 sm:col-span-2 lg:col-span-1">
          <Logo className="text-white" />
          <p className="max-w-sm text-sm leading-relaxed text-slate-400">{siteConfig.description}</p>
        </div>

        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Explore</h2>
          <ul className="space-y-2.5 text-sm">
            <li>
              <Link className="hover:text-white" href="/properties?listing_type=sale">
                Homes for sale
              </Link>
            </li>
            <li>
              <Link className="hover:text-white" href="/properties?listing_type=rent">
                Homes to rent
              </Link>
            </li>
            <li>
              <Link className="hover:text-white" href="/contact">
                Talk to an agent
              </Link>
            </li>
            <li>
              <Link className="hover:text-white" href="/saved">
                Saved homes
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Company</h2>
          <ul className="space-y-2.5 text-sm">
            {COMPANY_LINKS.map((link) => (
              <li key={link.href}>
                <Link className="hover:text-white" href={link.href}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Contact</h2>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2.5">
              <Mail size={16} className="mt-0.5 shrink-0 text-brand-400" aria-hidden="true" />
              <a className="hover:text-white" href={`mailto:${siteConfig.email}`}>
                {siteConfig.email}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <Phone size={16} className="mt-0.5 shrink-0 text-brand-400" aria-hidden="true" />
              <a className="hover:text-white" href={`tel:${siteConfig.phone.replace(/\s/g, '')}`}>
                {siteConfig.phone}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <MapPin size={16} className="mt-0.5 shrink-0 text-brand-400" aria-hidden="true" />
              <span>{siteConfig.address}</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="container-page py-6 text-xs text-slate-500">
          © {year} {siteConfig.name}. Listing photos via Unsplash.
        </p>
      </div>
    </footer>
  );
}
