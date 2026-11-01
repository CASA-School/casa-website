import { describe, expect, it } from 'vitest';
import { bookingPeriod, readBookingTask, savedBookingParams, validBookingDay } from '../booking-query';
const types = [{ id: 'evening-id', name: 'Abendkurs', slug: 'evening-german' }];
const today = '2026-11-01';
describe('booking task search', () => {
  it('turns a German office task into explicit filters and keeps a learner name', () => {
    expect(readBookingTask('Abendkurse B1 Zahlung offen José', types, today)).toEqual({ recognized: true, search: 'jose', params: { filter: 'unclear', type: 'evening-id', level: 'B1' } });
  });
  it('understands English, precise starting levels and month boundaries', () => {
    expect(readBookingTask('unpaid evening B1+.1 February 2028', types, today)).toEqual({ recognized: true, search: '', params: { filter: 'unclear', type: 'evening-id', level: 'B1+.1', from: '2028-02-01', to: '2028-02-29' } });
    expect(readBookingTask('B1.1 März', types, today).params).toMatchObject({ level: 'B1.1', from: '2026-03-01', to: '2026-03-31' });
  });
  it('preserves exact identifiers and ordinary names', () => {
    for (const q of ['B-2026-0042', '2026-0042', 'anna@example.com', '+49 421 1234567', 'May Li', 'José Müller']) expect(readBookingTask(q, types, today)).toEqual({ recognized: false, search: q, params: {} });
  });
  it('does not invent a course type that is absent from the catalogue', () => {
    expect(readBookingTask('Abendkurs', [], today).recognized).toBe(false);
  });
  it('uses relative dates that can be recalculated when a saved view is opened', () => {
    expect(readBookingTask('next 14 days', types, today).params).toEqual({ filter: 'upcoming', period: 'next14' });
    expect(bookingPeriod('next14', '2026-12-28')).toEqual({ startFrom: '2026-12-28', startTo: '2027-01-11' });
    expect(bookingPeriod('month', '2028-02-17')).toEqual({ startFrom: '2028-02-01', startTo: '2028-02-29' });
    expect(validBookingDay('2026-02-30')).toBeUndefined();
  });
  it('saves only filter choices, without names, destinations or arbitrary data', () => {
    expect(savedBookingParams({ q: 'Pia Example', type: 'evening-id', level: 'B1', page: '7', href: 'https://example.com', filter: 'unclear', junk: 'x' })).toEqual({ type: 'evening-id', level: 'B1', filter: 'unclear' });
  });
});
