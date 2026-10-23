import 'server-only';

import type { GraphAttachment } from '@/lib/notifications/graph-mail.server';

/**
 * A colleague's e-mail signature for mail the workspace sends directly (Rahman, 2026-10-23: „the email
 * signatures are all set in Outlook, but offer the option to add the signature"). It is the same signature
 * Outlook adds: CASA's V5 signature, built once (casa-signaturen, `build.py`) and published for the Outlook
 * add-in „CASA Signatur" as `signatures.json` (sender address → signature HTML) and `images.json` (the logo
 * and the Instagram symbol). So a change there reaches the workspace's mail too. A colleague without a
 * signature of their own signs with the office's (info@).
 */

const SITE = 'https://casa-signaturen.vercel.app';
const FALLBACK = 'info@casa-bremen.de';

/** The pictures the signature names, and the inline names they travel under in a mail. */
const PICTURES: Record<string, string> = {
  [`${SITE}/casa-logo.png`]: 'sig-casa-logo.png',
  [`${SITE}/instagram-icon.png`]: 'sig-instagram.png',
};

export type MailSignature = {
  /** Whose signature it is: the colleague's own, or the office's. */
  owner: 'own' | 'office';
  /** For the preview: the pictures from the signature site. */
  html: string;
  /** For the mail: the pictures as inline attachments (`cid:`), so no client blocks them. */
  mailHtml: string;
  attachments: GraphAttachment[];
};

async function load<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${SITE}/addin/${path}`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(6000) });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

export async function signatureFor(email: string | null | undefined): Promise<MailSignature | null> {
  const [signatures, images] = await Promise.all([load<Record<string, string>>('signatures.json'), load<Record<string, string>>('images.json')]);
  if (!signatures) return null;
  const own = email ? signatures[email.trim().toLowerCase()] : undefined;
  const html = own ?? signatures[FALLBACK];
  if (!html) return null;
  let mailHtml = html;
  const attachments: GraphAttachment[] = [];
  for (const [url, cid] of Object.entries(PICTURES)) {
    const file = url.slice(url.lastIndexOf('/') + 1);
    const bytes = images?.[file];
    if (!bytes || !html.includes(url)) continue;
    mailHtml = mailHtml.split(url).join(`cid:${cid}`);
    attachments.push({ name: file, contentType: 'image/png', contentId: cid, contentBytes: bytes.replace(/^data:image\/png;base64,/, '') });
  }
  return { owner: own ? 'own' : 'office', html, mailHtml, attachments };
}
