'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/helpers/utils/utils';
import { MAX_SAVED_HOMES } from '@/helpers/properties/saved-homes';
import { useSavedHomes } from '@/shared/hooks/useSavedHomes';

interface SaveHomeButtonProps {
  slug: string;
  title: string;
  /** `icon` floats over a card photo; `button` sits in the detail page's header. */
  variant?: 'icon' | 'button';
  className?: string;
}

/**
 * Add a listing to, or take it off, the visitor's saved-homes shortlist.
 *
 * A toggle button (`aria-pressed`): it acts immediately and has no form to
 * submit. On a card it sits above the card's stretched link (`relative z-10`),
 * so tapping the heart saves instead of navigating.
 */
export function SaveHomeButton({ slug, title, variant = 'icon', className }: SaveHomeButtonProps) {
  const { isSaved, toggle } = useSavedHomes();
  const saved = isSaved(slug);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const onClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const result = toggle(slug);
    setNotice(
      result === 'full'
        ? `You can save up to ${MAX_SAVED_HOMES} homes. Remove one first.`
        : result === 'saved'
          ? 'Saved to your list.'
          : 'Removed from your list.'
    );
  };

  const label = saved ? `Remove ${title} from saved homes` : `Save ${title}`;

  return (
    <span className={cn('relative z-10 inline-flex', className)}>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        aria-label={variant === 'icon' ? label : undefined}
        title={variant === 'icon' ? label : undefined}
        className={cn(
          variant === 'icon'
            ? 'grid h-10 w-10 place-items-center rounded-full bg-white/95 text-ink shadow-sm transition-transform hover:scale-105 active:scale-95'
            : 'btn-secondary'
        )}
      >
        <Heart
          size={variant === 'icon' ? 19 : 17}
          aria-hidden="true"
          className={cn(saved && 'fill-accent-clay text-accent-clay')}
        />
        {variant === 'button' && (saved ? 'Saved' : 'Save home')}
      </button>
      {/* One polite live region: the visual bubble and the announcement are the same text. */}
      <span
        role="status"
        className={cn(
          'pointer-events-none absolute top-full z-20 mt-2 w-max max-w-[14rem] rounded-xl bg-ink px-3 py-2 text-xs font-semibold text-white shadow-lg dark:bg-white dark:text-ink',
          variant === 'icon' ? 'right-0' : 'left-0',
          !notice && 'sr-only'
        )}
      >
        {notice}
      </span>
    </span>
  );
}
