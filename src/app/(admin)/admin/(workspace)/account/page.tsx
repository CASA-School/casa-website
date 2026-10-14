import type { Metadata } from 'next';

import { changeOwnPasswordAction } from './actions';
import { Icon } from '@/components/admin/icons';
import { Button, Card, DateText, DetailList, Field, Input, PageHeader } from '@/components/admin/ui';
import { roleLabel } from '@/components/admin/shell';
import { requireModule } from '@/lib/admin/guard';
import { getI18n } from '@/lib/admin/i18n.server';
import { microsoftEnabled } from '@/lib/admin/microsoft';
import { MIN_PASSWORD_LENGTH } from '@/lib/admin/password';
import { getOwnAccount } from '@/lib/admin/staff';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t('Dein Konto · Arbeitsbereich · CASA Bremen', 'Your account · Workspace · CASA Bremen') };
}

/**
 * The signed-in colleague's own account, opened from their name in the top bar.
 *
 * Everyone changes their own password here: the current one, then the new one
 * twice. An account that has no password yet (it signs in with Microsoft) sets
 * its first one without the current field. Other people's passwords stay with
 * an owner or admin on the Team screen.
 */
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const user = await requireModule('overview');
  const { t, lang } = await getI18n();
  const [params, account] = await Promise.all([searchParams, getOwnAccount(user.id)]);
  const hasPassword = account?.hasPassword ?? true;

  return (
    <div>
      <PageHeader title={t('Dein Konto', 'Your account')} />

      {params.error ? (
        <p
          role="alert"
          className="mb-5 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]"
        >
          {params.error}
        </p>
      ) : null}

      {params.ok ? (
        <p
          role="status"
          className="mb-5 rounded-lg border border-[var(--casa-success-text)]/30 bg-[var(--casa-success-surface)]/8 px-4 py-3 text-sm text-[var(--casa-success-text)]"
        >
          {params.ok}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <Card title={t('Angaben', 'Details')} icon={Icon.person} tint="green">
          <DetailList
            items={[
              { label: t('Name', 'Name'), value: user.name },
              { label: t('Rolle', 'Role'), value: roleLabel(user.role, lang) },
              { label: t('Meldet sich an als', 'Signs in as'), value: account?.username ?? user.name },
              { label: t('E-Mail', 'Email'), value: user.email },
              ...(microsoftEnabled()
                ? [
                    {
                      label: 'Microsoft',
                      value: account?.microsoftLinkedAt ? (
                        <>
                          {t('Verknüpft seit', 'Linked since')} <DateText value={account.microsoftLinkedAt} />
                        </>
                      ) : (
                        t('Noch nicht verknüpft', 'Not linked yet')
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </Card>

        <Card
          title={hasPassword ? t('Passwort ändern', 'Change password') : t('Passwort festlegen', 'Set a password')}
          icon={Icon.settings}
          tint="ink"
        >
          <form action={changeOwnPasswordAction} className="space-y-3">
            {hasPassword ? (
              <Field label={t('Aktuelles Passwort', 'Current password')} htmlFor="current-password">
                <Input id="current-password" name="current" type="password" required autoComplete="current-password" />
              </Field>
            ) : null}
            <Field
              label={t('Neues Passwort', 'New password')}
              hint={t(`Mindestens ${MIN_PASSWORD_LENGTH} Zeichen`, `${MIN_PASSWORD_LENGTH} characters or more`)}
              htmlFor="new-password"
            >
              <Input
                id="new-password"
                name="password"
                type="password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
              />
            </Field>
            <Field label={t('Neues Passwort wiederholen', 'New password again')} htmlFor="repeat-password">
              <Input
                id="repeat-password"
                name="repeat"
                type="password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
              />
            </Field>
            <Button type="submit">
              {hasPassword ? t('Passwort ändern', 'Change password') : t('Passwort festlegen', 'Set password')}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
