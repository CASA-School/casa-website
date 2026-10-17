import type { ReactNode } from 'react';

import { createStaffAction, createStaffBatchAction } from './actions';
import { accessChanges } from './access-groups';
import { PersonDialog } from './person-dialog';
import {
  Badge,
  Button,
  Card,
  Cell,
  Field,
  Input,
  PageHeader,
  Select,
  Table,
  TableRow,
  Textarea,
} from '@/components/admin/ui';
import { FormDialog } from '@/components/admin/dialogs';
import { Avatar, ListGroup } from '@/components/admin/list';
import { roleLabel } from '@/components/admin/shell';
import { canDeleteStaff } from '@/lib/admin/auth';
import { requireModule } from '@/lib/admin/guard';
import { capitalise, relativeDays, type T } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { microsoftEnabled } from '@/lib/admin/microsoft';
import { MIN_PASSWORD_LENGTH } from '@/lib/admin/password';
import { listStaff } from '@/lib/admin/staff';
import { cn } from '@/lib/utils';

/**
 * Staff accounts.
 *
 * One list, grouped by role, one row per person: who they are, only what
 * differs from their role's default — a staff account with the defaults shows
 * nothing there, so an exception is what catches the eye — and when they were
 * last in. Everything about a person (role, module levels, details, password,
 * Microsoft, deactivation) opens in their dialog (`person-dialog.tsx`) from
 * their whole row. The module matrix that used to fill this screen — one
 * select per module per person — is that dialog now.
 *
 * DEACTIVATION, NOT DELETION, AND THAT IS THE WHOLE DESIGN. A deleted account
 * takes its name out of every record it owned and leaves six months of activity
 * trail pointing at nobody. Deactivating revokes access on the spot — every
 * live session is closed, not left to expire — and keeps the history readable.
 * There is no delete button anywhere on this screen.
 *
 * Passwords: an owner or admin sets anyone's here, and each colleague changes
 * their own on Your account (their name in the top bar). There is no emailed
 * reset link: it needs outbound email the workspace does not have, and a link
 * from an address nobody monitors is a security hole dressed as a feature.
 *
 * Roles: staff work the queues (statuses, owners, notes, placements);
 * administrators also have this screen (accounts, roles, passwords); owners
 * also grant the owner role. The role choices carry that as one line each.
 */
export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const user = await requireModule('team');
  const { t, lang } = await getI18n();

  const [params, staff] = await Promise.all([searchParams, listStaff()]);
  const isOwner = canDeleteStaff(user.role);
  const microsoft = microsoftEnabled();

  // Read as a team: by role, then whoever has been deactivated. The group is the role, so no row repeats it.
  const groups = [
    { key: 'owner', label: t('Inhaber', 'Owners'), rows: staff.filter((a) => a.isActive && a.role === 'owner') },
    { key: 'admin', label: t('Administratoren', 'Administrators'), rows: staff.filter((a) => a.isActive && a.role === 'admin') },
    { key: 'staff', label: t('Mitarbeitende', 'Staff'), rows: staff.filter((a) => a.isActive && a.role === 'staff') },
    { key: 'inactive', label: t('Deaktiviert', 'Deactivated'), rows: staff.filter((a) => !a.isActive) },
  ].filter((group) => group.rows.length);

  return (
    <>
      <PageHeader
        title={t('Zugänge', 'Accounts')}
        actions={
          <>
            <FormDialog trigger={t('Büroteam hinzufügen', 'Add the office team')} title={t('Büroteam hinzufügen', 'Add the office team')}>
              <form action={createStaffBatchAction} className="space-y-3">
                <Field
                  label={t('Personen', 'Colleagues')}
                  hint={t('Eine pro Zeile: voller Name, Outlook-Adresse', 'One per line: full name, Outlook address')}
                  htmlFor="batch-people"
                >
                  <Textarea
                    id="batch-people"
                    name="people"
                    rows={5}
                    required
                    placeholder={'Vorname Nachname, v.nachname@casa-bremen.de\nVorname Nachname, v.nachname@casa-bremen.de'}
                  />
                </Field>
                <Field label={t('Website-Editor', 'Website editor')} htmlFor="batch-website">
                  <Select id="batch-website" name="website" defaultValue="edit">
                    <WebsiteLevels t={t} />
                  </Select>
                </Field>
                <div className="pt-1">
                  <Button type="submit">{t('Personen hinzufügen', 'Add colleagues')}</Button>
                </div>
              </form>
            </FormDialog>

            <FormDialog
              trigger={t('Konto anlegen', 'Add an account')}
              title={t('Konto anlegen', 'Add an account')}
              description={t(
                'Gib das Passwort persönlich oder am Telefon weiter, nicht per E-Mail.',
                'Give them the password in person or by phone, not by email.'
              )}
              triggerVariant="primary"
              width="lg"
            >
              <form action={createStaffAction} className="grid gap-3 sm:grid-cols-2">
                <Field label={t('Name', 'Name')} htmlFor="new-name">
                  <Input id="new-name" name="name" required placeholder={t('Voller Name', 'Full name')} />
                </Field>
                <Field
                  label={t('Meldet sich an als', 'Signs in as')}
                  hint={t('Leer lassen, um den Namen zu nehmen', 'Leave empty to use the name')}
                  htmlFor="new-username"
                >
                  <Input
                    id="new-username"
                    name="username"
                    placeholder={t('Voller Name, so wie die Person ihn eintippt', 'Full name, as they will type it')}
                  />
                </Field>
                <Field label={t('Outlook-Adresse', 'Outlook address')} htmlFor="new-email">
                  <Input id="new-email" name="email" type="email" required placeholder="name@casa-bremen.de" />
                </Field>
                <Field label={t('Rolle', 'Role')} htmlFor="new-role">
                  <Select id="new-role" name="role" defaultValue="staff">
                    <option value="staff">{roleLabel('staff', lang)}</option>
                    <option value="admin">{roleLabel('admin', lang)}</option>
                    {isOwner ? <option value="owner">{roleLabel('owner', lang)}</option> : null}
                  </Select>
                </Field>
                <Field label={t('Website-Editor', 'Website editor')} htmlFor="new-website">
                  <Select id="new-website" name="website" defaultValue="none">
                    <WebsiteLevels t={t} />
                  </Select>
                </Field>
                <Field
                  label={t('Passwort', 'Password')}
                  hint={
                    microsoft
                      ? t(`Optional · mindestens ${MIN_PASSWORD_LENGTH} Zeichen`, `Optional · ${MIN_PASSWORD_LENGTH} characters or more`)
                      : t(`Mindestens ${MIN_PASSWORD_LENGTH} Zeichen`, `${MIN_PASSWORD_LENGTH} characters or more`)
                  }
                  htmlFor="new-password"
                >
                  <Input
                    id="new-password"
                    name="password"
                    type="password"
                    required={!microsoft}
                    minLength={MIN_PASSWORD_LENGTH}
                    autoComplete="new-password"
                  />
                </Field>
                <div className="pt-1 sm:col-span-2">
                  <Button type="submit">{t('Konto anlegen', 'Create account')}</Button>
                </div>
              </form>
            </FormDialog>
          </>
        }
      />

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

      <Card bleed>
        <Table
          head={[
            t('Person', 'Colleague'),
            { label: t('Zugriff', 'Access'), className: 'hidden md:table-cell' },
            { label: t('Zuletzt aktiv', 'Last seen'), className: 'w-[7rem] md:w-[9.5rem]' },
          ]}
        >
          {groups.map((group) => [
            <ListGroup key={group.key} label={group.label} count={group.rows.length} span={3} />,
            ...group.rows.map((account) => {
              const changes = accessChanges(account.role, account.moduleExceptions, lang);
              return (
                <TableRow key={account.id} interactive>
                  <Cell className="max-w-0">
                    <PersonDialog account={account} viewer={user} canGrantOwner={isOwner} microsoft={microsoft} lang={lang} />
                    <Colleague
                      name={account.name}
                      you={account.id === user.id ? t('(du)', '(you)') : null}
                      muted={!account.isActive}
                      flag={
                        account.hasPassword || account.microsoftLinkedAt ? null : (
                          <Badge tone="warning">{t('Noch kein Passwort', 'No password yet')}</Badge>
                        )
                      }
                      about={[
                        account.email,
                        account.username && account.username !== account.name
                          ? t(`meldet sich an als ${account.username}`, `signs in as ${account.username}`)
                          : null,
                        account.microsoftLinkedAt ? 'Microsoft' : null,
                        account.isActive ? null : roleLabel(account.role, lang),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    />
                  </Cell>
                  <Cell className="hidden text-[0.84rem] text-[#2b3546] md:table-cell">
                    {changes.map((change, i) => (
                      <span key={change.module} className={change.raised ? undefined : 'text-[var(--casa-text-subtle)]'}>
                        {i > 0 ? ', ' : null}
                        {change.label}
                      </span>
                    ))}
                  </Cell>
                  <Cell className="text-[0.8rem] whitespace-nowrap text-[var(--casa-muted)]">
                    {account.lastSeenAt ? (
                      capitalise(relativeDays(account.lastSeenAt, lang))
                    ) : (
                      <span className="text-[var(--casa-text-subtle)]">{t('Nie', 'Never')}</span>
                    )}
                  </Cell>
                </TableRow>
              );
            }),
          ])}
        </Table>
      </Card>
    </>
  );
}

/**
 * A colleague in the list: their initials in ink (a colleague, not a record —
 * docs/ADMIN_WORKSPACE.md rule 13), the name, "(you)", and under it the
 * address they sign in with. `RecordName`'s layout with the staff initials.
 */
function Colleague({
  name,
  you,
  muted,
  flag,
  about,
}: {
  name: string;
  /** "(you)" on the viewer's own row, in the page's language. */
  you: string | null;
  muted: boolean;
  flag: ReactNode;
  about: string;
}) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span className={muted ? 'opacity-40' : undefined}>
        <Avatar name={name} staff />
      </span>
      <span className="min-w-0">
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className={cn('max-w-full truncate text-[0.9rem] font-semibold', muted ? 'text-[var(--casa-text-subtle)]' : 'text-[var(--casa-ink)]')}>
            {name}
          </span>
          {you ? <span className="shrink-0 text-xs text-[var(--casa-text-subtle)]">{you}</span> : null}
          {flag ? <span className="shrink-0 self-center">{flag}</span> : null}
        </span>
        <span className="mt-0.5 block truncate text-[0.8rem] text-[var(--casa-muted)]">{about}</span>
      </span>
    </span>
  );
}

/** The website editor's levels, as the Team forms offer them. */
function WebsiteLevels({ t }: { t: T }) {
  return (
    <>
      <option value="none">{t('Kein Zugriff', 'No access')}</option>
      <option value="view">{t('Ansehen', 'View')}</option>
      <option value="edit">{t('Bearbeiten — Entwürfe, zur Freigabe senden', 'Edit — drafts, sends for approval')}</option>
      <option value="full">{t('Vollzugriff — veröffentlicht auch', 'Full — also publishes')}</option>
    </>
  );
}
