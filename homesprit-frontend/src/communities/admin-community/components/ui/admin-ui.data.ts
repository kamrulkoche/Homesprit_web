/**
 * The admin kit's plain data: shared class strings and the status tints.
 *
 * A PLAIN module, as hgs-frontend's `admin-ui.data.ts` is — no `'use client'`,
 * no components — so it is imported by deep path and never through the
 * `'use client'` barrel, which would turn these strings into client references.
 */

/** The card surface every table, panel and stat card sits on. */
export const cardClasses =
  'rounded-2xl border border-ink/[0.08] bg-white dark:border-white/[0.08] dark:bg-ink-soft';

/** Focus ring for custom controls that are not native inputs. */
export const focusRingClasses =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50';

/**
 * Tint per status value, across every resource. One map rather than one per
 * screen, so "new" looks the same on an inquiry as anywhere else it appears.
 * Unknown values fall back to the neutral tint in `StatusBadge`.
 */
export const STATUS_TINTS: Record<string, string> = {
  // listings
  draft: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300',
  available: 'bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200',
  under_offer: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200',
  sold: 'bg-ink text-white dark:bg-white dark:text-ink',
  rented: 'bg-ink text-white dark:bg-white dark:text-ink',
  archived: 'bg-slate-200 text-slate-600 dark:bg-white/5 dark:text-slate-400',
  // inquiries
  new: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-200',
  contacted: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200',
  closed: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400',
  // users
  active: 'bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200',
  inactive: 'bg-slate-200 text-slate-600 dark:bg-white/5 dark:text-slate-400',
  suspended: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-200',
  admin: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-200',
  agent: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200',
};

export const NEUTRAL_TINT = 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300';
