import { describe, expect, it } from 'vitest';

import { berlinDay, dayHeading, groupByDay } from '../days';

describe('days on Bremen’s calendar', () => {
  it('puts a message sent after midnight in Bremen on that day, not the UTC one', () => {
    // 22:30 UTC on 13 October is 00:30 on 14 October in Bremen (CEST, UTC+2).
    expect(berlinDay(new Date('2026-10-13T22:30:00Z'))).toBe('2026-10-14');
    // And in winter (CET, UTC+1): 23:30 UTC on 1 December is 00:30 on 2 December.
    expect(berlinDay(new Date('2026-12-01T23:30:00Z'))).toBe('2026-12-02');
  });

  it('groups a newest-first list into one run per day', () => {
    const items = ['2026-10-14T09:00:00Z', '2026-10-14T07:00:00Z', '2026-10-12T15:00:00Z'].map((at) => ({ at: new Date(at) }));
    const groups = groupByDay(items, (item) => item.at);
    expect(groups.map((g) => [g.day, g.rows.length])).toEqual([
      ['2026-10-14', 2],
      ['2026-10-12', 1],
    ]);
  });

  it('names today and yesterday, and dates the rest', () => {
    expect(dayHeading('2026-10-14', 'de', '2026-10-14')).toEqual({ title: 'Heute', aside: 'Mittwoch, 14. Oktober' });
    expect(dayHeading('2026-10-13', 'en', '2026-10-14')).toEqual({ title: 'Yesterday', aside: 'Tuesday 13 October' });
    expect(dayHeading('2026-10-12', 'de', '2026-10-14').title).toBe('Montag, 12. Oktober');
    expect(dayHeading('2025-12-30', 'en', '2026-10-14').title).toBe('Tuesday, 30 December 2025');
  });
});
