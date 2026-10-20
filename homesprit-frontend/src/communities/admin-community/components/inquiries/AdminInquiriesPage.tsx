'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Inbox, Mail, Phone, Reply } from 'lucide-react';
import {
  AdminPageHeader,
  DataTable,
  EmptyState,
  FilterSelect,
  FormPanel,
  IconLink,
  Pagination,
  SearchInput,
  SessionExpiredNotice,
  StatusBadge,
  Toolbar,
  adminApi,
  useAdminResource,
  useToast,
  type DataTableColumn,
} from '../ui';
import { INQUIRY_STATUS_LABELS, toOptions } from '@/helpers/properties/labels';
import { formatDateTime } from '@/helpers/utils/format';
import type { IUser } from '@/interface/admin.interface';
import type { IInquiry, IInquiryCounts, InquiryStatus } from '@/interface/inquiry.interface';

interface AdminInquiriesPageProps {
  user: IUser;
  initialRows?: IInquiry[];
  initialTotal?: number;
  initialCounts?: IInquiryCounts | null;
}

/** A reply addressed to the visitor, naming the listing they asked about. */
function replyHref(row: IInquiry): string {
  const subject = row.listing ? `Re: ${row.listing.title}` : 'Re: your message to Homesprit';
  return `mailto:${row.email}?subject=${encodeURIComponent(subject)}`;
}

/**
 * `/admin/inquiries` — what visitors asked. hgs-frontend's Enquiries screen,
 * with one addition: each row names the listing it is about, and an agent's
 * inbox holds only inquiries about their own listings (the backend's scope).
 *
 * Nothing is editable except the status — the message is what the visitor
 * wrote — and nothing is deleted: an inquiry is closed, not removed.
 */
export function AdminInquiriesPage({ user, initialRows, initialTotal, initialCounts }: AdminInquiriesPageProps) {
  const toast = useToast();
  const [counts, setCounts] = useState<IInquiryCounts | null>(initialCounts ?? null);
  const [open, setOpen] = useState<IInquiry | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const resource = useAdminResource<IInquiry, { status: InquiryStatus }>({
    basePath: 'inquiries',
    initialRows,
    initialTotal,
    defaultSort: 'created_at',
    defaultOrder: 'desc',
  });

  const changeStatus = async (row: IInquiry, next: InquiryStatus) => {
    if (next === row.status) return;
    setBusyId(row.id);
    const saved = await resource.update(row.id, { status: next });
    setBusyId(null);
    if (!saved) {
      toast.error(resource.saveError ?? `Could not update the inquiry from ${row.name}.`);
      return;
    }
    toast.success(`Inquiry from ${row.name} marked ${INQUIRY_STATUS_LABELS[next].toLowerCase()}.`);
    if (open?.id === row.id) setOpen(saved);
    adminApi
      .get<IInquiryCounts>('inquiries/counts')
      .then(setCounts)
      .catch(() => undefined); // the counts keep their last figures; the list is right
  };

  const columns: DataTableColumn<IInquiry>[] = [
    {
      key: 'name',
      header: 'From',
      width: '15rem',
      render: (row) => (
        <div className="min-w-0">
          <span className="block font-semibold text-ink dark:text-white">{row.name}</span>
          <span className="block truncate text-sm text-ink-muted dark:text-slate-400">{row.email}</span>
        </div>
      ),
    },
    {
      key: 'message',
      header: 'Message',
      render: (row) => (
        <div className="min-w-0">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-brand-700 dark:text-brand-300">
            {row.listing ? row.listing.title : 'General inquiry'}
          </span>
          <span className="line-clamp-2 text-ink-body dark:text-slate-300">{row.message}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '9.5rem',
      render: (row) => (
        <select
          aria-label={`Status of the inquiry from ${row.name}`}
          className="field-input py-1.5"
          value={row.status}
          disabled={busyId === row.id}
          onChange={(event) => void changeStatus(row, event.target.value as InquiryStatus)}
        >
          {toOptions(INQUIRY_STATUS_LABELS).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'created_at',
      header: 'Received',
      width: '11rem',
      render: (row) => formatDateTime(row.created_at),
    },
  ];

  const waiting = counts?.new;
  const scope = user.role === 'admin' ? 'every listing, plus general messages' : 'your listings';
  const filtered = Boolean(resource.search || resource.filters.status);

  return (
    <div className="w-full">
      <AdminPageHeader
        title="Inquiries"
        description={
          waiting === undefined
            ? `Questions about ${scope}.`
            : `Questions about ${scope}. ${waiting === 0 ? 'Nothing is waiting for a reply.' : `${waiting} waiting for a reply.`}`
        }
      />

      {resource.isUnauthorized && <SessionExpiredNotice />}

      <Toolbar>
        <SearchInput
          value={resource.search}
          onChange={resource.setSearch}
          placeholder="Search name, email, phone or message…"
        />
        <FilterSelect
          label="Status"
          value={resource.filters.status ?? ''}
          onChange={(value) => resource.setFilter('status', value)}
          options={toOptions(INQUIRY_STATUS_LABELS).map((o) => ({
            ...o,
            label: counts ? `${o.label} (${counts[o.value]})` : o.label,
          }))}
          allLabel={counts ? `Any status (${counts.total})` : 'Any status'}
        />
      </Toolbar>

      <DataTable
        columns={columns}
        rows={resource.rows}
        rowKey={(row) => row.id}
        isLoading={resource.isLoading}
        error={resource.error}
        onRetry={resource.isUnauthorized ? undefined : () => void resource.reload()}
        onRowClick={setOpen}
        emptyState={
          <EmptyState
            icon={Inbox}
            title={filtered ? 'Nothing matched' : 'No inquiries yet'}
            description={
              filtered
                ? 'No inquiry matches that search or filter. Clear it to see them all.'
                : 'Questions sent from listing pages and the contact page will appear here.'
            }
          />
        }
        actions={(row) => (
          <IconLink label={`Reply to ${row.name} by email`} href={replyHref(row)}>
            <Reply size={18} aria-hidden="true" />
          </IconLink>
        )}
      />

      <Pagination
        page={resource.page}
        pageSize={resource.pageSize}
        total={resource.total}
        totalPages={resource.totalPages}
        onPageChange={resource.setPage}
      />

      <FormPanel
        isOpen={open !== null}
        placement="center"
        title={open ? `Inquiry from ${open.name}` : 'Inquiry'}
        description={open ? `Received ${formatDateTime(open.created_at)}` : undefined}
        onClose={() => setOpen(null)}
        onSubmit={(event) => event.preventDefault()}
        footer={
          open && (
            <>
              {open.status !== 'closed' && (
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={busyId === open.id}
                  onClick={() => void changeStatus(open, 'closed')}
                >
                  Close inquiry
                </button>
              )}
              {open.status === 'new' ? (
                <button
                  type="button"
                  className="btn-primary"
                  disabled={busyId === open.id}
                  onClick={() => void changeStatus(open, 'contacted')}
                >
                  Mark as contacted
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={busyId === open.id}
                  onClick={() => void changeStatus(open, 'new')}
                >
                  Mark as new
                </button>
              )}
            </>
          )
        }
      >
        {open && (
          <div className="space-y-6">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-semibold text-ink-muted dark:text-slate-400">Email</dt>
                <dd>
                  <a href={replyHref(open)} className="inline-flex items-center gap-1.5 break-all font-semibold text-brand-700 hover:underline dark:text-brand-300">
                    <Mail size={15} aria-hidden="true" />
                    {open.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-ink-muted dark:text-slate-400">Phone</dt>
                <dd>
                  {open.phone ? (
                    <a href={`tel:${open.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:underline dark:text-brand-300">
                      <Phone size={15} aria-hidden="true" />
                      {open.phone}
                    </a>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-ink-muted dark:text-slate-400">About</dt>
                <dd className="text-ink dark:text-white">
                  {open.listing ? (
                    <Link href={`/properties/${open.listing.slug}`} target="_blank" className="font-semibold hover:underline">
                      {open.listing.title}
                    </Link>
                  ) : (
                    'General inquiry'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-ink-muted dark:text-slate-400">Status</dt>
                <dd>
                  <StatusBadge status={open.status} label={INQUIRY_STATUS_LABELS[open.status]} />
                </dd>
              </div>
            </dl>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-ink-muted dark:text-slate-400">Message</h3>
              <p className="whitespace-pre-wrap break-words rounded-xl bg-sand p-4 text-ink-body dark:bg-white/[0.04] dark:text-slate-200">
                {open.message}
              </p>
            </div>
          </div>
        )}
      </FormPanel>
    </div>
  );
}
