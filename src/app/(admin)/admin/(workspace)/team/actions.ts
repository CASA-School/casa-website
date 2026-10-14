'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { ADJUSTABLE, isLevel, roleDefault, type AccessLevel } from '@/lib/admin/access';
import { canDeleteStaff, revokeAllSessions, type StaffRole } from '@/lib/admin/auth';
import { requireModule } from '@/lib/admin/guard';
import { pick } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { describePasswordProblem } from '@/lib/admin/password';
import { looksLikeEmail } from '@/lib/admin/sign-in-names';
import {
  createStaffAccount,
  setStaffActive,
  setStaffAccess,
  setStaffPassword,
  setStaffRole,
  unlinkMicrosoft,
  updateStaffProfile,
} from '@/lib/admin/staff';

/**
 * Staff account mutations.
 *
 * Every one re-checks access. The sidebar hides the Team link from anyone
 * without the module, but hiding a link is not a permission — a server
 * action is a public endpoint, and a staff member who knows the action exists
 * can post to it directly. This is the check that actually holds.
 */

const ROLES = new Set<string>(['owner', 'admin', 'staff']);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The Team module is owner/admin by role and never granted by exception. */
const requireManager = () => requireModule('team', 'full');

function back(message: string, kind: 'error' | 'ok' = 'error'): never {
  redirect(`/admin/team?${kind}=${encodeURIComponent(message)}`);
}

const WEBSITE_LEVELS = new Set<string>(['none', 'view', 'edit', 'full']);

export async function createStaffAction(formData: FormData): Promise<void> {
  const actor = await requireManager();
  const { t, lang } = await getI18n();

  const email = String(formData.get('email') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  const username = String(formData.get('username') ?? '').trim();
  const role = String(formData.get('role') ?? 'staff');
  const website = String(formData.get('website') ?? 'none');
  const password = String(formData.get('password') ?? '');

  if (name.length < 2) {
    back(t('Gib dem Konto einen Namen.', 'Give the account a name.'));
  }

  if (!looksLikeEmail(email)) {
    back(t('Das sieht nicht nach einer E-Mail-Adresse aus.', 'That does not look like an email address.'));
  }

  if (!ROLES.has(role) || !WEBSITE_LEVELS.has(website)) {
    back(t('Unbekannte Rolle.', 'Unknown role.'));
  }

  // Only an owner may create another owner. An admin promoting themselves via
  // a colleague's account would otherwise be a one-step privilege escalation.
  if (role === 'owner' && !canDeleteStaff(actor.role)) {
    back(t('Nur Inhaber können weitere Inhaber anlegen.', 'Only an owner can create another owner.'));
  }

  // The password is optional: without one, Microsoft until an owner sets it.
  const problem = password ? describePasswordProblem(password, lang) : null;
  if (problem) {
    back(problem);
  }

  const result = await createStaffAccount({
    email,
    name,
    username,
    role: role as StaffRole,
    password: password || null,
    website: website as AccessLevel,
    actor,
  });

  if (!result.ok) {
    back(pick(lang, result.reason));
  }

  revalidatePath('/admin/team');
  back(
    password
      ? t(`${name} kann sich jetzt anmelden.`, `${name} can now sign in.`)
      : t(
          `${name} kann sich mit Microsoft anmelden. Setz ein Passwort, sobald du es hast.`,
          `${name} can sign in with Microsoft. Set a password for them when you have it.`
        ),
    'ok'
  );
}

/**
 * Several colleagues at once: one per line, "Full name, name@casa-bremen.de".
 * All as staff, with the website editor at the level chosen, and no password:
 * they sign in with Microsoft until an owner sets theirs.
 */
export async function createStaffBatchAction(formData: FormData): Promise<void> {
  const actor = await requireManager();
  const { t, lang } = await getI18n();
  const website = String(formData.get('website') ?? 'edit');
  if (!WEBSITE_LEVELS.has(website)) back(t('Unbekannte Zugriffsstufe.', 'Unknown access level.'));

  const lines = String(formData.get('people') ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) back(t('Eine Person pro Zeile: voller Name, E-Mail.', 'Add one colleague per line: full name, email.'));
  if (lines.length > 40) back(t('Höchstens 40 auf einmal.', 'Add at most 40 at once.'));

  const added: string[] = [];
  const problems: string[] = [];
  for (const line of lines) {
    const match = /^(.+?)[,;\t]\s*([^\s,;]+@[^\s,;]+)$/.exec(line);
    if (!match || match[1].trim().length < 2 || !looksLikeEmail(match[2])) {
      problems.push(t(`„${line}“: schreib es als voller Name, E-Mail`, `“${line}”: write it as full name, email`));
      continue;
    }
    const result = await createStaffAccount({
      name: match[1].trim(),
      email: match[2],
      role: 'staff',
      password: null,
      website: website as AccessLevel,
      actor,
    });
    if (result.ok) added.push(match[1].trim());
    else problems.push(`${match[1].trim()}: ${pick(lang, result.reason)}`);
  }

  revalidatePath('/admin/team');
  if (problems.length)
    back(
      t(
        `${added.length ? `Hinzugefügt: ${added.join(', ')}. ` : ''}Nicht hinzugefügt: ${problems.join('; ')}`,
        `${added.length ? `Added ${added.join(', ')}. ` : ''}Not added: ${problems.join('; ')}`
      )
    );
  back(
    t(
      `Hinzugefügt: ${added.join(', ')}. Sie können sich jetzt mit Microsoft anmelden; setz ihre Passwörter, sobald du sie hast.`,
      `Added ${added.join(', ')}. They can sign in with Microsoft now; set their passwords when you have them.`
    ),
    'ok'
  );
}

export async function updateStaffAction(formData: FormData): Promise<void> {
  const actor = await requireManager();
  const { t, lang } = await getI18n();
  const staffUserId = String(formData.get('staffUserId') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const username = String(formData.get('username') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();

  if (!UUID.test(staffUserId)) back(t('Unbekanntes Konto.', 'Unknown account.'));
  if (name.length < 2) back(t('Gib dem Konto einen Namen.', 'Give the account a name.'));
  if (!looksLikeEmail(email)) back(t('Das sieht nicht nach einer E-Mail-Adresse aus.', 'That does not look like an email address.'));

  const result = await updateStaffProfile({ staffUserId, name, username, email, actor });
  if (!result.ok) back(pick(lang, result.reason));

  revalidatePath('/admin/team');
  back(t(`${name} gespeichert.`, `${name} updated.`), 'ok');
}

export async function unlinkMicrosoftAction(formData: FormData): Promise<void> {
  const actor = await requireManager();
  const { t } = await getI18n();
  const staffUserId = String(formData.get('staffUserId') ?? '');
  if (!UUID.test(staffUserId)) back(t('Unbekanntes Konto.', 'Unknown account.'));
  if (formData.get('confirmed') !== '1') back(t('Das Trennen wurde nicht bestätigt.', 'Unlinking was not confirmed.'));

  await unlinkMicrosoft({ staffUserId, actor });
  revalidatePath('/admin/team');
  back(
    t(
      'Microsoft getrennt. Die nächste Microsoft-Anmeldung mit dieser Adresse verknüpft es wieder.',
      'Microsoft unlinked. The next Microsoft sign-in under that address links it again.'
    ),
    'ok'
  );
}

export async function setActiveAction(formData: FormData): Promise<void> {
  const actor = await requireManager();
  const { t, lang } = await getI18n();
  const staffUserId = String(formData.get('staffUserId') ?? '');
  const isActive = formData.get('isActive') === 'true';

  if (!UUID.test(staffUserId)) {
    back(t('Unbekanntes Konto.', 'Unknown account.'));
  }

  // Deactivating signs the person out everywhere; it goes through the
  // confirmation dialog, and a request that skipped it is refused.
  if (!isActive && formData.get('confirmed') !== '1') {
    back(t('Das Deaktivieren wurde nicht bestätigt.', 'Deactivation was not confirmed.'));
  }

  const result = await setStaffActive({ staffUserId, isActive, actor });

  if (!result.ok) {
    back(pick(lang, result.reason));
  }

  revalidatePath('/admin/team');
  back(
    isActive
      ? t('Konto wieder aktiviert.', 'Account reactivated.')
      : t('Konto deaktiviert und abgemeldet.', 'Account deactivated and signed out.'),
    'ok'
  );
}

export async function setRoleAction(formData: FormData): Promise<void> {
  const actor = await requireManager();
  const { t, lang } = await getI18n();
  const staffUserId = String(formData.get('staffUserId') ?? '');
  const role = String(formData.get('role') ?? '');

  if (!UUID.test(staffUserId) || !ROLES.has(role)) {
    back(t('Unbekanntes Konto oder unbekannte Rolle.', 'Unknown account or role.'));
  }

  if (role === 'owner' && !canDeleteStaff(actor.role)) {
    back(t('Nur Inhaber können die Inhaber-Rolle vergeben.', 'Only an owner can grant the owner role.'));
  }

  const result = await setStaffRole({ staffUserId, role: role as StaffRole, actor });

  if (!result.ok) {
    back(pick(lang, result.reason));
  }

  revalidatePath('/admin/team');
  back(t('Rolle geändert. Die Person wurde abgemeldet.', 'Role changed. That person has been signed out.'), 'ok');
}

export async function resetPasswordAction(formData: FormData): Promise<void> {
  await requireManager();
  const { t, lang } = await getI18n();
  const staffUserId = String(formData.get('staffUserId') ?? '');
  const password = String(formData.get('password') ?? '');

  if (!UUID.test(staffUserId)) {
    back(t('Unbekanntes Konto.', 'Unknown account.'));
  }

  const problem = describePasswordProblem(password, lang);
  if (problem) {
    back(problem);
  }

  await setStaffPassword({ staffUserId, password });

  revalidatePath('/admin/team');
  back(t('Passwort gesetzt. Alle Sitzungen dieses Kontos sind beendet.', 'Password set. Every session for that account is closed.'), 'ok');
}

/** What one person may do in each module. Levels equal to the role default are not stored. */
export async function setModuleAccessAction(formData: FormData): Promise<void> {
  const manager = await requireManager();
  const { t } = await getI18n();
  const staffUserId = String(formData.get('staffUserId') ?? '');
  if (!UUID.test(staffUserId)) back(t('Ungültiges Konto.', 'Invalid account.'));
  if (staffUserId === manager.id)
    back(t('Bitte einen anderen Administrator, deinen eigenen Zugriff zu ändern.', 'Ask another administrator to change your own access.'));

  const role = String(formData.get('role') ?? '');
  if (!ROLES.has(role)) back(t('Ungültige Rolle.', 'Invalid role.'));

  const levels: Record<string, AccessLevel> = {};
  for (const name of ADJUSTABLE) {
    const level = String(formData.get(`level:${name}`) ?? '');
    if (!isLevel(level)) back(t('Ungültige Zugriffsstufe.', 'Invalid access level.'));
    levels[name] = level;
  }

  await setStaffAccess(staffUserId, levels, roleDefault(role as StaffRole), manager.id);
  // A narrowed set must take effect now, not when the session next reloads.
  await revokeAllSessions(staffUserId);
  revalidatePath('/admin/team');
  back(t('Zugriff gespeichert.', 'Access updated.'), 'ok');
}
