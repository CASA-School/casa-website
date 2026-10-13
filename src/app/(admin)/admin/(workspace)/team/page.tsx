import {
  createStaffAction,
  createStaffBatchAction,
  resetPasswordAction,
  setActiveAction,
  setModuleAccessAction,
  setRoleAction,
  unlinkMicrosoftAction,
  updateStaffAction,
} from './actions';
import {
  Badge,
  Button,
  Card,
  Cell,
  DateText,
  Field,
  Input,
  PageHeader,
  Select,
  Table,
  TableRow,
  Textarea,
  relativeDays,
} from '@/components/admin/ui';
import { ConfirmSubmit, FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { roleLabel } from '@/components/admin/shell';
import { ADJUSTABLE, LEVEL_LABELS, LEVELS, MODULE_LABELS, resolveAccess } from '@/lib/admin/access';
import { canDeleteStaff } from '@/lib/admin/auth';
import { requireModule } from '@/lib/admin/guard';
import { microsoftEnabled } from '@/lib/admin/microsoft';
import { MIN_PASSWORD_LENGTH } from '@/lib/admin/password';
import { listStaff } from '@/lib/admin/staff';

/**
 * Staff accounts.
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
        description="Who can sign in to the workspace, and what they may do here."
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

      <div className="space-y-4">
        <Card title="Accounts" icon={Icon.team} tint="green" bleed>
          <Table head={['Name', 'Role', 'Last seen', 'Sessions', { label: '', align: 'right' }]}>
            {staff.map((account) => (
              <TableRow key={account.id}>
                <Cell className="font-semibold">
                  <span className="block">
                    {account.name}
                    {account.id === user.id ? (
                      <span className="ml-2 text-xs font-normal text-[var(--casa-text-subtle)]">
                        (you)
                      </span>
                    ) : null}
                  </span>
                  <span className="block text-xs font-normal text-[var(--casa-text-subtle)]">
                    {account.email}
                    {account.username && account.username !== account.name ? ` · signs in as ${account.username}` : null}
                  </span>
                  <span className="mt-1.5 flex flex-wrap gap-1.5">
                    {account.microsoftLinkedAt ? <Badge tone="neutral">Microsoft</Badge> : null}
                    {account.hasPassword ? null : <Badge tone="warning">No password yet</Badge>}
                  </span>
                </Cell>
                <Cell>
                  {account.id === user.id ? (
                    <Badge tone="neutral">{roleLabel(account.role)}</Badge>
                  ) : (
                    <form action={setRoleAction} className="flex items-center gap-1.5">
                      <input type="hidden" name="staffUserId" value={account.id} />
                      <Select
                        name="role"
                        defaultValue={account.role}
                        aria-label={`Role for ${account.name}`}
                        className="h-8 w-auto py-0 text-xs"
                      >
                        <option value="staff">Staff</option>
                        <option value="admin">Administrator</option>
                        {isOwner ? <option value="owner">Owner</option> : null}
                      </Select>
                      <Button type="submit" variant="ghost" size="sm">
                        Set
                      </Button>
                    </form>
                  )}
                </Cell>
                <Cell className="text-sm text-[var(--casa-text-subtle)]">
                  {account.lastSeenAt ? (
                    relativeDays(account.lastSeenAt)
                  ) : (
                    <span className="italic">never signed in</span>
                  )}
                  <span className="block text-xs">
                    added <DateText value={account.createdAt} />
                  </span>
                </Cell>
                <Cell className="text-sm">
                  {account.isActive ? (
                    account.activeSessions
                  ) : (
                    <Badge tone="quiet">Deactivated</Badge>
                  )}
                </Cell>
                <Cell align="right">
                  <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
                  <FormDialog trigger="Edit" title={`Edit ${account.name}`} triggerVariant="ghost" size="sm">
                    <form action={updateStaffAction} className="space-y-3 text-left">
                      <input type="hidden" name="staffUserId" value={account.id} />
                      <Field label="Name" htmlFor={`edit-name-${account.id}`}>
                        <Input id={`edit-name-${account.id}`} name="name" required defaultValue={account.name} />
                      </Field>
                      <Field label="Signs in as" hint="Their full name, as they will type it" htmlFor={`edit-username-${account.id}`}>
                        <Input id={`edit-username-${account.id}`} name="username" defaultValue={account.username ?? account.name} />
                      </Field>
                      <Field label="Outlook address" htmlFor={`edit-email-${account.id}`}>
                        <Input id={`edit-email-${account.id}`} name="email" type="email" required defaultValue={account.email} />
                      </Field>
                      <Button type="submit">Save</Button>
                    </form>
                  </FormDialog>
                  {account.microsoftLinkedAt && account.id !== user.id ? (
                    <form action={unlinkMicrosoftAction} className="inline">
                      <input type="hidden" name="staffUserId" value={account.id} />
                      <ConfirmSubmit
                        title={`Unlink Microsoft for ${account.name}?`}
                        description="They are signed out. Their next Microsoft sign-in under this account's address links it again."
                        confirmLabel="Unlink"
                        variant="ghost"
                      >
                        Unlink Microsoft
                      </ConfirmSubmit>
                    </form>
                  ) : null}
                  {account.id === user.id ? null : (
                    <form action={setActiveAction} className="inline">
                      <input type="hidden" name="staffUserId" value={account.id} />
                      <input
                        type="hidden"
                        name="isActive"
                        value={account.isActive ? 'false' : 'true'}
                      />
                      {account.isActive ? (
                        <ConfirmSubmit
                          title={`Deactivate ${account.name}?`}
                          description="They are signed out everywhere and can no longer open the workspace. Their name stays on everything they did. You can reactivate them later."
                          confirmLabel="Deactivate"
                        >
                          Deactivate
                        </ConfirmSubmit>
                      ) : (
                        <Button type="submit" variant="secondary" size="sm">
                          Reactivate
                        </Button>
                      )}
                    </form>
                  )}
                  </span>
                </Cell>
              </TableRow>
            ))}
          </Table>
        </Card>

        <Card title="Access" icon={Icon.settings} tint="ink" bleed>
          <Table
            head={[
              'Account',
              ...ADJUSTABLE.map((m) => MODULE_LABELS[m]),
              { label: '', align: 'right' },
            ]}
          >
            {staff
              .filter((account) => account.isActive)
              .map((account) => {
                const access = resolveAccess(account.role, account.moduleExceptions);
                const fixed = account.id === user.id || account.role !== 'staff';
                return (
                  <TableRow key={account.id}>
                    <Cell className="font-semibold whitespace-nowrap">
                      <span className="block">{account.name}</span>
                      <span className="block text-xs font-normal text-[var(--casa-text-subtle)]">
                        {roleLabel(account.role)}
                      </span>
                    </Cell>
                    {ADJUSTABLE.map((m) =>
                      fixed ? (
                        <Cell key={m} className="px-2 text-sm text-[var(--casa-text-subtle)]">
                          {LEVEL_LABELS[access[m]]}
                        </Cell>
                      ) : (
                        <Cell key={m} className="px-2">
                          <Select
                            form={`access-${account.id}`}
                            name={`level:${m}`}
                            defaultValue={access[m]}
                            aria-label={`${MODULE_LABELS[m]} for ${account.name}`}
                            className="h-8 w-auto py-0 pr-7 pl-2.5 text-xs"
                          >
                            {LEVELS.map((level) => (
                              <option key={level} value={level}>
                                {LEVEL_LABELS[level]}
                              </option>
                            ))}
                          </Select>
                        </Cell>
                      )
                    )}
                    <Cell align="right">
                      {fixed ? null : (
                        <form id={`access-${account.id}`} action={setModuleAccessAction}>
                          <input type="hidden" name="staffUserId" value={account.id} />
                          <input type="hidden" name="role" value={account.role} />
                          <Button type="submit" variant="ghost" size="sm">
                            Save
                          </Button>
                        </form>
                      )}
                    </Cell>
                  </TableRow>
                );
              })}
          </Table>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <Card
            title="Add an account"
            description="Give them the password in person or by phone, not by email."
            icon={Icon.person}
            tint="green"
          >
            <form action={createStaffAction} className="grid gap-3 sm:grid-cols-2">
              <Field label="Name" htmlFor="new-name">
                <Input id="new-name" name="name" required placeholder="Full name" />
              </Field>
              <Field label="Signs in as" hint="Leave empty to use the name" htmlFor="new-username">
                <Input id="new-username" name="username" placeholder="Full name, as they will type it" />
              </Field>
              <Field label="Outlook address" htmlFor="new-email">
                <Input
                  id="new-email"
                  name="email"
                  type="email"
                  required
                  placeholder="name@casa-bremen.de"
                />
              </Field>
              <Field label="Role" htmlFor="new-role">
                <Select id="new-role" name="role" defaultValue="staff">
                  <option value="staff">Staff — works the queues</option>
                  <option value="admin">Administrator — also manages accounts</option>
                  {isOwner ? <option value="owner">Owner — can grant the owner role</option> : null}
                </Select>
              </Field>
              <Field label="Website editor" hint="Staff accounts" htmlFor="new-website">
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
              <div className="sm:col-span-2">
                <Button type="submit">Create account</Button>
              </div>
            </form>
          </Card>

          <div className="space-y-4">
            <Card title="Add the office team" icon={Icon.team} tint="green">
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
                <Button type="submit" variant="secondary">
                  Add colleagues
                </Button>
              </form>
            </Card>

            <Card
              title="Set someone's password"
              description="Closes every session that account has open."
              icon={Icon.settings}
              tint="ink"
            >
              <form action={resetPasswordAction} className="space-y-3">
                <Field label="Account" htmlFor="reset-account">
                  <Select id="reset-account" name="staffUserId" required>
                    <option value="" disabled>
                      Choose an account
                    </option>
                    {staff.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} — {account.email}
                        {account.hasPassword ? '' : ' (no password yet)'}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  label="New password"
                  hint={`${MIN_PASSWORD_LENGTH} characters or more`}
                  htmlFor="reset-password"
                >
                  <Input
                    id="reset-password"
                    name="password"
                    type="password"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    autoComplete="new-password"
                  />
                </Field>
                <Button type="submit" variant="secondary">
                  Set password
                </Button>
              </form>
            </Card>

            <Card title="Roles" icon={Icon.book} tint="ink" bleed>
              <dl className="divide-y divide-ws-line-soft text-sm">
                <div className="px-4 py-2.5">
                  <dt className="font-semibold text-[var(--casa-ink)]">Staff</dt>
                  <dd className="text-xs text-[var(--casa-text-subtle)]">
                    Works the queues: statuses, owners, notes, placements.
                  </dd>
                </div>
                <div className="px-4 py-2.5">
                  <dt className="font-semibold text-[var(--casa-ink)]">Administrator</dt>
                  <dd className="text-xs text-[var(--casa-text-subtle)]">
                    Also this screen: accounts, roles, passwords.
                  </dd>
                </div>
                <div className="px-4 py-2.5">
                  <dt className="font-semibold text-[var(--casa-ink)]">Owner</dt>
                  <dd className="text-xs text-[var(--casa-text-subtle)]">
                    Also grants the owner role.
                  </dd>
                </div>
              </dl>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
