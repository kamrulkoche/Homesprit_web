'use client';

import { useState } from 'react';
import { Pencil, UserPlus, Users } from 'lucide-react';
import {
  AdminPageHeader,
  DataTable,
  EmptyState,
  FilterSelect,
  FormField,
  FormPanel,
  IconButton,
  Pagination,
  SearchInput,
  SessionExpiredNotice,
  StatusBadge,
  Toolbar,
  useAdminResource,
  useToast,
  type DataTableColumn,
} from '../ui';
import { USER_ROLE_LABELS, USER_STATUS_LABELS, toOptions } from '@/helpers/properties/labels';
import { formatDate } from '@/helpers/utils/format';
import type { IUser, IUserWrite, UserRole, UserStatus } from '@/interface/admin.interface';

interface AdminUsersPageProps {
  currentUser: IUser;
  initialRows?: IUser[];
  initialTotal?: number;
}

interface Draft {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  password: string;
}

const EMPTY: Draft = { name: '', email: '', phone: '', role: 'agent', status: 'active', password: '' };

/**
 * `/admin/users` — staff accounts. Admins only; the page redirects an agent
 * and the backend refuses them regardless.
 *
 * No delete: an account that should stop working is set Inactive, which takes
 * effect on that person's next request and keeps their name on the listings
 * they handled.
 */
export function AdminUsersPage({ currentUser, initialRows, initialTotal }: AdminUsersPageProps) {
  const toast = useToast();
  const [editing, setEditing] = useState<IUser | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const resource = useAdminResource<IUser, IUserWrite>({
    basePath: 'users',
    initialRows,
    initialTotal,
    defaultSort: 'name',
  });

  const openNew = () => {
    resource.clearErrors();
    setDraft(EMPTY);
    setEditing('new');
  };

  const openEdit = (user: IUser) => {
    resource.clearErrors();
    setDraft({ name: user.name, email: user.email, phone: user.phone ?? '', role: user.role, status: user.status, password: '' });
    setEditing(user);
  };

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (editing === 'new') {
      const created = await resource.create({
        name: draft.name,
        email: draft.email,
        phone: draft.phone || null,
        role: draft.role,
        password: draft.password,
      });
      if (created) {
        toast.success(`${created.name} can now sign in.`);
        setEditing(null);
      }
      return;
    }
    if (editing) {
      const body: Partial<IUserWrite> = {
        name: draft.name,
        phone: draft.phone || null,
        role: draft.role,
        status: draft.status,
      };
      if (draft.password) body.password = draft.password;
      const updated = await resource.update(editing.id, body);
      if (updated) {
        toast.success(`${updated.name} updated.`);
        setEditing(null);
      }
    }
  };

  const columns: DataTableColumn<IUser>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <div className="min-w-0">
          <span className="block font-semibold text-ink dark:text-white">
            {row.name}
            {row.id === currentUser.id && <span className="ml-2 text-xs font-medium text-ink-muted">(you)</span>}
          </span>
          <span className="block truncate text-sm text-ink-muted dark:text-slate-400">{row.email}</span>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      width: '8rem',
      render: (row) => <StatusBadge status={row.role} label={USER_ROLE_LABELS[row.role]} />,
    },
    {
      key: 'status',
      header: 'Status',
      width: '8rem',
      render: (row) => <StatusBadge status={row.status} label={USER_STATUS_LABELS[row.status]} />,
    },
    {
      key: 'last_login_at',
      header: 'Last sign-in',
      width: '9rem',
      render: (row) => (row.last_login_at ? formatDate(row.last_login_at) : 'Never'),
    },
  ];

  const isNew = editing === 'new';
  const errors = resource.fieldErrors;

  return (
    <div className="w-full">
      <AdminPageHeader
        title="Team"
        description="Who can sign in to the dashboard. Agents manage their own listings; admins manage everything."
        actions={
          <button type="button" className="btn-primary" onClick={openNew}>
            <UserPlus size={17} aria-hidden="true" />
            Add person
          </button>
        }
      />

      {resource.isUnauthorized && <SessionExpiredNotice />}

      <Toolbar>
        <SearchInput value={resource.search} onChange={resource.setSearch} placeholder="Search name or email…" />
        <FilterSelect
          label="Role"
          value={resource.filters.role ?? ''}
          onChange={(value) => resource.setFilter('role', value)}
          options={toOptions(USER_ROLE_LABELS)}
          allLabel="Any role"
        />
        <FilterSelect
          label="Status"
          value={resource.filters.status ?? ''}
          onChange={(value) => resource.setFilter('status', value)}
          options={toOptions(USER_STATUS_LABELS)}
          allLabel="Any status"
        />
      </Toolbar>

      <DataTable
        columns={columns}
        rows={resource.rows}
        rowKey={(row) => row.id}
        isLoading={resource.isLoading}
        error={resource.error}
        onRetry={resource.isUnauthorized ? undefined : () => void resource.reload()}
        onRowClick={openEdit}
        emptyState={<EmptyState icon={Users} title="Nobody matched" description="Clear the search or filters to see everyone." />}
        actions={(row) => (
          <IconButton label={`Edit ${row.name}`} onClick={() => openEdit(row)}>
            <Pencil size={17} aria-hidden="true" />
          </IconButton>
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
        isOpen={editing !== null}
        title={isNew ? 'Add a person' : `Edit ${draft.name}`}
        description={isNew ? 'They sign in with this email and the password you set.' : undefined}
        onClose={() => setEditing(null)}
        onSubmit={save}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={resource.isSaving}>
              {resource.isSaving ? 'Saving…' : isNew ? 'Add person' : 'Save changes'}
            </button>
          </>
        }
      >
        {resource.saveError && (
          <p role="alert" className="rounded-xl bg-accent-clay/10 px-4 py-3 text-sm font-medium text-accent-clay">
            {resource.saveError}
          </p>
        )}
        <FormField label="Name" error={errors.name} required>
          <input className="field-input" value={draft.name} onChange={(e) => set('name', e.target.value)} />
        </FormField>
        <FormField label="Email" error={errors.email} required={isNew} hint={isNew ? undefined : 'The sign-in email cannot be changed.'}>
          <input
            className="field-input"
            type="email"
            value={draft.email}
            disabled={!isNew}
            onChange={(e) => set('email', e.target.value)}
          />
        </FormField>
        <FormField label="Phone" error={errors.phone} hint="Shown on their listings.">
          <input className="field-input" type="tel" value={draft.phone} onChange={(e) => set('phone', e.target.value)} />
        </FormField>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Role" error={errors.role}>
            <select className="field-input" value={draft.role} onChange={(e) => set('role', e.target.value as UserRole)}>
              {toOptions(USER_ROLE_LABELS).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </FormField>
          {!isNew && (
            <FormField label="Status" error={errors.status}>
              <select className="field-input" value={draft.status} onChange={(e) => set('status', e.target.value as UserStatus)}>
                {toOptions(USER_STATUS_LABELS).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </FormField>
          )}
        </div>
        <FormField
          label={isNew ? 'Password' : 'New password'}
          error={errors.password}
          required={isNew}
          hint={isNew ? 'At least 12 characters.' : 'Leave blank to keep their current password.'}
        >
          <input
            className="field-input"
            type="password"
            autoComplete="new-password"
            value={draft.password}
            onChange={(e) => set('password', e.target.value)}
          />
        </FormField>
      </FormPanel>
    </div>
  );
}
