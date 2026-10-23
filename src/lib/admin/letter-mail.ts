import 'server-only';

import { z } from 'zod';

import { canAccess, type WorkspaceModule } from './access';
import { logActivity } from './activity';
import type { StaffUser } from './auth';
import { query } from './db';
import type { Bilingual } from './i18n';
import { letterPdfs, pdfName } from './letter-pdf';
import { coverClosing, coverText, letterMailHtml } from './letters/cover-mail';
import { letterModule } from './letters/module';
import { getSentLetter } from './letters/repo';
import type { LetterKind, LetterLanguage } from './letters/types';
import { signatureFor } from './mail-signature';
import { LOGO_CONTENT_ID } from '@/lib/notifications/casa-logo';
import { graphSender, sendGraphMail, type GraphAttachment } from '@/lib/notifications/graph-mail.server';

/**
 * A letter — or a sitting's letters to all — sent by mail from the workspace (Rahman, 2026-10-23: every
 * letter, the letter as a PDF; docs/LETTERS.md §Sending). The mail screen (MailComposer) shows the draft;
 * this sends what the colleague checked: one mail with the letter for one letter, one mail each with their
 * own letter for several. From `FORM_MAIL_FROM` through Microsoft Graph, answers to the colleague, the
 * PDF made by the server's browser exactly as „Drucken / PDF" prints it. Each mail is kept in
 * `letter_mails` (0085) and the letter records `sent_via = 'email'`.
 */

type Result = { ok: true; sent: number } | { ok: false; reason: Bilingual };
const refuse = (de: string, en: string): Result => ({ ok: false, reason: { de, en } });

/** At most this many letters in one sending: each is printed by the browser on the server, one after another. */
export const MAX_LETTERS = 60;

export type LetterMailItem = {
  id: string;
  kind: LetterKind;
  subject: string;
  heading: string;
  language: LetterLanguage;
  salutation: string;
  recipientName: string;
  email: string | null;
  file: { name: string; href: string };
};

export type LetterMailDraft = {
  module: WorkspaceModule;
  letters: LetterMailItem[];
  variants: { key: LetterLanguage; label: string; subject: string; text: string }[];
  signature: { owner: 'own' | 'office'; html: string } | null;
  closings: Record<LetterLanguage, string>;
  replyTo: string;
  history: { id: string; title: string; detail: string }[];
};

const SENT_AT = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });

/** The letter's own salutation; a letter SchoolMan wrote may have none, then a plain one. */
const salutationOf = (own: string | null | undefined, language: LetterLanguage, name: string) =>
  own?.trim() || (language === 'en' ? `Dear ${name},` : `Hallo ${name},`);

async function loadLetters(ids: readonly string[], actor: StaffUser) {
  const found = (await Promise.all(ids.map((id) => getSentLetter(id)))).filter((l) => l !== null);
  if (!found.length || found.length !== ids.length) return null;
  const right = letterModule(found[0].kind);
  // One screen, one right: the letters sent together are seen with the same module, and may be sent by this colleague.
  if (found.some((l) => letterModule(l.kind) !== right) || !canAccess(actor, right, 'edit')) return null;
  return { found, right };
}

export async function letterMailDraft(ids: readonly string[], actor: StaffUser): Promise<LetterMailDraft | null> {
  if (!ids.length || ids.length > MAX_LETTERS) return null;
  const loaded = await loadLetters(ids, actor);
  if (!loaded) return null;
  const { found, right } = loaded;
  const [signature, sent] = await Promise.all([
    signatureFor(actor.email),
    query<{ id: string; subject: string; recipients: string[]; sent_at: Date; by: string | null }>(
      `SELECT m.id, m.subject, m.recipients, m.sent_at, u.name AS by FROM letter_mails m LEFT JOIN staff_users u ON u.id = m.sent_by
        WHERE m.letter_id = ANY($1::uuid[]) ORDER BY m.sent_at DESC LIMIT 50`,
      [ids]
    ),
  ]);
  const letters: LetterMailItem[] = found.map((l) => ({
    id: l.id,
    kind: l.kind,
    subject: l.subject,
    heading: l.letter.subject.title || l.subject,
    language: l.letter.language,
    salutation: salutationOf(l.letter.salutation, l.letter.language, l.recipientName),
    recipientName: l.recipientName,
    email: l.email,
    file: { name: pdfName(l.subject, l.recipientName), href: `/admin/letters/${l.id}/pdf` },
  }));
  const single = letters.length === 1;
  const languages = (['de', 'en'] as const).filter((lang) => letters.some((l) => l.language === lang));
  const variants = languages.map((lang) => {
    const first = found.find((l) => l.letter.language === lang)!;
    const title = first.letter.subject.title || first.subject;
    return {
      key: lang,
      label: lang === 'de' ? 'Deutsch' : 'English',
      // One letter: its own subject; several: the kind's, without one person's number.
      subject: single ? first.subject : [first.letter.subject.lead, first.letter.subject.title].filter(Boolean).join(' · ') || first.subject,
      text: coverText(lang, first.kind, title),
    };
  });
  const firstName = actor.name.trim().split(/\s+/)[0] ?? '';
  return {
    module: right,
    letters,
    variants,
    signature: signature ? { owner: signature.owner, html: signature.html } : null,
    closings: { de: coverClosing('de', firstName), en: coverClosing('en', firstName) },
    replyTo: actor.email,
    history: sent.map((m) => ({ id: m.id, title: m.subject, detail: [SENT_AT.format(m.sent_at), m.by, m.recipients.join(', ')].filter(Boolean).join(' · ') })),
  };
}

const Email = z.email();

/**
 * Sends the letters as checked. `emails`: one letter's addresses (its recipient's and any typed in);
 * `letters`: of several, the ones ticked — each to its own recipient. `texts`: subject and text by language.
 */
export async function sendLetterMails(
  input: { ids: readonly string[]; module: WorkspaceModule; emails: readonly string[]; letters: readonly string[]; texts: Partial<Record<LetterLanguage, { subject: string; text: string }>>; signature: boolean },
  actor: StaffUser
): Promise<Result> {
  if (!input.ids.length || input.ids.length > MAX_LETTERS) return refuse('Diese Briefe lassen sich so nicht senden.', 'These letters cannot be sent like this.');
  const loaded = await loadLetters(input.ids, actor);
  if (!loaded || loaded.right !== input.module) return refuse('Diese Briefe lassen sich so nicht senden.', 'These letters cannot be sent like this.');
  const from = graphSender();
  if (!from) return refuse('Der Mailversand ist hier nicht eingerichtet.', 'Sending mail is not set up here.');

  const single = loaded.found.length === 1;
  const mails = single
    ? [{ letter: loaded.found[0], to: [...new Map(input.emails.map((e) => e.trim()).filter(Boolean).map((e) => [e.toLowerCase(), e])).values()] }]
    : loaded.found.filter((l) => input.letters.includes(l.id) && l.email).map((l) => ({ letter: l, to: [l.email!.trim()] }));
  if (!mails.length || mails.some((m) => !m.to.length)) return refuse('Bitte wähle mindestens eine Empfängerin oder einen Empfänger.', 'Please choose at least one recipient.');
  const wrong = mails.flatMap((m) => m.to).find((e) => !Email.safeParse(e).success);
  if (wrong) return refuse(`„${wrong}" ist keine E-Mail-Adresse.`, `“${wrong}” is not an e-mail address.`);
  if (mails.some((m) => m.to.length > 10)) return refuse('Das sind zu viele Empfänger.', 'Those are too many recipients.');
  for (const m of mails) {
    const text = input.texts[m.letter.letter.language];
    if (!text?.subject.trim() || !text.text.trim() || text.subject.length > 200 || text.text.length > 4000) {
      return refuse('Bitte gib Betreff und Text an.', 'Please give a subject and a text.');
    }
  }

  const signature = input.signature ? await signatureFor(actor.email) : null;
  if (input.signature && !signature) return refuse('Die Signatur ist gerade nicht erreichbar. Sende ohne Signatur oder versuch es gleich noch einmal.', 'The signature cannot be reached just now. Send without it or try again shortly.');

  let pdfs: Map<string, Buffer>;
  try {
    pdfs = await letterPdfs(mails.map((m) => m.letter.id), actor);
  } catch (error) {
    console.error('[letter-mail] no PDF', error);
    return refuse('Der Brief ließ sich nicht als PDF erstellen. Bitte versuch es noch einmal.', 'The letter could not be made into a PDF. Please try again.');
  }

  const firstName = actor.name.trim().split(/\s+/)[0] ?? '';
  const failed: string[] = [];
  let sent = 0;
  for (const m of mails) {
    const l = m.letter;
    const text = input.texts[l.letter.language]!;
    const name = pdfName(l.subject, l.recipientName);
    const subject = single ? text.subject.trim() : `${text.subject.trim()}${text.subject.includes(l.recipientName) ? '' : ` · ${l.recipientName}`}`;
    const html = letterMailHtml({
      subject,
      heading: l.letter.subject.title || l.subject,
      salutation: salutationOf(l.letter.salutation, l.letter.language, l.recipientName),
      text: text.text.trim(),
      files: [name],
      language: l.letter.language,
      logoSrc: `cid:${LOGO_CONTENT_ID}`,
      signature: signature?.mailHtml ?? null,
      closing: signature ? null : coverClosing(l.letter.language, firstName),
    });
    const pdf = pdfs.get(l.id);
    if (!pdf) {
      failed.push(l.recipientName);
      continue;
    }
    try {
      await sendGraphMail(from, {
        to: m.to,
        subject,
        html,
        replyTo: actor.email ? [{ emailAddress: { address: actor.email, name: actor.name } }] : undefined,
        attachments: [
          ...(signature?.attachments ?? []),
          { name, contentType: 'application/pdf', contentBytes: pdf.toString('base64'), inline: false } satisfies GraphAttachment,
        ],
      });
    } catch (error) {
      console.error('[letter-mail] not sent', error);
      failed.push(l.recipientName);
      continue;
    }
    sent += 1;
    await query(
      `INSERT INTO letter_mails (letter_id, recipients, subject, body, signature, sent_by) VALUES ($1, $2::text[], $3, $4, $5, $6)`,
      [l.id, m.to, subject, text.text.trim(), Boolean(signature), actor.id]
    );
    await query(`UPDATE letters SET sent_via = 'email' WHERE id = $1`, [l.id]);
    await logActivity({ actor, entity: 'letter', entityId: l.id, action: 'letter_mailed', detail: { kind: l.kind, recipients: m.to.length } });
  }
  if (failed.length) {
    return refuse(
      `${sent ? `${sent} gesendet. ` : ''}Nicht gesendet: ${failed.join(', ')}. Bitte versuch es noch einmal.`,
      `${sent ? `${sent} sent. ` : ''}Not sent: ${failed.join(', ')}. Please try again.`
    );
  }
  return { ok: true, sent };
}
