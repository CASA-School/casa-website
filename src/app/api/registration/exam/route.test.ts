import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

import { resetRateLimits } from '@/lib/api/rate-limit';

const mocks = vi.hoisted(() => ({ store: vi.fn(), notify: vi.fn(), catalog: vi.fn() }));
vi.mock('@/lib/admin/intake', () => ({ storeExamRegistration: mocks.store }));
vi.mock('@/lib/notifications/forms.server', () => ({ notifyForm: mocks.notify }));
vi.mock('@/lib/content/repository', () => ({ getExamRegistrationCatalog: mocks.catalog }));
import { POST } from './route';

const TYPE_ID = '40000000-0000-4000-8000-000000010003';
const SESSION_ID = '20000000-0000-4000-8000-000000000001';

const catalog = {
  locale: 'en',
  examTypes: [{ id: TYPE_ID, name: 'telc Deutsch B2' }],
  optionsByExamTypeId: {
    [TYPE_ID]: [{
      id: SESSION_ID, startsAtLabel: '21 Nov 2026', locationLabel: 'CASA Bremen',
      deadlineLabel: 'Register by 24 Oct 2026',
    }],
  },
};

const valid = {
  salutation: 'mr', examTypeId: TYPE_ID, examSessionId: SESSION_ID, registrationType: 'full',
  firstName: 'Alan', lastName: 'Turing', email: 'alan@example.com', phone: '+49 421 000000',
  nationality: 'United Kingdom', birthDate: '1990-01-01', officialNameConfirmed: true,
  examPolicyAccepted: true, acceptTerms: true, locale: 'en',
};

const request = (body: unknown) => new Request('http://localhost/api/registration/exam', {
  method: 'POST', headers: { 'x-forwarded-for': '203.0.113.9' }, body: JSON.stringify(body),
}) as NextRequest;

afterEach(() => { vi.clearAllMocks(); resetRateLimits(); });

describe('exam registration route', () => {
  it('answers a German page in German when a field is missing', async () => {
    const response = await POST(request({ ...valid, locale: 'de', firstName: '' }));
    expect(response.status).toBe(400);
    expect((await response.json()).message).toBe('Bitte geben Sie Ihren Vornamen an (mindestens 2 Zeichen).');
  });

  it('refuses a session the catalogue no longer offers', async () => {
    mocks.catalog.mockResolvedValue({ ...catalog, optionsByExamTypeId: { [TYPE_ID]: [] } });
    const response = await POST(request(valid));
    expect(response.status).toBe(400);
    expect((await response.json()).message).toBe(
      'Registration for this exam session is no longer possible. Please choose another session.'
    );
    expect(mocks.store).not.toHaveBeenCalled();
  });

  it('stores an offered session with its label and passes the storage result to the email', async () => {
    mocks.catalog.mockResolvedValue(catalog);
    mocks.store.mockResolvedValue(true);
    mocks.notify.mockResolvedValue({ delivered: false, channel: 'failed' });
    const response = await POST(request(valid));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ stored: true, notified: false, mode: 'database' });
    expect(mocks.store.mock.calls[0][0]).toMatchObject({
      examTypeId: TYPE_ID,
      examSessionId: SESSION_ID,
      examTypeLabel: 'telc Deutsch B2',
      // The deadline status goes stale the day after; the stored label names the sitting only.
      examSessionLabel: '21 Nov 2026 | CASA Bremen',
    });
    expect(mocks.notify.mock.calls[0][3]).toEqual({ stored: true });
  });

  it('does not claim receipt when both storage and delivery are unavailable', async () => {
    mocks.catalog.mockResolvedValue(catalog);
    mocks.store.mockResolvedValue(false);
    mocks.notify.mockResolvedValue({ delivered: false, channel: 'unconfigured' });
    const response = await POST(request(valid));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ status: 'error', supportPath: '/contact' });
  });

  it('gives a filled honeypot a quiet success and stores nothing', async () => {
    for (const website of ['filled', 'x'.repeat(250)]) {
      const response = await POST(request({ ...valid, locale: 'de', website }));
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ status: 'accepted', mode: 'filtered' });
    }
    expect(mocks.store).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
  });
});
