// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/careers/apply/route';
import { resetRateLimits } from '@/lib/api/rate-limit';

const originalCareersWebhookUrl = process.env.CAREERS_APPLICATION_WEBHOOK_URL;
const originalDatabaseUrl = process.env.DATABASE_URL;

const PDF = '%PDF-1.7\n%resume\n';

function makeCareerApplicationRequest({
  cvFile = new File([PDF], 'resume.pdf', { type: 'application/pdf' }),
  extra = {},
}: { cvFile?: File; extra?: Record<string, string> } = {}) {
  const formData = new FormData();
  formData.set('positionId', '79b868c5-c66b-4288-9be6-000000000041');
  formData.set('positionSlug', 'daf-teacher-bremen');
  formData.set('positionTitle', 'German Teacher (DaF)');
  formData.set('locale', 'en');
  formData.set('firstName', 'Rahman');
  formData.set('lastName', 'Shafiee');
  formData.set('email', 'rahman@example.com');
  formData.set('phone', '+49123456789');
  formData.set('linkedinUrl', 'https://www.linkedin.com/in/rahman');
  formData.set('coverLetter', 'I have several years of teaching experience and would love to support CASA learners.');
  formData.set('cvFile', cvFile);
  for (const [key, value] of Object.entries(extra)) formData.set(key, value);

  return {
    formData: async () => formData,
    headers: new Headers({
      'user-agent': 'vitest',
    }),
  } as Request;
}

beforeEach(() => {
  resetRateLimits();
});

afterEach(() => {
  if (originalCareersWebhookUrl === undefined) {
    delete process.env.CAREERS_APPLICATION_WEBHOOK_URL;
  } else {
    process.env.CAREERS_APPLICATION_WEBHOOK_URL = originalCareersWebhookUrl;
  }

  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }

  vi.restoreAllMocks();
});

describe('careers apply route', () => {
  it('rejects submissions when CV storage is unavailable', async () => {
    process.env.CAREERS_APPLICATION_WEBHOOK_URL = 'https://example.com/careers';
    delete process.env.DATABASE_URL;

    const fetchSpy = vi.spyOn(global, 'fetch');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await POST(makeCareerApplicationRequest());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      status: 'error',
      supportPath: '/contact?topic=careers',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('refuses a file whose bytes are not the kind its name and type claim', async () => {
    delete process.env.DATABASE_URL;

    const disguised = [
      // An executable renamed to look like a CV.
      new File(['MZ\x90\x00'], 'Lebenslauf.pdf', { type: 'application/pdf' }),
      // A double extension ending in something that runs.
      new File([PDF], 'Lebenslauf.pdf.exe', { type: 'application/pdf' }),
      // A real PDF with no declared type: the site's own form never sends one.
      new File([PDF], 'resume.pdf', { type: '' }),
      // A PDF named as a Word document.
      new File([PDF], 'resume.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    ];

    for (const cvFile of disguised) {
      const response = await POST(makeCareerApplicationRequest({ cvFile }));
      expect(response.status, cvFile.name).toBe(400);
    }
  });

  it('accepts Word documents whose bytes match', async () => {
    delete process.env.DATABASE_URL;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const doc = new File([new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0])], 'cv.DOC', {
      type: 'application/msword',
    });
    const docx = new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0])], 'cv.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    // Past the file checks, stopped only by the missing database.
    for (const cvFile of [doc, docx]) {
      expect((await POST(makeCareerApplicationRequest({ cvFile }))).status, cvFile.name).toBe(503);
    }
  });

  it('tells a bot that filled the honeypot it succeeded, and stores nothing', async () => {
    process.env.DATABASE_URL = 'postgres://test';
    const fetchSpy = vi.spyOn(global, 'fetch');

    const response = await POST(makeCareerApplicationRequest({ extra: { website: 'https://spam.example' } }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'accepted', mode: 'filtered' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('limits one client to five applications in ten minutes', async () => {
    delete process.env.DATABASE_URL;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    for (let i = 0; i < 5; i += 1) {
      expect((await POST(makeCareerApplicationRequest())).status).toBe(503);
    }
    expect((await POST(makeCareerApplicationRequest())).status).toBe(429);
  });
});
