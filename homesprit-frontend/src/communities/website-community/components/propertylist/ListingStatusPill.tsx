import { cn } from '@/helpers/utils/utils';
import { PROPERTY_STATUS_LABELS } from '@/helpers/properties/labels';
import type { PropertyStatus } from '@/interface/property.interface';

/** Only these statuses earn a pill on the public site; "available" is the default and says nothing. */
const TONES: Partial<Record<PropertyStatus, string>> = {
  under_offer: 'bg-accent-amber text-ink',
  sold: 'bg-ink text-white',
  rented: 'bg-ink text-white',
};

export function ListingStatusPill({ status }: { status: PropertyStatus }) {
  const tone = TONES[status];
  if (!tone) return null;
  return (
    <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold shadow-sm', tone)}>
      {PROPERTY_STATUS_LABELS[status]}
    </span>
  );
}
