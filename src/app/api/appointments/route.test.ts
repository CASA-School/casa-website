import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ reserve: vi.fn(), taken: vi.fn(), notify: vi.fn() }));
vi.mock('@/lib/appointments/repository.server', () => ({ reserveAppointment: mocks.reserve, takenAppointments: mocks.taken }));
vi.mock('@/lib/notifications/forms.server', () => ({ notifyForm: mocks.notify }));
import { GET, POST } from './route';

const payload = { date: '2026-09-21', time: '10:30', locale: 'de', firstName: 'Test', email: 'admin@casa-bremen.de', privacy: true };
const request = (overrides = {}) => new Request('http://localhost/api/appointments', {
  method: 'POST', body: JSON.stringify({ ...payload, ...overrides }),
});

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-17T08:00Z'));
  vi.stubEnv('DATABASE_URL', 'postgres://test');
  vi.stubEnv('GROUP_APPOINTMENT_BLOCKED_DATES', '');
  mocks.reserve.mockResolvedValue(true); mocks.taken.mockResolvedValue(new Set());
  mocks.notify.mockResolvedValue({ delivered: false, channel: 'unconfigured' });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe('appointment requests', () => {
  it('requires persistence and never fabricates availability', async () => {
    vi.stubEnv('DATABASE_URL', '');
    expect((await GET()).status).toBe(503);
    expect((await POST(request())).status).toBe(503);
    expect(mocks.reserve).not.toHaveBeenCalled();
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
    expect(await response.json()).toMatchObject({ data: { status: 'requested', notified: false }, error: null });
  });
});
