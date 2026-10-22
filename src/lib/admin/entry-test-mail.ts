import 'server-only';

import { z } from 'zod';

import { logActivity } from './activity';
import type { StaffUser } from './auth';
import { berlinDay } from './days';
import { query } from './db';
import { dayEntryTests, entryTestLink, entryTestOrigin, openEntryTests, type DayEntryTest } from './entry-tests';
import type { Bilingual } from './i18n';
import { teacherMailHtml, type TeacherMailTest } from '@/lib/entry-test/teacher-mail';
import { ENTRY_TESTS } from '@/lib/entry-test/tests';
import { LOGO_CONTENT_ID } from '@/lib/notifications/casa-logo';
import { graphSender, sendGraphMail } from '@/lib/notifications/graph-mail.server';
import { qrPng } from '@/lib/qr-png';

/**
 * The mail that gives a start day's teachers their test codes (Rahman, 2026-10-22: a few days ahead, with
 * the course start mails, one mail and not one per test, checked on a preview page and sent from the
 * workspace). It goes from the forms' mailbox (`FORM_MAIL_FROM`) through Microsoft Graph, to the
 * teachers even while the form mails are in test mode (Rahman's choice: an internal mail, sent on
 * purpose and confirmed), and answers go to the colleague who sent it. Each mail as sent is kept in
 * `entry_test_mails` (0084). docs/ENTRY_TEST.md §The teachers' mail.
 */

type Result = { ok: true } | { ok: false; reason: Bilingual };
const refuse = (de: string, en: string): Result => ({ ok: false, reason: { de, en } });

/** Who gets the mail: the teachers of the start day's classes, and — unticked at first — the classes' other teachers of that week. */
export type MailRecipient = { email: string; name: string; classes: string; optional: boolean };

export type SentTeacherMail = { id: string; when: string; by: string | null; subject: string; recipients: { email: string; name: string | null }[] };

export type TeacherMailDraft = {
  day: string;
  /** „Montag, 26. Oktober". */
  dayLong: string;
  heading: string;
  /** The day's tests as the mail shows them (QR codes as data: pictures for the preview); a test not opened yet has no code. */
  tests: (TeacherMailTest & { sittingId: string | null })[];
  /** The day's tests not opened yet: sending opens them first. */
  waiting: DayEntryTest[];
  recipients: MailRecipient[];
  /** Teachers of those classes with no e-mail address on their record. */
  missing: string[];
  subject: string;
  intro: string;
  sent: SentTeacherMail[];
  /** Whether this deployment can send mail (Graph and its identity). */
  canSend: boolean;
};

const dayLongOf = (day: string) =>
  new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`));

const SESSION = { morning: 'Vormittag', afternoon: 'Nachmittag' } as const;
const SENT_AT = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });

export async function teacherMailDraft(day: string, actor: StaffUser): Promise<TeacherMailDraft> {
  const [tests, origin, sent] = await Promise.all([
    dayEntryTests(day),
    entryTestOrigin(),
    query<{ id: string; sent_at: Date; by: string | null; subject: string; recipients: { email: string; name: string | null }[] }>(
      `SELECT m.id, m.sent_at, u.name AS by, m.subject, m.recipients
         FROM entry_test_mails m LEFT JOIN staff_users u ON u.id = m.sent_by
        WHERE m.on_date = $1::date ORDER BY m.sent_at DESC`,
      [day]
    ),
  ]);
  const ready = tests.filter((x) => x.classes.length);
  const mailTests = ready.map((x) => {
    const meta = ENTRY_TESTS[x.test];
    const open = x.sitting && x.sitting.state !== 'closed' ? x.sitting : null;
    return {
      key: `${x.session}-${x.test}`,
      sittingId: open?.id ?? null,
      session: x.session,
      title: x.title,
      course: meta.course,
      checks: meta.checks,
      minutes: open?.minutes ?? meta.minutes,
      code: open?.code ?? null,
      classes: x.classes.map((c) => ({
        label: c.label,
        group: x.classes.filter((o) => o.label === c.label).length > 1 ? `Gruppe ${c.groupIndex}` : null,
        room: c.roomName,
        teacher: c.teacherName,
        startsAt: c.startsAt,
      })),
      qrSrc: `data:image/png;base64,${qrPng(entryTestLink(origin, x.test))}`,
    };
  });

  const recipients = new Map<string, MailRecipient>();
  const missing = new Set<string>();
  const labels = new Map<string, string>();
  const add = (email: string | null, name: string | null, label: string, optional: boolean) => {
    if (!email) {
      if (name && !optional) missing.add(name);
      return;
    }
    const key = email.toLowerCase();
    const found = recipients.get(key);
    if (!found) recipients.set(key, { email, name: name ?? email, classes: label, optional });
    else if (found.optional === optional && !found.classes.split(', ').includes(label)) found.classes = `${found.classes}, ${label}`;
  };
  for (const x of ready) {
    for (const c of x.classes) {
      const label = [c.label, x.classes.filter((o) => o.label === c.label).length > 1 ? `Gruppe ${c.groupIndex}` : null].filter(Boolean).join(' ');
      labels.set(`${c.courseId}:${c.groupIndex}`, label);
      add(c.teacherEmail, c.teacherName, label, false);
    }
  }
  // The classes' other teachers in the start week (the pair's second half, a cover), offered unticked.
  const classes = ready.flatMap((x) => x.classes);
  const others = classes.length
    ? await query<{ course_id: string; group_index: number; name: string | null; email: string | null }>(
        `SELECT DISTINCT d.course_id, d.group_index, coalesce(nullif(trim(sm.short_name), ''), concat_ws(' ', p.first_name, p.last_name)) AS name,
                (SELECT e.address FROM emails e WHERE e.person_id = p.id ORDER BY e.is_primary DESC, e.created_at LIMIT 1) AS email
           FROM course_days d JOIN staff_members sm ON sm.id = d.teacher_id JOIN people p ON p.id = sm.person_id
          WHERE NOT d.cancelled AND d.on_date BETWEEN $1::date AND $1::date + 6
            AND (d.course_id, d.group_index) IN (SELECT * FROM unnest($2::uuid[], $3::int[]))
          ORDER BY name`,
        [day, classes.map((c) => c.courseId), classes.map((c) => c.groupIndex)]
      )
    : [];
  for (const o of others) add(o.email, o.name, labels.get(`${o.course_id}:${o.group_index}`) ?? '', true);

  const dayLong = dayLongOf(day);
  const levels = [...new Set(ready.flatMap((x) => x.classes.map((c) => c.label)))].join(', ');
  const sessions = [...new Set(ready.map((x) => SESSION[x.session]))].join(' und ');
  const signature = actor.name.trim().split(/\s+/)[0] ?? '';
  return {
    day,
    dayLong,
    heading: `Einstufungstest am ${dayLong}`,
    tests: mailTests,
    waiting: tests.filter((x) => (!x.sitting || x.sitting.state === 'closed') && x.classes.length),
    recipients: [...recipients.values()],
    missing: [...missing],
    subject: `Einstufungstest am ${dayLong} – Codes und Leitfaden`,
    intro: [
      'Hallo zusammen,',
      `am ${dayLong} schreiben die neuen Teilnehmenden der Kurse ${levels || '…'}${sessions ? ` (${sessions})` : ''} den Einstufungstest. Hier findet ihr eure Codes, die QR-Codes und den Leitfaden.`,
      `Viele Grüße\n${signature}`,
    ].join('\n\n'),
    sent: sent.map((m) => ({ id: m.id, when: SENT_AT.format(m.sent_at), by: m.by, subject: m.subject, recipients: Array.isArray(m.recipients) ? m.recipients : [] })),
    canSend: graphSender() !== null,
  };
}

const Email = z.email();

/** Sends the day's mail as the office checked it: its subject, its text, to the addresses chosen. */
export async function sendTeacherMail(input: { day: string; subject: string; intro: string; emails: string[] }, actor: StaffUser): Promise<Result> {
  if (input.day < berlinDay(new Date())) return refuse('Dieser Testtag ist vorbei.', 'This test day is over.');
  const subject = input.subject.trim();
  const intro = input.intro.trim();
  if (!subject || subject.length > 200) return refuse('Bitte gib einen Betreff an.', 'Please give a subject.');
  if (!intro || intro.length > 4000) return refuse('Bitte schreib einen Text.', 'Please write a text.');
  const emails = [...new Map(input.emails.map((e) => e.trim()).filter(Boolean).map((e) => [e.toLowerCase(), e])).values()];
  if (!emails.length) return refuse('Bitte wähle mindestens eine Empfängerin oder einen Empfänger.', 'Please choose at least one recipient.');
  if (emails.length > 40) return refuse('Das sind zu viele Empfänger.', 'Those are too many recipients.');
  const wrong = emails.find((e) => !Email.safeParse(e).success);
  if (wrong) return refuse(`„${wrong}" ist keine E-Mail-Adresse.`, `“${wrong}” is not an e-mail address.`);

  const from = graphSender();
  if (!from) return refuse('Der Mailversand ist hier nicht eingerichtet.', 'Sending mail is not set up here.');
  let draft = await teacherMailDraft(input.day, actor);
  if (!draft.tests.length) return refuse('An diesem Tag beginnt kein Kurs mit Einstufungstest.', 'No course with a placement test starts on this day.');
  // The codes go out with the mail: a test not opened yet is opened now, with its own time.
  if (draft.tests.some((x) => !x.code)) {
    const opened = await openEntryTests(input.day, 'all', 0, actor);
    if (!opened.ok) return opened;
    draft = await teacherMailDraft(input.day, actor);
  }
  const sitting = (x: (typeof draft.tests)[number]) => (x.code && x.sittingId ? [x.sittingId] : []);
  if (draft.tests.some((x) => !x.code)) return refuse('Die Tests ließen sich nicht öffnen.', 'The tests could not be opened.');

  const html = teacherMailHtml({
    subject,
    heading: draft.heading,
    intro,
    tests: draft.tests.map((x) => ({ ...x, qrSrc: `cid:qr-${x.key}` })),
    logoSrc: `cid:${LOGO_CONTENT_ID}`,
  });
  const names = new Map(draft.recipients.map((r) => [r.email.toLowerCase(), r.name]));
  try {
    // The teachers' addresses are their own (often private): they go as blind copies, the mailbox itself in „An".
    await sendGraphMail(from, {
      to: from,
      bcc: emails,
      subject,
      html,
      replyTo: actor.email ? [{ emailAddress: { address: actor.email, name: actor.name } }] : undefined,
      attachments: draft.tests.map((x) => ({
        name: `QR-Code ${x.title}.png`,
        contentType: 'image/png',
        contentId: `qr-${x.key}`,
        contentBytes: x.qrSrc.replace(/^data:image\/png;base64,/, ''),
      })),
    });
  } catch (error) {
    console.error('[entry-test-mail] not sent', error);
    return refuse('Die E-Mail ließ sich nicht senden. Bitte versuch es noch einmal.', 'The e-mail could not be sent. Please try again.');
  }
  await query(
    `INSERT INTO entry_test_mails (on_date, subject, intro, recipients, sitting_ids, sent_by) VALUES ($1::date, $2, $3, $4::jsonb, $5::uuid[], $6)`,
    [input.day, subject, intro, JSON.stringify(emails.map((email) => ({ email, name: names.get(email.toLowerCase()) ?? null }))), draft.tests.flatMap(sitting), actor.id]
  );
  await logActivity({ actor, entity: 'entry_test', entityId: null, action: 'entry_test_mail_sent', detail: { day: input.day, recipients: emails.length } });
  return { ok: true };
}
