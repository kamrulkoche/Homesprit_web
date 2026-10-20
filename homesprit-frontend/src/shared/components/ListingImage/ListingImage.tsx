import Image from 'next/image';
import { Home } from 'lucide-react';
import { cn } from '@/helpers/utils/utils';
import { isOptimisable } from '@/helpers/properties/images';

interface ListingImageProps {
  src: string | null | undefined;
  alt: string;
  /** `next/image` sizes hint — what fraction of the viewport this renders at. */
  sizes: string;
  className?: string;
  priority?: boolean;
}

/**
 * A listing photo that fills its (relatively positioned) parent.
 *
 * Optimised through `next/image` when the host is allowlisted, served as-is
 * otherwise — an agent can paste a photo from anywhere, and handing an unknown
 * host to the optimiser throws. A listing with no photo gets a placeholder
 * rather than a broken image.
 */
export function ListingImage({ src, alt, sizes, className, priority }: ListingImageProps) {
  if (!src) {
    return (
      <div
        className={cn(
          'absolute inset-0 grid place-items-center bg-sand-dark text-ink-muted dark:bg-white/5 dark:text-slate-500',
          className
        )}
        role="img"
        aria-label={`${alt} — no photo yet`}
      >
        <Home size={40} strokeWidth={1.5} aria-hidden="true" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={!isOptimisable(src)}
      className={cn('object-cover', className)}
    />
  );
}
