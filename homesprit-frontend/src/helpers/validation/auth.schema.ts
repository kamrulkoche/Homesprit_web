import { z } from 'zod';

/**
 * Admin login validation.
 *
 * Mirrors `contact.schema.ts`: validation lives in the route handler, which
 * returns the first Zod issue message. The form shows that one message in its
 * error banner rather than per-field errors.
 *
 * Note the password rule is only `min(1)`. Enforcing a length or complexity
 * policy on the LOGIN form would tell an attacker what the policy is, and would
 * reject a legitimate older password that predates a policy change. Strength is
 * enforced where passwords are set, not where they are checked.
 */
export const loginSchema = z.object({
  // The `error` option covers a missing or non-string field. Without it Zod
  // surfaces its own "Invalid input: expected string, received undefined",
  // which is developer-speak leaking into a user-facing banner.
  email: z
    .string({ error: 'Email is required' })
    .email('Please enter a valid email address'),
  password: z.string({ error: 'Password is required' }).min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
