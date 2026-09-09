import {
  createStaffAction,
  resetPasswordAction,
  setActiveAction,
  setModuleAccessAction,
  setRoleAction,
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
  relativeDays,
} from '@/components/admin/ui';
import { roleLabel } from '@/components/admin/shell';
import { ADJUSTABLE, MODULE_LABELS, resolveModules } from '@/lib/admin/access';
import { canDeleteStaff } from '@/lib/admin/auth';
import { requireModule } from '@/lib/admin/guard';
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
 * Passwords are set BY an owner or admin, and there is no self-service reset.
 * A reset flow needs outbound email the workspace does not have, and a reset
 * link emailed from an address nobody monitors is a security hole dressed as a
 * feature. Nine people work here; asking one of them is faster anyway.
 */
export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const user = await requireModule('team');

  const [params, staff] = await Promise.all([searchParams, listStaff()]);
  const isOwner = canDeleteStaff(user.role);

  return (
    <>
      <PageHeader
        eyebrow="Administration"
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

      <div className="space-y-5">
        <Card title="Accounts" bleed>
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
                        className="w-auto py-1 text-xs"
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
                  {account.id === user.id ? null : (
                    <form action={setActiveAction} className="inline">
                      <input type="hidden" name="staffUserId" value={account.id} />
                      <input
                        type="hidden"
                        name="isActive"
                        value={account.isActive ? 'false' : 'true'}
                      />
                      <Button
                        type="submit"
                        variant={account.isActive ? 'danger' : 'secondary'}
                        size="sm"
                      >
                        {account.isActive ? 'Deactivate' : 'Reactivate'}
                      </Button>
                    </form>
                  )}
                </Cell>
              </TableRow>
            ))}
          </Table>
        </Card>

        <Card title="Access" bleed>
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
                const modules = resolveModules(account.role, account.moduleExceptions);
                const fixed = account.id === user.id || account.role !== 'staff';
                return (
                  <TableRow key={account.id}>
                    <Cell className="font-semibold">
                      <span className="block">{account.name}</span>
                      <span className="block text-xs font-normal text-[var(--casa-text-subtle)]">
                        {roleLabel(account.role)}
                      </span>
                    </Cell>
                    {fixed ? (
                      <>
                        {ADJUSTABLE.map((m) => (
                          <Cell key={m} className="text-center">
                            <span
                              aria-label={modules.includes(m) ? 'Yes' : 'No'}
                              className={
                                modules.includes(m)
                                  ? 'text-[var(--casa-success-text)]'
                                  : 'text-ws-line-firm'
                              }
                            >
                              {modules.includes(m) ? '●' : '○'}
                            </span>
                          </Cell>
                        ))}
                        <Cell align="right" className="text-xs text-[var(--casa-text-subtle)]">
                          {account.id === user.id ? '' : 'All modules'}
                        </Cell>
                      </>
                    ) : (
                      <>
                        {ADJUSTABLE.map((m) => (
                          <Cell key={m} className="text-center">
                            <input
                              form={`access-${account.id}`}
                              type="checkbox"
                              name="modules"
                              value={m}
                              defaultChecked={modules.includes(m)}
                              aria-label={`${MODULE_LABELS[m]} for ${account.name}`}
                              className="size-4 rounded-sm border-ws-line-firm accent-[var(--casa-accent-surface)]"
                            />
                          </Cell>
                        ))}
                        <Cell align="right">
                          <form id={`access-${account.id}`} action={setModuleAccessAction}>
                            <input type="hidden" name="staffUserId" value={account.id} />
                            <input type="hidden" name="role" value={account.role} />
                            <Button type="submit" variant="ghost" size="sm">
                              Save
                            </Button>
                          </form>
                        </Cell>
                      </>
                    )}
                  </TableRow>
                );
              })}
          </Table>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card
            title="Add an account"
            description="Give them the password in person or by phone, not by email."
          >
            <form action={createStaffAction} className="space-y-3">
              <Field label="Name" htmlFor="new-name">
                <Input id="new-name" name="name" required placeholder="Full name" />
              </Field>
              <Field label="Email" htmlFor="new-email">
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
              <Field
                label="Password"
                hint={`${MIN_PASSWORD_LENGTH} characters or more`}
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
              <Button type="submit">Create account</Button>
            </form>
          </Card>

          <div className="space-y-5">
            <Card
              title="Set someone's password"
              description="Closes every session that account has open."
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

            <Card title="What the roles mean">
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="font-semibold">Staff</dt>
                  <dd className="text-[var(--casa-text-subtle)]">
                    Works every queue: reads records, sets statuses, takes ownership, writes notes,
                    confirms placements.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">Administrator</dt>
                  <dd className="text-[var(--casa-text-subtle)]">
                    Everything above, plus this screen — creating accounts, changing roles, setting
                    passwords, deactivating people.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">Owner</dt>
                  <dd className="text-[var(--casa-text-subtle)]">
                    Everything above, plus granting the owner role. CASA cannot be left with no
                    active owner — the workspace refuses the change that would do it.
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
