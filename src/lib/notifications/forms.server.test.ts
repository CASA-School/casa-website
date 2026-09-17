import { afterEach, describe, expect, it, vi } from 'vitest';
import { formDeliveryConfig, notifyForm, TEST_FORM_RECIPIENT, type FormKind } from './forms.server';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('public form notifications', () => {
  it('defaults every form to the test inbox even if production recipients exist', () => {
    vi.stubEnv('FORM_DELIVERY_MODE', '');
    const kinds: FormKind[] = ['contact', 'groups', 'course', 'exam', 'careers', 'placement', 'appointment'];
    for (const kind of kinds) {
      vi.stubEnv(`FORM_RECIPIENT_${kind.toUpperCase()}`, 'real-recipient@example.com');
      expect(formDeliveryConfig(kind)).toEqual({ test: true, recipient: TEST_FORM_RECIPIENT });
    }
  });
  it('never falls back to an uncontrolled webhook while testing', async () => {
    vi.stubEnv('FORM_DELIVERY_MODE', 'test');
    vi.stubEnv('FORM_MAIL_FROM', '');
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    expect(await notifyForm('course', { email: 'applicant@example.com' }, 'https://example.com/webhook'))
      .toEqual({ delivered: false, channel: 'unconfigured' });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('sends only to admin through Microsoft Graph, preserving the submitted address as data', async () => {
    vi.stubEnv('FORM_DELIVERY_MODE', 'test');
    vi.stubEnv('FORM_MAIL_FROM', 'website@example.com');
    vi.stubEnv('IDENTITY_ENDPOINT', 'http://identity.local/token');
    vi.stubEnv('IDENTITY_HEADER', 'test-header');
    vi.stubEnv('FORM_MAIL_IDENTITY_CLIENT_ID', 'test-client');
    const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'test-token' })))
      .mockResolvedValueOnce(new Response(null, { status: 202 }));
    vi.stubGlobal('fetch', fetch);
    expect(await notifyForm('appointment', { email: 'applicant@example.com' })).toEqual({ delivered: true, channel: 'email' });
    expect(String(fetch.mock.calls[0][0])).toContain('client_id=test-client');
    const body = JSON.parse(fetch.mock.calls[1][1].body);
    expect(body.message.toRecipients).toEqual([{ emailAddress: { address: TEST_FORM_RECIPIENT } }]);
    expect(body.message.ccRecipients).toBeUndefined();
    expect(body.message.bccRecipients).toBeUndefined();
    expect(body.message.body.content).toContain('applicant@example.com');
  });
  it('requires an explicit valid recipient in live mode', async () => {
    vi.stubEnv('FORM_DELIVERY_MODE', 'live');
    vi.stubEnv('FORM_RECIPIENT_CONTACT', '');
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    expect((await notifyForm('contact', {}, 'https://example.com')).delivered).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('reports a Microsoft rejection without leaking content or retrying another recipient path', async () => {
    vi.stubEnv('FORM_DELIVERY_MODE', 'test');
    vi.stubEnv('FORM_MAIL_FROM', 'website@example.com');
    vi.stubEnv('IDENTITY_ENDPOINT', 'http://identity.local/token');
    vi.stubEnv('IDENTITY_HEADER', 'test-header');
    const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'test-token' })))
      .mockResolvedValueOnce(new Response('private provider detail', { status: 403 }));
    vi.stubGlobal('fetch', fetch);
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(await notifyForm('contact', { requestId: 'test-reference', message: 'private message' }, 'https://example.com'))
      .toEqual({ delivered: false, channel: 'failed' });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(log.mock.calls)).not.toContain('private');
  });
});
