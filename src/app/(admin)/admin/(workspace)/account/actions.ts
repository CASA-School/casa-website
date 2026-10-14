'use server';

import { redirect } from 'next/navigation';

import { requireModule } from '@/lib/admin/guard';
import { pick } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { describePasswordProblem } from '@/lib/admin/password';
import { changeOwnPassword } from '@/lib/admin/staff';

/**
 * A colleague's own account. Everyone has it: Overview is always on, so the
 * guard asks for that, and the action only ever touches the signed-in account.
 */

function back(message: string, kind: 'error' | 'ok' = 'error'): never {
  redirect(`/admin/account?${kind}=${encodeURIComponent(message)}`);
}

export async function changeOwnPasswordAction(formData: FormData): Promise<void> {
  const user = await requireModule('overview');
  const { t, lang } = await getI18n();
  const current = String(formData.get('current') ?? '');
  const next = String(formData.get('password') ?? '');
  const repeat = String(formData.get('repeat') ?? '');

  const problem = describePasswordProblem(next, lang);
  if (problem) back(problem);
  if (next !== repeat) back(t('Die beiden neuen Passwörter stimmen nicht überein.', 'The two new passwords are not the same.'));
  if (next === current) back(t('Das neue Passwort ist dasselbe wie das aktuelle.', 'The new password is the same as the current one.'));

  const result = await changeOwnPassword(user, current, next);
  if (!result.ok) back(pick(lang, result.error));

  back(
    t(
      'Passwort geändert. Hier bleibst du angemeldet; deine anderen Sitzungen sind beendet.',
      'Password changed. You stay signed in here; other sessions are closed.'
    ),
    'ok'
  );
}
