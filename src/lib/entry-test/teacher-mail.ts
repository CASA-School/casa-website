import { guideSteps } from './guide';
import type { EntryTestId } from './types';
import { BODY, INK, MUTED, NAVY, RULE, SANS, TINT, escape, mailShell } from '@/lib/mail/shell';

/**
 * The mail that gives a start day's teachers their test codes (Rahman, 2026-10-22): one mail for every
 * test of the day — the office's text, then three parts kept apart so nobody mixes them up: the
 * teachers' codes, the QR codes for the board, the guide. The
 * same HTML is the preview on the mail page (pictures as data:) and the mail sent (pictures as cid:), so
 * what the office checks is what goes out. Built for mail clients as the form mails are
 * (src/lib/notifications/form-mail.ts): tables, inline styles, the logo's stripe along the top. Every
 * text is escaped. Safe for the browser.
 */

export type TeacherMailClass = { label: string; group: string | null; room: string | null; teacher: string | null; startsAt: string | null };

export type TeacherMailTest = {
  key: string;
  test: EntryTestId;
  session: 'morning' | 'afternoon';
  title: string;
  course: string;
  checks: string;
  minutes: number;
  /** None until the test is opened: sending opens it first, so the mail sent always has one. */
  code: string | null;
  classes: TeacherMailClass[];
  /** The QR code's picture: `cid:…` in the mail, `data:…` in the preview. */
  qrSrc: string;
};

const SESSION = { morning: 'Vormittag', afternoon: 'Nachmittag' } as const;

/** A section's heading and its one line, with a rule above: the code, the QR codes and the guide stay apart. */
function sectionHead(number: number, title: string, line: string) {
  return (
    `<tr><td class="px" style="padding:10px 40px 12px;"><div style="border-top:1px solid ${RULE};padding-top:22px;">` +
    `<div style="${SANS}font-size:13px;line-height:19px;font-weight:bold;color:${MUTED};">${number} von 3</div>` +
    `<div style="${SANS}padding-top:2px;font-size:18px;line-height:25px;font-weight:bold;color:${INK};">${escape(title)}</div>` +
    `<div style="${SANS}padding-top:4px;font-size:14px;line-height:21px;color:${BODY};">${escape(line)}</div>` +
    `</div></td></tr>`
  );
}

/** The teachers' codes: per test its classes and the code, nothing a learner would scan. */
function codesHtml(tests: TeacherMailTest[]) {
  const cards = tests
    .map((test) => {
      const classes = test.classes
        .map((c) => {
          const rest = [c.group, c.room, c.teacher, c.startsAt].filter(Boolean).join(' · ');
          return `<div style="${SANS}font-size:14px;line-height:21px;color:${BODY};"><b style="color:${INK};">${escape(c.label)}</b>${rest ? ` · ${escape(rest)}` : ''}</div>`;
        })
        .join('');
      return (
        `<tr><td class="px" style="padding:0 40px 12px;">` +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${TINT}" style="background:${TINT};border:1px solid ${RULE};border-radius:12px;"><tr>` +
        `<td valign="top" style="padding:16px 20px;">` +
        `<div style="${SANS}font-size:13px;line-height:19px;font-weight:bold;color:${MUTED};">${SESSION[test.session]} · ${test.minutes} Minuten</div>` +
        `<div style="${SANS}padding:2px 0 6px;font-size:16px;line-height:22px;font-weight:bold;color:${INK};">${escape(test.title)}</div>` +
        classes +
        `</td><td valign="middle" align="right" style="padding:16px 20px 16px 0;white-space:nowrap;">` +
        `<div style="${SANS}font-size:12px;line-height:17px;color:${MUTED};">Code</div>` +
        `<div style="${SANS}font-size:28px;line-height:32px;font-weight:bold;letter-spacing:5px;color:${test.code ? INK : MUTED};">${test.code ? escape(test.code) : '····'}</div>` +
        `</td></tr></table></td></tr>`
      );
    })
    .join('');
  return sectionHead(1, 'Code für die Lehrkraft', 'Nur für euch: Damit geht ein pausierter Test weiter. Bitte nicht an die Teilnehmenden weitergeben.') + cards;
}

/** The QR codes for the board: per test the picture and its name, three to a row. */
function qrHtml(tests: TeacherMailTest[]) {
  const rows: TeacherMailTest[][] = [];
  for (let i = 0; i < tests.length; i += 3) rows.push(tests.slice(i, i + 3));
  const table = rows
    .map(
      (row) =>
        `<tr>` +
        row
          .map(
            (test) =>
              `<td valign="top" align="center" width="33%" style="width:33%;padding:0 6px 14px;">` +
              `<img src="${escape(test.qrSrc)}" width="140" height="140" alt="QR-Code ${escape(test.title)}" style="display:block;width:140px;height:140px;margin:0 auto;border:1px solid ${RULE};border-radius:8px;">` +
              `<div style="${SANS}padding-top:8px;font-size:14px;line-height:20px;font-weight:bold;color:${INK};">${escape(test.title)}</div>` +
              `<div style="${SANS}font-size:13px;line-height:19px;color:${MUTED};">Kurs ${escape(test.course)} · ${SESSION[test.session]}</div>` +
              `</td>`
          )
          .join('') +
        `</tr>`
    )
    .join('');
  return (
    sectionHead(2, 'QR-Code für die Teilnehmenden', 'An die Tafel projizieren oder ausgedruckt aufhängen. Die Teilnehmenden scannen ihn mit dem Handy.') +
    `<tr><td class="px" style="padding:4px 34px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${table}</table></td></tr>`
  );
}

function guideHtml(time: string) {
  const steps = guideSteps(time)
    .map(
      (step, i) =>
        `<tr><td valign="top" width="34" style="width:34px;padding:0 0 14px;">` +
        `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" valign="middle" width="24" height="24" bgcolor="${NAVY}" style="${SANS}width:24px;height:24px;border-radius:12px;background:${NAVY};font-size:12px;font-weight:bold;color:#ffffff;">${i + 1}</td></tr></table></td>` +
        `<td valign="top" style="padding:0 0 14px;">` +
        `<div style="${SANS}font-size:15px;line-height:24px;font-weight:bold;color:${INK};">${escape(step.title)}</div>` +
        step.points.map((point) => `<div style="${SANS}padding:2px 0 0 14px;text-indent:-14px;font-size:14px;line-height:21px;color:${BODY};">&bull;&nbsp;&nbsp;${escape(point)}</div>`).join('') +
        `</td></tr>`
    )
    .join('');
  return (
    sectionHead(3, 'Leitfaden für Lehrkräfte', 'So läuft der Test im Unterricht.') +
    `<tr><td class="px" style="padding:4px 40px 18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${steps}</table></td></tr>`
  );
}

/**
 * `signature`: the sender's CASA signature (src/lib/admin/mail-signature.ts), at the foot of the mail, with
 * its own greeting; without one, `closing` („Viele Grüße\nRahman") ends the mail instead.
 */
export function teacherMailHtml(input: {
  subject: string;
  heading: string;
  intro: string;
  tests: TeacherMailTest[];
  logoSrc: string;
  signature?: string | null;
  closing?: string | null;
}): string {
  const time = input.tests.length === 1 ? `${input.tests[0].minutes} Minuten` : input.tests.map((t) => `${t.course} ${t.minutes} Min.`).join(' · ');
  return mailShell({
    subject: input.subject,
    heading: input.heading,
    text: input.intro,
    rows: codesHtml(input.tests) + qrHtml(input.tests) + guideHtml(time),
    logoSrc: input.logoSrc,
    signature: input.signature,
    closing: input.closing,
    footer: 'CASA Internationale Sprachschule Bremen · Einstufungstest Tag 1',
  });
}
