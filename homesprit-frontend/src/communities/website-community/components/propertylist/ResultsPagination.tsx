'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/helpers/utils/utils';

interface ResultsPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/** Page numbers to show: the ends, the neighbours, and gaps between. */
export function pageWindow(page: number, totalPages: number): (number | 'gap')[] {
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('gap');
    out.push(p);
  });
  return out;
}

/** Pager for the search results. Renders nothing for a single page. */
export function ResultsPagination({ page, totalPages, onPageChange }: ResultsPaginationProps) {
  if (totalPages <= 1) return null;

  const button =
    'grid h-10 min-w-10 place-items-center rounded-full px-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <nav aria-label="Search results pages" className="mt-10 flex items-center justify-center gap-1">
      <button
        type="button"
        className={cn(button, 'hover:bg-ink/5 dark:hover:bg-white/10')}
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft size={18} aria-hidden="true" />
      </button>

      {pageWindow(page, totalPages).map((entry, index) =>
        entry === 'gap' ? (
          <span key={`gap-${index}`} className="px-1 text-ink-muted" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            onClick={() => onPageChange(entry)}
            aria-current={entry === page ? 'page' : undefined}
            className={cn(
              button,
              entry === page
                ? 'bg-ink text-white dark:bg-white dark:text-ink'
                : 'text-ink-body hover:bg-ink/5 dark:text-slate-300 dark:hover:bg-white/10'
            )}
          >
            {entry}
          </button>
        )
      )}

      <button
        type="button"
        className={cn(button, 'hover:bg-ink/5 dark:hover:bg-white/10')}
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
      >
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </nav>
  );
}
