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
  it('sets Reply-To to the submitter and sends a labelled HTML body instead of JSON', async () => {
    const body = await sentMessage('course', {
      requestId: 'ref-1', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com',
      courseTypeId: '40000000-0000-4000-8000-000000010003', courseTypeLabel: 'Intensive German',
      visaRequired: false, accommodationRequired: false, allergies: 'cats', notes: 'Line one\nLine two',
    });
    expect(body.message.replyTo).toEqual([{ emailAddress: { address: 'ada@example.com', name: 'Ada Lovelace' } }]);
    expect(body.message.toRecipients).toEqual([{ emailAddress: { address: TEST_FORM_RECIPIENT } }]);
    expect(body.message.body.contentType).toBe('HTML');
    expect(body.message.subject).toBe('[TEST] Kursanmeldung: Ada Lovelace – Intensive German');
    const content: string = body.message.body.content;
    expect(content).toContain('Neue Kursanmeldung');
    expect(content).toContain('Referenz ref-1');
    expect(content).toContain('href="mailto:ada@example.com"');
    expect(content).toContain('Intensive German');
    expect(content).toContain('Nicht benötigt');
    expect(content).toContain('Line one<br>Line two');
    expect(content).not.toContain('40000000-0000-4000-8000-000000010003');
    // Allergies belong to an accommodation request only.
    expect(content).not.toContain('Allergien');
  });
  it('prints the readings of machine tokens in the form\'s language, not the tokens', async () => {
    const group = (await sentMessage('groups', {
      requestId: 'r', locale: 'de', topic: 'Gruppenreise',
      organiserBrief: { meals: 'half-board-plus-canteen', ageBand: '14-17', invoicingParty: 'public-funder', groupSize: 12 },
    })).message.body.content as string;
    expect(group).toContain('Sprache: Deutsch');
    expect(group).toContain('Halbpension plus Mittagessen in der Kantine');
    expect(group).toContain('Öffentlicher Träger oder Förderprogramm');
    expect(group).toContain('Anzahl der Teilnehmenden');
    expect(group).not.toMatch(/half-board|public-funder/);

    const course = (await sentMessage('course', {
      requestId: 'r', salutation: 'ms', accommodationRequired: true, accommodationType: 'host', locale: 'en',
    })).message.body.content as string;
    expect(course).toContain('New course registration');
    expect(course).toContain('>Ms<');
    expect(course).toContain('Host family');
    expect(course).toContain('Language: English');

    const exam = (await sentMessage('exam', { requestId: 'r', salutation: 'neutral', registrationType: 'written' }))
      .message.body.content as string;
    expect(exam).toContain('Keine Anrede');
    expect(exam).toContain('Nur schriftlich');
  });
  it('escapes everything the sender typed', async () => {
    const content = (await sentMessage('contact', {
      requestId: 'r', firstName: '<b>Eve</b>', topic: 'Kurse', message: '<script>alert(1)</script>',
    })).message.body.content as string;
    expect(content).not.toContain('<script>');
    expect(content).not.toContain('<b>Eve</b>');
    expect(content).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
  it('names only the position for a job application, and no token in a placement subject', async () => {
    const careers = await sentMessage('careers', { requestId: 'r', positionTitle: 'Lehrkraft DaF', locale: 'de' });
    expect(careers.message.subject).toBe('[TEST] Bewerbung: Lehrkraft DaF');
    expect(careers.message.body.content).toContain('„Bewerbungen“');
    const placement = await sentMessage('placement', { token: 'secret-token', band: 'B1.1', confidence: 'medium', locale: 'de' });
    expect(placement.message.subject).toBe('[TEST] Einstufungstest: Empfehlung B1.1');
    expect(placement.message.subject).not.toContain('secret-token');
  });
  it('writes an appointment as its weekday, date and Bremen time', async () => {
    const appointment = await sentMessage('appointment', {
      requestId: 'r', firstName: 'Ina', lastName: 'Gast', email: 'gast@example.com',
      localDate: '2026-10-08', localTime: '10:30', durationMinutes: 30, locale: 'de',
    });
    expect(appointment.message.subject).toBe('[TEST] Terminanfrage: Ina Gast – Donnerstag, 8. Oktober 2026, 10:30 Uhr');
    expect(appointment.message.body.content).toContain('10:30 Uhr (Bremer Zeit)');
    expect(appointment.message.body.content).toContain('30 Minuten');
  });
  it('sets no Reply-To when the submission carries no usable address', async () => {
    expect((await sentMessage('placement', { token: 'tok-1', band: 'B1' })).message.replyTo).toBeUndefined();
    expect((await sentMessage('contact', { requestId: 'r', email: 'not-an-address' })).message.replyTo).toBeUndefined();
  });
  it('says whether the workspace holds the record, and claims nothing when not told', async () => {
    const stored = await sentMessage('contact', { requestId: 'r' }, { stored: true });
    const notStored = await sentMessage('contact', { requestId: 'r' }, { stored: false });
    const unknown = await sentMessage('contact', { requestId: 'r' });
    expect(stored.message.body.content).toContain('Auch im Arbeitsbereich gespeichert.');
    expect(notStored.message.body.content).toContain('Diese E-Mail ist der einzige Eintrag.');
    for (const message of [stored.message, notStored.message]) {
      expect(message.subject.startsWith('[TEST] ')).toBe(true);
      expect(message.body.content).toContain('Testbetrieb: Alle Formular-E-Mails gehen derzeit an admin@casa-bremen.de.');
    }
    expect(unknown.message.body.content).not.toContain('Arbeitsbereich');
  });
  it('carries the CASA logo inline, so no client blocks it as remote content', async () => {
    const body = await sentMessage('contact', { requestId: 'r', firstName: 'Ada', email: 'ada@example.com', topic: 'Kurse' });
    expect(body.message.attachments).toEqual([expect.objectContaining({
      '@odata.type': '#microsoft.graph.fileAttachment', contentType: 'image/png', contentId: 'casa-logo', isInline: true,
    })]);
    expect(body.message.attachments[0].contentBytes.startsWith('iVBORw0KGgo')).toBe(true);
    expect(body.message.body.content).toContain('src="cid:casa-logo"');
    expect(body.message.body.content).toContain('@media only screen and (max-width: 620px)');
  });
  it('prepares a reply in the sender\'s language, greeting them by salutation', async () => {
    const de = (await sentMessage('course', {
      requestId: 'r', salutation: 'ms', firstName: 'Maria', lastName: 'Rossi', email: 'maria@example.com', courseTypeLabel: 'Intensivkurs', locale: 'de',
    })).message.body.content as string;
    expect(de).toContain('Maria antworten');
    expect(de).toContain(`subject=${encodeURIComponent('Ihre Kursanmeldung bei CASA')}`);
    expect(de).toContain(encodeURIComponent('Sehr geehrte Frau Rossi,'));
    const en = (await sentMessage('contact', { requestId: 'r', firstName: 'Sam', email: 'sam@example.com', locale: 'en' }))
      .message.body.content as string;
    expect(en).toContain('Reply to Sam');
    expect(en).toContain(encodeURIComponent('Dear Sam,'));
  });
  it('offers the contact person a ready confirmation for an appointment', async () => {
    const content = (await sentMessage('appointment', {
      requestId: 'r', firstName: 'Jonas', lastName: 'Becker', email: 'jonas@example.com',
      localDate: '2026-10-08', localTime: '10:30', durationMinutes: 30, locale: 'de',
    })).message.body.content as string;
    expect(content).toContain('Termin bestätigen');
    expect(content).toContain('mailto:jonas@example.com?subject=');
    expect(content).toContain(encodeURIComponent('am Donnerstag, 8. Oktober 2026, um 10:30 Uhr (Bremer Zeit)'));
    expect(content).toContain('Diese Uhrzeit ist ab sofort für andere Anfragen reserviert.');
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
