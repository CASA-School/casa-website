import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetRateLimits } from '@/lib/api/rate-limit';

const mocks = vi.hoisted(() => ({ reserve: vi.fn(), taken: vi.fn(), notify: vi.fn(), confirm: vi.fn<(...args: unknown[]) => Promise<{ sent: boolean; reachedSender: boolean }>>(async () => ({ sent: true, reachedSender: true })) }));
vi.mock('@/lib/appointments/repository.server', () => ({ reserveAppointment: mocks.reserve, takenAppointments: mocks.taken }));
vi.mock('@/lib/notifications/forms.server', () => ({ notifyForm: mocks.notify, confirmToSender: mocks.confirm }));
import { GET, POST } from './route';

const payload = { date: '2026-09-21', time: '10:30', locale: 'de', firstName: 'Test', email: 'admin@casa-bremen.de', privacy: true };
const request = (overrides = {}) => new Request('http://localhost/api/appointments', {
  method: 'POST', body: JSON.stringify({ ...payload, ...overrides }),
});

beforeEach(() => {
  resetRateLimits();
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-17T08:00Z'));
  vi.stubEnv('DATABASE_URL', 'postgres://test');
  vi.stubEnv('GROUP_APPOINTMENT_BLOCKED_DATES', '');
  mocks.reserve.mockResolvedValue(true); mocks.taken.mockResolvedValue(new Set());
  mocks.notify.mockResolvedValue({ delivered: false, channel: 'unconfigured' });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe('appointment requests', () => {
  it('without a database offers the schedule and sends the request by mail, holding nothing', async () => {
    vi.stubEnv('DATABASE_URL', '');
    mocks.notify.mockResolvedValue({ delivered: true, channel: 'graph' });
    const days = await GET();
    expect(days.status).toBe(200);
    expect(await days.json()).toMatchObject({ data: { held: false, days: expect.arrayContaining([{ date: '2026-09-21', times: ['10:00', '10:30', '13:00', '13:30'] }]) } });
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ data: { status: 'requested', held: false, notified: true } });
    expect(mocks.reserve).not.toHaveBeenCalled();
    expect(mocks.notify.mock.calls[0][1]).toMatchObject({ held: false, localDate: '2026-09-21', localTime: '10:30' });
    expect(mocks.notify.mock.calls[0][3]).toEqual({ stored: false });
    expect(mocks.confirm.mock.calls[0][1]).toMatchObject({ held: false });
  });
  it('without a database refuses when the mail cannot go out: nothing would reach CASA', async () => {
    vi.stubEnv('DATABASE_URL', '');
    expect((await POST(request())).status).toBe(503);
    expect(mocks.confirm).not.toHaveBeenCalled();
  });
  it('rejects Friday, unsupported start times, closures and missing consent', async () => {
    vi.stubEnv('GROUP_APPOINTMENT_BLOCKED_DATES', '2026-09-22');
    for (const changes of [{ date: '2026-09-18' }, { time: '11:00' }, { date: '2026-09-22' }, { privacy: false }]) {
      expect((await POST(request(changes))).status).toBe(400);
    }
    expect(mocks.reserve).not.toHaveBeenCalled();
  });
  it('reports a race-lost slot as unavailable and does not notify', async () => {
    mocks.reserve.mockResolvedValue(false);
    expect((await POST(request())).status).toBe(409);
    expect(mocks.notify).not.toHaveBeenCalled();
  });
  it('saves in Bremen time and acknowledges a request, never a confirmed meeting', async () => {
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(mocks.reserve.mock.calls[0][0].toISOString()).toBe('2026-09-21T08:30:00.000Z');
    expect(await response.json()).toMatchObject({ data: { status: 'requested', held: true, notified: false }, error: null });
    expect(mocks.notify.mock.calls[0][3]).toEqual({ stored: true });
  });
  it('refuses a seventh request from one client in ten minutes, before reserving a slot', async () => {
    for (let i = 0; i < 6; i += 1) expect((await POST(request())).status).toBe(201);
    expect((await POST(request())).status).toBe(429);
    expect(mocks.reserve).toHaveBeenCalledTimes(6);
  });
});
