import { LOGO_HEIGHT, LOGO_WIDTH } from '@/lib/notifications/casa-logo';

/**
 * The look every mail the workspace writes shares (2026-10-23): CASA's frame as the form mails have it
 * (src/lib/notifications/form-mail.ts) — the logo's stripe along the top, a white card, the logo, a
 * heading, the office's text — and, at its foot, the sender's signature or a short closing. Built for mail
 * clients: tables and inline styles. Every text is escaped. Safe for the browser, so the preview and the
 * mail sent are the same HTML.
 */

export const SANS = "font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;";
export const INK = '#0f172a';
export const BODY = '#334155';
export const MUTED = '#64748b';
export const RULE = '#e2e8f0';
export const CANVAS = '#f4f6f9';
export const NAVY = '#1d2f4f';
export const TINT = '#f5f8fb';
const LOGO_STRIPE = [['#e30613', '34%'], ['#009fe3', '33%'], ['#ffd500', '33%']] as const;

export const escape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** The office's text: paragraphs at blank lines, line breaks kept. */
export function textHtml(text: string) {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((p) => `<p style="${SANS}margin:0 0 14px;font-size:15px;line-height:23px;color:${BODY};">${escape(p.trim()).replace(/\r?\n/g, '<br>')}</p>`)
    .join('');
}

/**
 * The whole mail: `rows` are the card's own rows (`<tr>…</tr>`) between the text and the foot. `signature`
 * is the sender's CASA signature, with its own greeting; without one, `closing` ends the mail.
 */
export function mailShell(input: {
  subject: string;
  heading: string;
  text: string;
  rows?: string;
  logoSrc: string;
  signature?: string | null;
  closing?: string | null;
  footer: string;
}): string {
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
    `<tr><td class="px" style="padding:0 40px 10px;">${textHtml(input.text)}</td></tr>` +
    (input.rows ?? '') +
    (input.signature
      ? `<tr><td class="px" style="padding:6px 40px 32px;"><div style="border-top:1px solid ${RULE};padding-top:24px;">${input.signature}</div></td></tr>`
      : input.closing?.trim()
        ? `<tr><td class="px" style="padding:6px 40px 26px;"><div style="border-top:1px solid ${RULE};padding-top:20px;">${textHtml(input.closing)}</div></td></tr>`
        : '') +
    `</table>` +
    `<div style="${SANS}max-width:640px;margin:0 auto;padding:18px 8px 0;font-size:12px;line-height:19px;color:${MUTED};text-align:center;">${escape(input.footer)}</div>` +
    `</td></tr></table></body></html>`
  );
}

/**
 * A colleague's own mail — a reply, a line to a learner, a class or a host — as their mail program writes
 * one: the text and, below it, their CASA signature (which carries the logo) or a short closing. No card,
 * no heading: it is a person writing, not CASA announcing something.
 */
export function plainMailHtml(input: { subject: string; text: string; signature?: string | null; closing?: string | null }): string {
  return (
    `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"><title>${escape(input.subject)}</title>` +
    `<style>body{margin:0!important;padding:0!important;}table{border-collapse:collapse;}img{border:0;outline:none;text-decoration:none;}</style></head>` +
    `<body style="margin:0;padding:0;background:#ffffff;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="background:#ffffff;"><tr><td style="padding:24px 20px;">` +
    `<div style="max-width:640px;">${textHtml(input.text)}` +
    (input.signature
      ? `<div style="padding-top:10px;">${input.signature}</div>`
      : input.closing?.trim()
        ? `<div style="padding-top:6px;">${textHtml(input.closing)}</div>`
        : '') +
    `</div></td></tr></table></body></html>`
  );
}
