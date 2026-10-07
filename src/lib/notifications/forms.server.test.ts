import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  confirmToSender, formDeliveryConfig, notifyForm, resetConfirmationLimits, TEST_FORM_RECIPIENT, type FormKind,
} from './forms.server';

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

const twoCoursesAndAnExam = {
  requestId: 'r', locale: 'de', salutation: 'ms', firstName: 'Maria', lastName: 'Rossi', email: 'maria@example.com',
  courseTypeLabel: 'Intensivkurse', courseInstanceLabel: '26.10.2026 – 18.12.2026 | Mo–Fr, 9:00–12:30 | CASA Am Dobben',
  currentLevel: 'A1 komplett · 8 Wochen',
  courses: [
    { courseTypeLabel: 'Intensivkurse', courseInstanceLabel: '26.10.2026 – 18.12.2026 | Mo–Fr, 9:00–12:30 | CASA Am Dobben', level: 'A1 komplett · 8 Wochen' },
    { courseTypeLabel: 'Spezialkurse', courseInstanceLabel: '02.11.2026 – 17.12.2026 | Mo, Mi, 18:00–19:30 | CASA Am Dobben', level: 'B1.2' },
  ],
  exam: { examTypeLabel: 'telc Deutsch B2', examSessionLabel: '13.11.2026, 09:00–17:00 | CASA Prüfungszentrum', registrationType: 'full' },
};

describe('public form notifications', () => {
  it('numbers the courses of a registration with several, and adds the exam booked with them', async () => {
    const mail = (await sentMessage('course', twoCoursesAndAnExam)).message;
    const body = mail.body.content as string;
    expect(body).toContain('Maria Rossi hat sich für 2 Kurse und eine Prüfung angemeldet.');
    expect(body).toContain('Kurs 1');
    expect(body).toContain('Kurs 2');
    expect(body).toContain('Spezialkurse');
    expect(body).toContain('telc Deutsch B2');
    expect(body).toContain('Mit Prüfung');
    expect(body).toContain('Gewünschtes Niveau');
    expect(mail.subject).toContain('Kursanmeldung: Maria Rossi – Intensivkurse, Spezialkurse + telc Deutsch B2');
  });

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

describe('confirmation to the sender', () => {
  /** Sends one confirmation through a stubbed Graph and returns the posted message, or null if nothing was sent. */
  async function confirmation(kind: Parameters<typeof confirmToSender>[0], payload: Record<string, unknown>, mode: 'test' | 'live' = 'test') {
    vi.stubEnv('FORM_DELIVERY_MODE', mode);
    vi.stubEnv('FORM_MAIL_FROM', 'website@example.com');
    vi.stubEnv('IDENTITY_ENDPOINT', 'http://identity.local/token');
    vi.stubEnv('IDENTITY_HEADER', 'test-header');
    vi.stubEnv('FORM_RECIPIENT_COURSE', 'online@example.com');
    vi.stubEnv('FORM_RECIPIENT_CONTACT', 'info@example.com');
    const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'test-token' })))
      .mockResolvedValueOnce(new Response(null, { status: 202 }));
    vi.stubGlobal('fetch', fetch);
    const result = await confirmToSender(kind, payload);
    return { result, message: fetch.mock.calls[1] ? JSON.parse(fetch.mock.calls[1][1].body).message : null };
  }

  const course = {
    requestId: 'ref-42', locale: 'de', salutation: 'ms', firstName: 'Maria', lastName: 'Rossi', email: 'maria@example.com',
    courseTypeLabel: 'Intensivkurs Deutsch', courseInstanceLabel: '12.01.2027 – 05.02.2027 | Mo–Fr, 9:00–12:15 | CASA Am Dobben',
    visaRequired: true, accommodationRequired: true, accommodationType: 'host',
    allergies: 'PRIVATE-ALLERGY', notes: 'PRIVATE-NOTE',
  };

  beforeEach(() => resetConfirmationLimits());

  it('goes to the test inbox in test mode and names the address it would have reached', async () => {
    const { result, message } = await confirmation('course', course);
    expect(result).toEqual({ sent: true, reachedSender: false });
    expect(message.toRecipients).toEqual([{ emailAddress: { address: TEST_FORM_RECIPIENT } }]);
    expect(message.subject.startsWith('[TEST] ')).toBe(true);
    expect(message.body.content).toContain('maria@example.com');
  });

  it('goes to the sender in live mode, with replies to the team mailbox for that form', async () => {
    const { result, message } = await confirmation('course', course, 'live');
    expect(result).toEqual({ sent: true, reachedSender: true });
    expect(message.toRecipients).toEqual([{ emailAddress: { address: 'maria@example.com' } }]);
    expect(message.replyTo).toEqual([{ emailAddress: { address: 'online@example.com', name: 'CASA Internationale Sprachschule' } }]);
    expect(message.subject.startsWith('[TEST]')).toBe(false);
    expect(message.attachments[0]).toEqual(expect.objectContaining({ contentId: 'casa-logo', isInline: true }));
  });

  it('prints the catalogue choices and the reference, never what the sender typed', async () => {
    const { message } = await confirmation('course', course);
    const content: string = message.body.content;
    expect(content).toContain('Intensivkurs Deutsch');
    expect(content).toContain('ref-42');
    expect(content).not.toContain('PRIVATE-ALLERGY');
    expect(content).not.toContain('PRIVATE-NOTE');
    const contact = (await confirmation('contact', {
      requestId: 'r', locale: 'de', firstName: 'Ada', email: 'ada@example.com', topic: 'PRIVATE-TOPIC', message: 'PRIVATE-MESSAGE',
    })).message.body.content as string;
    expect(contact).not.toContain('PRIVATE-TOPIC');
    expect(contact).not.toContain('PRIVATE-MESSAGE');
  });

  it('greets neutrally when the "name" carries a link or digits', async () => {
    const { message } = await confirmation('contact', {
      requestId: 'r', locale: 'de', firstName: 'Visit www.spam.example', email: 'victim@example.com', message: 'x',
    });
    expect(message.body.content).not.toContain('spam.example');
  });

  it('lists a further course and an exam booked with the first, and only when there are some', async () => {
    const single = (await confirmation('course', course)).message.body.content as string;
    expect(single).not.toContain('Weiterer Kurs');
    const many = (await confirmation('course', { ...course, ...twoCoursesAndAnExam, requestId: 'ref-43' })).message.body.content as string;
    expect(many).toContain('A1 komplett · 8 Wochen');
    expect(many).toContain('Weiterer Kurs');
    expect(many).toContain('Spezialkurse · B1.2 · 02.11.2026 – 17.12.2026');
    expect(many).toContain('telc Deutsch B2 · 13.11.2026, 09:00–17:00');
  });

  it('sends at most three confirmations to one address a day', async () => {
    const results = [];
    for (let i = 0; i < 4; i += 1) results.push((await confirmation('course', course, 'live')).result.sent);
    expect(results).toEqual([true, true, true, false]);
  });

  it('sends nothing without a usable address or without the Microsoft connection', async () => {
    expect((await confirmation('course', { ...course, email: 'not-an-address' })).result.sent).toBe(false);
    vi.stubEnv('FORM_MAIL_FROM', '');
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    expect((await confirmToSender('course', course)).sent).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends nothing live when the form has no mailbox to receive replies', async () => {
    vi.stubEnv('FORM_RECIPIENT_EXAM', '');
    const exam = { requestId: 'r', locale: 'de', firstName: 'Ada', email: 'ada@example.com', examTypeLabel: 'telc Deutsch B1' };
    expect((await confirmation('exam', exam, 'live')).result.sent).toBe(false);
  });

  it('sends an application receipt live only with a management reply mailbox, never info@', async () => {
    const application = { requestId: 'r', locale: 'de', firstName: 'Ada', lastName: 'Byron', email: 'ada@example.com', positionTitle: 'Lehrkraft DaF' };
    vi.stubEnv('FORM_RECIPIENT_CAREERS', 'info@example.com');
    expect((await confirmation('careers', application, 'live')).result.sent).toBe(false);
    vi.stubEnv('FORM_REPLY_TO_CAREERS', 'leitung@example.com');
    const { message } = await confirmation('careers', application, 'live');
    expect(message.replyTo).toEqual([{ emailAddress: { address: 'leitung@example.com', name: 'CASA Internationale Sprachschule' } }]);
    expect(message.body.content).toContain('Lehrkraft DaF');
  });

  it('greets a learner by first name, never reveals the visa need, and drops an unscheduled row', async () => {
    const greeted = (await confirmation('course', course)).message.body.content as string;
    expect(greeted).toContain('Hallo Maria,');
    expect(greeted).not.toContain('Frau Rossi');
    expect(greeted).not.toContain('Visum');
    const unscheduled = (await confirmation('course', {
      ...course, courseInstanceLabel: '12.01.2027 - 05.02.2027 | Tage werden noch festgelegt | CASA Am Dobben',
    })).message.body.content as string;
    expect(unscheduled).not.toContain('noch festgelegt');
    expect(unscheduled).toContain('12.01.2027 – 05.02.2027');
    const scheduled = (await confirmation('course', {
      ...course, courseInstanceLabel: '12.01.2027 - 05.02.2027 | Mo, Di • 09:00-12:15 | CASA Am Dobben',
    })).message.body.content as string;
    expect(scheduled).toContain('09:00–12:15');
  });

  it('counts one inbox once, whatever its spelling', async () => {
    const sent = [];
    for (const email of ['victim+1@gmail.com', 'v.ictim@gmail.com', 'VICTIM@googlemail.com', 'victim+x@gmail.com']) {
      sent.push((await confirmation('course', { ...course, email }, 'live')).result.sent);
    }
    expect(sent).toEqual([true, true, true, false]);
  });

  it('caps confirmations overall, so a flood cannot get the sender mailbox blocked', async () => {
    const sent = [];
    for (let i = 0; i < 31; i += 1) sent.push((await confirmation('course', { ...course, email: `person${i}@example.com` }, 'live')).result.sent);
    expect(sent.filter(Boolean)).toHaveLength(30);
    expect(sent[30]).toBe(false);
  });

  it('keeps no Sent Items copy of a confirmation, and gives a failed send its slot back', async () => {
    expect((await confirmation('course', course, 'live')).message).toBeTruthy();
    vi.stubEnv('FORM_DELIVERY_MODE', 'live');
    const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 't' })))
      .mockResolvedValueOnce(new Response(null, { status: 202 }));
    vi.stubGlobal('fetch', fetch);
    await confirmToSender('course', course);
    expect(JSON.parse(fetch.mock.calls[1][1].body).saveToSentItems).toBe(false);

    resetConfirmationLimits();
    const failing = vi.fn().mockResolvedValue(new Response(JSON.stringify({ access_token: 't' }), { status: 500 }));
    vi.stubGlobal('fetch', failing);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (let i = 0; i < 3; i += 1) expect((await confirmToSender('course', course)).sent).toBe(false);
    expect((await confirmation('course', course, 'live')).result.sent).toBe(true);
  });

  it('refuses lookalike links and numeral strings in the name, and links CASA\'s own number', async () => {
    for (const firstName of ['wwwꓸcasa-erstattungꓸde', '零一七六二三四五六七八']) {
      const content = (await confirmation('contact', { requestId: 'r', locale: 'de', firstName, email: 'v@example.com', message: 'x' }))
        .message.body.content as string;
      expect(content).toContain('Hallo,');
      expect(content).not.toContain(firstName);
    }
    const contact = (await confirmation('contact', { requestId: 'r', locale: 'de', firstName: 'Ada', email: 'ada@example.com' }))
      .message.body.content as string;
    expect(contact).toContain('href="tel:+4942146041430"');
  });

  it('says „du“ to a learner and keeps „Sie“ for a group organiser', async () => {
    // Live, so the test-mode line for the team is not part of the mail.
    const learner = (await confirmation('course', course, 'live')).message.body.content as string;
    expect(learner).toContain('Schön, dass du bei uns Deutsch lernen möchtest');
    expect(learner).toContain('Dein CASA-Team');
    expect(learner).not.toMatch(/\b(Sie|Ihre?[nmrs]?|Ihnen)\b/);

    const organiser = (await confirmation('groups', {
      requestId: 'r', locale: 'de', firstName: 'Jonas', lastName: 'Weber', email: 'jonas@example.com', topicKey: 'group-booking',
    })).message.body.content as string;
    expect(organiser).toContain('Guten Tag Jonas Weber,');
    expect(organiser).toContain('Ihr CASA-Team');
    expect(organiser).not.toContain('Dein CASA-Team');

    const english = (await confirmation('course', { ...course, locale: 'en' })).message.body.content as string;
    expect(english).toContain('Dear Ms Rossi,');
  });

  it('writes in the language of the form', async () => {
    const de = (await confirmation('course', course)).message;
    const en = (await confirmation('course', { ...course, locale: 'en' })).message;
    expect(de.body.content).toContain('lang="de"');
    expect(en.body.content).toContain('lang="en"');
    expect(de.subject).not.toBe(en.subject);
  });
});
