'use client';

import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { siteConfig } from '@/config/siteConfig';
import { InquiryForm } from '../propertydetail/InquiryForm';

/**
 * `/contact` — a general inquiry, about no listing in particular. It goes to
 * the admins' inbox; an inquiry about a listing goes to that listing's agent.
 */
export function ContactPage() {
  const details = [
    { icon: Mail, label: 'Email', value: siteConfig.email, href: `mailto:${siteConfig.email}` },
    { icon: Phone, label: 'Phone', value: siteConfig.phone, href: `tel:${siteConfig.phone.replace(/\s/g, '')}` },
    { icon: MapPin, label: 'Office', value: siteConfig.address, href: null },
    { icon: Clock, label: 'Hours', value: siteConfig.hours, href: null },
  ];

  return (
    <div className="container-page py-12 md:py-16">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <p className="eyebrow">Get in touch</p>
          <h1 className="mt-2 text-4xl font-extrabold text-ink dark:text-white">Talk to an agent</h1>
          <p className="mt-4 max-w-md text-lg text-ink-body dark:text-slate-300">
            Selling, letting, or still deciding where to look? Send us a note and the right agent
            will get back to you within one working day.
          </p>
          <ul className="mt-8 space-y-4">
            {details.map(({ icon: Icon, label, value, href }) => (
              <li key={label} className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink-muted dark:text-slate-400">{label}</p>
                  {href ? (
                    <a href={href} className="font-semibold text-ink hover:text-brand-700 dark:text-white">
                      {value}
                    </a>
                  ) : (
                    <p className="font-semibold text-ink dark:text-white">{value}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="surface p-6 md:p-8">
          <h2 className="mb-6 text-xl font-bold text-ink dark:text-white">Send a message</h2>
          <InquiryForm />
        </div>
      </div>
    </div>
  );
}
