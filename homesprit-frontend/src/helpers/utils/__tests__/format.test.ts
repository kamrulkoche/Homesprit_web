import { formatCompactPrice, formatDate, formatPrice, plural } from '../format';

describe('format helpers', () => {
  it('formats a sale price as a whole amount', () => {
    expect(formatPrice(1250000, 'sale')).toBe('$1,250,000');
  });

  it('marks a rental price as monthly', () => {
    expect(formatPrice(3200, 'rent')).toBe('$3,200/mo');
  });

  it('compacts large prices', () => {
    expect(formatCompactPrice(1250000)).toBe('$1.3M');
  });

  it('renders an em dash for a missing or invalid date', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate('not a date')).toBe('—');
    expect(formatDate('2026-10-14T12:00:00Z')).toMatch(/2026/);
  });

  it('pluralises', () => {
    expect(plural(1, 'bed')).toBe('1 bed');
    expect(plural(3, 'bed')).toBe('3 beds');
  });
});
