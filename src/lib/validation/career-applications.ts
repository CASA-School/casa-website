import { z } from 'zod';

import { normalizeContentLocale } from '@/lib/content/locale';

export const careerApplicationSchema = z.object({
  positionId: z.string().uuid().optional().nullable(),
  positionSlug: z.string().trim().min(2).max(120),
  positionTitle: z.string().trim().min(2).max(200),
  locale: z.preprocess((value) => normalizeContentLocale(String(value ?? 'en')), z.enum(['en', 'de'])),
  firstName: z.string().trim().min(2, 'First name is required.').max(80),
  lastName: z.string().trim().min(2, 'Last name is required.').max(80),
  email: z.string().trim().email('Please enter a valid email address.').max(200),
  phone: z.string().trim().max(60).optional().nullable(),
  linkedinUrl: z
    .string()
    .trim()
    .url('Please enter a valid LinkedIn URL.')
    .max(500)
    .optional()
    .nullable()
    .or(z.literal('')),
  coverLetter: z.string().trim().min(40, 'Please add a short motivation message (min. 40 characters).').max(5000),
});

export type CareerApplicationInput = z.infer<typeof careerApplicationSchema>;
