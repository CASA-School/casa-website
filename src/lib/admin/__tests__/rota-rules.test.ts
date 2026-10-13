import { describe, expect, it } from 'vitest';

import { footerConfig } from '@/config/footer';

import { OFFICE_HOURS, officeHoursOn, receptionGaps, SHIFT_TIMES } from '../rota-rules';

describe('the office hours reception covers', () => {
  it('are the ones the public site states', () => {
    // If the footer's hours change, the rota's must change with them.
    const mon = OFFICE_HOURS[1];
    const fri = OFFICE_HOURS[5];
    expect(footerConfig.contact.officeHours).toEqual([
      `Monday–Thursday: ${mon.from}–${mon.to}`,
      `Friday: ${fri.from}–${fri.to}`,
    ]);
    expect([2, 3, 4].map((d) => OFFICE_HOURS[d])).toEqual([mon, mon, mon]);
  });

  it('are none at the weekend', () => {
    expect(officeHoursOn('2026-10-17')).toBeNull();
    expect(officeHoursOn('2026-10-18')).toBeNull();
    expect(officeHoursOn('2026-10-16')).toEqual({ from: '08:30', to: '13:00' });
  });
});

describe('reception gaps', () => {
  const tuesday = '2026-10-13';

  it('are the whole day when nobody is in', () => {
    expect(receptionGaps(tuesday, [])).toEqual([{ from: '08:30', to: '19:00' }]);
  });

  it('are what overlapping shifts leave open, within the office hours only', () => {
    expect(
      receptionGaps(tuesday, [
        { from: '08:00', to: '15:30' },
        { from: '08:10', to: '17:10' },
        { from: '10:00', to: '16:45' },
      ])
    ).toEqual([{ from: '17:10', to: '19:00' }]);
  });

  it('find a hole in the middle, and ignore a handover shorter than a quarter hour', () => {
    expect(
      receptionGaps(tuesday, [
        { from: '08:30', to: '12:00' },
        { from: '13:00', to: '16:00' },
        { from: '16:10', to: '19:30' },
      ])
    ).toEqual([{ from: '12:00', to: '13:00' }]);
  });

  it('are none on a covered Friday or a closed day', () => {
    expect(receptionGaps('2026-10-16', [{ from: '08:00', to: '13:00' }])).toEqual([]);
    expect(receptionGaps('2026-10-17', [])).toEqual([]);
  });
});

describe('shift times', () => {
  it('run from seven to eight in quarter hours', () => {
    expect(SHIFT_TIMES[0]).toBe('07:00');
    expect(SHIFT_TIMES.at(-1)).toBe('20:00');
    expect(SHIFT_TIMES).toContain('08:30');
  });
});
