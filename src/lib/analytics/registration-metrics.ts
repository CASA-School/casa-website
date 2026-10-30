import { z } from 'zod';

// Closed vocabulary: no free text, URLs, answers, or visitor identifiers.
export const registrationMetricSchema = z.object({
  form: z.enum(['course', 'exam']),
  locale: z.enum(['de', 'en']),
  event: z.enum(['shown', 'started', 'choice_completed', 'details_completed', 'validation_error', 'submit_error']),
  step: z.enum(['choice', 'details', 'review']),
  category: z.enum(['none', 'level', 'date', 'choice', 'contact', 'personal', 'terms', 'other', 'network', 'server']).default('none'),
}).strict();
export type RegistrationMetric = z.infer<typeof registrationMetricSchema>;

export function recordRegistrationMetric(metric: RegistrationMetric) {
  if (process.env.NEXT_PUBLIC_REGISTRATION_METRICS !== 'enabled') return;
  // Best effort only; a measurement failure must never block registration.
  void fetch('/api/registration/metrics', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(metric),
    keepalive: true,
  }).catch(() => {});
}

/** Coarse categories only; never send a field value or a free-form field name. */
export function metricFieldCategory(id: string | null): 'level' | 'date' | 'choice' | 'contact' | 'personal' | 'terms' | 'other' {
  if (!id) return 'other';
  if (/level/i.test(id)) return 'level';
  if (/option|session/i.test(id)) return 'date';
  if (/type/i.test(id)) return 'choice';
  if (/email|phone/i.test(id)) return 'contact';
  if (/terms/i.test(id)) return 'terms';
  if (/firstName|lastName|salutation/i.test(id)) return 'personal';
  return 'other';
}
