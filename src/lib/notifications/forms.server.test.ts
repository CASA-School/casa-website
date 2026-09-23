import { afterEach, describe, expect, it, vi } from 'vitest';
import { formDeliveryConfig, notifyForm, TEST_FORM_RECIPIENT, type FormKind } from './forms.server';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

/** Sends one notification through a stubbed Graph and returns the message it posted. */
async function sentMessage(kind: FormKind, payload: Record<string, unknown>, options?: { stored?: boolean }) {
  vi.stubEnv('FORM_DELIVERY_MODE', 'test');
  vi.stubEnv('FORM_MAIL_FROM', 'website@example.com');
  vi.stubEnv('IDENTITY_ENDPOINT', 'http://identity.local/token');
  vi.stubEnv('IDENTITY_HEADER', 'test-header');
  const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'test-token' })))
    .mockResolvedValueOnce(new Response(null, { status: 202 }));
  vi.stubGlobal('fetch', fetch);
  expect(await notifyForm(kind, payload, null, options)).toEqual({ delivered: true, channel: 'email' });
  return JSON.parse(fetch.mock.calls[1][1].body);
}

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
  it('sets Reply-To to the submitter and writes a labelled body instead of JSON', async () => {
    const body = await sentMessage('course', {
      requestId: 'ref-1', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com',
      courseTypeId: '40000000-0000-4000-8000-000000010003', courseTypeLabel: 'Intensive German',
      visaRequired: false, allergies: '', notes: 'Line one\nLine two',
      organiserBrief: { groupSize: 12, meals: null },
    });
    expect(body.message.replyTo).toEqual([{ emailAddress: { address: 'ada@example.com', name: 'Ada Lovelace' } }]);
    expect(body.message.toRecipients).toEqual([{ emailAddress: { address: TEST_FORM_RECIPIENT } }]);
    const content: string = body.message.body.content;
    expect(content).toContain('Course registration from the website.');
    expect(content).toContain('Reference: ref-1');
    expect(content).toContain('Email: ada@example.com');
    expect(content).toContain('Course: Intensive German');
    expect(content).toContain('Visa required: No');
    expect(content).toContain('Notes:\nLine one\nLine two');
    expect(content).toContain('Organiser brief:\n  Group size: 12');
    expect(content).not.toContain('{');
    expect(content).not.toContain('40000000-0000-4000-8000-000000010003');
    expect(content).not.toContain('Allergies');
    expect(content).not.toContain('Meals');
  });
  it('prints the readings of machine tokens, not the tokens', async () => {
    const group = (await sentMessage('groups', {
      requestId: 'r', locale: 'de',
      organiserBrief: { meals: 'half-board-plus-canteen', ageBand: '14-17', invoicingParty: 'public-funder', groupSize: 12 },
    })).message.body.content as string;
    expect(group).toContain('Language: German');
    expect(group).toContain('  Meals: Half board plus school canteen');
    expect(group).toContain('  Age band: 14–17');
    expect(group).toContain('  Who is invoiced: A public funder');
    expect(group).toContain('  Group size: 12');
    expect(group).not.toMatch(/half-board|public-funder/);

    const course = (await sentMessage('course', {
      requestId: 'r', salutation: 'ms', accommodationType: 'host', locale: 'en',
    })).message.body.content as string;
    expect(course).toContain('Salutation: Ms');
    expect(course).toContain('Accommodation type: Host family');
    expect(course).toContain('Language: English');

    const exam = (await sentMessage('exam', { requestId: 'r', salutation: 'neutral', registrationType: 'written' }))
      .message.body.content as string;
    expect(exam).toContain('Salutation: No salutation');
    expect(exam).toContain('Exam part: Written part only');
  });
  it('sets no Reply-To when the submission carries no usable address', async () => {
    expect((await sentMessage('placement', { token: 'tok-1', band: 'B1' })).message.replyTo).toBeUndefined();
    expect((await sentMessage('contact', { requestId: 'r', email: 'not-an-address' })).message.replyTo).toBeUndefined();
  });
  it('says whether the workspace holds the record, and claims nothing when not told', async () => {
    const stored = await sentMessage('contact', { requestId: 'r' }, { stored: true });
    const notStored = await sentMessage('contact', { requestId: 'r' }, { stored: false });
    const unknown = await sentMessage('contact', { requestId: 'r' });
    expect(stored.message.body.content).toContain('also stored in the staff workspace');
    expect(notStored.message.body.content).toContain('This email is the only record of it.');
    for (const content of [stored.message.body.content, notStored.message.body.content]) {
      expect(content.startsWith('TEST DELIVERY')).toBe(true);
    }
    expect(unknown.message.body.content).not.toContain('workspace');
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
