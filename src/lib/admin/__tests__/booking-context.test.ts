import { describe, expect, it } from 'vitest';
import { adjustBookingContext, contextFacets, validBookingMonth, type BookingFacet } from '../booking-context';

const facets: BookingFacet[] = [
  { category: 'intensive', typeId: 'i', session: 'morning', level: 'A1.1', start: '2027-01-04' },
  { category: 'intensive', typeId: 'i', session: 'afternoon', level: 'B1.1', start: '2027-01-11' },
  { category: 'evening', typeId: 'e', session: 'evening', level: 'B2.2', start: '2027-02-02' },
  { category: 'exam', typeId: null, session: null, level: 'C1', start: '2027-01-23' },
];
describe('contextual booking choices', () => {
  it('keeps levels and dates attached to the same actual session', () => {
    expect(contextFacets(facets, { category: 'intensive', session: 'morning' }).map(f => f.level)).toEqual(['A1.1']);
    expect(contextFacets(facets, { category: 'intensive', session: 'morning', level: 'B1' })).toEqual([]);
    expect(contextFacets(facets, { category: 'exam' }).map(f => f.start)).toEqual(['2027-01-23']);
    expect(contextFacets(facets, { level: 'B2' })).toHaveLength(1);
  });
  it('drops incompatible descendants when a parent changes, preserving search and workflow filters', () => {
    expect(adjustBookingContext({ category: 'intensive', session: 'morning', level: 'A1', month: '2027-01', start: '2027-01-04', q: 'Ada', filter: 'reserved', page: '5' }, { session: 'afternoon' }, facets))
      .toEqual({ category: 'intensive', session: 'afternoon', month: '2027-01', q: 'Ada', filter: 'reserved', page: '' });
    expect(adjustBookingContext({ category: 'intensive', type: 'i', session: 'morning', level: 'A1', month: '2027-01', start: '2027-01-04' }, { category: 'evening' }, facets))
      .toEqual({ category: 'evening', page: '' });
  });
  it('lets a month replace conflicting date bounds and resets the exact start', () => {
    expect(adjustBookingContext({ category: 'intensive', start: '2026-12-01', from: '2026-12-01', to: '2026-12-30', period: 'month', year: '2026' }, { month: '2027-01' }, facets))
      .toEqual({ category: 'intensive', month: '2027-01', page: '' });
  });
  it('lets explicit task choices replace stale parents without broadening an unavailable requested level', () => {
    expect(adjustBookingContext({ category: 'intensive', session: 'morning', level: 'A1', month: '2027-01', start: '2027-01-04', period: 'month' }, { type: 'e', level: 'C2', from: '2027-02-01', to: '2027-02-28' }, facets))
      .toEqual({ type: 'e', level: 'C2', from: '2027-02-01', to: '2027-02-28', page: '' });
  });
  it('validates month URLs without permissive Date rollover', () => {
    expect(validBookingMonth('2027-01')).toBe('2027-01');
    expect(validBookingMonth('1998-12')).toBe('1998-12');
    for (const value of ['2027-00', '2027-13', '2027-1', 'junk']) expect(validBookingMonth(value)).toBeUndefined();
  });
});
