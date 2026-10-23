'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import type { WorkspaceModule } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { getI18n } from '@/lib/admin/i18n.server';
import { pick } from '@/lib/admin/i18n';
import { sendLetterMails } from '@/lib/admin/letter-mail';

/**
 * Letters sent by mail from the workspace's mail screen (0085). The right asked for first is the one the
 * letters are seen with (bookings, offers, registrations); sending checks again that every letter is one.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LETTER_MODULES: readonly WorkspaceModule[] = ['bookings', 'offers', 'registrations'];

const moduleOf = (formData: FormData): WorkspaceModule => {
  const value = String(formData.get('module') ?? '');
  return LETTER_MODULES.find((m) => m === value) ?? 'bookings';
};

export async function sendLetterMailAction(formData: FormData): Promise<void> {
  const actor = await requireModule(moduleOf(formData), 'edit');
  const ids = String(formData.get('ids') ?? '')
    .split(',')
    .filter((id) => UUID.test(id));
  const back = `/admin/letters/mail?ids=${ids.join(',')}`;
  const { lang } = await getI18n();
  if (formData.get('confirmed') !== '1') redirect(`${back}&error=${encodeURIComponent(pick(lang, { de: 'Bitte bestätige den Versand.', en: 'Please confirm sending.' }))}`);
  const text = (language: 'de' | 'en') =>
    formData.has(`subject.${language}`) ? { subject: String(formData.get(`subject.${language}`) ?? ''), text: String(formData.get(`intro.${language}`) ?? '') } : undefined;
  const result = await sendLetterMails(
    {
      ids,
      module: moduleOf(formData),
      emails: formData.getAll('email').map(String),
      letters: formData.getAll('letter').map(String),
      texts: { de: text('de'), en: text('en') },
      signature: formData.get('signature') === '1',
    },
    actor
  );
  if (!result.ok) redirect(`${back}&error=${encodeURIComponent(pick(lang, result.reason))}`);
  revalidatePath('/admin/letters');
  redirect(`${back}&sent=${result.sent}`);
}
