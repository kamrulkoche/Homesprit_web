import {
  MAX_SAVED_HOMES,
  parseSavedHomes,
  serializeSavedHomes,
  toggleSavedHome,
} from '../saved-homes';

describe('saved-homes cookie format', () => {
  it('round-trips a list of slugs in order', () => {
    const slugs = ['loft-downtown', 'family-home-zilker'];
    expect(parseSavedHomes(serializeSavedHomes(slugs))).toEqual(slugs);
  });

  it('treats a missing or empty cookie as nothing saved', () => {
    expect(parseSavedHomes(undefined)).toEqual([]);
    expect(parseSavedHomes('')).toEqual([]);
  });

  it('drops malformed entries and duplicates instead of throwing', () => {
    expect(
      parseSavedHomes(encodeURIComponent('ok-slug,BAD SLUG,../etc,ok-slug,,another-one'))
    ).toEqual(['ok-slug', 'another-one']);
    expect(parseSavedHomes('%E0%A4%A')).toEqual([]); // undecodable
  });

  it('never returns more than the cap', () => {
    const many = Array.from({ length: MAX_SAVED_HOMES + 5 }, (_, i) => `home-${i}`);
    expect(parseSavedHomes(encodeURIComponent(many.join(',')))).toHaveLength(MAX_SAVED_HOMES);
  });
});

describe('toggleSavedHome', () => {
  it('adds a new slug at the end', () => {
    expect(toggleSavedHome(['a'], 'b')).toEqual({ slugs: ['a', 'b'], result: 'saved' });
  });

  it('removes a saved slug', () => {
    expect(toggleSavedHome(['a', 'b'], 'a')).toEqual({ slugs: ['b'], result: 'removed' });
  });

  it('refuses to grow past the cap but still allows removal', () => {
    const full = Array.from({ length: MAX_SAVED_HOMES }, (_, i) => `home-${i}`);
    expect(toggleSavedHome(full, 'one-more').result).toBe('full');
    expect(toggleSavedHome(full, 'home-0').result).toBe('removed');
  });
});
