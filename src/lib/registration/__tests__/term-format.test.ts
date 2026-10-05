import { describe, expect, it } from 'vitest';

import { compactDays, dateTileParts, daytimeOf, parseSchedule, scheduleLine, termRange } from '../term-format';

describe('a term in as few words as it takes', () => {
  it('runs days in a row as a range and lists the rest, in the page language', () => {
    expect(compactDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], 'de')).toBe('Mo–Fr');
    expect(compactDays(['Thu', 'Mon', 'Wed', 'Tue'], 'en')).toBe('Mon–Thu');
    expect(compactDays(['Tue', 'Thu'], 'de')).toBe('Di, Do');
    expect(compactDays(['Mon', 'Tue'], 'de')).toBe('Mo, Di');
  });

  it('places a time in the day: a morning, an afternoon, an evening, or both halves', () => {
    expect(daytimeOf('09:00-12:30')).toBe('morning');
    expect(daytimeOf('13:00–17:30')).toBe('afternoon');
    expect(daytimeOf('18:30-20:00')).toBe('evening');
    expect(daytimeOf('09:00-17:30')).toBe('fullDay');
    expect(daytimeOf('')).toBeNull();
  });

  it('reads a stored schedule into parts and one line', () => {
    const schedule = parseSchedule({ days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], time: '09:00-12:30' }, 'de');
    expect(schedule).toEqual({ days: 'Mo–Fr', time: '09:00–12:30', daytime: 'morning' });
    expect(scheduleLine(schedule, 'de')).toBe('Mo–Fr · 09:00–12:30');
    expect(parseSchedule(null, 'de')).toBeNull();
    expect(scheduleLine(null, 'en')).toBe('Schedule to be confirmed');
  });

  it('says a range with its year once, and a tile as a day over its month', () => {
    // ICU sets the dash between thin spaces.
    const plain = (text: string) => text.replace(/\s/g, ' ');
    expect(plain(termRange('2026-10-26', '2026-12-18', 'de'))).toBe('26. Okt. – 18. Dez. 2026');
    expect(plain(termRange('2026-11-23', '2027-01-28', 'de'))).toBe('23. Nov. 2026 – 28. Jan. 2027');
    expect(dateTileParts('2027-03-01', 'de')).toEqual({ day: '1', monthYear: 'März 2027', full: '1. März 2027' });
    // A sitting's timestamp is read on Bremen's calendar.
    expect(dateTileParts('2026-11-13T23:30:00Z', 'en').day).toBe('14');
  });
});
