'use client';

import { cn } from '@/helpers/utils/utils';
import { cardClasses } from './admin-ui.data';
import { ErrorState, TableSkeleton } from './States';

export interface DataTableColumn<T> {
  /** Stable identity for React, and the label used in the stacked card view. */
  key: string;
  header: string;
  /** Defaults to `String(row[key])` when the column maps to a plain field. */
  render?: (row: T) => React.ReactNode;
  className?: string;
  /** A CSS width for the column, e.g. `'12rem'` or `'25%'`. */
  width?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  isLoading: boolean;
  /** Human-readable; null when the last read succeeded. */
  error: string | null;
  /** Rendered when the read succeeded and returned nothing. */
  emptyState: React.ReactNode;
  /** Per-row buttons — edit, delete, reorder. Pinned right in both layouts. */
  actions?: (row: T) => React.ReactNode;
  onRowClick?: (row: T) => void;
  onRetry?: () => void;
}

/** Fallback cell value for a column with no `render`. */
function defaultCell<T>(row: T, key: string): React.ReactNode {
  const value = (row as Record<string, unknown>)[key];
  if (value === null || value === undefined || value === '') {
    // An em dash, not an empty cell: "nothing here" should look deliberate
    // rather than like a rendering bug.
    return <span className="text-ink-muted dark:text-slate-500">&mdash;</span>;
  }
  return String(value);
}

/**
 * The admin table — ported unchanged from hgs-frontend.
 *
 * TWO layouts from one set of column definitions: a real `<table>` from `md`
 * up, and stacked cards below it. Not a table that scrolls sideways — an admin
 * on a phone who has to drag horizontally to reach the Delete button will
 * mis-tap, and the column headers scroll out of view exactly when they are
 * needed to say what a value is. In the card view each value carries its own
 * label, which is the header doing its job at a width where a header row
 * cannot.
 *
 * Loading, error and empty are handled here rather than by each screen, so all
 * of them say the same thing the same way. Note that a refresh over existing
 * rows keeps the rows on screen and dims them: replacing a populated table with
 * a skeleton on every keystroke is more disorienting than a brief stale view.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  error,
  emptyState,
  actions,
  onRowClick,
  onRetry,
}: DataTableProps<T>) {
  if (error) {
    return (
      <div className={cardClasses}>
        <ErrorState message={error} onRetry={onRetry} />
      </div>
    );
  }

  if (isLoading && rows.length === 0) {
    return (
      <div className={cardClasses}>
        <TableSkeleton />
      </div>
    );
  }

  if (rows.length === 0) {
    return <div className={cardClasses}>{emptyState}</div>;
  }

  const interactive = Boolean(onRowClick);

  /**
   * Row activation from the keyboard.
   *
   * The row stays a `<tr>` — swapping it for a `role="button"` would break the
   * table semantics a screen reader uses to announce "row 3 of 12". Instead it
   * becomes focusable and answers Enter, and every row also carries per-row
   * action buttons, so the click is a shortcut rather than the only path.
   */
  const rowKeyDown = (event: React.KeyboardEvent, row: T) => {
    if (!onRowClick) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      onRowClick(row);
    }
  };

  return (
    <div
      className={cn(
        cardClasses,
        // Transition, not a swap to a skeleton: a search refresh should not
        // pull the rows out from under the pointer.
        isLoading && 'opacity-60 transition-opacity duration-300'
      )}
      aria-busy={isLoading || undefined}
    >
      {/* ---------------------------------------------- md and up: a table */}
      <table className="hidden w-full border-collapse md:table">
        <thead>
          <tr className="border-b border-ink/[0.08] dark:border-white/[0.08]">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                style={column.width ? { width: column.width } : undefined}
                className={cn(
                  'px-5 py-4 text-left font-mono text-[11px] font-semibold uppercase tracking-widest text-ink-muted dark:text-slate-400',
                  column.className
                )}
              >
                {column.header}
              </th>
            ))}
            {actions && (
              <th scope="col" className="px-5 py-4 text-right">
                <span className="sr-only">Actions</span>
              </th>
            )}
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              tabIndex={interactive ? 0 : undefined}
              onClick={interactive ? () => onRowClick?.(row) : undefined}
              onKeyDown={interactive ? (event) => rowKeyDown(event, row) : undefined}
              className={cn(
                'border-b border-slate-100 last:border-0 dark:border-white/[0.05]',
                'transition-colors duration-300',
                interactive &&
                  'cursor-pointer hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/40 dark:hover:bg-white/[0.03]'
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'px-5 py-4 align-middle text-ink-body dark:text-slate-300',
                    column.className
                  )}
                >
                  {column.render
                    ? column.render(row)
                    : defaultCell(row, column.key)}
                </td>
              ))}

              {actions && (
                <td className="px-5 py-4 text-right">
                  {/* Stops a click on Delete from also firing the row click. */}
                  <div
                    className="flex items-center justify-end gap-1"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {actions(row)}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* ------------------------------------------ below md: stacked cards */}
      <ul className="divide-y divide-slate-100 dark:divide-white/[0.05] md:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2.5">
                {columns.map((column) => (
                  <div key={column.key} className="min-w-0">
                    <p className="font-mono text-[11px] uppercase tracking-widest text-ink-muted dark:text-slate-400">
                      {column.header}
                    </p>
                    <div className="mt-0.5 break-words text-ink-body dark:text-slate-300">
                      {column.render
                        ? column.render(row)
                        : defaultCell(row, column.key)}
                    </div>
                  </div>
                ))}
              </div>

              {actions && (
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {actions(row)}
                </div>
              )}
            </div>

            {interactive && (
              <button
                type="button"
                onClick={() => onRowClick?.(row)}
                className="mt-4 w-full rounded-lg border border-slate-200 px-4 py-2.5 font-semibold text-ink-body transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:border-white/[0.08] dark:text-slate-200 dark:hover:bg-white/[0.04]"
              >
                Open
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
