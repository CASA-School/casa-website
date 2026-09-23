import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

import { resetRateLimits } from '@/lib/api/rate-limit';

const mocks = vi.hoisted(() => ({ store: vi.fn(), notify: vi.fn(), catalog: vi.fn() }));
vi.mock('@/lib/admin/intake', () => ({ storeCourseRegistration: mocks.store }));
vi.mock('@/lib/notifications/forms.server', () => ({ notifyForm: mocks.notify }));
vi.mock('@/lib/content/repository', () => ({ getCourseRegistrationCatalog: mocks.catalog }));
import { POST } from './route';

const TYPE_ID = '40000000-0000-4000-8000-000000000001';
const OPTION_ID = '20000000-0000-4000-8000-000000000001';

const catalog = {
  locale: 'de',
  courseTypes: [{ id: TYPE_ID, name: 'Intensiv Deutsch' }],
  optionsByCourseTypeId: {
    [TYPE_ID]: [{
      id: OPTION_ID, dateRangeLabel: '26. Okt. 2026 - 18. Dez. 2026',
      scheduleLabel: 'Mo-Fr 09:00-12:15', locationLabel: 'CASA Bremen',
    }],
  },
};

const valid = {
  salutation: 'ms', courseTypeId: TYPE_ID, courseInstanceId: OPTION_ID,
  firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com', phone: '+49 421 000000',
  nationality: 'Germany', birthDate: '1990-01-01', visaRequired: false, accommodationRequired: false,
  acceptTerms: true, courseTypeLabel: 'client label', courseInstanceLabel: 'client option', locale: 'de',
};

const request = (body: unknown, address = '203.0.113.7') => new Request('http://localhost/api/registration/course', {
  method: 'POST', headers: { 'x-forwarded-for': address }, body: JSON.stringify(body),
}) as NextRequest;

afterEach(() => { vi.clearAllMocks(); resetRateLimits(); });

describe('course registration route', () => {
  it('answers a German page in German when a field is missing', async () => {
    const response = await POST(request({ ...valid, salutation: undefined }));
    expect(response.status).toBe(400);
    expect((await response.json()).message).toBe('Bitte wählen Sie eine Anrede aus.');
  });

  it('refuses an option the catalogue does not offer, in the page language', async () => {
    mocks.catalog.mockResolvedValue(catalog);
    const response = await POST(request({ ...valid, courseInstanceId: '20000000-0000-4000-8000-00000000dead' }));
    expect(response.status).toBe(400);
    expect((await response.json()).message).toBe('Dieser Starttermin ist nicht mehr buchbar. Bitte wählen Sie einen anderen Termin.');
    expect(mocks.store).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it('stores an offered option with the catalogue labels and tells the email whether it was stored', async () => {
    mocks.catalog.mockResolvedValue(catalog);
    mocks.store.mockResolvedValue(false);
    mocks.notify.mockResolvedValue({ delivered: true, channel: 'email' });
    const response = await POST(request(valid));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'accepted', stored: false, notified: true });
    expect(mocks.catalog).toHaveBeenCalledWith('de');
    expect(mocks.store.mock.calls[0][0]).toMatchObject({
      courseTypeLabel: 'Intensiv Deutsch',
      courseInstanceLabel: '26. Okt. 2026 - 18. Dez. 2026 | Mo-Fr 09:00-12:15 | CASA Bremen',
    });
    const [kind, payload, , options] = mocks.notify.mock.calls[0];
    expect(kind).toBe('course');
    expect(payload).toMatchObject({ courseTypeLabel: 'Intensiv Deutsch', email: 'ada@example.com' });
    expect(payload).not.toHaveProperty('website');
    expect(options).toEqual({ stored: false });
  });

  it('gives a filled honeypot a quiet success and stores nothing', async () => {
    for (const website of ['https://spam.example', 'x'.repeat(250)]) {
      const response = await POST(request({ ...valid, website }));
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ status: 'accepted', mode: 'filtered' });
    }
    expect(mocks.catalog).not.toHaveBeenCalled();
    expect(mocks.store).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it('refuses an oversized id before it reaches storage', async () => {
    const response = await POST(request({ ...valid, courseInstanceId: 'x'.repeat(100_000) }));
    expect(response.status).toBe(400);
    expect(mocks.store).not.toHaveBeenCalled();
  });

  it('limits one client to 20 registrations per 10 minutes', async () => {
    mocks.catalog.mockResolvedValue(catalog);
    mocks.store.mockResolvedValue(true);
    mocks.notify.mockResolvedValue({ delivered: false, channel: 'unconfigured' });
    for (let attempt = 0; attempt < 20; attempt += 1) {
      expect((await POST(request(valid))).status).toBe(200);
    }
    expect((await POST(request(valid))).status).toBe(429);
    expect((await POST(request(valid, '198.51.100.1'))).status).toBe(200);
  });
});
