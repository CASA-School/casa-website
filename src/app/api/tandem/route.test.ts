import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetRateLimits } from '@/lib/api/rate-limit';

const mocks = vi.hoisted(() => ({
  store: vi.fn(),
  notify: vi.fn(),
  confirm: vi.fn<(...args: unknown[]) => Promise<{ sent: boolean; reachedSender: boolean }>>(async () => ({ sent: true, reachedSender: true })),
}));
vi.mock('@/lib/admin/intake', () => ({ storeEnquiry: mocks.store }));
vi.mock('@/lib/notifications/forms.server', () => ({ notifyForm: mocks.notify, confirmToSender: mocks.confirm }));
import { POST } from './route';

const payload = {
  locale: 'de', offers: 'Spanisch, Englisch', wants: 'Deutsch', level: 'B1',
  firstName: 'Lucía', lastName: 'Gómez', email: 'lucia@example.com', phone: '+49 170 1234567',
  interests: 'Musik, Kochen', privacy: true,
};
const request = (overrides = {}) => new Request('http://localhost/api/tandem', {
  method: 'POST', body: JSON.stringify({ ...payload, ...overrides }),
});

beforeEach(() => {
  resetRateLimits();
  mocks.store.mockResolvedValue(false);
  mocks.notify.mockResolvedValue({ delivered: true, channel: 'email' });
});
afterEach(() => { vi.clearAllMocks(); });

describe('tandem requests', () => {
  it('needs both languages, a level, both names and the privacy box', async () => {
    for (const changes of [{ offers: '' }, { wants: 'x' }, { level: 'C2' }, { lastName: '' }, { privacy: false }, { phone: 'call me' }]) {
      expect((await POST(request(changes))).status).toBe(400);
    }
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it('is a contact enquiry „Sprachtandem" for the team, alerting the contact mailbox', async () => {
    mocks.store.mockResolvedValue(true);
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ data: { stored: true, notified: true, confirmationSent: true }, error: null });
    const stored = mocks.store.mock.calls[0][0];
    expect(stored).toMatchObject({ topic: 'Sprachtandem', topicKey: 'tandem', source: 'tandem-form', lastName: 'Gómez' });
    expect(stored.message).toContain('Sprachangebot: Spanisch, Englisch');
    expect(stored.message).toContain('Wunschsprache: Deutsch (Niveau B1)');
    expect(stored.message).toContain('Hobbys/Interessen: Musik, Kochen');
    expect(mocks.notify.mock.calls[0][0]).toBe('contact');
    expect(mocks.notify.mock.calls[0][3]).toEqual({ stored: true });
    expect(mocks.confirm.mock.calls[0][0]).toBe('contact');
  });

  it('without a database the mail is the record: it must go out, or the request is refused', async () => {
    expect((await POST(request())).status).toBe(201);
    mocks.notify.mockResolvedValue({ delivered: false, channel: 'unconfigured' });
    expect((await POST(request())).status).toBe(503);
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
  });

  it('drops a filled honeypot without storing or sending anything', async () => {
    expect((await POST(request({ website: 'spam' }))).status).toBe(201);
    expect(mocks.store).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
  });
});
