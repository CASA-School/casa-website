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
  relativeDays,
} from '@/components/admin/ui';
import { FormDialog } from '@/components/admin/dialogs';
import { roleLabel } from '@/components/admin/shell';
import { canDeleteStaff } from '@/lib/admin/auth';
import { requireModule } from '@/lib/admin/guard';
import { microsoftEnabled } from '@/lib/admin/microsoft';
import { MIN_PASSWORD_LENGTH } from '@/lib/admin/password';
import { listStaff } from '@/lib/admin/staff';
import { cn } from '@/lib/utils';

/**
 * Staff accounts.
 *
 * One list, one row per person: who they are, their role, and only what
 * differs from that role's default — a staff account with the defaults shows
 * nothing there, so an exception is what catches the eye. Everything about a
 * person (role, module levels, details, password, Microsoft, deactivation)
 * opens in their dialog (`person-dialog.tsx`). The module matrix that used to
 * fill this screen — one select per module per person — is that dialog now.
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

  const [params, staff] = await Promise.all([searchParams, listStaff()]);
  const isOwner = canDeleteStaff(user.role);
  const microsoft = microsoftEnabled();

  return (
    <>
      <PageHeader
        title="Team"
        actions={
          <>
            <FormDialog trigger="Add the office team" title="Add the office team">
              <form action={createStaffBatchAction} className="space-y-3">
                <Field label="Colleagues" hint="One per line: full name, Outlook address" htmlFor="batch-people">
                  <Textarea
                    id="batch-people"
                    name="people"
                    rows={5}
                    required
                    placeholder={'Vorname Nachname, v.nachname@casa-bremen.de\nVorname Nachname, v.nachname@casa-bremen.de'}
                  />
                </Field>
                <Field label="Website editor" htmlFor="batch-website">
                  <Select id="batch-website" name="website" defaultValue="edit">
                    <option value="none">No access</option>
                    <option value="view">View</option>
                    <option value="edit">Edit — drafts, sends for approval</option>
                    <option value="full">Full — also publishes</option>
                  </Select>
                </Field>
                <div className="pt-1">
                  <Button type="submit">Add colleagues</Button>
                </div>
              </form>
            </FormDialog>

            <FormDialog
              trigger="Add an account"
              title="Add an account"
              description="Give them the password in person or by phone, not by email."
              triggerVariant="primary"
              width="lg"
            >
              <form action={createStaffAction} className="grid gap-3 sm:grid-cols-2">
                <Field label="Name" htmlFor="new-name">
                  <Input id="new-name" name="name" required placeholder="Full name" />
                </Field>
                <Field label="Signs in as" hint="Leave empty to use the name" htmlFor="new-username">
                  <Input id="new-username" name="username" placeholder="Full name, as they will type it" />
                </Field>
                <Field label="Outlook address" htmlFor="new-email">
                  <Input id="new-email" name="email" type="email" required placeholder="name@casa-bremen.de" />
                </Field>
                <Field label="Role" htmlFor="new-role">
                  <Select id="new-role" name="role" defaultValue="staff">
                    <option value="staff">Staff</option>
                    <option value="admin">Administrator</option>
                    {isOwner ? <option value="owner">Owner</option> : null}
                  </Select>
                </Field>
                <Field label="Website editor" htmlFor="new-website">
                  <Select id="new-website" name="website" defaultValue="none">
                    <option value="none">No access</option>
                    <option value="view">View</option>
                    <option value="edit">Edit — drafts, sends for approval</option>
                    <option value="full">Full — also publishes</option>
                  </Select>
                </Field>
                <Field
                  label="Password"
                  hint={microsoft ? `Optional · ${MIN_PASSWORD_LENGTH} characters or more` : `${MIN_PASSWORD_LENGTH} characters or more`}
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
                  <Button type="submit">Create account</Button>
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
        <Table head={['Name', 'Role', 'Access', 'Last seen', { label: '', align: 'right' }]}>
          {staff.map((account) => {
            const changes = accessChanges(account.role, account.moduleExceptions);
            const muted = !account.isActive;
            return (
              <TableRow key={account.id}>
                <Cell>
                  <span className={cn('block font-semibold', muted && 'text-[var(--casa-text-subtle)]')}>
                    {account.name}
                    {account.id === user.id ? (
                      <span className="ml-2 text-xs font-normal text-[var(--casa-text-subtle)]">(you)</span>
                    ) : null}
                  </span>
                  <span className="block text-xs text-[var(--casa-text-subtle)]">
                    {account.email}
                    {account.username && account.username !== account.name ? ` · signs in as ${account.username}` : null}
                  </span>
                </Cell>
                <Cell>
                  <span className="flex flex-wrap gap-1.5">
                    <Badge tone="quiet">{roleLabel(account.role)}</Badge>
                    {account.isActive ? null : <Badge tone="neutral">Deactivated</Badge>}
                  </span>
                </Cell>
                <Cell>
                  {changes.length ? (
                    <span className="flex max-w-md flex-wrap gap-1.5">
                      {changes.map((change) => (
                        <Badge key={change.module} tone={change.raised ? 'neutral' : 'quiet'}>
                          {change.label}
                        </Badge>
                      ))}
                    </span>
                  ) : null}
                </Cell>
                <Cell className="text-sm whitespace-nowrap text-[var(--casa-text-subtle)]">
                  {account.lastSeenAt ? relativeDays(account.lastSeenAt) : <span className="italic">never signed in</span>}
                  {!account.hasPassword || account.microsoftLinkedAt ? (
                    <span className="mt-1 flex flex-wrap gap-1.5">
                      {account.hasPassword ? null : <Badge tone="warning">No password yet</Badge>}
                      {account.microsoftLinkedAt ? <Badge tone="quiet">Microsoft</Badge> : null}
                    </span>
                  ) : null}
                </Cell>
                <Cell align="right">
                  <PersonDialog account={account} viewer={user} canGrantOwner={isOwner} microsoft={microsoft} />
                </Cell>
              </TableRow>
            );
          })}
        </Table>
      </Card>
    </>
  );
}
