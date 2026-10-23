import { INK, MUTED, RULE, SANS, TINT, escape, mailShell } from '@/lib/mail/shell';

import type { LetterLanguage } from './types';

/**
 * The mail a letter goes out with (Rahman, 2026-10-23: the letter as a PDF, the mail short): the letter's
 * title as the heading, the letter's own salutation, the office's few lines, the PDF named as an
 * attachment, and the sender's signature. The same HTML is the preview and the mail. Safe for the browser.
 */

export function coverText(language: LetterLanguage, kind: string, title: string): string {
  if (language === 'en') return kind === 'offer' ? 'Please find our offer attached as a PDF.' : `Please find our letter “${title}” attached as a PDF.`;
  return kind === 'offer' ? 'im Anhang findest du unser Angebot als PDF.' : `im Anhang findest du unser Schreiben „${title}“ als PDF.`;
}

export const coverClosing = (language: LetterLanguage, firstName: string) => `${language === 'en' ? 'Kind regards' : 'Viele Grüße'}\n${firstName}`;

export function letterMailHtml(input: {
  subject: string;
  heading: string;
  salutation: string;
  text: string;
  files: readonly string[];
  language: LetterLanguage;
  logoSrc: string;
  signature?: string | null;
  closing?: string | null;
}): string {
  const files = input.files.length
    ? `<tr><td class="px" style="padding:4px 40px 20px;">` +
      input.files
        .map(
          (name) =>
            `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 8px;"><tr>` +
            `<td bgcolor="${TINT}" style="padding:10px 14px;background:${TINT};border:1px solid ${RULE};border-radius:10px;">` +
            `<span style="${SANS}display:inline-block;padding:2px 6px;margin-right:10px;font-size:11px;line-height:15px;font-weight:bold;color:#ffffff;background:#e30613;border-radius:4px;">PDF</span>` +
            `<span style="${SANS}font-size:14px;line-height:20px;font-weight:bold;color:${INK};">${escape(name)}</span>` +
            `<span style="${SANS}font-size:13px;line-height:20px;color:${MUTED};">&nbsp;&nbsp;${input.language === 'en' ? 'attached' : 'im Anhang'}</span>` +
            `</td></tr></table>`
        )
        .join('') +
      `</td></tr>`
    : '';
  return mailShell({
    subject: input.subject,
    heading: input.heading,
    text: [input.salutation, input.text].filter((part) => part.trim()).join('\n\n'),
    rows: files,
    logoSrc: input.logoSrc,
    signature: input.signature,
    closing: input.closing,
    footer: 'CASA – Internationale Sprachschule gGmbH · Am Dobben 14–16 · 28203 Bremen',
  });
}
