import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetRateLimits } from '@/lib/api/rate-limit';

const mocks = vi.hoisted(() => ({ book: vi.fn(), booked: vi.fn(), notify: vi.fn(), confirm: vi.fn<(...args: unknown[]) => Promise<{ sent: boolean; reachedSender: boolean }>>(async () => ({ sent: true, reachedSender: true })) }));
vi.mock('@/lib/appointments/placement-repository.server', () => ({ bookPlacementSeat: mocks.book, bookedPlacementSeats: mocks.booked }));
vi.mock('@/lib/notifications/forms.server', () => ({ notifyForm: mocks.notify, confirmToSender: mocks.confirm }));
import { GET, POST } from './route';

const payload = { date: '2026-10-28', time: '10:00', locale: 'de', firstName: 'Test', email: 'admin@casa-bremen.de', phone: '+49 421 123', privacy: true };
const request = (overrides = {}) => new Request('http://localhost/api/placement-appointments', {
  method: 'POST', body: JSON.stringify({ ...payload, ...overrides }),
});

beforeEach(() => {
  resetRateLimits();
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-27T08:00Z'));
  vi.stubEnv('DATABASE_URL', 'postgres://test');
  mocks.book.mockResolvedValue({ id: 'a', seat: 1 }); mocks.booked.mockResolvedValue(new Map());
  mocks.notify.mockResolvedValue({ delivered: true, channel: 'email' });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe('placement appointments', () => {
  it('books the place at once in Bremen time and tells online@ which place it is', async () => {
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ data: { status: 'booked', held: true, notified: true }, error: null });
    expect(mocks.book.mock.calls[0][0].toISOString()).toBe('2026-10-28T09:00:00.000Z');
    expect(mocks.notify.mock.calls[0][0]).toBe('placement-appointment');
    expect(mocks.notify.mock.calls[0][1]).toMatchObject({ seat: 1, held: true, localTime: '10:00' });
    expect(mocks.notify.mock.calls[0][3]).toEqual({ stored: true });
  });

  it('answers 409 when both places went, and sends nothing', async () => {
    mocks.book.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(409);
    expect(mocks.notify).not.toHaveBeenCalled();
    expect(mocks.confirm).not.toHaveBeenCalled();
  });

  it('refuses Mondays, times not on the list, times too soon, odd phone numbers and missing consent', async () => {
    for (const changes of [{ date: '2026-11-02' }, { time: '10:30' }, { date: '2026-10-27', time: '09:30' }, { phone: 'call me' }, { privacy: false }]) {
      expect((await POST(request(changes))).status).toBe(400);
    }
    expect(mocks.book).not.toHaveBeenCalled();
  });

  it('without a database offers every time and sends the request by mail, booking nothing', async () => {
    vi.stubEnv('DATABASE_URL', '');
    const days = await GET();
    expect(await days.json()).toMatchObject({ data: { held: false } });
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ data: { status: 'requested', held: false } });
    expect(mocks.book).not.toHaveBeenCalled();
    expect(mocks.notify.mock.calls[0][3]).toEqual({ stored: false });
    expect(mocks.confirm.mock.calls[0][1]).toMatchObject({ held: false });
  });

  it('without a database refuses when the mail cannot go out', async () => {
    vi.stubEnv('DATABASE_URL', '');
    mocks.notify.mockResolvedValue({ delivered: false, channel: 'unconfigured' });
    expect((await POST(request())).status).toBe(503);
  });
});
