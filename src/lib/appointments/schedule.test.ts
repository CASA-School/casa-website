import { describe, expect, it } from 'vitest';
import { appointmentDays, appointmentInstant, isAppointmentDate, isPublicHoliday, parseBlockedDates } from './schedule';

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
  it('closes on the public holidays in Bremen, Easter included', () => {
    for (const date of ['2027-01-01', '2027-03-26', '2027-03-29', '2027-05-06', '2027-05-17', '2026-10-03', '2028-10-31', '2026-12-25', '2026-12-26']) {
      expect(isPublicHoliday(date)).toBe(true);
    }
    expect(isPublicHoliday('2027-03-30')).toBe(false);
    // Ostermontag and Christi Himmelfahrt 2027 fall on a Monday and a Thursday.
    const spring = appointmentDays(new Set(), new Date('2027-03-25T09:00:00Z'));
    expect(spring.some(day => day.date === '2027-03-29')).toBe(false);
    expect(spring.some(day => day.date === '2027-03-30')).toBe(true);
    expect(isAppointmentDate('2027-05-06', new Date('2027-04-20T09:00:00Z'))).toBe(false);
  });
  it('closes while the school is closed, as casa-bremen.de listed it', () => {
    const december = appointmentDays(new Set(), new Date('2026-12-14T09:00:00Z'));
    expect(december.some(day => day.date >= '2026-12-21' && day.date <= '2027-01-01')).toBe(false);
    expect(december.some(day => day.date === '2026-12-17')).toBe(true);
    expect(december.some(day => day.date === '2027-01-04')).toBe(true);
  });
  it('reads Ina\'s leave as dates and ranges', () => {
    const blocked = parseBlockedDates(' 2026-12-21..2026-12-24 , 2027-02-12,');
    expect([...blocked]).toEqual(['2026-12-21', '2026-12-22', '2026-12-23', '2026-12-24', '2027-02-12']);
    expect(parseBlockedDates(undefined).size).toBe(0);
  });
  it('keeps Bremen wall times stable across daylight saving changes', () => {
    expect(appointmentInstant('2026-10-22', '10:00')?.toISOString()).toBe('2026-10-22T08:00:00.000Z');
    expect(appointmentInstant('2026-10-26', '10:00')?.toISOString()).toBe('2026-10-26T09:00:00.000Z');
    expect(isAppointmentDate('2026-09-18', new Date('2026-09-17T22:30Z'))).toBe(false);
  });
});
