import { afterEach, describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/careers/apply/route';

const originalCareersWebhookUrl = process.env.CAREERS_APPLICATION_WEBHOOK_URL;
const originalDatabaseUrl = process.env.DATABASE_URL;

function makeCareerApplicationRequest() {
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
  formData.set('cvFile', new File(['resume'], 'resume.pdf', { type: 'application/pdf' }));

  return {
    formData: async () => formData,
    headers: new Headers({
      'user-agent': 'vitest',
    }),
  } as Request;
}

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
});
