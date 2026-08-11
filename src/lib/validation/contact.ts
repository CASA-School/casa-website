import { z } from 'zod';

import { normalizeContentLocale } from '@/lib/content/locale';

export const contactInquirySchema = z.object({
  firstName: z.string().trim().min(2, 'First name is required.').max(80),
  lastName: z.string().trim().max(80).optional().default(''),
  email: z.string().trim().email('Please enter a valid email address.').max(200),
  topic: z.string().trim().min(2, 'Topic is required.').max(120),
  message: z.string().trim().min(12, 'Please add a short message (min. 12 characters).').max(3000),
  locale: z.preprocess((value) => normalizeContentLocale(String(value ?? 'en')), z.enum(['en', 'de'])),
  source: z.string().trim().max(120).default('contact-page'),
  website: z.string().trim().max(200).optional().default(''),
});

export type ContactInquiryInput = z.infer<typeof contactInquirySchema>;
