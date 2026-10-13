import type { ReactNode } from 'react';

import {
  resetPasswordAction,
  setActiveAction,
  setModuleAccessAction,
  setRoleAction,
  unlinkMicrosoftAction,
  updateStaffAction,
} from './actions';
import { ACCESS_GROUPS, moduleLabel } from './access-groups';
import { PersonTabs } from './person-tabs';
import { Button, DateText, Field, Input } from '@/components/admin/ui';
import { ConfirmSubmit, FormDialog } from '@/components/admin/dialogs';
import { Popover, PopoverChoice } from '@/components/admin/popover';
import { roleLabel } from '@/components/admin/shell';
import {
  ADJUSTABLE,
  LEVEL_LABELS,
  LEVELS,
  resolveAccess,
  roleDefault,
  type Access,
} from '@/lib/admin/access';
import type { StaffRole, StaffUser } from '@/lib/admin/auth';
import { MIN_PASSWORD_LENGTH } from '@/lib/admin/password';
import type { StaffAccount } from '@/lib/admin/staff';
import { cn } from '@/lib/utils';

/**
 * One person: their access, their details, how they sign in, and — at the
 * foot, on every tab — deactivation.
 *
 * Each section is its own form posting to its own action, exactly as the
 * screen's separate cards did; the dialog only gathers them. The rules carry
 * over unchanged: nobody changes their own role or access, owners' and
 * administrators' levels are shown and not edited (they hold everything by
 * role), and deactivating goes through `ConfirmSubmit`.
 */

const ROLES: readonly { value: StaffRole; label: string; line: string }[] = [
  { value: 'staff', label: 'Staff', line: 'Works the queues' },
  { value: 'admin', label: 'Administrator', line: 'Also manages accounts' },
  { value: 'owner', label: 'Owner', line: 'Can grant the owner role' },
];

const label = 'text-xs font-bold text-[var(--casa-muted)]';

export function PersonDialog({
  account,
  viewer,
  canGrantOwner,
  microsoft,
}: {
  account: StaffAccount;
  viewer: StaffUser;
  canGrantOwner: boolean;
  microsoft: boolean;
}) {
  const self = account.id === viewer.id;

  const tabs = [
    {
      id: 'access',
      label: 'Access',
      content: <AccessTab account={account} self={self} canGrantOwner={canGrantOwner} />,
    },
    {
      id: 'details',
      label: 'Details',
      content: (
        <form action={updateStaffAction} className="space-y-3">
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
          <div className="pt-1">
            <Button type="submit">Save</Button>
          </div>
        </form>
      ),
    },
    {
      id: 'sign-in',
      label: 'Sign-in',
      content: (
        <div className="space-y-6">
          <form action={resetPasswordAction} className="space-y-3">
            <input type="hidden" name="staffUserId" value={account.id} />
            <Field
              label={account.hasPassword ? 'New password' : 'Password'}
              hint={`${MIN_PASSWORD_LENGTH} characters or more`}
              htmlFor={`password-${account.id}`}
            >
              <Input
                id={`password-${account.id}`}
                name="password"
                type="password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
              />
            </Field>
            <div className="pt-1">
              <Button type="submit">Set password</Button>
            </div>
          </form>

          {account.microsoftLinkedAt || microsoft ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ws-line-soft pt-5">
              <div>
                <p className={label}>Microsoft</p>
                <p className="mt-1 text-sm text-[var(--casa-ink)]">
                  {account.microsoftLinkedAt ? (
                    <>
                      Linked <DateText value={account.microsoftLinkedAt} />
                    </>
                  ) : (
                    <span className="text-[var(--casa-text-subtle)]">Not linked</span>
                  )}
                </p>
              </div>
              {account.microsoftLinkedAt && !self ? (
                <form action={unlinkMicrosoftAction}>
                  <input type="hidden" name="staffUserId" value={account.id} />
                  <ConfirmSubmit
                    title={`Unlink Microsoft for ${account.name}?`}
                    description="They are signed out. Their next Microsoft sign-in under this account's address links it again."
                    confirmLabel="Unlink"
                    variant="secondary"
                  >
                    Unlink Microsoft
                  </ConfirmSubmit>
                </form>
              ) : null}
            </div>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <FormDialog
      trigger="Edit"
      title={account.name}
      description={account.email}
      triggerVariant="ghost"
      size="sm"
      width="lg"
    >
      <PersonTabs label={account.name} tabs={tabs} />

      <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ws-line-soft pt-4">
        <p className="text-xs text-[var(--casa-text-subtle)]">
          Added <DateText value={account.createdAt} />
          {account.isActive && account.activeSessions > 0
            ? ` · ${account.activeSessions} ${account.activeSessions === 1 ? 'session' : 'sessions'} open`
            : null}
        </p>
        {self ? null : (
          <form action={setActiveAction}>
            <input type="hidden" name="staffUserId" value={account.id} />
            <input type="hidden" name="isActive" value={account.isActive ? 'false' : 'true'} />
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
      </footer>
    </FormDialog>
  );
}

/** A row of the access tab: the group's name in the left column, the rest beside it. */
function Row({ name, className, children }: { name: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn('flex gap-4', className)}>
      <p className="w-24 shrink-0 pt-2.5 text-xs font-bold text-[var(--casa-muted)]">{name}</p>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** The role, shown as a value and changed in a small panel. One click changes it. */
function RoleChoice({
  account,
  self,
  canGrantOwner,
}: {
  account: StaffAccount;
  self: boolean;
  canGrantOwner: boolean;
}) {
  if (self) {
    return <p className="pt-2 text-sm font-semibold text-[var(--casa-ink)]">{roleLabel(account.role)}</p>;
  }

  const choices = ROLES.filter((r) => r.value !== 'owner' || canGrantOwner || account.role === 'owner');

  return (
    <form action={setRoleAction} className="w-56">
      <input type="hidden" name="staffUserId" value={account.id} />
      <Popover
        label="Role"
        width={288}
        trigger={
          <span className="flex h-9 items-center justify-between gap-3 rounded-lg border border-ws-line px-3 text-sm font-semibold text-[var(--casa-ink)] transition-colors hover:border-ws-line-firm">
            {roleLabel(account.role)}
            <svg viewBox="0 0 12 8" aria-hidden="true" fill="none" className="h-2 w-3 shrink-0 text-[var(--casa-muted)]">
              <path d="M1.5 1.75 6 6.25l4.5-4.5" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        }
      >
        {choices.map((role) =>
          role.value === account.role ? (
            // Not a button: choosing the current role again would sign them out for nothing.
            <div
              key={role.value}
              aria-current="true"
              className="flex items-center justify-between gap-3 rounded-lg bg-[#e3f4fc] px-2.5 py-2 text-sm font-semibold text-[#075985]"
            >
              <RoleText label={role.label} line={role.line} />
              <span aria-hidden="true">✓</span>
            </div>
          ) : (
            <PopoverChoice key={role.value} name="role" value={role.value} current={false}>
              <RoleText label={role.label} line={role.line} />
            </PopoverChoice>
          )
        )}
      </Popover>
    </form>
  );
}

function RoleText({ label: name, line }: { label: string; line: string }) {
  return (
    <span className="block">
      <span className="block">{name}</span>
      <span className="block text-xs font-normal text-[var(--casa-text-subtle)]">{line}</span>
    </span>
  );
}

/**
 * The access tab: the role, then every module in the sidebar's groups with
 * one level each. The role's default level carries a dot, and a row set away
 * from it is tinted as soon as it is changed.
 */
function AccessTab({
  account,
  self,
  canGrantOwner,
}: {
  account: StaffAccount;
  self: boolean;
  canGrantOwner: boolean;
}) {
  const access = resolveAccess(account.role, account.moduleExceptions);
  const editable = !self && account.role === 'staff';
  const role = roleLabel(account.role);

  return (
    <div>
      <Row name="Role" className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <RoleChoice account={account} self={self} canGrantOwner={canGrantOwner} />
          {editable ? (
            <p className="text-xs text-[var(--casa-text-subtle)]">
              <span aria-hidden="true" className="mr-1 text-[var(--casa-muted)]">
                •
              </span>
              {role} default
            </p>
          ) : null}
        </div>
      </Row>
      {editable ? (
        <AccessForm account={account} access={access} role={role} />
      ) : (
        <AccessReadOnly access={access} />
      )}
    </div>
  );
}

function AccessForm({ account, access, role }: { account: StaffAccount; access: Access; role: string }) {
  const defaults = roleDefault(account.role);

  return (
    <form action={setModuleAccessAction}>
      <input type="hidden" name="staffUserId" value={account.id} />
      <input type="hidden" name="role" value={account.role} />
      <div className="divide-y divide-ws-line-soft border-y border-ws-line-soft">
        {ACCESS_GROUPS.map((group) => (
          <Row key={group.label} name={group.label} className="py-2">
            <div className="space-y-0.5">
              {group.modules.map((module) => (
                <div
                  key={module}
                  role="radiogroup"
                  aria-label={moduleLabel(module)}
                  className="-mx-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg px-2 transition-colors has-[[data-default]:not(:checked)]:bg-[#f2f8fc]"
                >
                  <span className="text-sm font-semibold text-[var(--casa-ink)]">{moduleLabel(module)}</span>
                  <span className="grid grid-cols-[5.25rem_repeat(3,4.25rem)] gap-0.5 rounded-xl border border-ws-line bg-white p-0.5">
                    {LEVELS.map((level) => {
                      const isDefault = defaults[module] === level;
                      return (
                        <label
                          key={level}
                          className="relative flex h-7 cursor-pointer items-center justify-center rounded-lg text-xs font-semibold whitespace-nowrap text-[var(--casa-muted)] transition-colors hover:bg-ws-sunk hover:text-[var(--casa-ink)] has-[:checked]:bg-[#e3f4fc] has-[:checked]:text-[#075985] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--casa-blue)]/30"
                        >
                          <input
                            type="radio"
                            name={`level:${module}`}
                            value={level}
                            defaultChecked={access[module] === level}
                            data-default={isDefault ? '' : undefined}
                            className="sr-only"
                          />
                          {LEVEL_LABELS[level]}
                          {isDefault ? (
                            <>
                              <span aria-hidden="true" className="ml-1 opacity-70">
                                •
                              </span>
                              <span className="sr-only"> ({role} default)</span>
                            </>
                          ) : null}
                        </label>
                      );
                    })}
                  </span>
                </div>
              ))}
            </div>
          </Row>
        ))}
      </div>
      <div className="pt-4">
        <Button type="submit">Save access</Button>
      </div>
    </form>
  );
}

/** Owners and administrators hold every module by role; their levels are shown, not edited. */
function AccessReadOnly({ access }: { access: Access }) {
  if (ADJUSTABLE.every((module) => access[module] === 'full')) {
    return (
      <Row name="Modules" className="border-t border-ws-line-soft pt-3">
        <p className="pt-2 text-sm font-semibold text-[var(--casa-ink)]">Full, in every module</p>
      </Row>
    );
  }

  return (
    <div className="divide-y divide-ws-line-soft border-y border-ws-line-soft">
      {ACCESS_GROUPS.map((group) => (
        <Row key={group.label} name={group.label} className="py-2">
          <div className="space-y-1 pt-2">
            {group.modules.map((module) => (
              <div key={module} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-[var(--casa-ink)]">{moduleLabel(module)}</span>
                <span className="text-[var(--casa-text-subtle)]">{LEVEL_LABELS[access[module]]}</span>
              </div>
            ))}
          </div>
        </Row>
      ))}
    </div>
  );
}
