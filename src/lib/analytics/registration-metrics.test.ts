import { describe, expect, it } from 'vitest';
import { registrationMetricSchema } from './registration-metrics';

describe('registration metrics privacy boundary', () => {
  const valid = { form: 'course', locale: 'en', event: 'validation_error', step: 'choice' };
  it('accepts only a known aggregate event', () => {
    expect(registrationMetricSchema.safeParse(valid).success).toBe(true);
    expect(registrationMetricSchema.safeParse({ ...valid, event: 'custom' }).success).toBe(false);
  });
  it('rejects arbitrary values and any additional personal data', () => {
    expect(registrationMetricSchema.safeParse({ ...valid, email: 'person@example.com' }).success).toBe(false);
    expect(registrationMetricSchema.safeParse({ ...valid, step: 'Alice' }).success).toBe(false);
    expect(registrationMetricSchema.safeParse({ ...valid, locale: 'ar' }).success).toBe(false);
  });
});
