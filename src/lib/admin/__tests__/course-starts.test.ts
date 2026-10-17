import { describe, expect, it } from 'vitest';

import { nextStart, readStartForm, readTimeRange, roomChoice, roomName, sessionOfTime } from '../course-starts';

describe('readTimeRange', () => {
  it('reads what people type as the schedule stores it', () => {
    expect(readTimeRange('09:00-12:30', null)).toEqual({ ok: true, time: '09:00-12:30' });
    expect(readTimeRange('09:00–12:30', null)).toEqual({ ok: true, time: '09:00-12:30' });
    expect(readTimeRange(' 9:00 – 12:30 ', null)).toEqual({ ok: true, time: '09:00-12:30' });
    expect(readTimeRange('9-12.30', null)).toEqual({ ok: true, time: '09:00-12:30' });
    expect(readTimeRange('18:30 bis 20:00 Uhr', null)).toEqual({ ok: true, time: '18:30-20:00' });
  });

  it('fills empty hours from the time of day', () => {
    expect(readTimeRange('', 'morning')).toEqual({ ok: true, time: '09:00-12:30' });
    expect(readTimeRange('  ', 'afternoon')).toEqual({ ok: true, time: '13:00-17:30' });
    expect(readTimeRange(null, 'evening')).toEqual({ ok: true, time: '18:30-20:00' });
    expect(readTimeRange('', null)).toEqual({ ok: false, error: 'missing' });
  });

  it('refuses what is no time range', () => {
    expect(readTimeRange('vormittags', 'morning')).toEqual({ ok: false, error: 'invalid' });
    expect(readTimeRange('25:00-26:00', null)).toEqual({ ok: false, error: 'invalid' });
    expect(readTimeRange('12:30-09:00', null)).toEqual({ ok: false, error: 'order' });
  });

  it('agrees with the time of day the board reads', () => {
    expect(sessionOfTime('09:00-12:30')).toBe('morning');
    expect(sessionOfTime('13:00-17:30')).toBe('afternoon');
    expect(sessionOfTime('18:30-20:00')).toBe('evening');
  });
});

describe('readStartForm', () => {
  const form = (fields: Record<string, string | string[]>) => {
    const data = new FormData();
    for (const [k, v] of Object.entries(fields)) for (const x of Array.isArray(v) ? v : [v]) data.append(k, x);
    return data;
  };

  it('takes a start with an en dash in its hours, off the website unless ticked', () => {
    const read = readStartForm(form({ startDate: '2028-03-06', endDate: '2028-04-28', session: 'morning', time: '09:00 – 12:30', days: ['Fri', 'Mon'], title: ' Audittest ' }));
    expect(read).toEqual({
      ok: true,
      value: { startDate: '2028-03-06', endDate: '2028-04-28', session: 'morning', days: ['Mon', 'Fri'], time: '09:00-12:30', title: 'Audittest', roomId: null, onWebsite: false },
    });
  });

  it('sends back what it cannot store, with the reason', () => {
    expect(readStartForm(form({ startDate: '2028-03-06', endDate: '2028-04-28', days: ['Mon'] })).ok).toBe(false);
    expect(readStartForm(form({ startDate: '2028-04-28', endDate: '2028-03-06', session: 'morning', days: ['Mon'] })).ok).toBe(false);
    expect(readStartForm(form({ startDate: '2028-03-06', endDate: '2028-04-28', session: 'morning' })).ok).toBe(false);
    const ticked = readStartForm(form({ startDate: '2028-03-06', endDate: '2028-04-28', session: 'evening', days: ['Mon'], onWebsite: 'on' }));
    expect(ticked.ok && ticked.value).toMatchObject({ time: '18:30-20:00', onWebsite: true });
  });
});

describe('rooms and the next start', () => {
  it('names a room by its city, with the room in a list of choices', () => {
    expect(roomName({ name: 'EG 8', nickname: 'Augsburg' })).toBe('Augsburg');
    expect(roomChoice({ name: 'EG 8', nickname: 'Augsburg' })).toBe('Augsburg · EG 8');
    expect(roomName({ name: 'Büro', nickname: null })).toBe('Büro');
  });

  it('skips starts already under way', () => {
    const starts = [{ startDate: '2026-10-05' }, { startDate: '2026-10-26' }, { startDate: '2026-10-19' }];
    expect(nextStart(starts, '2026-10-17')).toEqual({ startDate: '2026-10-19' });
    expect(nextStart([{ startDate: new Date(2026, 9, 17) }], '2026-10-17')).not.toBeNull();
    expect(nextStart([{ startDate: '2026-10-05' }], '2026-10-17')).toBeNull();
  });
});
