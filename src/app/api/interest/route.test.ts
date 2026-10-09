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
  course: 'medical-german', locale: 'de', level: 'B2', profession: 'doctor', days: ['fri', 'mon'], times: ['afternoon'],
  firstName: 'Amira', lastName: 'Haddad', email: 'amira@example.com', phone: '+49 170 1234567', privacy: true,
};
const request = (overrides = {}) => new Request('http://localhost/api/interest', {
  method: 'POST', body: JSON.stringify({ ...payload, ...overrides }),
});

beforeEach(() => {
  resetRateLimits();
  mocks.store.mockResolvedValue(false);
  mocks.notify.mockResolvedValue({ delivered: true, channel: 'email' });
});
afterEach(() => { vi.clearAllMocks(); });

describe('interest list entries', () => {
  it('needs a level, at least one day and one time, both names and the privacy box', async () => {
    for (const changes of [{ level: 'A1' }, { days: [] }, { times: [] }, { lastName: '' }, { privacy: false }, { course: 'intensive-german' }, { phone: 'call me' }]) {
      expect((await POST(request(changes))).status).toBe(400);
    }
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it('stores the whole entry for the team and alerts the contact mailbox', async () => {
    mocks.store.mockResolvedValue(true);
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ data: { stored: true, notified: true, confirmationSent: true }, error: null });
    const stored = mocks.store.mock.calls[0][0];
    expect(stored).toMatchObject({ topicKey: 'interest-medical-german', source: 'interest-list', lastName: 'Haddad' });
    expect(stored.message).toContain('Niveau: B2');
    expect(stored.message).toContain('Tage: Montag, Freitag');
    expect(stored.message).toContain('Tageszeit: Nachmittags');
    expect(stored.message).toContain('Telefon: +49 170 1234567');
    expect(mocks.notify.mock.calls[0][0]).toBe('interest');
    expect(mocks.notify.mock.calls[0][1]).toMatchObject({ courseName: 'Deutsch für Pflege und Medizin', days: ['fri', 'mon'] });
    expect(mocks.notify.mock.calls[0][3]).toEqual({ stored: true });
  });

  it('without a database the mail is the record: it must go out, or the entry is refused', async () => {
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
