import { passwordChangeSchema, profileSchema } from '../account.schema';
import { fieldErrors } from '../inquiry.schema';

const valid = {
  current_password: 'old-password-123',
  new_password: 'a-brand-new-password',
  confirm_password: 'a-brand-new-password',
};

function errorsFor(input: typeof valid) {
  const parsed = passwordChangeSchema.safeParse(input);
  return parsed.success ? {} : fieldErrors(parsed.error);
}

describe('passwordChangeSchema', () => {
  it('accepts a valid change', () => {
    expect(passwordChangeSchema.safeParse(valid).success).toBe(true);
  });

  it('mirrors the backend 12-character floor', () => {
    expect(errorsFor({ ...valid, new_password: 'short', confirm_password: 'short' })).toHaveProperty(
      'new_password'
    );
  });

  it('counts bytes, not characters, against the 72-byte ceiling', () => {
    const long = 'é'.repeat(40); // 40 characters, 80 bytes
    expect(errorsFor({ ...valid, new_password: long, confirm_password: long })).toHaveProperty('new_password');
  });

  it('requires the confirmation to match', () => {
    expect(errorsFor({ ...valid, confirm_password: 'something-else-entirely' })).toHaveProperty(
      'confirm_password'
    );
  });

  it('refuses reusing the current password', () => {
    const same = { ...valid, new_password: valid.current_password, confirm_password: valid.current_password };
    expect(errorsFor(same)).toHaveProperty('new_password');
  });

  it('requires the current password', () => {
    expect(errorsFor({ ...valid, current_password: '' })).toHaveProperty('current_password');
  });
});

describe('profileSchema', () => {
  it('trims and requires a two-character name', () => {
    expect(profileSchema.safeParse({ name: ' A ', phone: '' }).success).toBe(false);
    expect(profileSchema.safeParse({ name: ' Maya ', phone: '' })).toEqual({
      success: true,
      data: { name: 'Maya', phone: '' },
    });
  });
});
