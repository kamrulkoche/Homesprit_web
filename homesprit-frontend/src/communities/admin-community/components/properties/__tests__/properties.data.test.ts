import {
  EMPTY_PROPERTY_FORM,
  formFromProperty,
  movePhoto,
  writeBodyFromForm,
} from '../properties.data';
import { activeNavHref, navFor } from '../../layout/admin.data';
import { makeAdminProperty } from '@/__fixtures__/property';

describe('listing form conversions', () => {
  it('round-trips a stored listing', () => {
    const property = makeAdminProperty();
    const body = writeBodyFromForm(formFromProperty(property));
    expect(body).toMatchObject({
      title: property.title,
      price: property.price,
      area_sqft: property.area_sqft,
      features: property.features,
      agent_id: property.agent_id,
    });
    // Photos come back in display order, cover first.
    expect(body.images.map((i) => i.url)).toEqual([
      'https://images.unsplash.com/photo-1',
      'https://images.unsplash.com/photo-2',
    ]);
  });

  it('sends a cleared optional number as null, not zero', () => {
    const body = writeBodyFromForm({ ...EMPTY_PROPERTY_FORM, year_built: '', area_sqft: '' });
    expect(body.year_built).toBeNull();
    expect(body.area_sqft).toBeNull();
  });

  it('strips thousands separators, blank features and empty photo rows', () => {
    const body = writeBodyFromForm({
      ...EMPTY_PROPERTY_FORM,
      price: '1,250,000',
      features: 'Pool\n\n  Garden  \n',
      images: [
        { url: '', alt_text: '' },
        { url: 'https://x.test/a.jpg', alt_text: '' },
      ],
    });
    expect(body.price).toBe(1250000);
    expect(body.features).toEqual(['Pool', 'Garden']);
    expect(body.images).toEqual([{ url: 'https://x.test/a.jpg', alt_text: null }]);
  });

  it('omits a blank owner so the backend applies "the caller"', () => {
    expect('agent_id' in writeBodyFromForm(EMPTY_PROPERTY_FORM)).toBe(false);
  });

  it('moves a photo and refuses to move past either end', () => {
    const photos = [
      { url: 'a', alt_text: '' },
      { url: 'b', alt_text: '' },
    ];
    expect(movePhoto(photos, 1, -1).map((p) => p.url)).toEqual(['b', 'a']);
    expect(movePhoto(photos, 0, -1)).toBe(photos);
  });
});

describe('dashboard navigation', () => {
  it('hides staff management from agents', () => {
    expect(navFor('agent').map((i) => i.href)).not.toContain('/admin/users');
    expect(navFor('admin').map((i) => i.href)).toContain('/admin/users');
    expect(navFor('agent').map((i) => i.href)).toContain('/admin/account');
  });

  it('lights the most specific matching link', () => {
    expect(activeNavHref('/admin/properties/new')).toBe('/admin/properties');
    expect(activeNavHref('/admin/elsewhere')).toBeNull();
  });
});
