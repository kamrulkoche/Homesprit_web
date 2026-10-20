'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { cn } from '@/helpers/utils/utils';
import { NEUTRAL_TINT, STATUS_TINTS } from './admin-ui.data';

/**
 * The small controls every list screen composes with — page header, toolbar,
 * search, filter, pager, status badge, icon buttons, stat card.
 *
 * hgs-frontend keeps each in its own file (`Toolbar.tsx`, `Pagination.tsx`,
 * `StatusBadge.tsx`, `Buttons.tsx`, `Card.tsx`, `AdminPageHeader.tsx`). Here
 * they are one module because each is a handful of lines; the barrel exports
 * them under the same names, so screens import exactly what HGS screens import.
 */

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold text-ink dark:text-white md:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-ink-muted dark:text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Toolbar({ children }: { children: React.ReactNode }) {
  return <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end">{children}</div>;
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="relative flex-1">
      <span className="sr-only">{placeholder}</span>
      <Search
        size={17}
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="field-input pl-10"
      />
    </label>
  );
}

export interface FilterOption {
  value: string;
  label: string;
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  allLabel: string;
}) {
  return (
    <label className="md:w-48">
      <span className="field-label">{label}</span>
      <select className="field-input" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (total === 0) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav aria-label="Pages" className="mt-4 flex items-center justify-between gap-3 text-sm">
      <p className="text-ink-muted dark:text-slate-400">
        {first}–{last} of {total}
      </p>
      <div className="flex items-center gap-1">
        <IconButton label="Previous page" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          <ChevronLeft size={18} aria-hidden="true" />
        </IconButton>
        <span className="px-2 font-semibold text-ink dark:text-white">
          {page} / {totalPages}
        </span>
        <IconButton label="Next page" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
          <ChevronRight size={18} aria-hidden="true" />
        </IconButton>
      </div>
    </nav>
  );
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold',
        STATUS_TINTS[status] ?? NEUTRAL_TINT
      )}
    >
      {label ?? status.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())}
    </span>
  );
}

const iconButtonClasses =
  'grid h-9 w-9 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white';

/** An icon-only button. `label` is required: it is the button's only name. */
export function IconButton({
  label,
  children,
  tone = 'default',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: 'default' | 'danger' }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(iconButtonClasses, tone === 'danger' && 'hover:bg-accent-clay/10 hover:text-accent-clay')}
      {...props}
    >
      {children}
    </button>
  );
}

export function IconLink({ label, href, children }: { label: string; href: string; children: React.ReactNode }) {
  const external = /^(mailto:|tel:|https?:)/.test(href);
  return external ? (
    <a href={href} aria-label={label} title={label} className={iconButtonClasses}>
      {children}
    </a>
  ) : (
    <Link href={href} aria-label={label} title={label} className={iconButtonClasses}>
      {children}
    </Link>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  /** Null renders an em dash: "could not read", never a misleading zero. */
  value: number | null;
  hint?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-ink/[0.08] bg-white p-5 dark:border-white/[0.08] dark:bg-ink-soft">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink-muted dark:text-slate-400">{label}</p>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
          {icon}
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-extrabold text-ink dark:text-white">
        {value === null ? '—' : value.toLocaleString()}
      </p>
      {hint && <p className="mt-1 text-sm text-ink-muted dark:text-slate-400">{hint}</p>}
    </div>
  );
}
