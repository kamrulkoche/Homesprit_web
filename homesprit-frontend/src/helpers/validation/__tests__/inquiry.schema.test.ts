import { fieldErrors, inquirySchema } from '../inquiry.schema';

const valid = {
  property_slug: 'modern-family-home-zilker',
  name: 'Priya Raman',
  email: 'priya@example.com',
  phone: '',
  message: 'Could I view this on Saturday morning?',
};

describe('inquirySchema — mirrors the backend limits', () => {
  it('accepts a complete inquiry and trims it', () => {
    const result = inquirySchema.safeParse({ ...valid, name: '  Priya Raman  ' });
    expect(result.success).toBe(true);
    expect(result.success && result.data.name).toBe('Priya Raman');
  });

  it('accepts a general inquiry with no listing', () => {
    expect(inquirySchema.safeParse({ ...valid, property_slug: undefined }).success).toBe(true);
  });

  it.each([
    ['name', 'P'],
    ['email', 'not-an-email'],
    ['message', 'too short'],
    ['message', 'x'.repeat(2001)],
    ['phone', '1'.repeat(41)],
  ])('rejects a bad %s', (field, value) => {
    const result = inquirySchema.safeParse({ ...valid, [field]: value });
    expect(result.success).toBe(false);
    if (!result.success) expect(Object.keys(fieldErrors(result.error))).toContain(field);
  });

  it('reports one message per field', () => {
    const result = inquirySchema.safeParse({ name: '', email: '', message: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = fieldErrors(result.error);
      expect(Object.keys(errors).sort()).toEqual(['email', 'message', 'name']);
    }
  });
});
