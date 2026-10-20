'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  AdminPageHeader,
  ConfirmDialog,
  DataTable,
  EmptyState,
  FilterSelect,
  IconButton,
  IconLink,
  Pagination,
  SearchInput,
  SessionExpiredNotice,
  StatusBadge,
  Toolbar,
  useAdminResource,
  useToast,
  type DataTableColumn,
} from '../ui';
import { ListingImage } from '@/shared/components/ListingImage';
import { coverImage } from '@/helpers/properties/images';
import {
  LISTING_TYPE_LABELS,
  PROPERTY_STATUS_LABELS,
  toOptions,
} from '@/helpers/properties/labels';
import { formatDate, formatPrice } from '@/helpers/utils/format';
import type { IUser } from '@/interface/admin.interface';
import type { IAdminProperty, IPropertyWrite } from '@/interface/property.interface';

/** Statuses whose public page renders — "View on site" is offered for these. */
const VIEWABLE = new Set(['available', 'under_offer', 'sold', 'rented']);

interface AdminPropertiesPageProps {
  user: IUser;
  /** First page, read server-side. Undefined when that read failed. */
  initialRows?: IAdminProperty[];
  initialTotal?: number;
  /** Filters the first page was read WITH — `?status=` from the dashboard. */
  initialFilters?: Record<string, string>;
  /** Staff who can own a listing, for the admin's agent filter. Null for an agent. */
  agents: IUser[] | null;
}

/**
 * `/admin/properties` — the listings table.
 *
 * An agent sees their own listings and an admin sees everyone's; the BACKEND
 * decides that, whatever this screen sends. The agent column and filter are
 * shown to admins only because only they have more than one agent to tell
 * apart.
 */
export function AdminPropertiesPage({
  user,
  initialRows,
  initialTotal,
  initialFilters,
  agents,
}: AdminPropertiesPageProps) {
  const toast = useToast();
  const isAdmin = user.role === 'admin';
  const [pendingDelete, setPendingDelete] = useState<IAdminProperty | null>(null);

  const resource = useAdminResource<IAdminProperty, IPropertyWrite>({
    basePath: 'properties',
    initialRows,
    initialTotal,
    initialFilters,
    defaultSort: 'updated_at',
    defaultOrder: 'desc',
  });

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const ok = await resource.remove(pendingDelete.id);
    if (ok) toast.success(`“${pendingDelete.title}” removed from the site.`);
    else toast.error(resource.saveError ?? 'Could not remove the listing.');
    setPendingDelete(null);
  };

  const columns: DataTableColumn<IAdminProperty>[] = [
    {
      key: 'title',
      header: 'Listing',
      render: (row) => {
        const cover = coverImage(row);
        return (
          <div className="flex min-w-0 items-center gap-3">
            <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg">
              <ListingImage src={cover?.url} alt="" sizes="64px" />
            </span>
            <span className="min-w-0">
              <Link
                href={`/admin/properties/${row.id}`}
                className="block truncate font-semibold text-ink hover:text-brand-700 dark:text-white"
              >
                {row.title}
              </Link>
              <span className="block truncate text-sm text-ink-muted dark:text-slate-400">
                {[row.neighborhood, row.city].filter(Boolean).join(', ')}
                {row.is_featured && ' · Featured'}
              </span>
            </span>
          </div>
        );
      },
    },
    {
      key: 'price',
      header: 'Price',
      width: '10rem',
      render: (row) => (
        <span className="whitespace-nowrap font-semibold text-ink dark:text-white">
          {formatPrice(row.price, row.listing_type)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '8.5rem',
      render: (row) => <StatusBadge status={row.status} label={PROPERTY_STATUS_LABELS[row.status]} />,
    },
    ...(isAdmin
      ? [
          {
            key: 'agent',
            header: 'Agent',
            width: '10rem',
            render: (row: IAdminProperty) => row.agent?.name ?? '—',
          },
        ]
      : []),
    {
      key: 'updated_at',
      header: 'Updated',
      width: '8rem',
      render: (row) => formatDate(row.updated_at),
    },
  ];

  const filtered = Boolean(resource.search || Object.keys(resource.filters).length);

  return (
    <div className="w-full">
      <AdminPageHeader
        title="Listings"
        description={
          isAdmin ? 'Every listing in the office, any status.' : 'Your listings, any status.'
        }
        actions={
          <Link href="/admin/properties/new" className="btn-primary">
            <Plus size={17} aria-hidden="true" />
            New listing
          </Link>
        }
      />

      {resource.isUnauthorized && <SessionExpiredNotice />}

      <Toolbar>
        <SearchInput
          value={resource.search}
          onChange={resource.setSearch}
          placeholder="Search title, address, city…"
        />
        <FilterSelect
          label="Status"
          value={resource.filters.status ?? ''}
          onChange={(value) => resource.setFilter('status', value)}
          options={toOptions(PROPERTY_STATUS_LABELS)}
          allLabel="Any status"
        />
        <FilterSelect
          label="Listing"
          value={resource.filters.listing_type ?? ''}
          onChange={(value) => resource.setFilter('listing_type', value)}
          options={toOptions(LISTING_TYPE_LABELS)}
          allLabel="Sale or rent"
        />
        {isAdmin && agents && (
          <FilterSelect
            label="Agent"
            value={resource.filters.agent_id ?? ''}
            onChange={(value) => resource.setFilter('agent_id', value)}
            options={agents.map((agent) => ({ value: agent.id, label: agent.name }))}
            allLabel="Any agent"
          />
        )}
      </Toolbar>

      <DataTable
        columns={columns}
        rows={resource.rows}
        rowKey={(row) => row.id}
        isLoading={resource.isLoading}
        error={resource.error}
        onRetry={resource.isUnauthorized ? undefined : () => void resource.reload()}
        emptyState={
          <EmptyState
            icon={Building2}
            title={filtered ? 'Nothing matched' : 'No listings yet'}
            description={
              filtered
                ? 'No listing matches that search or filter. Clear it to see them all.'
                : 'Create your first listing — it stays a draft until you publish it.'
            }
            action={
              !filtered && (
                <Link href="/admin/properties/new" className="btn-primary">
                  <Plus size={17} aria-hidden="true" />
                  New listing
                </Link>
              )
            }
          />
        }
        actions={(row) => (
          <>
            {VIEWABLE.has(row.status) && (
              <IconLink label={`View “${row.title}” on the site`} href={`/properties/${row.slug}`}>
                <ExternalLink size={17} aria-hidden="true" />
              </IconLink>
            )}
            <IconLink label={`Edit “${row.title}”`} href={`/admin/properties/${row.id}`}>
              <Pencil size={17} aria-hidden="true" />
            </IconLink>
            <IconButton label={`Remove “${row.title}”`} tone="danger" onClick={() => setPendingDelete(row)}>
              <Trash2 size={17} aria-hidden="true" />
            </IconButton>
          </>
        )}
      />

      <Pagination
        page={resource.page}
        pageSize={resource.pageSize}
        total={resource.total}
        totalPages={resource.totalPages}
        onPageChange={resource.setPage}
      />

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="Remove this listing?"
        message={`“${pendingDelete?.title ?? ''}” will leave the dashboard and the site. Its inquiries are kept, and its web address stays reserved. To take it off the market without removing it, set it to Archived instead.`}
        confirmLabel="Remove listing"
        isBusy={resource.isSaving}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
