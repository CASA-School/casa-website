import 'server-only';

import { describeBrowser, FEEDBACK_KIND_LABELS } from './feedback-shared';
import { feedbackFiles, getFeedback, markFeedbackMailed, type FeedbackDetail } from './feedback';
import { LOGO_CONTENT_ID, LOGO_HEIGHT, LOGO_WIDTH } from '@/lib/notifications/casa-logo';
import { graphSender, sendGraphMail, type GraphAttachment } from '@/lib/notifications/graph-mail.server';

/**
 * The mail every new feedback sends to admin@ (Rahman, 2026-10-31: „an email notification would be
 * appreciated. email to admin@"), in both delivery modes: it is the team's own mail, never a learner's.
 * From the forms' mailbox (`FORM_MAIL_FROM`) through Microsoft Graph, replies to the colleague who sent
 * it, the screenshots inside it as long as the mail stays small enough for Graph (one request, 4 MB),
 * the rest named and a click away in the workspace. Without Graph mail (a laptop) nothing is sent.
 */

export const FEEDBACK_MAIL_TO = 'admin@casa-bremen.de';

/** Base64 grows by a third; Graph's sendMail takes about 4 MB in all, the logo and the text included. */
const INLINE_BUDGET = 2_900_000;

const escape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const multiline = (value: string) => escape(value).replace(/\r?\n/g, '<br>');

const SANS = "font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;";
const SERIF = "font-family:Georgia,'Times New Roman',Times,serif;";
const INK = '#0f172a';
const MUTED = '#64748b';
const RULE = '#e2e8f0';
const CANVAS = '#f4f6f9';
const LINK = '#006f9f';
const STRIPE = [['#e30613', '34%'], ['#009fe3', '33%'], ['#ffd500', '33%']] as const;

/** The workspace on its own host, as the form mails link it. */
export const workspaceOrigin = () => (process.env.CMS_EDITOR_ORIGIN?.trim() || 'https://admin.casa-bremen.de').replace(/\/$/, '');

/** `/admin/registrations/…` → `https://admin.casa-bremen.de/registrations/…`: the admin host serves the tree at its root. */
const onAdminHost = (path: string) => `${workspaceOrigin()}${path.replace(/^\/admin(?=\/|$)/, '') || '/'}`;

const when = (at: Date) =>
  at.toLocaleString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export type FeedbackMailPicture = { contentType: string; bytes: Buffer };

/** The mail itself: what was said, where, the pictures it can carry, and a way into the workspace. Pure, for the test. */
export function buildFeedbackMail(feedback: FeedbackDetail, pictures: readonly FeedbackMailPicture[]) {
  const kind = FEEDBACK_KIND_LABELS[feedback.kind].de;
  const where = feedback.pageTitle || feedback.pagePath || 'Workspace';
  const subject = `Feedback #${feedback.number} · ${kind} · ${where}`.slice(0, 200);
  const open = onAdminHost(`/admin/feedback/${feedback.id}`);

  const attachments: GraphAttachment[] = [];
  let budget = INLINE_BUDGET;
  for (const [index, picture] of pictures.entries()) {
    const base64 = picture.bytes.toString('base64');
    if (base64.length > budget) break;
    budget -= base64.length;
    const extension = picture.contentType === 'image/png' ? 'png' : picture.contentType === 'image/webp' ? 'webp' : 'jpg';
    attachments.push({ name: `feedback-${feedback.number}-${index + 1}.${extension}`, contentType: picture.contentType, contentId: `shot-${index + 1}`, contentBytes: base64 });
  }
  const left = pictures.length - attachments.length;

  const facts: [string, string, string?][] = [
    ['Von', feedback.senderName],
    ['Seite', where, feedback.pagePath ? onAdminHost(feedback.pagePath) : undefined],
    ['Browser', [describeBrowser(feedback.context.userAgent), feedback.context.viewport].filter(Boolean).join(' · ')],
    ['Fehler im Browser', (feedback.context.errors ?? []).map((e) => e.message).join('\n')],
  ];

  const factRows = facts
    .filter(([, value]) => value)
    .map(
      ([label, value, href]) =>
        `<tr><td valign="top" width="150" style="${SANS}width:150px;padding:6px 14px 6px 0;font-size:13px;line-height:20px;color:${MUTED};">${escape(label)}</td>` +
        `<td valign="top" style="${SANS}padding:6px 0;font-size:14px;line-height:21px;color:${INK};">${
          href ? `<a href="${escape(href)}" style="color:${LINK};">${escape(value)}</a>` : multiline(value)
        }</td></tr>`
    )
    .join('');

  const shots = attachments
    .map(
      (a) =>
        `<tr><td style="padding:0 36px 14px;"><a href="${escape(open)}"><img src="cid:${a.contentId}" alt="Screenshot" width="566" style="display:block;width:100%;max-width:566px;height:auto;border:1px solid ${RULE};border-radius:6px;"></a></td></tr>`
    )
    .join('');
  const more = left
    ? `<tr><td style="${SANS}padding:0 36px 14px;font-size:13px;line-height:20px;color:${MUTED};">${left === 1 ? 'Ein weiterer Screenshot' : `${left} weitere Screenshots`} im Workspace.</td></tr>`
    : '';

  const html =
    `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(subject)}</title></head>` +
    `<body style="margin:0;padding:0;background:${CANVAS};">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${CANVAS}"><tr><td align="center" style="padding:28px 12px;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;"><tr>` +
    STRIPE.map(([colour, width]) => `<td width="${width}" height="4" bgcolor="${colour}" style="height:4px;font-size:0;line-height:0;">&nbsp;</td>`).join('') +
    `</tr></table>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="max-width:640px;background:#ffffff;border:1px solid ${RULE};border-top:0;border-radius:0 0 10px 10px;">` +
    `<tr><td style="padding:26px 36px 0;"><img src="cid:${LOGO_CONTENT_ID}" width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}" alt="CASA" style="display:block;width:${LOGO_WIDTH}px;height:${LOGO_HEIGHT}px;"></td></tr>` +
    `<tr><td style="padding:22px 36px 6px;">` +
    `<div style="${SANS}font-size:13px;line-height:19px;font-weight:bold;color:${LINK};">Feedback #${feedback.number} · ${escape(kind)} · ${escape(when(feedback.submittedAt))}</div>` +
    `<h1 style="${SERIF}margin:8px 0 0;font-size:26px;line-height:34px;font-weight:normal;color:${INK};">${escape(feedback.senderName)} zu „${escape(where)}“</h1>` +
    `</td></tr>` +
    (feedback.message
      ? `<tr><td style="padding:14px 36px 18px;"><div style="${SANS}padding:14px 16px;font-size:15px;line-height:24px;color:${INK};background:#f8fafc;border-left:3px solid #009fe3;">${multiline(feedback.message)}</div></td></tr>`
      : '') +
    shots +
    more +
    `<tr><td style="padding:6px 36px 6px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#1f3e6c" style="border-radius:8px;">` +
    `<a href="${escape(open)}" style="${SANS}display:inline-block;padding:12px 22px;font-size:14px;line-height:20px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">Im Workspace öffnen</a>` +
    `</td></tr></table></td></tr>` +
    `<tr><td style="padding:18px 36px 28px;"><div style="border-top:1px solid ${RULE};padding-top:12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${factRows}</table></div></td></tr>` +
    `</table>` +
    `<div style="${SANS}max-width:640px;margin:0 auto;padding:14px 8px 0;font-size:12px;line-height:18px;color:${MUTED};text-align:center;">Gesendet mit „Feedback“ im CASA Workspace.${feedback.senderEmail ? ` Eine Antwort auf diese Mail geht an ${escape(feedback.senderName)}.` : ''}</div>` +
    `</td></tr></table></body></html>`;

  return { subject, html, attachments };
}

/** Sends the mail for one feedback; never throws — the feedback is stored, a failed mail is only a missing copy. */
export async function sendFeedbackMail(id: string): Promise<boolean> {
  const from = graphSender();
  if (!from) return false;
  try {
    const feedback = await getFeedback(id);
    if (!feedback) return false;
    const files = await feedbackFiles(id);
    const mail = buildFeedbackMail(
      feedback,
      files.map((f) => ({ contentType: f.content_type, bytes: f.content }))
    );
    await sendGraphMail(from, {
      to: FEEDBACK_MAIL_TO,
      subject: mail.subject,
      html: mail.html,
      replyTo: feedback.senderEmail ? [{ emailAddress: { address: feedback.senderEmail, name: feedback.senderName } }] : undefined,
      // admin@ is both the sender and the recipient: one copy, in the inbox.
      saveToSentItems: false,
      attachments: mail.attachments,
    });
    await markFeedbackMailed(id);
    return true;
  } catch (error) {
    console.error('feedback mail failed', error instanceof Error ? error.message : error);
    return false;
  }
}
