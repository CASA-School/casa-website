'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import type { WorkspaceModule } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { getI18n } from '@/lib/admin/i18n.server';
import { pick } from '@/lib/admin/i18n';
import { sendWorkspaceMail } from '@/lib/admin/mail/draft';
import { MAIL_MODULES } from '@/lib/admin/mail/href';

/**
 * A mail about a record, sent from the workspace's mail screen (0086). The right asked for first is the
 * one the page was opened with; sending checks again that it is one a mail of this kind is written with.
 */

const MODULES = [...new Set(Object.values(MAIL_MODULES).flat())];

const moduleOf = (formData: FormData): WorkspaceModule => {
  const value = String(formData.get('module') ?? '');
  return MODULES.find((m) => m === value) ?? 'people';
};

export async function sendWorkspaceMailAction(formData: FormData): Promise<void> {
  const actor = await requireModule(moduleOf(formData), 'edit');
  const to = String(formData.get('to') ?? '');
  const back = String(formData.get('back') ?? '');
  const page = `/admin/mail?to=${encodeURIComponent(to)}${back ? `&back=${encodeURIComponent(back)}` : ''}`;
  const { lang } = await getI18n();
  if (formData.get('confirmed') !== '1') redirect(`${page}&error=${encodeURIComponent(pick(lang, { de: 'Bitte bestätige den Versand.', en: 'Please confirm sending.' }))}`);
  const result = await sendWorkspaceMail(
    {
      to,
      module: moduleOf(formData),
      emails: formData.getAll('email').map(String),
      subject: String(formData.get('subject.main') ?? ''),
      text: String(formData.get('intro.main') ?? ''),
      signature: formData.get('signature') === '1',
    },
    actor
  );
  if (!result.ok) redirect(`${page}&error=${encodeURIComponent(pick(lang, result.reason))}`);
  revalidatePath('/admin/mail');
  redirect(`${page}&sent=${result.sent}`);
}
