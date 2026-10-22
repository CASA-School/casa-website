import { guideSteps } from './guide';
import type { EntryTestId } from './types';
import { LOGO_HEIGHT, LOGO_WIDTH } from '@/lib/notifications/casa-logo';

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

const SANS = "font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;";
const INK = '#0f172a';
const BODY = '#334155';
const MUTED = '#64748b';
const RULE = '#e2e8f0';
const CANVAS = '#f4f6f9';
const NAVY = '#1d2f4f';
const TINT = '#f5f8fb';
const LOGO_STRIPE = [['#e30613', '34%'], ['#009fe3', '33%'], ['#ffd500', '33%']] as const;

const escape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const SESSION = { morning: 'Vormittag', afternoon: 'Nachmittag' } as const;

/** The office's text: paragraphs at blank lines, line breaks kept. */
function textHtml(text: string) {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((p) => `<p style="${SANS}margin:0 0 14px;font-size:15px;line-height:23px;color:${BODY};">${escape(p.trim()).replace(/\r?\n/g, '<br>')}</p>`)
    .join('');
}

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

export function teacherMailHtml(input: { subject: string; heading: string; intro: string; tests: TeacherMailTest[]; logoSrc: string }): string {
  const time = input.tests.length === 1 ? `${input.tests[0].minutes} Minuten` : input.tests.map((t) => `${t.course} ${t.minutes} Min.`).join(' · ');
  return (
    `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"><title>${escape(input.subject)}</title>` +
    `<style>body{margin:0!important;padding:0!important;}table{border-collapse:collapse;}img{border:0;outline:none;text-decoration:none;}` +
    `@media only screen and (max-width:620px){.shell{padding:0!important;}.px{padding-left:20px!important;padding-right:20px!important;}}</style></head>` +
    `<body style="margin:0;padding:0;background:${CANVAS};">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${CANVAS}" style="background:${CANVAS};"><tr><td class="shell" align="center" style="padding:32px 16px;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;"><tr>` +
    LOGO_STRIPE.map(([colour, width]) => `<td width="${width}" height="4" bgcolor="${colour}" style="height:4px;background:${colour};font-size:0;line-height:0;">&nbsp;</td>`).join('') +
    `</tr></table>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="width:100%;max-width:640px;background:#ffffff;border:1px solid ${RULE};border-top:0;border-radius:0 0 10px 10px;">` +
    `<tr><td class="px" style="padding:30px 40px 0;"><img src="${escape(input.logoSrc)}" width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}" alt="CASA Internationale Sprachschule" style="display:block;width:${LOGO_WIDTH}px;height:${LOGO_HEIGHT}px;"></td></tr>` +
    `<tr><td class="px" style="${SANS}padding:26px 40px 14px;font-size:24px;line-height:31px;font-weight:bold;color:${INK};">${escape(input.heading)}</td></tr>` +
    `<tr><td class="px" style="padding:0 40px 10px;">${textHtml(input.intro)}</td></tr>` +
    codesHtml(input.tests) +
    qrHtml(input.tests) +
    guideHtml(time) +
    `</table>` +
    `<div style="${SANS}max-width:640px;margin:0 auto;padding:18px 8px 0;font-size:12px;line-height:19px;color:${MUTED};text-align:center;">CASA Internationale Sprachschule Bremen · Einstufungstest Tag 1</div>` +
    `</td></tr></table></body></html>`
  );
}
