import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

import { resetRateLimits } from '@/lib/api/rate-limit';

const mocks = vi.hoisted(() => ({ store: vi.fn(), notify: vi.fn(), confirm: vi.fn<(...args: unknown[]) => Promise<{ sent: boolean; reachedSender: boolean }>>(async () => ({ sent: true, reachedSender: true })), catalog: vi.fn(), examCatalog: vi.fn() }));
vi.mock('@/lib/admin/intake', () => ({ storeRegistration: mocks.store }));
vi.mock('@/lib/notifications/forms.server', () => ({ notifyForm: mocks.notify, confirmToSender: mocks.confirm }));
vi.mock('@/lib/content/repository', () => ({ getCourseRegistrationCatalog: mocks.catalog, getExamRegistrationCatalog: mocks.examCatalog }));
import { POST } from './route';

const TYPE_ID = '40000000-0000-4000-8000-000000000001';
const OPTION_ID = '20000000-0000-4000-8000-000000000001';

const INTENSIVE_ID = '40000000-0000-4000-8000-000000000002';
const INTENSIVE_OPTION_ID = '20000000-0000-4000-8000-000000000002';
const EXAM_ID = '50000000-0000-4000-8000-000000000001';
const SESSION_ID = '60000000-0000-4000-8000-000000000001';

const catalog = {
  locale: 'de',
  courseTypes: [{ id: TYPE_ID, slug: 'special-courses', name: 'Intensiv Deutsch' }, { id: INTENSIVE_ID, slug: 'intensive-german', name: 'Intensivkurse' }],
  optionsByCourseTypeId: {
    [TYPE_ID]: [{
      id: OPTION_ID, dateRangeLabel: '26. Okt. 2026 - 18. Dez. 2026',
      scheduleLabel: 'Mo-Fr 09:00-12:15', locationLabel: 'CASA Bremen', availableLevels: [],
    }],
    [INTENSIVE_ID]: [{
      id: INTENSIVE_OPTION_ID, dateRangeLabel: '23. Nov. 2026 - 28. Jan. 2027', startDate: '2026-11-23', endDate: '2027-01-28',
      scheduleLabel: 'Mo-Fr 09:00-12:30', locationLabel: 'CASA Bremen', availableLevels: ['A1.1', 'A1.2', 'A2.1', 'A2.2', 'B1.1', 'B1.2'],
    }, {
      id: '20000000-0000-4000-8000-000000000003', dateRangeLabel: '01. Feb. 2027 - 01. Apr. 2027', startDate: '2027-02-01', endDate: '2027-04-01',
      scheduleLabel: 'Mo-Do 13:00-17:30', locationLabel: 'CASA Bremen', availableLevels: ['A1.1', 'A1.2', 'A2.1', 'A2.2', 'B1.1', 'B1.2'],
    }],
  },
};

const examCatalog = {
  locale: 'de',
  examTypes: [{ id: EXAM_ID, name: 'telc Deutsch B2' }],
  optionsByExamTypeId: { [EXAM_ID]: [{ id: SESSION_ID, startsAtLabel: '13. Nov. 2026, 09:00 - 17:00', locationLabel: 'CASA Bremen Prüfungszentrum' }] },
};

const valid = {
  salutation: 'ms', courses: [{ courseTypeId: TYPE_ID, courseInstanceId: OPTION_ID, level: '' }],
  firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com', phone: '+49 421 000000',
  nationality: 'Germany', birthDate: '1990-01-01', visaRequired: false, accommodationRequired: false,
  acceptTerms: true, locale: 'de',
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
    const response = await POST(request({ ...valid, courses: [{ courseTypeId: TYPE_ID, courseInstanceId: '20000000-0000-4000-8000-00000000dead' }] }));
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
    expect(mocks.store.mock.calls[0][0].courses).toMatchObject([{
      courseTypeLabel: 'Intensiv Deutsch',
      courseInstanceLabel: '26. Okt. 2026 - 18. Dez. 2026 | Mo-Fr 09:00-12:15 | CASA Bremen',
    }]);
    const [kind, payload, , options] = mocks.notify.mock.calls[0];
    expect(kind).toBe('course');
    expect(payload).toMatchObject({ courseTypeLabel: 'Intensiv Deutsch', email: 'ada@example.com' });
    expect(payload).not.toHaveProperty('website');
    expect(options).toEqual({ stored: false });
  });

  it('confirms an accepted registration to the sender, and says so', async () => {
    mocks.catalog.mockResolvedValue(catalog);
    mocks.store.mockResolvedValue(true);
    mocks.notify.mockResolvedValue({ delivered: true, channel: 'email' });
    const response = await POST(request(valid));
    expect(await response.json()).toMatchObject({ status: 'accepted', confirmationSent: true });
    const [kind, payload] = mocks.confirm.mock.calls[0];
    expect(kind).toBe('course');
    expect(payload).toMatchObject({ courseTypeLabel: 'Intensiv Deutsch', email: 'ada@example.com' });
  });

  it('sends no confirmation when nothing was stored and nothing delivered', async () => {
    mocks.catalog.mockResolvedValue(catalog);
    mocks.store.mockResolvedValue(false);
    mocks.notify.mockResolvedValue({ delivered: false, channel: 'failed' });
    expect((await POST(request(valid))).status).toBe(503);
    expect(mocks.confirm).not.toHaveBeenCalled();
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
    expect(mocks.confirm).not.toHaveBeenCalled();
  });

  it('refuses an oversized id before it reaches storage', async () => {
    const response = await POST(request({ ...valid, courses: [{ courseTypeId: TYPE_ID, courseInstanceId: 'x'.repeat(100_000) }] }));
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

  it('stores two courses and an exam for one person, names the whole level, and lists it all in the mails', async () => {
    mocks.catalog.mockResolvedValue(catalog);
    mocks.examCatalog.mockResolvedValue(examCatalog);
    mocks.store.mockResolvedValue(true);
    mocks.notify.mockResolvedValue({ delivered: true, channel: 'email' });
    const response = await POST(request({
      ...valid,
      courses: [
        { courseTypeId: INTENSIVE_ID, courseInstanceId: INTENSIVE_OPTION_ID, level: 'A1' },
        { courseTypeId: TYPE_ID, courseInstanceId: OPTION_ID, level: '' },
      ],
      examEnabled: true,
      exam: { examTypeId: EXAM_ID, examSessionId: SESSION_ID, registrationType: 'full' },
      officialNameConfirmed: true,
      examPolicyAccepted: true,
    }));
    expect(response.status).toBe(200);
    const { requestId } = await response.json();

    const stored = mocks.store.mock.calls[0][0];
    expect(stored.courses).toHaveLength(2);
    expect(stored.courses[0]).toMatchObject({ requestId, levelRaw: 'A1 komplett (A1.1 + A1.2) · 8 Wochen', levelCode: 'A1.1' });
    expect(stored.courses[1].requestId).not.toBe(requestId);
    expect(stored.exam).toMatchObject({ examTypeLabel: 'telc Deutsch B2', registrationType: 'full', officialNameConfirmed: true });
    expect(stored.registrant).toMatchObject({ email: 'ada@example.com' });

    const [, payload] = mocks.notify.mock.calls[0];
    expect(payload).toMatchObject({
      courseTypeLabel: 'Intensivkurse',
      currentLevel: 'A1 komplett (A1.1 + A1.2) · 8 Wochen',
      courses: [{ courseTypeLabel: 'Intensivkurse' }, { courseTypeLabel: 'Intensiv Deutsch' }],
      exam: { examTypeLabel: 'telc Deutsch B2', registrationType: 'full' },
    });
    expect(JSON.stringify(payload)).not.toContain(EXAM_ID);
  });

  it('refuses a level the course does not offer, and a missing one where it needs one', async () => {
    mocks.catalog.mockResolvedValue(catalog);
    for (const level of ['C2', '']) {
      const response = await POST(request({ ...valid, courses: [{ courseTypeId: INTENSIVE_ID, courseInstanceId: INTENSIVE_OPTION_ID, level }] }));
      expect(response.status, level).toBe(400);
      expect((await response.json()).message).toBe('Bitte wählen Sie ein Niveau aus.');
    }
    expect(mocks.store).not.toHaveBeenCalled();
  });

  it('refuses an exam date the exam catalogue does not offer', async () => {
    mocks.catalog.mockResolvedValue(catalog);
    mocks.examCatalog.mockResolvedValue(examCatalog);
    const response = await POST(request({
      ...valid,
      examEnabled: true,
      exam: { examTypeId: EXAM_ID, examSessionId: '60000000-0000-4000-8000-00000000dead', registrationType: 'oral' },
      officialNameConfirmed: true,
      examPolicyAccepted: true,
    }));
    expect(response.status).toBe(400);
    expect((await response.json()).message).toBe('Dieser Prüfungstermin ist nicht mehr buchbar. Bitte wählen Sie einen anderen Termin.');
    expect(mocks.store).not.toHaveBeenCalled();
  });

  it('stores a learning path as one row per level, in the terms it finds, with a dateless row where none is listed', async () => {
    mocks.catalog.mockResolvedValue(catalog);
    mocks.store.mockResolvedValue(true);
    mocks.notify.mockResolvedValue({ delivered: true, channel: 'email' });
    const response = await POST(request({ ...valid, courses: [{ courseTypeId: INTENSIVE_ID, courseInstanceId: INTENSIVE_OPTION_ID, level: 'A1.1', pathTo: 'B1' }] }));
    expect(response.status).toBe(200);
    const rows = mocks.store.mock.calls[0][0].courses;
    expect(rows.map((row: { levelRaw: string }) => row.levelRaw)).toEqual([
      'A1 komplett (A1.1 + A1.2) · 8 Wochen',
      'A2 komplett (A2.1 + A2.2) · 8 Wochen',
      'B1 komplett (B1.1 + B1.2) · 8 Wochen',
    ]);
    expect(rows[1].courseInstanceLabel).toBe('01. Feb. 2027 - 01. Apr. 2027 | Mo-Do 13:00-17:30 | CASA Bremen');
    expect(rows[2]).toMatchObject({ courseInstanceId: '', courseInstanceLabel: 'Termin wird noch festgelegt', levelCode: 'B1.1' });
    expect(new Set(rows.map((row: { requestId: string }) => row.requestId)).size).toBe(3);
  });

  it('refuses a path to a level the course cannot reach from the one chosen', async () => {
    mocks.catalog.mockResolvedValue(catalog);
    const response = await POST(request({ ...valid, courses: [{ courseTypeId: INTENSIVE_ID, courseInstanceId: INTENSIVE_OPTION_ID, level: 'B1', pathTo: 'A2' }] }));
    expect(response.status).toBe(400);
    expect(mocks.store).not.toHaveBeenCalled();
  });
});
