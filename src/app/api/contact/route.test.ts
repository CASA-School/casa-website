import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ store: vi.fn(), notify: vi.fn() }));
vi.mock('@/lib/admin/intake', () => ({ storeEnquiry: mocks.store }));
vi.mock('@/lib/notifications/forms.server', () => ({ notifyForm: mocks.notify }));
import { POST } from './route';

afterEach(() => vi.clearAllMocks());
const request = () => new Request('http://localhost/api/contact', {
  method: 'POST', body: JSON.stringify({
    firstName: 'Test', lastName: 'CASA', email: 'admin@casa-bremen.de',
    locale: 'en', topic: 'General enquiry', message: 'Please help me choose a German course.', source: 'contact-page',
  }),
}) as NextRequest;

describe('contact delivery acknowledgement', () => {
  it('does not claim receipt when both storage and delivery are unavailable', async () => {
    mocks.store.mockResolvedValue(false); mocks.notify.mockResolvedValue({ delivered: false, channel: 'unconfigured' });
    expect((await POST(request())).status).toBe(503);
  });
  it('acknowledges a saved enquiry even if notification fails', async () => {
    mocks.store.mockResolvedValue(true); mocks.notify.mockResolvedValue({ delivered: false, channel: 'failed' });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ stored: true, notified: false, mode: 'database' });
  });
});
