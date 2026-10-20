import { z } from 'zod';

/**
 * My account validation — checked in the browser before the request, so a
 * mistyped confirmation never costs one of the five attempts the backend's
 * rate limiter allows.
 *
 * Mirrors `account_schema.py` / `_check_password` in homesprit-backend, which
 * stays the authority: anything this lets through that the backend refuses
 * comes back as a 422 naming the field.
 */

/** `MIN_PASSWORD_LENGTH` on the backend. */
export const MIN_PASSWORD_LENGTH = 12;

/** bcrypt's ceiling — in BYTES, so a multi-byte passphrase hits it sooner. */
export const MAX_PASSWORD_BYTES = 72;

/**
 * UTF-8 byte length. Via `encodeURIComponent` rather than `TextEncoder`, which
 * jsdom lacks; a lone surrogate throws there, and counts as too long here.
 */
function byteLength(value: string): number {
  try {
    return encodeURIComponent(value).replace(/%[0-9A-F]{2}/g, '_').length;
  } catch {
    return Infinity;
  }
}

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(120, 'Name must be at most 120 characters'),
  phone: z.string().trim().max(40, 'Phone must be at most 40 characters'),
});

export const passwordChangeSchema = z
  .object({
    current_password: z.string().min(1, 'Enter your current password'),
    new_password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
      .refine((value) => byteLength(value) <= MAX_PASSWORD_BYTES, {
        message: 'That password is too long',
      }),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    path: ['confirm_password'],
    message: 'The two new passwords do not match',
  })
  .refine((data) => data.new_password !== data.current_password, {
    path: ['new_password'],
    message: 'Choose a password different from your current one',
  });

export type ProfileFormData = z.infer<typeof profileSchema>;
export type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;

