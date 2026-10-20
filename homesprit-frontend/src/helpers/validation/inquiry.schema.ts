import { z } from 'zod';

/**
 * The inquiry form's validation.
 *
 * Mirrors `InquirySubmitSchema` in homesprit-backend — the same limits, so a
 * message this accepts is never refused there. A change to one means editing
 * both, the arrangement hgs-frontend keeps for its contact form.
 *
 * Runs twice: in the browser for instant per-field feedback, and again in the
 * `/api/inquiries` route handler, which must not trust the browser.
 */
export const inquirySchema = z.object({
  property_slug: z.string().max(180).optional().or(z.literal('')),
  name: z
    .string({ error: 'Please tell us your name' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be 100 characters or fewer'),
  email: z
    .string({ error: 'Please enter your email' })
    .trim()
    .email('Please enter a valid email address'),
  phone: z.string().trim().max(40, 'Phone must be 40 characters or fewer').optional().or(z.literal('')),
  message: z
    .string({ error: 'Please write a message' })
    .trim()
    .min(10, 'Message must be at least 10 characters')
    .max(2000, 'Message must be 2,000 characters or fewer'),
});

export type InquiryFormData = z.infer<typeof inquirySchema>;

/** First message per field, for rendering under each input. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
