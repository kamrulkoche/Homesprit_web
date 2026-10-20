'use client';

import Link from 'next/link';
import { ArrowRight, Building2, CircleDollarSign, Inbox, Plus, Users } from 'lucide-react';
import { AdminPageHeader, ErrorState, StatCard, StatusBadge } from '../ui';
import { cardClasses } from '../ui/admin-ui.data';
import { INQUIRY_STATUS_LABELS, PROPERTY_STATUS_LABELS } from '@/helpers/properties/labels';
import { formatDateTime } from '@/helpers/utils/format';
import type { IDashboardResponse, IUser } from '@/interface/admin.interface';
import type { PropertyStatus } from '@/interface/property.interface';

const STATUS_ORDER: PropertyStatus[] = ['available', 'under_offer', 'draft', 'sold', 'rented', 'archived'];

/**
 * `/admin/dashboard` — the overview.
 *
 * Numbers are scoped by the backend: an admin's are office-wide, an agent's are
 * their own, and the copy says which. A section the backend could not read is
 * listed in `unavailable` and renders as an em dash — "could not check", never
 * a zero that looks like real data (hgs-frontend's dashboard rule).
 */
export function AdminDashboardPage({ user, dashboard }: { user: IUser; dashboard: IDashboardResponse | null }) {
  const firstName = user.name.split(' ')[0];

  if (!dashboard) {
    return (
      <div className="w-full">
        <AdminPageHeader title={`Welcome, ${firstName}`} />
        <div className={cardClasses}>
          <ErrorState message="The overview could not be loaded. The listing and inquiry screens may still work." />
        </div>
      </div>
    );
  }

  const own = dashboard.scope === 'own';
  const missing = (section: string) => dashboard.unavailable.includes(section);
  const props = missing('properties') ? null : dashboard.properties;
  const inquiries = missing('inquiries') ? null : dashboard.inquiries;

  return (
    <div className="w-full space-y-8">
      <AdminPageHeader
        title={`Welcome, ${firstName}`}
        description={own ? 'Your listings and the inquiries about them.' : 'Everything across the office.'}
        actions={
          <Link href="/admin/properties/new" className="btn-primary">
            <Plus size={17} aria-hidden="true" />
            New listing
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={own ? 'Your listings' : 'All listings'}
          value={props?.total ?? null}
          hint={props ? `${props.draft} in draft` : undefined}
          icon={<Building2 size={18} aria-hidden="true" />}
        />
        <StatCard
          label="On the market"
          value={props ? props.available + props.under_offer : null}
          hint={props ? `${props.under_offer} under offer` : undefined}
          icon={<CircleDollarSign size={18} aria-hidden="true" />}
        />
        <StatCard
          label="New inquiries"
          value={inquiries?.new ?? null}
          hint={inquiries ? `${inquiries.total} in total` : undefined}
          icon={<Inbox size={18} aria-hidden="true" />}
        />
        {dashboard.agents !== null ? (
          <StatCard label="Active agents" value={dashboard.agents} icon={<Users size={18} aria-hidden="true" />} />
        ) : (
          <StatCard
            label="Closed or let"
            value={props ? props.sold + props.rented : null}
            icon={<Users size={18} aria-hidden="true" />}
          />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section className={`${cardClasses} p-6`} aria-labelledby="status-heading">
          <h2 id="status-heading" className="mb-4 font-bold text-ink dark:text-white">
            Listings by status
          </h2>
          {props ? (
            <ul className="space-y-3">
              {STATUS_ORDER.map((status) => {
                const count = props[status];
                const share = props.total ? Math.round((count / props.total) * 100) : 0;
                return (
                  <li key={status}>
                    <Link
                      href={`/admin/properties?status=${status}`}
                      className="group flex items-center gap-3 text-sm"
                    >
                      <span className="w-28 shrink-0 font-semibold text-ink-body group-hover:text-ink dark:text-slate-300">
                        {PROPERTY_STATUS_LABELS[status]}
                      </span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink/[0.06] dark:bg-white/[0.08]">
                        <span className="block h-full rounded-full bg-brand-500" style={{ width: `${share}%` }} />
                      </span>
                      <span className="w-8 text-right font-bold text-ink dark:text-white">{count}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted">Listing counts are unavailable right now.</p>
          )}
        </section>

        <section className={`${cardClasses} p-6`} aria-labelledby="recent-heading">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="recent-heading" className="font-bold text-ink dark:text-white">
              Latest inquiries
            </h2>
            <Link href="/admin/inquiries" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300">
              All inquiries
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
          {dashboard.recent_inquiries.length === 0 ? (
            <p className="text-sm text-ink-muted dark:text-slate-400">
              {inquiries ? 'No inquiries yet.' : 'Inquiries are unavailable right now.'}
            </p>
          ) : (
            <ul className="divide-y divide-ink/[0.06] dark:divide-white/[0.06]">
              {dashboard.recent_inquiries.map((inquiry) => (
                <li key={inquiry.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink dark:text-white">{inquiry.name}</p>
                    <p className="truncate text-sm text-ink-muted dark:text-slate-400">
                      {inquiry.listing?.title ?? 'General inquiry'} · {formatDateTime(inquiry.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={inquiry.status} label={INQUIRY_STATUS_LABELS[inquiry.status]} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
