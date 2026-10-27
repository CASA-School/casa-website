import 'server-only';

import { z } from 'zod';

import { canAccess, type WorkspaceModule } from '../access';
import { logActivity } from '../activity';
import type { StaffUser } from '../auth';
import { classContacts } from '../day-plan';
import { query, queryFirst } from '../db';
import type { Bilingual } from '../i18n';
import { coverClosing } from '../letters/cover-mail';
import { signatureFor } from '../mail-signature';
import { MAIL_MODULES, isMailAbout, type MailAbout } from './href';
import { plainMailHtml } from '@/lib/mail/shell';
import { graphSender, sendGraphMail } from '@/lib/notifications/graph-mail.server';

/**
 * A mail about a record, on the workspace's mail screen (Rahman, 2026-10-23: every mail through it): who
 * may get it, in which language, the greeting, the subject; and sending it as the colleague checked it.
 * Everything is read again from the record when it is sent — the page only says which record. Each mail
 * sent directly is kept in `workspace_mails` (0086) and, where the record has a timeline, noted there.
 */

type Language = 'de' | 'en';
type Result = { ok: true; sent: number } | { ok: false; reason: Bilingual };
const refuse = (de: string, en: string): Result => ({ ok: false, reason: { de, en } });

export type MailRecipient = { email: string; name: string; group: Bilingual; chosen: boolean };

export type MailDraft = {
  about: MailAbout;
  id: string;
  /** The right it is sent with; `canSend` when the colleague has it at `edit`. */
  module: WorkspaceModule;
  canSend: boolean;
  title: string;
  detail: string | null;
  href: string;
  recipients: MailRecipient[];
  missing: string[];
  /** Several people who do not know each other's addresses (a class): Bcc. */
  bcc: boolean;
  language: Language;
  subject: string;
  text: string;
  signature: { owner: 'own' | 'office'; html: string } | null;
  closing: string;
  replyTo: string;
  history: { id: string; title: string; detail: string }[];
};

type Record_ = {
  title: string;
  detail: string | null;
  href: string;
  recipients: MailRecipient[];
  missing: string[];
  bcc: boolean;
  language: Language;
  greet: string | null;
  greetAll?: boolean;
  subject: string;
  body?: string;
  /** The timeline the mail is noted on, and the record there (a person merged into another: the one kept). */
  entity: string | null;
  entityId?: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SENT_AT = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
const Email = z.email();

const g = (de: string, en: string): Bilingual => ({ de, en });
const lang = (value: string | null | undefined): Language => (value === 'en' ? 'en' : 'de');
const fullName = (...parts: (string | null | undefined)[]) => parts.filter((p) => p?.trim()).join(' ').trim();
const first = (name: string | null | undefined) => name?.trim().split(/\s+/)[0] ?? null;

/** Addresses once each, the first spelling kept. */
function unique(list: MailRecipient[]): MailRecipient[] {
  const seen = new Set<string>();
  return list.filter((r) => {
    const key = r.email.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function personEmails(personId: string) {
  return query<{ address: string; is_primary: boolean }>(`SELECT address, is_primary FROM emails WHERE person_id = $1 ORDER BY is_primary DESC, created_at`, [personId]);
}

/** One reader of a mail: a person with one or more addresses, the main one ticked. */
function oneReader(name: string, addresses: { address: string; is_primary: boolean }[], group: Bilingual): MailRecipient[] {
  return unique(addresses.map((a, i) => ({ email: a.address, name, group, chosen: i === 0 })));
}

async function inbox(table: 'registrations' | 'enquiries' | 'course_registrations' | 'exam_registrations' | 'career_applications', id: string) {
  if (table === 'registrations') {
    // The Anmeldung (0096): who sent it, from its first line, in the language it was sent in.
    return queryFirst<{ first_name: string | null; last_name: string | null; email: string; locale: string | null; label: string | null }>(
      `SELECT l.first_name, l.last_name, l.email, g.locale, l.label
         FROM registrations g
         CROSS JOIN LATERAL (
           SELECT first_name, last_name, email, course_type_label AS label, 0 AS rank FROM course_registrations WHERE registration_id = g.id
           UNION ALL
           SELECT first_name, last_name, email, exam_type_label, 1 FROM exam_registrations WHERE registration_id = g.id
           ORDER BY rank LIMIT 1
         ) l
        WHERE g.id = $1`,
      [id]
    );
  }
  const label = { enquiries: 'topic', course_registrations: 'course_type_label', exam_registrations: 'exam_type_label', career_applications: 'position_title' }[table];
  return queryFirst<{ first_name: string | null; last_name: string | null; email: string; locale: string | null; label: string | null }>(
    `SELECT first_name, last_name, email, locale, ${label} AS label FROM ${table} WHERE id = $1${table === 'enquiries' ? ' AND deleted_at IS NULL' : ''}`,
    [id]
  );
}

async function resolve(about: MailAbout, id: string): Promise<Record_ | null> {
  switch (about) {
    case 'person': {
      const p = await queryFirst<{ id: string; first_name: string | null; last_name: string | null }>(
        `SELECT p.id, p.first_name, p.last_name FROM people p WHERE p.id = (SELECT coalesce(merged_into, id) FROM people WHERE id = $1)`,
        [id]
      );
      if (!p) return null;
      const [emails, last] = await Promise.all([
        personEmails(p.id),
        queryFirst<{ language: string }>(`SELECT language FROM letters WHERE person_id = $1 ORDER BY sent_at DESC NULLS LAST LIMIT 1`, [p.id]),
      ]);
      const name = fullName(p.first_name, p.last_name);
      return {
        title: name,
        detail: null,
        href: `/admin/people/${p.id}`,
        recipients: oneReader(name, emails, g('Teilnehmende', 'Learner')),
        missing: emails.length ? [] : [name],
        bcc: false,
        language: lang(last?.language),
        greet: first(p.first_name),
        subject: '',
        entity: 'person',
        entityId: p.id,
      };
    }
    case 'staff': {
      const s = await queryFirst<{ person_id: string | null; short_name: string | null; first_name: string | null; last_name: string | null; account_email: string | null; account_name: string | null }>(
        `SELECT s.person_id, s.short_name, p.first_name, p.last_name, u.email AS account_email, u.name AS account_name
           FROM staff_members s LEFT JOIN people p ON p.id = s.person_id LEFT JOIN staff_users u ON u.id = s.staff_user_id WHERE s.id = $1`,
        [id]
      );
      if (!s) return null;
      const emails = s.person_id ? await personEmails(s.person_id) : [];
      const name = fullName(s.first_name, s.last_name) || s.account_name || s.short_name || '';
      const all = [...emails, ...(s.account_email ? [{ address: s.account_email, is_primary: false }] : [])];
      return {
        title: name,
        detail: null,
        href: `/admin/staff/${id}`,
        recipients: oneReader(name, all, g('Mitarbeitende', 'Staff')),
        missing: all.length ? [] : [name],
        bcc: false,
        language: 'de',
        greet: first(s.first_name ?? name),
        subject: '',
        entity: null,
      };
    }
    case 'organisation': {
      const o = await queryFirst<{ name: string; email: string | null; language: string | null }>(`SELECT name, email, language FROM organisations WHERE id = $1`, [id]);
      if (!o) return null;
      const contacts = await query<{ first_name: string | null; last_name: string | null; email: string }>(
        `SELECT first_name, last_name, email FROM organisation_contacts WHERE organisation_id = $1 AND coalesce(email, '') <> '' ORDER BY last_written_at DESC NULLS LAST, created_at`,
        [id]
      );
      const recipients = unique([
        ...(o.email ? [{ email: o.email, name: o.name, group: g('Organisation', 'Organisation'), chosen: true }] : []),
        ...contacts.map((c, i) => ({ email: c.email, name: fullName(c.first_name, c.last_name) || c.email, group: g('Kontakte', 'Contacts'), chosen: !o.email && i === 0 })),
      ]);
      return {
        title: o.name,
        detail: null,
        href: `/admin/organisations/${id}`,
        recipients,
        missing: recipients.length ? [] : [o.name],
        bcc: false,
        language: lang(o.language),
        greet: null,
        greetAll: true,
        subject: '',
        entity: null,
      };
    }
    case 'contact': {
      const c = await queryFirst<{ first_name: string | null; last_name: string | null; email: string | null; organisation_id: string; name: string; language: string | null }>(
        `SELECT c.first_name, c.last_name, c.email, o.id AS organisation_id, o.name, o.language
           FROM organisation_contacts c JOIN organisations o ON o.id = c.organisation_id WHERE c.id = $1`,
        [id]
      );
      if (!c) return null;
      const name = fullName(c.first_name, c.last_name) || c.email || c.name;
      return {
        title: name,
        detail: c.name,
        href: `/admin/organisations/${c.organisation_id}`,
        recipients: c.email ? [{ email: c.email, name, group: g('Kontakt', 'Contact'), chosen: true }] : [],
        missing: c.email ? [] : [name],
        bcc: false,
        language: lang(c.language),
        greet: first(c.first_name),
        subject: '',
        entity: null,
      };
    }
    case 'accommodation': {
      const a = await queryFirst<{ name: string; contact_name: string | null; email: string | null }>(`SELECT name, contact_name, email FROM accommodations WHERE id = $1`, [id]);
      if (!a) return null;
      const name = a.contact_name?.trim() || a.name;
      return {
        title: a.name,
        detail: a.contact_name && a.contact_name !== a.name ? a.contact_name : null,
        href: `/admin/accommodation/${id}`,
        recipients: a.email ? [{ email: a.email, name, group: g('Unterkunft', 'Accommodation'), chosen: true }] : [],
        missing: a.email ? [] : [name],
        bcc: false,
        language: 'de',
        greet: a.contact_name ? first(a.contact_name) : null,
        subject: '',
        entity: 'accommodation',
      };
    }
    case 'enquiry':
    case 'registration':
    case 'course_registration':
    case 'exam_registration':
    case 'application': {
      const table = ({ enquiry: 'enquiries', registration: 'registrations', course_registration: 'course_registrations', exam_registration: 'exam_registrations', application: 'career_applications' } as const)[about];
      const r = await inbox(table, id);
      if (!r) return null;
      const name = fullName(r.first_name, r.last_name) || r.email;
      const language = lang(r.locale);
      const href = { enquiry: `/admin/enquiries/${id}`, registration: `/admin/registrations/${id}`, course_registration: `/admin/registrations/course/${id}`, exam_registration: `/admin/registrations/exam/${id}`, application: `/admin/applications/${id}` }[about];
      return {
        title: name,
        detail: r.label,
        href,
        recipients: [{ email: r.email, name, group: g('Absender', 'Sender'), chosen: true }],
        missing: [],
        bcc: false,
        language,
        greet: first(r.first_name),
        subject: about === 'enquiry' && r.label ? `Re: ${r.label}` : '',
        entity: { enquiry: 'enquiry', registration: 'registration', course_registration: 'course_registration', exam_registration: 'exam_registration', application: 'career_application' }[about],
      };
    }
    case 'class':
    case 'teacher_list': {
      const list = await classContacts(id);
      if (!list) return null;
      const day = new Date(`${list.date}T12:00:00Z`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
      const title = `${list.label} · ${list.typeName}`;
      const detail = [day, list.hours, list.roomName].filter(Boolean).join(' · ');
      if (about === 'class') {
        return {
          title,
          detail,
          href: `/admin/day/courses?date=${list.date}`,
          recipients: unique(list.learners.filter((l) => l.email).map((l) => ({ email: l.email!, name: l.name, group: g('Teilnehmende', 'Learners'), chosen: true }))),
          missing: list.learners.filter((l) => !l.email).map((l) => l.name),
          bcc: true,
          language: 'de',
          greet: null,
          greetAll: true,
          subject: `${list.label} · ${day}`,
          entity: null,
        };
      }
      const teacher = list.teacherName ?? 'Lehrkraft';
      return {
        title,
        detail,
        href: `/admin/day/contacts?lesson=${id}`,
        recipients: list.teacherEmail ? [{ email: list.teacherEmail, name: teacher, group: g('Lehrkraft', 'Teacher'), chosen: true }] : [],
        missing: list.teacherEmail ? [] : [teacher],
        bcc: false,
        language: 'de',
        greet: first(list.teacherName),
        subject: `Teilnehmerliste ${list.label}${list.number ? ` #${list.number}` : ''}`,
        body: [
          `hier die Teilnehmenden von ${list.label}${list.number ? ` (#${list.number})` : ''} mit ihren E-Mail-Adressen:`,
          '',
          ...list.learners.map((l, i) => `${i + 1}. ${l.name}${l.email ? ` – ${l.email}` : ''}`),
        ].join('\n'),
        entity: null,
      };
    }
    case 'exam_sitting':
    case 'exam_examiners': {
      // An exam sitting (2026-10-27): to everyone booked into it (Bcc), or to whoever examines it.
      const s = await queryFirst<{ name: string; day: string; hours: string }>(
        `SELECT e.name, to_char(s.starts_at AT TIME ZONE 'Europe/Berlin', 'DD.MM.YYYY') AS day,
                to_char(s.starts_at AT TIME ZONE 'Europe/Berlin', 'HH24:MI') || '–' || to_char(s.ends_at AT TIME ZONE 'Europe/Berlin', 'HH24:MI') AS hours
           FROM exam_sessions s JOIN exam_types e ON e.id = s.exam_type_id WHERE s.id = $1`,
        [id]
      );
      if (!s) return null;
      const title = `${s.name} · ${s.day}`;
      const href = `/admin/catalogue/exams/${id}`;
      if (about === 'exam_sitting') {
        const people = await query<{ name: string; email: string | null }>(
          `SELECT concat_ws(' ', p.first_name, p.last_name) AS name,
                  (SELECT e.address FROM emails e WHERE e.person_id = p.id ORDER BY e.is_primary DESC, e.created_at LIMIT 1) AS email
             FROM bookings b JOIN people p ON p.id = canonical_person_id(b.person_id)
            WHERE b.exam_session_id = $1 AND b.deleted_at IS NULL AND b.status <> 'cancelled'
            ORDER BY p.last_name, p.first_name`,
          [id]
        );
        return {
          title,
          detail: s.hours,
          href,
          recipients: unique(people.filter((p) => p.email).map((p) => ({ email: p.email!, name: p.name, group: g('Teilnehmende', 'Candidates'), chosen: true }))),
          missing: people.filter((p) => !p.email).map((p) => p.name),
          bcc: true,
          language: 'de',
          greet: null,
          greetAll: true,
          subject: title,
          entity: 'exam_session',
        };
      }
      const examiners = await query<{ name: string; first_name: string | null; email: string | null; account_email: string | null }>(
        `SELECT concat_ws(' ', p.first_name, p.last_name) AS name, p.first_name,
                (SELECT e.address FROM emails e WHERE e.person_id = p.id ORDER BY e.is_primary DESC, e.created_at LIMIT 1) AS email,
                u.email AS account_email
           FROM exam_session_examiners x JOIN staff_members m ON m.id = x.staff_member_id JOIN people p ON p.id = m.person_id
           LEFT JOIN staff_users u ON u.id = m.staff_user_id
          WHERE x.exam_session_id = $1
          ORDER BY p.last_name, p.first_name`,
        [id]
      );
      const counts = await queryFirst<{ full: number; written: number; oral: number }>(
        `SELECT count(*) FILTER (WHERE exam_parts = 'full')::int AS full, count(*) FILTER (WHERE exam_parts = 'written')::int AS written,
                count(*) FILTER (WHERE exam_parts = 'oral')::int AS oral
           FROM bookings WHERE exam_session_id = $1 AND deleted_at IS NULL AND status <> 'cancelled'`,
        [id]
      );
      const total = (counts?.full ?? 0) + (counts?.written ?? 0) + (counts?.oral ?? 0);
      const parts = [
        counts?.written ? `${counts.written} nur schriftlich` : null,
        counts?.oral ? `${counts.oral} nur mündlich` : null,
      ].filter(Boolean);
      return {
        title,
        detail: s.hours,
        href,
        recipients: unique(
          examiners
            .map((x) => ({ email: x.email ?? x.account_email ?? '', name: x.name, group: g('Prüfende', 'Examiners'), chosen: true }))
            .filter((r) => r.email)
        ),
        missing: examiners.filter((x) => !x.email && !x.account_email).map((x) => x.name),
        bcc: false,
        language: 'de',
        greet: examiners.length === 1 ? first(examiners[0].first_name) : null,
        greetAll: examiners.length > 1,
        subject: `${s.name} am ${s.day}`,
        body: `zur Prüfung ${s.name} am ${s.day}, ${s.hours} Uhr: ${total === 1 ? '1 Teilnehmende/r' : `${total} Teilnehmende`}${parts.length ? ` (${parts.join(', ')})` : ''}.`,
        entity: 'exam_session',
      };
    }
  }
}

function parse(to: string): { about: MailAbout; id: string } | null {
  const [about, id] = to.split(':');
  return about && id && isMailAbout(about) && UUID.test(id) ? { about, id } : null;
}

/** The first right the colleague has for a mail of this kind, at `edit` if any. */
function rightFor(about: MailAbout, actor: StaffUser): { module: WorkspaceModule; canSend: boolean } | null {
  const modules = MAIL_MODULES[about];
  const edit = modules.find((m) => canAccess(actor, m, 'edit'));
  if (edit) return { module: edit, canSend: true };
  const view = modules.find((m) => canAccess(actor, m, 'view'));
  return view ? { module: view, canSend: false } : null;
}

const greeting = (language: Language, name: string | null, all?: boolean) =>
  language === 'en' ? `Hello${name ? ` ${name}` : ''},` : `Hallo${name ? ` ${name}` : all ? ' zusammen' : ''},`;

export async function mailDraft(to: string, options: { subject?: string; address?: string }, actor: StaffUser): Promise<MailDraft | null> {
  const target = parse(to);
  if (!target) return null;
  const right = rightFor(target.about, actor);
  if (!right) return null;
  const record = await resolve(target.about, target.id);
  if (!record) return null;
  const [signature, sent] = await Promise.all([
    signatureFor(actor.email),
    query<{ id: string; subject: string; recipients: string[]; sent_at: Date; by: string | null }>(
      `SELECT m.id, m.subject, m.recipients, m.sent_at, u.name AS by FROM workspace_mails m LEFT JOIN staff_users u ON u.id = m.sent_by
        WHERE m.about_kind = $1 AND m.about_id = $2 ORDER BY m.sent_at DESC LIMIT 30`,
      [target.about, target.id]
    ),
  ]);
  // „E-Mail" on one of several addresses: that one ticked.
  const address = options.address?.trim().toLowerCase();
  const recipients =
    address && record.recipients.some((r) => r.email.toLowerCase() === address)
      ? record.recipients.map((r) => ({ ...r, chosen: r.email.toLowerCase() === address }))
      : record.recipients;
  const subject = options.subject?.trim().slice(0, 200) || record.subject;
  return {
    about: target.about,
    id: target.id,
    module: right.module,
    canSend: right.canSend,
    title: record.title,
    detail: record.detail,
    href: record.href,
    recipients,
    missing: record.missing,
    bcc: record.bcc,
    language: record.language,
    subject,
    text: `${greeting(record.language, record.greet, record.greetAll)}\n\n${record.body ? `${record.body}\n` : ''}`,
    signature: signature ? { owner: signature.owner, html: signature.html } : null,
    closing: coverClosing(record.language, first(actor.name) ?? ''),
    replyTo: actor.email,
    history: sent.map((m) => ({ id: m.id, title: m.subject, detail: [SENT_AT.format(m.sent_at), m.by, m.recipients.join(', ')].filter(Boolean).join(' · ') })),
  };
}

/** Sends the mail as checked: to the addresses ticked and typed in, one mail (Bcc for a class). */
export async function sendWorkspaceMail(
  input: { to: string; module: WorkspaceModule; emails: readonly string[]; subject: string; text: string; signature: boolean },
  actor: StaffUser
): Promise<Result> {
  const target = parse(input.to);
  if (!target || !MAIL_MODULES[target.about].includes(input.module) || !canAccess(actor, input.module, 'edit')) {
    return refuse('Diese E-Mail lässt sich so nicht senden.', 'This e-mail cannot be sent like this.');
  }
  const record = await resolve(target.about, target.id);
  if (!record) return refuse('Diese E-Mail lässt sich so nicht senden.', 'This e-mail cannot be sent like this.');
  const from = graphSender();
  if (!from) return refuse('Der Mailversand ist hier nicht eingerichtet.', 'Sending mail is not set up here.');

  const emails = [...new Map(input.emails.map((e) => e.trim()).filter(Boolean).map((e) => [e.toLowerCase(), e])).values()];
  if (!emails.length) return refuse('Bitte wähle mindestens eine Empfängerin oder einen Empfänger.', 'Please choose at least one recipient.');
  const wrong = emails.find((e) => !Email.safeParse(e).success);
  if (wrong) return refuse(`„${wrong}" ist keine E-Mail-Adresse.`, `“${wrong}” is not an e-mail address.`);
  if (emails.length > (record.bcc ? 80 : 10)) return refuse('Das sind zu viele Empfänger.', 'Those are too many recipients.');
  const subject = input.subject.trim();
  const text = input.text.trim();
  if (!subject || !text || subject.length > 200 || text.length > 10_000) return refuse('Bitte gib Betreff und Text an.', 'Please give a subject and a text.');

  const signature = input.signature ? await signatureFor(actor.email) : null;
  if (input.signature && !signature) return refuse('Die Signatur ist gerade nicht erreichbar. Sende ohne Signatur oder versuch es gleich noch einmal.', 'The signature cannot be reached just now. Send without it or try again shortly.');

  const html = plainMailHtml({
    subject,
    text,
    signature: signature?.mailHtml ?? null,
    closing: signature ? null : coverClosing(record.language, first(actor.name) ?? ''),
  });
  try {
    await sendGraphMail(from, {
      // A class: everyone in Bcc, the workspace's own mailbox in „An", so no one sees the others.
      to: record.bcc && emails.length > 1 ? from : emails,
      bcc: record.bcc && emails.length > 1 ? emails : undefined,
      subject,
      html,
      logo: false,
      replyTo: actor.email ? [{ emailAddress: { address: actor.email, name: actor.name } }] : undefined,
      attachments: signature?.attachments,
    });
  } catch (error) {
    console.error('[workspace-mail] not sent', error);
    return refuse('Die E-Mail ließ sich nicht senden. Bitte versuch es noch einmal.', 'The e-mail could not be sent. Please try again.');
  }
  await query(
    `INSERT INTO workspace_mails (about_kind, about_id, recipients, bcc, subject, body, signature, sent_by) VALUES ($1, $2, $3::text[], $4, $5, $6, $7, $8)`,
    [target.about, target.id, emails, record.bcc && emails.length > 1, subject, text, Boolean(signature), actor.id]
  );
  if (record.entity) {
    await logActivity({ actor, entity: record.entity, entityId: record.entityId ?? target.id, action: 'mail_sent', detail: { subject, recipients: emails.length } });
  }
  return { ok: true, sent: emails.length };
}
