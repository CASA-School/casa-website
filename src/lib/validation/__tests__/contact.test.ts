import { describe, expect, it } from 'vitest';

import { contactInquirySchema, organiserBriefFields } from '@/lib/validation/contact';

const baseInquiry = {
  firstName: 'Anna',
  email: 'anna@example.com',
  topic: 'Group booking',
  topicKey: 'group-booking',
  message: 'We would like to bring a school group to Bremen.',
  locale: 'en',
};

describe('contact inquiry schema', () => {
  it('accepts a learner enquiry that carries no organiser fields', () => {
    const parsed = contactInquirySchema.safeParse({
      ...baseInquiry,
      topic: 'Course advice',
      topicKey: 'course-advice',
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data?.groupSize).toBeUndefined();
    expect(parsed.data?.accommodation).toBe('');
  });

  it('accepts a partial organiser brief', () => {
    const parsed = contactInquirySchema.safeParse({
      ...baseInquiry,
      groupSize: '15',
      preferredDates: 'July',
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data?.groupSize).toBe(15);
    expect(parsed.data?.preferredDates).toBe('July');
    expect(parsed.data?.durationWeeks).toBeUndefined();
  });

  it('rejects a group size that is not a whole number', () => {
    const parsed = contactInquirySchema.safeParse({ ...baseInquiry, groupSize: 'about fifteen' });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.some((issue) => issue.path[0] === 'groupSize')).toBe(true);
  });

  it('rejects a choice value that is not in the option list', () => {
    const parsed = contactInquirySchema.safeParse({ ...baseInquiry, accommodation: 'penthouse' });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.some((issue) => issue.path[0] === 'accommodation')).toBe(true);
  });
});

describe('organiserBriefFields', () => {
  it('asks group organisers about the stay', () => {
    const fields = organiserBriefFields('group-booking');

    expect(fields).toContain('ageBand');
    expect(fields).toContain('meals');
    expect(fields).not.toContain('deliveryMode');
  });

  it('asks companies about delivery instead of accommodation', () => {
    const fields = organiserBriefFields('company-courses');

    expect(fields).toContain('deliveryMode');
    expect(fields).toContain('schedulePreference');
    expect(fields).not.toContain('accommodation');
  });

  it('returns nothing for learner topics', () => {
    expect(organiserBriefFields('course-advice')).toHaveLength(0);
    expect(organiserBriefFields(undefined)).toHaveLength(0);
  });
});
