import Link from 'next/link';
import { cn } from '@/helpers/utils/utils';
import { siteConfig } from '@/config/siteConfig';

interface LogoProps {
  href?: string;
  className?: string;
  /** Hide the wordmark — for the collapsed dashboard rail. */
  markOnly?: boolean;
}

/** The house mark plus the wordmark. No client code, so it renders anywhere. */
export function Logo({ href = '/', className, markOnly = false }: LogoProps) {
  return (
    <Link
      href={href}
      className={cn('inline-flex items-center gap-2.5 font-display text-lg font-extrabold text-ink dark:text-white', className)}
      aria-label={`${siteConfig.name} home`}
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-card">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
          <path
            d="M3.5 11.2 12 4l8.5 7.2V20a1 1 0 0 1-1 1h-5v-5.5h-5V21h-5a1 1 0 0 1-1-1v-8.8Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {!markOnly && <span>{siteConfig.name}</span>}
    </Link>
  );
}
