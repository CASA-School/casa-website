import { describe, expect, it } from 'vitest';
import { appointmentDays, appointmentInstant, isAppointmentDate } from './schedule';

describe('Ina appointment schedule', () => {
  const now = new Date('2026-09-17T09:00:00Z');
  it('offers only Monday–Thursday and the four agreed half-hour starts', () => {
    const days = appointmentDays(new Set(), now);
    expect(days[0].date).toBe('2026-09-21');
    for (const day of days) {
      expect([1, 2, 3, 4]).toContain(new Date(`${day.date}T12:00Z`).getUTCDay());
      expect(day.times).toEqual(['10:00', '10:30', '13:00', '13:30']);
    }
  });
  it('excludes reserved slots and configured closures', () => {
    const days = appointmentDays(new Set(['2026-09-21T10:00']), now, new Set(['2026-09-22']));
    expect(days.find(day => day.date === '2026-09-21')?.times).not.toContain('10:00');
    expect(days.some(day => day.date === '2026-09-22')).toBe(false);
  });
  it('rejects same-day, past, impossible and out-of-window dates', () => {
    for (const date of ['2026-09-17', '2026-09-16', '2026-02-30', '2026-11-02', 'invalid']) {
      expect(isAppointmentDate(date, now)).toBe(false);
    }
  });
  it('keeps Bremen wall times stable across daylight saving changes', () => {
    expect(appointmentInstant('2026-10-22', '10:00')?.toISOString()).toBe('2026-10-22T08:00:00.000Z');
    expect(appointmentInstant('2026-10-26', '10:00')?.toISOString()).toBe('2026-10-26T09:00:00.000Z');
    expect(isAppointmentDate('2026-09-18', new Date('2026-09-17T22:30Z'))).toBe(false);
  });
});
