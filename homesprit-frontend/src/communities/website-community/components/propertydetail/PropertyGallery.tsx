'use client';

import { useState } from 'react';
import { cn } from '@/helpers/utils/utils';
import { ListingImage } from '@/shared/components/ListingImage';
import type { IPropertyImage } from '@/interface/property.interface';

interface PropertyGalleryProps {
  images: IPropertyImage[];
  title: string;
}

/** The main photo plus a strip of thumbnails that swap it. */
export function PropertyGallery({ images, title }: PropertyGalleryProps) {
  const ordered = [...images].sort((a, b) => a.display_order - b.display_order);
  const [selected, setSelected] = useState(0);
  const current = ordered[selected] ?? null;

  return (
    <div className="space-y-3">
      <div className="relative aspect-[16/10] overflow-hidden rounded-3xl bg-sand-dark dark:bg-white/5">
        <ListingImage
          src={current?.url}
          alt={current?.alt_text || title}
          sizes="(min-width: 1024px) 66vw, 100vw"
          priority
        />
      </div>

      {ordered.length > 1 && (
        <ul className="grid grid-cols-4 gap-3 sm:grid-cols-6" aria-label="Photos">
          {ordered.map((image, index) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => setSelected(index)}
                aria-label={`Show photo ${index + 1}${image.alt_text ? `: ${image.alt_text}` : ''}`}
                aria-pressed={index === selected}
                className={cn(
                  'relative block aspect-square w-full overflow-hidden rounded-xl ring-2 ring-transparent transition',
                  index === selected ? 'ring-brand-500' : 'opacity-75 hover:opacity-100'
                )}
              >
                <ListingImage src={image.url} alt="" sizes="120px" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
