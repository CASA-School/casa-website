import { describe, expect, it } from 'vitest';

import { offerBookingHref } from '../booking-link';
import { DEFAULT_STAY, type StayChoices } from '../types';

const PERSON = '11111111-2222-3333-4444-555555555555';
const TERM = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

const stay = (course: StayChoices['course']) => ({ stay: { choices: { ...DEFAULT_STAY, course }, overrides: {}, manual: [] } });
const course = (steps: { level: string; termId: string | null }[]) =>
  ({ steps: steps.map((s) => ({ ...s, weeks: 8, complete: true, start: null, end: null, lessons: null, price: null })) }) as unknown as StayChoices['course'];

describe('offerBookingHref', () => {
  it('leads an accepted learner offer to the wizard at its first start and level', () => {
    expect(offerBookingHref({ status: 'accepted', personId: PERSON, draft: stay(course([{ level: 'B2', termId: TERM }, { level: 'C1', termId: null }])) })).toBe(
      `/admin/people/${PERSON}?book=1&cohort=${TERM}&level=B2`
    );
  });

  it('opens the plain wizard when the course has no planned start, or there is no course', () => {
    expect(offerBookingHref({ status: 'accepted', personId: PERSON, draft: stay(course([{ level: 'B1+.1', termId: null }])) })).toBe(`/admin/people/${PERSON}?book=1`);
    expect(offerBookingHref({ status: 'accepted', personId: PERSON, draft: stay(null) })).toBe(`/admin/people/${PERSON}?book=1`);
  });

  it('offers nothing before the offer is accepted, or for an organisation', () => {
    expect(offerBookingHref({ status: 'sent', personId: PERSON, draft: stay(null) })).toBeNull();
    expect(offerBookingHref({ status: 'accepted', personId: null, draft: stay(null) })).toBeNull();
  });
});
